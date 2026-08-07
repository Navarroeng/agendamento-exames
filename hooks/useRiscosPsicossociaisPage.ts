"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS,
  filterRiscosPsicossociaisProcessos,
  filterRiscosPsicossociaisProcessosPorMes,
  type RiscosPsicossociaisEtapaId,
  type RiscosPsicossociaisFilters,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";
import {
  resolveInitialMesListagem,
  resolveMesParaAno,
  type YearMonth,
} from "@/lib/listagem-meses";
import { listarProcessosRiscosPsicossociais } from "@/services/riscos-psicossociais.service";

export function useRiscosPsicossociaisPage() {
  const [processos, setProcessos] = useState<RiscosPsicossociaisProcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RiscosPsicossociaisFilters>(
    EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS
  );
  const [mesSelecionado, setMesSelecionado] = useState<YearMonth>(() =>
    resolveInitialMesListagem()
  );
  const [modalProcesso, setModalProcesso] =
    useState<RiscosPsicossociaisProcesso | null>(null);
  const [modalTab, setModalTab] =
    useState<RiscosPsicossociaisEtapaId>("laudos_sst");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarProcessosRiscosPsicossociais();
      setProcessos(data);
      setModalProcesso((prev) => {
        if (!prev) return null;
        const updated = data.find(
          (p) => p.implantacao.orcamento.id === prev.implantacao.orcamento.id
        );
        return updated ?? prev;
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar processos de Riscos Psicossociais."
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
    const porMes = filterRiscosPsicossociaisProcessosPorMes(
      processos,
      mesSelecionado
    );
    return filterRiscosPsicossociaisProcessos(porMes, filters);
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
    <K extends keyof RiscosPsicossociaisFilters>(
      field: K,
      value: RiscosPsicossociaisFilters[K]
    ) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS);
  }, []);

  const handleMesChange = useCallback((mes: YearMonth) => {
    setMesSelecionado(mes);
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setMesSelecionado((prev) => resolveMesParaAno(year, prev.month));
  }, []);

  const openProcesso = useCallback((processo: RiscosPsicossociaisProcesso) => {
    setModalProcesso(processo);
    setModalTab(processo.etapaAtual);
  }, []);

  const closeModal = useCallback(() => {
    setModalProcesso(null);
    setModalTab("laudos_sst");
  }, []);

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
    refresh,
  };
}
