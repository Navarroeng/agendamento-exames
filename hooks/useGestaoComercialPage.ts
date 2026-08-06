"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildGestaoComercialDashboard,
  defaultGestaoComercialFilters,
  type GestaoComercialDashboard,
  type GestaoComercialFechamentoRow,
  type GestaoComercialFilters,
  type GestaoComercialHistoricoMensal,
} from "@/lib/gestao-comercial";
import { ORCAMENTO_ORIGEM_OPTIONS } from "@/lib/orcamento-origem";
import {
  GestaoComercialForbiddenError,
  listarFechamentosGestaoComercial,
  listarHistoricoMensalGestaoComercial,
} from "@/services/gestao-comercial.service";

export function useGestaoComercialPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [allRows, setAllRows] = useState<GestaoComercialFechamentoRow[]>([]);
  const [historico, setHistorico] = useState<GestaoComercialHistoricoMensal[]>(
    []
  );
  const [filters, setFilters] = useState<GestaoComercialFilters>(() =>
    defaultGestaoComercialFilters()
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const [rows, hist] = await Promise.all([
        listarFechamentosGestaoComercial(),
        listarHistoricoMensalGestaoComercial(),
      ]);
      setAllRows(rows);
      setHistorico(hist);
    } catch (err) {
      if (err instanceof GestaoComercialForbiddenError) {
        setForbidden(true);
        setAllRows([]);
        setHistorico([]);
      } else {
        setError(
          err instanceof Error ? err.message : "Falha ao carregar Gestão Comercial."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dashboard: GestaoComercialDashboard = useMemo(
    () => buildGestaoComercialDashboard(allRows, filters, historico),
    [allRows, filters, historico]
  );

  const responsaveisOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of allRows) {
      if (row.responsavelNoFechamento) set.add(row.responsavelNoFechamento);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allRows]);

  const anosOptions = useMemo(() => {
    const set = new Set<number>();
    const current = new Date().getFullYear();
    set.add(current);
    for (const row of allRows) {
      const y = Number(row.aprovadoEm.slice(0, 4));
      if (Number.isFinite(y)) set.add(y);
    }
    for (const h of historico) {
      if (Number.isFinite(h.ano)) set.add(h.ano);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [allRows, historico]);

  const handleFilterChange = useCallback(
    <K extends keyof GestaoComercialFilters>(
      key: K,
      value: GestaoComercialFilters[K]
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters(defaultGestaoComercialFilters());
  }, []);

  return {
    loading,
    error,
    forbidden,
    filters,
    dashboard,
    responsaveisOptions,
    anosOptions,
    origemOptions: ORCAMENTO_ORIGEM_OPTIONS,
    handleFilterChange,
    handleClearFilters,
    reload,
  };
}
