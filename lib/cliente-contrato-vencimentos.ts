import { dataAgendamentoIsoSaoPaulo, todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  deduplicarContratos,
  type ClienteContratoConsulta,
} from "@/lib/cliente-contrato-atual";
import { labelClienteContratoStatusExibicao } from "@/lib/cliente-contrato-mappers";
import { vigenciaContratualConfiavel } from "@/lib/contrato-navarro";
import { formatMesLabel } from "@/lib/listagem-meses";

/**
 * Consulta de término pela data de Fim previsto já gravada.
 * Não cria vigência, não altera contrato e não usa aprovação, PDF ou pagamento.
 */
export type ConsultaVencimentoContrato = "principal" | "encerrados";

export const VENCIMENTOS_VAZIO =
  "Nenhum contrato com término previsto neste mês";

export const VENCIMENTOS_ENCERRADOS_VAZIO =
  "Nenhum contrato cancelado ou encerrado antecipadamente neste mês";

export type RenovacaoVinculada = {
  contratoId: string;
  numero: string | null;
  dataInicio: string;
};

export type LinhaVencimentoContrato = {
  contrato: ClienteContratoConsulta;
  fimPrevisto: string;
  situacao: string;
  renovacao: RenovacaoVinculada | null;
};

const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fim previsto como o cadastro exibe: os dez primeiros caracteres da data gravada.
 * Timestamp não é convertido de fuso, para não mudar o dia mostrado no cliente.
 */
export function fimPrevistoIso(
  value: string | null | undefined
): string | null {
  const base = (value ?? "").trim().slice(0, 10);
  return ISO_DATA.test(base) ? base : null;
}

export function limitesDoMes(
  ano: number,
  mes: number
): { inicio: string; fim: string } {
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error("Mês inválido.");
  }
  const mm = String(mes).padStart(2, "0");
  const ultimo = new Date(ano, mes, 0).getDate();
  return {
    inicio: `${ano}-${mm}-01`,
    fim: `${ano}-${mm}-${String(ultimo).padStart(2, "0")}`,
  };
}

export function fimPrevistoNoMes(
  dataFim: string | null | undefined,
  ano: number,
  mes: number
): boolean {
  const fim = fimPrevistoIso(dataFim);
  if (!fim) return false;
  const limites = limitesDoMes(ano, mes);
  return fim >= limites.inicio && fim <= limites.fim;
}

export function periodoInicialVencimentos(
  hojeIso: string = todayIsoSaoPaulo()
): { ano: number; mes: number } {
  const base = fimPrevistoIso(hojeIso) ?? todayIsoSaoPaulo();
  const [ano, mes] = base.split("-");
  return { ano: Number(ano), mes: Number(mes) };
}

export function anosDoSeletor(anoAtual: number, selecionado: number): number[] {
  const min = Math.min(anoAtual - 5, selecionado);
  const max = Math.max(anoAtual + 5, selecionado);
  const anos: number[] = [];
  for (let ano = min; ano <= max; ano += 1) anos.push(ano);
  return anos;
}

function diaEncerramentoSaoPaulo(
  encerradoEm: string | null | undefined
): string | null {
  return dataAgendamentoIsoSaoPaulo(encerradoEm);
}

/**
 * Cancelado, ou encerrado manualmente antes do Fim previsto.
 * Status encerrado sem encerrado_em permanece na consulta principal:
 * é o fechamento após o término, sem apagar a data gravada.
 */
export function contratoCanceladoOuEncerradoAntecipadamente(
  contrato: Pick<
    ClienteContratoConsulta,
    "status" | "data_fim" | "encerrado_em"
  >
): boolean {
  if (contrato.status === "cancelado") return true;
  const encerradoDia = diaEncerramentoSaoPaulo(contrato.encerrado_em);
  if (!encerradoDia) return false;
  const fim = fimPrevistoIso(contrato.data_fim);
  if (!fim) return true;
  return encerradoDia < fim;
}

function contratoSstComFimPrevisto(
  contrato: Pick<ClienteContratoConsulta, "tipo_contrato" | "data_fim">
): string | null {
  if (contrato.tipo_contrato === "sem_contrato") return null;
  return fimPrevistoIso(contrato.data_fim);
}

function origemDoContrato(
  contrato: ClienteContratoConsulta,
  origemPorOrcamentoId: ReadonlyMap<string, string | null>
): string | null {
  const orcamentoId = contrato.orcamento_id?.trim();
  if (!orcamentoId) return null;
  return origemPorOrcamentoId.get(orcamentoId) ?? null;
}

/**
 * Renovação só quando o orçamento sucessor está marcado como renovação
 * e a vigência dele começa no Fim previsto deste contrato ou depois.
 * Dois predecessores com o mesmo fim não recebem o vínculo.
 */
