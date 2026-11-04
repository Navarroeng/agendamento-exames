/**
 * Prazos da NR-7 citados no contrato da Gestão SST.
 * A dispensa médica do demissional não zera nem altera o valor do exame.
 */

export const DISPENSA_DEMISSIONAL_NR7 = {
  graus1e2Dias: 135,
  graus3e4Dias: 90,
} as const;

/** Limite da NR-7 para dispensa do exame demissional. Não autoriza deixar de cobrar outro tipo. */
export function diasDispensaDemissionalNr7(grauRisco: number): number | null {
  const grau = Math.floor(Number(grauRisco));
  if (grau === 1 || grau === 2) return DISPENSA_DEMISSIONAL_NR7.graus1e2Dias;
  if (grau === 3 || grau === 4) return DISPENSA_DEMISSIONAL_NR7.graus3e4Dias;
  return null;
}

/** Dispensa médica: menos de 135 dias (graus 1 e 2) ou menos de 90 (graus 3 e 4). */
export function exameDemissionalDispensadoPelaNr7(params: {
  grauRisco: number;
  diasDesdeUltimoExameClinico: number;
}): boolean {
  const limite = diasDispensaDemissionalNr7(params.grauRisco);
  if (limite == null) return false;
  const dias = Number(params.diasDesdeUltimoExameClinico);
  if (!Number.isFinite(dias) || dias < 0) return false;
  return dias < limite;
}
