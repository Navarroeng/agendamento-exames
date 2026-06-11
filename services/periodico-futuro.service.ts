import {
  cargoGeraAlertaPeriodico,
  computeProximaDataPeriodico,
  parseValidadePeriodicoMeses,
} from "@/lib/cargo-periodico";
import { createClient } from "@/lib/supabase/client";
import type { PeriodicoFuturoRecord } from "@/lib/types";
import {
  buscarCargoPorId,
  listarExamesObrigatoriosPorCargo,
} from "@/services/cargo.service";

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
    .filter(isPeriodicoDeCargoComAlerta)
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

export async function cancelarPeriodicosPorAgendamento(
  agendamentoId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("periodicos_futuros")
    .update({ status: "cancelado" })
    .eq("agendamento_id", agendamentoId)
    .eq("status", "ativo");

  if (error) throw error;
}

export async function marcarPeriodicoReagendado(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("periodicos_futuros")
    .update({ status: "reagendado" })
    .eq("id", id)
    .eq("status", "ativo");

  if (error) throw error;
}

export async function cancelarAcompanhamentoPeriodico(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("periodicos_futuros")
    .update({ status: "cancelado" })
    .eq("id", id)
    .in("status", ["ativo", "reagendado"]);

  if (error) throw error;
}
