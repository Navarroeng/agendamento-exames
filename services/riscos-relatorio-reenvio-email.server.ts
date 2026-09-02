import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  buildAssuntoRelatorioRiscosEmail,
  buildRelatorioRiscosEnvioEmailHtml,
} from "@/lib/email/templates/relatorio-riscos-envio-email";
import {
  getResendFromAddress,
  getResendReplyToAddress,
} from "@/lib/email/resend-config";
import { getResendClient } from "@/lib/email/resend-client";
import { resolveRelatorioEnvioEmailAssetsBaseUrl } from "@/lib/email/riscos-relatorio-envio-email-assets";
import { isEmailValido } from "@/lib/email-validacao";
import { isRelatorioEnvioExplicitamenteConfirmado } from "@/lib/riscos-relatorio-envio";
import {
  buildRelatorioReenvioIdempotencyKey,
} from "@/lib/riscos-relatorio-envio-idempotency";
import { nomeArquivoPdfRelatorioRiscosEmail } from "@/lib/riscos-relatorio-pdf";
import {
  gerarPdfRelatorioRiscosBuffer,
  resolveAppBaseUrl,
} from "@/lib/riscos-relatorio-pdf-server";
import { criarRelatorioPrintToken } from "@/lib/riscos-relatorio-print-token";
import {
  criarReenvioIntentToken,
  verificarReenvioIntentToken,
} from "@/lib/riscos-relatorio-reenvio-intent-token";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import { buscarRelatorioPorCampanhaId } from "@/services/riscos-relatorio.server";
import { assertProcessoRiscosNaoCanceladoNoServidor } from "@/services/riscos-campanha-cancelar.server";
import { registrarAuditoria } from "@/services/auditoria.service";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReenviarRelatorioRiscosResult = {
  relatorio: RiscosRelatorioRecord;
  resendMessageId: string;
};

export type ReenviarRelatorioRiscosDeps = {
  gerarPdfBuffer: typeof gerarPdfRelatorioRiscosBuffer;
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
  buscarRelatorio: typeof buscarRelatorioPorCampanhaId;
  validarCampanhaParaEnvio?: (campanhaId: string) => Promise<void>;
  registrarAuditoriaReenvio?: (params: {
    relatorio: RiscosRelatorioRecord;
    email: string;
    resendMessageId: string;
    reenvioIntentId: string;
    auditContext?: AuditoriaUsuarioContext;
  }) => Promise<void>;
};

const defaultDeps: ReenviarRelatorioRiscosDeps = {
  gerarPdfBuffer: gerarPdfRelatorioRiscosBuffer,
  buscarRelatorio: buscarRelatorioPorCampanhaId,
  validarCampanhaParaEnvio: async (campanhaId) => {
    const campanha = await buscarCampanhaBasica(campanhaId);
    if (!campanha) throw new Error("Campanha/pesquisa não encontrada.");
    await assertProcessoRiscosNaoCanceladoNoServidor({
      orcamentoId: campanha.orcamento_id
        ? String(campanha.orcamento_id)
        : null,
      campanhaId: String(campanha.id),
    });
  },
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
    relatorio,
    email,
    resendMessageId,
    reenvioIntentId,
    auditContext,
  }) => {
    const usuarioNome =
      auditContext?.usuarioNome?.trim() ||
      auditContext?.usuarioEmail?.trim() ||
      "Sistema";
    await registrarAuditoria({
      usuarioId: auditContext?.usuarioId ?? null,
      usuarioNome,
      usuarioEmail: auditContext?.usuarioEmail ?? "",
      modulo: AUDITORIA_MODULOS.riscos_psicossociais,
      acao: AUDITORIA_ACOES.riscos_relatorio_envio_reenviado,
      registroId: relatorio.id,
      registroNome: relatorio.codigo_publico,
      descricao: `${usuarioNome} reenviou o relatório ${relatorio.codigo_publico} por e-mail para ${email}.`,
      dadosDepois: {
        email_destinatario: email,
        resend_message_id: resendMessageId,
        reenvio_intent_id: reenvioIntentId,
        gerado_em: relatorio.gerado_em,
        relatorio_enviado_em: relatorio.relatorio_enviado_em,
        relatorio_enviado_email: relatorio.relatorio_enviado_email,
      },
    });
  },
};