export function mapearRenovacoesVinculadas(
  contratos: ClienteContratoConsulta[],
  origemPorOrcamentoId: ReadonlyMap<string, string | null>
): Map<string, RenovacaoVinculada> {
  const porCliente = new Map<string, ClienteContratoConsulta[]>();
  for (const contrato of contratos) {
    const lista = porCliente.get(contrato.cliente_id) ?? [];
    lista.push(contrato);
    porCliente.set(contrato.cliente_id, lista);
  }

  const renovacoes = new Map<string, RenovacaoVinculada>();
  for (const lista of Array.from(porCliente.values())) {
    const sucessores = lista.filter((contrato) => {
      if (origemDoContrato(contrato, origemPorOrcamentoId) !== "renovacao") {
        return false;
      }
      if (contrato.status === "cancelado") return false;
      if (contrato.tipo_contrato === "sem_contrato") return false;
      return Boolean(
        vigenciaContratualConfiavel(contrato.data_inicio, contrato.data_fim)
      );
    });

    for (const sucessor of sucessores) {
      const inicio = fimPrevistoIso(sucessor.data_inicio);
      if (!inicio) continue;
      const orcamentoSucessor = sucessor.orcamento_id?.trim() ?? "";
      const candidatos = lista.filter((contrato) => {
        if (contrato.id === sucessor.id) return false;
        const orcamento = contrato.orcamento_id?.trim() ?? "";
        if (orcamento && orcamento === orcamentoSucessor) return false;
        const fim = contratoSstComFimPrevisto(contrato);
        return Boolean(fim && fim <= inicio);
      });
      if (candidatos.length === 0) continue;
      let maiorFim = "";
      for (const candidato of candidatos) {
        const fim = contratoSstComFimPrevisto(candidato) ?? "";
        if (fim > maiorFim) maiorFim = fim;
      }
      const escolhidos = candidatos.filter(
        (candidato) => contratoSstComFimPrevisto(candidato) === maiorFim
      );
      if (escolhidos.length !== 1) continue;
      const predecessor = escolhidos[0];
      const atual = renovacoes.get(predecessor.id);
      if (atual && atual.dataInicio <= inicio) continue;
      renovacoes.set(predecessor.id, {
        contratoId: sucessor.id,
        numero: sucessor.numero?.trim() || null,
        dataInicio: inicio,
      });
    }
  }
  return renovacoes;
}

export function montarVencimentosDoMes(params: {
  ano: number;
  mes: number;
  contratos: ClienteContratoConsulta[];
  origemPorOrcamentoId?: ReadonlyMap<string, string | null>;
  consulta?: ConsultaVencimentoContrato;
  hojeIso?: string;
}): LinhaVencimentoContrato[] {
  const consulta = params.consulta ?? "principal";
  const hojeIso = params.hojeIso ?? todayIsoSaoPaulo();
  const origem = params.origemPorOrcamentoId ?? new Map<string, string | null>();
  const deduplicados = deduplicarContratos(params.contratos);
  const renovacoes = mapearRenovacoesVinculadas(deduplicados, origem);

  const linhas = deduplicados.flatMap((contrato) => {
    const fim = contratoSstComFimPrevisto(contrato);
    if (!fim || !fimPrevistoNoMes(fim, params.ano, params.mes)) return [];
    const fora =
      contratoCanceladoOuEncerradoAntecipadamente(contrato);
    if (consulta === "principal" && fora) return [];
    if (consulta === "encerrados" && !fora) return [];
    return [
      {
        contrato,
        fimPrevisto: fim,
        situacao: labelClienteContratoStatusExibicao(contrato, hojeIso),
        renovacao: renovacoes.get(contrato.id) ?? null,
      },
    ];
  });

  linhas.sort((a, b) => {
    const porFim = a.fimPrevisto.localeCompare(b.fimPrevisto);
    if (porFim !== 0) return porFim;
    return (a.contrato.numero ?? "").localeCompare(b.contrato.numero ?? "", "pt-BR");
  });
  return linhas;
}

export function resumoVencimentos(params: {
  ano: number;
  mes: number;
  total: number;
  consulta?: ConsultaVencimentoContrato;
}): string {
  const periodo = `${formatMesLabel({ year: params.ano, month: params.mes })}/${params.ano}`;
  const consulta = params.consulta ?? "principal";
  if (consulta === "encerrados") {
    const texto =
      params.total === 1
        ? "1 contrato cancelado ou encerrado antecipadamente"
        : `${params.total} contratos cancelados ou encerrados antecipadamente`;
    return `${periodo} — ${texto}`;
  }
  const texto =
    params.total === 1
      ? "1 contrato com término previsto"
      : `${params.total} contratos com término previsto`;
  return `${periodo} — ${texto}`;
}
