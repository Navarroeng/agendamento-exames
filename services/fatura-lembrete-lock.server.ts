import { FATURA_LEMBRETE_LOTE_LOCK_MS, decidirReservaLote } from "@/lib/fatura-lembrete";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReservaLembrete = "ok" | "ocupado";

/**
 * Trava compartilhada pelos lotes de hoje e de vencidas e pelo envio individual.
 * A chave é a fatura e o dia civil de São Paulo. Não registra aceite do Resend.
 */
export async function reservarLembreteExecucao(
  faturaId: string,
  diaCivil: string
): Promise<ReservaLembrete> {
  const admin = createAdminClient();
  const agora = Date.now();

  const inserir = async () =>
    admin.from("fatura_lembrete_lote_execucao").insert({
      fatura_id: faturaId,
      dia_civil: diaCivil,
      iniciado_em: new Date(agora).toISOString(),
    });

  const primeiro = await inserir();
  if (!primeiro.error) return "ok";
  if (primeiro.error.code !== "23505") {
    if (primeiro.error.code === "42P01") {
      throw new Error(
        "A trava do lote ainda não existe. Aplique a migration 132_fatura_lembrete_lote_execucao.sql."
      );
    }
    throw primeiro.error;
  }

  const { data, error } = await admin
    .from("fatura_lembrete_lote_execucao")
    .select("iniciado_em")
    .eq("fatura_id", faturaId)
    .eq("dia_civil", diaCivil)
    .maybeSingle();
  if (error) throw error;

  const decisao = decidirReservaLote(
    data?.iniciado_em ? { iniciadoEm: String(data.iniciado_em) } : null,
    agora,
    FATURA_LEMBRETE_LOTE_LOCK_MS
  );
  if (decisao === "ocupado") return "ocupado";

  await admin
    .from("fatura_lembrete_lote_execucao")
    .delete()
    .eq("fatura_id", faturaId)
    .eq("dia_civil", diaCivil);
  const segundo = await inserir();
  if (!segundo.error) return "ok";
  if (segundo.error.code === "23505") return "ocupado";
  throw segundo.error;
}

export async function liberarLembreteExecucao(
  faturaId: string,
  diaCivil: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("fatura_lembrete_lote_execucao")
    .delete()
    .eq("fatura_id", faturaId)
    .eq("dia_civil", diaCivil);
  if (error && error.code !== "42P01") throw error;
}
