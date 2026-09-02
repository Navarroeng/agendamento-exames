import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
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
import { nomeArquivoPdfRelatorioRiscosEmail } from "@/lib/riscos-relatorio-pdf";
import {
  gerarPdfRelatorioRiscosBuffer,
  resolveAppBaseUrl,
} from "@/lib/riscos-relatorio-pdf-server";
import { criarRelatorioPrintToken } from "@/lib/riscos-relatorio-print-token";
import { buildRelatorioEnvioIdempotencyKey } from "@/lib/riscos-relatorio-envio-idempotency";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import {
  buscarRelatorioPorCampanhaId,
  confirmarEnvioRelatorioNoServidor,
} from "@/services/riscos-relatorio.server";
import { assertProcessoRiscosNaoCanceladoNoServidor } from "@/services/riscos-campanha-cancelar.server";
import { createAdminClient } from "@/lib/supabase/admin";

export type EnviarRelatorioRiscosResendResult = {
  relatorio: RiscosRelatorioRecord;
  resendMessageId: string;
};

export type EnviarRelatorioRiscosResendDeps = {
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
  confirmarEnvio: typeof confirmarEnvioRelatorioNoServidor;
  buscarRelatorio: typeof buscarRelatorioPorCampanhaId;
  validarCampanhaParaEnvio?: (campanhaId: string) => Promise<void>;
};

const defaultDeps: EnviarRelatorioRiscosResendDeps = {
  gerarPdfBuffer: gerarPdfRelatorioRiscosBuffer,
  buscarRelatorio: buscarRelatorioPorCampanhaId,
  confirmarEnvio: confirmarEnvioRelatorioNoServidor,
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

/**
 * Orquestra geração do PDF (Playwright), envio Resend e confirmação do processo.
 * Só persiste envio/conclusão após sucesso do Resend.
 */
export async function enviarRelatorioRiscosPorEmailResend(
  params: {
    campanhaId: string;
    email: string;
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  },
  deps: Partial<EnviarRelatorioRiscosResendDeps> = {}
): Promise<EnviarRelatorioRiscosResendResult> {
  const merged = { ...defaultDeps, ...deps };
  const campanhaId = params.campanhaId.trim();
  const email = params.email.trim();

  if (!campanhaId) throw new Error("Campanha inválida.");
  if (!isEmailValido(email)) {
    throw new Error("Informe um e-mail válido para o envio do relatório.");
  }

  await merged.validarCampanhaParaEnvio!(campanhaId);

  const relatorio = await merged.buscarRelatorio(campanhaId);
  if (!relatorio) {
    throw new Error("Gere o relatório antes de enviar por e-mail.");
  }

  if (
    isRelatorioEnvioExplicitamenteConfirmado({
      relatorioEnviadoEm: relatorio.relatorio_enviado_em,
    })
  ) {
    throw new Error("O envio desta versão já foi confirmado.");
  }

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
  const idempotencyKey = buildRelatorioEnvioIdempotencyKey({
    campanhaId,
    relatorioId: relatorio.id,
    geradoEm: relatorio.gerado_em,
  });

  const relatorioPreEnvio = await merged.buscarRelatorio(campanhaId);
  if (
    !relatorioPreEnvio ||
    isRelatorioEnvioExplicitamenteConfirmado({
      relatorioEnviadoEm: relatorioPreEnvio.relatorio_enviado_em,
    })
  ) {
    throw new Error("O envio desta versão já foi confirmado.");
  }

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
    console.error("[riscos-relatorio-envio-resend]", err);
    throw new Error("Não foi possível enviar o relatório. Tente novamente.");
  }

  const record = await merged.confirmarEnvio(campanhaId, email, {
    origem: "resend",
    auditContext: params.auditContext,
  });

  return { relatorio: record, resendMessageId };
}
