import { createClient } from "@/lib/supabase/client";
import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
} from "@/lib/auditoria";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import {
  isContratoVagaStatus,
  isNomeFuncionarioReal,
  normalizeNomeOcupante,
  resolveStatusVagaRascunho,
  validarDraftsListaVagas,
  vagaStatusBloqueiaEdicao,
  type ContratoVagaDraft,
  type ContratoVagaRecord,
  type ContratoVagaStatus,
} from "@/lib/contrato-vagas";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  registrarCreditosAsoEmAberto,
  removerCreditoAsoEmAberto,
} from "@/services/contrato-creditos-aso.service";

const SELECT_VAGA = `
  id, contrato_id, orcamento_id, indice, colaborador, colaborador_cpf,
  cargo_id, cargo_nome, status, credito_aso_id, agendamento_id,
  periodico_futuro_id, created_at, updated_at
`;

function mapVaga(row: Record<string, unknown>): ContratoVagaRecord {
  const statusRaw = String(row.status ?? "aberta");
  return {
    id: String(row.id),
    contrato_id: String(row.contrato_id),
    orcamento_id: row.orcamento_id ? String(row.orcamento_id) : null,
    indice: Number(row.indice) || 0,
    colaborador: row.colaborador ? String(row.colaborador) : null,
    colaborador_cpf: row.colaborador_cpf
      ? normalizeCpfDigits(String(row.colaborador_cpf)) || null
      : null,
    cargo_id: row.cargo_id ? String(row.cargo_id) : null,
    cargo_nome: row.cargo_nome ? String(row.cargo_nome) : null,
    status: isContratoVagaStatus(statusRaw) ? statusRaw : "aberta",
    credito_aso_id: row.credito_aso_id ? String(row.credito_aso_id) : null,
    agendamento_id: row.agendamento_id ? String(row.agendamento_id) : null,
    periodico_futuro_id: row.periodico_futuro_id
      ? String(row.periodico_futuro_id)
      : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listarVagasDoContrato(
  contratoId: string
): Promise<ContratoVagaRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contrato_vagas")
    .select(SELECT_VAGA)
    .eq("contrato_id", contratoId)
    .order("indice", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapVaga(r as Record<string, unknown>));
}

export async function garantirVagasDoContrato(params: {
  contratoId: string;
  orcamentoId?: string | null;
  quantidadePrevista: number;
}): Promise<ContratoVagaRecord[]> {
  const n = Math.max(0, Math.floor(Number(params.quantidadePrevista) || 0));
  const existentes = await listarVagasDoContrato(params.contratoId);
  if (n <= 0) return existentes;

  const byIndice = new Set(existentes.map((v) => v.indice));
  const missing: number[] = [];
  for (let i = 1; i <= n; i += 1) {
    if (!byIndice.has(i)) missing.push(i);
  }

  if (missing.length > 0) {
    const supabase = createClient();
    const { error } = await supabase.from("contrato_vagas").insert(
      missing.map((indice) => ({
        contrato_id: params.contratoId,
        orcamento_id: params.orcamentoId ?? null,
        indice,
        status: "aberta",
      }))
    );
    if (error) throw error;
  }

  const extrasAbertas = existentes.filter(
    (v) => v.indice > n && v.status === "aberta" && !v.colaborador_cpf
  );
  if (extrasAbertas.length > 0) {
    const supabase = createClient();
    await supabase
      .from("contrato_vagas")
      .delete()
      .in(
        "id",
        extrasAbertas.map((v) => v.id)
      );
  }

  return listarVagasDoContrato(params.contratoId);
}

export async function marcarEtapaListaVagas(aprovacaoId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orcamento_aprovacoes")
    .update({ funcionarios_vagas_salvas_em: new Date().toISOString() })
    .eq("id", aprovacaoId);
  if (error) throw error;
}

export async function salvarListaVagasContrato(params: {
  contratoId: string;
  orcamentoId: string;
  aprovacaoId: string;
  clienteId: string | null;
  clienteCnpj: string | null;
  quantidadePrevista: number;
  validoAte: string | null;
  usuarioNome: string;
  numeroContrato: string | null;
  rows: ContratoVagaDraft[];
}): Promise<ContratoVagaRecord[]> {
  const n = Math.max(0, Math.floor(Number(params.quantidadePrevista) || 0));
  const drafts = params.rows.slice(0, n);
  const erro = validarDraftsListaVagas(drafts, n);
  if (erro) throw new Error(erro);

  let atuais = await garantirVagasDoContrato({
    contratoId: params.contratoId,
    orcamentoId: params.orcamentoId,
    quantidadePrevista: n,
  });
  const byIndice = new Map(atuais.map((v) => [v.indice, v]));

  for (const draft of drafts) {
    const atual = byIndice.get(draft.indice);
    if (!atual) continue;
    if (vagaStatusBloqueiaEdicao(atual.status)) continue;

    const nextStatus = resolveStatusVagaRascunho({
      statusAtual: atual.status,
      colaborador: draft.colaborador,
      colaboradorCpf: draft.colaboradorCpf,
      manterAsoAberto: draft.manterAsoAberto,
    });

    const nome = isNomeFuncionarioReal(draft.colaborador)
      ? normalizeNomeOcupante(draft.colaborador)
      : null;
    const cpf =
      nextStatus === "comprometida"
        ? normalizeCpfDigits(draft.colaboradorCpf)
        : null;
    const cargoNome = draft.cargoNome.trim() || null;
    const cargoId = draft.cargoId?.trim() || null;

    if (nextStatus === "aso_aberto") {
      let creditoId = atual.credito_aso_id;
      if (!creditoId) {
        const created = await registrarCreditosAsoEmAberto({
          contratoId: params.contratoId,
          orcamentoId: params.orcamentoId,
          clienteId: params.clienteId,
          clienteCnpj: params.clienteCnpj,
          quantidade: 1,
          observacao: null,
          validoAte: params.validoAte,
          usuarioNome: params.usuarioNome,
          numeroContrato: params.numeroContrato,
        });
        creditoId = created[0]?.id ?? null;
      }
      await atualizarVaga(atual.id, {
        status: "aso_aberto",
        colaborador: null,
        colaborador_cpf: null,
        cargo_id: null,
        cargo_nome: null,
        credito_aso_id: creditoId,
        agendamento_id: null,
        periodico_futuro_id: null,
      });
      continue;
    }

    if (atual.credito_aso_id) {
      try {
        await removerCreditoAsoEmAberto({
          creditoId: atual.credito_aso_id,
          usuarioNome: params.usuarioNome,
          numeroContrato: params.numeroContrato,
        });
      } catch {
        // Crédito pode já ter sido utilizado/removido.
      }
    }

    await atualizarVaga(atual.id, {
      status: nextStatus,
      colaborador: nome,
      colaborador_cpf: cpf,
      cargo_id: cargoId,
      cargo_nome: cargoNome,
      credito_aso_id: null,
      agendamento_id: null,
      periodico_futuro_id: null,
    });
  }

  atuais = await listarVagasDoContrato(params.contratoId);
  await marcarEtapaListaVagas(params.aprovacaoId);

  await registrarAuditoria({
    modulo: AUDITORIA_MODULOS.orcamentos,
    acao: AUDITORIA_ACOES.contrato_vagas_salvas,
    registroId: params.contratoId,
    registroNome: params.numeroContrato ?? params.contratoId,
    descricao: `${params.usuarioNome} salvou a lista de vagas/funcionários do contrato ${params.numeroContrato ?? params.contratoId}.`,
    usuarioNome: params.usuarioNome,
    usuarioEmail: "",
  });

  return atuais;
}

async function atualizarVaga(
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("contrato_vagas").update(patch).eq("id", id);
  if (error) {
    if (String(error.message || "").includes("idx_contrato_vagas_cpf_unico")) {
      throw new Error(
        "Este CPF já está associado a outra vaga deste contrato."
      );
    }
    throw error;
  }
}

export async function buscarVagaComprometidaPorCpf(params: {
  clienteId?: string | null;
  clienteCnpj?: string | null;
  cpf: string;
}): Promise<
  (ContratoVagaRecord & {
    contrato_numero: string | null;
  }) | null
> {
  const cpf = normalizeCpfDigits(params.cpf);
  if (!isValidCPF(cpf)) return null;
  if (!params.clienteId && !params.clienteCnpj) return null;

  const supabase = createClient();
  let contratosQuery = supabase
    .from("cliente_contratos")
    .select("id, numero, cliente_id, status")
    .in("status", ["ativo", "em_renovacao"]);

  if (params.clienteId) {
    contratosQuery = contratosQuery.eq("cliente_id", params.clienteId);
  }

  const { data: contratos, error: cErr } = await contratosQuery;
  if (cErr) throw cErr;
  const ids = (contratos ?? []).map((c) => String(c.id));
  if (ids.length === 0) return null;

  const { data, error } = await supabase
    .from("contrato_vagas")
    .select(SELECT_VAGA)
    .in("contrato_id", ids)
    .eq("colaborador_cpf", cpf)
    .eq("status", "comprometida")
    .order("indice", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const mapped = mapVaga(data as Record<string, unknown>);
  const ctr = (contratos ?? []).find((c) => String(c.id) === mapped.contrato_id);
  return {
    ...mapped,
    contrato_numero: ctr?.numero ? String(ctr.numero) : null,
  };
}

export async function vincularAgendamentoAVaga(params: {
  vagaId: string;
  agendamentoId: string;
  contratoId: string;
  colaborador: string;
  colaboradorCpf: string | null;
  cargoId?: string | null;
  cargoNome?: string | null;
  usuarioNome: string;
  numeroContrato?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const agora = new Date().toISOString();
  const cpf = normalizeCpfDigits(params.colaboradorCpf);

  const { data: vaga, error: fetchErr } = await supabase
    .from("contrato_vagas")
    .select(SELECT_VAGA)
    .eq("id", params.vagaId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!vaga) throw new Error("Vaga contratual não encontrada.");
  const mapped = mapVaga(vaga as Record<string, unknown>);
  if (mapped.status === "agendada" && mapped.agendamento_id) {
    if (mapped.agendamento_id === params.agendamentoId) return;
    throw new Error("Esta vaga já possui um agendamento vinculado.");
  }
  if (mapped.status === "aso_aberto") {
    throw new Error("Esta vaga está classificada como ASO em aberto.");
  }

  const { error } = await supabase
    .from("contrato_vagas")
    .update({
      status: "agendada",
      agendamento_id: params.agendamentoId,
      colaborador: params.colaborador,
      colaborador_cpf: cpf || mapped.colaborador_cpf,
      cargo_id: params.cargoId ?? mapped.cargo_id,
      cargo_nome: params.cargoNome ?? mapped.cargo_nome,
    })
    .eq("id", params.vagaId);
  if (error) throw error;

  await supabase
    .from("agendamentos")
    .update({
      contrato_id: params.contratoId,
      consome_saldo_contrato: true,
      vinculado_contrato_em: agora,
      vinculado_contrato_por: params.usuarioNome,
    })
    .eq("id", params.agendamentoId);

  const { data: existing } = await supabase
    .from("contrato_agendamentos")
    .select("id")
    .eq("contrato_id", params.contratoId)
    .eq("agendamento_id", params.agendamentoId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("contrato_agendamentos")
      .update({
        contabiliza_previsao: true,
        removido_em: null,
        removido_por: null,
        vinculado_por: params.usuarioNome,
        vinculado_em: agora,
        updated_at: agora,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("contrato_agendamentos").insert({
      contrato_id: params.contratoId,
      agendamento_id: params.agendamentoId,
      contabiliza_previsao: true,
      vinculado_por: params.usuarioNome,
      vinculado_em: agora,
    });
  }

  await registrarAuditoria({
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.contrato_vaga_vinculada,
    registroId: params.vagaId,
    registroNome: params.colaborador,
    descricao: `${params.usuarioNome} vinculou o agendamento de ${params.colaborador} à vaga contratual${params.numeroContrato ? ` do contrato ${params.numeroContrato}` : ""}.`,
    usuarioNome: params.usuarioNome,
    usuarioEmail: "",
  });
}

export async function ocuparVagasAbertasComCreditos(params: {
  contratoId: string;
  creditoIds: string[];
}): Promise<void> {
  if (params.creditoIds.length === 0) return;
  const vagas = await listarVagasDoContrato(params.contratoId);
  const abertas = vagas.filter((v) => v.status === "aberta");
  const supabase = createClient();
  for (let i = 0; i < params.creditoIds.length; i += 1) {
    const vaga = abertas[i];
    if (!vaga) break;
    await supabase
      .from("contrato_vagas")
      .update({
        status: "aso_aberto",
        credito_aso_id: params.creditoIds[i],
        colaborador: null,
        colaborador_cpf: null,
      })
      .eq("id", vaga.id)
      .eq("status", "aberta");
  }
}

export async function liberarVagaPorCreditoRemovido(
  creditoId: string
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("contrato_vagas")
    .update({
      status: "aberta",
      credito_aso_id: null,
    })
    .eq("credito_aso_id", creditoId)
    .eq("status", "aso_aberto");
}

export async function marcarVagaAgendadaPorAgendamento(params: {
  contratoId: string;
  agendamentoId: string;
  colaborador: string;
  colaboradorCpf: string | null;
  cargoId?: string | null;
  cargoNome?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const cpf = normalizeCpfDigits(params.colaboradorCpf);
  const vagas = await listarVagasDoContrato(params.contratoId);

  const ja = vagas.find((v) => v.agendamento_id === params.agendamentoId);
  if (ja) return;

  const alvo =
    (cpf &&
      vagas.find(
        (v) => v.status === "comprometida" && v.colaborador_cpf === cpf
      )) ||
    vagas.find((v) => v.status === "aberta") ||
    null;
  if (!alvo) return;

  await supabase
    .from("contrato_vagas")
    .update({
      status: "agendada",
      agendamento_id: params.agendamentoId,
      colaborador: params.colaborador || alvo.colaborador,
      colaborador_cpf: cpf || alvo.colaborador_cpf,
      cargo_id: params.cargoId ?? alvo.cargo_id,
      cargo_nome: params.cargoNome ?? alvo.cargo_nome,
    })
    .eq("id", alvo.id);
}

export async function desmarcarVagaPorAgendamentoRemovido(params: {
  contratoId: string;
  agendamentoId: string;
}): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contrato_vagas")
    .select(SELECT_VAGA)
    .eq("contrato_id", params.contratoId)
    .eq("agendamento_id", params.agendamentoId)
    .maybeSingle();
  if (!data) return;
  const mapped = mapVaga(data as Record<string, unknown>);
  const nextStatus: ContratoVagaStatus = mapped.colaborador_cpf
    ? "comprometida"
    : "aberta";
  await supabase
    .from("contrato_vagas")
    .update({
      status: nextStatus,
      agendamento_id: null,
    })
    .eq("id", mapped.id);
}

export async function reverterVagaPorCancelamentoAgendamento(
  agendamentoId: string
): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contrato_vagas")
    .select(SELECT_VAGA)
    .eq("agendamento_id", agendamentoId)
    .maybeSingle();
  if (!data) return;
  const mapped = mapVaga(data as Record<string, unknown>);

  if (mapped.credito_aso_id) {
    await supabase
      .from("contrato_vagas")
      .update({
        status: "aso_aberto",
        agendamento_id: null,
        colaborador: null,
        colaborador_cpf: null,
      })
      .eq("id", mapped.id);
    return;
  }

  const nextStatus: ContratoVagaStatus = mapped.colaborador_cpf
    ? "comprometida"
    : "aberta";
  await supabase
    .from("contrato_vagas")
    .update({
      status: nextStatus,
      agendamento_id: null,
    })
    .eq("id", mapped.id);
}

export async function ocuparVagaComExameFuturo(params: {
  contratoId: string;
  periodicoFuturoId: string;
  colaborador: string;
  colaboradorCpf: string | null;
  cargoId?: string | null;
  cargoNome?: string | null;
}): Promise<void> {
  const vagas = await listarVagasDoContrato(params.contratoId);
  const cpf = normalizeCpfDigits(params.colaboradorCpf);
  const alvo =
    (cpf &&
      vagas.find(
        (v) => v.status === "comprometida" && v.colaborador_cpf === cpf
      )) ||
    vagas.find((v) => v.status === "aberta");
  if (!alvo) return;

  const supabase = createClient();
  await supabase
    .from("contrato_vagas")
    .update({
      status: "programada",
      periodico_futuro_id: params.periodicoFuturoId,
      colaborador: params.colaborador || alvo.colaborador,
      colaborador_cpf: cpf || alvo.colaborador_cpf,
      cargo_id: params.cargoId ?? alvo.cargo_id,
      cargo_nome: params.cargoNome ?? alvo.cargo_nome,
    })
    .eq("id", alvo.id);
}

export async function marcarVagaUtilizadaPorCredito(params: {
  creditoId: string;
  agendamentoId: string;
  colaborador: string;
  colaboradorCpf: string | null;
}): Promise<void> {
  const supabase = createClient();
  const cpf = normalizeCpfDigits(params.colaboradorCpf);
  await supabase
    .from("contrato_vagas")
    .update({
      status: "agendada",
      agendamento_id: params.agendamentoId,
      colaborador: params.colaborador,
      colaborador_cpf: cpf || null,
    })
    .eq("credito_aso_id", params.creditoId);
}
