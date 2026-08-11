import { NextResponse } from "next/server";
import {
  getAvaliacaoDemoInfo,
  isAvaliacaoDemoCodigo,
} from "@/lib/avaliacao-demo";
import { avaliarPeriodoCampanha } from "@/lib/avaliacao-validacao";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Info pública mínima da campanha (sem lista de CPF, sem código de acesso).
 * Fonte: riscos_campanhas por codigo_publico (mesma da API administrativa).
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
      return NextResponse.json(getAvaliacaoDemoInfo(), {
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        },
      });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("riscos_campanhas")
      .select(
        "id, codigo_publico, empresa_nome, status, data_inicio, data_encerramento, updated_at"
      )
      .eq("codigo_publico", codigo)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const periodo = avaliarPeriodoCampanha({
      status: String(data.status ?? ""),
      data_inicio: String(data.data_inicio ?? ""),
      data_encerramento: String(data.data_encerramento ?? ""),
    });

    const disponivel = periodo === "ok";
    const codigoErro =
      periodo === "encerrada"
        ? "campanha_encerrada"
        : periodo === "ok"
          ? null
          : "nao_apto";

    return NextResponse.json(
      {
        ok: true,
        campanhaId: String(data.id),
        codigoPublico: String(data.codigo_publico).toUpperCase(),
        empresaNome: String(data.empresa_nome ?? ""),
        status: String(data.status ?? ""),
        updatedAt: data.updated_at ? String(data.updated_at) : null,
        disponivel,
        codigoErro,
        campanhaNome: "Pesquisa de Riscos Psicossociais",
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("[avaliacao/info]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
