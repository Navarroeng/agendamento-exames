import "server-only";

import {
  type AuditoriaAcao,
  type AuditoriaModulo,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditoriaServerContext = AuditoriaUsuarioContext & {
  perfil?: string | null;
};

export interface RegistrarAuditoriaServerInput {
  contexto?: AuditoriaServerContext | AuditoriaUsuarioContext | null;
  modulo: AuditoriaModulo;
  acao: AuditoriaAcao;
  registroId?: string | null;
  registroNome?: string | null;
  descricao: string;
  dadosAntes?: Record<string, unknown> | null;
  dadosDepois?: Record<string, unknown> | null;
}

/**
 * Sanitiza metadados gravados na auditoria:
 * - Remove senhas, tokens, buffers de arquivo, PDFs e respostas individuais confidenciais.
 * - Limita tamanho de strings para evitar payloads excessivos.
 * - Mantém estritamente o delta necessário para rastreabilidade.
 */
export function sanitizarDadosAuditoria(
  dados: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return null;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(dados)) {
    // Campos confidenciais ou sensíveis
    if (
      /token|password|senha|secret|jwt|auth|api_key|authorization/i.test(key)
    ) {
      continue;
    }
    // Conteúdo binário / documentos / respostas psicossociais individuais
    if (
      /buffer|pdf_buffer|base64|arquivo_base64|resultado_json|respostas|perguntas/i.test(
        key
      )
    ) {
      continue;
    }

    if (val === null || val === undefined) {
      out[key] = null;
    } else if (typeof val === "string") {
      out[key] = val.length > 500 ? `${val.slice(0, 500)}… [truncado]` : val;
    } else if (Array.isArray(val)) {
      if (val.length > 30) {
        out[key] = `[${val.length} itens]`;
      } else {
        out[key] = val.map((item) =>
          typeof item === "object" && item !== null
            ? sanitizarDadosAuditoria(item as Record<string, unknown>)
            : item
        );
      }
    } else if (typeof val === "object") {
      out[key] = sanitizarDadosAuditoria(val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Registrador de auditoria server-side:
 * - Executado exclusivamente no servidor Node.js com service role (createAdminClient).
 * - O chamador DEVE passar contexto obtido da sessão/perfil autenticados no servidor
 *   (ex.: auditoriaActorFromAuth / auditoriaActorFromSessionPerfil).
 * - Nunca confiar em body/query/headers do browser para usuario_id, nome ou e-mail.
 * - Não falha silenciosamente: registra logs claros em caso de erro, sem interromper
 *   a ação principal já concluída.
 */
export async function registrarAuditoriaServer(
  input: RegistrarAuditoriaServerInput
): Promise<void> {
  const ctx = input.contexto;
  const usuarioNome = ctx?.usuarioNome?.trim() || "Sistema";
  const usuarioEmail = ctx?.usuarioEmail?.trim() || "sistema@navarroeng.com.br";
  const usuarioId = ctx?.usuarioId ?? null;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("auditoria_sistema").insert({
      usuario_id: usuarioId,
      usuario_nome: usuarioNome,
      usuario_email: usuarioEmail,
      modulo: input.modulo,
      acao: input.acao,
      registro_id: input.registroId ? String(input.registroId).trim() : null,
      registro_nome: input.registroNome ? String(input.registroNome).trim() : null,
      descricao: input.descricao.trim(),
      dados_antes: sanitizarDadosAuditoria(input.dadosAntes),
      dados_depois: sanitizarDadosAuditoria(input.dadosDepois),
    });

    if (error) {
      console.error("[auditoria-server] Falha ao persistir evento de auditoria:", {
        error: error.message,
        modulo: input.modulo,
        acao: input.acao,
        registroId: input.registroId,
      });
    }
  } catch (err) {
    console.error("[auditoria-server] Exceção ao gravar auditoria:", {
      error: err instanceof Error ? err.message : String(err),
      modulo: input.modulo,
      acao: input.acao,
    });
  }
}
