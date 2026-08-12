import { createClient } from "@/lib/supabase/client";
import { RISCOS_LISTA_PRESENCA_BUCKET } from "@/lib/riscos-lista-presenca";
import {
  buildRiscosCampanhaLogoStoragePath,
  resolveRiscosCampanhaLogoContentType,
  validateRiscosCampanhaLogoFile,
  type RiscosCampanhaLogoMeta,
} from "@/lib/riscos-campanha-logo";
import { ORCAMENTO_ONBOARDING_BUCKET } from "@/lib/orcamento-onboarding-files";

/** Reutiliza o bucket de Riscos (anexos da lista + logos de campanha). */
export const RISCOS_CAMPANHA_LOGO_BUCKET = RISCOS_LISTA_PRESENCA_BUCKET;

export async function uploadRiscosCampanhaLogo(
  campanhaId: string,
  file: File
): Promise<RiscosCampanhaLogoMeta> {
  validateRiscosCampanhaLogoFile(file);
  const supabase = createClient();
  const path = buildRiscosCampanhaLogoStoragePath(campanhaId, file.name);
  const contentType = resolveRiscosCampanhaLogoContentType(file);
  const { error } = await supabase.storage
    .from(RISCOS_CAMPANHA_LOGO_BUCKET)
    .upload(path, file, { upsert: false, contentType });
  if (error) throw error;
  return {
    path,
    nome: file.name,
    tipo: contentType,
    tamanho: file.size,
  };
}

export async function obterUrlRiscosCampanhaLogo(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(RISCOS_CAMPANHA_LOGO_BUCKET)
    .createSignedUrl(path.trim(), expiresInSeconds);
  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar o link do logo.");
  }
  return data.signedUrl;
}

export async function removerArquivoRiscosCampanhaLogo(
  path: string | null | undefined
): Promise<void> {
  const trimmed = (path ?? "").trim();
  if (!trimmed) return;
  // Só remove arquivos do bucket da campanha — nunca o onboarding da empresa.
  if (!trimmed.startsWith("campanhas/")) return;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(RISCOS_CAMPANHA_LOGO_BUCKET)
    .remove([trimmed]);
  if (error) {
    console.error("Falha ao remover logo da campanha:", error);
  }
}

/**
 * Copia o logo do onboarding (empresa) para o storage da campanha.
 * Não altera o arquivo original em orcamentos-onboarding.
 */
export async function copiarLogoEmpresaParaCampanha(
  campanhaId: string,
  sourcePath: string,
  fileNameHint?: string | null
): Promise<RiscosCampanhaLogoMeta | null> {
  const src = sourcePath.trim();
  if (!src) return null;

  const supabase = createClient();
  const { data: blob, error: dlErr } = await supabase.storage
    .from(ORCAMENTO_ONBOARDING_BUCKET)
    .download(src);
  if (dlErr || !blob) {
    console.warn("Não foi possível baixar logo da empresa:", dlErr?.message);
    return null;
  }

  const nome =
    (fileNameHint && fileNameHint.trim()) ||
    src.split("/").pop() ||
    "logo-empresa.png";
  const file = new File([blob], nome, {
    type: blob.type || resolveRiscosCampanhaLogoContentType(new File([], nome)),
  });

  try {
    validateRiscosCampanhaLogoFile(file);
  } catch {
    // SVG/PNG etc. — se validação falhar por tipo estranho, ainda tenta copiar
    // apenas se extensão conhecida.
  }

  return uploadRiscosCampanhaLogo(campanhaId, file);
}

export async function obterUrlLogoOnboardingEmpresa(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const trimmed = path.trim();
  if (!trimmed) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(ORCAMENTO_ONBOARDING_BUCKET)
    .createSignedUrl(trimmed, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
