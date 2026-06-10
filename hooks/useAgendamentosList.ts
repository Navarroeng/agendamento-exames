"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgendamentoWithExames } from "@/lib/types";
import { listarAgendamentosComExames } from "@/services/agendamento.service";

export function useAgendamentosList() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoWithExames[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const reloadAgendamentos = useCallback(async () => {
    const data = await listarAgendamentosComExames();
    setAgendamentos(data);
    return data;
  }, []);

  const updateAgendamentoInList = useCallback(
    (id: string, partial: Partial<AgendamentoWithExames>) => {
      setAgendamentos((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...partial } : item
        )
      );
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await listarAgendamentosComExames();
        if (!cancelled) {
          setAgendamentos(data);
        }
      } catch (err) {
        console.error("Erro ao carregar agendamentos:", err);
        if (!cancelled) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "Erro ao carregar agendamentos";
          setError(message);
          setAgendamentos([]);
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
  }, [refreshKey]);

  const getById = useCallback(
    (id: string) => agendamentos.find((a) => a.id === id) ?? null,
    [agendamentos]
  );

  return {
    agendamentos,
    loading,
    error,
    refresh,
    reloadAgendamentos,
    updateAgendamentoInList,
    getById,
  };
}
