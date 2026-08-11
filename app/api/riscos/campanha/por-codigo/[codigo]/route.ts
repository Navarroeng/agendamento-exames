import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selecionarCampanhaPorCodigoPublico } from "@/services/riscos-campanha-status.server";

export const runtime = "nodejs";

/**
 * Fonte de verdade alinhada ao portal: busca por codigo_publico (mesmo critério do /info).
 */
export async function GET(
  _request: Request,
  context: { params: { codigo: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const codigo = String(context.params.codigo ?? "")
      .trim()
      .toUpperCase();
    if (!codigo) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const campanha = await selecionarCampanhaPorCodigoPublico(codigo);
    if (!campanha) {
      return NextResponse.json(
        { error: "Campanha não encontrada." },
        { status: 404 }
      );
    }

    // Espelha o status público do portal para diagnóstico.
    return NextResponse.json({
      ok: true,
      campanha: {
        id: campanha.id,
        codigo_publico: campanha.codigo_publico,
        status: campanha.status,
        origem: campanha.origem,
        data_inicio: campanha.data_inicio,
        data_encerramento: campanha.data_encerramento,
        empresa_nome: campanha.empresa_nome,
        quantidade_prevista: campanha.quantidade_prevista,
        orcamento_id: campanha.orcamento_id,
        cliente_id: campanha.cliente_id,
        codigo_acesso_exibicao: campanha.codigo_acesso_exibicao,
        responsavel: campanha.responsavel,
        observacoes: campanha.observacoes,
        criado_por: campanha.criado_por,
        created_at: campanha.created_at,
        updated_at: campanha.updated_at,
        cnpj: campanha.cnpj,
      },
      fonte: "riscos_campanhas.codigo_publico",
    });
  } catch (err) {
    console.error("[riscos/campanha/por-codigo]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar a campanha." },
      { status: 500 }
    );
  }
}
