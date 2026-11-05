import { isValidMonthYearBR } from "@/lib/agendamento-datetime";
import { getCurrentMonthReferenceBR } from "@/lib/month-reference-options";
import {
  EMPTY_FATURA_FILTERS,
  faturaMatchesMesReferencia,
  filterAgendamentosDaReferenciaFatura,
  filterAgendamentosFatura,
  formatPeriodoFatura,
  type FaturaFilters,
} from "@/lib/fatura-filters";
import {
  filterAgendamentosElegiveisFatura,
  isValorTotalFaturavel,
} from "@/lib/fatura-elegibilidade";
import { formatDateBR } from "@/lib/format";
import type { ClienteCatalogItem } from "@/lib/fatura-empresa-match";
import {
  buildFaturaItensFromAgendamentos,
  calcTotalFaturaItens,
} from "@/lib/fatura-mappers";
import {
  FATURA_STATUS_INATIVOS,
  faturaStatusContaNoResumoEmitido,
  faturaStatusHistoricoInativo,
  mesReferenciaBRFromFatura,
} from "@/lib/fatura-reemissao";
import type { AgendamentoWithExames, FaturaRecord, FaturaTipo } from "@/lib/types";
import {
  dataOcupadaPorOutroFechamento,
  dataVencimentoFechamento,
  exameChave,
  indexClinicasCiclo,
  normalizarNomeClinica,
  parseMesReferenciaBR,
  periodoFechamentoClinica,
  dataAgendamentoIso,
  dataNoPeriodo,
  type ClinicaCicloConfig,
  type PeriodoRegistradoClinica,
} from "@/lib/clinica-fechamento";
import {
  custosClinicaConferido,
  custosClinicaEmAberto,
  deriveFaturaMesStatusClinica,
  faturaCustosCongelada,
} from "@/lib/custos-clinicas-conferencia";

export type FaturaMesStatus =
  | "aberta_emissao"
  | "rascunho"
  | "emitida"
  | "vencida"
  | "paga"
  | "cancelada"
  | "necessita_reemissao"
  | "substituida"
  | "reemitida";

/** @deprecated Use FaturaMesStatus */
export type FaturaClienteMesStatus = FaturaMesStatus;

export interface FaturaMesRow {
  referenciaNome: string;
  periodoLabel: string;
  periodoInicio?: string | null;
  periodoFim?: string | null;
  dataFechamento?: string | null;
  dataVencimento?: string | null;
  clinicaId?: string | null;
  qtdAgendamentos: number;
  qtdExames: number;
  valorTotal: number;
  fatura: FaturaRecord | null;
  status: FaturaMesStatus;
  alteracaoPosEmissao?: boolean;
}

export type ItemResumoCustoClinica = {
  faturaId: string;
  agendamentoId: string | null;
  exameNome: string;
  valorTotal: number;
  data: string;
};

export type OpcoesResumoClinicas = {
  /** Usa o ciclo de cada clínica. Sem a opção, o mês civil permanece. */
  porFechamento?: boolean;
  clinicas?: ClinicaCicloConfig[];
  periodosRegistrados?: PeriodoRegistradoClinica[];
  itensPorFatura?: ReadonlyMap<string, ItemResumoCustoClinica[]>;
};

/** @deprecated Use FaturaMesRow */
export interface ClienteFaturaMesRow extends FaturaMesRow {
  clienteNome: string;
}

export interface FaturaMesResumoGeral {
  totalReferencias: number;
  totalAgendamentos: number;
  totalExames: number;
  valorPrevisto: number;
  valorEmitido: number;
  valorPago: number;
  valorEmAberto: number;
}

export const FATURA_MES_STATUS_LABELS: Record<FaturaMesStatus, string> = {
  aberta_emissao: "Aberta para emissão",
  rascunho: "Rascunho",
  emitida: "Emitida",
  vencida: "Vencida",
  paga: "Paga",
  cancelada: "Cancelada",
  necessita_reemissao: "Necessita reemissão",
  substituida: "Substituída",
  reemitida: "Reemitida",
};

/** @deprecated Use FATURA_MES_STATUS_LABELS */
export const FATURA_CLIENTE_MES_STATUS_LABELS = FATURA_MES_STATUS_LABELS;

