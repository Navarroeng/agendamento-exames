/**
 * Serviço pontual exclusivo: Laudo de Parecer Técnico.
 * Identificação pelo nome canônico do catálogo (match exato, sem includes).
 * O acompanhamento operacional reutiliza o fluxo dos laudos pontuais.
 * Contrato, proposta, parcelas e desconto à vista continuam próprios deste serviço.
 */

import { formatCurrency, parseMoney } from "@/lib/money";
import { splitValorEmCentavos } from "@/lib/contrato-pagamento";
import { normalizeServicoNome, type ServicoItemRef } from "@/lib/servico-treinamentos";

export const SERVICO_PARECER_TECNICO_NOME = "Laudo de Parecer Técnico" as const;

export const SERVICO_PARECER_TECNICO_EXCLUSIVIDADE_MSG =
  "O Laudo de Parecer Técnico possui proposta própria e deve ser contratado em um orçamento separado.";

/** Quantidade interna de linha (DB exige > 0). Nunca exibir como colaboradores. */
export const SERVICO_PARECER_TECNICO_QUANTIDADE_INTERNA = 1;

export const PROPOSTA_DESCRICAO_PARAGRAFOS_PARECER_TECNICO: readonly string[] = [
  "Valor abaixo equivalente a realização e elaboração de proposta de honorários para a prestação de serviço de assistência técnica para apuração (ou não) de insalubridade em perícia oriunda de ação trabalhista na cidade de São Paulo, referente à reclamatória trabalhista.",
  "Assistência técnica em perícia oriunda de ação trabalhista para avaliação técnica de trabalho em condições insalubres, contemplando a emissão de parecer técnico.",
  "Para elaboração da proposta de honorários, foram considerados: a relevância, o vulto, o risco, a qualidade e o grau de complexidade dos serviços a executar, as horas estimadas para a realização de cada fase do trabalho, a utilização dos equipamentos de monitoramento ambientais pertencentes a este assistente técnico como (dosímetro, medidor de estresse térmico e etc) e o prazo fixado.",
] as const;

export const PARECER_TECNICO_INCLUSOS_ITENS: readonly string[] = [
  "Elaboração dos quesitos técnicos.",
  "Acompanhamento de perícia trabalhista.",
  "Elaboração de laudo de parecer técnico.",
] as const;

export const PARECER_PARCELAS_INVALIDAS_MSG =
  "Informe uma quantidade de parcelas inteira, maior ou igual a 1.";

export const PARECER_AVISTA_OBRIGATORIO_MSG =
  "Informe o valor à vista com desconto.";

export const PARECER_AVISTA_FAIXA_MSG =
  "O valor à vista deve ser maior que zero e menor que o valor total do serviço.";

const SERVICO_PARECER_TECNICO_NOMES_NORMALIZADOS = new Set([
  normalizeServicoNome(SERVICO_PARECER_TECNICO_NOME),
]);

export const SERVICO_PARECER_TECNICO_NOME_NORMALIZADO = normalizeServicoNome(
  SERVICO_PARECER_TECNICO_NOME
);

export function isServicoParecerTecnicoNome(
  nome: string | null | undefined
): boolean {
  return SERVICO_PARECER_TECNICO_NOMES_NORMALIZADOS.has(
    normalizeServicoNome(nome)
  );
}

export function resolveParecerTecnicoServicoId(
  servicos: Array<{ id: string; nome: string }>
): string | null {
  const found = servicos.find((s) => isServicoParecerTecnicoNome(s.nome));
  const id = (found?.id ?? "").trim();
  return id || null;
}

export function isServicoParecerTecnico(
  item: ServicoItemRef,
  parecerServicoId?: string | null
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (parecerServicoId && id) {
    return id === parecerServicoId;
  }
  return isServicoParecerTecnicoNome(item.servico_nome);
}

export function orcamentoPossuiParecerTecnico(
  itens: ServicoItemRef[] | null | undefined,
  parecerServicoId?: string | null
): boolean {
  return (itens ?? []).some((item) =>
    isServicoParecerTecnico(item, parecerServicoId)
  );
}

export function orcamentoEhExclusivoParecerTecnico(
  itens: ServicoItemRef[] | null | undefined,
  parecerServicoId?: string | null
): boolean {
  const relevant = (itens ?? []).filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
  if (relevant.length === 0) return false;
  return relevant.every((item) =>
    isServicoParecerTecnico(item, parecerServicoId)
  );
}

function itemTemServico(item: ServicoItemRef): boolean {
  return (
    Boolean((item.servico_id ?? "").trim()) ||
    Boolean((item.servico_nome ?? "").trim())
  );
}

export function mensagemExclusividadeParecerTecnico(
  itens: ServicoItemRef[] | null | undefined,
  parecerServicoId?: string | null
): string | null {
  if (
    orcamentoPossuiParecerTecnico(itens, parecerServicoId) &&
    !orcamentoEhExclusivoParecerTecnico(itens, parecerServicoId)
  ) {
    return SERVICO_PARECER_TECNICO_EXCLUSIVIDADE_MSG;
  }
  return null;
}

