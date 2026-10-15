/**
 * Totais e condição da contratação, só com o que foi gravado.
 * O valor mensal da Gestão SST não é o total da vigência.
 * Não usa a fórmula de renovação nem um prazo padrão quando a quantidade não foi registrada.
 */
import { formatCurrency } from "@/lib/money";
import { isOrcamentoMensalidade } from "@/lib/orcamento-modalidade";

export type FormaContratacaoComercial =
  | "avista"
  | "mensal"
  | "parcelado"
  | "indefinido";

export type ContratacaoComercialInput = {
  modalidade?: string | null;
  mensalidadePagamento?: string | null;
  /** Mensalidade aprovada. Não é o total do período. */
  valorMensal?: number | null;
  /** Mensalidade do orçamento, quando o fechamento alterou o valor. */
  valorMensalOriginal?: number | null;
  meses?: number | null;
  condicaoPagamento?: string | null;
  valorBruto?: number | null;
  valorPontual?: number | null;
  descontoValor?: number | null;
  valorAvista?: number | null;
  /** Total já gravado de contratação que não é mensalidade (valor final). */
  valorRegistrado?: number | null;
  /** Total original de contratação que não é mensalidade. */
  valorOriginalRegistrado?: number | null;
  quantidadeParcelas?: number | null;
  valorParcela?: number | null;
};

export type ContratacaoComercial = {
  valorOriginal: number | null;
  valorFinal: number | null;
  forma: FormaContratacaoComercial;
  /** Condição, sem o prefixo “Mensal —”. */
  pagamento: string;
  meses: number | null;
  valorParcela: number | null;
};

