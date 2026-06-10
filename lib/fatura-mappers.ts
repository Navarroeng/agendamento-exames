import {
  formatDateIsoToBR,
  parseMonthYearBRToIsoRange,
} from "@/lib/agendamento-datetime";
import {
  filterAgendamentosElegiveisFatura,
} from "@/lib/fatura-elegibilidade";
import { formatDateBR } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import type {
  AgendamentoWithExames,
  FaturaComItens,
  FaturaItemInsert,
  FaturaPreviewState,
  FaturaTipo,
} from "@/lib/types";

export function buildFaturaItensFromAgendamentos(
  agendamentos: AgendamentoWithExames[],
  tipo: FaturaTipo
): FaturaItemInsert[] {
  const itens: FaturaItemInsert[] = [];

  filterAgendamentosElegiveisFatura(agendamentos).forEach((ag) => {
    const dataIso = ag.data_agendamento.split("T")[0];
    (ag.agendamento_exames ?? []).forEach((exam) => {
      const valor =
        tipo === "cliente"
          ? Number(exam.valor_cliente)
          : Number(exam.custo_clinica);

      itens.push({
        agendamento_id: ag.id,
        data_agendamento: dataIso,
        colaborador: ag.colaborador,
        cliente_nome: ag.cliente_nome,
        clinica_nome: ag.clinica_nome,
        tipo_aso: ag.aso,
        exame_nome: exam.tipo_exame,
        valor_unitario: valor,
        quantidade: 1,
        valor_total: valor,
      });
    });
  });

  return itens.sort((a, b) => {
    const d = a.data_agendamento.localeCompare(b.data_agendamento);
    if (d !== 0) return d;
    return a.colaborador.localeCompare(b.colaborador);
  });
}

export function calcTotalFaturaItens(itens: FaturaItemInsert[]): number {
  return itens.reduce((sum, i) => sum + Number(i.valor_total), 0);
}

export function countColaboradoresItens(itens: FaturaItemInsert[]): number {
  return new Set(itens.map((i) => i.colaborador.trim()).filter(Boolean)).size;
}

export interface ResumoPorTipoExame {
  tipo: string;
  qtd: number;
  total: number;
}

export function buildResumoPorTipoExame(
  itens: Pick<FaturaItemInsert, "exame_nome" | "valor_unitario">[]
): ResumoPorTipoExame[] {
  const map = new Map<string, { qtd: number; total: number }>();
  itens.forEach((item) => {
    const key = item.exame_nome;
    const cur = map.get(key) ?? { qtd: 0, total: 0 };
    cur.qtd += 1;
    cur.total += Number(item.valor_unitario);
    map.set(key, cur);
  });
  return Array.from(map.entries())
    .map(([tipo, v]) => ({ tipo, qtd: v.qtd, total: v.total }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo));
}

export function parsePeriodoIso(mesReferencia: string) {
  const range = mesReferencia.trim()
    ? parseMonthYearBRToIsoRange(mesReferencia)
    : null;

  return {
    periodo_inicio: range?.inicio ?? null,
    periodo_fim: range?.fim ?? null,
  };
}

export function formatPeriodoFromIso(
  inicio: string | null,
  fim: string | null
): string {
  const i = inicio ? formatDateIsoToBR(inicio) : "";
  const f = fim ? formatDateIsoToBR(fim) : "";
  if (i && f) return `${i} a ${f}`;
  if (i) return `A partir de ${i}`;
  if (f) return `Até ${f}`;
  return "Período completo";
}

export function diasAteVencimento(
  vencimentoIso: string,
  emissao: Date = new Date()
): number {
  const venc = new Date(`${vencimentoIso}T12:00:00`);
  const base = new Date(
    emissao.getFullYear(),
    emissao.getMonth(),
    emissao.getDate(),
    12
  );
  return Math.max(
    0,
    Math.ceil((venc.getTime() - base.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export function itemToPdfDisplayRow(
  item: FaturaItemInsert,
  _tipo: FaturaTipo
): string[] {
  return [
    formatDateBR(item.data_agendamento),
    item.colaborador,
    item.tipo_aso,
    item.exame_nome,
    formatCurrency(Number(item.valor_unitario)),
  ];
}

export function itemToDisplayRow(
  item: FaturaItemInsert,
  tipo: FaturaTipo
): string[] {
  const data = formatDateBR(item.data_agendamento);
  const valor = formatCurrency(Number(item.valor_unitario));
  const total = formatCurrency(Number(item.valor_total));

  if (tipo === "cliente") {
    return [
      data,
      item.colaborador,
      item.tipo_aso,
      item.exame_nome,
      valor,
      String(item.quantidade),
      total,
    ];
  }

  return [
    data,
    item.colaborador,
    item.cliente_nome,
    item.tipo_aso,
    item.exame_nome,
    valor,
    String(item.quantidade),
    total,
  ];
}

export function faturaComItensToPreview(
  fatura: FaturaComItens,
  readonly = true
): FaturaPreviewState {
  const itens = (fatura.fatura_itens ?? []).map((i) => ({
    agendamento_id: i.agendamento_id,
    data_agendamento: i.data_agendamento,
    colaborador: i.colaborador,
    cliente_nome: i.cliente_nome,
    clinica_nome: i.clinica_nome,
    tipo_aso: i.tipo_aso,
    exame_nome: i.exame_nome,
    valor_unitario: Number(i.valor_unitario),
    quantidade: i.quantidade,
    valor_total: Number(i.valor_total),
  }));

  return {
    tipo: fatura.tipo,
    referenciaNome: fatura.referencia_nome,
    periodoLabel: formatPeriodoFromIso(
      fatura.periodo_inicio,
      fatura.periodo_fim
    ),
    periodo_inicio: fatura.periodo_inicio,
    periodo_fim: fatura.periodo_fim,
    data_vencimento: fatura.data_vencimento,
    data_vencimento_label: formatDateIsoToBR(fatura.data_vencimento),
    itens,
    numero: fatura.numero,
    faturaId: fatura.id,
    status: fatura.status,
    readonly,
  };
}
