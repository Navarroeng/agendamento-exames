/**
 * Alternativa de pagamento à vista na proposta dos laudos e serviços pontuais.
 * Controla só a apresentação no orçamento. Não registra pagamento nem altera parcelas.
 */

import { formatCurrency, maskMoneyInput, parseMoney } from "@/lib/money";
import { isServicoAetNome } from "@/lib/servico-aet";
import { isServicoInsalubridadeNome } from "@/lib/servico-insalubridade";
import { isServicoLtcatNome } from "@/lib/servico-ltcat";
import { isServicoParecerTecnicoNome } from "@/lib/servico-parecer-tecnico";
import { isServicoPericulosidadeNome } from "@/lib/servico-periculosidade";
import { isServicoPgrNome } from "@/lib/servico-pgr";
import type { ServicoItemRef } from "@/lib/servico-treinamentos";

export const OPCAO_AVISTA_PDF_LABEL =
  "Exibir opção de pagamento à vista no PDF";

export const DESCONTO_AVISTA_OBRIGATORIO_MSG =
  "Informe o desconto à vista. Use 0 para exibir a opção sem desconto.";

export const DESCONTO_AVISTA_NEGATIVO_MSG =
  "O desconto à vista não pode ser negativo.";

export const DESCONTO_AVISTA_PERCENTUAL_MSG =
  "O desconto percentual não pode ser maior que 100%.";

export const DESCONTO_AVISTA_REAIS_MSG =
  "O desconto em reais não pode ser maior que o valor total.";

export type DescontoAvistaTipo = "valor" | "percentual";

export function orcamentoPermiteOpcaoAvistaManual(
  itens: ServicoItemRef[] | null | undefined
): boolean {
  const relevant = (itens ?? []).filter((item) =>
    Boolean((item.servico_nome ?? "").trim())
  );
  if (relevant.length === 0) return false;
  return relevant.every((item) => {
    const nome = item.servico_nome;
    return (
      isServicoPgrNome(nome) ||
      isServicoLtcatNome(nome) ||
      isServicoAetNome(nome) ||
      isServicoInsalubridadeNome(nome) ||
      isServicoPericulosidadeNome(nome) ||
      isServicoParecerTecnicoNome(nome)
    );
  });
}

export function parseDescontoAvistaTipo(
  value: string | null | undefined
): DescontoAvistaTipo | null {
  if (value === "valor" || value === "percentual") return value;
  return null;
}

export function parseDescontoInformado(
  tipo: DescontoAvistaTipo,
  texto: string
): number | null {
  const raw = texto.trim();
  if (!raw) return null;
  if (tipo === "valor") {
    if (raw.startsWith("-")) return null;
    const valor = parseMoney(raw);
    if (!Number.isFinite(valor)) return null;
    return Math.round(valor * 100) / 100;
  }
  const normalizado = raw.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalizado)) return null;
  const valor = Number(normalizado);
  if (!Number.isFinite(valor)) return null;
  return Math.round(valor * 100) / 100;
}

export function validarDescontoAvista(params: {
  oferecer: boolean;
  tipo: DescontoAvistaTipo;
  descontoTexto: string;
  valorTotal: number;
}): string | null {
  if (!params.oferecer) return null;
  const desconto = parseDescontoInformado(params.tipo, params.descontoTexto);
  if (desconto == null) return DESCONTO_AVISTA_OBRIGATORIO_MSG;
  if (desconto < 0) return DESCONTO_AVISTA_NEGATIVO_MSG;
  const total = Math.round((Number(params.valorTotal) || 0) * 100) / 100;
  if (params.tipo === "percentual" && desconto > 100) {
    return DESCONTO_AVISTA_PERCENTUAL_MSG;
  }
  if (params.tipo === "valor" && desconto > total) {
    return DESCONTO_AVISTA_REAIS_MSG;
  }
  return null;
}

/** Desconto aplicado só sobre o total final. Parcelas e total original ficam iguais. */
export function calcValorFinalAvista(params: {
  valorTotal: number;
  tipo: DescontoAvistaTipo;
  desconto: number;
}): number {
  const totalC = Math.round((Number(params.valorTotal) || 0) * 100);
  const descontoC =
    params.tipo === "percentual"
      ? Math.round((totalC * params.desconto) / 100)
      : Math.round((Number(params.desconto) || 0) * 100);
  return Math.max(0, totalC - descontoC) / 100;
}

