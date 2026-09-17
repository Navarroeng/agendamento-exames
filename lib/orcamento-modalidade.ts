import { formatCurrency } from "@/lib/money";
import { isServicoAetNome } from "@/lib/servico-aet";
import { normalizeServicoNome } from "@/lib/servico-treinamentos";

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

/** Nome canônico no catálogo de produção. */
export const GESTAO_SST_MENSAL_NOME = "Gestão SST - Mensal";
/** Alias legado (migration 120 / seeds). */
export const GESTAO_COMPLETA_SST_NOME = GESTAO_SST_MENSAL_NOME;

export const GESTAO_COMPLETA_SST_ITENS: readonly string[] = [
  "PGR - Programa de Gerenciamento de Riscos.",
  "LTCAT - Laudo Técnico das Condições do Ambiente de Trabalho.",
  "PCMSO - NR-07 - Programa de Controle Médico de Saúde Ocupacional.",
  "ASO - Exames clínicos ocupacionais.",
  "Riscos Psicossociais - NR-01 - Avaliação e relatório.",
  "eSocial SST - Eventos S-2210, S-2220 e S-2240.",
] as const;

export const MENSALIDADE_BENEFICIOS_TITULO = "Benefícios do plano";

export const MENSALIDADE_BENEFICIOS_ITENS: readonly string[] = [
  "Gestão contínua de SST durante a vigência",
  "Gestão e envio dos eventos ao eSocial",
  "Controle dos exames ocupacionais",
  "Ampla rede de clínicas para exames ocupacionais em São Paulo e Grande SP",
  "Documentos disponíveis em formato digital",
  "Acompanhamento técnico durante o contrato",
] as const;

export const MENSALIDADE_BENEFICIOS_OBSERVACOES: readonly string[] = [
  "Exames complementares serão cobrados à parte.",
  "ASOs adicionais serão cobrados à parte.",
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

const GESTAO_MENSAL_NOMES_NORMALIZADOS = new Set([
  normalizeServicoNome("Gestão SST - Mensal"),
  normalizeServicoNome("Gestão SST Mensal"),
  normalizeServicoNome("Gestão Completa SST"),
]);

const GESTAO_COMPLETA_LEGADO_NORMALIZADO = normalizeServicoNome(
  "Gestão Completa SST"
);

export function isGestaoMensalSstNome(
  nome: string | null | undefined
): boolean {
  return GESTAO_MENSAL_NOMES_NORMALIZADOS.has(normalizeServicoNome(nome));
}

/** @deprecated Prefer isGestaoMensalSstNome. Mantido para call sites existentes. */
export function isGestaoCompletaSstNome(
  nome: string | null | undefined
): boolean {
  return isGestaoMensalSstNome(nome);
}

export function resolveModalidadePorServicoNome(
  nome: string | null | undefined
): OrcamentoModalidade {
  return isGestaoMensalSstNome(nome)
    ? ORCAMENTO_MODALIDADE_MENSALIDADE
    : ORCAMENTO_MODALIDADE_PONTUAL;
}

export function resolveGestaoCompletaSstServico(
  servicos: Array<{ id: string; nome: string }>
): { id: string; nome: string } | null {
  const canonico = servicos.find(
    (s) =>
      normalizeServicoNome(s.nome) ===
      normalizeServicoNome(GESTAO_SST_MENSAL_NOME)
  );
  const found = canonico ?? servicos.find((s) => isGestaoMensalSstNome(s.nome));
  if (!found?.id) return null;
  return found;
}

export function filterServicosPorModalidade<
  T extends { nome: string },
>(servicos: T[], modalidade?: string | null): T[] {
  const base = isOrcamentoMensalidade(modalidade)
    ? servicos.filter((s) => !isServicoAetNome(s.nome))
    : servicos;
  const temCanonico = base.some(
    (s) =>
      normalizeServicoNome(s.nome) ===
      normalizeServicoNome(GESTAO_SST_MENSAL_NOME)
  );
  if (!temCanonico) return base;
  return base.filter(
    (s) => normalizeServicoNome(s.nome) !== GESTAO_COMPLETA_LEGADO_NORMALIZADO
  );
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
  if (isServicoAetNome(nome)) return "O que está incluso?";
  return isGestaoCompletaSstNome(nome)
    ? "Essa gestão inclui:"
    : "Este pacote inclui:";
}

export function labelValorColunaOrcamento(
  modalidade: string | null | undefined
): string {
  return isOrcamentoMensalidade(modalidade) ? "Valor mensal" : "Valor";
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
