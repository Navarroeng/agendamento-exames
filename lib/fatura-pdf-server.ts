import {
  gerarPdfFaturaClienteBuffer,
  type ClienteInfo,
} from "@/lib/fatura-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FaturaComItens } from "@/lib/types";

export async function resolveClienteInfoForFaturaPdf(
  fatura: Pick<FaturaComItens, "referencia_id" | "referencia_nome" | "tipo">
): Promise<ClienteInfo> {
  const fallback: ClienteInfo = {
    empresa: fatura.referencia_nome,
    cnpj: "—",
    endereco: "—",
  };

  if (fatura.tipo !== "cliente" || !fatura.referencia_id?.trim()) {
    return fallback;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("clientes")
      .select("nome, cnpj")
      .eq("id", fatura.referencia_id.trim())
      .maybeSingle();

    if (error || !data) return fallback;

    return {
      empresa: String(data.nome ?? fatura.referencia_nome).trim() || fallback.empresa,
      cnpj: String(data.cnpj ?? "—").trim() || "—",
      endereco: "—",
    };
  } catch {
    return fallback;
  }
}

export async function gerarPdfFaturaClienteBufferServer(
  fatura: FaturaComItens
): Promise<{ buffer: Buffer; filename: string }> {
  const clienteInfo = await resolveClienteInfoForFaturaPdf(fatura);
  return gerarPdfFaturaClienteBuffer(fatura, clienteInfo);
}