export function formatDescontoAvistaInformado(
  tipo: DescontoAvistaTipo,
  desconto: number
): string {
  if (tipo === "percentual") {
    const texto = desconto.toLocaleString("pt-BR", {
      minimumFractionDigits: Number.isInteger(desconto) ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${texto}%`;
  }
  return formatCurrency(desconto);
}

export function formatPercentualCampo(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function maskPercentualInput(value: string): string {
  const cleaned = value.replace(/[^\d,]/g, "");
  const parts = cleaned.split(",");
  const inteiro = parts[0] ?? "";
  if (parts.length === 1) return inteiro;
  return `${inteiro},${parts.slice(1).join("").slice(0, 2)}`;
}

export function camposAvistaDoOrcamento(orcamento: {
  oferecer_desconto_avista?: boolean | null;
  valor_avista?: number | null;
  valor_total?: number | null;
  desconto_avista_tipo?: string | null;
  desconto_avista_valor?: number | null;
  orcamento_itens?: ServicoItemRef[] | null;
}): {
  oferecer: boolean;
  tipo: DescontoAvistaTipo;
  informado: string;
} {
  const vazio = { oferecer: false, tipo: "valor" as const, informado: "" };
  if (!orcamentoPermiteOpcaoAvistaManual(orcamento.orcamento_itens)) {
    return vazio;
  }
  if (orcamento.oferecer_desconto_avista !== true) return vazio;
  const tipoSalvo = parseDescontoAvistaTipo(orcamento.desconto_avista_tipo);
  if (tipoSalvo) {
    const desconto = Number(orcamento.desconto_avista_valor);
    const valor = Number.isFinite(desconto) ? desconto : 0;
    return {
      oferecer: true,
      tipo: tipoSalvo,
      informado:
        tipoSalvo === "valor"
          ? maskMoneyInput(String(Math.round(valor * 100)))
          : formatPercentualCampo(valor),
    };
  }
  const total = Number(orcamento.valor_total) || 0;
  const avista = Number(orcamento.valor_avista) || 0;
  const desconto = Math.max(0, Math.round((total - avista) * 100) / 100);
  return {
    oferecer: true,
    tipo: "valor",
    informado: maskMoneyInput(String(Math.round(desconto * 100))),
  };
}

export function resolverAvistaPersistido(params: {
  itens: ServicoItemRef[] | null | undefined;
  oferecer: boolean;
  tipo: DescontoAvistaTipo | null;
  desconto: number | null;
  valorTotal: number;
  valorAvistaLegado?: number | null;
}): {
  oferecer_desconto_avista: boolean;
  desconto_avista_tipo: DescontoAvistaTipo | null;
  desconto_avista_valor: number | null;
  valor_avista: number | null;
} {
  const limpo = {
    oferecer_desconto_avista: false,
    desconto_avista_tipo: null,
    desconto_avista_valor: null,
    valor_avista: null,
  };
  if (!orcamentoPermiteOpcaoAvistaManual(params.itens) || !params.oferecer) {
    return limpo;
  }
  if (!params.tipo) {
    const legado = Number(params.valorAvistaLegado);
    if (Number.isFinite(legado) && legado > 0) {
      return {
        oferecer_desconto_avista: true,
        desconto_avista_tipo: null,
        desconto_avista_valor: null,
        valor_avista: Math.round(legado * 100) / 100,
      };
    }
    return limpo;
  }
  const desconto = Number(params.desconto);
  if (!Number.isFinite(desconto)) return limpo;
  return {
    oferecer_desconto_avista: true,
    desconto_avista_tipo: params.tipo,
    desconto_avista_valor: Math.round(desconto * 100) / 100,
    valor_avista: calcValorFinalAvista({
      valorTotal: params.valorTotal,
      tipo: params.tipo,
      desconto,
    }),
  };
}

export function orcamentoMostraAlternativaAvista(orcamento: {
  oferecer_desconto_avista?: boolean | null;
  valor_avista?: number | null;
  valor_total?: number | null;
  desconto_avista_tipo?: string | null;
  orcamento_itens?: ServicoItemRef[] | null;
}): boolean {
  if (orcamento.oferecer_desconto_avista !== true) return false;
  if (!orcamentoPermiteOpcaoAvistaManual(orcamento.orcamento_itens)) {
    return false;
  }
  const total = Number(orcamento.valor_total) || 0;
  const avista = Number(orcamento.valor_avista);
  if (!Number.isFinite(avista) || avista < 0 || avista > total) return false;
  if (parseDescontoAvistaTipo(orcamento.desconto_avista_tipo)) return true;
  return avista > 0 && avista < total;
}

export type ApresentacaoAvistaPdf =
  | { modo: "oculto" }
  | { modo: "automatico" }
  | {
      modo: "manual";
      valorFinal: number;
      descontoTexto: string | null;
    };

export function resolverApresentacaoAvistaPdf(
  orcamento: {
    oferecer_desconto_avista?: boolean | null;
    valor_avista?: number | null;
    valor_total?: number | null;
    desconto_avista_tipo?: string | null;
    desconto_avista_valor?: number | null;
    orcamento_itens?: ServicoItemRef[] | null;
  },
  layoutLaudo: boolean
): ApresentacaoAvistaPdf {
  if (orcamentoMostraAlternativaAvista(orcamento)) {
    const tipo = parseDescontoAvistaTipo(orcamento.desconto_avista_tipo);
    const desconto = Number(orcamento.desconto_avista_valor);
    return {
      modo: "manual",
      valorFinal: Number(orcamento.valor_avista) || 0,
      descontoTexto:
        tipo && Number.isFinite(desconto)
          ? formatDescontoAvistaInformado(tipo, desconto)
          : null,
    };
  }
  if (orcamentoPermiteOpcaoAvistaManual(orcamento.orcamento_itens)) {
    return { modo: "oculto" };
  }
  if (layoutLaudo) return { modo: "oculto" };
  return { modo: "automatico" };
}