export { FATURA_MES_STATUS_LABELS_CLINICA } from "@/lib/custos-clinicas-conferencia";

export function getCurrentMonthYearBR(): string {
  return getCurrentMonthReferenceBR();
}

function normalizeReferencia(value: string): string {
  return value.trim().toLowerCase();
}

function matchesReferenciaFilter(nome: string, filter: string): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  return nome.toLowerCase().includes(f);
}

export function deriveFaturaMesStatus(
  fatura: FaturaRecord | null
): FaturaMesStatus {
  if (!fatura) return "aberta_emissao";
  if (fatura.status === "cancelada") return "cancelada";
  if (fatura.status === "substituida") return "substituida";
  if (fatura.status === "reemitida") return "reemitida";
  if (fatura.status === "necessita_reemissao") return "necessita_reemissao";
  // Rascunho = aberta para emissão (cancelar emissão reabre neste estado).
  if (fatura.status === "rascunho") return "aberta_emissao";
  if (fatura.status === "vencida") {
    return fatura.pago ? "paga" : "vencida";
  }
  if (fatura.status === "emitida") {
    return fatura.pago ? "paga" : "emitida";
  }
  return "emitida";
}

/** @deprecated Use deriveFaturaMesStatus */
export const deriveClienteMesStatus = deriveFaturaMesStatus;

export function findFaturaReferenciaMes(
  faturas: FaturaRecord[],
  tipo: FaturaTipo,
  referenciaNome: string,
  mesReferencia: string
): FaturaRecord | null {
  const matches = faturas.filter(
    (f) =>
      f.tipo === tipo &&
      normalizeReferencia(f.referencia_nome) ===
        normalizeReferencia(referenciaNome) &&
      faturaMatchesMesReferencia(f, mesReferencia)
  );

  if (matches.length === 0) return null;

  const active = matches.filter(
    (f) => !FATURA_STATUS_INATIVOS.includes(f.status)
  );
  const pool = active.length > 0 ? active : matches;

  const emitida = pool.find((f) => f.status === "emitida");
  if (emitida) return emitida;

  const vencida = pool.find((f) => f.status === "vencida");
  if (vencida) return vencida;

  const necessita = pool.find((f) => f.status === "necessita_reemissao");
  if (necessita) return necessita;

  const rascunho = pool.find((f) => f.status === "rascunho");
  if (rascunho) return rascunho;

  return pool[0] ?? null;
}

/** @deprecated Use findFaturaReferenciaMes */
export function findFaturaClienteMes(
  faturas: FaturaRecord[],
  clienteNome: string,
  mesReferencia: string
): FaturaRecord | null {
  return findFaturaReferenciaMes(
    faturas,
    "cliente",
    clienteNome,
    mesReferencia
  );
}

/** Ordem alfabética por referência (pt-BR, sem diferenciar maiúsculas). */
export function compareFaturaMesReferenciaAsc(
  a: Pick<FaturaMesRow, "referenciaNome">,
  b: Pick<FaturaMesRow, "referenciaNome">
): number {
  return a.referenciaNome.localeCompare(b.referenciaNome, "pt-BR", {
    sensitivity: "base",
  });
}

/** @deprecated Use compareFaturaMesReferenciaAsc */
export const compareClienteFaturaMesNomeAsc = compareFaturaMesReferenciaAsc;

function compareFaturaMesRows(a: FaturaMesRow, b: FaturaMesRow): number {
  const byReferencia = compareFaturaMesReferenciaAsc(a, b);
  if (byReferencia !== 0) return byReferencia;

  const numA = a.fatura?.numero ?? "";
  const numB = b.fatura?.numero ?? "";
  if (numA && numB) {
    const byNumero = numA.localeCompare(numB, "pt-BR", { sensitivity: "base" });
    if (byNumero !== 0) return byNumero;
  }

  return a.periodoLabel.localeCompare(b.periodoLabel, "pt-BR", {
    sensitivity: "base",
  });
}

/** Entra na listagem operacional somente com total faturável (>= R$ 1,00). */
export function isReferenciaFaturavelNoMes(valorTotal: number): boolean {
  return isValorTotalFaturavel(valorTotal);
}

