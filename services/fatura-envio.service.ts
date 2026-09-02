import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import type { FaturaComItens } from "@/lib/types";

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
