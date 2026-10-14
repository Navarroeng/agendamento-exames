/**
 * O PDF está atualizado quando a revisão das condições gravada nele
 * é a revisão vigente da aprovação. O carimbo desatualizado_em é só
 * o sinal legado, usado quando o documento ainda não tem revisão.
 */

export function revisaoCondicoesAprovacao(aprovacao: {
  condicoes_revisao?: number | string | null;
}): number | null {
  return revisaoInteira(aprovacao.condicoes_revisao, 1);
}

export function revisaoCondicoesDocumento(documento: {
  condicoes_revisao?: number | string | null;
}): number | null {
  return revisaoInteira(documento.condicoes_revisao, 0);
}

export function pdfContratoEstaDesatualizado(
  documento: {
    condicoes_revisao?: number | string | null;
    desatualizado_em?: string | null;
  },
  aprovacao: {
    condicoes_revisao?: number | string | null;
    contrato_assinado?: boolean | null;
  }
): boolean {
  if (aprovacao.contrato_assinado) return false;
  const vigente = revisaoCondicoesAprovacao(aprovacao);
  const usada = revisaoCondicoesDocumento(documento);
  if (vigente != null && usada != null) {
    return usada !== vigente;
  }
  return Boolean(documento.desatualizado_em);
}

function revisaoInteira(
  value: number | string | null | undefined,
  minimo: number
): number | null {
  if (value == null || value === "") return null;
  const numero = Number(value);
  if (!Number.isInteger(numero) || numero < minimo) return null;
  return numero;
}
