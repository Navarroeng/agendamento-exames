import { Resend } from "resend";
import { getResendApiKey } from "@/lib/email/resend-config";

let resendClient: Resend | null = null;

/** Client Resend singleton — usar somente em código server-side. */
export function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(getResendApiKey());
  }
  return resendClient;
}

/** Permite resetar o singleton em testes. */
export function resetResendClientForTests(): void {
  resendClient = null;
}
