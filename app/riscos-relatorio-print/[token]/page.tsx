import { notFound } from "next/navigation";
import { verificarRelatorioPrintToken } from "@/lib/riscos-relatorio-print-token";
import { buscarRelatorioPorCampanhaId } from "@/services/riscos-relatorio.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolverUrlLogoCampanhaAdmin } from "@/services/riscos-campanha-logo.server";
import { RelatorioPrintPageClient } from "./RelatorioPrintPageClient";

export const dynamic = "force-dynamic";

async function buscarCampanhaPrint(campanhaId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("riscos_campanhas")
    .select(
      "id, cnpj, status, logo_storage_path, orcamento_id, cliente_id"
    )
    .eq("id", campanhaId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default async function RiscosRelatorioPrintPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let payload;
  try {
    payload = verificarRelatorioPrintToken(token);
  } catch {
    notFound();
  }

  const relatorio = await buscarRelatorioPorCampanhaId(payload.campanhaId);
  if (!relatorio || relatorio.id !== payload.relatorioId) {
    notFound();
  }

  const campanha = await buscarCampanhaPrint(payload.campanhaId);
  const logoUrl = campanha
    ? await resolverUrlLogoCampanhaAdmin({
        logo_storage_path: campanha.logo_storage_path,
        orcamento_id: campanha.orcamento_id,
        cliente_id: campanha.cliente_id,
      })
    : null;

  return (
    <RelatorioPrintPageClient
      relatorio={relatorio}
      logoUrl={logoUrl}
      empresaCnpj={campanha?.cnpj ? String(campanha.cnpj) : null}
      campanhaStatus={campanha?.status ? String(campanha.status) : null}
    />
  );
}
