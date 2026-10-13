import { CONTRATO_VIGENCIA_MENSALIDADE_MESES } from "@/lib/contrato-navarro";
import { formatCurrency } from "@/lib/money";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { isGestaoMensalSstNome } from "@/lib/orcamento-modalidade";

export const MENSALIDADE_DESCONTO_NEGATIVO_MSG =
  "O desconto não pode ser negativo.";
export const MENSALIDADE_DESCONTO_ACIMA_BASE_MSG =
  "O desconto não pode ser maior que a base da gestão no período.";
export const MENSALIDADE_FINAL_INVALIDO_MSG =
  "O valor final à vista deve ser maior que zero.";
export const MENSALIDADE_FINAL_ACIMA_BRUTO_MSG =
  "O valor final à vista não pode ser maior que o total bruto.";
export const MENSALIDADE_VENCIMENTO_MSG =
  "Informe o vencimento do pagamento único.";
export const MENSALIDADE_CONTRATO_ASSINADO_MSG =
  "Não é possível alterar as condições de pagamento porque o contrato já está assinado. O documento assinado não é substituído. Use o fluxo de alteração contratual.";
export const MENSALIDADE_FINANCEIRO_MSG =
  "Não é possível alterar o pagamento à vista porque já existe cobrança emitida, boleto ou pagamento registrado. Cobranças com histórico não são apagadas e boletos não são cancelados por esta alteração.";
export const MENSALIDADE_SEM_PERMISSAO_MSG =
  "Você não tem permissão para editar as condições aprovadas.";
export const MENSALIDADE_RPC_AUSENTE_MSG =
  "A edição da mensalidade à vista ainda não está disponível no banco. Execute o script 134_mensalidade_pagamento_avista.sql.";

export type MensalidadeFormaPagamento = "mensal" | "avista";
export type MensalidadeDescontoTipo = "valor" | "percentual";
export type MensalidadeFonteCalculo = "desconto" | "final";

export type ItemValorMensalidade = {
  servico_nome?: string | null;
  valor_total?: number | string | null;
};

export type BaseMensalidadeAvista = {
  valorMensalCentavos: number;
  meses: number;
  valorPontualCentavos: number;
  baseGestaoCentavos: number;
  valorBrutoCentavos: number;
};

