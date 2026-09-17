import { addMonthsToIsoDate } from "@/lib/cliente-contrato-dates";
import { formatCurrency } from "@/lib/money";

/**
 * Incremento de mês-calendário preservando o dia quando existir.
 * Não soma 30 dias. 31/01 + 1 → último dia de fevereiro; 31/01 + 2 → 31/03.
 */
export function addCalendarMonths(isoDate: string, months: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    throw new Error("Data ISO inválida para vencimento contratual.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(months)) {
    throw new Error("Quantidade de meses inválida.");
  }

  const totalMonths = year * 12 + (month - 1) + months;
  const y = Math.floor(totalMonths / 12);
  const mIndex = ((totalMonths % 12) + 12) % 12;
  const lastDay = new Date(y, mIndex + 1, 0).getDate();
  const d = Math.min(day, lastDay);
  return `${y}-${String(mIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Divide o valor em N parcelas em centavos; o resto vai para as primeiras. */
export function splitValorEmCentavos(
  valor: number,
  parcelas: number
): number[] {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error("Valor contratual inválido.");
  }
  const n = Math.floor(Number(parcelas));
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("Quantidade de parcelas inválida.");
  }
  const totalCents = Math.round(valor * 100);
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function centsToReais(cents: number): number {
  return cents / 100;
}

export type ContratoParcela = {
  indice: number;
  dataIso: string;
  valorCentavos: number;
  valor: number;
};

export function montarParcelasPontual(params: {
  valorTotal: number;
  quantidadeParcelas: number;
  dataContrato: string;
}): ContratoParcela[] {
  const n = Math.max(1, Math.floor(params.quantidadeParcelas) || 1);
  const centavos = splitValorEmCentavos(params.valorTotal, n);
  return centavos.map((valorCentavos, i) => ({
    indice: i + 1,
    dataIso:
      i === 0
        ? params.dataContrato
        : addCalendarMonths(params.dataContrato, i),
    valorCentavos,
    valor: centsToReais(valorCentavos),
  }));
}

export function montarMensalidades(params: {
  valorMensal: number;
  quantidade: number;
  dataContrato: string;
}): ContratoParcela[] {
  const n = Math.max(1, Math.floor(params.quantidade) || 1);
  const valorCentavos = Math.round(params.valorMensal * 100);
  return Array.from({ length: n }, (_, i) => ({
    indice: i + 1,
    dataIso:
      i === 0
        ? params.dataContrato
        : addCalendarMonths(params.dataContrato, i),
    valorCentavos,
    valor: centsToReais(valorCentavos),
  }));
}

export function somaParcelasCentavos(parcelas: ContratoParcela[]): number {
  return parcelas.reduce((acc, p) => acc + p.valorCentavos, 0);
}

export function formatParcelaLinha(parcela: ContratoParcela): string {
  const ord = `${parcela.indice}ª`;
  return `${ord} parcela: ${formatCurrency(parcela.valor)} com vencimento em ${parcela.dataIso}`;
}

/** Garante que o helper legado de +meses continua disponível para outros fluxos. */
export { addMonthsToIsoDate };