/** Linha ativa exige ao menos um agendamento elegível no período. */
export function rowPossuiAgendamentosValidos(
  row: Pick<FaturaMesRow, "qtdAgendamentos">
): boolean {
  return row.qtdAgendamentos > 0;
}

function isRowAtivaNoResumo(row: FaturaMesRow): boolean {
  if (row.fatura?.tipo === "clinica" && faturaCustosCongelada(row.fatura)) {
    if (faturaStatusHistoricoInativo(row.fatura.status)) return false;
    return isReferenciaFaturavelNoMes(row.valorTotal);
  }
  if (!rowPossuiAgendamentosValidos(row)) return false;
  if (row.fatura && faturaStatusHistoricoInativo(row.fatura.status)) {
    return false;
  }
  // Competência sem valor faturável atual não aparece na listagem operacional
  // (ex.: fatura reaberta cujo total ficou R$ 0,00). Histórico permanece no banco.
  if (!isReferenciaFaturavelNoMes(row.valorTotal)) {
    return false;
  }
  return true;
}

function filterRowsFaturaveis(rows: FaturaMesRow[]): FaturaMesRow[] {
  return rows.filter(isRowAtivaNoResumo);
}

export const PERIODO_COMPLETO_LABEL = "Todo o período";

/** @deprecated Use isReferenciaFaturavelNoMes */
export const isClienteFaturavelNoMes = isReferenciaFaturavelNoMes;

function buildMetricsFromAgendamentos(
  ags: AgendamentoWithExames[],
  tipo: FaturaTipo
): Pick<FaturaMesRow, "qtdAgendamentos" | "qtdExames" | "valorTotal"> {
  const itens = buildFaturaItensFromAgendamentos(ags, tipo);
  const agendamentosComExameFaturavel = new Set(
    itens.map((item) => item.agendamento_id).filter(Boolean)
  );
  return {
    qtdAgendamentos: agendamentosComExameFaturavel.size,
    qtdExames: itens.length,
    valorTotal: calcTotalFaturaItens(itens),
  };
}

function agendamentosReferenciaMes(
  agendamentos: AgendamentoWithExames[],
  mesReferencia: string,
  referenciaNome: string,
  referenciaField: "cliente" | "clinica",
  opts?: {
    referenciaId?: string | null;
    clientesCatalog?: ClienteCatalogItem[];
  }
): AgendamentoWithExames[] {
  return filterAgendamentosDaReferenciaFatura(agendamentos, {
    mesReferencia,
    tipo: referenciaField === "cliente" ? "cliente" : "clinica",
    referenciaNome,
    referenciaId: opts?.referenciaId,
    clientesCatalog: opts?.clientesCatalog,
  });
}

function metricasCustoCongelado(
  fatura: FaturaRecord,
  itens: ItemResumoCustoClinica[] | undefined
): Pick<FaturaMesRow, "qtdAgendamentos" | "qtdExames" | "valorTotal"> {
  if (itens && itens.length > 0) {
    const agendamentos = new Set(
      itens.map((item) => item.agendamentoId).filter((id): id is string => Boolean(id))
    );
    return {
      qtdAgendamentos: agendamentos.size,
      qtdExames: itens.length,
      valorTotal: Number(fatura.valor_total),
    };
  }
  return {
    qtdAgendamentos: fatura.total_agendamentos ?? 0,
    qtdExames: fatura.total_exames,
    valorTotal: Number(fatura.valor_total),
  };
}

function rotuloPeriodoIso(inicio: string | null, fim: string | null): string {
  if (inicio && fim) return `${formatDateBR(inicio)} a ${formatDateBR(fim)}`;
  return "—";
}

