import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  exigirGravacaoUnica,
  GRAVACAO_NAO_APLICADA,
  identificadoresCabemNaGravacao,
  identificadoresUnicos,
  lerPorIdentificadores,
  lerTodosOsLotes,
  LOTE_IDENTIFICADORES,
} from "@/lib/consulta-lotes";
import { chaveCicloPeriodico } from "@/lib/periodico-agrupamento";
import {
  PERIODICO_CANCELAR_JA_CANCELADO_MSG,
  idsUnicosPeriodico,
  isPeriodicoCanceladoManualmente,
  validarMotivoCancelamentoPeriodico,
} from "@/lib/periodico-cancelamento";
import type { PeriodicoFuturoRecord } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoriaServer } from "@/services/auditoria.server";

export type CancelarPeriodicoFuturoResult = {
  ids: string[];
  atualizados: number;
  temAgendamentoAtivoVinculado: boolean;
  motivo: string;
  canceladoEm: string;
  canceladoPor: string;
  canceladoPorId: string | null;
};

function funcaoDeGravacaoAusente(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? "";
  return (
    error.code === "PGRST202" ||
    /schema cache/i.test(message) ||
    /cancelar_periodicos_e_reverter_vagas|reverter_vagas_de_periodicos/i.test(message)
  );
}

async function reverterVagasDosPeriodicos(ids: readonly string[]): Promise<void> {
  const lista = identificadoresUnicos(ids);
  if (lista.length === 0) return;
  const admin = createAdminClient();
  if (!identificadoresCabemNaGravacao(lista)) {
    const { error } = await admin.rpc("reverter_vagas_de_periodicos", {
      p_ids: lista,
    });
    if (error) {
      if (funcaoDeGravacaoAusente(error)) throw new Error(GRAVACAO_NAO_APLICADA);
      throw error;
    }
    return;
  }
  const { error } = await admin
    .from("contrato_vagas")
    .update({
      status: "comprometida",
      periodico_futuro_id: null,
      agendamento_id: null,
    })
    .in("periodico_futuro_id", exigirGravacaoUnica(lista))
    .eq("status", "programada");
  if (error) throw error;
}

async function cancelarPeriodicosEReverterVagas(params: {
  ids: string[];
  motivo: string;
  canceladoEm: string;
  canceladoPor: string;
  canceladoPorId: string | null;
}): Promise<void> {
  const lista = identificadoresUnicos(params.ids);
  if (lista.length === 0) return;
  const admin = createAdminClient();
  if (!identificadoresCabemNaGravacao(lista)) {
    const { error } = await admin.rpc("cancelar_periodicos_e_reverter_vagas", {
      p_ids: lista,
      p_motivo: params.motivo,
      p_cancelado_em: params.canceladoEm,
      p_cancelado_por: params.canceladoPor,
      p_cancelado_por_id: params.canceladoPorId,
    });
    if (error) {
      if (funcaoDeGravacaoAusente(error)) throw new Error(GRAVACAO_NAO_APLICADA);
      if (error.code === "42703" || /motivo_cancelamento|cancelado_/i.test(error.message ?? "")) {
        throw new Error(
          "A estrutura de cancelamento do periódico ainda não está disponível. Aplique a migration 112."
        );
      }
      throw error;
    }
    return;
  }

  const gravacao = exigirGravacaoUnica(lista);
  const { error } = await admin
    .from("periodicos_futuros")
    .update({
      status: "cancelado",
      motivo_cancelamento: params.motivo,
      cancelado_em: params.canceladoEm,
      cancelado_por: params.canceladoPor,
      cancelado_por_id: params.canceladoPorId,
    })
    .in("id", gravacao);
  if (error) {
    if (error.code === "42703" || /motivo_cancelamento|cancelado_/i.test(error.message ?? "")) {
      throw new Error(
        "A estrutura de cancelamento do periódico ainda não está disponível. Aplique a migration 112."
      );
    }
    throw error;
  }
  await reverterVagasDosPeriodicos(gravacao);
}

function mapPeriodicoRow(row: Record<string, unknown>): PeriodicoFuturoRecord {
  return row as unknown as PeriodicoFuturoRecord;
}

async function carregarPorIds(
  ids: string[]
): Promise<PeriodicoFuturoRecord[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const data = await lerPorIdentificadores(ids, async (grupo, from, to) => {
    const { data: page, error } = await admin
      .from("periodicos_futuros")
      .select("*")
      .in("id", grupo)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (page ?? []) as Record<string, unknown>[];
  });
  return data.map(mapPeriodicoRow);
}

