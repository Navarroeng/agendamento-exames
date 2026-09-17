"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ServicoPontualContratado } from "@/lib/servicos-pontuais";
import { listarServicosPontuaisPorCliente } from "@/services/servicos-pontuais.service";

export function useClienteServicosPontuais(clienteId: string | null) {
  const [itens, setItens] = useState<ServicoPontualContratado[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!clienteId) {
      setItens([]);
      return;
    }
    setLoading(true);
    try {
      const data = await listarServicosPontuaisPorCliente(clienteId);
      setItens(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar serviços pontuais do cliente.");
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { itens, loading, refresh };
}
