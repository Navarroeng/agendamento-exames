import { assertExamesValorClientePermitido } from "@/lib/agendamento-clinico-zero-demissional";
import { assertContratoVigentePorNome } from "@/lib/cliente-contrato-vigencia";
import { assertExamesSemDuplicidade } from "@/lib/duplicidade-validations";
import {
  AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG,
  isPostgresDuplicidade90DiasError,
} from "@/lib/agendamento-duplicidade-90dias";
import {
  assertAgendamentoEditavelPorFatura,
  assertCancelamentoExcepcionalAdminPorFatura,
} from "@/services/agendamento-fatura-bloqueio.service";
import type { AgendamentoDocumentacaoInsert } from "@/lib/agendamento-documentacao";
import { createClient } from "@/lib/supabase/client";
import { assertAgendamentoSemDuplicidade90Dias } from "@/services/duplicidade.service";
import type {
  AgendamentoInsert,
  AgendamentoWithExames,
  ExameInsert,
} from "@/lib/types";

export type ExamePayload = Pick<
  ExameInsert,
  "tipo_exame" | "valor_cliente" | "custo_clinica" | "motivo_valor_zero"
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
  await assertContratoVigentePorNome(
    agendamento.cliente_nome,
    agendamento.data_agendamento
  );
  await assertAgendamentoSemDuplicidade90Dias({
    clienteNome: agendamento.cliente_nome,
    colaboradorCpf: agendamento.colaborador_cpf,
    dataAgendamentoIso: agendamento.data_agendamento,
  });
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agendamentos")
    .insert(agendamento)
    .select("id")
    .single();

  if (error) {
    if (isPostgresDuplicidade90DiasError(error)) {
      throw new Error(AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG);
    }
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

export async function atualizarAgendamentoComExames(
  id: string,
  agendamento: AgendamentoInsert,
  exames: ExamePayload[]
): Promise<void> {
  await assertAgendamentoEditavelPorFatura(id);
  validarExamesPayload(agendamento.aso, exames);
  await assertContratoVigentePorNome(
    agendamento.cliente_nome,
    agendamento.data_agendamento
  );
  await assertAgendamentoSemDuplicidade90Dias({
    clienteNome: agendamento.cliente_nome,
    colaboradorCpf: agendamento.colaborador_cpf,
    dataAgendamentoIso: agendamento.data_agendamento,
    ignorarAgendamentoId: id,
  });
  const supabase = createClient();

  const { error } = await supabase
    .from("agendamentos")
    .update(agendamento)
    .eq("id", id);

  if (error) {
    if (isPostgresDuplicidade90DiasError(error)) {
      throw new Error(AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG);
    }
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
  const supabase = createClient();

  const { error } = await supabase
    .from("agendamentos")
    .update(documentacao)
    .eq("id", id);

  if (error) throw error;
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

  if (result.error) throw result.error;
  if (!result.data) {
    throw new Error(
      "Não foi possível atualizar o envio ao e-Social. Verifique permissões ou se o agendamento existe."
    );
  }

  return result.data as EnvioEsocialUpdate;
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

