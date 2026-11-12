/**
 * Gravação do cadastro a partir de Clientes.
 * A propagação em si fica em lib, para a Lista de funcionários usar o mesmo código.
 */

import { isNomeFuncionarioReal, normalizeNomeOcupante } from "@/lib/contrato-vagas";
import { MENSAGEM_CPF_DUPLICADO } from "@/lib/colaborador-cadastro";
import type { IdentidadeColaborador } from "@/lib/colaborador-cadastro";
import { TIPO_CADASTRO, isUuid } from "@/lib/colaborador-movimentacoes";
import { propagarCadastroColaborador } from "@/lib/colaborador-cadastro-gravacao";
import { isDataCalendarioIso } from "@/lib/colaborador-movimentacoes";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import { createAdminClient } from "@/lib/supabase/admin";
import { salvarAdmissaoColaborador } from "@/services/colaborador-movimentacoes.server";
import { listarColaboradoresPortal } from "@/services/portal-colaboradores.server";

function texto(value: string | null | undefined): string | null {
  const nome = normalizeNomeOcupante(value);
  return nome || null;
}

function cpfGravado(value: string | null | undefined): string | null {
  const digits = normalizeCpfDigits(value);
  return isValidCPF(digits) ? digits : null;
}

export async function salvarCadastroColaborador(params: {
  clienteId: string;
  identidade: IdentidadeColaborador;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  dataAdmissao: string | null;
  dataDesligamento: string | null;
  desligamentoMovimentacaoId: string | null;
  actor: AuditoriaUsuarioContext;
}): Promise<
  | {
      ok: true;
      colaboradores: Awaited<ReturnType<typeof listarColaboradoresPortal>>["colaboradores"];
      resumo: Awaited<ReturnType<typeof listarColaboradoresPortal>>["resumo"];
    }
  | { ok: false; error: string; status: number }
> {
  const clienteId = params.clienteId.trim();
  const nome = texto(params.nome);
  if (!isNomeFuncionarioReal(nome)) {
    return { ok: false, error: "Informe o nome do colaborador.", status: 400 };
  }
  const cpfInformado = normalizeCpfDigits(params.cpf);
  if (cpfInformado && !isValidCPF(cpfInformado)) {
    return { ok: false, error: "CPF inválido.", status: 400 };
  }
  const cpfAtual = cpfGravado(params.identidade.cpf);
  if (cpfAtual && !cpfInformado) {
    return { ok: false, error: "Informe o CPF do colaborador.", status: 400 };
  }
  const cpf = cpfGravado(cpfInformado);
  const dataAdmissao = String(params.dataAdmissao ?? "").trim();
  if (dataAdmissao && !isDataCalendarioIso(dataAdmissao)) {
    return { ok: false, error: "Data de admissão inválida.", status: 400 };
  }
  const cadastroId = String(params.identidade.cadastroId ?? "").trim();
  if (dataAdmissao && !cpf && !cadastroId) {
    return {
      ok: false,
      error: "Informe um CPF válido para registrar a data de admissão.",
      status: 400,
    };
  }
  const dataDesligamento = String(params.dataDesligamento ?? "").trim();
  if (dataDesligamento && !isDataCalendarioIso(dataDesligamento)) {
    return { ok: false, error: "Data de desligamento inválida.", status: 400 };
  }

  const admin = createAdminClient();
  try {
    await propagarCadastroColaborador(admin, {
      clienteId,
      identidade: {
        cpf: cpfAtual,
        agendamentoId: params.identidade.agendamentoId,
        vagaId: params.identidade.vagaId,
        cadastroId: cadastroId || null,
      },
      cadastro: { nome, cpf, cargo: texto(params.cargo) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Colaborador não encontrado nesta empresa.") {
      return { ok: false, error: message, status: 404 };
    }
    if (
      message === MENSAGEM_CPF_DUPLICADO ||
      message.startsWith("Este CPF já está associado")
    ) {
      return { ok: false, error: message, status: 409 };
    }
    throw error;
  }

  if (cadastroId) {
    const dataGravada = dataAdmissao || null;
    const { error } = await admin
      .from("colaborador_movimentacoes")
      .update({ data_evento: dataGravada })
      .eq("id", cadastroId)
      .eq("cliente_id", clienteId)
      .eq("tipo", TIPO_CADASTRO)
      .is("cancelado_em", null);
    if (error) throw error;
  }

  if (dataAdmissao && cpf) {
    const admissao = await salvarAdmissaoColaborador({
      clienteId,
      cpf,
      dataAdmissao,
      actor: params.actor,
    });
    if (!admissao.ok) return admissao;
  }

  const movimentacaoId = String(params.desligamentoMovimentacaoId ?? "").trim();
  if (dataDesligamento && movimentacaoId) {
    const { error } = await admin
      .from("colaborador_movimentacoes")
      .update({ data_evento: dataDesligamento })
      .eq("id", movimentacaoId)
      .eq("cliente_id", clienteId)
      .eq("tipo", "desligamento_admin")
      .is("cancelado_em", null);
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          error: "Já existe um desligamento administrativo nesta data.",
          status: 409,
        };
      }
      throw error;
    }
  }

  return { ok: true, ...(await listarColaboradoresPortal(clienteId)) };
}

