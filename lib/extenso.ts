import { formatCurrency } from "@/lib/money";

/** Números e valores em reais por extenso (pt-BR), sem dependência externa. */

const UNIDADES = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
] as const;

const ESPECIAIS_10 = [
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
] as const;

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
] as const;

const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
] as const;

const MESES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

function grupoAte999(n: number): string {
  if (n < 0 || n > 999 || !Number.isInteger(n)) {
    throw new Error("Grupo numérico inválido.");
  }
  if (n === 0) return "";
  if (n === 100) return "cem";
  if (n < 10) return UNIDADES[n];
  if (n < 20) return ESPECIAIS_10[n - 10];

  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const dezena = Math.floor(resto / 10);
  const unidade = resto % 10;

  const partes: string[] = [];
  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto === 0) {
    return partes.join(" e ");
  }
  if (resto < 10) {
    partes.push(UNIDADES[resto]);
    return partes.join(" e ");
  }
  if (resto < 20) {
    partes.push(ESPECIAIS_10[resto - 10]);
    return partes.join(" e ");
  }

  if (unidade === 0) {
    partes.push(DEZENAS[dezena]);
  } else {
    partes.push(`${DEZENAS[dezena]} e ${UNIDADES[unidade]}`);
  }
  return partes.join(" e ");
}

/** Inteiro de 0 a 999.999.999 por extenso. */
export function numeroPorExtenso(valor: number): string {
  const n = Math.round(valor);
  if (!Number.isFinite(n) || n < 0 || n > 999_999_999) {
    throw new Error("Número fora do intervalo suportado para extenso.");
  }
  if (n === 0) return "zero";

  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];

  if (milhoes === 1) partes.push("um milhão");
  else if (milhoes > 1) partes.push(`${grupoAte999(milhoes)} milhões`);

  if (milhares === 1) partes.push("mil");
  else if (milhares > 1) partes.push(`${grupoAte999(milhares)} mil`);

  if (resto > 0) {
    const grupo = grupoAte999(resto);
    if (partes.length === 0) {
      partes.push(grupo);
    } else if (resto < 100 || resto % 100 === 0) {
      partes.push(`e ${grupo}`);
    } else {
      partes.push(grupo);
    }
  }

  return partes.join(" ").replace(/\s+/g, " ").trim();
}

export function formatNumeroComExtenso(valor: number): string {
  const n = Math.round(valor);
  return `${n} (${numeroPorExtenso(n)})`;
}

function plural(qtd: number, singular: string, pluralForm: string): string {
  return qtd === 1 ? singular : pluralForm;
}

/** Valor monetário em reais por extenso (centavos em inteiro). */
export function valorPorExtenso(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error("Valor inválido para extenso.");
  }
  const cents = Math.round(valor * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;

  const reaisTxt =
    reais === 0
      ? ""
      : `${numeroPorExtenso(reais)} ${plural(reais, "real", "reais")}`;
  const centavosTxt =
    centavos === 0
      ? ""
      : `${numeroPorExtenso(centavos)} ${plural(centavos, "centavo", "centavos")}`;

  if (reaisTxt && centavosTxt) return `${reaisTxt} e ${centavosTxt}`;
  if (reaisTxt) return reaisTxt;
  return centavosTxt || "zero real";
}

export function formatMoedaComExtenso(valor: number): string {
  return `${formatCurrency(valor)} (${valorPorExtenso(valor)})`;
}

export function dataPorExtensoPtBr(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Data inválida para extenso.");
  }
  const mes = MESES_PT[month - 1];
  if (!mes) throw new Error("Mês inválido para extenso.");
  return `${day} de ${mes} de ${year}`;
}
