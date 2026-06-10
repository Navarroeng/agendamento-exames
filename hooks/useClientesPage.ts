"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { buscarClientePorId } from "@/services/cliente.service";
import type { ClienteRecord } from "@/lib/types";

export function useClientesPage() {
  const [viewCliente, setViewCliente] = useState<ClienteRecord | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const handleAbrir = useCallback(async (id: string) => {
    setViewLoading(true);
    try {
      const cliente = await buscarClientePorId(id);
      if (!cliente) {
        toast.error("Cliente não encontrado.");
        return;
      }
      setViewCliente(cliente);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar cliente.");
    } finally {
      setViewLoading(false);
    }
  }, []);

  return {
    viewCliente,
    viewLoading,
    handleAbrir,
    closeView: () => setViewCliente(null),
  };
}