export function bloqueioParecerTecnicoExclusivo(params: {
  itens: Array<ServicoItemRef & { id?: string }>;
  itemIdAlterado?: string | null;
  novoNome?: string | null;
  novoServicoId?: string | null;
  parecerServicoId?: string | null;
}): string | null {
  const { itens, itemIdAlterado, parecerServicoId } = params;
  const novoItem: ServicoItemRef = {
    servico_id: params.novoServicoId ?? "",
    servico_nome: params.novoNome ?? "",
  };
  const novoEhParecer = isServicoParecerTecnico(novoItem, parecerServicoId);

  if (itemIdAlterado == null) {
    if (
      orcamentoPossuiParecerTecnico(itens, parecerServicoId) ||
      novoEhParecer
    ) {
      return SERVICO_PARECER_TECNICO_EXCLUSIVIDADE_MSG;
    }
    return null;
  }

  const outros = itens.filter((item) => {
    if (item.id === itemIdAlterado) return false;
    return itemTemServico(item);
  });

  if (novoEhParecer && outros.length > 0) {
    return SERVICO_PARECER_TECNICO_EXCLUSIVIDADE_MSG;
  }

  const outrosTemParecer = outros.some((item) =>
    isServicoParecerTecnico(item, parecerServicoId)
  );
  if (outrosTemParecer && itemTemServico(novoItem) && !novoEhParecer) {
    return SERVICO_PARECER_TECNICO_EXCLUSIVIDADE_MSG;
  }

  return null;
}

/** Valor digitado é o total do serviço. Quantidade não multiplica. */
export function resolveValorTotalParecerTecnico(item: {
  valor_unitario?: number | null;
  valor_total?: number | null;
}): number {
  const total = Number(item.valor_total);
  const unit = Number(item.valor_unitario);
  if (Number.isFinite(total) && total > 0) return total;
  if (Number.isFinite(unit) && unit > 0) return unit;
  return 0;
}

/** Inteiro >= 1, sem o teto de 10 nem a parcela mínima do Pacote SST. */
export function parseQuantidadeParcelasInteira(
  raw: string | number | null | undefined
): number | null {
  if (typeof raw === "number") {
    if (!Number.isSafeInteger(raw) || raw < 1 || raw > 2147483647) return null;
    return raw;
  }
  const texto = String(raw ?? "").trim();
  if (!/^\d+$/.test(texto)) return null;
  const n = Number(texto);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) return null;
  return n;
}

export function validarQuantidadeParcelasParecer(
  raw: string | number | null | undefined
): string | null {
  return parseQuantidadeParcelasInteira(raw) == null
    ? PARECER_PARCELAS_INVALIDAS_MSG
    : null;
}

export function validarValorAvistaParecer(params: {
  oferecer: boolean;
  valorAvistaTexto: string;
  valorTotal: number;
}): string | null {
  if (!params.oferecer) return null;
  if (!params.valorAvistaTexto.trim()) return PARECER_AVISTA_OBRIGATORIO_MSG;
  const avistaC = Math.round(parseMoney(params.valorAvistaTexto) * 100);
  const totalC = Math.round((Number(params.valorTotal) || 0) * 100);
  if (!(avistaC > 0 && avistaC < totalC)) return PARECER_AVISTA_FAIXA_MSG;
  return null;
}

/**
 * Divide o total em centavos. O resto fica nas primeiras parcelas,
 * e a soma das parcelas é exatamente o total.
 */
export function parcelasCentavosParecerTecnico(
  valorTotal: number,
  quantidadeParcelas: number
): number[] {
  const n = parseQuantidadeParcelasInteira(quantidadeParcelas) ?? 1;
  return splitValorEmCentavos(Math.max(0, Number(valorTotal) || 0), n);
}

export function formatCondicaoParcelasCentavos(
  valorTotal: number,
  quantidadeParcelas: number
): string {
  const cents = parcelasCentavosParecerTecnico(valorTotal, quantidadeParcelas);
  const groups: Array<{ count: number; cents: number }> = [];
  for (const valor of cents) {
    const last = groups[groups.length - 1];
    if (last && last.cents === valor) last.count += 1;
    else groups.push({ count: 1, cents: valor });
  }
  return groups
    .map((group) => {
      const unidade = group.count === 1 ? "parcela" : "parcelas";
      return `${group.count} ${unidade} de ${formatCurrency(group.cents / 100)}`;
    })
    .join(" e ");
}

export function parecerMostraAlternativaAvista(orcamento: {
  oferecer_desconto_avista?: boolean | null;
  valor_avista?: number | null;
  valor_total?: number | null;
  orcamento_itens?: ServicoItemRef[] | null;
}): boolean {
  if (!orcamento.oferecer_desconto_avista) return false;
  if (!orcamentoEhExclusivoParecerTecnico(orcamento.orcamento_itens)) {
    return false;
  }
  const totalC = Math.round((Number(orcamento.valor_total) || 0) * 100);
  const avistaC = Math.round((Number(orcamento.valor_avista) || 0) * 100);
  return avistaC > 0 && avistaC < totalC;
}
