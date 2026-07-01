import {
  AGENDAMENTO_BLOQUEADO_FATURA_MSG,
  AgendamentoBloqueadoFaturaError,
  type AgendamentoFaturaBloqueio,
  type FaturaVinculoAgendamento,
  resolverBloqueioAgendamentoFatura,
} from "@/lib/agendamento-fatura-bloqueio";
import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/client";
import { formatDateBR } from "@/lib/format";
import { registrarAuditoria } from "@/services/auditoria.service";

type FaturaItemVinculoRow = {
  agendamento_id: string | null;
  faturas: FaturaVinculoAgendamento | FaturaVinculoAgendamento[] | null;
};

function normalizeFaturaRow(
  row: FaturaVinculoAgendamento | null | undefined
): FaturaVinculoAgendamento | null {
  if (!row) return null;
  return {
    ...row,
    pago: Boolean(row.pago),
  };
}

function groupFaturasByAgendamento(
  rows: FaturaItemVinculoRow[]
): Map<string, FaturaVinculoAgendamento[]> {
  const map = new Map<string, FaturaVinculoAgendamento[]>();

  for (const row of rows) {
    const agendamentoId = row.agendamento_id?.trim();
    if (!agendamentoId) continue;

    const faturas = Array.isArray(row.faturas)
      ? row.faturas
      : row.faturas
        ? [row.faturas]
        : [];

    const list = map.get(agendamentoId) ?? [];
    for (const fatura of faturas) {
      const normalized = normalizeFaturaRow(fatura);
      if (normalized) list.push(normalized);
    }
    map.set(agendamentoId, list);
  }

  return map;
}

export async function listarBloqueioFaturaPorAgendamentos(
  agendamentoIds: string[]
): Promise<Map<string, AgendamentoFaturaBloqueio>> {
  const ids = Array.from(new Set(agendamentoIds.map((id) => id.trim()).filter(Boolean)));
  const result = new Map<string, AgendamentoFaturaBloqueio>();

  if (ids.length === 0) return result;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("fatura_itens")
    .select(
      `
      agendamento_id,
      faturas (
        id,
        numero,
        status,
        pago,
        data_vencimento,
        tipo
      )
    `
    )
    .in("agendamento_id", ids);

  if (error) throw error;

  const grouped = groupFaturasByAgendamento((data ?? []) as FaturaItemVinculoRow[]);

  for (const id of ids) {
    const faturas = grouped.get(id) ?? [];
    result.set(id, resolverBloqueioAgendamentoFatura(faturas));
  }

  return result;
}

export async function obterBloqueioFaturaAgendamento(
  agendamentoId: string
): Promise<AgendamentoFaturaBloqueio> {
  const map = await listarBloqueioFaturaPorAgendamentos([agendamentoId]);
  return map.get(agendamentoId) ?? { bloqueado: false };
}

export async function assertAgendamentoEditavelPorFatura(
  agendamentoId: string
): Promise<void> {
  const bloqueio = await obterBloqueioFaturaAgendamento(agendamentoId);
  if (bloqueio.bloqueado) {
    throw new AgendamentoBloqueadoFaturaError(bloqueio);
  }
}

export async function registrarTentativaEdicaoBloqueadaFatura(
  context: AuditoriaUsuarioContext,
  params: {
    agendamentoId: string;
    cliente: string;
    colaborador: string;
    dataAgendamento: string;
    faturaNumero: string;
    faturaStatusLabel: string;
  }
): Promise<void> {
  const usuario = context.usuarioNome.trim() || "Sistema";
  const dataLabel = formatDateBR(params.dataAgendamento.split("T")[0]);

  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.tentativa_edicao_bloqueada_fatura,
    registroId: params.agendamentoId,
    registroNome: params.colaborador,
    descricao:
      `${usuario}: Tentativa de editar agendamento bloqueado por fatura já emitida. ` +
      `Cliente: ${params.cliente}. Colaborador: ${params.colaborador}. ` +
      `Data do agendamento: ${dataLabel}. Fatura: ${params.faturaNumero}. ` +
      `Status da fatura: ${params.faturaStatusLabel}.`,
    dadosDepois: {
      cliente: params.cliente,
      colaborador: params.colaborador,
      data_agendamento: params.dataAgendamento.split("T")[0],
      fatura_numero: params.faturaNumero,
      fatura_status: params.faturaStatusLabel,
    },
  });
}

export { AGENDAMENTO_BLOQUEADO_FATURA_MSG };
