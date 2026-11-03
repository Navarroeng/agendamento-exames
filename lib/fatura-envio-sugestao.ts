import { isEmailValido } from "@/lib/email-validacao";

/**
 * Envio confirmado usado para sugerir o destinatário.
 * A lista pode atravessar competências: o vínculo é `referencia_id`, nunca o nome.
 */
export type FaturaEnvioEmailFonte = {
  id: string;
  tipo?: string | null;
  referencia_id?: string | null;
  fatura_enviada_email?: string | null;
  fatura_enviada_em?: string | null;
};

/**
 * Último e-mail de faturamento confirmado para o cliente (`referencia_id`).
 *
 * Regras:
 * - Não usa `clientes.email`, orçamento ou e-mail comercial.
 * - Só considera envios bem-sucedidos (`fatura_enviada_em` + e-mail válido).
 * - Ordena pelo `fatura_enviada_em` mais recente (reenvio incluído).
 * - Não filtra por competência: o histórico de meses anteriores entra na busca.
 * - `excludeFaturaId`: opcional — exclui a fatura atual ao sugerir para nova emissão.
 */
export function obterEmailEnvioSugeridoCliente(
  faturas: FaturaEnvioEmailFonte[],
  referenciaId: string | null | undefined,
  excludeFaturaId?: string | null
): string | null {
  const refId = referenciaId?.trim();
  if (!refId) return null;

  let melhor: { email: string; ts: number } | null = null;

  for (const f of faturas) {
    if (f.tipo && f.tipo !== "cliente") continue;
    if (f.referencia_id !== refId) continue;
    if (excludeFaturaId && f.id === excludeFaturaId) continue;

    const email = f.fatura_enviada_email?.trim() ?? "";
    const em = f.fatura_enviada_em?.trim();
    if (!isEmailValido(email) || !em) continue;

    const ts = new Date(em).getTime();
    if (Number.isNaN(ts)) continue;

    if (!melhor || ts > melhor.ts) {
      melhor = { email, ts };
    }
  }

  return melhor?.email ?? null;
}

/**
 * Aplica a sugestão assíncrona sem substituir o que a usuária já digitou.
 * E-mail já gravado nesta fatura tem prioridade sobre o histórico.
 */
export function aplicarEmailSugeridoSemSobrescrever(params: {
  emailAtual: string;
  usuarioEditou: boolean;
  emailSugerido?: string | null;
  emailDestaFatura?: string | null;
}): string {
  if (params.usuarioEditou) return params.emailAtual;

  const proprio = params.emailDestaFatura?.trim() ?? "";
  if (isEmailValido(proprio)) return proprio;

  const sugerido = params.emailSugerido?.trim() ?? "";
  if (isEmailValido(sugerido)) return sugerido;

  return params.emailAtual;
}

/** Cliente já teve ao menos um envio de fatura confirmado com sucesso. */
export function clienteTemHistoricoEnvioFatura(
  faturas: FaturaEnvioEmailFonte[],
  referenciaId: string | null | undefined
): boolean {
  return obterEmailEnvioSugeridoCliente(faturas, referenciaId) !== null;
}

export function formatFaturaEnvioDataHora(iso: string | null | undefined): {
  data: string;
  hora: string;
} | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    data: d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    hora: d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function formatFaturaEnvioTooltip(
  enviadaEm: string | null | undefined,
  enviadaEmail: string | null | undefined
): string | null {
  const dh = formatFaturaEnvioDataHora(enviadaEm);
  const email = enviadaEmail?.trim();
  if (!dh || !email) return null;
  return `Enviada em ${dh.data} às ${dh.hora} para ${email}`;
}