async function expandirCicloPeriodico(
  records: PeriodicoFuturoRecord[]
): Promise<PeriodicoFuturoRecord[]> {
  if (records.length === 0) return [];
  const keys = new Set(records.map((row) => chaveCicloPeriodico(row)));
  const datas = Array.from(
    new Set(records.map((row) => String(row.proxima_data ?? "").split("T")[0]).filter(Boolean))
  );
  const clientes = Array.from(
    new Set(records.map((row) => row.cliente_nome).filter(Boolean))
  );

  const admin = createAdminClient();
  const data = await lerTodosOsLotes(async (from, to) => {
    let query = admin.from("periodicos_futuros").select("*");
    if (datas.length === 1) query = query.eq("proxima_data", datas[0]);
    else if (datas.length > 1) query = query.in("proxima_data", datas);
    if (clientes.length === 1) query = query.eq("cliente_nome", clientes[0]);
    else if (clientes.length > 1) query = query.in("cliente_nome", clientes);
    const { data: page, error } = await query
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (page ?? []) as Record<string, unknown>[];
  });

  const encontrados = data.map(mapPeriodicoRow);
  const doCiclo = encontrados.filter((row) => keys.has(chaveCicloPeriodico(row)));
  const byId = new Map(doCiclo.map((row) => [row.id, row]));
  for (const row of records) byId.set(row.id, row);
  return Array.from(byId.values());
}

async function temAgendamentoAtivoVinculado(
  records: PeriodicoFuturoRecord[]
): Promise<boolean> {
  const agendamentoIds = idsUnicosPeriodico(
    records.map((row) => row.agendamento_id ?? "")
  );
  if (agendamentoIds.length === 0) return false;

  const admin = createAdminClient();
  for (let indice = 0; indice < agendamentoIds.length; indice += LOTE_IDENTIFICADORES) {
    const grupo = agendamentoIds.slice(indice, indice + LOTE_IDENTIFICADORES);
    const { data, error } = await admin
      .from("agendamentos")
      .select("id")
      .in("id", grupo)
      .neq("status", "cancelado")
      .limit(1);
    if (error) throw error;
    if ((data ?? []).length > 0) return true;
  }
  return false;
}

export async function cancelarPeriodicoFuturoNoServidor(params: {
  ids: string[];
  motivo: string;
  auditContext: AuditoriaUsuarioContext;
}): Promise<CancelarPeriodicoFuturoResult> {
  const motivoErro = validarMotivoCancelamentoPeriodico(params.motivo);
  if (motivoErro) {
    throw new Error(motivoErro);
  }
  const motivo = params.motivo.trim();
  const idsSolicitados = idsUnicosPeriodico(params.ids);
  if (idsSolicitados.length === 0) {
    throw new Error("Nenhum periódico selecionado para cancelar.");
  }

  const solicitados = await carregarPorIds(idsSolicitados);
  if (solicitados.length === 0) {
    throw new Error("Periódico futuro não encontrado.");
  }

  const ciclo = await expandirCicloPeriodico(solicitados);
  const pendentes = ciclo.filter((row) => !isPeriodicoCanceladoManualmente(row));
  const canceladoEm = new Date().toISOString();
  const canceladoPor = params.auditContext.usuarioNome.trim() || "Administrador";
  const canceladoPorId = params.auditContext.usuarioId ?? null;

  if (pendentes.length === 0) {
    await reverterVagasDosPeriodicos(ciclo.map((row) => row.id));
    throw new Error(PERIODICO_CANCELAR_JA_CANCELADO_MSG);
  }

  const ids = pendentes.map((row) => row.id);
  const temAgendamentoAtivo = await temAgendamentoAtivoVinculado(ciclo);
  await cancelarPeriodicosEReverterVagas({
    ids,
    motivo,
    canceladoEm,
    canceladoPor,
    canceladoPorId,
  });

  const representante = pendentes[0];
  await registrarAuditoriaServer({
    contexto: {
      usuarioId: canceladoPorId,
      usuarioNome: canceladoPor,
      usuarioEmail: params.auditContext.usuarioEmail ?? "",
    },
    modulo: AUDITORIA_MODULOS.periodicos_futuros,
    acao: AUDITORIA_ACOES.periodico_futuro_cancelado,
    registroId: representante.id,
    registroNome: representante.colaborador,
    descricao: `${canceladoPor} cancelou o periódico futuro de ${representante.colaborador} (${representante.cliente_nome}) — ${ids.length} exame(s) do ciclo.`,
    dadosAntes: {
      ids,
      status: pendentes.map((row) => row.status),
    },
    dadosDepois: {
      status: "cancelado",
      motivo_cancelamento: motivo,
      cancelado_em: canceladoEm,
      cancelado_por: canceladoPor,
      cancelado_por_id: canceladoPorId,
    },
  });

  return {
    ids,
    atualizados: ids.length,
    temAgendamentoAtivoVinculado: temAgendamentoAtivo,
    motivo,
    canceladoEm,
    canceladoPor,
    canceladoPorId,
  };
}

export async function verificarAgendamentoAtivoDoPeriodicoNoServidor(
  ids: string[]
): Promise<boolean> {
  const solicitados = await carregarPorIds(idsUnicosPeriodico(ids));
  if (solicitados.length === 0) return false;
  const ciclo = await expandirCicloPeriodico(solicitados);
  return temAgendamentoAtivoVinculado(ciclo);
}
