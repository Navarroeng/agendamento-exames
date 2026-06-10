"use client";

import { useCallback, useEffect, useState } from "react";
import { listarCargos } from "@/services/cargo.service";
import type { CargoRecord } from "@/lib/types";

export function useCargosList() {
  const [cargos, setCargos] = useState<CargoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarCargos();
      setCargos(data);
    } catch (err) {
      console.error("Erro ao carregar cargos:", err);
      setError("Erro ao carregar cargos.");
      setCargos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback(
    (id: string) => cargos.find((cargo) => cargo.id === id) ?? null,
    [cargos]
  );

  return { cargos, loading, error, refresh, getById };
}