/**
 * Inclui o colaborador só na lista da empresa.
 * Não cria agendamento, vaga, fatura nem consome vaga contratual.
 */
export async function criarColaboradorManual(params: {
  clienteId: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  dataAdmissao: string | null;
  actor: AuditoriaUsuarioContext;
}): Promise<
  | {
      ok: true;
      colaboradores: Awaited<ReturnType<typeof listarColaboradoresPortal>>["colaboradores"];
      resumo: Awaited<ReturnType<typeof listarColaboradoresPortal>>["resumo"];
    }
  | { ok: false; error: string; status: number }
> {
  const clienteId = params.clienteId.trim();
  if (!isUuid(clienteId)) {
    return { ok: false, error: "Cliente inválido.", status: 400 };
  }
  const nome = texto(params.nome);
  if (!isNomeFuncionarioReal(nome)) {
    return { ok: false, error: "Informe o nome do colaborador.", status: 400 };
  }
  const cpfInformado = normalizeCpfDigits(params.cpf);
  if (cpfInformado && !isValidCPF(cpfInformado)) {
    return { ok: false, error: "CPF inválido.", status: 400 };
  }
  const cpf = cpfGravado(cpfInformado);
  const dataAdmissao = String(params.dataAdmissao ?? "").trim();
  if (dataAdmissao && !isDataCalendarioIso(dataAdmissao)) {
    return { ok: false, error: "Data de admissão inválida.", status: 400 };
  }

  const atual = await listarColaboradoresPortal(clienteId);
  if (
    cpf &&
    atual.colaboradores.some((linha) => linha.cpfDigits === cpf)
  ) {
    return { ok: false, error: MENSAGEM_CPF_DUPLICADO, status: 409 };
  }

  const admin = createAdminClient();
  const insert = await admin
    .from("colaborador_movimentacoes")
    .insert({
      cliente_id: clienteId,
      cpf_digits: cpf ?? "",
      tipo: TIPO_CADASTRO,
      data_evento: dataAdmissao || null,
      colaborador_nome: nome,
      cargo_nome: texto(params.cargo),
      criado_por: params.actor.usuarioId,
      criado_por_nome: params.actor.usuarioNome,
    })
    .select("id")
    .maybeSingle();

  if (insert.error) {
    if (insert.error.code === "23505") {
      return { ok: false, error: MENSAGEM_CPF_DUPLICADO, status: 409 };
    }
    if (
      insert.error.code === "23514" ||
      insert.error.code === "42703" ||
      insert.error.code === "PGRST204"
    ) {
      return {
        ok: false,
        error: "O cadastro manual de colaborador ainda não está disponível.",
        status: 503,
      };
    }
    throw insert.error;
  }

  if (dataAdmissao && cpf) {
    const admissao = await salvarAdmissaoColaborador({
      clienteId,
      cpf,
      dataAdmissao,
      actor: params.actor,
    });
    if (!admissao.ok) return admissao;
  }

  return { ok: true, ...(await listarColaboradoresPortal(clienteId)) };
}
