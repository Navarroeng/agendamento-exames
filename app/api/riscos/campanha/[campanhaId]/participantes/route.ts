import { NextResponse } from "next/server";
import { CpfCampanhaAtivaError } from "@/lib/riscos-cpf-campanha-ativa";
import { createClient } from "@/lib/supabase/server";
import {
  criarParticipanteCampanhaNoServidor,
  importarParticipantesCampanhaNoServidor,
  validarImportacaoParticipantesNoServidor,
} from "@/services/riscos-campanha-participantes.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfis_usuarios")
    .select("perfil, ativo, nome, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!perfil || perfil.ativo === false) return null;

  return {
    user,
    usuarioNome:
      (typeof perfil.nome === "string" && perfil.nome.trim()) ||
      user.email ||
      "Usuário",
    usuarioEmail:
      (typeof perfil.email === "string" && perfil.email.trim()) ||
      user.email ||
      "",
  };
}

export async function POST(
  request: Request,
  context: { params: { campanhaId: string } }
) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      nomeCompleto?: string;
      cpf?: string;
      dataNascimento?: string;
      email?: string;
      dryRun?: boolean;
      importacao?: Array<{
        nomeCompleto?: string;
        cpf?: string;
        dataNascimento?: string;
        email?: string;
        linha?: number;
      }>;
    };

    const auditContext = {
      usuarioId: auth.user.id,
      usuarioNome: auth.usuarioNome,
      usuarioEmail: auth.usuarioEmail,
    };

    if (Array.isArray(body.importacao)) {
      const linhas = body.importacao.map((l, idx) => ({
        nomeCompleto: String(l.nomeCompleto ?? ""),
        cpf: String(l.cpf ?? ""),
        dataNascimento: String(l.dataNascimento ?? ""),
        linha: l.linha ?? idx + 2,
      }));

      if (body.dryRun) {
        const result = await validarImportacaoParticipantesNoServidor({
          campanhaId,
          linhas,
        });
        return NextResponse.json({ ok: true, dryRun: true, ...result });
      }

      const result = await importarParticipantesCampanhaNoServidor(
        { campanhaId, linhas },
        { auditContext }
      );
      return NextResponse.json({ ok: true, ...result });
    }

    const participante = await criarParticipanteCampanhaNoServidor(
      {
        campanhaId,
        input: {
          nomeCompleto: String(body.nomeCompleto ?? ""),
          cpf: String(body.cpf ?? ""),
          dataNascimento: String(body.dataNascimento ?? ""),
        },
      },
      { auditContext }
    );

    return NextResponse.json({ ok: true, participante });
  } catch (err) {
    console.error("[riscos/participantes POST]", err);
    if (err instanceof CpfCampanhaAtivaError) {
      return NextResponse.json(
        { error: err.message, conflict: err.conflict },
        { status: 409 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Não foi possível cadastrar.";
    const status =
      message.includes("Já existe") ||
      message.includes("Informe") ||
      message.includes("inválid") ||
      message.includes("não encontrada") ||
      message.includes("cancelada") ||
      message.includes("encerrada") ||
      message.includes("não está disponível")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
