"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildContratosRenovacoes,
  buildContratosVencendo,
  buildExamesMaisRealizadosChart,
  buildFaturamentoMensalChart,
  buildKpis,
  buildLucratividadeClinica,
  buildLucratividadeEmpresa,
  buildReceitaContratualChart,
} from "@/lib/relatorios/aggregations";
import {
  currentMonthReferenciaBR,
  extractRelatoriosFilterOptions,
} from "@/lib/relatorios/filters";
import {
  EMPTY_RELATORIOS_FILTERS,
  type RelatoriosFilters,
} from "@/lib/relatorios/types";
import { carregarDadosRelatorios } from "@/services/relatorios.service";
import { buildClienteFilterOptionsHistorico } from "@/lib/cliente-display";

export function useRelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RelatoriosFilters>({
    ...EMPTY_RELATORIOS_FILTERS,
    mesReferencia: currentMonthReferenciaBR(),
  });
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof carregarDadosRelatorios>
  > | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await carregarDadosRelatorios();
      setData(result);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar dados dos relatórios.");
      toast.error("Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filterOptions = useMemo(() => {
    if (!data) {
      return { empresas: [], clinicas: [], responsaveis: [] };
    }
    const fromAgendamentos = extractRelatoriosFilterOptions(data.agendamentos);
    return {
      ...fromAgendamentos,
      empresas: buildClienteFilterOptionsHistorico(
        data.clientes,
        data.agendamentos.map((ag) => ag.cliente_nome)
      ),
    };
  }, [data]);

  const kpis = useMemo(
    () =>
      data
        ? buildKpis(
            data.agendamentos,
            data.faturas,
            data.contratos,
            data.clientes,
            filters,
            data.agendamentosCustosClinicas
          )
        : null,
    [data, filters]
  );

  const lucratividadeEmpresa = useMemo(
    () =>
      data ? buildLucratividadeEmpresa(data.agendamentos, filters) : [],
    [data, filters]
  );

  const lucratividadeClinica = useMemo(
    () =>
      data ? buildLucratividadeClinica(data.agendamentos, filters) : [],
    [data, filters]
  );

  const contratosRenovacoes = useMemo(
    () =>
      data
        ? buildContratosRenovacoes(
            data.contratos,
            data.clientes,
            filters
          )
        : [],
    [data, filters]
  );

  const contratosVencendo = useMemo(
    () =>
      data
        ? buildContratosVencendo(data.contratos, data.clientes, filters)
        : [],
    [data, filters]
  );

  const chartFaturamento = useMemo(
    () =>
      data
        ? buildFaturamentoMensalChart(
            data.agendamentosCustosClinicas,
            data.faturas,
            data.contratos,
            data.clientes,
            filters
          )
        : [],
    [data, filters]
  );

  const chartExames = useMemo(
    () =>
      data ? buildExamesMaisRealizadosChart(data.agendamentos, filters) : [],
    [data, filters]
  );

  const chartReceitaContratual = useMemo(
    () => (data ? buildReceitaContratualChart(data.contratos) : []),
    [data]
  );

  const handleFilterChange = useCallback(
    (field: keyof RelatoriosFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      ...EMPTY_RELATORIOS_FILTERS,
      mesReferencia: currentMonthReferenciaBR(),
    });
  }, []);

  return {
    loading,
    error,
    filters,
    filtersExpanded,
    filterOptions,
    kpis,
    lucratividadeEmpresa,
    lucratividadeClinica,
    contratosRenovacoes,
    contratosVencendo,
    chartFaturamento,
    chartExames,
    chartReceitaContratual,
    setFiltersExpanded,
    handleFilterChange,
    handleClearFilters,
    refresh,
  };
}
