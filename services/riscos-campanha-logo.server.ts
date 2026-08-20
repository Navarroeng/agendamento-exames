/**
 * Resolução server-side do logo da campanha (service role).
 * Mesma prioridade da UI de Riscos Psicossociais:
 * storage da campanha → logo do onboarding da empresa → null.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { ORCAMENTO_ONBOARDING_BUCKET } from "@/lib/orcamento-onboarding-files";
import { RISCOS_LISTA_PRESENCA_BUCKET } from "@/lib/riscos-lista-presenca";

const LOGO_URL_EXPIRES_SEC = 3600;

export type CampanhaLogoFonte = {
  logo_storage_path?: string | null;
  orcamento_id?: string | null;
  cliente_id?: string | null;
};

async function signedUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  const trimmed = path.trim();
  if (!trimmed) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(trimmed, LOGO_URL_EXPIRES_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function logoOnboardingPorOrcamento(
  orcamentoId: string
): Promise<string | null> {
  const id = orcamentoId.trim();
  if (!id) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orcamento_aprovacoes")
    .select("logo_path, possui_logo")
    .eq("orcamento_id", id)
    .maybeSingle();
  if (error) return null;
  const path = data?.logo_path ? String(data.logo_path).trim() : "";
  if (!path) return null;
  if (data?.possui_logo === false) return null;
  return signedUrl(ORCAMENTO_ONBOARDING_BUCKET, path);
}

async function logoOnboardingPorCliente(
  clienteId: string
): Promise<string | null> {
  const id = clienteId.trim();
  if (!id) return null;
  const admin = createAdminClient();
  const { data: orcs, error } = await admin
    .from("orcamentos")
    .select("id")
    .eq("cliente_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !orcs?.length) return null;
  for (const row of orcs) {
    const oid = String((row as { id?: string }).id ?? "");
    const url = await logoOnboardingPorOrcamento(oid);
    if (url) return url;
  }
  return null;
}

/**
 * URL assinada para UI/relatório do Portal.
 * Não cria cadastro paralelo — lê o mesmo storage da campanha/empresa.
 */
export async function resolverUrlLogoCampanhaAdmin(
  campanha: CampanhaLogoFonte
): Promise<string | null> {
  const pathCampanha = String(campanha.logo_storage_path ?? "").trim();
  if (pathCampanha) {
    const url = await signedUrl(RISCOS_LISTA_PRESENCA_BUCKET, pathCampanha);
    if (url) return url;
  }

  const orcamentoId = String(campanha.orcamento_id ?? "").trim();
  if (orcamentoId) {
    const url = await logoOnboardingPorOrcamento(orcamentoId);
    if (url) return url;
  }

  const clienteId = String(campanha.cliente_id ?? "").trim();
  if (clienteId) {
    return logoOnboardingPorCliente(clienteId);
  }
  return null;
}
