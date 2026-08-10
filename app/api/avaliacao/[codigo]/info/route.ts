import { NextResponse } from "next/server";
import {
  getAvaliacaoDemoInfo,
  isAvaliacaoDemoCodigo,
} from "@/lib/avaliacao-demo";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Info pública mínima da campanha (sem lista de CPF, sem código de acesso).
 */
export async function GET(
  _request: Request,
  context: { params: { codigo: string } }
) {
  try {
    const codigo = String(context.params.codigo ?? "")
      .trim()
      .toUpperCase();
    if (!codigo) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    // Modo DEMO exclusivo para validação de UI/UX. Não utilizar para campanhas reais.
    if (isAvaliacaoDemoCodigo(codigo)) {
      return NextResponse.json(getAvaliacaoDemoInfo());
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("riscos_campanhas")
      .select(
        "codigo_publico, empresa_nome, status, data_inicio, data_encerramento"
      )
      .eq("codigo_publico", codigo)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const status = String(data.status ?? "");
    const inicio = String(data.data_inicio ?? "").slice(0, 10);
    const fim = String(data.data_encerramento ?? "").slice(0, 10);
    const disponivel =
      status === "aberta" && hoje >= inicio && hoje <= fim;

    return NextResponse.json({
      ok: true,
      codigoPublico: String(data.codigo_publico).toUpperCase(),
      empresaNome: String(data.empresa_nome ?? ""),
      status,
      disponivel,
      campanhaNome: "Pesquisa de Riscos Psicossociais",
    });
  } catch (err) {
    console.error("[avaliacao/info]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
