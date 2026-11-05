import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import {
  obterEmailEnvioSugeridoCliente,
  type FaturaEnvioEmailFonte,
} from "@/lib/fatura-envio-sugestao";
import { lerTodosOsLotes } from "@/lib/consulta-lotes";
import { createClient } from "@/lib/supabase/client";
import type { FaturaComItens } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Histórico de envios confirmados deste cliente, em qualquer competência.
 * Consulta só leitura: não envia e-mail nem altera a fatura.
 */
export async function listarEnviosEmailCliente(
  referenciaId: string
): Promise<FaturaEnvioEmailFonte[]> {
  const refId = referenciaId.trim();
  if (!UUID_RE.test(refId)) return [];

  const supabase = createClient();
  return lerTodosOsLotes(async (from, to) => {
    const { data, error } = await supabase
      .from("faturas")
      .select("id, tipo, referencia_id, fatura_enviada_email, fatura_enviada_em")
      .eq("tipo", "cliente")
      .eq("referencia_id", refId)
      .not("fatura_enviada_em", "is", null)
      .order("fatura_enviada_em", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as FaturaEnvioEmailFonte[];
  });
}

/**
 * Último e-mail válido de faturamento do cliente.
 * A chave é `referencia_id`. Não usa o nome da empresa nem `clientes.email`.
 */
export async function buscarUltimoEmailEnvioCliente(
  referenciaId: string | null | undefined,
  excludeFaturaId?: string | null,
  listarEnvios: (
    referenciaId: string
  ) => Promise<FaturaEnvioEmailFonte[]> = listarEnviosEmailCliente
): Promise<string | null> {
  const refId = referenciaId?.trim() ?? "";
  if (!refId) return null;
  const envios = await listarEnvios(refId);
  return obterEmailEnvioSugeridoCliente(envios, refId, excludeFaturaId);
}

type FaturaEnvioAuditOptions = { auditContext?: AuditoriaUsuarioContext };

export async function enviarFaturaClientePorEmail(
  faturaId: string,
  email: string,
  auditOptions?: FaturaEnvioAuditOptions
): Promise<FaturaComItens> {
  const id = faturaId.trim();
  if (!id) throw new Error("Fatura inválida.");

  const res = await fetch(
    `/api/faturas/${encodeURIComponent(id)}/envio/enviar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    fatura?: FaturaComItens;
  };

  if (!res.ok || !json.ok || !json.fatura) {
    throw new Error(
      json.error || "Não foi possível enviar a fatura. Tente novamente."
    );
  }

  return json.fatura;
}

export async function prepararReenvioFaturaCliente(
  faturaId: string
): Promise<{ reenvioIntentToken: string }> {
  const id = faturaId.trim();
  if (!id) throw new Error("Fatura inválida.");

  const res = await fetch(
    `/api/faturas/${encodeURIComponent(id)}/envio/reenviar/intent`,
    { method: "POST" }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    reenvioIntentToken?: string;
  };

  if (!res.ok || !json.ok || !json.reenvioIntentToken) {
    throw new Error(json.error || "Não foi possível preparar o reenvio.");
  }

  return { reenvioIntentToken: json.reenvioIntentToken };
}

export async function reenviarFaturaClientePorEmail(
  faturaId: string,
  email: string,
  reenvioIntentToken: string,
  auditOptions?: FaturaEnvioAuditOptions
): Promise<FaturaComItens> {
  const id = faturaId.trim();
  if (!id) throw new Error("Fatura inválida.");

  const res = await fetch(
    `/api/faturas/${encodeURIComponent(id)}/envio/reenviar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        reenvioIntentToken,
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    fatura?: FaturaComItens;
  };

  if (!res.ok || !json.ok || !json.fatura) {
    throw new Error(
      json.error || "Não foi possível enviar a fatura. Tente novamente."
    );
  }

  return json.fatura;
}
