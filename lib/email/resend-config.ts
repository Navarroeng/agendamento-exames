/** Configuração server-side do Resend (sem expor API key ao client). */

export const RESEND_FROM_DEFAULT =
  "Navarro Engenharia <relatorios@docs.navarroeng.com.br>";

/**
 * Reply-To padrão dos e-mails SST (envio/reenvio do relatório de Riscos).
 * Único lugar com o valor fixo — altere aqui ou via env `RESEND_REPLY_TO`.
 */
export const RESEND_REPLY_TO_DEFAULT = "contato@navarroeng.com.br";

export const RESEND_FROM_FATURAS_DEFAULT =
  "Navarro Engenharia <financeiro@docs.navarroeng.com.br>";

export const RESEND_REPLY_TO_FATURAS_DEFAULT = "atendimento@navarroeng.com.br";

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "RESEND_API_KEY não configurada. Defina a variável no ambiente do servidor."
    );
  }
  return key;
}

export function getResendFromAddress(): string {
  return process.env.RESEND_FROM?.trim() || RESEND_FROM_DEFAULT;
}

export function getResendReplyToAddress(): string {
  return process.env.RESEND_REPLY_TO?.trim() || RESEND_REPLY_TO_DEFAULT;
}

export function getResendFromAddressFaturas(): string {
  return process.env.RESEND_FROM_FATURAS?.trim() || RESEND_FROM_FATURAS_DEFAULT;
}

export function getResendReplyToAddressFaturas(): string {
  return (
    process.env.RESEND_REPLY_TO_FATURAS?.trim() ||
    RESEND_REPLY_TO_FATURAS_DEFAULT
  );
}
