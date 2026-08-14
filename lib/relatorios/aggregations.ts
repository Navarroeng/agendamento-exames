import { addMonthsToIsoDate } from "@/lib/cliente-contrato-dates";
import { getESocialVisualStatus } from "@/lib/esocial-filters";
import { formatDateBR } from "@/lib/format";
import type {
  AgendamentoWithExames,
  ClienteContratoRecord,
  ClienteRecord,
  FaturaRecord,
} from "@/lib/types";
import type {
  ChartPoint,
  ContratoRenovacaoRow,
  ContratoVencendoRow,
  LucratividadeClinicaRow,
  LucratividadeEmpresaRow,
  PeriodicoRow,
  RelatoriosFilters,
  RelatoriosKpis,
} from "./types";
import { buildResumoClientesMes, buildResumoClinicasMes } from "@/lib/fatura-mes-resumo";
import {
  filterAgendamentosRelatorios,
  filterAgendamentosRelatoriosExtra,
} from "./filters";

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.split("T")[0]}T12:00:00`);
  const to = new Date(`${toIso.split("T")[0]}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function sumExamesAgendamento(item: AgendamentoWithExames) {
  const exames = item.agendamento_exames ?? [];
  let valorCliente = 0;
  let custoClinica = 0;
  exames.forEach((exame) => {
    valorCliente += Number(exame.valor_cliente ?? 0);
    custoClinica += Number(exame.custo_clinica ?? 0);
  });
  return { valorCliente, custoClinica, lucro: valorCliente - custoClinica };
}

function filterAgendamentosPorStatusContrato(
  agendamentos: AgendamentoWithExames[],
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  statusContrato: RelatoriosFilters["statusContrato"]
): AgendamentoWithExames[] {
  if (!statusContrato) return agendamentos;
  const clienteIds = new Set(
    contratos
      .filter((c) => c.status === statusContrato)
      .map((c) => c.cliente_id)
  );
  const nomes = new Set(
    clientes
      .filter((c) => clienteIds.has(c.id))
      .map((c) => c.nome.trim().toLowerCase())
  );
  return agendamentos.filter((a) =>
    nomes.has(a.cliente_nome.trim().toLowerCase())
  );
}

function agendamentosBaseFaturaRelatorios(
  agendamentosFatura: AgendamentoWithExames[],
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  filters: RelatoriosFilters
): AgendamentoWithExames[] {
  const extra = filterAgendamentosRelatoriosExtra(agendamentosFatura, filters);
  return filterAgendamentosPorStatusContrato(
    extra,
    contratos,
    clientes,
    filters.statusContrato
  );
}

function clientesCatalogRelatorios(clientes: ClienteRecord[]) {
  return clientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    cnpj: c.cnpj ?? "",
  }));
}

/**
 * Mesmo indicador "Previsto no mês" da página Custos Clínicas
 * (`buildResumoClinicasMes` → `valorPrevisto`).
 */
export function custosClinicasPrevistoNoMes(
  agendamentosCustos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  filters: RelatoriosFilters
): number {
  const base = agendamentosBaseFaturaRelatorios(
    agendamentosCustos,
    contratos,
    clientes,
    filters
  );
  const resumo = buildResumoClinicasMes(
    base,
    faturas,
    filters.mesReferencia.trim()
  );
  return resumo?.resumo.valorPrevisto ?? 0;
}

/**
 * Mesmo indicador "Previsto no mês" da página Faturas Clientes
 * (`buildResumoClientesMes` → `valorPrevisto`).
 */
export function faturamentoPrevistoNoMes(
  agendamentosFatura: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  filters: RelatoriosFilters
): number {
  const base = agendamentosBaseFaturaRelatorios(
    agendamentosFatura,
    contratos,
    clientes,
    filters
  );
  const resumo = buildResumoClientesMes(
    base,
    faturas,
    filters.mesReferencia.trim(),
    "",
    clientesCatalogRelatorios(clientes)
  );
  return resumo?.resumo.valorPrevisto ?? 0;
}

/** Previsto, custos e lucro da mesma fonte dos cards de Relatórios. */
export function financeiroPrevistoNoMes(
  agendamentosFatura: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  filters: RelatoriosFilters
): { previsto: number; custos: number; lucro: number } {
  const previsto = faturamentoPrevistoNoMes(
    agendamentosFatura,
    faturas,
    contratos,
    clientes,
    filters
  );
  const custos = custosClinicasPrevistoNoMes(
    agendamentosFatura,
    faturas,
    contratos,
    clientes,
    filters
  );
  return { previsto, custos, lucro: previsto - custos };
}

function mesIsoFromAgendamento(data: string): string | null {
  const match = data.split("T")[0].match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
}

function mesIsoToBR(mesIso: string): string {
  const [year, month] = mesIso.split("-");
  return year && month ? `${month}/${year}` : "";
}

