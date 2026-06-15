"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClienteRecord } from "@/lib/types";
import { listarClientesParaSelect } from "@/services/cliente.service";

export function useClientesList() {
  const [clientes, setClientes] = useState<ClienteRecord[]>([]);
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
        const data = await listarClientesParaSelect();
        if (!cancelled) {
          setClientes(data);
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

  return { clientes, loading, error, refresh };
}
