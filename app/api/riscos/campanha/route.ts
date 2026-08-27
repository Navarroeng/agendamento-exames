import { NextResponse } from "next/server";
import { CampanhaCicloExistenteError } from "@/lib/riscos-campanha-ciclo";
import { createClient } from "@/lib/supabase/server";
import { criarCampanhaRiscosNoServidor } from "@/services/riscos-campanha-ciclo.server";

export const runtime = "nodejs";

/**
 * Cria campanha do ciclo (orçamento). Bloqueia se já existir qualquer
 * campanha para o mesmo orcamento_id — inclusive encerrada/com prazo vencido.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfis_usuarios")
      .select("perfil, ativo, nome, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (perfilErr) throw perfilErr;
    if (!perfil || perfil.ativo === false) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      orcamentoId?: string;
      clienteId?: string | null;
      cnpj?: string;
      empresaNome?: string;
      dataInicioIso?: string;
      dataEncerramentoIso?: string;
      usuarioNome?: string;
      usuarioEmail?: string;
    };

    const usuarioNome =
      body.usuarioNome?.trim() ||
      (typeof perfil.nome === "string" && perfil.nome.trim()) ||
      user.email ||
      "Usuário";
    const usuarioEmail =
      body.usuarioEmail?.trim() ||
      (typeof perfil.email === "string" && perfil.email.trim()) ||
      user.email ||
      "";

    const campanha = await criarCampanhaRiscosNoServidor(
      {
        orcamentoId: String(body.orcamentoId ?? ""),
        clienteId: body.clienteId ? String(body.clienteId) : null,
        cnpj: String(body.cnpj ?? ""),
        empresaNome: String(body.empresaNome ?? ""),
        dataInicioIso: String(body.dataInicioIso ?? ""),
        dataEncerramentoIso: String(body.dataEncerramentoIso ?? ""),
      },
      {
        auditContext: {
          usuarioId: user.id,
          usuarioNome,
          usuarioEmail,
        },
      }
    );

    return NextResponse.json({ ok: true, campanha });
  } catch (err) {
    if (err instanceof CampanhaCicloExistenteError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          codigo: "ciclo_existente",
          campanha: err.campanha,
        },
        { status: 409 }
      );
    }
    console.error("[riscos/campanha POST]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível criar a campanha.";
    const status =
      message.includes("Já existe") ||
      message.includes("cancelado") ||
      message.includes("Informe") ||
      message.includes("inválid")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
