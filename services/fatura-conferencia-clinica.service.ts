import {
  COMPROVANTE_BUCKET,
  buildFaturaClinicaStoragePath,
  resolveFaturaClinicaContentType,
  validateFaturaClinicaFile,
} from "@/lib/fatura-conferencia-clinica";
import { createClient } from "@/lib/supabase/client";

export async function uploadFaturaClinicaConferencia(
  faturaId: string,
  file: File
): Promise<{
  path: string;
  nome: string;
  tipo: string;
  tamanho: number;
}> {
  validateFaturaClinicaFile(file);

  const supabase = createClient();
  const path = buildFaturaClinicaStoragePath(faturaId, file.name);
  const contentType = resolveFaturaClinicaContentType(file);

  const { error } = await supabase.storage
    .from(COMPROVANTE_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType,
    });

  if (error) throw error;

  return {
    path,
    nome: file.name,
    tipo: contentType,
    tamanho: file.size,
  };
}

export async function deleteFaturaClinicaConferencia(path: string): Promise<void> {
  const trimmed = path.trim();
  if (!trimmed) return;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(COMPROVANTE_BUCKET)
    .remove([trimmed]);

  if (error) throw error;
}

export async function obterUrlFaturaClinicaConferencia(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(COMPROVANTE_BUCKET)
    .createSignedUrl(path.trim(), expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar o link da fatura da clínica.");
  }

  return data.signedUrl;
}