function positivo(valor: number | null | undefined): number | null {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function centavos(valor: number): number {
  return Math.round(valor * 100);
}

function reais(totalCentavos: number): number {
  return totalCentavos / 100;
}

/** Quantidade gravada na condição ou em mensalidade_meses. Não completa com 12. */
export function mesesRegistradosContratacao(
  condicao: string | null | undefined,
  mesesSalvos: number | null | undefined
): number | null {
  const salvos = Number(mesesSalvos);
  if (Number.isInteger(salvos) && salvos > 0) return salvos;
  const match = (condicao ?? "").match(/(\d+)\s*mensalidades?/i);
  if (!match) return null;
  const quantidade = Number(match[1]);
  return Number.isInteger(quantidade) && quantidade > 0 ? quantidade : null;
}

function pagamentoAvistaExplicito(
  condicao: string | null | undefined,
  mensalidadePagamento: string | null | undefined
): boolean {
  if (mensalidadePagamento === "avista") return true;
  return /à\s*vista|\bavista\b/i.test(condicao ?? "");
}

function contratacaoMensal(input: ContratacaoComercialInput): boolean {
  if (isOrcamentoMensalidade(input.modalidade)) return true;
  if (
    input.mensalidadePagamento === "mensal" ||
    input.mensalidadePagamento === "avista"
  ) {
    return true;
  }
  return (
    mesesRegistradosContratacao(input.condicaoPagamento, input.meses) != null
  );
}

export function resolverContratacaoComercial(
  input: ContratacaoComercialInput
): ContratacaoComercial {
  const condicao = (input.condicaoPagamento ?? "").trim();
  const avista = pagamentoAvistaExplicito(condicao, input.mensalidadePagamento);
  const meses = mesesRegistradosContratacao(condicao, input.meses);
  const pontualCentavos = centavos(positivo(input.valorPontual) ?? 0);

  if (contratacaoMensal(input) && avista) {
    const valorMensal =
      positivo(input.valorMensal) ??
      positivo(input.valorRegistrado) ??
      positivo(input.valorMensalOriginal) ??
      positivo(input.valorOriginalRegistrado);
    const brutoSalvo = positivo(input.valorBruto);
    const brutoCalculado =
      valorMensal != null && meses != null
        ? reais(centavos(valorMensal) * meses + pontualCentavos)
        : null;
    const original = brutoSalvo ?? brutoCalculado;
    const liquido =
      positivo(input.valorAvista) ??
      (Number(input.quantidadeParcelas) === 1
        ? positivo(input.valorParcela)
        : null);
    const desconto = positivo(input.descontoValor);
    const final =
      liquido ??
      (original != null && desconto != null
        ? reais(centavos(original) - centavos(desconto))
        : original);
    return {
      valorOriginal: original ?? final,
      valorFinal: final,
      forma: "avista",
      pagamento: "À vista",
      meses,
      valorParcela: valorMensal,
    };
  }

  if (contratacaoMensal(input)) {
    const valorMensal =
      positivo(input.valorMensal) ?? positivo(input.valorRegistrado);
    const valorMensalOriginal =
      positivo(input.valorMensalOriginal) ??
      positivo(input.valorOriginalRegistrado) ??
      valorMensal;
    if (valorMensal != null && meses != null && valorMensalOriginal != null) {
      const desconto = positivo(input.descontoValor) ?? 0;
      const original = reais(
        centavos(valorMensalOriginal) * meses + pontualCentavos
      );
      const final = reais(
        centavos(valorMensal) * meses + pontualCentavos - centavos(desconto)
      );
      return {
        valorOriginal: original,
        valorFinal: final > 0 ? final : null,
        forma: "mensal",
        pagamento: `${meses}x de ${formatCurrency(valorMensal)}`,
        meses,
        valorParcela: valorMensal,
      };
    }
    return {
      valorOriginal:
        positivo(input.valorOriginalRegistrado) ??
        positivo(input.valorRegistrado),
      valorFinal:
        positivo(input.valorRegistrado) ??
        positivo(input.valorOriginalRegistrado),
      forma: "mensal",
      pagamento: condicao || "Mensal",
      meses,
      valorParcela: valorMensal,
    };
  }

  const original = positivo(input.valorOriginalRegistrado);
  const registrado = positivo(input.valorRegistrado);
  const final = registrado ?? original;
  const quantidade = Number(input.quantidadeParcelas);
  const parcela = positivo(input.valorParcela);

  if (avista) {
    const liquido =
      positivo(input.valorAvista) ??
      (Number.isInteger(quantidade) && quantidade === 1 ? parcela : null) ??
      final;
    return {
      valorOriginal: original ?? liquido,
      valorFinal: liquido,
      forma: "avista",
      pagamento: "À vista",
      meses: null,
      valorParcela: null,
    };
  }

  if (Number.isInteger(quantidade) && quantidade > 1) {
    return {
      valorOriginal: original ?? final,
      valorFinal: final,
      forma: "parcelado",
      pagamento:
        parcela != null
          ? `${quantidade}x de ${formatCurrency(parcela)}`
          : condicao || "Parcelado",
      meses: null,
      valorParcela: parcela,
    };
  }

  if (/x de/i.test(condicao) || /^\d+x\b/i.test(condicao)) {
    return {
      valorOriginal: original ?? final,
      valorFinal: final,
      forma: "parcelado",
      pagamento: condicao,
      meses: null,
      valorParcela: parcela,
    };
  }

  if (condicao) {
    return {
      valorOriginal: original ?? final,
      valorFinal: final,
      forma: "indefinido",
      pagamento: condicao,
      meses: null,
      valorParcela: parcela,
    };
  }

  return {
    valorOriginal: original ?? final,
    valorFinal: final,
    forma: "indefinido",
    pagamento: "—",
    meses: null,
    valorParcela: parcela,
  };
}

export function labelPagamentoFechamento(resolvido: ContratacaoComercial): string {
  if (
    resolvido.forma === "mensal" &&
    resolvido.meses != null &&
    resolvido.valorParcela != null
  ) {
    return `Mensal — ${resolvido.meses}x de ${formatCurrency(resolvido.valorParcela)}`;
  }
  if (resolvido.forma === "mensal" && resolvido.pagamento === "—") {
    return "Mensal";
  }
  return resolvido.pagamento;
}
