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
  isPeriodicoActionable,
  toPeriodicoFuturoRow,
} from "@/lib/periodicos-futuro";
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

  const filterOptions = useMemo(
    () => extractPeriodicoFilterOptions(records),
    [records]
  );

  const filteredRecords = useMemo(() => {
    const mergedFilters: PeriodicoFuturoFilters = {
      ...filters,
      status: activeCard || filters.status,
    };
    return filterPeriodicosFuturos(records, mergedFilters);
  }, [records, filters, activeCard]);

  const counts = useMemo(
    () => countPeriodicosByDisplayStatus(records),
    [records]
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
  }, [filters, activeCard]);

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

  const handleCardClick = useCallback((status: PeriodicoFuturoDisplayStatus) => {
    setActiveCard((prev) => (prev === status ? "" : status));
    setFilters((prev) => ({ ...prev, status: "" }));
  }, []);

  const handleCriarAgendamento = useCallback(
    (record: PeriodicoFuturoRow) => {
      saveAgendamentoPrefill({
        cliente_nome: record.cliente_nome,
        colaborador: record.colaborador,
        cargo_id: record.cargo_id ?? undefined,
        cargo_nome: record.cargo_nome ?? undefined,
        exame_nome: record.exame_nome,
        aso: "Periódico",
      });
      router.push("/");
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
    filterOptions,
    filteredRecords,
    paginatedRecords,
    counts,
    page,
    totalPages,
    activeCard,
    handleFilterChange,
    handleClearFilters,
    handleCardClick,
    setPage,
    handleCriarAgendamento,
    handleMarcarReagendado,
    handleCancelarAcompanhamento,
    canActOnRecord,
    refresh,
  };
}
