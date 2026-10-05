import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { buildFaturaClienteLembreteEmailHtml } from "@/lib/email/templates/fatura-cliente-lembrete-email";
import { resolveFaturaEnvioEmailAssetsBaseUrl } from "@/lib/email/fatura-envio-email-assets";
import {
  getResendFromAddressFaturas,
  getResendReplyToAddressFaturas,
} from "@/lib/email/resend-config";
import { getResendClient } from "@/lib/email/resend-client";
import { isEmailValido } from "@/lib/email-validacao";
import { buildFaturaLembreteIdempotencyKey } from "@/lib/fatura-envio-idempotency";
import {
  motivoBloqueioLembrete,
  validarConteudoLembrete,
  type FaturaLembreteRegistro,
} from "@/lib/fatura-lembrete";
import { nomeArquivoPdfFaturaClienteEmail } from "@/lib/fatura-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FaturaComItens } from "@/lib/types";

const ERRO_ENVIO =
  "Não foi possível enviar o lembrete. O envio não foi registrado.";

export type EnviarLembreteFaturaResult = {
  lembrete: FaturaLembreteRegistro;
  faturaLembreteUltimoEm: string;
  faturaLembreteUltimoEmail: string;
  resendMessageId: string | null;
  reutilizado: boolean;
};

export type EnviarLembreteFaturaDeps = {
  buscarFatura: (faturaId: string) => Promise<FaturaComItens | null>;
  gerarPdfBuffer: (
    fatura: FaturaComItens
  ) => Promise<{ buffer: Buffer; filename: string }>;
  buscarLembretePorIdempotency: (
    idempotencyKey: string
  ) => Promise<FaturaLembreteRegistro | null>;
  registrarLembreteAceito: (params: {
    faturaId: string;
    email: string;
    assunto: string;
    mensagem: string;
    resendMessageId: string | null;
    idempotencyKey: string;
    enviadoEm: string;
    auditContext?: AuditoriaUsuarioContext;
  }) => Promise<FaturaLembreteRegistro>;
  atualizarUltimoLembrete: (params: {
    faturaId: string;
    email: string;
    enviadoEm: string;
  }) => Promise<void>;
  enviarEmailResend: (params: {
    from: string;
    to: string;
    replyTo: string;
    subject: string;
    html: string;
    attachmentFilename: string;
    attachmentContent: Buffer;
    idempotencyKey: string;
  }) => Promise<{ id: string | null }>;
  registrarAuditoriaFalha?: (params: {
    fatura: FaturaComItens;
    email: string;
    assunto: string;
    erro: string;
    auditContext?: AuditoriaUsuarioContext;
  }) => Promise<void>;
  registrarAuditoriaSucesso?: (params: {
    fatura: FaturaComItens;
    lembrete: FaturaLembreteRegistro;
    auditContext?: AuditoriaUsuarioContext;
  }) => Promise<void>;
};

function mapLembrete(row: Record<string, unknown>): FaturaLembreteRegistro {
  return {
    id: String(row.id),
    fatura_id: String(row.fatura_id),
    enviado_em: String(row.enviado_em),
    destinatario: String(row.destinatario),
    usuario_id: row.usuario_id ? String(row.usuario_id) : null,
    usuario_nome: String(row.usuario_nome ?? ""),
    assunto: String(row.assunto ?? ""),
    mensagem: String(row.mensagem ?? ""),
    resend_message_id: row.resend_message_id
      ? String(row.resend_message_id)
      : null,
    situacao: "aceito_resend",
  };
}

async function buscarLembretePorIdempotency(
  idempotencyKey: string
): Promise<FaturaLembreteRegistro | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fatura_lembretes")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapLembrete(data as Record<string, unknown>);
}

