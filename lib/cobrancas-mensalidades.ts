import { onlyDigits } from "@/lib/cnpj";
import {
  MENSALIDADE_PARCELAS_QUANTIDADE,
  situacaoParcelaMensalidade,
  usaControleParcelasMensalidade,
  type SituacaoParcelaMensalidade,
} from "@/lib/mensalidade-parcelas";
import { mergeAnosComAtual, type YearMonth } from "@/lib/listagem-meses";
import { textMatchesSearch } from "@/lib/text-normalize";

export const COBRANCAS_PAGE_SIZE = 25;

export const BAIXA_JA_PAGA_MSG =
  "Esta parcela já está paga. Não é possível registrar outra baixa.";

export const BAIXA_VALOR_DIVERGENTE_MSG =
  "O valor recebido precisa ser igual ao valor da parcela. Nenhum pagamento foi gravado.";

export const BAIXA_EM_ANDAMENTO_MSG =
  "A baixa desta parcela já está em andamento.";

export const MENSALIDADE_BAIXA_COLUNAS_MSG =
  "O comprovante da parcela ainda não pode ser salvo. Execute o script 150_mensalidade_parcela_recebimento.sql.";

export const COBRANCAS_TODOS_VENCIDOS_AVISO =
  "A consulta mostra parcelas vencidas de qualquer mês. Ela não está limitada à competência selecionada.";

export type FiltroSituacaoCobranca =
  | "todas"
  | "em_aberto"
  | "vencidas"
  | "pagas";

export const FILTRO_SITUACAO_COBRANCA_LABEL: Record<
  FiltroSituacaoCobranca,
  string
> = {
  todas: "Todas",
  em_aberto: "Em aberto",
  vencidas: "Vencidas",
  pagas: "Pagas",
};

export type CobrancaParcela = {
  id: string;
  aprovacaoId: string;
  orcamentoId: string;
  numeroOrcamento: string;
  numeroContrato: string | null;
  empresa: string;
  cnpj: string | null;
  numero: number;
  vencimentoIso: string;
  valor: number;
  pagoEmIso: string | null;
  valorRecebido: number | null;
  comprovantePath: string | null;
  comprovanteNome: string | null;
  situacao: SituacaoParcelaMensalidade;
  statusOrcamento: string;
};

export type ResumoCobrancas = {
  previstoCentavos: number;
  recebidoCentavos: number;
  emAbertoCentavos: number;
  vencidoCentavos: number;
};

export type ConsultaCobrancas = {
  resumo: ResumoCobrancas;
  linhas: CobrancaParcela[];
  total: number;
  page: number;
  totalPages: number;
};

/** Gestão SST mensal. À vista, pontual e parcelas sem vigência ficam de fora. */
export function parcelaEntraEmCobrancas(params: {
  modalidade: string | null | undefined;
  mensalidadePagamento: string | null | undefined;
  semVigencia: boolean;
}): boolean {
  if (params.semVigencia) return false;
  return usaControleParcelasMensalidade(
    params.modalidade,
    params.mensalidadePagamento
  );
}

export function rotuloParcelaCobranca(numero: number): string {
  return `${numero}/${MENSALIDADE_PARCELAS_QUANTIDADE}`;
}

export function rotuloContratoCobranca(
  numeroOrcamento: string,
  numeroContrato: string | null | undefined
): string {
  const orcamento = numeroOrcamento.trim();
  const contrato = (numeroContrato ?? "").trim();
  if (!contrato || contrato === orcamento) return orcamento;
  return `${orcamento} · ${contrato}`;
}

export function seloStatusCobranca(status: string | null | undefined): string | null {
  if (status === "cancelado") return "Cancelado";
  if (status === "contrato_encerrado") return "Encerrado";
  return null;
}

export function reaisParaCentavos(valor: number): number {
  if (!Number.isFinite(valor)) return Number.NaN;
  return Math.round(valor * 100);
}

export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

export function valoresEmCentavosIguais(a: number, b: number): boolean {
  const ca = reaisParaCentavos(a);
  const cb = reaisParaCentavos(b);
  return Number.isFinite(ca) && ca === cb;
}

/**
 * Parcela quitada no Financeiro só com data usa o valor previsto como recebido.
 * Não grava esse fallback no banco.
 */
export function valorRecebidoEfetivo(parcela: {
  situacao: SituacaoParcelaMensalidade;
  valor: number;
  valorRecebido: number | null;
}): number {
  if (parcela.situacao !== "paga") return 0;
  if (
    parcela.valorRecebido != null &&
    Number.isFinite(parcela.valorRecebido)
  ) {
    return parcela.valorRecebido;
  }
  return parcela.valor;
}

