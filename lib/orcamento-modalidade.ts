import { formatCurrency } from "@/lib/money";

export const ORCAMENTO_MODALIDADE_PONTUAL = "pontual";
export const ORCAMENTO_MODALIDADE_MENSALIDADE = "mensalidade";

export type OrcamentoModalidade =
  | typeof ORCAMENTO_MODALIDADE_PONTUAL
  | typeof ORCAMENTO_MODALIDADE_MENSALIDADE;

export const ORCAMENTO_MODALIDADE_OPTIONS: readonly {
  value: OrcamentoModalidade;
  label: string;
}[] = [
  { value: ORCAMENTO_MODALIDADE_PONTUAL, label: "Pontual" },
  { value: ORCAMENTO_MODALIDADE_MENSALIDADE, label: "Mensalidade" },
] as const;

export const GESTAO_COMPLETA_SST_NOME = "Gestão Completa SST";

export const GESTAO_COMPLETA_SST_ITENS: readonly string[] = [
  "PGR - Programa de gerenciamento de riscos.",
  "LTCAT - Laudo técnico das condições do ambiente de trabalho.",
  "PCMSO - NR07 - Programa de controle médico de saúde ocupacional.",
  "ASO - Atestado de saúde ocupacional.",
  "Laudo de Riscos Psicossociais - Nova NR - 01",
] as const;

export const ORCAMENTO_MENSALIDADE_MESES = 12;
export const ORCAMENTO_MENSALIDADE_VIGENCIA_LABEL = "12 meses";
export const ORCAMENTO_MENSALIDADE_RENOVACAO_LABEL =
  "Automática ao final da vigência";
export const ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO = "12 mensalidades";

export function isOrcamentoModalidade(
  value: string | null | undefined
): value is OrcamentoModalidade {
  return (
    value === ORCAMENTO_MODALIDADE_PONTUAL ||
    value === ORCAMENTO_MODALIDADE_MENSALIDADE
  );
}

export function resolveOrcamentoModalidade(
  value: string | null | undefined
): OrcamentoModalidade {
  return value === ORCAMENTO_MODALIDADE_MENSALIDADE
    ? ORCAMENTO_MODALIDADE_MENSALIDADE
    : ORCAMENTO_MODALIDADE_PONTUAL;
}

export function isOrcamentoMensalidade(
  value: string | null | undefined
): boolean {
  return resolveOrcamentoModalidade(value) === ORCAMENTO_MODALIDADE_MENSALIDADE;
}

export function isGestaoCompletaSstNome(
  nome: string | null | undefined
): boolean {
  return String(nome ?? "").trim() === GESTAO_COMPLETA_SST_NOME;
}

export function resolveGestaoCompletaSstServico(
  servicos: Array<{ id: string; nome: string }>
): { id: string; nome: string } | null {
  const found = servicos.find((s) => isGestaoCompletaSstNome(s.nome));
  if (!found?.id) return null;
  return found;
}

export function filterServicosPorModalidade<
  T extends { nome: string },
>(servicos: T[], modalidade: string | null | undefined): T[] {
  if (isOrcamentoMensalidade(modalidade)) {
    return servicos.filter((s) => isGestaoCompletaSstNome(s.nome));
  }
  return servicos.filter((s) => !isGestaoCompletaSstNome(s.nome));
}

/** Valor mensal formatado. Nunca multiplica por 12. */
export function formatValorMensalidade(valor: number): string {
  return `${formatCurrency(Number(valor) || 0)} / mês`;
}

export function formatValorOrcamentoExibicao(orcamento: {
  modalidade?: string | null;
  valor_total: number | string | null;
}): string {
  const valor = Number(orcamento.valor_total) || 0;
  if (isOrcamentoMensalidade(orcamento.modalidade)) {
    return formatValorMensalidade(valor);
  }
  return formatCurrency(valor);
}

export function labelItensInclusosServico(
  nome: string | null | undefined
): string {
  return isGestaoCompletaSstNome(nome)
    ? "Essa gestão inclui:"
    : "Este pacote inclui:";
}

export function labelValorColunaOrcamento(
  modalidade: string | null | undefined
): string {
  return isOrcamentoMensalidade(modalidade)
    ? "Valor da mensalidade"
    : "Valor";
}

export type ResumoMensalidadeLinha = {
  label: string;
  value: string;
};

export function buildResumoMensalidadeLinhas(
  valorMensal: number
): ResumoMensalidadeLinha[] {
  return [
    {
      label: "Valor da mensalidade",
      value: formatValorMensalidade(valorMensal),
    },
    {
      label: "Condição de pagamento",
      value: ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO,
    },
    {
      label: "Vigência contratual",
      value: ORCAMENTO_MENSALIDADE_VIGENCIA_LABEL,
    },
    {
      label: "Renovação",
      value: ORCAMENTO_MENSALIDADE_RENOVACAO_LABEL,
    },
  ];
}
