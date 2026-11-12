/**
 * Contrato de Gestão SST com administração de plataformas.
 *
 * O modelo é escolhido por identificador explícito:
 * - o serviço do orçamento, quando o id ou o nome canônico já o identificam;
 * - o número exato do orçamento, quando o serviço gravado ainda é a Gestão SST comum.
 *
 * Orçamento pontual desta contratação: ORC-2026-0087.
 * Os demais orçamentos de Gestão SST permanecem no modelo padrão.
 */

import { formatMoedaComExtenso, formatNumeroComExtenso } from "@/lib/extenso";
import { normalizeServicoNome, type ServicoItemRef } from "@/lib/servico-treinamentos";

export const CONTRATO_GESTAO_SST_PLATAFORMAS_IDENTIFICADOR =
  "gestao-sst-plataformas" as const;

export const ORCAMENTO_GESTAO_SST_PLATAFORMAS_NUMERO = "ORC-2026-0087" as const;

export const CONTRATO_GESTAO_SST_PLATAFORMAS_TITULO =
  "Contrato de Prestação de Serviços de Gestão SST e Administração de Plataformas";

export const CONTRATO_GESTAO_SST_PLATAFORMAS_TITULO_LINHAS = [
  "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO SST",
  "E ADMINISTRAÇÃO DE PLATAFORMAS",
] as const;

export const LIMITE_PLATAFORMAS_CONTRATO = 10;

/**
 * Observação da proposta comercial aprovada nº ORC-2026-0087,
 * emitida em 10/11/2026, no valor de R$ 2.520,00 / mês.
 * Não nomeia postagem de documentos de RH, administrativos e financeiros
 * nem prazo operacional de uma semana.
 */
export const PROPOSTA_APROVADA_ORC_2026_0087_OBSERVACAO =
  "O valor contempla a gestão integral das plataformas, incluindo cadastro e movimentação de colaboradores, adequação dos documentos de SST, controle de vencimentos e acompanhamento de pendências e aprovações para liberação das equipes nas obras.";

const NOMES_SERVICO = new Set([
  normalizeServicoNome("Gestão SST + Plataformas"),
  normalizeServicoNome("Gestão SST e Plataformas"),
  normalizeServicoNome(
    "Gestão SST e Administração de Plataformas"
  ),
]);

const POSTAGEM_RH_ADMIN_FINANCEIRO =
  /documentos?\s+de\s+rh|rh,\s*administrativ|administrativos?\s+e\s+financeir/i;

const JANELA_UMA_SEMANA =
  /uma\s+semana|1\s*\(\s*uma\s*\)\s*semana|sete\s+dias|janela\s+operacional/i;

export function itemIdentificaGestaoSstPlataformas(
  item: ServicoItemRef
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (id === CONTRATO_GESTAO_SST_PLATAFORMAS_IDENTIFICADOR) return true;
  return NOMES_SERVICO.has(normalizeServicoNome(item.servico_nome));
}

export function orcamentoUsaContratoGestaoSstPlataformas(params: {
  numero?: string | null;
  itens?: readonly ServicoItemRef[] | null;
}): boolean {
  if (
    (params.numero ?? "").trim() === ORCAMENTO_GESTAO_SST_PLATAFORMAS_NUMERO
  ) {
    return true;
  }
  return (params.itens ?? []).some(itemIdentificaGestaoSstPlataformas);
}

export function textosPropostaDoOrcamento(params: {
  numero?: string | null;
  observacoesOrcamento?: string | null;
  observacoesAprovacao?: string | null;
}): string[] {
  const textos = [params.observacoesOrcamento, params.observacoesAprovacao]
    .map((texto) => (texto ?? "").trim())
    .filter(Boolean);
  if (
    (params.numero ?? "").trim() === ORCAMENTO_GESTAO_SST_PLATAFORMAS_NUMERO
  ) {
    textos.push(PROPOSTA_APROVADA_ORC_2026_0087_OBSERVACAO);
  }
  return textos;
}

export function propostaIncluiPostagemRhAdministrativoFinanceiro(
  textos: readonly string[]
): boolean {
  return textos.some((texto) => POSTAGEM_RH_ADMIN_FINANCEIRO.test(texto));
}

export function propostaIncluiJanelaOperacionalUmaSemana(
  textos: readonly string[]
): boolean {
  return textos.some((texto) => JANELA_UMA_SEMANA.test(texto));
}

function quantitativoColaboradores(quantidade: number): string {
  if (!Number.isFinite(quantidade) || quantidade < 1) {
    return "os colaboradores previstos na proposta comercial";
  }
  const n = Math.round(quantidade);
  const label = n === 1 ? "colaborador" : "colaboradores";
  return `${formatNumeroComExtenso(n)} ${label}`;
}

export function fraseMensalidadeUnicaPlataformas(valor: number): string {
  return `A mensalidade de ${formatMoedaComExtenso(valor)} é única e remunera, em conjunto, a Gestão SST e a administração de até ${LIMITE_PLATAFORMAS_CONTRATO} plataformas. Não há segunda mensalidade por esses serviços.`;
}

export function paragrafosEscopoPlataformas(params: {
  colaboradores: number;
  valorMensal: number;
  textosProposta: readonly string[];
}): string[] {
  const quantitativo = quantitativoColaboradores(params.colaboradores);
  const paragrafos = [
    `Gestão SST. Gestão da documentação de SST para ${quantitativo}, adequação dos laudos sob responsabilidade da CONTRATADA às exigências das obras e das plataformas, controle de vencimentos de exames ocupacionais, treinamentos e documentos de SST e acompanhamento das renovações.`,
    `Administração de até ${LIMITE_PLATAFORMAS_CONTRATO} plataformas. Cadastro, atualização, substituição e retirada de colaboradores por obra, conforme as equipes indicadas pela CONTRATANTE. Conferência, postagem e atualização dos documentos exigidos, incluindo postagens recorrentes, acompanhamento de validações e vencimentos, comunicação de pendências e reapresentação de documentos corrigidos. A quantidade de plataformas e a relação de obras são informações distintas.`,
  ];
  if (propostaIncluiPostagemRhAdministrativoFinanceiro(params.textosProposta)) {
    paragrafos.push(
      "Documentos de RH, administrativos e financeiros. A CONTRATANTE fornece os arquivos prontos e as correções desses documentos. A CONTRATADA confere, posta e acompanha as pendências nas plataformas."
    );
  }
  paragrafos.push(
    "Mobilização das equipes. A CONTRATANTE indica os colaboradores por obra e disponibiliza os acessos, dados e documentos necessários. A CONTRATADA acompanha as etapas sob sua responsabilidade após o recebimento dessas informações. A validação documental e a liberação final cabem à plataforma ou à empresa responsável pela obra."
  );
  if (propostaIncluiJanelaOperacionalUmaSemana(params.textosProposta)) {
    paragrafos.push(
      "Prazo operacional. Após o recebimento dos acessos, dados e documentos necessários, a CONTRATADA cumpre as etapas sob sua responsabilidade no prazo de uma semana, conforme a proposta aprovada."
    );
  }
  paragrafos.push(
    `Ampliação do escopo. A inclusão de plataformas acima do limite de ${LIMITE_PLATAFORMAS_CONTRATO} depende de aprovação prévia e ajuste comercial entre as partes.`,
    fraseMensalidadeUnicaPlataformas(params.valorMensal)
  );
  return paragrafos;
}
