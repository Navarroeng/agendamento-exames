export const VALIDADE_PROPOSTA_DIAS = 15;

/** Validade = data de emissão + 15 dias (ISO YYYY-MM-DD). */
export function calcValidadePropostaIso(dataPropostaIso: string): string {
  const isoDate = dataPropostaIso.trim().split("T")[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + VALIDADE_PROPOSTA_DIAS);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Validade exibida/persistida: sempre derivada da data de emissão. */
export function resolveValidadePropostaIso(dataPropostaIso: string): string {
  return calcValidadePropostaIso(dataPropostaIso);
}
