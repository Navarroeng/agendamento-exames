import { addMonthsToIsoDate } from "@/lib/cliente-contrato-dates";
import { parseMonthYearBRToIsoRange } from "@/lib/agendamento-datetime";
import { formatDateBR } from "@/lib/format";
import type {
  AgendamentoWithExames,
  ClienteContratoRecord,
  ClienteRecord,
  FaturaRecord,
} from "@/lib/types";
import type {
  ChartPoint,
  ClienteBloqueadoRow,
  ContratoRenovacaoRow,
  ContratoVencendoRow,
  EsocialEmpresaPendenteRow,
  ExameRealizadoRow,
  LucratividadeClinicaRow,
  LucratividadeEmpresaRow,
  PendenciaOperacionalRow,
  PeriodicoRow,
  RelatoriosFilters,
  RelatoriosKpis,
} from "./types";
import { filterAgendamentosRelatorios } from "./filters";

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

export function buildKpis(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  filters: RelatoriosFilters
): RelatoriosKpis {
  const filtered = filterAgendamentosRelatorios(agendamentos, filters);
  const range = filters.mesReferencia.trim()
    ? parseMonthYearBRToIsoRange(filters.mesReferencia)
    : null;

  const faturasMes = faturas.filter((f) => {
    if (f.status === "cancelada") return false;
    if (range) {
      const mes = f.mes_referencia ?? f.periodo_inicio?.slice(0, 7);
      const ref = `${range.inicio.slice(0, 7)}`;
      return mes === ref;
    }
    return true;
  });

  const faturasCliente = faturasMes.filter((f) => f.tipo === "cliente");
  const faturasClinica = faturasMes.filter((f) => f.tipo === "clinica");

  const totalFaturado = faturasCliente.reduce(
    (s, f) => s + Number(f.valor_total ?? 0),
    0
  );
  const custosClinicas = faturasClinica.reduce(
    (s, f) => s + Number(f.valor_total ?? 0),
    0
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
    lucroBruto: totalFaturado - custosClinicas,
    pendenciasEsocial: filtered.filter((a) => !a.envio_esocial).length,
    periodicosVencendo,
    contratosVencendo,
    contratosAtivos: contratosAtivos.length,
    receitaContratualAnual,
  };
}

export function buildPendenciasOperacionais(
  agendamentos: AgendamentoWithExames[],
  filters: RelatoriosFilters
): PendenciaOperacionalRow[] {
  const rows: PendenciaOperacionalRow[] = [];
  const filtered = filterAgendamentosRelatorios(agendamentos, filters);

  filtered.forEach((item) => {
    const base = {
      empresa: item.cliente_nome,
      colaborador: item.colaborador,
      data: formatDateBR(item.data_agendamento),
      responsavel: item.responsavel,
    };

    if (!item.aso_enviado_cliente) {
      rows.push({ id: `${item.id}-cliente`, ...base, statusPendente: "ASO não enviado ao cliente" });
    }
    if (!item.aso_enviado_clinica) {
      rows.push({ id: `${item.id}-clinica`, ...base, statusPendente: "ASO não enviado à clínica" });
    }
    if (!item.aso_assinado) {
      rows.push({ id: `${item.id}-assinado`, ...base, statusPendente: "ASO não assinado" });
    }
    if (!item.envio_esocial) {
      rows.push({ id: `${item.id}-esocial`, ...base, statusPendente: "e-Social pendente" });
    }
  });

  return rows;
}

export function buildExamesRealizados(
  agendamentos: AgendamentoWithExames[],
  filters: RelatoriosFilters
): ExameRealizadoRow[] {
  const rows: ExameRealizadoRow[] = [];
  filterAgendamentosRelatorios(agendamentos, filters).forEach((item) => {
    (item.agendamento_exames ?? []).forEach((exame, idx) => {
      const valor = Number(exame.valor_cliente ?? 0);
      const custo = Number(exame.custo_clinica ?? 0);
      rows.push({
        id: `${item.id}-${idx}`,
        data: formatDateBR(item.data_agendamento),
        empresa: item.cliente_nome,
        colaborador: item.colaborador,
        exame: exame.tipo_exame,
        clinica: item.clinica_nome,
        valorCliente: valor,
        custoClinica: custo,
        lucro: valor - custo,
      });
    });
  });
  return rows;
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

export function buildEsocialEmpresasPendentes(
  agendamentos: AgendamentoWithExames[],
  filters: RelatoriosFilters
): EsocialEmpresaPendenteRow[] {
  const map = new Map<string, Set<string>>();

  filterAgendamentosRelatorios(agendamentos, filters)
    .filter((a) => !a.envio_esocial)
    .forEach((a) => {
      const set = map.get(a.cliente_nome) ?? new Set<string>();
      set.add(a.colaborador);
      map.set(a.cliente_nome, set);
    });

  return Array.from(map.entries())
    .map(([empresa, colaboradores]) => ({
      empresa,
      quantidadePendente: colaboradores.size,
      colaboradoresPendentes: colaboradores.size,
    }))
    .sort((a, b) => b.quantidadePendente - a.quantidadePendente);
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

export function buildClientesBloqueados(
  contratos: ClienteContratoRecord[],
  clientes: ClienteRecord[],
  agendamentos: AgendamentoWithExames[]
): ClienteBloqueadoRow[] {
  const hoje = todayIso();
  const ativos = new Map(
    contratos
      .filter((c) => c.status === "ativo" && c.data_fim && c.data_inicio)
      .filter(
        (c) => hoje >= c.data_inicio && hoje <= (c.data_fim as string)
      )
      .map((c) => [c.cliente_id, c])
  );

  const ultimoAgendamento = new Map<string, { data: string; responsavel: string }>();
  agendamentos
    .filter((a) => a.status !== "cancelado")
    .forEach((a) => {
      const cliente = clientes.find(
        (c) => c.nome.toLowerCase() === a.cliente_nome.trim().toLowerCase()
      );
      if (!cliente) return;
      const data = a.data_agendamento.split("T")[0];
      const prev = ultimoAgendamento.get(cliente.id);
      if (!prev || data > prev.data) {
        ultimoAgendamento.set(cliente.id, {
          data,
          responsavel: a.responsavel,
        });
      }
    });

  return clientes
    .filter((c) => !ativos.has(c.id))
    .map((c) => {
      const contrato = contratos.find(
        (ct) => ct.cliente_id === c.id && ct.status === "ativo"
      );
      const ultimo = ultimoAgendamento.get(c.id);
      return {
        empresa: c.nome,
        clienteId: c.id,
        motivo: contrato
          ? "Contrato fora da vigência"
          : "Sem contrato ativo",
        vencimentoContrato: formatDateBR(contrato?.data_fim),
        ultimoAgendamento: ultimo ? formatDateBR(ultimo.data) : "—",
        responsavel: ultimo?.responsavel ?? "—",
      };
    });
}

export function buildFaturamentoMensalChart(
  faturas: FaturaRecord[]
): ChartPoint[] {
  const map = new Map<string, { faturado: number; custo: number }>();

  faturas
    .filter((f) => f.status !== "cancelada")
    .forEach((f) => {
      const mes = f.mes_referencia ?? f.periodo_inicio?.slice(0, 7);
      if (!mes) return;
      const current = map.get(mes) ?? { faturado: 0, custo: 0 };
      const valor = Number(f.valor_total ?? 0);
      if (f.tipo === "cliente") current.faturado += valor;
      else current.custo += valor;
      map.set(mes, current);
    });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([label, v]) => ({
      label,
      value: v.faturado,
      value2: v.custo,
      value3: v.faturado - v.custo,
    }));
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
