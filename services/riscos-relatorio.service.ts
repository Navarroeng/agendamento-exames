import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";

type AuditOptions = { auditContext?: AuditoriaUsuarioContext };

export async function buscarRelatorioCampanha(
  campanhaId: string
): Promise<RiscosRelatorioRecord | null> {
  const id = campanhaId.trim();
  if (!id) return null;
  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(id)}/relatorio`,
    { method: "GET", cache: "no-store" }
  );
  if (res.status === 404) return null;
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    relatorio?: RiscosRelatorioRecord | null;
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Não foi possível carregar o relatório.");
  }
  return json.relatorio ?? null;
}

export async function gerarRelatorioCampanha(
  campanhaId: string,
  auditOptions?: AuditOptions
): Promise<RiscosRelatorioRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");
  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(id)}/relatorio`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    relatorio?: RiscosRelatorioRecord;
  };
  if (!res.ok || !json.ok || !json.relatorio) {
    throw new Error(json.error || "Não foi possível gerar o relatório.");
  }
  return json.relatorio;
}

export async function regenerarRelatorioCampanha(
  campanhaId: string,
  auditOptions?: AuditOptions
): Promise<RiscosRelatorioRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");
  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(id)}/relatorio/regenerar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    relatorio?: RiscosRelatorioRecord;
  };
  if (!res.ok || !json.ok || !json.relatorio) {
    throw new Error(json.error || "Não foi possível regenerar o relatório.");
  }
  return json.relatorio;
}
