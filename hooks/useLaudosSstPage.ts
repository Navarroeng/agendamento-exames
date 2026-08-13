"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPTY_LAUDOS_SST_FILTERS,
  filterLaudosSstProcessos,
  filterLaudosSstProcessosPorMes,
  type LaudosSstEtapaId,
  type LaudosSstFilters,
  type LaudosSstProcesso,
} from "@/lib/laudos-sst";
import {
  resolveInitialMesListagem,
  resolveMesParaAno,
  type YearMonth,
} from "@/lib/listagem-meses";
import { listarProcessosLaudosSst } from "@/services/laudos-sst.service";

export function useLaudosSstPage() {
  const [processos, setProcessos] = useState<LaudosSstProcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LaudosSstFilters>(
    EMPTY_LAUDOS_SST_FILTERS
  );
  const [mesSelecionado, setMesSelecionado] = useState<YearMonth>(() =>
    resolveInitialMesListagem()
  );
  const [modalProcesso, setModalProcesso] = useState<LaudosSstProcesso | null>(
    null
  );
  const [modalTab, setModalTab] = useState<LaudosSstEtapaId>("epis");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarProcessosLaudosSst();
      setProcessos(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar processos de Laudos SST."
      );
      setProcessos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtrados = useMemo(() => {
    const porMes = filterLaudosSstProcessosPorMes(processos, mesSelecionado);
    return filterLaudosSstProcessos(porMes, filters);
  }, [processos, filters, mesSelecionado]);

  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    for (const p of processos) {
      if (p.implantacao.orcamento.responsavel) {
        set.add(p.implantacao.orcamento.responsavel);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [processos]);

  const handleFilterChange = useCallback(
    <K extends keyof LaudosSstFilters>(field: K, value: LaudosSstFilters[K]) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_LAUDOS_SST_FILTERS);
  }, []);

  const handleMesChange = useCallback((mes: YearMonth) => {
    setMesSelecionado(mes);
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setMesSelecionado((prev) => resolveMesParaAno(year, prev.month));
  }, []);

  const openProcesso = useCallback((processo: LaudosSstProcesso) => {
    setModalProcesso(processo);
    setModalTab(processo.etapaAtual);
  }, []);

  const closeModal = useCallback(() => {
    setModalProcesso(null);
    setModalTab("epis");
  }, []);

  const handleModalSaved = useCallback(
    (atualizado: LaudosSstProcesso) => {
      setModalProcesso(atualizado);
      setProcessos((prev) =>
        prev.map((p) =>
          p.implantacao.orcamento.id === atualizado.implantacao.orcamento.id
            ? atualizado
            : p
        )
      );
    },
    []
  );

  return {
    processos: filtrados,
    loading,
    error,
    filters,
    mesSelecionado,
    responsaveis,
    modalProcesso,
    modalTab,
    setModalTab,
    handleFilterChange,
    clearFilters,
    handleMesChange,
    handleYearChange,
    openProcesso,
    closeModal,
    handleModalSaved,
    refresh,
  };
}