export type CalculoMensalidadeAvista = BaseMensalidadeAvista & {
  descontoCentavos: number;
  descontoPercentual: number;
  valorFinalCentavos: number;
  valorMensal: number;
  valorPontual: number;
  valorBruto: number;
  descontoValor: number;
  valorFinal: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function reaisParaCentavos(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round(valor * 100);
}

export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

export function parseDecimalBr(value: string): number {
  const cleaned = String(value ?? "")
    .replace(/%/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function textoMoedaCentavos(centavos: number): string {
  return formatCurrency(centavosParaReais(centavos));
}

export function textoPercentual(percentual: number): string {
  return percentual.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function partesIso(iso: string): { y: number; m: number; d: number } | null {
  const texto = iso.trim().slice(0, 10);
  if (!ISO_DATE.test(texto)) return null;
  const [y, m, d] = texto.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
}

/** Meses de calendário entre início e fim, no mesmo critério de age() do Postgres. */
export function mesesEntreDatas(
  inicio: string | null | undefined,
  fim: string | null | undefined
): number | null {
  if (!inicio || !fim) return null;
  const a = partesIso(inicio);
  const b = partesIso(fim);
  if (!a || !b) return null;
  let meses = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) meses -= 1;
  return meses >= 1 ? meses : null;
}

/**
 * Vigência usada no à vista: datas do contrato, senão a quantidade já salva,
 * senão a vigência padrão da mensalidade. Não inventa outro prazo.
 */
export function resolverMesesVigenciaMensalidade(params: {
  dataInicio?: string | null;
  dataFim?: string | null;
  mesesSalvos?: number | null;
}): number {
  const entre = mesesEntreDatas(params.dataInicio, params.dataFim);
  if (entre) return entre;
  const salvos = Math.floor(Number(params.mesesSalvos));
  if (Number.isInteger(salvos) && salvos >= 1) return salvos;
  return CONTRATO_VIGENCIA_MENSALIDADE_MESES;
}

export function somarPontuaisMensalidadeCentavos(
  itens: ItemValorMensalidade[] | null | undefined
): number {
  let total = 0;
  for (const item of itens ?? []) {
    if (isGestaoMensalSstNome(item.servico_nome)) continue;
    const valor = Number(item.valor_total);
    if (!Number.isFinite(valor) || valor <= 0) continue;
    total += reaisParaCentavos(valor);
  }
  return total;
}

export function montarBaseMensalidadeAvista(params: {
  valorMensal: number;
  meses: number;
  itens?: ItemValorMensalidade[] | null;
}): BaseMensalidadeAvista {
  const meses = Math.floor(Number(params.meses));
  if (!Number.isInteger(meses) || meses < 1) {
    throw new Error("Não foi possível identificar a vigência contratada.");
  }
  const valorMensalCentavos = reaisParaCentavos(Number(params.valorMensal) || 0);
  const valorPontualCentavos = somarPontuaisMensalidadeCentavos(params.itens);
  const baseGestaoCentavos = valorMensalCentavos * meses;
  return {
    valorMensalCentavos,
    meses,
    valorPontualCentavos,
    baseGestaoCentavos,
    valorBrutoCentavos: baseGestaoCentavos + valorPontualCentavos,
  };
}

function percentualDeDesconto(
  descontoCentavos: number,
  baseGestaoCentavos: number
): number {
  if (baseGestaoCentavos <= 0) return 0;
  return Math.round((descontoCentavos * 100 * 10000) / baseGestaoCentavos) / 10000;
}

function fecharCalculo(
  base: BaseMensalidadeAvista,
  descontoCentavos: number
): CalculoMensalidadeAvista {
  const valorFinalCentavos = base.valorBrutoCentavos - descontoCentavos;
  const descontoPercentual = percentualDeDesconto(
    descontoCentavos,
    base.baseGestaoCentavos
  );
  return {
    ...base,
    descontoCentavos,
    descontoPercentual,
    valorFinalCentavos,
    valorMensal: centavosParaReais(base.valorMensalCentavos),
    valorPontual: centavosParaReais(base.valorPontualCentavos),
    valorBruto: centavosParaReais(base.valorBrutoCentavos),
    descontoValor: centavosParaReais(descontoCentavos),
    valorFinal: centavosParaReais(valorFinalCentavos),
  };
}

export function descontoCentavosPorTipo(
  base: BaseMensalidadeAvista,
  tipo: MensalidadeDescontoTipo,
  descontoInformado: number
): number {
  if (tipo === "percentual") {
    return Math.round((base.baseGestaoCentavos * descontoInformado) / 100);
  }
  return reaisParaCentavos(descontoInformado);
}

/** Desconto informado recalcula o valor final. Não lê o valor final de volta. */
export function calcularAvistaPorDesconto(
  base: BaseMensalidadeAvista,
  tipo: MensalidadeDescontoTipo,
  descontoInformado: number
): CalculoMensalidadeAvista {
  return fecharCalculo(base, descontoCentavosPorTipo(base, tipo, descontoInformado));
}

/** Valor final informado recalcula o desconto. Não lê o desconto de volta. */
export function calcularAvistaPorValorFinal(
  base: BaseMensalidadeAvista,
  valorFinal: number
): CalculoMensalidadeAvista {
  const finalCentavos = reaisParaCentavos(valorFinal);
  return fecharCalculo(base, base.valorBrutoCentavos - finalCentavos);
}

export function validarCalculoMensalidadeAvista(
  calculo: CalculoMensalidadeAvista,
  fonte: MensalidadeFonteCalculo = "desconto"
): string | null {
  if (calculo.valorMensalCentavos <= 0) {
    return "Informe o valor da mensalidade.";
  }
  if (calculo.descontoCentavos < 0) {
    return fonte === "final"
      ? MENSALIDADE_FINAL_ACIMA_BRUTO_MSG
      : MENSALIDADE_DESCONTO_NEGATIVO_MSG;
  }
  if (calculo.descontoCentavos > calculo.baseGestaoCentavos) {
    return MENSALIDADE_DESCONTO_ACIMA_BASE_MSG;
  }
  if (calculo.valorFinalCentavos <= 0) return MENSALIDADE_FINAL_INVALIDO_MSG;
  if (calculo.valorFinalCentavos > calculo.valorBrutoCentavos) {
    return MENSALIDADE_FINAL_ACIMA_BRUTO_MSG;
  }
  return null;
}

export function validarVencimentoAvista(iso: string | null | undefined): string | null {
  const texto = (iso ?? "").trim();
  if (!partesIso(texto)) return MENSALIDADE_VENCIMENTO_MSG;
  return null;
}

export function textoDescontoNaUnidade(
  calculo: CalculoMensalidadeAvista,
  tipo: MensalidadeDescontoTipo
): string {
  if (tipo === "percentual") return textoPercentual(calculo.descontoPercentual);
  return textoMoedaCentavos(calculo.descontoCentavos);
}

export function textoCondicoesMensalidadeAvista(params: {
  meses: number;
  valorMensal: number;
  valorBruto: number;
  descontoValor: number;
  descontoPercentual: number;
  valorFinal: number;
  vencimentoIso: string;
  valorPontual: number;
}): string {
  const partes = [
    "À vista",
    `Vigência: ${params.meses} ${params.meses === 1 ? "mês" : "meses"}`,
    `Valor mensal de referência: ${formatCurrency(params.valorMensal)}`,
    `Total bruto: ${formatCurrency(params.valorBruto)}`,
    `Desconto: ${formatCurrency(params.descontoValor)} (${textoPercentual(params.descontoPercentual)}%)`,
    `Valor final: ${formatCurrency(params.valorFinal)}`,
    `Vencimento: ${formatDateIsoToBR(params.vencimentoIso)}`,
  ];
  if (params.valorPontual > 0) {
    partes.push(
      `Serviços pontuais adicionais: ${formatCurrency(params.valorPontual)}`
    );
  }
  return `${partes.join(". ")}.`;
}

export function textoCondicoesMensalidadeMensal(
  meses: number,
  valorMensal: number
): string {
  const unidade = meses === 1 ? "mensalidade" : "mensalidades";
  return `${meses} ${unidade} de ${formatCurrency(valorMensal)}`;
}

export function mensagemErroMensalidadePagamento(error: unknown): string {
  const bruto =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  const texto = bruto.replace(/^.*ERROR:\s*/i, "").trim();
  if (
    /atualizar_condicoes_mensalidade_aprovadas/i.test(texto) &&
    /does not exist|não existe|schema cache|could not find/i.test(texto)
  ) {
    return MENSALIDADE_RPC_AUSENTE_MSG;
  }
  if (/contrato já está assinado/i.test(texto)) {
    return MENSALIDADE_CONTRATO_ASSINADO_MSG;
  }
  if (/cobrança emitida|boleto ou pagamento/i.test(texto)) {
    return MENSALIDADE_FINANCEIRO_MSG;
  }
  if (/não tem permissão para editar as condições/i.test(texto)) {
    return MENSALIDADE_SEM_PERMISSAO_MSG;
  }
  return texto || "Não foi possível salvar as condições da mensalidade.";
}