export function validarBaixaParcela(params: {
  pagoEmAtual: string | null;
  valorPrevisto: number;
  valorRecebido: number;
  pagoEmIso: string;
}): { ok: true } | { ok: false; mensagem: string } {
  if (params.pagoEmAtual) {
    return { ok: false, mensagem: BAIXA_JA_PAGA_MSG };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.pagoEmIso)) {
    return { ok: false, mensagem: "Informe a data do pagamento." };
  }
  if (!Number.isFinite(params.valorRecebido) || params.valorRecebido <= 0) {
    return { ok: false, mensagem: "Informe o valor recebido." };
  }
  if (!valoresEmCentavosIguais(params.valorPrevisto, params.valorRecebido)) {
    return { ok: false, mensagem: BAIXA_VALOR_DIVERGENTE_MSG };
  }
  return { ok: true };
}

export function competenciaDeIso(iso: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function vencimentoNaCompetencia(
  vencimentoIso: string,
  competencia: YearMonth
): boolean {
  const data = competenciaDeIso(vencimentoIso);
  if (!data) return false;
  return data.year === competencia.year && data.month === competencia.month;
}

export function anosDisponiveisCobrancas(
  vencimentosIso: string[],
  hoje: Date = new Date()
): number[] {
  const anos = vencimentosIso
    .map((iso) => competenciaDeIso(iso)?.year)
    .filter((ano): ano is number => ano != null);
  const conjunto = new Set(mergeAnosComAtual(anos, hoje));
  conjunto.add(hoje.getFullYear() + 1);
  return Array.from(conjunto).sort((a, b) => a - b);
}

function comSituacao(
  parcela: CobrancaParcela,
  hojeIso: string
): CobrancaParcela {
  return {
    ...parcela,
    situacao: situacaoParcelaMensalidade({
      vencimentoIso: parcela.vencimentoIso,
      pagoEmIso: parcela.pagoEmIso,
      hojeIso,
    }),
  };
}

export function buscaCombinaCobranca(
  parcela: Pick<CobrancaParcela, "empresa" | "cnpj">,
  busca: string
): boolean {
  const texto = busca.trim();
  if (!texto) return true;
  if (textMatchesSearch(parcela.empresa, texto)) return true;
  const digits = onlyDigits(texto);
  if (!digits) return false;
  return onlyDigits(parcela.cnpj ?? "").includes(digits);
}

export function situacaoCombinaFiltro(
  situacao: SituacaoParcelaMensalidade,
  filtro: FiltroSituacaoCobranca
): boolean {
  if (filtro === "todas") return true;
  if (filtro === "pagas") return situacao === "paga";
  if (filtro === "vencidas") return situacao === "vencida";
  return situacao === "em_aberto" || situacao === "vence_hoje";
}

function compararParcelas(a: CobrancaParcela, b: CobrancaParcela): number {
  if (a.vencimentoIso !== b.vencimentoIso) {
    return a.vencimentoIso < b.vencimentoIso ? -1 : 1;
  }
  const empresa = a.empresa.localeCompare(b.empresa, "pt-BR");
  if (empresa !== 0) return empresa;
  return a.numero - b.numero;
}

export function resumirCobrancas(parcelas: CobrancaParcela[]): ResumoCobrancas {
  return parcelas.reduce<ResumoCobrancas>(
    (acc, parcela) => {
      const previsto = reaisParaCentavos(parcela.valor);
      if (!Number.isFinite(previsto)) return acc;
      acc.previstoCentavos += previsto;
      if (parcela.situacao === "paga") {
        acc.recebidoCentavos += reaisParaCentavos(
          valorRecebidoEfetivo(parcela)
        );
      } else {
        acc.emAbertoCentavos += previsto;
        if (parcela.situacao === "vencida") {
          acc.vencidoCentavos += previsto;
        }
      }
      return acc;
    },
    {
      previstoCentavos: 0,
      recebidoCentavos: 0,
      emAbertoCentavos: 0,
      vencidoCentavos: 0,
    }
  );
}

/**
 * O resumo usa competência (ou todos os vencidos) e a busca.
 * O filtro de situação só reduz a tabela.
 */
export function consultarCobrancas(params: {
  parcelas: CobrancaParcela[];
  hojeIso: string;
  competencia: YearMonth;
  busca: string;
  situacao: FiltroSituacaoCobranca;
  todosVencidos: boolean;
  page: number;
  pageSize?: number;
}): ConsultaCobrancas {
  const pageSize = params.pageSize ?? COBRANCAS_PAGE_SIZE;
  const normalizadas = params.parcelas.map((parcela) =>
    comSituacao(parcela, params.hojeIso)
  );
  const noEscopo = normalizadas.filter((parcela) => {
    if (params.todosVencidos) return parcela.situacao === "vencida";
    return vencimentoNaCompetencia(parcela.vencimentoIso, params.competencia);
  });
  const buscadas = noEscopo.filter((parcela) =>
    buscaCombinaCobranca(parcela, params.busca)
  );
  const resumo = resumirCobrancas(buscadas);
  const tabela = buscadas
    .filter((parcela) => situacaoCombinaFiltro(parcela.situacao, params.situacao))
    .sort(compararParcelas);
  const total = tabela.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, params.page || 1), totalPages);
  const inicio = (page - 1) * pageSize;
  return {
    resumo,
    linhas: tabela.slice(inicio, inicio + pageSize),
    total,
    page,
    totalPages,
  };
}