async function buscarCampanhaBasica(campanhaId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("riscos_campanhas")
    .select("id, orcamento_id, empresa_nome, status")
    .eq("id", campanhaId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Emite intent efêmero server-side para um reenvio explícito. */
export async function prepararReenvioRelatorioRiscos(
  campanhaId: string,
  deps: Partial<ReenviarRelatorioRiscosDeps> = {}
): Promise<{ reenvioIntentToken: string }> {
  const merged = { ...defaultDeps, ...deps };
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  await merged.validarCampanhaParaEnvio!(id);

  const relatorio = await merged.buscarRelatorio(id);
  if (!relatorio) {
    throw new Error("Relatório não encontrado.");
  }
  if (
    !isRelatorioEnvioExplicitamenteConfirmado({
      relatorioEnviadoEm: relatorio.relatorio_enviado_em,
    })
  ) {
    throw new Error(
      "O relatório ainda não foi enviado. Use o envio inicial por e-mail."
    );
  }

  const reenvioIntentToken = criarReenvioIntentToken({
    campanhaId: id,
    relatorioId: relatorio.id,
    geradoEm: relatorio.gerado_em,
  });

  return { reenvioIntentToken };
}

/**
 * Reenvia a mesma versão do relatório (sem regenerar, sem alterar conclusão).
 * Registra auditoria; não altera `gerado_em`, `resultado_json` nem `relatorio_enviado_*`.
 */
export async function reenviarRelatorioRiscosPorEmailResend(
  params: {
    campanhaId: string;
    email: string;
    reenvioIntentToken: string;
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  },
  deps: Partial<ReenviarRelatorioRiscosDeps> = {}
): Promise<ReenviarRelatorioRiscosResult> {
  const merged = { ...defaultDeps, ...deps };
  const campanhaId = params.campanhaId.trim();
  const email = params.email.trim();
  const intent = verificarReenvioIntentToken(params.reenvioIntentToken);

  if (intent.campanhaId !== campanhaId) {
    throw new Error("Intent de reenvio inválido para esta campanha.");
  }

  if (!campanhaId) throw new Error("Campanha inválida.");
  if (!isEmailValido(email)) {
    throw new Error("Informe um e-mail válido para o reenvio do relatório.");
  }

  await merged.validarCampanhaParaEnvio!(campanhaId);

  const relatorio = await merged.buscarRelatorio(campanhaId);
  if (!relatorio) {
    throw new Error("Relatório não encontrado.");
  }

  if (relatorio.id !== intent.relatorioId) {
    throw new Error("Intent de reenvio inválido para esta versão do relatório.");
  }
  if (relatorio.gerado_em !== intent.geradoEm) {
    throw new Error(
      "A versão do relatório mudou. Inicie o reenvio novamente."
    );
  }

  if (
    !isRelatorioEnvioExplicitamenteConfirmado({
      relatorioEnviadoEm: relatorio.relatorio_enviado_em,
    })
  ) {
    throw new Error(
      "O relatório ainda não foi enviado. Use o envio inicial por e-mail."
    );
  }

  const snapshotGeradoEm = relatorio.gerado_em;

  const empresaNome =
    relatorio.empresa_nome ||
    relatorio.resultado_json?.capa?.empresaNome ||
    "Empresa";

  const token = criarRelatorioPrintToken({
    campanhaId,
    relatorioId: relatorio.id,
  });
  const baseUrl = resolveAppBaseUrl(params.request);
  const pdfBuffer = await merged.gerarPdfBuffer({ baseUrl, token });

  if (!pdfBuffer?.length) {
    throw new Error("Não foi possível gerar o PDF do relatório.");
  }

  const attachmentFilename = nomeArquivoPdfRelatorioRiscosEmail(empresaNome);
  const subject = buildAssuntoRelatorioRiscosEmail(empresaNome);
  const assetsBaseUrl = resolveRelatorioEnvioEmailAssetsBaseUrl(params.request);
  const html = buildRelatorioRiscosEnvioEmailHtml({ empresaNome, assetsBaseUrl });
  const idempotencyKey = buildRelatorioReenvioIdempotencyKey({
    campanhaId,
    relatorioId: relatorio.id,
    geradoEm: relatorio.gerado_em,
    reenvioIntentId: intent.intentId,
  });

  let resendMessageId: string;
  try {
    const sent = await merged.enviarEmailResend({
      from: getResendFromAddress(),
      to: email,
      replyTo: getResendReplyToAddress(),
      subject,
      html,
      attachmentFilename,
      attachmentContent: pdfBuffer,
      idempotencyKey,
    });
    resendMessageId = sent.id;
  } catch (err) {
    console.error("[riscos-relatorio-reenvio-resend]", err);
    throw new Error("Não foi possível reenviar o relatório. Tente novamente.");
  }

  const relatorioPos = await merged.buscarRelatorio(campanhaId);
  if (!relatorioPos) {
    throw new Error("Relatório não encontrado após reenvio.");
  }

  const usuarioNome =
    params.auditContext?.usuarioNome?.trim() ||
    params.auditContext?.usuarioEmail?.trim() ||
    "Sistema";

  await merged.registrarAuditoriaReenvio!({
    relatorio: relatorioPos,
    email,
    resendMessageId,
    reenvioIntentId: intent.intentId,
    auditContext: params.auditContext,
  });

  if (relatorioPos.gerado_em !== snapshotGeradoEm) {
    throw new Error("Inconsistência detectada após reenvio (gerado_em).");
  }

  return { relatorio: relatorioPos, resendMessageId };
}
