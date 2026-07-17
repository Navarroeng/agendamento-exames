import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  CLIENTE_INADIMPLENCIA_VALIDATION_MSG,
  CLIENTE_INADIMPLENTE_AGENDAMENTO_MSG,
  formatAuditoriaAgendamentoBloqueadoInadimplencia,
  faturaDeveMarcarComoVencida,
  faturaIndicaInadimplenciaAgendamento,
  mapFaturaParaPendenciaInadimplencia,
  type FaturaPendenciaInadimplencia,
} from "@/lib/fatura-inadimplencia";
import { mesReferenciaBRFromFatura } from "@/lib/fatura-reemissao";
import { createClient } from "@/lib/supabase/client";
import type { FaturaRecord } from "@/lib/types";
import {
  moduloAuditoriaFromFaturaTipo,
  registrarAuditoria,
} from "@/services/auditoria.service";
import type { FaturaAuditOptions } from "@/services/fatura-historico.service";

function normalizeReferenciaNome(value: string): string {
  return value.trim();
}

let syncVencidasInFlight: Promise<number> | null = null;

export class ClienteInadimplenteError extends Error {
  readonly code = "CLIENTE_INADIMPLENTE" as const;
  readonly pendencias: FaturaPendenciaInadimplencia[];

  constructor(pendencias: FaturaPendenciaInadimplencia[]) {
    super(CLIENTE_INADIMPLENTE_AGENDAMENTO_MSG);
    this.name = "ClienteInadimplenteError";
    this.pendencias = pendencias;
  }
}

export class ClienteInadimplenciaValidationError extends Error {
  readonly code = "CLIENTE_INADIMPLENCIA_VALIDATION" as const;

  constructor(message = CLIENTE_INADIMPLENCIA_VALIDATION_MSG) {
    super(message);
    this.name = "ClienteInadimplenciaValidationError";
  }
}

export function isClienteInadimplenteError(
  err: unknown
): err is ClienteInadimplenteError {
  return err instanceof ClienteInadimplenteError;
}

export function isClienteInadimplenciaValidationError(
  err: unknown
): err is ClienteInadimplenciaValidationError {
  return err instanceof ClienteInadimplenciaValidationError;
}

export async function sincronizarFaturasVencidas(
  auditOptions?: FaturaAuditOptions,
  dataReferencia: Date = new Date()
): Promise<number> {
  if (syncVencidasInFlight) {
    return syncVencidasInFlight;
  }

  syncVencidasInFlight = sincronizarFaturasVencidasInterno(
    auditOptions,
    dataReferencia
  ).finally(() => {
    syncVencidasInFlight = null;
  });

  return syncVencidasInFlight;
}

async function sincronizarFaturasVencidasInterno(
  auditOptions?: FaturaAuditOptions,
  dataReferencia: Date = new Date()
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .eq("tipo", "cliente")
    .eq("status", "emitida")
    .eq("pago", false);

  if (error) throw error;

  const candidatas = ((data ?? []) as FaturaRecord[]).filter((fatura) =>
    faturaDeveMarcarComoVencida(fatura, dataReferencia)
  );

  if (candidatas.length === 0) return 0;

  let atualizadas = 0;

  for (const fatura of candidatas) {
    const { data: updated, error: updateError } = await supabase
      .from("faturas")
      .update({ status: "vencida" })
      .eq("id", fatura.id)
      .eq("status", "emitida")
      .eq("pago", false)
      .select("id");

    if (updateError) throw updateError;
    if (!updated || updated.length === 0) continue;

    atualizadas += 1;

    const mesReferenciaBR =
      mesReferenciaBRFromFatura(fatura) ?? fatura.mes_referencia ?? "—";
    const usuario =
      auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";

    await registrarAuditoria({
      usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
      usuarioNome: auditOptions?.auditContext?.usuarioNome ?? "Sistema",
      usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
      modulo: moduloAuditoriaFromFaturaTipo("cliente"),
      acao: AUDITORIA_ACOES.fatura_marcada_vencida,
      registroId: fatura.id,
      registroNome: fatura.numero,
      descricao: `${usuario} marcou a fatura ${fatura.numero} (${fatura.referencia_nome}) como vencida — referência ${mesReferenciaBR}.`,
    });
  }

  return atualizadas;
}

