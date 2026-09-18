import { createClient } from "@/lib/supabase/client";
import {
  ORCAMENTO_ONBOARDING_BUCKET,
  buildOrcamentoOnboardingPath,
  resolveOnboardingContentType,
  validateAetLaudoPdfFile,
  validateOrcamentoContratoPdfFile,
  validateOrcamentoListaFuncionariosFile,
  validateOrcamentoLogoFile,
} from "@/lib/orcamento-onboarding-files";

async function uploadOnboardingFile(
  aprovacaoId: string,
  kind: "funcionarios" | "logo" | "contrato" | "aet_documento" | "aet_laudo",
  file: File
): Promise<{ path: string; nome: string; tipo: string; tamanho: number }> {
  const supabase = createClient();
  const path = buildOrcamentoOnboardingPath(aprovacaoId, kind, file.name);
  const contentType = resolveOnboardingContentType(file);
  const { error } = await supabase.storage
    .from(ORCAMENTO_ONBOARDING_BUCKET)
    .upload(path, file, { upsert: false, contentType });
  if (error) throw error;
  return {
    path,
    nome: file.name,
    tipo: contentType,
    tamanho: file.size,
  };
}

export async function uploadOrcamentoListaFuncionarios(
  aprovacaoId: string,
  file: File
) {
  validateOrcamentoListaFuncionariosFile(file);
  return uploadOnboardingFile(aprovacaoId, "funcionarios", file);
}

export async function uploadOrcamentoLogo(aprovacaoId: string, file: File) {
  validateOrcamentoLogoFile(file);
  return uploadOnboardingFile(aprovacaoId, "logo", file);
}

export async function uploadOrcamentoContratoPdf(
  aprovacaoId: string,
  file: File
) {
  validateOrcamentoContratoPdfFile(file);
  return uploadOnboardingFile(aprovacaoId, "contrato", file);
}

export async function uploadAetLaudoPdf(aprovacaoId: string, file: File) {
  validateAetLaudoPdfFile(file);
  return uploadOnboardingFile(aprovacaoId, "aet_laudo", file);
}

export async function obterUrlOrcamentoOnboarding(
  path: string,
  expiresInSeconds = 3600,
  options?: { download?: string | boolean }
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(ORCAMENTO_ONBOARDING_BUCKET)
    .createSignedUrl(path.trim(), expiresInSeconds, options);
  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar o link do arquivo.");
  }
  return data.signedUrl;
}

/** Remove arquivo do Storage após substituição/remoção confirmada no banco. */
export async function removerArquivoOrcamentoOnboarding(
  path: string | null | undefined
): Promise<void> {
  const trimmed = (path ?? "").trim();
  if (!trimmed) return;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(ORCAMENTO_ONBOARDING_BUCKET)
    .remove([trimmed]);
  if (error) {
    console.error("Falha ao remover arquivo do storage:", error);
  }
}
