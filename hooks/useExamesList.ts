"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExameRecord } from "@/lib/types";
import { listarExamesCatalogo } from "@/services/exame.service";

export function useExamesList() {
  const [exames, setExames] = useState<ExameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await listarExamesCatalogo();
        if (!cancelled) {
          setExames(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "Erro ao carregar exames";
          setError(message);
          setExames([]);
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
    (id: string) => exames.find((e) => e.id === id) ?? null,
    [exames]
  );

  return { exames, loading, error, refresh, getById };
}
