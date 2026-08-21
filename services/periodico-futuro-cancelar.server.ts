import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { chaveCicloPeriodico } from "@/lib/periodico-agrupamento";
import {
  PERIODICO_CANCELAR_JA_CANCELADO_MSG,
  idsUnicosPeriodico,
  isPeriodicoCanceladoManualmente,
  validarMotivoCancelamentoPeriodico,
} from "@/lib/periodico-cancelamento";
import type { PeriodicoFuturoRecord } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";

export type CancelarPeriodicoFuturoResult = {
  ids: string[];
  atualizados: number;
  temAgendamentoAtivoVinculado: boolean;
  motivo: string;
  canceladoEm: string;
  canceladoPor: string;
  canceladoPorId: string | null;
};

function mapPeriodicoRow(row: Record<string, unknown>): PeriodicoFuturoRecord {
  return row as unknown as PeriodicoFuturoRecord;
}

async function carregarPorIds(
  ids: string[]
): Promise<PeriodicoFuturoRecord[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("periodicos_futuros")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapPeriodicoRow);
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
  let query = admin.from("periodicos_futuros").select("*");
  if (datas.length === 1) query = query.eq("proxima_data", datas[0]);
  else if (datas.length > 1) query = query.in("proxima_data", datas);
  if (clientes.length === 1) query = query.eq("cliente_nome", clientes[0]);
  else if (clientes.length > 1) query = query.in("cliente_nome", clientes);

  const { data, error } = await query;
  if (error) throw error;

  const encontrados = ((data ?? []) as Record<string, unknown>[]).map(mapPeriodicoRow);
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
  const { data, error } = await admin
    .from("agendamentos")
    .select("id, status")
    .in("id", agendamentoIds);
  if (error) throw error;
  return (data ?? []).some((row) => String(row.status ?? "") !== "cancelado");
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
  if (pendentes.length === 0) {
    throw new Error(PERIODICO_CANCELAR_JA_CANCELADO_MSG);
  }

  const ids = pendentes.map((row) => row.id);
  const temAgendamentoAtivo = await temAgendamentoAtivoVinculado(ciclo);
  const canceladoEm = new Date().toISOString();
  const canceladoPor = params.auditContext.usuarioNome.trim() || "Administrador";
  const canceladoPorId = params.auditContext.usuarioId ?? null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("periodicos_futuros")
    .update({
      status: "cancelado",
      motivo_cancelamento: motivo,
      cancelado_em: canceladoEm,
      cancelado_por: canceladoPor,
      cancelado_por_id: canceladoPorId,
    })
    .in("id", ids);

  if (error) {
    if (error.code === "42703" || /motivo_cancelamento|cancelado_/i.test(error.message ?? "")) {
      throw new Error(
        "A estrutura de cancelamento do periódico ainda não está disponível. Aplique a migration 112."
      );
    }
    throw error;
  }

  const representante = pendentes[0];
  await registrarAuditoria({
    usuarioId: canceladoPorId,
    usuarioNome: canceladoPor,
    usuarioEmail: params.auditContext.usuarioEmail ?? "",
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
