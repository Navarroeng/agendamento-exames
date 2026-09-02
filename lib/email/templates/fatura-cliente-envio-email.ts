import {
  buildFaturaEnvioEmailAssetUrl,
  resolveFaturaEnvioEmailAssetsBaseUrl,
} from "@/lib/email/fatura-envio-email-assets";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  competenciaLabelBRUpperFromFatura,
  mesReferenciaBRFromFatura,
} from "@/lib/fatura-reemissao";
import { formatCurrency } from "@/lib/money";
import { NAVARRO_DADOS_BANCARIOS } from "@/lib/navarro-pagamento";
import type { FaturaComItens } from "@/lib/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Assunto: Fatura de Exames Ocupacionais – [EMPRESA] – [COMPETÊNCIA] */
export function buildAssuntoFaturaClienteEmail(
  fatura: Pick<
    FaturaComItens,
    "numero" | "referencia_nome" | "mes_referencia" | "periodo_inicio"
  >
): string {
  const empresa = String(fatura.referencia_nome ?? "").trim() || "Empresa";
  const competencia =
    competenciaLabelBRUpperFromFatura(fatura) ??
    mesReferenciaBRFromFatura(fatura) ??
    "—";
  return `Fatura de Exames Ocupacionais – ${empresa} – ${competencia}`;
}

export type FaturaClienteEnvioEmailParams = {
  fatura: Pick<
    FaturaComItens,
    | "numero"
    | "referencia_nome"
    | "data_vencimento"
    | "valor_total"
    | "mes_referencia"
    | "periodo_inicio"
  >;
  assetsBaseUrl?: string;
};

const EMAIL_CONTAINER_WIDTH = 640;
const NAVY = "#0b1f4d";
const GOLD = "#c9972b";
const MUTED = "#64748b";
const BODY = "#334155";

function renderSummaryField(label: string, value: string, highlight = false): string {
  return `
    <tr>
      <td style="padding:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0 0 4px;font-size:10px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${GOLD};">${label}</p>
        <p style="margin:0;font-size:${highlight ? "18px" : "15px"};line-height:1.45;font-weight:${highlight ? "700" : "600"};color:${NAVY};word-break:break-word;">${value}</p>
      </td>
    </tr>`;
}

function renderBankField(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0 0 2px;font-size:10px;line-height:1.4;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${label}</p>
        <p style="margin:0;font-size:14px;line-height:1.5;color:${NAVY};word-break:break-word;">${value}</p>
      </td>
    </tr>`;
}

/**
 * HTML do envio de fatura: arte cabeçalho + conteúdo dinâmico + arte rodapé.
 * Contatos, assinatura e confidencialidade ficam somente na arte do rodapé.
 */
export function buildFaturaClienteEnvioEmailHtml(
  params: FaturaClienteEnvioEmailParams
): string {
  const empresa = escapeHtml(
    String(params.fatura.referencia_nome ?? "").trim() || "Empresa"
  );
  const numero = escapeHtml(String(params.fatura.numero ?? "").trim() || "—");
  const competencia = escapeHtml(
    competenciaLabelBRUpperFromFatura(params.fatura) ?? "—"
  );
  const vencimento = escapeHtml(
    formatDateIsoToBR(params.fatura.data_vencimento)
  );
  const valor = escapeHtml(formatCurrency(Number(params.fatura.valor_total)));

  const assetsBaseUrl =
    params.assetsBaseUrl?.trim() ||
    resolveFaturaEnvioEmailAssetsBaseUrl(undefined);
  const cabecalhoUrl = escapeHtml(
    buildFaturaEnvioEmailAssetUrl("cabecalho", assetsBaseUrl)
  );
  const rodapeUrl = escapeHtml(
    buildFaturaEnvioEmailAssetUrl("rodape", assetsBaseUrl)
  );

  const imgStyle = `display:block;width:100%;max-width:${EMAIL_CONTAINER_WIDTH}px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;`;

  const banco = escapeHtml(NAVARRO_DADOS_BANCARIOS.banco);
  const agencia = escapeHtml(NAVARRO_DADOS_BANCARIOS.agencia);
  const conta = escapeHtml(NAVARRO_DADOS_BANCARIOS.conta);
  const pixCnpj = escapeHtml(NAVARRO_DADOS_BANCARIOS.pixCnpj);
  const favorecido = escapeHtml(NAVARRO_DADOS_BANCARIOS.favorecido);

  const preheader = escapeHtml(
    `Fatura de Exames Ocupacionais – ${String(params.fatura.referencia_nome ?? "").trim() || "Empresa"} – ${competenciaLabelBRUpperFromFatura(params.fatura) ?? "—"}`
  );

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Fatura ${numero}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 680px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100% !important;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:16px 12px;">
        <table role="presentation" class="email-container" width="${EMAIL_CONTAINER_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${EMAIL_CONTAINER_WIDTH}px;background-color:#ffffff;">
          <tr>
            <td align="center" style="padding:0;margin:0;font-size:0;line-height:0;">
              <img src="${cabecalhoUrl}" width="${EMAIL_CONTAINER_WIDTH}" alt="Navarro Engenharia de Segurança e Medicina Ocupacional" style="${imgStyle}" />
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BODY};">Olá,</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BODY};">
                Encaminhamos em anexo a fatura referente aos exames realizados no mês de <strong style="color:${NAVY};">${competencia}</strong>.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BODY};">
                O documento completo encontra-se anexado a este e-mail em formato PDF para sua conferência.
              </p>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BODY};">
                Agradecemos pela confiança e permanecemos à disposição para quaisquer dúvidas.
              </p>
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding:8px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e2e8f0;border-top:3px solid ${GOLD};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(11,31,77,0.06);">
                <tr>
                  <td style="padding:22px 22px 8px 22px;background-color:#f8fafc;border-bottom:1px solid #e8edf5;">
                    <p style="margin:0;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${NAVY};">Resumo da fatura</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 22px 10px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${renderSummaryField("Empresa", empresa)}
                      ${renderSummaryField("Fatura", numero)}
                      ${renderSummaryField("Competência", competencia)}
                      ${renderSummaryField("Vencimento", vencimento)}
                      ${renderSummaryField("Valor", valor, true)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding:0 32px 24px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:${BODY};">
                Para sua comodidade, seguem abaixo os dados para pagamento.
              </p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${NAVY};font-weight:700;">
                Após o pagamento, pedimos a gentileza de nos enviar o comprovante.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ${NAVY};border-radius:8px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 14px;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${GOLD};">Dados bancários</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${renderBankField("Banco", banco)}
                      ${renderBankField("Agência", agencia)}
                      ${renderBankField("Conta", conta)}
                      ${renderBankField("CNPJ PIX", pixCnpj)}
                      ${renderBankField("Favorecido", favorecido)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0;margin:0;font-size:0;line-height:0;">
              <img src="${rodapeUrl}" width="${EMAIL_CONTAINER_WIDTH}" alt="Navarro Engenharia" style="${imgStyle}" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