async function registrarLembreteAceito(params: {
  faturaId: string;
  email: string;
  assunto: string;
  mensagem: string;
  resendMessageId: string | null;
  idempotencyKey: string;
  enviadoEm: string;
  auditContext?: AuditoriaUsuarioContext;
}): Promise<FaturaLembreteRegistro> {
  const admin = createAdminClient();
  const usuarioNome =
    params.auditContext?.usuarioNome?.trim() ||
    params.auditContext?.usuarioEmail?.trim() ||
    "Sistema";

  const { data, error } = await admin
    .from("fatura_lembretes")
    .insert({
      fatura_id: params.faturaId,
      enviado_em: params.enviadoEm,
      destinatario: params.email,
      usuario_id: params.auditContext?.usuarioId ?? null,
      usuario_nome: usuarioNome,
      assunto: params.assunto,
      mensagem: params.mensagem,
      resend_message_id: params.resendMessageId,
      situacao: "aceito_resend",
      idempotency_key: params.idempotencyKey,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existente = await buscarLembretePorIdempotency(params.idempotencyKey);
      if (existente) return existente;
    }
    throw error;
  }

  return mapLembrete(data as Record<string, unknown>);
}

async function atualizarUltimoLembrete(params: {
  faturaId: string;
  email: string;
  enviadoEm: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("faturas")
    .update({
      fatura_lembrete_ultimo_em: params.enviadoEm,
      fatura_lembrete_ultimo_email: params.email,
    })
    .eq("id", params.faturaId);
  if (error) throw error;
}

const defaultDeps: EnviarLembreteFaturaDeps = {
  buscarFatura: async (faturaId) => {
    const { buscarFaturaComItensAdmin } = await import(
      "@/services/fatura-envio-email.server"
    );
    return buscarFaturaComItensAdmin(faturaId);
  },
  gerarPdfBuffer: async (fatura) => {
    const { gerarPdfFaturaClienteBufferServer } = await import(
      "@/lib/fatura-pdf-server"
    );
    return gerarPdfFaturaClienteBufferServer(fatura);
  },
  buscarLembretePorIdempotency,
  registrarLembreteAceito,
  atualizarUltimoLembrete,
  enviarEmailResend: async (params) => {
    const resend = getResendClient();
    const result = await resend.emails.send(
      {
        from: params.from,
        to: params.to,
        replyTo: params.replyTo,
        subject: params.subject,
        html: params.html,
        attachments: [
          {
            filename: params.attachmentFilename,
            content: params.attachmentContent,
          },
        ],
      },
      { idempotencyKey: params.idempotencyKey }
    );

    if (result.error) {
      throw new Error(result.error.message || "Falha ao enviar e-mail via Resend.");
    }
    return { id: result.data?.id ?? null };
  },
  registrarAuditoriaFalha: async ({
    fatura,
    email,
    assunto,
    erro,
    auditContext,
  }) => {
    const { registrarAuditoriaServer } = await import(
      "@/services/auditoria.server"
    );
    const usuarioNome =
      auditContext?.usuarioNome?.trim() ||
      auditContext?.usuarioEmail?.trim() ||
      "Sistema";
    await registrarAuditoriaServer({
      contexto: {
        usuarioId: auditContext?.usuarioId ?? null,
        usuarioNome,
        usuarioEmail: auditContext?.usuarioEmail ?? "",
      },
      modulo: AUDITORIA_MODULOS.faturas_clientes,
      acao: AUDITORIA_ACOES.fatura_lembrete_falhou,
      registroId: fatura.id,
      registroNome: fatura.numero,
      descricao: `${usuarioNome} — falha ao enviar lembrete da fatura ${fatura.numero} para ${email}.`,
      dadosDepois: {
        email_destinatario: email,
        assunto,
        erro,
        registrado_como_sucesso: false,
      },
    });
  },
  registrarAuditoriaSucesso: async ({ fatura, lembrete, auditContext }) => {
    const { registrarAuditoriaServer } = await import(
      "@/services/auditoria.server"
    );
    const usuarioNome =
      auditContext?.usuarioNome?.trim() ||
      auditContext?.usuarioEmail?.trim() ||
      "Sistema";
    await registrarAuditoriaServer({
      contexto: {
        usuarioId: auditContext?.usuarioId ?? null,
        usuarioNome,
        usuarioEmail: auditContext?.usuarioEmail ?? "",
      },
      modulo: AUDITORIA_MODULOS.faturas_clientes,
      acao: AUDITORIA_ACOES.fatura_lembrete_enviado,
      registroId: fatura.id,
      registroNome: fatura.numero,
      descricao: `${usuarioNome} enviou lembrete da fatura ${fatura.numero} para ${lembrete.destinatario}. Aceito pelo Resend; entrega não confirmada.`,
      dadosDepois: {
        email_destinatario: lembrete.destinatario,
        assunto: lembrete.assunto,
        resend_message_id: lembrete.resend_message_id,
        situacao: lembrete.situacao,
        entrega_confirmada: false,
        valor_total: fatura.valor_total,
        data_vencimento: fatura.data_vencimento,
        status: fatura.status,
      },
    });
  },
};

async function auditarFalha(
  merged: EnviarLembreteFaturaDeps,
  params: Parameters<
    NonNullable<EnviarLembreteFaturaDeps["registrarAuditoriaFalha"]>
  >[0]
): Promise<void> {
  try {
    await merged.registrarAuditoriaFalha?.(params);
  } catch (err) {
    console.error("[fatura-lembrete-auditoria]", err);
  }
}

function assertFaturaPermiteLembrete(fatura: FaturaComItens): void {
  const motivo = motivoBloqueioLembrete(fatura);
  if (motivo) throw new Error(motivo);
}

async function concluirLembreteExistente(
  merged: EnviarLembreteFaturaDeps,
  existente: FaturaLembreteRegistro
): Promise<EnviarLembreteFaturaResult> {
  await merged.atualizarUltimoLembrete({
    faturaId: existente.fatura_id,
    email: existente.destinatario,
    enviadoEm: existente.enviado_em,
  });
  return {
    lembrete: existente,
    faturaLembreteUltimoEm: existente.enviado_em,
    faturaLembreteUltimoEmail: existente.destinatario,
    resendMessageId: existente.resend_message_id,
    reutilizado: true,
  };
}

/**
 * Envia lembrete manual sem alterar valor, vencimento, status ou o envio original.
 * Só grava histórico depois que o Resend aceita o e-mail.
 */
export async function enviarLembreteFaturaClienteResend(
  params: {
    faturaId: string;
    email: string;
    assunto: string;
    mensagem: string;
    requestId: string;
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  },
  deps: Partial<EnviarLembreteFaturaDeps> = {}
): Promise<EnviarLembreteFaturaResult> {
  const merged = { ...defaultDeps, ...deps };
  const faturaId = params.faturaId.trim();
  const email = params.email.trim();
  const conteudo = validarConteudoLembrete({
    assunto: params.assunto,
    mensagem: params.mensagem,
  });

  if (!faturaId) throw new Error("Fatura inválida.");
  if (!isEmailValido(email)) {
    throw new Error("Informe um e-mail válido para o destinatário do lembrete.");
  }

  const idempotencyKey = buildFaturaLembreteIdempotencyKey({
    faturaId,
    requestId: params.requestId,
  });

  const jaAceito = await merged.buscarLembretePorIdempotency(idempotencyKey);
  if (jaAceito) {
    return concluirLembreteExistente(merged, jaAceito);
  }

  const fatura = await merged.buscarFatura(faturaId);
  if (!fatura) throw new Error("Fatura não encontrada.");
  assertFaturaPermiteLembrete(fatura);

  const valorAntes = fatura.valor_total;
  const vencimentoAntes = fatura.data_vencimento;
  const statusAntes = fatura.status;
  const envioOriginalAntes = fatura.fatura_enviada_em ?? null;

  let pdfBuffer: Buffer;
  try {
    const pdf = await merged.gerarPdfBuffer(fatura);
    pdfBuffer = pdf.buffer;
    if (!pdfBuffer?.length) throw new Error("PDF vazio.");
  } catch (err) {
    console.error("[fatura-lembrete-pdf]", err);
    await auditarFalha(merged, {
      fatura,
      email,
      assunto: conteudo.assunto,
      erro: err instanceof Error ? err.message : "Falha ao gerar PDF.",
      auditContext: params.auditContext,
    });
    throw new Error(ERRO_ENVIO);
  }

  const faturaPreEnvio = await merged.buscarFatura(faturaId);
  if (!faturaPreEnvio) throw new Error("Fatura não encontrada.");
  assertFaturaPermiteLembrete(faturaPreEnvio);
  if (
    faturaPreEnvio.valor_total !== valorAntes ||
    faturaPreEnvio.data_vencimento !== vencimentoAntes
  ) {
    throw new Error(
      "A fatura foi alterada antes do envio. Atualize a tela e tente novamente."
    );
  }

  const assetsBaseUrl = resolveFaturaEnvioEmailAssetsBaseUrl(params.request);
  const html = buildFaturaClienteLembreteEmailHtml({
    fatura,
    assunto: conteudo.assunto,
    mensagem: conteudo.mensagem,
    assetsBaseUrl,
  });
  const attachmentFilename = nomeArquivoPdfFaturaClienteEmail(
    fatura.numero,
    fatura.referencia_nome
  );

  let resendMessageId: string | null = null;
  try {
    const sent = await merged.enviarEmailResend({
      from: getResendFromAddressFaturas(),
      to: email,
      replyTo: getResendReplyToAddressFaturas(),
      subject: conteudo.assunto,
      html,
      attachmentFilename,
      attachmentContent: pdfBuffer,
      idempotencyKey,
    });
    resendMessageId = sent.id;
    if (!resendMessageId) {
      throw new Error("Resend não retornou confirmação de envio.");
    }
  } catch (err) {
    console.error("[fatura-lembrete-resend]", err);
    await auditarFalha(merged, {
      fatura,
      email,
      assunto: conteudo.assunto,
      erro: err instanceof Error ? err.message : "Falha Resend.",
      auditContext: params.auditContext,
    });
    throw new Error(ERRO_ENVIO);
  }

  const enviadoEm = new Date().toISOString();
  let lembrete: FaturaLembreteRegistro;
  try {
    lembrete = await merged.registrarLembreteAceito({
      faturaId,
      email,
      assunto: conteudo.assunto,
      mensagem: conteudo.mensagem,
      resendMessageId,
      idempotencyKey,
      enviadoEm,
      auditContext: params.auditContext,
    });
  } catch (err) {
    console.error("[fatura-lembrete-historico]", err);
    throw new Error(
      "O Resend aceitou o lembrete, mas o histórico não foi gravado. Tente novamente sem alterar a mensagem para concluir o registro."
    );
  }

  try {
    await merged.atualizarUltimoLembrete({
      faturaId,
      email: lembrete.destinatario,
      enviadoEm: lembrete.enviado_em,
    });
  } catch (err) {
    console.error("[fatura-lembrete-ultimo]", err);
  }

  if (
    fatura.valor_total !== valorAntes ||
    fatura.data_vencimento !== vencimentoAntes ||
    fatura.status !== statusAntes ||
    (fatura.fatura_enviada_em ?? null) !== envioOriginalAntes
  ) {
    throw new Error("Inconsistência detectada após o lembrete.");
  }

  await merged.registrarAuditoriaSucesso?.({
    fatura,
    lembrete,
    auditContext: params.auditContext,
  });

  return {
    lembrete,
    faturaLembreteUltimoEm: lembrete.enviado_em,
    faturaLembreteUltimoEmail: lembrete.destinatario,
    resendMessageId: lembrete.resend_message_id,
    reutilizado: false,
  };
}

export async function listarLembretesFatura(
  faturaId: string
): Promise<FaturaLembreteRegistro[]> {
  const id = faturaId.trim();
  if (!id) throw new Error("Fatura inválida.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fatura_lembretes")
    .select(
      "id, fatura_id, enviado_em, destinatario, usuario_id, usuario_nome, assunto, mensagem, resend_message_id, situacao"
    )
    .eq("fatura_id", id)
    .order("enviado_em", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapLembrete(row as Record<string, unknown>));
}
