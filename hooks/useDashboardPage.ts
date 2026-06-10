"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildDashboardAgenda,
  buildDashboardAtencao,
  buildDashboardCharts,
  buildDashboardDocumentacao,
  buildDashboardEsocial,
  buildDashboardKpis,
  buildDashboardPeriodicos,
} from "@/lib/dashboard/aggregations";
import type { DashboardAgendaFilter } from "@/lib/dashboard/types";
import { carregarDadosDashboard } from "@/services/dashboard.service";

export function useDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agendaFilter, setAgendaFilter] = useState<DashboardAgendaFilter>("hoje");
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
      data
        ? buildDashboardKpis(data.agendamentos, data.periodicos)
        : null,
    [data]
  );

  const atencao = useMemo(
    () =>
      data
        ? buildDashboardAtencao(data.agendamentos, data.periodicos)
        : [],
    [data]
  );

  const agenda = useMemo(
    () =>
      data ? buildDashboardAgenda(data.agendamentos, agendaFilter) : [],
    [data, agendaFilter]
  );

  const esocial = useMemo(
    () => (data ? buildDashboardEsocial(data.agendamentos) : null),
    [data]
  );

  const periodicos = useMemo(
    () => (data ? buildDashboardPeriodicos(data.periodicos) : null),
    [data]
  );

  const documentacao = useMemo(
    () => (data ? buildDashboardDocumentacao(data.agendamentos) : null),
    [data]
  );

  const charts = useMemo(
    () =>
      data
        ? buildDashboardCharts(data.agendamentos, data.periodicos)
        : null,
    [data]
  );

  return {
    loading,
    error,
    kpis,
    atencao,
    agenda,
    esocial,
    periodicos,
    documentacao,
    charts,
    agendaFilter,
    setAgendaFilter,
    refresh,
  };
}
