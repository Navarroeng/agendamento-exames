"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { saveAgendamentoPrefill } from "@/lib/agendamento-prefill";
import {
  EMPTY_PERIODICO_FUTURO_FILTERS,
  countPeriodicosByDisplayStatus,
  extractPeriodicoFilterOptions,
  filterPeriodicosFuturos,
  filterPeriodicosFuturosPorMes,
  isPeriodicoActionable,
  listPeriodicoAnosDisponiveis,
  resolveInitialMesPeriodicos,
  toPeriodicoFuturoRow,
} from "@/lib/periodicos-futuro";
import {
  resolveMesParaAno,
  type YearMonth,
} from "@/lib/listagem-meses";
import type {
  PeriodicoFuturoDisplayStatus,
  PeriodicoFuturoFilters,
  PeriodicoFuturoRow,
} from "@/lib/types";
import {
  cancelarAcompanhamentoPeriodico,
  listarPeriodicosFuturos,
  marcarPeriodicoReagendado,
} from "@/services/periodico-futuro.service";

const PAGE_SIZE = 20;

export function usePeriodicosFuturosPage() {
  const router = useRouter();
  const auditContext = useAuditoriaUsuario();
  const auditOptions = useMemo(() => ({ auditContext }), [auditContext]);
  const [records, setRecords] = useState<PeriodicoFuturoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PeriodicoFuturoFilters>(
    EMPTY_PERIODICO_FUTURO_FILTERS
  );
  const [page, setPage] = useState(1);
  const [activeCard, setActiveCard] = useState<
    PeriodicoFuturoDisplayStatus | ""
  >("");
  const [mesSelecionado, setMesSelecionado] = useState<YearMonth>(() =>
    resolveInitialMesPeriodicos([])
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarPeriodicosFuturos();
      setRecords(data.map(toPeriodicoFuturoRow));
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os periódicos futuros.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const anosDisponiveis = useMemo(
    () => listPeriodicoAnosDisponiveis(records),
    [records]
  );

  // Garante que o ano selecionado exista no seletor após o carregamento.
  useEffect(() => {
    if (anosDisponiveis.length === 0) return;
    if (!anosDisponiveis.includes(mesSelecionado.year)) {
      setMesSelecionado((prev) =>
        resolveMesParaAno(anosDisponiveis[0], prev.month, {
          allowFutureMonths: true,
        })
      );
    }
  }, [anosDisponiveis, mesSelecionado.year]);

  const recordsDoMes = useMemo(
    () => filterPeriodicosFuturosPorMes(records, mesSelecionado),
    [records, mesSelecionado]
  );

  const filterOptions = useMemo(
    () => extractPeriodicoFilterOptions(recordsDoMes),
    [recordsDoMes]
  );

  const filteredRecords = useMemo(() => {
    const mergedFilters: PeriodicoFuturoFilters = {
      ...filters,
      mesReferencia: "",
      status: activeCard || filters.status,
    };
    return filterPeriodicosFuturos(recordsDoMes, mergedFilters);
  }, [recordsDoMes, filters, activeCard]);

  const counts = useMemo(
    () => countPeriodicosByDisplayStatus(recordsDoMes),
    [recordsDoMes]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE)),
    [filteredRecords.length]
  );

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

  useEffect(() => {
    setPage(1);
  }, [filters, activeCard, mesSelecionado]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleFilterChange = useCallback(
    (field: keyof PeriodicoFuturoFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
      if (field === "status") setActiveCard("");
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_PERIODICO_FUTURO_FILTERS);
    setActiveCard("");
  }, []);

  const handleMesChange = useCallback((mes: YearMonth) => {
    setMesSelecionado(mes);
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setMesSelecionado((prev) =>
      resolveMesParaAno(year, prev.month, { allowFutureMonths: true })
    );
  }, []);

  const handleCardClick = useCallback((status: PeriodicoFuturoDisplayStatus) => {
    setActiveCard((prev) => (prev === status ? "" : status));
    setFilters((prev) => ({ ...prev, status: "" }));
  }, []);

  const handleCriarAgendamento = useCallback(
    (record: PeriodicoFuturoRow) => {
      saveAgendamentoPrefill({
        cliente_nome: record.cliente_nome,
        colaborador: record.colaborador,
        colaborador_cpf: record.colaborador_cpf ?? undefined,
        cargo_id: record.cargo_id ?? undefined,
        cargo_nome: record.cargo_nome ?? undefined,
        exame_nome: record.exame_nome,
        aso: record.tipo_aso || "Periódico",
      });
      router.push("/");
    },
    [router]
  );

  const handleVisualizarAgendamento = useCallback(
    (agendamentoId: string) => {
      router.push(`/?abrirAgendamento=${encodeURIComponent(agendamentoId)}`);
    },
    [router]
  );

  const handleMarcarReagendado = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        await marcarPeriodicoReagendado(id, auditOptions);
        toast.success("Marcado como reagendado.");
        await refresh();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao marcar como reagendado.");
      } finally {
        setSaving(false);
      }
    },
    [refresh, auditOptions]
  );

  const handleCancelarAcompanhamento = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        await cancelarAcompanhamentoPeriodico(id, auditOptions);
        toast.success("Acompanhamento cancelado.");
        await refresh();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao cancelar acompanhamento.");
      } finally {
        setSaving(false);
      }
    },
    [refresh, auditOptions]
  );

  const canActOnRecord = useCallback(
    (record: PeriodicoFuturoRow) => isPeriodicoActionable(record.status),
    []
  );

  return {
    records,
    loading,
    saving,
    error,
    filters,
    mesSelecionado,
    anosDisponiveis,
    filterOptions,
    filteredRecords,
    paginatedRecords,
    counts,
    page,
    totalPages,
    activeCard,
    handleFilterChange,
    handleClearFilters,
    handleMesChange,
    handleYearChange,
    handleCardClick,
    setPage,
    handleCriarAgendamento,
    handleVisualizarAgendamento,
    handleMarcarReagendado,
    handleCancelarAcompanhamento,
    canActOnRecord,
    refresh,
  };
}