export function buildKpis(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  filters: RelatoriosFilters,
  agendamentosCustosClinicas: AgendamentoWithExames[] = agendamentos
): RelatoriosKpis {
  const filtered = filterAgendamentosRelatorios(agendamentos, filters);

  const { previsto: totalFaturado, custos: custosClinicas, lucro: lucroBruto } =
    financeiroPrevistoNoMes(
      agendamentosCustosClinicas,
      faturas,
      contratos,
      clientes,
      filters
    );

  const hoje = todayIso();
  const contratosAtivos = contratos.filter((c) => c.status === "ativo");
  const contratosVencendo = contratosAtivos.filter((c) => {
    if (!c.data_fim) return false;
    const dias = daysBetween(hoje, c.data_fim);
    return dias >= 0 && dias <= 30;
  }).length;

  const receitaContratualAnual = contratosAtivos.reduce((s, c) => {
    const valor = Number(c.valor_contrato ?? 0);
    return s + valor;
  }, 0);

  const periodicos = buildPeriodicos(filtered);
  const periodicosVencendo = periodicos.filter(
    (p) => p.status === "vencido" || p.status === "vence_30"
  ).length;

  return {
    totalAsosMes: filtered.length,
    totalFaturado,
    custosClinicas,
    lucroBruto,
    pendenciasEsocial: filtered.filter((a) => {
      const status = getESocialVisualStatus(a);
      return status === "pendente" || status === "urgente";
    }).length,
    periodicosVencendo,
    contratosVencendo,
    contratosAtivos: contratosAtivos.length,
    receitaContratualAnual,
  };
}

export function buildLucratividadeEmpresa(
  agendamentos: AgendamentoWithExames[],
  filters: RelatoriosFilters
): LucratividadeEmpresaRow[] {
  const map = new Map<string, { faturado: number; custo: number }>();

  filterAgendamentosRelatorios(agendamentos, filters).forEach((item) => {
    const totals = sumExamesAgendamento(item);
    const current = map.get(item.cliente_nome) ?? { faturado: 0, custo: 0 };
    map.set(item.cliente_nome, {
      faturado: current.faturado + totals.valorCliente,
      custo: current.custo + totals.custoClinica,
    });
  });

  return Array.from(map.entries())
    .map(([empresa, v]) => {
      const lucro = v.faturado - v.custo;
      const margem = v.faturado > 0 ? (lucro / v.faturado) * 100 : 0;
      return {
        empresa,
        totalFaturado: v.faturado,
        custoClinica: v.custo,
        lucro,
        margemPercentual: Math.round(margem * 10) / 10,
      };
    })
    .sort((a, b) => b.lucro - a.lucro);
}

export function buildLucratividadeClinica(
  agendamentos: AgendamentoWithExames[],
  filters: RelatoriosFilters
): LucratividadeClinicaRow[] {
  const map = new Map<string, { exames: number; custo: number }>();

  filterAgendamentosRelatorios(agendamentos, filters).forEach((item) => {
    const clinica = item.clinica_nome;
    const count = item.agendamento_exames?.length ?? 0;
    const custo = (item.agendamento_exames ?? []).reduce(
      (s, e) => s + Number(e.custo_clinica ?? 0),
      0
    );
    const current = map.get(clinica) ?? { exames: 0, custo: 0 };
    map.set(clinica, {
      exames: current.exames + count,
      custo: current.custo + custo,
    });
  });

  return Array.from(map.entries())
    .map(([clinica, v]) => ({
      clinica,
      totalExames: v.exames,
      custoTotal: v.custo,
      ticketMedio: v.exames > 0 ? v.custo / v.exames : 0,
    }))
    .sort((a, b) => b.custoTotal - a.custoTotal);
}

export function buildPeriodicos(
  agendamentos: AgendamentoWithExames[]
): PeriodicoRow[] {
  const map = new Map<
    string,
    { empresa: string; colaborador: string; exame: string; ultima: string; id: string }
  >();

  agendamentos
    .filter((a) => a.status !== "cancelado" && a.aso.toLowerCase().includes("periódico"))
    .forEach((a) => {
      const key = `${a.cliente_nome}::${a.colaborador}`;
      const data = a.data_agendamento.split("T")[0];
      const existing = map.get(key);
      if (!existing || data > existing.ultima) {
        const exame = a.agendamento_exames?.[0]?.tipo_exame ?? a.aso;
        map.set(key, {
          id: a.id,
          empresa: a.cliente_nome,
          colaborador: a.colaborador,
          exame,
          ultima: data,
        });
      }
    });

  const hoje = todayIso();

  return Array.from(map.values()).map((item) => {
    const proxima = addMonthsToIsoDate(item.ultima, 12);
    const dias = daysBetween(hoje, proxima);
    let status: PeriodicoRow["status"] = "em_dia";
    if (dias < 0) status = "vencido";
    else if (dias <= 30) status = "vence_30";

    return {
      id: item.id,
      empresa: item.empresa,
      colaborador: item.colaborador,
      exame: item.exame,
      ultimaRealizacao: formatDateBR(item.ultima),
      proximaData: formatDateBR(proxima),
      status,
    };
  });
}

