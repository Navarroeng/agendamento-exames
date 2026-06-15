"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLIENTES_PAGE_SIZE,
  EMPTY_CLIENTES_LIST_FILTERS,
  type ClientesListFilters,
} from "@/lib/cliente-filters";
import type { ClienteRecord } from "@/lib/types";
import {
  listarClientesPaginados,
  resolverPaginaClientePorNome,
} from "@/services/cliente.service";

const BUSCA_DEBOUNCE_MS = 300;

export function useClientesPaginatedList() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ClientesListFilters>(
    EMPTY_CLIENTES_LIST_FILTERS
  );
  const [debouncedBusca, setDebouncedBusca] = useState("");
  const [clientes, setClientes] = useState<ClienteRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightClienteId, setHighlightClienteId] = useState<string | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const skipPageResetRef = useRef(false);

  useEffect(() => {
    const trimmed = filters.busca.trim();
    const timer = window.setTimeout(() => {
      setDebouncedBusca(trimmed);
      if (!skipPageResetRef.current) {
        setPage(1);
      }
    }, BUSCA_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [filters.busca]);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await listarClientesPaginados({
          page,
          pageSize: CLIENTES_PAGE_SIZE,
          busca: debouncedBusca,
        });

        if (cancelled) return;

        setClientes(result.records);
        setTotal(result.total);
        setTotalPages(result.totalPages);

        if (page > result.totalPages && result.totalPages > 0) {
          setPage(result.totalPages);
        }
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        if (!cancelled) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "Erro ao carregar clientes";
          setError(message);
          setClientes([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [page, debouncedBusca, refreshKey]);

  const setFilter = useCallback(
    (field: keyof ClientesListFilters, value: string) => {
      skipPageResetRef.current = false;
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    skipPageResetRef.current = false;
    setFilters(EMPTY_CLIENTES_LIST_FILTERS);
  }, []);

  const showClienteAposCadastro = useCallback(
    async (clienteId: string, nome: string) => {
      skipPageResetRef.current = true;
      setFilters(EMPTY_CLIENTES_LIST_FILTERS);
      setDebouncedBusca("");
      setHighlightClienteId(clienteId);

      try {
        const targetPage = await resolverPaginaClientePorNome(
          nome,
          CLIENTES_PAGE_SIZE
        );
        setPage(targetPage);
      } catch (err) {
        console.error("Erro ao localizar página do cliente:", err);
        setPage(1);
      }

      setRefreshKey((key) => key + 1);

      window.setTimeout(() => {
        setHighlightClienteId((current) =>
          current === clienteId ? null : current
        );
      }, 4000);
    },
    []
  );

  return {
    clientes,
    loading,
    error,
    page,
    total,
    totalPages,
    pageSize: CLIENTES_PAGE_SIZE,
    filters,
    debouncedBusca,
    highlightClienteId,
    setPage,
    setFilter,
    clearFilters,
    refresh,
    showClienteAposCadastro,
  };
}
