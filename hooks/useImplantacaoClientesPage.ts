"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useOrcamentoProcessoModal } from "@/hooks/useOrcamentoProcessoModal";
import {
  EMPTY_IMPLANTACAO_FILTERS,
  computeImplantacaoSummary,
  filterImplantacaoProcessos,
  filterImplantacaoProcessosPorMes,
  implantacaoEtapaToModalTab,
  sortImplantacaoProcessos,
  type ImplantacaoFilters,
  type ImplantacaoProcesso,
} from "@/lib/implantacao-clientes";
import {
  resolveInitialImplantacaoMes,
  resolveImplantacaoMesParaAno,
  yearMonthFromDataAprovacao,
  type ImplantacaoYearMonth,
} from "@/lib/implantacao-meses";
import { isFluxoLaudoPontual } from "@/lib/servico-laudo-pontual";
import { listarProcessosImplantacao } from "@/services/implantacao-clientes.service";
import { readImplantacaoOrcamentoIdFromSearch } from "@/lib/servicos-pontuais";

export function useImplantacaoClientesPage() {
  const [processos, setProcessos] = useState<ImplantacaoProcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ImplantacaoFilters>(
    EMPTY_IMPLANTACAO_FILTERS
  );
  const [mesSelecionado, setMesSelecionado] = useState<ImplantacaoYearMonth>(
    () => resolveInitialImplantacaoMes()
  );

  const deepLinkOrcamentoIdRef = useRef<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await listarProcessosImplantacao();
      setProcessos(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar processos de implantação."
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtrados = useMemo(() => {
    // filterImplantacaoProcessos já aplica filters.sort; após o mês,
    // reaplicamos a ordenação escolhida (padrão: etapa → Contrato no topo,
    // Concluído no fim).
    const porFiltros = filterImplantacaoProcessos(processos, filters);
    const porMes = filterImplantacaoProcessosPorMes(porFiltros, mesSelecionado);
    return sortImplantacaoProcessos(porMes, filters.sort);
  }, [processos, filters, mesSelecionado]);

  const summary = useMemo(
    () => computeImplantacaoSummary(processos),
    [processos]
  );

  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    for (const p of processos) {
      if (p.orcamento.responsavel) set.add(p.orcamento.responsavel);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [processos]);

  const handleFilterChange = useCallback(
    <K extends keyof ImplantacaoFilters>(
      field: K,
      value: ImplantacaoFilters[K]
    ) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_IMPLANTACAO_FILTERS);
    setMesSelecionado(resolveInitialImplantacaoMes());
  }, []);

  const handleMesChange = useCallback((mes: ImplantacaoYearMonth) => {
    setMesSelecionado(mes);
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setMesSelecionado((prev) =>
      resolveImplantacaoMesParaAno(year, prev.month)
    );
  }, []);


  const modal = useOrcamentoProcessoModal({ onChanged: refresh });

  const handleVisualizar = useCallback(
    async (orcamentoId: string) => {
      const processo = processos.find((p) => p.orcamento.id === orcamentoId);
      const etapa = processo?.etapaAtual ?? "contrato";
      await modal.openProcesso(
        orcamentoId,
        implantacaoEtapaToModalTab(etapa, processo?.fluxoImplantacao)
      );
    },
    [modal.openProcesso, processos]
  );

  const handleContinuar = useCallback(
    async (orcamentoId: string) => {
      const processo = processos.find((p) => p.orcamento.id === orcamentoId);
      const etapa = processo?.etapaAtual ?? "contrato";
      if (etapa === "concluido" || etapa === "treinamento_agendado") {
        toast.message("Processo já concluído. Abrindo consulta.");
        await modal.openProcesso(
          orcamentoId,
          isFluxoLaudoPontual(processo?.fluxoImplantacao)
            ? "visita_aet"
            : processo?.fluxoImplantacao === "somente_treinamentos" ||
                processo?.fluxoImplantacao === "combinado"
              ? "treinamento"
              : "agendamentos"
        );
        return;
      }
      await modal.openProcesso(
        orcamentoId,
        implantacaoEtapaToModalTab(etapa, processo?.fluxoImplantacao)
      );
    },
    [modal.openProcesso, processos]
  );

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const orcamentoId = readImplantacaoOrcamentoIdFromSearch(
      window.location.search
    );
    if (!orcamentoId || deepLinkOrcamentoIdRef.current === orcamentoId) return;
    const processo = processos.find((p) => p.orcamento.id === orcamentoId);
    if (!processo) return;
    deepLinkOrcamentoIdRef.current = orcamentoId;
    const mes = yearMonthFromDataAprovacao(processo.dataAprovacao);
    if (mes) setMesSelecionado(mes);
    void handleContinuar(orcamentoId);
  }, [loading, processos, handleContinuar]);

  return {
    processos: filtrados,
    loading,
    error,
    filters,
    mesSelecionado,
    summary,
    responsaveis,
    handleFilterChange,
    clearFilters,
    handleMesChange,
    handleYearChange,
    handleVisualizar,
    handleContinuar,
    ...modal,
  };
}

