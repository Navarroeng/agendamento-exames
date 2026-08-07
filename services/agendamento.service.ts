import { assertExamesValorClientePermitido } from "@/lib/agendamento-clinico-zero-demissional";
import { assertDataAgendamentoPermitida } from "@/lib/agendamento-datetime";
import { assertContratoVigentePorNome } from "@/lib/cliente-contrato-vigencia";
import { assertClienteDisponivelParaAgendamento } from "@/services/cliente.service";
import { assertExamesSemDuplicidade } from "@/lib/duplicidade-validations";
import {
  AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG,
  isPostgresDuplicidade90DiasError,
} from "@/lib/agendamento-duplicidade-90dias";
import {
  assertAgendamentoEditavelPorFatura,
  assertCancelamentoExcepcionalAdminPorFatura,
} from "@/services/agendamento-fatura-bloqueio.service";
import {
  assertClienteSemInadimplencia,
  isClienteInadimplenteError,
  isClienteInadimplenciaValidationError,
} from "@/services/fatura-inadimplencia.service";
import { CLIENTE_INADIMPLENCIA_VALIDATION_MSG } from "@/lib/fatura-inadimplencia";
import type { AgendamentoDocumentacaoInsert } from "@/lib/agendamento-documentacao";
import { createClient } from "@/lib/supabase/client";
import { assertAgendamentoSemDuplicidade90Dias } from "@/services/duplicidade.service";
import {
  assertNumeroReciboDisponivel,
  assertNumeroReciboDisponivelOuLancarDuplicidadeDb,
} from "@/services/esocial-recibo.service";
import type {
  AgendamentoInsert,
  AgendamentoWithExames,
  ExameInsert,
} from "@/lib/types";

export type ExamePayload = Pick<
  ExameInsert,
  | "tipo_exame"
  | "valor_cliente"
  | "custo_clinica"
  | "motivo_valor_zero"
  | "incluso_credito_contrato"
>;

const EXAMES_SAVE_ERROR =
  "Não foi possível salvar os exames do agendamento. Tente novamente.";

const EXAMES_UPDATE_ERROR =
  "Não foi possível atualizar os exames do agendamento. Os exames anteriores foram restaurados.";

function validarExamesPayload(aso: string, exames: ExamePayload[]): void {
  assertExamesSemDuplicidade(
    exames.map((exame) => ({
      tipo_exame: exame.tipo_exame,
    }))
  );
  assertExamesValorClientePermitido(aso, exames);
}

function toExameInsertRows(
  agendamentoId: string,
  exames: ExamePayload[]
): ExameInsert[] {
  return exames.map((exame) => ({
    agendamento_id: agendamentoId,
    tipo_exame: exame.tipo_exame.trim(),
    valor_cliente: exame.valor_cliente,
    custo_clinica: exame.custo_clinica,
    motivo_valor_zero: exame.motivo_valor_zero?.trim() || null,
    incluso_credito_contrato: Boolean(exame.incluso_credito_contrato),
  }));
}

async function excluirAgendamentoOrfao(id: string): Promise<void> {
  const supabase = createClient();

  await supabase.from("agendamento_exames").delete().eq("agendamento_id", id);
  await supabase.from("agendamentos").delete().eq("id", id);
}

async function inserirExamesAgendamento(
  agendamentoId: string,
  exames: ExamePayload[]
): Promise<void> {
  if (exames.length === 0) return;

  const supabase = createClient();
  const rows = toExameInsertRows(agendamentoId, exames);

  const { error } = await supabase.from("agendamento_exames").insert(rows);

  if (error) throw error;
}

export async function salvarAgendamentoComExames(
  agendamento: AgendamentoInsert,
  exames: ExamePayload[]
): Promise<string> {
  validarExamesPayload(agendamento.aso, exames);
  assertDataAgendamentoPermitida({
    dataIso: agendamento.data_agendamento,
  });
  await assertContratoVigentePorNome(
    agendamento.cliente_nome,
    agendamento.data_agendamento
  );
  await assertClienteDisponivelParaAgendamento(agendamento.cliente_nome);
  await assertAgendamentoSemDuplicidade90Dias({
    clienteNome: agendamento.cliente_nome,
    colaboradorCpf: agendamento.colaborador_cpf,
    dataAgendamentoIso: agendamento.data_agendamento,
    tipoAso: agendamento.aso ?? "",
  });
  await assertClienteSemInadimplencia(agendamento.cliente_nome);
  await assertNumeroReciboDisponivel(agendamento.esocial_recibo);
  const supabase = createClient();

  const payload = {
    ...agendamento,
    esocial_entrada_em:
      agendamento.esocial_entrada_em ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("agendamentos")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (isPostgresDuplicidade90DiasError(error)) {
      throw new Error(AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG);
    }
    await assertNumeroReciboDisponivelOuLancarDuplicidadeDb(
      agendamento.esocial_recibo,
      null,
      error
    );
    throw error;
  }

  try {
    await inserirExamesAgendamento(data.id, exames);
  } catch (examesError) {
    await excluirAgendamentoOrfao(data.id);
    const detail =
      examesError instanceof Error ? examesError.message : String(examesError);
    throw new Error(`${EXAMES_SAVE_ERROR} (${detail})`);
  }

  return data.id;
}