function buildRowFromFatura(
  fatura: FaturaRecord,
  agendamentos: AgendamentoWithExames[],
  mesReferencia: string,
  periodoLabel: string,
  tipo: FaturaTipo,
  referenciaField: "cliente" | "clinica",
  clientesCatalog?: ClienteCatalogItem[]
): FaturaMesRow {
  const referenciaNome = fatura.referencia_nome.trim() || "—";
  if (tipo === "clinica" && faturaCustosCongelada(fatura)) {
    const metrics = metricasCustoCongelado(fatura, undefined);
    const inicio = fatura.periodo_inicio;
    const fim = fatura.periodo_fim;
    return {
      referenciaNome,
      periodoLabel:
        inicio && fim ? rotuloPeriodoIso(inicio, fim) : periodoLabel,
      periodoInicio: inicio,
      periodoFim: fim,
      dataFechamento: fatura.data_fechamento ?? fim,
      dataVencimento: fatura.data_vencimento,
      ...metrics,
      fatura,
      status: deriveFaturaMesStatusClinica(fatura),
    };
  }
  const mesAgendamentos =
    mesReferencia.trim() || mesReferenciaBRFromFatura(fatura) || "";
  const ags = mesAgendamentos
    ? agendamentosReferenciaMes(
        agendamentos,
        mesAgendamentos,
        referenciaNome,
        referenciaField,
        {
          referenciaId: fatura.referencia_id,
          clientesCatalog,
        }
      )
    : [];

  const metrics = buildMetricsFromAgendamentos(ags, tipo);

  return {
    referenciaNome,
    periodoLabel,
    qtdAgendamentos: metrics.qtdAgendamentos,
    qtdExames: metrics.qtdExames,
    valorTotal: metrics.valorTotal,
    fatura,
    status:
      tipo === "clinica"
        ? deriveFaturaMesStatusClinica(fatura)
        : deriveFaturaMesStatus(fatura),
  };
}

function computeResumo(
  rows: FaturaMesRow[],
  tipo: FaturaTipo = "cliente"
): FaturaMesResumoGeral {
  const referencias = new Set(
    rows.map((row) => normalizeReferencia(row.referenciaNome))
  );

  let valorEmitido = 0;
  let valorPago = 0;
  let valorEmAberto = 0;

  rows.forEach((row) => {
    const valor = Number(row.valorTotal);

    if (tipo === "clinica") {
      if (row.fatura?.pago || custosClinicaConferido(row.fatura)) {
        valorPago += valor;
      } else if (custosClinicaEmAberto(row.fatura)) {
        valorEmAberto += valor;
      }
      return;
    }

    if (!row.fatura || !faturaStatusContaNoResumoEmitido(row.fatura.status)) {
      return;
    }
    // Emitido, pago e em aberto usam o valor gravado na fatura.
    // O previsto continua sendo o total atual dos agendamentos.
    const valorRegistrado = Number(row.fatura.valor_total);
    if (!Number.isFinite(valorRegistrado)) return;
    valorEmitido += valorRegistrado;
    if (row.fatura.pago) {
      valorPago += valorRegistrado;
    } else {
      valorEmAberto += valorRegistrado;
    }
  });

  const valorPrevisto = rows.reduce((sum, row) => {
    if (row.fatura && faturaStatusHistoricoInativo(row.fatura.status)) {
      return sum;
    }
    return sum + row.valorTotal;
  }, 0);

  return {
    totalReferencias: referencias.size,
    totalAgendamentos: rows.reduce((sum, row) => sum + row.qtdAgendamentos, 0),
    totalExames: rows.reduce((sum, row) => sum + row.qtdExames, 0),
    valorPrevisto,
    valorEmitido,
    valorPago,
    valorEmAberto,
  };
}

function buildResumoPeriodoCompleto(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  tipo: FaturaTipo,
  referenciaFilter: string,
  referenciaField: "cliente" | "clinica",
  clientesCatalog?: ClienteCatalogItem[]
): { rows: FaturaMesRow[]; resumo: FaturaMesResumoGeral } {
  const faturasDoTipo = faturas.filter((f) => f.tipo === tipo);

  const rows = faturasDoTipo
    .filter((fatura) =>
      matchesReferenciaFilter(fatura.referencia_nome, referenciaFilter)
    )
    .map((fatura) => {
      const mesBR = mesReferenciaBRFromFatura(fatura) ?? "";
      const periodoLabel = mesBR
        ? formatPeriodoFatura(mesBR)
        : PERIODO_COMPLETO_LABEL;

      return buildRowFromFatura(
        fatura,
        agendamentos,
        mesBR,
        periodoLabel,
        tipo,
        referenciaField,
        clientesCatalog
      );
    });

  const rowsFaturaveis = filterRowsFaturaveis(rows);
  rowsFaturaveis.sort(compareFaturaMesRows);

  return { rows: rowsFaturaveis, resumo: computeResumo(rowsFaturaveis, tipo) };
}

