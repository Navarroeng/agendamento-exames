import { createClient } from "@/lib/supabase/client";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import type { AgendamentoWithExames, ClienteContratoRecord } from "@/lib/types";
import {
  buscarContratoPorOrcamentoId,
  encerrarContrato,
} from "@/services/cliente-contrato.service";

export type DestinoAgendamentosFuturos = "manter" | "cancelar";

export async function listarAgendamentosFuturosDoContrato(
  contratoId: string
): Promise<AgendamentoWithExames[]> {
  const supabase = createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: vinculos } = await supabase
    .from("contrato_agendamentos")
    .select("agendamento_id")
    .eq("contrato_id", contratoId)
    .is("removido_em", null);

  const idsVinculo = (vinculos ?? []).map((v) => String(v.agendamento_id));

  const { data: porContratoId, error } = await supabase
    .from("agendamentos")
    .select("id, colaborador, data_agendamento, horario, status, contrato_id")
    .eq("contrato_id", contratoId)
    .gt("data_agendamento", hoje)
    .neq("status", "cancelado");
  if (error) throw error;

  const byId = new Map<string, AgendamentoWithExames>();
  for (const row of (porContratoId ?? []) as AgendamentoWithExames[]) {
    byId.set(row.id, row);
  }

  if (idsVinculo.length > 0) {
    const { data: porVinculo, error: vErr } = await supabase
      .from("agendamentos")
      .select("id, colaborador, data_agendamento, horario, status, contrato_id")
      .in("id", idsVinculo)
      .gt("data_agendamento", hoje)
      .neq("status", "cancelado");
    if (vErr) throw vErr;
    for (const row of (porVinculo ?? []) as AgendamentoWithExames[]) {
      byId.set(row.id, row);
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.data_agendamento.localeCompare(b.data_agendamento)
  );
}

async function cancelarAgendamentosFuturos(
  agendamentoIds: string[],
  motivo: string,
  usuarioNome: string
): Promise<void> {
  if (agendamentoIds.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("agendamentos")
    .update({
      status: "cancelado",
      motivo_cancelamento: motivo,
    })
    .in("id", agendamentoIds)
    .neq("status", "cancelado");
  if (error) throw error;

  // Libera contabilização na previsão do contrato
  await supabase
    .from("contrato_agendamentos")
    .update({
      contabiliza_previsao: false,
      removido_em: new Date().toISOString(),
      removido_por: usuarioNome,
      updated_at: new Date().toISOString(),
    })
    .in("agendamento_id", agendamentoIds)
    .eq("contabiliza_previsao", true)
    .is("removido_em", null);
}

/**
 * Encerra o contrato vinculado ao orçamento e marca o orçamento como
 * contrato_encerrado, preservando todo o histórico.
 */
export async function encerrarContratoDeOrcamento(params: {
  orcamentoId: string;
  motivo: string;
  usuarioNome: string;
  destinoAgendamentosFuturos: DestinoAgendamentosFuturos;
}): Promise<{
  contrato: ClienteContratoRecord;
  futurosCancelados: number;
}> {
  const motivo = params.motivo.trim();
  if (!motivo) {
    throw new Error("Informe o motivo do encerramento.");
  }

  const contrato = await buscarContratoPorOrcamentoId(params.orcamentoId);
  if (!contrato) {
    throw new Error("Contrato não encontrado para este orçamento.");
  }
  if (contrato.status === "encerrado" || contrato.encerrado_em) {
    throw new Error("Este contrato já está encerrado.");
  }

  const futuros = await listarAgendamentosFuturosDoContrato(contrato.id);
  let futurosCancelados = 0;

  if (
    params.destinoAgendamentosFuturos === "cancelar" &&
    futuros.length > 0
  ) {
    await cancelarAgendamentosFuturos(
      futuros.map((a) => a.id),
      `Encerramento do contrato ${contrato.numero || contrato.id}: ${motivo}`,
      params.usuarioNome
    );
    futurosCancelados = futuros.length;
  }

  const contratoEncerrado = await encerrarContrato(contrato.id, {
    motivo,
    encerradoPor: params.usuarioNome,
  });

  const supabase = createClient();
  const agora = new Date().toISOString();
  const { error: orcErr } = await supabase
    .from("orcamentos")
    .update({
      status: "contrato_encerrado",
      motivo_cancelamento: motivo,
      observacao_cancelamento: null,
      cancelado_em: agora,
      cancelado_por: params.usuarioNome,
    })
    .eq("id", params.orcamentoId);
  if (orcErr) throw orcErr;

  return { contrato: contratoEncerrado, futurosCancelados };
}

export function buildAuditoriaEncerramentoContrato(params: {
  usuarioNome: string;
  contratoNumero: string;
  motivo: string;
  dataHora: Date;
}): string {
  const data = formatDateIsoToBR(params.dataHora.toISOString().slice(0, 10));
  const hora = params.dataHora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Contrato ${params.contratoNumero} encerrado por ${params.usuarioNome}.\nMotivo:\n${params.motivo}\nData:\n${data} às ${hora}.`;
}