export function buildContratosRenovacoes(
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  filters: RelatoriosFilters
): ContratoRenovacaoRow[] {
  const nomeById = new Map(clientes.map((c) => [c.id, c.nome]));

  const byCliente = new Map<string, ClienteContratoRecord[]>();
  contratos.forEach((c) => {
    const list = byCliente.get(c.cliente_id) ?? [];
    list.push(c);
    byCliente.set(c.cliente_id, list);
  });

  const rows: ContratoRenovacaoRow[] = [];

  contratos.forEach((contrato) => {
    const empresa = nomeById.get(contrato.cliente_id) ?? "—";
    if (filters.empresa.trim() && !empresa.toLowerCase().includes(filters.empresa.trim().toLowerCase())) {
      return;
    }
    if (filters.statusContrato && contrato.status !== filters.statusContrato) return;

    const historico = (byCliente.get(contrato.cliente_id) ?? []).sort((a, b) =>
      b.data_inicio.localeCompare(a.data_inicio)
    );
    const idx = historico.findIndex((h) => h.id === contrato.id);
    const anterior = historico[idx + 1];

    rows.push({
      id: contrato.id,
      empresa,
      clienteId: contrato.cliente_id,
      inicio: formatDateBR(contrato.data_inicio),
      fim: formatDateBR(contrato.data_fim),
      valorAnterior: anterior?.valor_contrato != null ? Number(anterior.valor_contrato) : null,
      valorRenovado: contrato.valor_contrato != null ? Number(contrato.valor_contrato) : null,
      reajustePercentual:
        contrato.reajuste_percentual != null
          ? Number(contrato.reajuste_percentual)
          : null,
      colaboradores: contrato.quantidade_colaboradores,
      status: contrato.status,
      responsavel: "—",
    });
  });

  return rows.sort((a, b) => {
    const fa = contratos.find((c) => c.id === a.id)?.data_fim ?? "";
    const fb = contratos.find((c) => c.id === b.id)?.data_fim ?? "";
    return fa.localeCompare(fb);
  });
}

export function buildContratosVencendo(
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  filters: RelatoriosFilters
): ContratoVencendoRow[] {
  const nomeById = new Map(clientes.map((c) => [c.id, c.nome]));
  const hoje = todayIso();

  return contratos
    .filter((c) => c.status === "ativo" || c.status === "em_renovacao")
    .filter((c) => {
      const empresa = nomeById.get(c.cliente_id) ?? "";
      if (filters.empresa.trim() && !empresa.toLowerCase().includes(filters.empresa.trim().toLowerCase())) {
        return false;
      }
      if (filters.statusContrato && c.status !== filters.statusContrato) return false;
      return true;
    })
    .map((c) => {
      const fim = c.data_fim ?? c.data_inicio;
      const dias = daysBetween(hoje, fim);
      let status: ContratoVencendoRow["status"] = "ativo";
      if (dias < 0) status = "vencido";
      else if (dias <= 30) status = "vence_30";
      else if (dias <= 60) status = "vence_60";

      return {
        id: c.id,
        empresa: nomeById.get(c.cliente_id) ?? "—",
        clienteId: c.cliente_id,
        vencimento: formatDateBR(fim),
        diasRestantes: dias,
        valorContrato: c.valor_contrato != null ? Number(c.valor_contrato) : null,
        colaboradores: c.quantidade_colaboradores,
        status,
      };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/**
 * Evolução mensal = mesmos indicadores dos cards (Previsto / Custos / Lucro)
 * para cada competência, sem somar `faturas.valor_total`.
 */
export function buildFaturamentoMensalChart(
  agendamentosFatura: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  filters: RelatoriosFilters
): ChartPoint[] {
  const base = agendamentosBaseFaturaRelatorios(
    agendamentosFatura,
    contratos,
    clientes,
    filters
  );
  const months = new Set<string>();
  base.forEach((item) => {
    const mes = mesIsoFromAgendamento(item.data_agendamento);
    if (mes) months.add(mes);
  });

  return Array.from(months)
    .sort((a, b) => a.localeCompare(b))
    .slice(-12)
    .map((mesIso) => {
      const { previsto, custos, lucro } = financeiroPrevistoNoMes(
        agendamentosFatura,
        faturas,
        contratos,
        clientes,
        { ...filters, mesReferencia: mesIsoToBR(mesIso) }
      );
      return {
        label: mesIso,
        value: previsto,
        value2: custos,
        value3: lucro,
      };
    });
}

export function buildExamesMaisRealizadosChart(
  agendamentos: AgendamentoWithExames[],
  filters: RelatoriosFilters
): ChartPoint[] {
  const map = new Map<string, number>();
  filterAgendamentosRelatorios(agendamentos, filters).forEach((a) => {
    (a.agendamento_exames ?? []).forEach((e) => {
      map.set(e.tipo_exame, (map.get(e.tipo_exame) ?? 0) + 1);
    });
  });

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

export function buildReceitaContratualChart(
  contratos: ClienteContratoRecord[]
): ChartPoint[] {
  const map = new Map<string, number>();
  contratos
    .filter((c) => c.status === "ativo" && c.valor_contrato != null)
    .forEach((c) => {
      const mes = c.data_inicio.slice(0, 7);
      map.set(mes, (map.get(mes) ?? 0) + Number(c.valor_contrato));
    });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}
