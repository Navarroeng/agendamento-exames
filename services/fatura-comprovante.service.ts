import {
  COMPROVANTE_BUCKET,
  buildComprovanteStoragePath,
  resolveComprovanteContentType,
  validateComprovanteFile,
} from "@/lib/fatura-comprovante";
import { createClient } from "@/lib/supabase/client";

export async function uploadComprovantePagamento(
  faturaId: string,
  file: File
): Promise<{ path: string; nome: string }> {
  validateComprovanteFile(file);

  const supabase = createClient();
  const path = buildComprovanteStoragePath(faturaId, file.name);
  const contentType = resolveComprovanteContentType(file);

  const { error } = await supabase.storage
    .from(COMPROVANTE_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType,
    });

  if (error) throw error;

  return { path, nome: file.name };
}

export async function deleteComprovantePagamento(path: string): Promise<void> {
  const trimmed = path.trim();
  if (!trimmed) return;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(COMPROVANTE_BUCKET)
    .remove([trimmed]);

  if (error) throw error;
}

export async function obterUrlComprovantePagamento(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(COMPROVANTE_BUCKET)
    .createSignedUrl(path.trim(), expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar o link do comprovante.");
  }

  return data.signedUrl;
}
