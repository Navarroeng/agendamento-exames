"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildDashboardAgenda,
  buildDashboardKpiDetailRows,
  buildDashboardKpis,
} from "@/lib/dashboard/aggregations";
import type {
  DashboardAgendaFilter,
  DashboardKpiKey,
} from "@/lib/dashboard/types";
import { carregarDadosDashboard } from "@/services/dashboard.service";

export function useDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agendaFilter, setAgendaFilter] =
    useState<DashboardAgendaFilter>("hoje");
  const [selectedKpi, setSelectedKpi] = useState<DashboardKpiKey | null>(null);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof carregarDadosDashboard>
  > | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await carregarDadosDashboard();
      setData(result);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar o dashboard.");
      toast.error("Erro ao carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const kpis = useMemo(
    () =>
      data ? buildDashboardKpis(data.agendamentos, data.periodicos) : null,
    [data]
  );

  const agenda = useMemo(
    () => (data ? buildDashboardAgenda(data.agendamentos, agendaFilter) : []),
    [data, agendaFilter]
  );

  const selectedKpiRows = useMemo(
    () =>
      data && selectedKpi
        ? buildDashboardKpiDetailRows(
            selectedKpi,
            data.agendamentos,
            data.periodicos
          )
        : [],
    [data, selectedKpi]
  );

  const openKpiDetail = useCallback((key: DashboardKpiKey) => {
    setSelectedKpi(key);
  }, []);

  const closeKpiDetail = useCallback(() => {
    setSelectedKpi(null);
  }, []);

  return {
    loading,
    error,
    kpis,
    agenda,
    agendaFilter,
    setAgendaFilter,
    selectedKpi,
    selectedKpiRows,
    openKpiDetail,
    closeKpiDetail,
    refresh,
  };
}
