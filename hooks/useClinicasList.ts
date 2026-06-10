"use client";

import { useCallback, useEffect, useState } from "react";
import { listarClinicas } from "@/services/clinica.service";
import type { ClinicaListItem } from "@/lib/types";

export function useClinicasList() {
  const [clinicas, setClinicas] = useState<ClinicaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const getById = useCallback(
    (id: string) => clinicas.find((c) => c.id === id) ?? null,
    [clinicas]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listarClinicas();
        if (!cancelled) setClinicas(data);
      } catch (err) {
        console.error("Erro ao listar clínicas:", err);
        if (!cancelled) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "Erro ao carregar clínicas";
          setError(message);
          setClinicas([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { clinicas, loading, error, refresh, getById };
}