export async function listarAgendamentosComExames(
  limit = 500
): Promise<AgendamentoWithExames[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agendamentos")
    .select(
      `
      *,
      agendamento_exames (
        id,
        agendamento_id,
        tipo_exame,
        valor_cliente,
        custo_clinica,
        motivo_valor_zero
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []) as AgendamentoWithExames[];
}

export async function buscarAgendamentoComExamesPorId(
  id: string
): Promise<AgendamentoWithExames | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select(
      `
      *,
      agendamento_exames (
        id,
        agendamento_id,
        tipo_exame,
        valor_cliente,
        custo_clinica,
        motivo_valor_zero
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as AgendamentoWithExames | null) ?? null;
}

export async function atualizarAgendamentoComExames(
  id: string,
  agendamento: AgendamentoInsert,
  exames: ExamePayload[]
): Promise<void> {
  await assertAgendamentoEditavelPorFatura(id);
  validarExamesPayload(agendamento.aso, exames);

  const supabase = createClient();
  const { data: atualRow, error: atualErr } = await supabase
    .from("agendamentos")
    .select("data_agendamento")
    .eq("id", id)
    .maybeSingle();
  if (atualErr) throw atualErr;

  assertDataAgendamentoPermitida({
    dataIso: agendamento.data_agendamento,
    dataOriginalIso: atualRow?.data_agendamento ?? null,
  });

  await assertContratoVigentePorNome(
    agendamento.cliente_nome,
    agendamento.data_agendamento
  );
  await assertAgendamentoSemDuplicidade90Dias({
    clienteNome: agendamento.cliente_nome,
    colaboradorCpf: agendamento.colaborador_cpf,
    dataAgendamentoIso: agendamento.data_agendamento,
    ignorarAgendamentoId: id,
    tipoAso: agendamento.aso ?? "",
  });
  await assertClienteDisponivelParaAgendamento(agendamento.cliente_nome, {
    agendamentoIdAtual: id,
  });
  await assertNumeroReciboDisponivel(agendamento.esocial_recibo, id);

  const { error } = await supabase
    .from("agendamentos")
    .update(agendamento)
    .eq("id", id);

  if (error) {
    if (isPostgresDuplicidade90DiasError(error)) {
      throw new Error(AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG);
    }
    await assertNumeroReciboDisponivelOuLancarDuplicidadeDb(
      agendamento.esocial_recibo,
      id,
      error
    );
    throw error;
  }

  const { data: examesAnteriores, error: fetchError } = await supabase
    .from("agendamento_exames")
    .select("tipo_exame, valor_cliente, custo_clinica, motivo_valor_zero")
    .eq("agendamento_id", id);

  if (fetchError) throw fetchError;

  const backup: ExamePayload[] = (examesAnteriores ?? []).map((exame) => ({
    tipo_exame: exame.tipo_exame,
    valor_cliente: Number(exame.valor_cliente),
    custo_clinica: Number(exame.custo_clinica),
    motivo_valor_zero: exame.motivo_valor_zero ?? null,
  }));

  const { error: deleteError } = await supabase
    .from("agendamento_exames")
    .delete()
    .eq("agendamento_id", id);

  if (deleteError) throw deleteError;

  const { data: remaining, error: remainingError } = await supabase
    .from("agendamento_exames")
    .select("id")
    .eq("agendamento_id", id)
    .limit(1);

  if (remainingError) throw remainingError;

  if (remaining && remaining.length > 0) {
    throw new Error(
      "Não foi possível substituir os exames do agendamento. Execute a migration 009_agendamento_exames_delete_policy.sql no Supabase."
    );
  }

  try {
    await inserirExamesAgendamento(id, exames);
  } catch (insertError) {
    if (backup.length > 0) {
      try {
        await inserirExamesAgendamento(id, backup);
      } catch {
        throw new Error(
          `${EXAMES_UPDATE_ERROR} Falha ao restaurar exames anteriores.`
        );
      }
    }

    const detail =
      insertError instanceof Error ? insertError.message : String(insertError);
    throw new Error(`${EXAMES_UPDATE_ERROR} (${detail})`);
  }
}

export async function atualizarDocumentacaoAgendamento(
  id: string,
  documentacao: AgendamentoDocumentacaoInsert
): Promise<void> {
  // Atualização documental: não passa por assertAgendamentoEditavelPorFatura.
  await assertNumeroReciboDisponivel(documentacao.esocial_recibo, id);
  const supabase = createClient();

  const { error } = await supabase
    .from("agendamentos")
    .update(documentacao)
    .eq("id", id);

  if (error) {
    await assertNumeroReciboDisponivelOuLancarDuplicidadeDb(
      documentacao.esocial_recibo,
      id,
      error
    );
    throw error;
  }
}

export type EnvioEsocialUpdate = Pick<
  AgendamentoWithExames,
  "id" | "envio_esocial" | "data_envio_esocial" | "esocial_recibo"
>;

function isMissingEsocialReciboColumn(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("esocial_recibo") &&
    (lower.includes("does not exist") ||
      lower.includes("column") ||
      lower.includes("schema cache"))
  );
}

