import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/client";
import type { PeriodicoFuturoRecord } from "@/lib/types";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  buscarCargoPorId,
  listarExamesObrigatoriosPorCargo,
} from "@/services/cargo.service";
import {
  cargoGeraAlertaPeriodico,
  computeProximaDataPeriodico,
  parseValidadePeriodicoMeses,
} from "@/lib/cargo-periodico";
import { ORIGEM_PERIODICO_IMPLANTACAO } from "@/lib/contrato-programacao-futura";

export interface CriarPeriodicosAgendamentoParams {
  cliente_nome: string;
  colaborador: string;
  cargo_id: string;
  cargo_nome: string | null;
  data_agendamento: string;
  exames: { tipo_exame: string }[];
}

type PeriodicoFuturoWithCargo = PeriodicoFuturoRecord & {
  cargos?: { validade_periodico_meses: number } | null;
};

function isPeriodicoDeCargoComAlerta(record: PeriodicoFuturoWithCargo): boolean {
  const validade = record.cargos?.validade_periodico_meses;
  return cargoGeraAlertaPeriodico(validade);
}

function deveListarPeriodico(record: PeriodicoFuturoWithCargo): boolean {
  const origem = (record.origem ?? "").trim().toLowerCase();
  if (origem === ORIGEM_PERIODICO_IMPLANTACAO) return true;
  if (record.consome_previsao_contrato) return true;
  return isPeriodicoDeCargoComAlerta(record);
}

function stripCargoJoin(
  record: PeriodicoFuturoWithCargo
): PeriodicoFuturoRecord {
  const { cargos: _cargos, ...rest } = record;
  return rest;
}

export async function listarPeriodicosFuturos(
  limit = 2000
): Promise<PeriodicoFuturoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("periodicos_futuros")
    .select("*, cargos(validade_periodico_meses)")
    .order("proxima_data", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as PeriodicoFuturoWithCargo[])
    .filter(deveListarPeriodico)
    .map(stripCargoJoin);
}

export async function criarPeriodicosDeAgendamento(
  agendamentoId: string,
  params: CriarPeriodicosAgendamentoParams
): Promise<number> {
  const cargo = await buscarCargoPorId(params.cargo_id);
  if (!cargo || !cargoGeraAlertaPeriodico(cargo.validade_periodico_meses)) {
    return 0;
  }

  const validade = parseValidadePeriodicoMeses(cargo.validade_periodico_meses);
  const examesCargo = await listarExamesObrigatoriosPorCargo(params.cargo_id);
  if (examesCargo.length === 0) return 0;

  const tiposAgendamento = new Set(
    params.exames
      .map((exame) => exame.tipo_exame.trim().toLowerCase())
      .filter(Boolean)
  );

  const dataRealizada = params.data_agendamento.split("T")[0];
  const proximaData = computeProximaDataPeriodico(dataRealizada, validade);

  const rows = examesCargo
    .filter((exame) => tiposAgendamento.has(exame.nome.trim().toLowerCase()))
    .map((exame) => ({
      agendamento_id: agendamentoId,
      cliente_nome: params.cliente_nome.trim(),
      colaborador: params.colaborador.trim(),
      cargo_id: params.cargo_id,
      cargo_nome: params.cargo_nome,
      exame_id: exame.id,
      tipo_exame: exame.nome,
      exame_nome: exame.nome,
      data_realizada: dataRealizada,
      proxima_data: proximaData,
      data_prevista_original: proximaData,
      antecipado: false,
      status: "ativo" as const,
    }));

  if (rows.length === 0) return 0;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("periodicos_futuros")
    .upsert(rows, {
      onConflict: "agendamento_id,exame_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export interface PeriodicoAuditOptions {
  auditContext?: AuditoriaUsuarioContext;
}

async function auditarPeriodico(
  auditOptions: PeriodicoAuditOptions | undefined,
  record: Pick<
    PeriodicoFuturoRecord,
    "id" | "colaborador" | "cliente_nome" | "exame_nome"
  >,
  acao:
    | typeof AUDITORIA_ACOES.reagendamento
    | typeof AUDITORIA_ACOES.cancelamento
    | typeof AUDITORIA_ACOES.edicao,
  verbo: string,
  extra?: {
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
  }
): Promise<void> {
  const nome = auditOptions?.auditContext?.usuarioNome ?? "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.periodicos_futuros,
    acao,
    registroId: record.id,
    registroNome: record.colaborador,
    descricao: `${nome} ${verbo} o acompanhamento periódico de ${record.colaborador} (${record.cliente_nome}) — exame ${record.exame_nome}.`,
    dadosAntes: extra?.dadosAntes,
    dadosDepois: extra?.dadosDepois,
  });
}

