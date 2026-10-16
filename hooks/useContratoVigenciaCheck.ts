"use client";

import { useEffect, useState } from "react";
import {
  isValidDateBR,
  parseDateBRToIso,
} from "@/lib/agendamento-datetime";
import {
  CONTRATO_VIGENTE_ERROR_MESSAGE,
  verificarContratoVigenteDoAgendamento,
  type ContratoVigenciaResult,
} from "@/lib/cliente-contrato-vigencia";

export type ContratoVigenciaCheckState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "valid"; dataFim: string }
  | { status: "invalid"; message: string };

function toCheckState(result: ContratoVigenciaResult): ContratoVigenciaCheckState {
  if (result.vigente && result.dataFim) {
    return { status: "valid", dataFim: result.dataFim };
  }

  return {
    status: "invalid",
    message: result.motivo?.trim() || CONTRATO_VIGENTE_ERROR_MESSAGE,
  };
}

export function useContratoVigenciaCheck(
  clienteNome: string,
  dataAgendamento: string,
  clienteId?: string | null
): ContratoVigenciaCheckState {
  const [state, setState] = useState<ContratoVigenciaCheckState>({
    status: "idle",
  });

  useEffect(() => {
    const nome = clienteNome.trim();
    const id = (clienteId ?? "").trim();
    const data = dataAgendamento.trim();

    if ((!nome && !id) || !data) {
      setState({ status: "idle" });
      return;
    }

    if (!isValidDateBR(data)) {
      setState({ status: "idle" });
      return;
    }

    const dataIso = parseDateBRToIso(data);
    if (!dataIso) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    void verificarContratoVigenteDoAgendamento({
      clienteId: id || null,
      clienteNome: nome,
      dataAgendamento: dataIso,
    })
      .then((result) => toCheckState(result))
      .then((next) => {
        if (cancelled) return;
        setState(next);
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: "invalid",
          message: CONTRATO_VIGENTE_ERROR_MESSAGE,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [clienteNome, dataAgendamento, clienteId]);

  return state;
}
