import { createClient } from "@/lib/supabase/client";
import {
  addDaysIso,
  AgendamentoDuplicidade90DiasError,
  type AgendamentoDuplicidade90DiasInfo,
  diasEntreAgendamentos,
  evaluaConflitoDuplicidade90Dias,
  normalizeEmpresaNome,
} from "@/lib/agendamento-duplicidade-90dias";
import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { normalizeCpfDigits, formatCPF } from "@/lib/cpf";
import {
  assertExamesSemDuplicidade,
  FATURA_CLINICA_DUPLICADA_MSG,
  FATURA_DUPLICADA_MSG,
  mesReferenciaIsoFromBR,
  mesReferenciaIsoFromPeriodoInicio,
  verificarDuplicidadeExamesNoFormulario,
} from "@/lib/duplicidade-validations";
import type { AgendamentoStatus, FaturaRecord, FaturaTipo } from "@/lib/types";
import { registrarAuditoria } from "@/services/auditoria.service";

export { verificarDuplicidadeExamesNoFormulario, assertExamesSemDuplicidade };
export type { AgendamentoDuplicidade90DiasInfo };
export {
  AgendamentoDuplicidade90DiasError,
  isAgendamentoDuplicidade90DiasError,
} from "@/lib/agendamento-duplicidade-90dias";

export interface FaturaExistenteInfo {
  id: string;
  numero: string;
  status: FaturaRecord["status"];
  data_emissao: string | null;
  valor_total: number;
  referencia_nome: string;
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

function toDuplicidadeInfo(
  row: Record<string, unknown>,
  novaDataIso: string
): AgendamentoDuplicidade90DiasInfo {
  const dataExistente = String(row.data_agendamento);
  return {
    id: String(row.id),
    cliente_nome: String(row.cliente_nome),
    colaborador: String(row.colaborador),
    colaborador_cpf: String(row.colaborador_cpf ?? ""),
    data_agendamento: dataExistente,
    clinica_nome: String(row.clinica_nome),
    tipo_aso: String(row.aso),
    status: row.status as AgendamentoStatus,
    dias_entre: diasEntreAgendamentos(novaDataIso, dataExistente),
  };
}

export async function verificarDuplicidadeAgendamento90Dias(params: {
  clienteNome: string;
  colaboradorCpf: string;
  dataAgendamentoIso: string;
  ignorarAgendamentoId?: string | null;
}): Promise<AgendamentoDuplicidade90DiasInfo | null> {
  const cpfDigits = normalizeCpfDigits(params.colaboradorCpf);
  if (cpfDigits.length !== 11) return null;

  const empresa = normalizeEmpresaNome(params.clienteNome);
  if (!empresa) return null;

  const baseDate = params.dataAgendamentoIso.split("T")[0];
  const minDate = addDaysIso(baseDate, -89);
  const maxDate = addDaysIso(baseDate, 89);

  const supabase = createClient();
  let query = supabase
    .from("agendamentos")
    .select(
      "id, cliente_nome, colaborador, colaborador_cpf, data_agendamento, clinica_nome, aso, status"
    )
    .eq("colaborador_cpf_digits", cpfDigits)
    .gte("data_agendamento", minDate)
    .lte("data_agendamento", maxDate)
    .neq("status", "cancelado");

  if (params.ignorarAgendamentoId) {
    query = query.neq("id", params.ignorarAgendamentoId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const found = (data ?? []).find((row) =>
    evaluaConflitoDuplicidade90Dias({
      cpfNovo: cpfDigits,
      cpfExistente: String(row.colaborador_cpf ?? ""),
      empresaNova: params.clienteNome,
      empresaExistente: String(row.cliente_nome),
      dataNova: baseDate,
      dataExistente: String(row.data_agendamento),
      statusExistente: String(row.status),
    })
  );

  if (!found) return null;

  return toDuplicidadeInfo(found as Record<string, unknown>, baseDate);
}

export async function assertAgendamentoSemDuplicidade90Dias(params: {
  clienteNome: string;
  colaboradorCpf: string;
  dataAgendamentoIso: string;
  ignorarAgendamentoId?: string | null;
}): Promise<void> {
  const existente = await verificarDuplicidadeAgendamento90Dias(params);
  if (existente) {
    throw new AgendamentoDuplicidade90DiasError(existente);
  }
}

export async function registrarTentativaBloqueadaDuplicidadeAgendamento(
  context: AuditoriaUsuarioContext,
  params: {
    existente: AgendamentoDuplicidade90DiasInfo;
    novaDataAgendamento: string;
    colaborador: string;
    colaboradorCpf: string;
    clienteNome: string;
  }
): Promise<void> {
  const cpfFormatado = formatCPF(params.colaboradorCpf);
  const novaData = params.novaDataAgendamento.split("T")[0];

  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.tentativa_bloqueada_duplicidade,
    registroId: params.existente.id,
    registroNome: params.colaborador,
    descricao:
      `Tentativa bloqueada: ${params.colaborador} (CPF ${cpfFormatado}) — ` +
      `empresa ${params.clienteNome}. Agendamento existente em ${params.existente.data_agendamento} ` +
      `(${params.existente.tipo_aso}). Novo agendamento em ${novaData}.`,
    dadosDepois: {
      empresa: params.clienteNome,
      colaborador: params.colaborador,
      cpf: cpfFormatado,
      data_agendamento_existente: params.existente.data_agendamento,
      aso_existente: params.existente.tipo_aso,
      data_novo_agendamento: novaData,
      agendamento_existente_id: params.existente.id,
    },
  });
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
    .in("status", ["rascunho", "emitida", "vencida", "necessita_reemissao"]);

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
