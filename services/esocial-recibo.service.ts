import {
  ESOCIAL_RECIBO_DUPLICADO_MSG,
  EsocialReciboDuplicadoError,
  type EsocialReciboDuplicadoInfo,
  isPostgresEsocialReciboDuplicadoError,
} from "@/lib/esocial-recibo-duplicidade";
import {
  maskEsocialRecibo,
  normalizeEsocialReciboForCompare,
} from "@/lib/esocial-recibo";
import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/client";
import { registrarAuditoria } from "@/services/auditoria.service";

const RECIBO_SELECT =
  "id, cliente_nome, colaborador, data_agendamento, aso, data_envio_esocial, esocial_recibo, esocial_recibo_normalizado";

function isMissingEsocialReciboNormalizadoColumn(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("esocial_recibo_normalizado") &&
    (lower.includes("does not exist") ||
      lower.includes("column") ||
      lower.includes("schema cache"))
  );
}

function toDuplicadoInfo(row: Record<string, unknown>): EsocialReciboDuplicadoInfo {
  return {
    id: String(row.id),
    cliente_nome: String(row.cliente_nome),
    colaborador: String(row.colaborador),
    data_agendamento: String(row.data_agendamento),
    aso: String(row.aso),
    data_envio_esocial: row.data_envio_esocial
      ? String(row.data_envio_esocial)
      : null,
    esocial_recibo: row.esocial_recibo ? String(row.esocial_recibo) : null,
  };
}

async function buscarPorReciboNormalizadoColuna(
  reciboNormalizado: string,
  ignorarAgendamentoId?: string | null
): Promise<EsocialReciboDuplicadoInfo | null> {
  const supabase = createClient();
  let query = supabase
    .from("agendamentos")
    .select(RECIBO_SELECT)
    .eq("esocial_recibo_normalizado", reciboNormalizado)
    .limit(1);

  if (ignorarAgendamentoId) {
    query = query.neq("id", ignorarAgendamentoId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.[0]) return null;
  return toDuplicadoInfo(data[0] as Record<string, unknown>);
}

async function buscarPorReciboComparacaoEmMemoria(
  reciboNormalizado: string,
  ignorarAgendamentoId?: string | null
): Promise<EsocialReciboDuplicadoInfo | null> {
  const supabase = createClient();
  let query = supabase
    .from("agendamentos")
    .select(RECIBO_SELECT)
    .not("esocial_recibo", "is", null);

  if (ignorarAgendamentoId) {
    query = query.neq("id", ignorarAgendamentoId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const found = (data ?? []).find((row) => {
    const rowRecord = row as Record<string, unknown>;
    const normalizedFromColumn = rowRecord.esocial_recibo_normalizado
      ? String(rowRecord.esocial_recibo_normalizado)
      : "";
    if (normalizedFromColumn && normalizedFromColumn === reciboNormalizado) {
      return true;
    }
    return (
      normalizeEsocialReciboForCompare(String(rowRecord.esocial_recibo ?? "")) ===
      reciboNormalizado
    );
  });

  if (!found) return null;
  return toDuplicadoInfo(found as Record<string, unknown>);
}

export async function verificarReciboEsocialDuplicado(
  numeroRecibo: string | null | undefined,
  ignorarAgendamentoId?: string | null
): Promise<EsocialReciboDuplicadoInfo | null> {
  const reciboNormalizado = normalizeEsocialReciboForCompare(numeroRecibo);
  if (!reciboNormalizado) return null;

  try {
    return await buscarPorReciboNormalizadoColuna(
      reciboNormalizado,
      ignorarAgendamentoId
    );
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";
    if (!isMissingEsocialReciboNormalizadoColumn(message)) {
      throw err;
    }
    return buscarPorReciboComparacaoEmMemoria(
      reciboNormalizado,
      ignorarAgendamentoId
    );
  }
}

export async function assertNumeroReciboDisponivel(
  numeroRecibo: string | null | undefined,
  agendamentoIdAtual?: string | null
): Promise<void> {
  const reciboNormalizado = normalizeEsocialReciboForCompare(numeroRecibo);
  if (!reciboNormalizado) return;

  const existente = await verificarReciboEsocialDuplicado(
    reciboNormalizado,
    agendamentoIdAtual
  );
  if (existente) {
    throw new EsocialReciboDuplicadoError(
      existente,
      maskEsocialRecibo(reciboNormalizado)
    );
  }
}

export async function assertNumeroReciboDisponivelOuLancarDuplicidadeDb(
  numeroRecibo: string | null | undefined,
  agendamentoIdAtual: string | null | undefined,
  error: unknown
): Promise<void> {
  if (!isPostgresEsocialReciboDuplicadoError(error)) {
    throw error;
  }

  const existente = await verificarReciboEsocialDuplicado(
    numeroRecibo,
    agendamentoIdAtual
  );
  if (existente) {
    throw new EsocialReciboDuplicadoError(
      existente,
      maskEsocialRecibo(normalizeEsocialReciboForCompare(numeroRecibo))
    );
  }

  throw new Error(ESOCIAL_RECIBO_DUPLICADO_MSG);
}

export async function registrarTentativaReciboEsocialDuplicado(
  context: AuditoriaUsuarioContext,
  params: {
    recibo: string;
    agendamentoAtualId: string;
    agendamentoAtualColaborador?: string | null;
    existente: EsocialReciboDuplicadoInfo;
  }
): Promise<void> {
  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.esocial,
    acao: AUDITORIA_ACOES.tentativa_recibo_esocial_duplicado,
    registroId: params.agendamentoAtualId,
    registroNome: params.agendamentoAtualColaborador ?? null,
    descricao: `${context.usuarioNome} tentou informar um número de recibo já utilizado em outro agendamento.`,
    dadosDepois: {
      recibo: params.recibo,
      agendamento_atual_id: params.agendamentoAtualId,
      agendamento_vinculado_id: params.existente.id,
      empresa: params.existente.cliente_nome,
      colaborador: params.existente.colaborador,
      data_exame: params.existente.data_agendamento,
      tipo_aso: params.existente.aso,
      data_envio_esocial: params.existente.data_envio_esocial,
    },
  });
}
