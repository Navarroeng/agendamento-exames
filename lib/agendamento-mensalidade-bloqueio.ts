import { formatDateIsoToBR, todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import { rotuloParcelaCobranca } from "@/lib/cobrancas-mensalidades";
import {
  situacaoParcelaMensalidade,
  type SituacaoParcelaMensalidade,
} from "@/lib/mensalidade-parcelas";
import { formatCurrency } from "@/lib/money";

/** Mais de 10 dias corridos. O 10º dia ainda não bloqueia. */
export const DIAS_ATRASO_MENSALIDADE_BLOQUEIO = 10;

export const MENSALIDADE_ATRASO_BLOQUEIO_TITULO =
  "Agendamento bloqueado por pendência financeira";

export const MENSALIDADE_ATRASO_BLOQUEIO_MSG =
  "Esta empresa possui mensalidade em aberto há mais de 10 dias. Para realizar um novo agendamento, é necessário regularizar o pagamento com o financeiro da Navarro Engenharia.";

export const MENSALIDADE_ATRASO_PORTAL_MSG =
  "Esta empresa possui mensalidade em aberto há mais de 10 dias. Para realizar um novo agendamento, entre em contato com o financeiro da Navarro Engenharia.";

export const MENSALIDADE_ATRASO_CONSULTA_MSG =
  "Não foi possível verificar a situação das mensalidades. Tente novamente.";

export function hrefCobrancasPendenciasEmpresa(empresa: string): string {
  const params = new URLSearchParams();
  const nome = empresa.trim();
  if (nome) params.set("empresa", nome);
  params.set("vencidas", "1");
  return `/cobrancas?${params.toString()}`;
}

export type ParcelaMensalidadeParaBloqueio = {
  id: string;
  orcamentoId: string;
  numero: number;
  vencimentoIso: string;
  valor: number;
  pagoEmIso: string | null;
  statusOrcamento: string;
  situacao?: SituacaoParcelaMensalidade;
};

export type ParcelaMensalidadeBloqueante = ParcelaMensalidadeParaBloqueio & {
  diasAtraso: number;
  situacao: SituacaoParcelaMensalidade;
};

export type AvaliacaoBloqueioMensalidade =
  | { bloqueado: false }
  | {
      bloqueado: true;
      mensagem: string;
      linhas: string[];
      parcelas: ParcelaMensalidadeBloqueante[];
    };

export function diasCorridosEntreDatas(
  inicioIso: string,
  fimIso: string
): number | null {
  const inicio = dataCivil(inicioIso);
  const fim = dataCivil(fimIso);
  if (!inicio || !fim) return null;
  const ms =
    Date.UTC(fim.ano, fim.mes - 1, fim.dia) -
    Date.UTC(inicio.ano, inicio.mes - 1, inicio.dia);
  return Math.round(ms / 86_400_000);
}

export function diasAtrasoMensalidade(
  vencimentoIso: string,
  hojeIso: string
): number | null {
  return diasCorridosEntreDatas(vencimentoIso, hojeIso);
}

/**
 * Parcela da Cobranças que impede novo agendamento deste contrato.
 * Paga, cancelada, no dia ou com até 10 dias de atraso não bloqueia.
 */
export function parcelaBloqueiaNovoAgendamento(
  parcela: ParcelaMensalidadeParaBloqueio,
  hojeIso: string
): ParcelaMensalidadeBloqueante | null {
  if (parcela.statusOrcamento === "cancelado") return null;
  const vencimentoIso = parcela.vencimentoIso.slice(0, 10);
  const hoje = hojeIso.slice(0, 10);
  const situacao = situacaoParcelaMensalidade({
    vencimentoIso,
    pagoEmIso: parcela.pagoEmIso,
    hojeIso: hoje,
  });
  if (situacao !== "vencida") return null;
  const diasAtraso = diasAtrasoMensalidade(vencimentoIso, hoje);
  if (diasAtraso == null || diasAtraso <= DIAS_ATRASO_MENSALIDADE_BLOQUEIO) {
    return null;
  }
  return { ...parcela, vencimentoIso, situacao, diasAtraso };
}

/**
 * Só as parcelas do orçamento do contrato que atende o agendamento.
 * Outro contrato da mesma empresa não entra.
 */
export function avaliarBloqueioMensalidadesContrato(params: {
  parcelas: ParcelaMensalidadeParaBloqueio[];
  orcamentoId: string;
  hojeIso?: string;
}): AvaliacaoBloqueioMensalidade {
  const orcamentoId = params.orcamentoId.trim();
  const hojeIso = (params.hojeIso ?? todayIsoSaoPaulo()).slice(0, 10);
  if (!orcamentoId) return { bloqueado: false };

  const parcelas = params.parcelas
    .filter((parcela) => parcela.orcamentoId === orcamentoId)
    .map((parcela) => parcelaBloqueiaNovoAgendamento(parcela, hojeIso))
    .filter((parcela): parcela is ParcelaMensalidadeBloqueante => parcela != null)
    .sort((a, b) => b.diasAtraso - a.diasAtraso || a.numero - b.numero);

  if (parcelas.length === 0) return { bloqueado: false };
  return {
    bloqueado: true,
    mensagem: MENSALIDADE_ATRASO_BLOQUEIO_MSG,
    linhas: parcelas.map(linhaParcelaBloqueante),
    parcelas,
  };
}

export function linhaParcelaBloqueante(
  parcela: ParcelaMensalidadeBloqueante
): string {
  const dias =
    parcela.diasAtraso === 1
      ? "1 dia de atraso"
      : `${parcela.diasAtraso} dias de atraso`;
  return `Parcela ${rotuloParcelaCobranca(parcela.numero)}, vencimento ${formatDateIsoToBR(parcela.vencimentoIso)}, valor ${formatCurrency(parcela.valor)}, ${dias}.`;
}

export function mensagemBloqueioMensalidadeCompleta(
  avaliacao: Extract<AvaliacaoBloqueioMensalidade, { bloqueado: true }>
): string {
  return [avaliacao.mensagem, ...avaliacao.linhas].join(" ");
}

/**
 * Contrato que atende este agendamento.
 * Vaga, periódico e crédito vencem o contrato vigente genérico da empresa.
 */
export function escolherContratoIdAtendimento(params: {
  vagaContratoId?: string | null;
  periodicoContratoId?: string | null;
  creditoContratoId?: string | null;
  contratoVigenteId?: string | null;
}): string | null {
  const ids = [
    params.vagaContratoId,
    params.periodicoContratoId,
    params.creditoContratoId,
    params.contratoVigenteId,
  ];
  for (const id of ids) {
    const texto = (id ?? "").trim();
    if (texto) return texto;
  }
  return null;
}

function dataCivil(
  iso: string
): { ano: number; mes: number; dia: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const prova = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    prova.getUTCFullYear() !== ano ||
    prova.getUTCMonth() !== mes - 1 ||
    prova.getUTCDate() !== dia
  ) {
    return null;
  }
  return { ano, mes, dia };
}