async function buscarPeriodicoPorId(
  id: string
): Promise<PeriodicoFuturoRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("periodicos_futuros")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as PeriodicoFuturoRecord | null) ?? null;
}

export async function cancelarPeriodicosPorAgendamento(
  agendamentoId: string
): Promise<void> {
  const supabase = createClient();

  // Origem ainda ativa (gerado a partir deste agendamento): cancela acompanhamento.
  const { error: cancelOrigemErr } = await supabase
    .from("periodicos_futuros")
    .update({ status: "cancelado" })
    .eq("agendamento_id", agendamentoId)
    .eq("status", "ativo");
  if (cancelOrigemErr) throw cancelOrigemErr;

  // Vínculo de cumprimento (reagendado): volta a pendente (ativo) e libera o ID.
  const { data: vinculados, error: findVinculoErr } = await supabase
    .from("periodicos_futuros")
    .select("id, data_prevista_original, proxima_data")
    .eq("agendamento_id", agendamentoId)
    .eq("status", "reagendado");
  if (findVinculoErr) throw findVinculoErr;

  for (const row of vinculados ?? []) {
    const dataOriginal =
      (row.data_prevista_original as string | null)?.slice(0, 10) ||
      String(row.proxima_data ?? "").slice(0, 10) ||
      null;
    const { error: restoreErr } = await supabase
      .from("periodicos_futuros")
      .update({
        status: "ativo",
        agendamento_id: null,
        antecipado: false,
        ...(dataOriginal ? { proxima_data: dataOriginal } : {}),
      })
      .eq("id", row.id)
      .eq("status", "reagendado");
    if (restoreErr) throw restoreErr;
  }
}

export async function marcarPeriodicoReagendado(
  id: string,
  auditOptions?: PeriodicoAuditOptions
): Promise<void> {
  const record = await buscarPeriodicoPorId(id);

  const supabase = createClient();
  const { error } = await supabase
    .from("periodicos_futuros")
    .update({ status: "reagendado" })
    .eq("id", id)
    .eq("status", "ativo");

  if (error) throw error;

  if (record) {
    await auditarPeriodico(
      auditOptions,
      record,
      AUDITORIA_ACOES.reagendamento,
      "marcou como reagendado"
    );
  }
}

export async function cancelarAcompanhamentoPeriodico(
  id: string,
  auditOptions?: PeriodicoAuditOptions
): Promise<void> {
  const record = await buscarPeriodicoPorId(id);

  const supabase = createClient();
  const { error } = await supabase
    .from("periodicos_futuros")
    .update({ status: "cancelado" })
    .eq("id", id)
    .in("status", ["ativo", "reagendado"]);

  if (error) throw error;

  if (record) {
    await auditarPeriodico(
      auditOptions,
      record,
      AUDITORIA_ACOES.cancelamento,
      "cancelou o acompanhamento de"
    );
  }
}

export async function atualizarProximaDataPeriodico(
  id: string,
  novaDataIso: string,
  auditOptions?: PeriodicoAuditOptions
): Promise<PeriodicoFuturoRecord> {
  const data = novaDataIso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw new Error("Informe uma data válida (AAAA-MM-DD).");
  }

  const record = await buscarPeriodicoPorId(id);
  if (!record) {
    throw new Error("Periódico futuro não encontrado.");
  }
  if (record.status !== "ativo") {
    throw new Error(
      "Só é possível editar a próxima data de periódicos ativos."
    );
  }

  const dataAnterior = String(record.proxima_data ?? "").slice(0, 10);
  const dataOriginal =
    (record.data_prevista_original as string | null)?.slice(0, 10) ||
    dataAnterior ||
    null;

  const supabase = createClient();
  const { data: updated, error } = await supabase
    .from("periodicos_futuros")
    .update({
      proxima_data: data,
      ...(dataOriginal && data !== dataOriginal ? { antecipado: true } : {}),
      ...(dataOriginal && data === dataOriginal ? { antecipado: false } : {}),
    })
    .eq("id", id)
    .eq("status", "ativo")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!updated) {
    throw new Error("Não foi possível atualizar a próxima data.");
  }

  await auditarPeriodico(
    auditOptions,
    record,
    AUDITORIA_ACOES.edicao,
    "alterou a próxima data de",
    {
      dadosAntes: { proxima_data: dataAnterior },
      dadosDepois: { proxima_data: data },
    }
  );

  return updated as PeriodicoFuturoRecord;
}