function buildResumoMesInterno(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mesReferencia: string,
  tipo: FaturaTipo,
  referenciaFilter: string,
  referenciaField: "cliente" | "clinica",
  clientesCatalog?: ClienteCatalogItem[]
): { rows: FaturaMesRow[]; resumo: FaturaMesResumoGeral } | null {
  if (!isValidMonthYearBR(mesReferencia)) return null;

  const filters: FaturaFilters = {
    ...EMPTY_FATURA_FILTERS,
    mesReferencia,
    ...(referenciaField === "cliente"
      ? { cliente: referenciaFilter }
      : { clinica: referenciaFilter }),
  };
  // Busca de UI permanece parcial; o pertencimento à fatura é exato em buildRowFromFatura.
  const agsDoMes = filterAgendamentosFatura(agendamentos, filters);
  const byReferencia = new Map<string, AgendamentoWithExames[]>();

  agsDoMes.forEach((ag) => {
    const nome =
      (referenciaField === "cliente"
        ? ag.cliente_nome
        : ag.clinica_nome)?.trim() || "—";
    const list = byReferencia.get(nome) ?? [];
    list.push(ag);
    byReferencia.set(nome, list);
  });

  const periodoLabel = formatPeriodoFatura(mesReferencia);
  const faturasDoTipo = faturas.filter((f) => f.tipo === tipo);

  const faturasMes = faturasDoTipo.filter(
    (fatura) =>
      faturaMatchesMesReferencia(fatura, mesReferencia) &&
      matchesReferenciaFilter(fatura.referencia_nome, referenciaFilter)
  );

  const rowsFromFaturas = faturasMes.map((fatura) =>
    buildRowFromFatura(
      fatura,
      agendamentos,
      mesReferencia,
      periodoLabel,
      tipo,
      referenciaField,
      clientesCatalog
    )
  );

  // Faturas inativas (ex.: cancelada antiga) não “ocupam” o cliente no mês —
  // senão a linha some da lista (filtrada) e também não gera “Aberta para emissão”.
  const clientesComFatura = new Set(
    faturasMes
      .filter((fatura) => !faturaStatusHistoricoInativo(fatura.status))
      .map((fatura) => normalizeReferencia(fatura.referencia_nome))
  );

  const rowsAbertas: FaturaMesRow[] = Array.from(byReferencia.entries())
    .filter(([referenciaNome]) => {
      return !clientesComFatura.has(normalizeReferencia(referenciaNome));
    })
    .map(([referenciaNome, ags]) => {
      const metrics = buildMetricsFromAgendamentos(ags, tipo);
      return {
        referenciaNome,
        periodoLabel,
        ...metrics,
        fatura: null,
        status: "aberta_emissao" as const,
      };
    })
    .filter((row) => isReferenciaFaturavelNoMes(row.valorTotal));

  const rows = filterRowsFaturaveis([...rowsFromFaturas, ...rowsAbertas]);
  rows.sort(compareFaturaMesRows);

  return { rows, resumo: computeResumo(rows, tipo) };
}

export function buildResumoClientesMes(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mesReferencia: string,
  clienteFilter = "",
  clientesCatalog?: ClienteCatalogItem[]
): { rows: ClienteFaturaMesRow[]; resumo: FaturaMesResumoGeral } | null {
  if (!mesReferencia.trim()) {
    const result = buildResumoPeriodoCompleto(
      agendamentos,
      faturas,
      "cliente",
      clienteFilter,
      "cliente",
      clientesCatalog
    );
    return {
      resumo: result.resumo,
      rows: result.rows.map((row) => ({
        ...row,
        clienteNome: row.referenciaNome,
      })),
    };
  }

  const result = buildResumoMesInterno(
    agendamentos,
    faturas,
    mesReferencia,
    "cliente",
    clienteFilter,
    "cliente",
    clientesCatalog
  );
  if (!result) return null;
  return {
    resumo: result.resumo,
    rows: result.rows.map((row) => ({
      ...row,
      clienteNome: row.referenciaNome,
    })),
  };
}

