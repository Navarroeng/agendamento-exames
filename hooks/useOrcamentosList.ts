"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrcamentoRecord } from "@/lib/orcamento-types";
import { listarOrcamentos } from "@/services/orcamento.service";

export function useOrcamentosList() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoRecord[]>([]);
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
        const data = await listarOrcamentos();
        if (!cancelled) setOrcamentos(data);
      } catch (err) {
        console.error("Erro ao carregar orçamentos:", err);
        if (!cancelled) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "Erro ao carregar orçamentos";
          setError(message);
          setOrcamentos([]);
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

  return { orcamentos, loading, error, refresh };
}
