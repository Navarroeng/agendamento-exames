import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  buildAssuntoFaturaClienteEmail,
  buildFaturaClienteEnvioEmailHtml,
} from "@/lib/email/templates/fatura-cliente-envio-email";
import { resolveFaturaEnvioEmailAssetsBaseUrl } from "@/lib/email/fatura-envio-email-assets";
import {
  getResendFromAddressFaturas,
  getResendReplyToAddressFaturas,
} from "@/lib/email/resend-config";
import { getResendClient } from "@/lib/email/resend-client";
import { isEmailValido } from "@/lib/email-validacao";
import {
  buildFaturaEnvioVersaoIdentidade,
  faturaStatusPermiteEnvioEmail,
  isFaturaEnvioExplicitamenteConfirmado,
} from "@/lib/fatura-envio";
import { buildFaturaReenvioIdempotencyKey } from "@/lib/fatura-envio-idempotency";
import {
  criarFaturaReenvioIntentToken,
  verificarFaturaReenvioIntentToken,
} from "@/lib/fatura-reenvio-intent-token";
import { gerarPdfFaturaClienteBufferServer } from "@/lib/fatura-pdf-server";
import { nomeArquivoPdfFaturaClienteEmail } from "@/lib/fatura-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FaturaComItens } from "@/lib/types";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  buscarFaturaComItensAdmin,
  type EnviarFaturaClienteEmailDeps,
} from "@/services/fatura-envio-email.server";

export type ReenviarFaturaClienteEmailResult = {
  fatura: FaturaComItens;
  resendMessageId: string;
};

export type ReenviarFaturaClienteEmailDeps = {
  buscarFatura: typeof buscarFaturaComItensAdmin;
  gerarPdfBuffer: typeof gerarPdfFaturaClienteBufferServer;
  enviarEmailResend: EnviarFaturaClienteEmailDeps["enviarEmailResend"];
  registrarAuditoriaReenvio?: (params: {
    fatura: FaturaComItens;
    email: string;
    resendMessageId: string;
    reenvioIntentId: string;
    auditContext?: AuditoriaUsuarioContext;
  }) => Promise<FaturaComItens>;
  registrarAuditoriaFalha?: EnviarFaturaClienteEmailDeps["registrarAuditoriaFalha"];
};

const defaultDeps: ReenviarFaturaClienteEmailDeps = {
  buscarFatura: buscarFaturaComItensAdmin,
  gerarPdfBuffer: gerarPdfFaturaClienteBufferServer,
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
    const id = result.data?.id;
    if (!id) {
      throw new Error("Resend não retornou confirmação de envio.");
    }
    return { id };
  },
  registrarAuditoriaReenvio: async ({
    fatura,
    email,
    resendMessageId,
    reenvioIntentId,
    auditContext,
  }) => {
    const admin = createAdminClient();
    const usuarioNome =
      auditContext?.usuarioNome?.trim() ||
      auditContext?.usuarioEmail?.trim() ||
      "Sistema";
    const now = new Date().toISOString();
    const reenvioCount = Number(fatura.fatura_envio_reenvio_count ?? 0) + 1;

    const { data, error } = await admin
      .from("faturas")
      .update({
        fatura_enviada_em: now,
        fatura_enviada_email: email,
        fatura_enviada_por: usuarioNome,
        fatura_enviada_por_user_id: auditContext?.usuarioId ?? null,
        fatura_envio_resend_id: resendMessageId,
        fatura_envio_reenvio_count: reenvioCount,
      })
      .eq("id", fatura.id)
      .select("*, fatura_itens(*)")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Fatura não encontrada após reenvio.");

    const atualizada = data as FaturaComItens;
    atualizada.fatura_itens = (atualizada.fatura_itens ?? []).sort((a, b) =>
      a.data_agendamento.localeCompare(b.data_agendamento)
    );

    await registrarAuditoria({
      usuarioId: auditContext?.usuarioId ?? null,
      usuarioNome,
      usuarioEmail: auditContext?.usuarioEmail ?? "",
      modulo: AUDITORIA_MODULOS.faturas_clientes,
      acao: AUDITORIA_ACOES.fatura_envio_email_reenviado,
      registroId: atualizada.id,
      registroNome: atualizada.numero,
      descricao: `${usuarioNome} reenviou a fatura ${atualizada.numero} por e-mail para ${email}.`,
      dadosDepois: {
        email_destinatario: email,
        resend_message_id: resendMessageId,
        reenvio_intent_id: reenvioIntentId,
        data_emissao: fatura.data_emissao,
        valor_total: fatura.valor_total,
        status: fatura.status,
        fatura_envio_reenvio_count: reenvioCount,
      },
    });

    return atualizada;
  },
  registrarAuditoriaFalha: async ({ fatura, email, erro, auditContext }) => {
    const usuarioNome =
      auditContext?.usuarioNome?.trim() ||
      auditContext?.usuarioEmail?.trim() ||
      "Sistema";
    await registrarAuditoria({
      usuarioId: auditContext?.usuarioId ?? null,
      usuarioNome,
      usuarioEmail: auditContext?.usuarioEmail ?? "",
      modulo: AUDITORIA_MODULOS.faturas_clientes,
      acao: AUDITORIA_ACOES.fatura_envio_email_falhou,
      registroId: fatura.id,
      registroNome: fatura.numero,
      descricao: `${usuarioNome} — falha ao reenviar a fatura ${fatura.numero} para ${email}.`,
      dadosDepois: { email_destinatario: email, erro },
    });
  },
};