function semExamesJaVinculados(
  ag: AgendamentoWithExames,
  bloqueados: Set<string>
): AgendamentoWithExames | null {
  const exames = (ag.agendamento_exames ?? []).filter(
    (exame) => !bloqueados.has(exameChave(ag.id, exame.tipo_exame))
  );
  if (exames.length === 0) return null;
  if (exames.length === (ag.agendamento_exames ?? []).length) return ag;
  return { ...ag, agendamento_exames: exames };
}

function buildResumoPorFechamento(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mesReferencia: string,
  clinicaFilter: string,
  opcoes: OpcoesResumoClinicas
): { rows: FaturaMesRow[]; resumo: FaturaMesResumoGeral } | null {
  const alvo = parseMesReferenciaBR(mesReferencia);
  if (!alvo) return null;

  const configs = indexClinicasCiclo(opcoes.clinicas ?? []);
  const periodos = opcoes.periodosRegistrados ?? [];
  const itensPorFatura = opcoes.itensPorFatura;
  const elegiveis = filterAgendamentosElegiveisFatura(agendamentos);
  const faturasMes = faturas.filter(
    (fatura) =>
      fatura.tipo === "clinica" &&
      faturaMatchesMesReferencia(fatura, mesReferencia) &&
      matchesReferenciaFilter(fatura.referencia_nome, clinicaFilter)
  );

  const nomes = new Map<string, string>();
  for (const fatura of faturasMes) {
    const key = normalizarNomeClinica(fatura.referencia_nome);
    if (key) nomes.set(key, fatura.referencia_nome.trim());
  }

  function faturaDoNome(key: string): FaturaRecord | null {
    return findFaturaReferenciaMes(
      faturasMes,
      "clinica",
      nomes.get(key) ?? key,
      mesReferencia
    );
  }

  for (const ag of elegiveis) {
    const nome = ag.clinica_nome?.trim() || "";
    if (!nome || !matchesReferenciaFilter(nome, clinicaFilter)) continue;
    const key = normalizarNomeClinica(nome);
    const config = configs.get(key) ?? null;
    const fatura = faturaDoNome(key);
    if (fatura && faturaCustosCongelada(fatura)) {
      nomes.set(key, fatura.referencia_nome.trim());
      continue;
    }
    const salvo =
      fatura?.periodo_inicio && fatura.periodo_fim
        ? {
            inicio: fatura.periodo_inicio,
            fim: fatura.periodo_fim,
            dataFechamento: fatura.data_fechamento ?? fatura.periodo_fim,
          }
        : null;
    const canonico = periodoFechamentoClinica({
      ano: alvo.ano,
      mes: alvo.mes,
      fechamentoApuracao: config?.fechamentoApuracao,
      diaFechamento: config?.diaFechamento,
    });
    const periodo = salvo ?? canonico;
    const data = dataAgendamentoIso(ag.data_agendamento);
    if (!dataNoPeriodo(data, periodo.inicio, periodo.fim)) continue;
    if (
      dataOcupadaPorOutroFechamento({
        dataIso: data,
        nomeClinica: nome,
        clinicaId: config?.id,
        mesFechamentoIso: alvo.iso,
        faturaIdAtual: fatura?.id,
        periodoSalvoNestaCompetencia: Boolean(salvo),
        periodos,
        config,
      })
    ) {
      continue;
    }
    nomes.set(key, nome);
  }

  const rows: FaturaMesRow[] = [];
  for (const [key, nome] of Array.from(nomes.entries())) {
    const config = configs.get(key) ?? null;
    const fatura = findFaturaReferenciaMes(
      faturasMes,
      "clinica",
      nome,
      mesReferencia
    );
    const salvo =
      fatura?.periodo_inicio && fatura.periodo_fim
        ? {
            inicio: fatura.periodo_inicio,
            fim: fatura.periodo_fim,
            dataFechamento: fatura.data_fechamento ?? fatura.periodo_fim,
          }
        : null;
    const canonico = periodoFechamentoClinica({
      ano: alvo.ano,
      mes: alvo.mes,
      fechamentoApuracao: config?.fechamentoApuracao,
      diaFechamento: config?.diaFechamento,
    });
    const periodo = salvo ?? canonico;
    const vencimentoCalculado = dataVencimentoFechamento({
      diaVencimento: config?.diaVencimento,
      anoFechamento: alvo.ano,
      mesFechamento: alvo.mes,
      vencimentoMes: config?.vencimentoMes,
    });
    const dataVencimento =
      fatura?.data_vencimento && (faturaCustosCongelada(fatura) || salvo)
        ? fatura.data_vencimento
        : (vencimentoCalculado?.iso ?? null);

    if (fatura && faturaCustosCongelada(fatura)) {
      const metrics = metricasCustoCongelado(
        fatura,
        itensPorFatura?.get(fatura.id)
      );
      rows.push({
        referenciaNome: fatura.referencia_nome.trim() || nome,
        periodoLabel: rotuloPeriodoIso(periodo.inicio, periodo.fim),
        periodoInicio: periodo.inicio,
        periodoFim: periodo.fim,
        dataFechamento: periodo.dataFechamento,
        dataVencimento: fatura.data_vencimento,
        clinicaId: fatura.referencia_id ?? config?.id ?? null,
        ...metrics,
        fatura,
        status: deriveFaturaMesStatusClinica(fatura),
      });
      continue;
    }

    const bloqueados = new Set<string>();
    if (itensPorFatura) {
      for (const [faturaId, itens] of Array.from(itensPorFatura.entries())) {
        if (fatura && faturaId === fatura.id) continue;
        for (const item of itens) {
          bloqueados.add(exameChave(item.agendamentoId, item.exameNome));
        }
      }
    }

    const ags: AgendamentoWithExames[] = [];
    for (const ag of elegiveis) {
      if (normalizarNomeClinica(ag.clinica_nome) !== key) continue;
      const data = dataAgendamentoIso(ag.data_agendamento);
      if (!dataNoPeriodo(data, periodo.inicio, periodo.fim)) continue;
      if (
        dataOcupadaPorOutroFechamento({
          dataIso: data,
          nomeClinica: nome,
          clinicaId: config?.id,
          mesFechamentoIso: alvo.iso,
          faturaIdAtual: fatura?.id,
          periodoSalvoNestaCompetencia: Boolean(salvo),
          periodos,
          config,
        })
      ) {
        continue;
      }
      const livre = semExamesJaVinculados(ag, bloqueados);
      if (livre) ags.push(livre);
    }

    const metrics = buildMetricsFromAgendamentos(ags, "clinica");
    rows.push({
      referenciaNome: nome,
      periodoLabel: rotuloPeriodoIso(periodo.inicio, periodo.fim),
      periodoInicio: periodo.inicio,
      periodoFim: periodo.fim,
      dataFechamento: periodo.dataFechamento,
      dataVencimento,
      clinicaId: fatura?.referencia_id ?? config?.id ?? null,
      ...metrics,
      fatura,
      status: deriveFaturaMesStatusClinica(fatura),
    });
  }

  const rowsFaturaveis = filterRowsFaturaveis(rows);
  rowsFaturaveis.sort(compareFaturaMesRows);
  return { rows: rowsFaturaveis, resumo: computeResumo(rowsFaturaveis, "clinica") };
}

export function buildResumoClinicasMes(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mesReferencia: string,
  clinicaFilter = "",
  opcoes?: OpcoesResumoClinicas
): { rows: FaturaMesRow[]; resumo: FaturaMesResumoGeral } | null {
  if (!mesReferencia.trim()) {
    return buildResumoPeriodoCompleto(
      agendamentos,
      faturas,
      "clinica",
      clinicaFilter,
      "clinica"
    );
  }

  if (opcoes?.porFechamento) {
    return buildResumoPorFechamento(
      agendamentos,
      faturas,
      mesReferencia,
      clinicaFilter,
      opcoes
    );
  }

  return buildResumoMesInterno(
    agendamentos,
    faturas,
    mesReferencia,
    "clinica",
    clinicaFilter,
    "clinica"
  );
}

export function filterFaturaMesRowsByStatus(
  rows: FaturaMesRow[],
  status: string
): FaturaMesRow[] {
  const trimmed = status.trim();
  if (!trimmed) return rows;
  return rows.filter((row) => row.status === trimmed);
}

export function computeFaturaMesResumo(
  rows: FaturaMesRow[],
  tipo: FaturaTipo = "cliente"
): FaturaMesResumoGeral {
  return computeResumo(rows, tipo);
}