export async function listarPendenciasInadimplenciaCliente(
  clienteNome: string,
  dataReferencia: Date = new Date()
): Promise<FaturaPendenciaInadimplencia[]> {
  const nome = normalizeReferenciaNome(clienteNome);
  if (!nome) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .eq("tipo", "cliente")
    .eq("pago", false)
    .in("status", ["emitida", "vencida"])
    .eq("referencia_nome", nome)
    .order("data_vencimento", { ascending: true });

  if (error) throw error;

  const pendencias = ((data ?? []) as FaturaRecord[])
    .filter((fatura) =>
      faturaIndicaInadimplenciaAgendamento(fatura, dataReferencia)
    )
    .map(mapFaturaParaPendenciaInadimplencia);

  const emitidasParaSync = ((data ?? []) as FaturaRecord[]).filter(
    (fatura) =>
      fatura.status === "emitida" &&
      faturaDeveMarcarComoVencida(fatura, dataReferencia)
  );

  if (emitidasParaSync.length > 0) {
    void sincronizarFaturasVencidas().catch((err) => {
      console.error("Erro ao sincronizar status vencida em background:", err);
    });
  }

  return pendencias;
}

/** @deprecated Use listarPendenciasInadimplenciaCliente */
export async function listarFaturasVencidasCliente(
  clienteNome: string
): Promise<FaturaPendenciaInadimplencia[]> {
  return listarPendenciasInadimplenciaCliente(clienteNome);
}

export async function assertClienteSemInadimplencia(
  clienteNome: string
): Promise<void> {
  const nome = normalizeReferenciaNome(clienteNome);
  if (!nome) return;

  const supabase = createClient();
  const { error } = await supabase.rpc("assert_cliente_sem_inadimplencia", {
    p_referencia_nome: nome,
  });

  if (!error) return;

  const message = error.message ?? "";
  if (
    message.includes("Could not find the function") ||
    message.includes("assert_cliente_sem_inadimplencia")
  ) {
    const pendencias = await listarPendenciasInadimplenciaCliente(nome);
    if (pendencias.length > 0) {
      throw new ClienteInadimplenteError(pendencias);
    }
    return;
  }

  if (message.includes("CLIENTE_INADIMPLENTE")) {
    const pendencias = await listarPendenciasInadimplenciaCliente(nome).catch(
      () => []
    );
    throw new ClienteInadimplenteError(pendencias);
  }

  throw new ClienteInadimplenciaValidationError();
}

export async function validarClienteParaNovoAgendamento(
  clienteNome: string,
  auditOptions?: { auditContext: AuditoriaUsuarioContext; clienteId?: string | null }
): Promise<FaturaPendenciaInadimplencia[]> {
  const pendencias = await listarPendenciasInadimplenciaCliente(clienteNome);
  if (pendencias.length === 0) return [];

  if (auditOptions) {
    await registrarAgendamentoBloqueadoInadimplencia(auditOptions.auditContext, {
      clienteId: auditOptions.clienteId ?? null,
      clienteNome,
      pendencias,
    });
  }

  return pendencias;
}

export async function registrarAgendamentoBloqueadoInadimplencia(
  context: AuditoriaUsuarioContext,
  params: {
    clienteId: string | null;
    clienteNome: string;
    pendencias: FaturaPendenciaInadimplencia[];
  }
): Promise<void> {
  const periodos = params.pendencias
    .map((pendencia) => pendencia.mesReferenciaBR)
    .join(", ");

  const descricaoBase =
    params.pendencias.length === 1
      ? formatAuditoriaAgendamentoBloqueadoInadimplencia(
          params.pendencias[0]!.mesReferenciaBR
        )
      : `Novo agendamento bloqueado. Cliente possui faturas vencidas referentes aos períodos ${periodos}.`;

  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.agendamento_bloqueado_inadimplencia,
    registroId: params.clienteId,
    registroNome: params.clienteNome,
    descricao: descricaoBase,
    dadosDepois: {
      cliente: params.clienteNome,
      faturas_vencidas: params.pendencias.map((pendencia) => ({
        id: pendencia.id,
        referencia: pendencia.mesReferenciaBR,
        vencimento: pendencia.dataVencimentoBR,
        valor: pendencia.valorTotal,
      })),
    },
  });
}