export async function atualizarEnvioEsocial(
  id: string,
  envio_esocial: boolean,
  data_envio_esocial: string | null,
  esocial_recibo: string | null = null
): Promise<EnvioEsocialUpdate> {
  // Atualização documental (eSocial): não passa por assertAgendamentoEditavelPorFatura.
  await assertNumeroReciboDisponivel(esocial_recibo, id);
  const supabase = createClient();

  const basePayload = {
    envio_esocial,
    data_envio_esocial,
    esocial_recibo,
  };

  let result = await supabase
    .from("agendamentos")
    .update(basePayload)
    .eq("id", id)
    .select("id, envio_esocial, data_envio_esocial, esocial_recibo")
    .single();

  if (result.error && isMissingEsocialReciboColumn(result.error.message)) {
    result = await supabase
      .from("agendamentos")
      .update({
        envio_esocial,
        data_envio_esocial,
      })
      .eq("id", id)
      .select("id, envio_esocial, data_envio_esocial")
      .single();
  }

  if (result.error) {
    await assertNumeroReciboDisponivelOuLancarDuplicidadeDb(
      esocial_recibo,
      id,
      result.error
    );
    throw result.error;
  }
  if (!result.data) {
    throw new Error(
      "Não foi possível atualizar o envio ao e-Social. Verifique permissões ou se o agendamento existe."
    );
  }

  return result.data as EnvioEsocialUpdate;
}

export type CancelarEnvioEsocialUpdate = Pick<
  AgendamentoWithExames,
  | "id"
  | "esocial_envio_cancelado"
  | "esocial_cancelado_em"
  | "esocial_cancelado_por"
  | "esocial_motivo_cancelamento"
  | "esocial_status_anterior"
  | "envio_esocial"
  | "data_envio_esocial"
  | "esocial_recibo"
>;

/**
 * Cancela o controle interno de envio ao e-Social.
 * Não apaga data de envio nem número do recibo.
 */
export async function cancelarEnvioEsocial(params: {
  id: string;
  motivo: string;
  canceladoPor: string;
  statusAnterior: string;
}): Promise<CancelarEnvioEsocialUpdate> {
  const motivo = params.motivo.trim();
  if (!motivo) {
    throw new Error("Informe o motivo do cancelamento.");
  }

  const supabase = createClient();
  const canceladoEm = new Date().toISOString();

  const { data: atual, error: fetchError } = await supabase
    .from("agendamentos")
    .select(
      "id, esocial_envio_cancelado, envio_esocial, data_envio_esocial, esocial_recibo"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!atual) throw new Error("Agendamento não encontrado.");
  if (atual.esocial_envio_cancelado === true) {
    throw new Error("Este envio ao e-Social já está cancelado.");
  }

  const { data, error } = await supabase
    .from("agendamentos")
    .update({
      esocial_envio_cancelado: true,
      esocial_cancelado_em: canceladoEm,
      esocial_cancelado_por: params.canceladoPor.trim(),
      esocial_motivo_cancelamento: motivo,
      esocial_status_anterior: params.statusAnterior,
    })
    .eq("id", params.id)
    .eq("esocial_envio_cancelado", false)
    .select(
      "id, esocial_envio_cancelado, esocial_cancelado_em, esocial_cancelado_por, esocial_motivo_cancelamento, esocial_status_anterior, envio_esocial, data_envio_esocial, esocial_recibo"
    )
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("Não foi possível cancelar o envio ao e-Social.");
  }

  return data as CancelarEnvioEsocialUpdate;
}

export async function cancelarAgendamento(
  id: string,
  motivoCancelamento: string,
  options?: { cancelamentoExcepcionalAdmin?: boolean }
): Promise<void> {
  if (options?.cancelamentoExcepcionalAdmin) {
    await assertCancelamentoExcepcionalAdminPorFatura(id);
  } else {
    await assertAgendamentoEditavelPorFatura(id);
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("agendamentos")
    .update({
      status: "cancelado",
      motivo_cancelamento: motivoCancelamento.trim(),
    })
    .eq("id", id);

  if (error) throw error;
}

