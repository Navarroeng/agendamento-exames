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

import { formatNumeroComExtenso } from "@/lib/extenso";
import { formatCurrency } from "@/lib/money";
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

/** Gestão SST na renovação deste modelo: mínimo de R$ 130,00 e R$ 10,00 a partir do segundo colaborador ativo. */
export const RENOVACAO_PLATAFORMAS_GESTAO_BASE_REAIS = 130;
export const RENOVACAO_PLATAFORMAS_GESTAO_INCREMENTO_REAIS = 10;
/** Adequação de laudos, componente fixo da mensalidade renovada. */
export const RENOVACAO_PLATAFORMAS_LAUDOS_REAIS = 912;
/** Administração de cada plataforma coberta pelo limite contratado, mesmo que menos estejam em uso. */
export const RENOVACAO_PLATAFORMAS_POR_PLATAFORMA_REAIS = 100;

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

function reais(valor: number): number {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

function inteiroNaoNegativo(valor: number): number {
  const numero = Math.floor(Number(valor));
  if (!Number.isFinite(numero) || numero < 0) return 0;
  return numero;
}

/**
 * Gestão SST da renovação, igual à regra dos contratos comuns:
 * R$ 130,00 para zero ou um colaborador ativo e R$ 10,00 a partir do segundo.
 */
export function valorGestaoSstRenovacaoPlataformas(
  colaboradoresAtivos: number
): number {
  const quantidade = inteiroNaoNegativo(colaboradoresAtivos);
  const extras = Math.max(quantidade - 1, 0);
  return reais(
    RENOVACAO_PLATAFORMAS_GESTAO_BASE_REAIS +
      RENOVACAO_PLATAFORMAS_GESTAO_INCREMENTO_REAIS * extras
  );
}

/**
 * Mensalidade da nova vigência.
 * Soma Gestão SST, adequação de laudos e o limite de plataformas contratado.
 * A quantidade em uso não reduz o componente das plataformas.
 */
export function valorMensalidadeRenovacaoPlataformas(params: {
  colaboradoresAtivos: number;
  limitePlataformas?: number | null;
  plataformasEmUso?: number | null;
}): number {
  const limite =
    params.limitePlataformas == null
      ? LIMITE_PLATAFORMAS_CONTRATO
      : inteiroNaoNegativo(params.limitePlataformas);
  return reais(
    valorGestaoSstRenovacaoPlataformas(params.colaboradoresAtivos) +
      RENOVACAO_PLATAFORMAS_LAUDOS_REAIS +
      RENOVACAO_PLATAFORMAS_POR_PLATAFORMA_REAIS * limite
  );
}

function dataIso(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

/** Primeiro início conhecido. A vigência inicial não usa a fórmula da renovação. */
export function inicioVigenciaInicial(
  inicios: readonly (string | null | undefined)[]
): string | null {
  const validos = inicios
    .map((inicio) => dataIso(inicio))
    .filter((inicio): inicio is string => Boolean(inicio))
    .sort();
  return validos[0] ?? null;
}

export function vigenciaEhRenovacaoPlataformas(
  vigenciaInicio: string | null | undefined,
  iniciosConhecidos: readonly (string | null | undefined)[]
): boolean {
  const inicio = dataIso(vigenciaInicio);
  const inicial = inicioVigenciaInicial(iniciosConhecidos);
  if (!inicio || !inicial) return false;
  return inicio > inicial;
}

function valorPositivo(valor: number | null | undefined): number | null {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return reais(numero);
}

/**
 * Valor que a geração de cobranças usa neste modelo.
 * A vigência inicial permanece no valor contratado.
 * Na renovação, usa o valor já gravado naquela vigência ou nas parcelas dela.
 * Sem esse registro, calcula pela quantidade de colaboradores ativos e pelo limite contratado.
 * Não aplica a tabela comum de Gestão SST como preço integral.
 */
export function valorMensalCobrancaPlataformas(params: {
  plataformas: boolean;
  vigenciaInicio: string | null;
  iniciosConhecidos: readonly (string | null | undefined)[];
  valorContratado: number | null;
  colaboradoresAtivos: number | null;
  limitePlataformas?: number | null;
  valorRenovacaoGravado?: number | null;
  vigenciaRenovacaoGravada?: string | null;
  valoresParcelasDaVigencia?: readonly number[];
}): number | null {
  const contratado = valorPositivo(params.valorContratado);
  if (!params.plataformas) return contratado;
  if (
    !vigenciaEhRenovacaoPlataformas(
      params.vigenciaInicio,
      params.iniciosConhecidos
    )
  ) {
    return contratado;
  }

  const inicio = dataIso(params.vigenciaInicio);
  const vigenciaGravada = dataIso(params.vigenciaRenovacaoGravada);
  const valorGravado = valorPositivo(params.valorRenovacaoGravado);
  if (inicio && vigenciaGravada === inicio && valorGravado) return valorGravado;

  const parcelas = (params.valoresParcelasDaVigencia ?? [])
    .map((valor) => valorPositivo(valor))
    .filter((valor): valor is number => valor != null);
  if (parcelas.length > 0) return parcelas[0];

  if (params.colaboradoresAtivos == null) return null;
  return valorMensalidadeRenovacaoPlataformas({
    colaboradoresAtivos: params.colaboradoresAtivos,
    limitePlataformas: params.limitePlataformas,
  });
}

export function frasePagamentoVigenciaInicialPlataformas(params: {
  valorMensal: number;
  meses: number;
  colaboradores: number;
}): string {
  const meses = Math.max(1, Math.floor(Number(params.meses) || 0));
  const mensal = reais(params.valorMensal);
  const total = reais(mensal * meses);
  const colaboradores = Math.round(Number(params.colaboradores));
  const quantitativo =
    Number.isFinite(colaboradores) && colaboradores >= 1
      ? `${colaboradores} ${colaboradores === 1 ? "colaborador" : "colaboradores"}`
      : "os colaboradores contratados";
  return `O valor total da vigência inicial de ${meses} meses é de ${formatCurrency(total)}, pago em ${meses} mensalidades de ${formatCurrency(mensal)}. Cada mensalidade remunera os serviços de Gestão SST para ${quantitativo} e de administração de até ${LIMITE_PLATAFORMAS_CONTRATO} plataformas.`;
}

/** Marcação só da Cláusula 7 deste modelo. O PDF desenha o trecho em negrito. */
function negrito(texto: string): string {
  return `**${texto}**`;
}

function paragrafosComponentesRenovacaoPlataformas(): string[] {
  const limite = LIMITE_PLATAFORMAS_CONTRATO;
  const colaboradoresExemplo = 60;
  const gestaoExemplo = valorGestaoSstRenovacaoPlataformas(colaboradoresExemplo);
  const laudosExemplo = RENOVACAO_PLATAFORMAS_LAUDOS_REAIS;
  const plataformasExemplo = RENOVACAO_PLATAFORMAS_POR_PLATAFORMA_REAIS * limite;
  const totalExemplo = valorMensalidadeRenovacaoPlataformas({
    colaboradoresAtivos: colaboradoresExemplo,
    limitePlataformas: limite,
  });
  return [
    "A mensalidade da nova vigência é a soma de três componentes, apurados no início dessa vigência.",
    `${negrito("Gestão SST")} — ${formatCurrency(RENOVACAO_PLATAFORMAS_GESTAO_BASE_REAIS)} de valor mínimo, mais ${formatCurrency(RENOVACAO_PLATAFORMAS_GESTAO_INCREMENTO_REAIS)} por colaborador ativo a partir do segundo. A quantidade considerada é a de colaboradores ativos no início da nova vigência.`,
    `${negrito("Adequação de laudos")} — ${formatCurrency(RENOVACAO_PLATAFORMAS_LAUDOS_REAIS)} fixos por mês.`,
    `${negrito("Administração de plataformas")} — ${formatCurrency(RENOVACAO_PLATAFORMAS_POR_PLATAFORMA_REAIS)} por plataforma coberta pelo limite contratado para a nova vigência, ainda que haja menos plataformas em uso. Qualquer alteração desse limite depende de acordo entre as partes.`,
    `${negrito("Exemplo de renovação.")} Com ${colaboradoresExemplo} colaboradores ativos e cobertura de até ${limite} plataformas, a mensalidade da nova vigência será de ${negrito(formatCurrency(totalExemplo))}, composta por ${formatCurrency(gestaoExemplo)} de Gestão SST, ${formatCurrency(laudosExemplo)} de adequação de laudos e ${formatCurrency(plataformasExemplo)} de administração de plataformas.`,
    "O valor apurado é gravado na nova vigência. Movimentações posteriores de colaboradores ou de plataformas entram no cálculo do ciclo seguinte e não alteram as parcelas já geradas.",
  ];
}

export function paragrafosCalculoRenovacaoPlataformas(
  renovacaoAutomatica: boolean
): string[] {
  const componentes = paragrafosComponentesRenovacaoPlataformas();
  if (!renovacaoAutomatica) {
    return [
      "A continuidade dos serviços após o término desta vigência depende de novo acordo escrito entre as partes. Não há renovação automática nem cobrança automática de novo período.",
      "Se as partes ajustarem uma nova contratação por escrito, o valor mensal seguirá esta regra e não a tabela comum da Gestão SST.",
      ...componentes,
      "O pagamento antecipado e o desconto são válidos somente para o período contratado. Em uma nova contratação ajustada por escrito, o pagamento será mensal por boleto bancário, salvo acordo escrito de pagamento antecipado.",
    ];
  }
  return [
    "Na renovação, o valor mensal será calculado no início da nova vigência. Essa regra substitui a tabela comum da Gestão SST como preço integral da renovação e não altera as cobranças do período em andamento.",
    ...componentes,
    "O pagamento antecipado e o desconto são válidos somente para o período contratado. Na renovação, o pagamento será mensal por boleto bancário, salvo novo acordo escrito para pagamento antecipado.",
  ];
}

export function paragrafosEscopoPlataformas(params: {
  colaboradores: number;
}): string[] {
  const quantitativo = quantitativoColaboradores(params.colaboradores);
  return [
    `Gestão SST. Gestão da documentação de SST para ${quantitativo}, adequação dos laudos sob responsabilidade da CONTRATADA às exigências das obras e das plataformas, controle de vencimentos de exames ocupacionais, treinamentos e documentos de SST e acompanhamento das renovações.`,
    `Administração de até ${LIMITE_PLATAFORMAS_CONTRATO} plataformas. Cadastro, atualização, substituição e retirada de colaboradores por obra, conforme as equipes indicadas pela CONTRATANTE. Conferência, postagem e atualização dos documentos de SST exigidos pelas plataformas, incluindo o controle de vencimentos, o acompanhamento de validações e pendências e a reapresentação de documentos corrigidos. A quantidade de plataformas e a relação de obras são informações distintas.`,
    "Mobilização das equipes. A CONTRATANTE indica as equipes por obra e fornece os acessos, os dados cadastrais e os documentos necessários. A CONTRATADA executa as etapas contratadas e acompanha a mobilização. A validação documental e a liberação final cabem à plataforma ou à empresa responsável pela obra.",
    `Ampliação do escopo. A inclusão de plataformas acima do limite de ${LIMITE_PLATAFORMAS_CONTRATO} depende de acordo entre as partes e de ajuste comercial.`,
    "Os serviços cobertos por esta contratação são os descritos neste anexo. As condições de pagamento estão na Cláusula 4.",
  ];
}
