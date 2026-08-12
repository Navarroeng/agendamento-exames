import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapRiscosCampanhaRow,
  isRiscosCampanhaSelectSchemaError,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_LEGACY,
  RISCOS_CAMPANHA_SELECT_SEM_LOGO,
} from "@/lib/riscos-campanha";

export const runtime = "nodejs";

/**
 * Lê a campanha persistida (fonte de verdade para o painel admin).
 */
export async function GET(
  _request: Request,
  context: { params: { campanhaId: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    const admin = createAdminClient();
    const primary = await admin
      .from("riscos_campanhas")
      .select(RISCOS_CAMPANHA_SELECT)
      .eq("id", campanhaId)
      .maybeSingle();

    let row = primary.data as Record<string, unknown> | null;
    let error = primary.error;

    if (isRiscosCampanhaSelectSchemaError(error)) {
      const fb = await admin
        .from("riscos_campanhas")
        .select(RISCOS_CAMPANHA_SELECT_SEM_LOGO)
        .eq("id", campanhaId)
        .maybeSingle();
      row = fb.data as Record<string, unknown> | null;
      error = fb.error;
      if (isRiscosCampanhaSelectSchemaError(error)) {
        const fbLegacy = await admin
          .from("riscos_campanhas")
          .select(RISCOS_CAMPANHA_SELECT_LEGACY)
          .eq("id", campanhaId)
          .maybeSingle();
        row = fbLegacy.data as Record<string, unknown> | null;
        error = fbLegacy.error;
      }
    }

    if (error) throw error;
    if (!row) {
      return NextResponse.json(
        { error: "Campanha não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      campanha: mapRiscosCampanhaRow(row),
    });
  } catch (err) {
    console.error("[riscos/campanha/GET]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar a campanha." },
      { status: 500 }
    );
  }
}
