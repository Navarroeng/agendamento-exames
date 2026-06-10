import { createClient } from "@/lib/supabase/client";
import {
  assertExamesSemDuplicidade,
  FATURA_CLINICA_DUPLICADA_MSG,
  FATURA_DUPLICADA_MSG,
  mesReferenciaIsoFromBR,
  mesReferenciaIsoFromPeriodoInicio,
  verificarDuplicidadeExamesNoFormulario,
} from "@/lib/duplicidade-validations";
import type { AgendamentoStatus, FaturaRecord, FaturaTipo } from "@/lib/types";

export { verificarDuplicidadeExamesNoFormulario, assertExamesSemDuplicidade };

export interface AgendamentoMesmoMesInfo {
  id: string;
  cliente_nome: string;
  colaborador: string;
  data_agendamento: string;
  clinica_nome: string;
  tipo_aso: string;
  status: AgendamentoStatus;
}

export interface FaturaExistenteInfo {
  id: string;
  numero: string;
  status: FaturaRecord["status"];
  data_emissao: string | null;
  valor_total: number;
  referencia_nome: string;
}

function monthRangeFromIsoDate(isoDate: string): { inicio: string; fim: string } | null {
  const base = isoDate.split("T")[0];
  const match = base.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = match[2];

  return {
    inicio: `${match[1]}-${mm}-01`,
    fim: `${match[1]}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function faturaMatchesMesReferencia(
  fatura: Pick<FaturaRecord, "mes_referencia" | "periodo_inicio">,
  mesReferenciaIso: string
): boolean {
  if (fatura.mes_referencia === mesReferenciaIso) return true;
  return mesReferenciaIsoFromPeriodoInicio(fatura.periodo_inicio) === mesReferenciaIso;
}

function referenciaMatches(
  fatura: Pick<FaturaRecord, "referencia_nome" | "referencia_id">,
  referenciaNome: string,
  referenciaId?: string | null
): boolean {
  if (referenciaId?.trim() && fatura.referencia_id?.trim()) {
    return fatura.referencia_id === referenciaId;
  }
  return (
    normalizeText(fatura.referencia_nome) === normalizeText(referenciaNome)
  );
}

export async function verificarAgendamentoMesmoMes(params: {
  clienteNome: string;
  colaborador: string;
  dataAgendamentoIso: string;
  ignorarAgendamentoId?: string | null;
}): Promise<AgendamentoMesmoMesInfo | null> {
  const cliente = params.clienteNome.trim();
  const colaborador = params.colaborador.trim();
  if (!cliente || !colaborador) return null;

  const range = monthRangeFromIsoDate(params.dataAgendamentoIso);
  if (!range) return null;

  const supabase = createClient();
  let query = supabase
    .from("agendamentos")
    .select(
      "id, cliente_nome, colaborador, data_agendamento, clinica_nome, aso, status"
    )
    .gte("data_agendamento", range.inicio)
    .lte("data_agendamento", range.fim)
    .neq("status", "cancelado");

  if (params.ignorarAgendamentoId) {
    query = query.neq("id", params.ignorarAgendamentoId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const found = (data ?? []).find(
    (row) =>
      normalizeText(row.cliente_nome as string) === normalizeText(cliente) &&
      normalizeText(row.colaborador as string) === normalizeText(colaborador)
  );

  if (!found) return null;

  return {
    id: found.id as string,
    cliente_nome: found.cliente_nome as string,
    colaborador: found.colaborador as string,
    data_agendamento: found.data_agendamento as string,
    clinica_nome: found.clinica_nome as string,
    tipo_aso: found.aso as string,
    status: found.status as AgendamentoStatus,
  };
}

export async function verificarFaturaExistenteMes(params: {
  tipo: FaturaTipo;
  referenciaNome: string;
  referenciaId?: string | null;
  mesReferencia?: string;
  mesReferenciaIso?: string | null;
  ignorarFaturaId?: string | null;
}): Promise<FaturaExistenteInfo | null> {
  const mesReferenciaIso =
    params.mesReferenciaIso ??
    (params.mesReferencia ? mesReferenciaIsoFromBR(params.mesReferencia) : null);
  if (!mesReferenciaIso) return null;

  const referencia = params.referenciaNome.trim();
  if (!referencia) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("faturas")
    .select(
      "id, numero, status, data_emissao, valor_total, referencia_nome, referencia_id, mes_referencia, periodo_inicio"
    )
    .eq("tipo", params.tipo)
    .in("status", ["rascunho", "emitida"]);

  if (error) throw error;

  const found = (data ?? []).find((row) => {
    if (params.ignorarFaturaId && row.id === params.ignorarFaturaId) {
      return false;
    }
    return (
      referenciaMatches(
        row as Pick<FaturaRecord, "referencia_nome" | "referencia_id">,
        referencia,
        params.referenciaId
      ) &&
      faturaMatchesMesReferencia(
        row as Pick<FaturaRecord, "mes_referencia" | "periodo_inicio">,
        mesReferenciaIso
      )
    );
  });

  if (!found) return null;

  return {
    id: found.id as string,
    numero: found.numero as string,
    status: found.status as FaturaRecord["status"],
    data_emissao: (found.data_emissao as string | null) ?? null,
    valor_total: Number(found.valor_total),
    referencia_nome: found.referencia_nome as string,
  };
}

export async function assertFaturaMesDisponivel(params: {
  tipo: FaturaTipo;
  referenciaNome: string;
  referenciaId?: string | null;
  mesReferencia?: string;
  mesReferenciaIso?: string | null;
  ignorarFaturaId?: string | null;
}): Promise<void> {
  const existente = await verificarFaturaExistenteMes(params);
  if (!existente) return;

  const mensagem =
    params.tipo === "cliente"
      ? FATURA_DUPLICADA_MSG
      : FATURA_CLINICA_DUPLICADA_MSG;

  throw new Error(mensagem);
}
