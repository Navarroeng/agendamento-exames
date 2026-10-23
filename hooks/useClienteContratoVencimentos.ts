"use client";

import { useEffect, useState } from "react";
import type { ConsultaVencimentoContrato } from "@/lib/cliente-contrato-vencimentos";
import {
  listarVencimentosContratos,
  type VencimentoContratoLinha,
} from "@/services/cliente-contrato-vencimentos.service";

export function useClienteContratoVencimentos(
  ano: number,
  mes: number,
  consulta: ConsultaVencimentoContrato
) {
  const [linhas, setLinhas] = useState<VencimentoContratoLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError(null);
    listarVencimentosContratos({ ano, mes, consulta })
      .then((rows) => {
        if (ativo) setLinhas(rows);
      })
      .catch((err) => {
        console.error(err);
        if (!ativo) return;
        setLinhas([]);
        setError("Erro ao carregar vencimentos de contratos.");
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [ano, mes, consulta]);

  return { linhas, loading, error };
}
