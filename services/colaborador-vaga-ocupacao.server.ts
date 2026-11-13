/**
 * Valida no servidor a ocupação das vagas e preserva o cadastro legado
 * antes de a vaga ser liberada. Não cria admissão, exame nem vaga.
 */

import { isUuid } from "@/lib/colaborador-movimentacoes";
import {
  mensagemOcupacaoForaDaEmpresa,
  snapshotAoLiberarVagaLegada,
  type FontesColaboradorEmpresa,
  type PropostaOcupacaoVaga,
} from "@/lib/colaborador-vaga-ocupacao";
import { isNomeFuncionarioReal, normalizeNomeOcupante } from "@/lib/contrato-vagas";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarFontesColaboradoresEmpresa } from "@/services/portal-colaboradores.server";
import { consolidarPortalColaboradores } from "@/lib/portal-colaboradores";

export async function validarEPreservarOcupacaoVagas(params: {
  clienteId: string;
  contratoId: string;
  propostas: PropostaOcupacaoVaga[];
  actor: AuditoriaUsuarioContext;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const clienteId = params.clienteId.trim();
  const contratoId = params.contratoId.trim();
  if (!isUuid(clienteId) || !isUuid(contratoId)) {
    return { ok: false, error: "Contrato inválido.", status: 400 };
  }

  const admin = createAdminClient();
  const { data: contrato, error: contratoError } = await admin
    .from("cliente_contratos")
    .select("id, cliente_id")
    .eq("id", contratoId)
    .maybeSingle();
  if (contratoError) throw contratoError;
  if (!contrato || String(contrato.cliente_id ?? "") !== clienteId) {
    return { ok: false, error: "Este contrato não está vinculado a este cliente.", status: 400 };
  }

  const fontes = await carregarFontesColaboradoresEmpresa(clienteId);
  const vagasContrato = await vagasDoContrato(admin, contratoId);
  const atuais: PropostaOcupacaoVaga[] = vagasContrato.map((vaga) => ({
    indice: vaga.indice,
    colaborador: vaga.colaborador,
    colaboradorCpf: vaga.colaborador_cpf,
    colaboradorOrigemId: vaga.colaborador_origem,
  }));
  const ativos = consolidarPortalColaboradores(fontes);
  const bloqueio = mensagemOcupacaoForaDaEmpresa({
    atuais,
    propostas: params.propostas,
    ativos,
  });
  if (bloqueio) return { ok: false, error: bloqueio, status: 400 };

  const fontesVivas: FontesColaboradorEmpresa = {
    vagas: fontes.vagas.map((vaga) => ({ ...vaga })),
    agendamentos: fontes.agendamentos,
    movimentacoes: fontes.movimentacoes.map((mov) => ({ ...mov })),
  };

  for (const proposta of params.propostas) {
    const atual = vagasContrato.find((vaga) => vaga.indice === proposta.indice);
    if (!atual) continue;
    if (ocupantePermanece(atual, proposta)) continue;

    const snapshot = snapshotAoLiberarVagaLegada({
      vagaId: atual.id,
      fontes: fontesVivas,
    });
    if (!snapshot) continue;
    const gravado = await inserirCadastroLegado(admin, {
      clienteId,
      snapshot,
      actor: params.actor,
    });
    if (!gravado) continue;
    fontesVivas.movimentacoes.push(gravado);
    fontesVivas.vagas = fontesVivas.vagas.map((vaga) =>
      String(vaga.id ?? "") === snapshot.vagaId
        ? {
            ...vaga,
            colaborador: null,
            colaborador_cpf: null,
            colaborador_origem: null,
          }
        : vaga
    );
  }

  return { ok: true };
}

function ocupantePermanece(
  atual: {
    colaborador: string | null;
    colaborador_cpf: string | null;
    colaborador_origem: string | null;
  },
  proposta: PropostaOcupacaoVaga
): boolean {
  const propostaTemPessoa =
    isNomeFuncionarioReal(proposta.colaborador) ||
    isValidCPF(normalizeCpfDigits(proposta.colaboradorCpf));
  if (!propostaTemPessoa) return false;
  const cpfAtual = normalizeCpfDigits(atual.colaborador_cpf);
  const cpfProposta = normalizeCpfDigits(proposta.colaboradorCpf);
  if (isValidCPF(cpfAtual) && cpfAtual === cpfProposta) return true;
  const origemAtual = String(atual.colaborador_origem ?? "").trim();
  const origemProposta = String(proposta.colaboradorOrigemId ?? "").trim();
  if (origemAtual && origemAtual === origemProposta) return true;
  return (
    !isValidCPF(cpfAtual) &&
    !isValidCPF(cpfProposta) &&
    normalizeNomeOcupante(atual.colaborador) ===
      normalizeNomeOcupante(proposta.colaborador) &&
    isNomeFuncionarioReal(atual.colaborador)
  );
}

async function vagasDoContrato(
  admin: ReturnType<typeof createAdminClient>,
  contratoId: string
): Promise<
  Array<{
    id: string;
    indice: number;
    colaborador: string | null;
    colaborador_cpf: string | null;
    colaborador_origem: string | null;
  }>
> {
  const { data, error } = await admin
    .from("contrato_vagas")
    .select(
      "id, indice, colaborador, colaborador_cpf, cargo_nome, agendamento_id, colaborador_origem"
    )
    .eq("contrato_id", contratoId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    indice: Number(row.indice) || 0,
    colaborador: row.colaborador ? String(row.colaborador) : null,
    colaborador_cpf: row.colaborador_cpf ? String(row.colaborador_cpf) : null,
    colaborador_origem: row.colaborador_origem
      ? String(row.colaborador_origem)
      : null,
  }));
}

async function inserirCadastroLegado(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    clienteId: string;
    snapshot: {
      nome: string;
      cpf: string | null;
      cargo: string | null;
      vagaId: string;
      agendamentoId: string | null;
    };
    actor: AuditoriaUsuarioContext;
  }
) {
  const cpf = isValidCPF(normalizeCpfDigits(params.snapshot.cpf))
    ? normalizeCpfDigits(params.snapshot.cpf)
    : "";
  const { data, error } = await admin
    .from("colaborador_movimentacoes")
    .insert({
      cliente_id: params.clienteId,
      cpf_digits: cpf,
      tipo: "cadastro",
      data_evento: null,
      colaborador_nome: params.snapshot.nome,
      cargo_nome: params.snapshot.cargo,
      vinculo_vaga_id: params.snapshot.vagaId,
      vinculo_agendamento_id: params.snapshot.agendamentoId,
      criado_por: params.actor.usuarioId,
      criado_por_nome: params.actor.usuarioNome,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return {
    id: data?.id ? String(data.id) : params.snapshot.vagaId,
    tipo: "cadastro",
    cpf_digits: cpf,
    colaborador_nome: params.snapshot.nome,
    cargo_nome: params.snapshot.cargo,
    vinculo_vaga_id: params.snapshot.vagaId,
    vinculo_agendamento_id: params.snapshot.agendamentoId,
    cancelado_em: null,
    data_evento: null,
  };
}
