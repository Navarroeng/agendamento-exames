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
import { buildFaturaEnvioIdempotencyKey } from "@/lib/fatura-envio-idempotency";
import { gerarPdfFaturaClienteBufferServer } from "@/lib/fatura-pdf-server";
import { nomeArquivoPdfFaturaClienteEmail } from "@/lib/fatura-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FaturaComItens } from "@/lib/types";
import { registrarAuditoria } from "@/services/auditoria.service";

export type EnviarFaturaClienteEmailResult = {
  fatura: FaturaComItens;
  resendMessageId: string;
};

export type EnviarFaturaClienteEmailDeps = {
  buscarFatura: (faturaId: string) => Promise<FaturaComItens | null>;
  gerarPdfBuffer: typeof gerarPdfFaturaClienteBufferServer;
  enviarEmailResend: (params: {
    from: string;
    to: string;
    replyTo: string;
    subject: string;
    html: string;
    attachmentFilename: string;
    attachmentContent: Buffer;
    idempotencyKey: string;
  }) => Promise<{ id: string }>;
  confirmarPrimeiroEnvio: (params: {
    faturaId: string;
    email: string;
    resendMessageId: string;
    faturaSnapshot: FaturaComItens;
    auditContext?: AuditoriaUsuarioContext;
  }) => Promise<FaturaComItens>;
  registrarAuditoriaFalha?: (params: {
    fatura: FaturaComItens;
    email: string;
    erro: string;
    auditContext?: AuditoriaUsuarioContext;
  }) => Promise<void>;
};

async function buscarFaturaComItensAdmin(
  faturaId: string
): Promise<FaturaComItens | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("faturas")
    .select("*, fatura_itens(*)")
    .eq("id", faturaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as FaturaComItens;
  row.fatura_itens = (row.fatura_itens ?? []).sort((a, b) =>
    a.data_agendamento.localeCompare(b.data_agendamento)
  );
  return row;
}

async function confirmarPrimeiroEnvioFatura(params: {
  faturaId: string;
  email: string;
  resendMessageId: string;
  faturaSnapshot: FaturaComItens;
  auditContext?: AuditoriaUsuarioContext;
}): Promise<FaturaComItens> {
  const admin = createAdminClient();
  const usuarioNome =
    params.auditContext?.usuarioNome?.trim() ||
    params.auditContext?.usuarioEmail?.trim() ||
    "Sistema";
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("faturas")
    .update({
      fatura_enviada_em: now,
      fatura_enviada_email: params.email,
      fatura_enviada_por: usuarioNome,
      fatura_enviada_por_user_id: params.auditContext?.usuarioId ?? null,
      fatura_envio_resend_id: params.resendMessageId,
    })
    .eq("id", params.faturaId)
    .is("fatura_enviada_em", null)
    .select("*, fatura_itens(*)")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("O envio desta versão já foi confirmado.");
  }

  const fatura = data as FaturaComItens;
  fatura.fatura_itens = (fatura.fatura_itens ?? []).sort((a, b) =>
    a.data_agendamento.localeCompare(b.data_agendamento)
  );

  await registrarAuditoria({
    usuarioId: params.auditContext?.usuarioId ?? null,
    usuarioNome,
    usuarioEmail: params.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.faturas_clientes,
    acao: AUDITORIA_ACOES.fatura_envio_email_enviado,
    registroId: fatura.id,
    registroNome: fatura.numero,
    descricao: `${usuarioNome} enviou a fatura ${fatura.numero} por e-mail para ${params.email}.`,
    dadosDepois: {
      email_destinatario: params.email,
      resend_message_id: params.resendMessageId,
      data_emissao: params.faturaSnapshot.data_emissao,
      valor_total: params.faturaSnapshot.valor_total,
      status: params.faturaSnapshot.status,
    },
  });

  return fatura;
}

const defaultDeps: EnviarFaturaClienteEmailDeps = {
  buscarFatura: buscarFaturaComItensAdmin,
  gerarPdfBuffer: gerarPdfFaturaClienteBufferServer,
  confirmarPrimeiroEnvio: confirmarPrimeiroEnvioFatura,
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
      descricao: `${usuarioNome} — falha ao enviar a fatura ${fatura.numero} para ${email}.`,
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

/**
 * Orquestra geração do PDF (jsPDF snapshot), envio Resend e registro operacional.
 * Só persiste envio após sucesso do Resend. Não altera status financeiro.
 */
export async function enviarFaturaClientePorEmailResend(
  params: {
    faturaId: string;
    email: string;
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  },
  deps: Partial<EnviarFaturaClienteEmailDeps> = {}
): Promise<EnviarFaturaClienteEmailResult> {
  const merged = { ...defaultDeps, ...deps };
  const faturaId = params.faturaId.trim();
  const email = params.email.trim();

  if (!faturaId) throw new Error("Fatura inválida.");
  if (!isEmailValido(email)) {
    throw new Error("Informe um e-mail válido para o envio da fatura.");
  }

  const fatura = await merged.buscarFatura(faturaId);
  if (!fatura) throw new Error("Fatura não encontrada.");
  assertFaturaPermiteEnvio(fatura);

  if (isFaturaEnvioExplicitamenteConfirmado(fatura)) {
    throw new Error("Esta fatura já foi enviada. Use o reenvio explícito.");
  }

  const versaoIdentidade = buildFaturaEnvioVersaoIdentidade(fatura);
  const snapshotValorTotal = fatura.valor_total;
  const snapshotStatus = fatura.status;

  let pdfBuffer: Buffer;
  try {
    const pdf = await merged.gerarPdfBuffer(fatura);
    pdfBuffer = pdf.buffer;
    if (!pdfBuffer?.length) {
      throw new Error("PDF vazio.");
    }
  } catch (err) {
    console.error("[fatura-envio-pdf]", err);
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
  const idempotencyKey = buildFaturaEnvioIdempotencyKey({
    faturaId,
    versaoIdentidade,
  });

  const faturaPreEnvio = await merged.buscarFatura(faturaId);
  if (
    !faturaPreEnvio ||
    isFaturaEnvioExplicitamenteConfirmado(faturaPreEnvio)
  ) {
    throw new Error("Esta fatura já foi enviada. Use o reenvio explícito.");
  }

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
    console.error("[fatura-envio-resend]", err);
    await merged.registrarAuditoriaFalha!({
      fatura,
      email,
      erro: err instanceof Error ? err.message : "Falha Resend.",
      auditContext: params.auditContext,
    });
    throw new Error("Não foi possível enviar a fatura. Tente novamente.");
  }

  const record = await merged.confirmarPrimeiroEnvio({
    faturaId,
    email,
    resendMessageId,
    faturaSnapshot: fatura,
    auditContext: params.auditContext,
  });

  if (
    record.valor_total !== snapshotValorTotal ||
    record.status !== snapshotStatus
  ) {
    throw new Error("Inconsistência detectada após envio (dados financeiros).");
  }

  return { fatura: record, resendMessageId };
}

export { buscarFaturaComItensAdmin };
