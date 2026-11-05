"use client";

import { useEffect, useState } from "react";
import {
  planoConsultaFiltros,
  type CampoFiltro,
} from "@/lib/consulta-filtros-ui";

export function useFiltrosConsulta<T extends object>(
  filters: T,
  setPage: (page: number) => void,
  camposTexto: readonly CampoFiltro<T>[]
): T {
  const [consulta, setConsulta] = useState(filters);

  useEffect(() => {
    const plano = planoConsultaFiltros(filters, consulta, camposTexto);
    if (plano.tipo === "inalterado") return;

    if (plano.aguardarMs === 0) {
      setConsulta(filters);
      setPage(plano.pagina);
      return;
    }

    const timer = window.setTimeout(() => {
      setConsulta(filters);
      setPage(plano.pagina);
    }, plano.aguardarMs);
    return () => window.clearTimeout(timer);
  }, [filters, consulta, setPage, camposTexto]);

  return consulta;
}
