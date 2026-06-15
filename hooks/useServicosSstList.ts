"use client";

import { useCallback, useEffect, useState } from "react";
import type { ServicoSstRecord } from "@/lib/orcamento-types";
import { listarServicosSst } from "@/services/servico-sst.service";

export function useServicosSstList() {
  const [servicos, setServicos] = useState<ServicoSstRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listarServicosSst();
        if (!cancelled) setServicos(data);
      } catch (err) {
        console.error("Erro ao carregar serviços SST:", err);
        if (!cancelled) {
          setError("Erro ao carregar catálogo de serviços.");
          setServicos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { servicos, loading, error };
}