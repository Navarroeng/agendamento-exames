"use client";

import { useEffect, useMemo, useState } from "react";
import {
  colunasVencimentos,
  fimPrevistoNoMes,
  quantidadesVencimentosPorMes,
  type ConsultaVencimentoContrato,
} from "@/lib/cliente-contrato-vencimentos";
import {
  listarVencimentosDoAno,
  type VencimentoContratoLinha,
} from "@/services/cliente-contrato-vencimentos.service";

export function useClienteContratoVencimentos(
  ano: number,
  mes: number,
  consulta: ConsultaVencimentoContrato
) {
  const [linhasAno, setLinhasAno] = useState<VencimentoContratoLinha[]>([]);
  const [anoCarregado, setAnoCarregado] = useState<number | null>(null);
  const [consultaCarregada, setConsultaCarregada] =
    useState<ConsultaVencimentoContrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError(null);
    listarVencimentosDoAno({ ano, consulta })
      .then((rows) => {
        if (!ativo) return;
        setLinhasAno(rows);
        setAnoCarregado(ano);
        setConsultaCarregada(consulta);
      })
      .catch((err) => {
        console.error(err);
        if (!ativo) return;
        setLinhasAno([]);
        setAnoCarregado(ano);
        setConsultaCarregada(consulta);
        setError("Erro ao carregar vencimentos de contratos.");
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [ano, consulta]);

  const sincronizado = anoCarregado === ano && consultaCarregada === consulta;

  const linhas = useMemo(() => {
    if (!sincronizado) return [];
    return linhasAno.filter((linha) =>
      fimPrevistoNoMes(linha.fimPrevisto, ano, mes)
    );
  }, [sincronizado, linhasAno, ano, mes]);
  const colunas = useMemo(
    () =>
      colunasVencimentos(
        quantidadesVencimentosPorMes(sincronizado ? linhasAno : [], ano),
        mes
      ),
    [sincronizado, linhasAno, ano, mes]
  );

  return { linhas, colunas, loading: loading || !sincronizado, error };
}