function assertFaturaPermiteEnvio(fatura: FaturaComItens): void {
  if (fatura.tipo !== "cliente") {
    throw new Error("Envio por e-mail disponível apenas para faturas de cliente.");
  }
  if (!faturaStatusPermiteEnvioEmail(fatura.status)) {
    throw new Error("Esta fatura não pode ser enviada no status atual.");
  }
}

/** Emite intent efêmero server-side para reenvio explícito. */
export async function prepararReenvioFaturaCliente(
  faturaId: string,
  deps: Partial<ReenviarFaturaClienteEmailDeps> = {}
): Promise<{ reenvioIntentToken: string }> {
  const merged = { ...defaultDeps, ...deps };
  const id = faturaId.trim();
  if (!id) throw new Error("Fatura inválida.");

  const fatura = await merged.buscarFatura(id);
  if (!fatura) throw new Error("Fatura não encontrada.");
  assertFaturaPermiteEnvio(fatura);

  if (!isFaturaEnvioExplicitamenteConfirmado(fatura)) {
    throw new Error(
      "A fatura ainda não foi enviada. Use o envio inicial por e-mail."
    );
  }

  const versaoIdentidade = buildFaturaEnvioVersaoIdentidade(fatura);
  const reenvioIntentToken = criarFaturaReenvioIntentToken({
    faturaId: id,
    versaoIdentidade,
  });

  return { reenvioIntentToken };
}

/**
 * Reenvia a mesma versão snapshot da fatura (sem recalcular, sem alterar status financeiro).
 */
export async function reenviarFaturaClientePorEmailResend(
  params: {
    faturaId: string;
    email: string;
    reenvioIntentToken: string;
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  },
  deps: Partial<ReenviarFaturaClienteEmailDeps> = {}
): Promise<ReenviarFaturaClienteEmailResult> {
  const merged = { ...defaultDeps, ...deps };
  const faturaId = params.faturaId.trim();
  const email = params.email.trim();
  const intent = verificarFaturaReenvioIntentToken(params.reenvioIntentToken);

  if (intent.faturaId !== faturaId) {
    throw new Error("Intent de reenvio inválido para esta fatura.");
  }

  if (!faturaId) throw new Error("Fatura inválida.");
  if (!isEmailValido(email)) {
    throw new Error("Informe um e-mail válido para o reenvio da fatura.");
  }

  const fatura = await merged.buscarFatura(faturaId);
  if (!fatura) throw new Error("Fatura não encontrada.");
  assertFaturaPermiteEnvio(fatura);

  const versaoIdentidade = buildFaturaEnvioVersaoIdentidade(fatura);
  if (versaoIdentidade !== intent.versaoIdentidade) {
    throw new Error(
      "A versão da fatura mudou. Inicie o reenvio novamente."
    );
  }

  if (!isFaturaEnvioExplicitamenteConfirmado(fatura)) {
    throw new Error(
      "A fatura ainda não foi enviada. Use o envio inicial por e-mail."
    );
  }

  const snapshotValorTotal = fatura.valor_total;
  const snapshotStatus = fatura.status;
  const snapshotPago = fatura.pago;
  const snapshotDataEmissao = fatura.data_emissao;

  let pdfBuffer: Buffer;
  try {
    const pdf = await merged.gerarPdfBuffer(fatura);
    pdfBuffer = pdf.buffer;
    if (!pdfBuffer?.length) {
      throw new Error("PDF vazio.");
    }
  } catch (err) {
    console.error("[fatura-reenvio-pdf]", err);
    await merged.registrarAuditoriaFalha!({
      fatura,
      email,
      erro: err instanceof Error ? err.message : "Falha ao gerar PDF.",
      auditContext: params.auditContext,
    });
    throw new Error("Não foi possível enviar a fatura. Tente novamente.");
  }

  const subject = buildAssuntoFaturaClienteEmail(fatura);
  const assetsBaseUrl = resolveFaturaEnvioEmailAssetsBaseUrl(params.request);
  const html = buildFaturaClienteEnvioEmailHtml({ fatura, assetsBaseUrl });
  const attachmentFilename = nomeArquivoPdfFaturaClienteEmail(
    fatura.numero,
    fatura.referencia_nome
  );
  const idempotencyKey = buildFaturaReenvioIdempotencyKey({
    faturaId,
    versaoIdentidade,
    reenvioIntentId: intent.intentId,
  });

  let resendMessageId: string;
  try {
    const sent = await merged.enviarEmailResend({
      from: getResendFromAddressFaturas(),
      to: email,
      replyTo: getResendReplyToAddressFaturas(),
      subject,
      html,
      attachmentFilename,
      attachmentContent: pdfBuffer,
      idempotencyKey,
    });
    resendMessageId = sent.id;
  } catch (err) {
    console.error("[fatura-reenvio-resend]", err);
    await merged.registrarAuditoriaFalha!({
      fatura,
      email,
      erro: err instanceof Error ? err.message : "Falha Resend.",
      auditContext: params.auditContext,
    });
    throw new Error("Não foi possível enviar a fatura. Tente novamente.");
  }

  const record = await merged.registrarAuditoriaReenvio!({
    fatura,
    email,
    resendMessageId,
    reenvioIntentId: intent.intentId,
    auditContext: params.auditContext,
  });

  if (
    record.valor_total !== snapshotValorTotal ||
    record.status !== snapshotStatus ||
    record.pago !== snapshotPago ||
    record.data_emissao !== snapshotDataEmissao
  ) {
    throw new Error("Inconsistência detectada após reenvio (dados financeiros).");
  }

  return { fatura: record, resendMessageId };
}
