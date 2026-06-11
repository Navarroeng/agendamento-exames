"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AUDITORIA_ACAO_LABELS,
  AUDITORIA_MODULO_LABELS,
  EMPTY_AUDITORIA_FILTERS,
  type AuditoriaFilters,
} from "@/lib/auditoria";
import { formatDateBR } from "@/lib/format";
import type { AuditoriaRecord } from "@/lib/types";
import {
  listarAuditoriaPaginada,
  listarAuditoriaUsuariosFiltro,
} from "@/services/auditoria.service";

export interface AuditoriaRow extends AuditoriaRecord {
  createdAtBR: string;
  createdAtTime: string;
}

function toAuditoriaRow(record: AuditoriaRecord): AuditoriaRow {
  const created = new Date(record.created_at);
  const datePart = formatDateBR(record.created_at.split("T")[0]);
  const timePart = created.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    ...record,
    createdAtBR: datePart,
    createdAtTime: timePart,
  };
}

export function useAuditoriaPage() {
  const [records, setRecords] = useState<AuditoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditoriaFilters>(
    EMPTY_AUDITORIA_FILTERS
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [usuarios, setUsuarios] = useState<Array<{ email: string; nome: string }>>(
    []
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listarAuditoriaPaginada({
        page,
        filters,
      });
      setRecords(result.records.map(toAuditoriaRow));
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar auditoria.");
      setRecords([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    listarAuditoriaUsuariosFiltro()
      .then(setUsuarios)
      .catch((err) => console.error("[auditoria] filtros usuários:", err));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleFilterChange = useCallback(
    (field: keyof AuditoriaFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_AUDITORIA_FILTERS);
  }, []);

  const moduloOptions = useMemo(
    () =>
      Object.entries(AUDITORIA_MODULO_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    []
  );

  const acaoOptions = useMemo(
    () =>
      Object.entries(AUDITORIA_ACAO_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    []
  );

  return {
    records,
    loading,
    error,
    filters,
    page,
    totalPages,
    total,
    usuarios,
    moduloOptions,
    acaoOptions,
    setPage,
    handleFilterChange,
    handleClearFilters,
    refresh,
  };
}
