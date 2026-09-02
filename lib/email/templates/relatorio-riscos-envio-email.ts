import {
  buildRelatorioEnvioEmailAssetUrl,
  resolveRelatorioEnvioEmailAssetsBaseUrl,
} from "@/lib/email/riscos-relatorio-envio-email-assets";

/** Monta assunto do e-mail de envio do relatório de Riscos Psicossociais. */
export function buildAssuntoRelatorioRiscosEmail(empresaNome: string): string {
  const nome = String(empresaNome ?? "").trim() || "Empresa";
  return `Relatório de Avaliação dos Riscos Psicossociais – ${nome}`;
}

export type RelatorioRiscosEnvioEmailParams = {
  empresaNome: string;
  /** Override opcional; padrão resolve SST em produção ou localhost em dev. */
  assetsBaseUrl?: string;
};

const EMAIL_CONTAINER_WIDTH = 640;

/**
 * HTML do e-mail de envio: arte cabeçalho + conteúdo dinâmico + arte rodapé.
 * Sem dados sensíveis do relatório; PDF permanece no anexo.
 */
export function buildRelatorioRiscosEnvioEmailHtml(
  params: RelatorioRiscosEnvioEmailParams
): string {
  const empresa = escapeHtml(
    String(params.empresaNome ?? "").trim() || "Empresa"
  );
  const assetsBaseUrl =
    params.assetsBaseUrl?.trim() ||
    resolveRelatorioEnvioEmailAssetsBaseUrl(undefined);
  const cabecalhoUrl = escapeHtml(
    buildRelatorioEnvioEmailAssetUrl("cabecalho", assetsBaseUrl)
  );
  const rodapeUrl = escapeHtml(
    buildRelatorioEnvioEmailAssetUrl("rodape", assetsBaseUrl)
  );
  const imgStyle = `display:block;width:100%;max-width:${EMAIL_CONTAINER_WIDTH}px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;`;

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Relatório de Avaliação dos Riscos Psicossociais</title>
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
<body style="margin:0;padding:0;width:100% !important;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0b1f4d;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    Relatório de Avaliação dos Riscos Psicossociais – ${empresa}
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
            <td class="email-padding" style="padding:28px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">Olá,</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">
                Encaminhamos em anexo o Relatório de Avaliação dos Riscos Psicossociais referente à empresa:
              </p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.5;font-weight:700;color:#0b1f4d;">${empresa}</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#334155;">
                O documento apresenta os resultados consolidados da avaliação realizada por meio do instrumento COPSOQ II, incluindo a análise das categorias avaliadas, indicadores complementares, conclusão técnica e recomendações.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0;">
                <tr>
                  <td style="padding-top:20px;">
                    <p style="margin:0 0 6px;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Empresa avaliada</p>
                    <p style="margin:0 0 18px;font-size:16px;line-height:1.45;font-weight:700;color:#0b1f4d;">${empresa}</p>
                    <p style="margin:0 0 6px;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Documento</p>
                    <p style="margin:0;font-size:15px;line-height:1.45;font-weight:700;color:#0b1f4d;">Relatório de Avaliação dos Riscos Psicossociais</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0;margin:0;font-size:0;line-height:0;">
              <img src="${rodapeUrl}" width="${EMAIL_CONTAINER_WIDTH}" alt="Navarro Engenharia – rodapé institucional do e-mail" style="${imgStyle}" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
