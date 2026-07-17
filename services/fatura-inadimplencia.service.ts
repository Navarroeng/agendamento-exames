import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  formatAuditoriaAgendamentoBloqueadoInadimplencia,
  faturaBloqueiaNovoAgendamento,
  faturaDeveMarcarComoVencida,
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

export async function sincronizarFaturasVencidas(
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
    const { error: updateError } = await supabase
      .from("faturas")
      .update({ status: "vencida" })
      .eq("id", fatura.id)
      .eq("status", "emitida")
      .eq("pago", false);

    if (updateError) throw updateError;

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

export async function listarFaturasVencidasCliente(
  clienteNome: string
): Promise<FaturaPendenciaInadimplencia[]> {
  const nome = normalizeReferenciaNome(clienteNome);
  if (!nome) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .eq("tipo", "cliente")
    .eq("status", "vencida")
    .eq("pago", false)
    .eq("referencia_nome", nome)
    .order("data_vencimento", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as FaturaRecord[])
    .filter(faturaBloqueiaNovoAgendamento)
    .map(mapFaturaParaPendenciaInadimplencia);
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
