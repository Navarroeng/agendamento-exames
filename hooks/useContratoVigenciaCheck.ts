"use client";

import { useEffect, useState } from "react";
import {
  isValidDateBR,
  parseDateBRToIso,
} from "@/lib/agendamento-datetime";
import {
  CONTRATO_ENCERRADO_ERROR_MESSAGE,
  CONTRATO_VIGENTE_ERROR_MESSAGE,
  verificarContratoVigentePorNome,
  type ContratoVigenciaResult,
} from "@/lib/cliente-contrato-vigencia";
import { listarContratosPorCliente } from "@/services/cliente-contrato.service";

export type ContratoVigenciaCheckState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "valid"; dataFim: string }
  | { status: "invalid"; message: string };

async function toCheckState(
  result: ContratoVigenciaResult
): Promise<ContratoVigenciaCheckState> {
  if (result.vigente && result.dataFim) {
    return { status: "valid", dataFim: result.dataFim };
  }

  if (result.clienteId) {
    const contratos = await listarContratosPorCliente(result.clienteId);
    const hasEncerrado = contratos.some(
      (c) => c.status === "encerrado" || Boolean(c.encerrado_em)
    );
    if (hasEncerrado) {
      return {
        status: "invalid",
        message: CONTRATO_ENCERRADO_ERROR_MESSAGE,
      };
    }
  }

  return { status: "invalid", message: CONTRATO_VIGENTE_ERROR_MESSAGE };
}

export function useContratoVigenciaCheck(
  clienteNome: string,
  dataAgendamento: string
): ContratoVigenciaCheckState {
  const [state, setState] = useState<ContratoVigenciaCheckState>({
    status: "idle",
  });

  useEffect(() => {
    const nome = clienteNome.trim();
    const data = dataAgendamento.trim();

    if (!nome || !data) {
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

    void verificarContratoVigentePorNome(nome, dataIso)
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
  }, [clienteNome, dataAgendamento]);

  return state;
}
