"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isValidDateBR,
  parseDateBRToIso,
  todayIsoSaoPaulo,
} from "@/lib/agendamento-datetime";
import {
  MENSALIDADE_ATRASO_BLOQUEIO_MSG,
  MENSALIDADE_ATRASO_CONSULTA_MSG,
  type ParcelaMensalidadeBloqueante,
} from "@/lib/agendamento-mensalidade-bloqueio";
import { avaliarMensalidadeNovoAgendamento } from "@/services/agendamento-mensalidade-bloqueio.service";

export type MensalidadeAgendamentoUiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "livre" }
  | {
      status: "bloqueado";
      mensagem: string;
      linhas: string[];
      parcelas: ParcelaMensalidadeBloqueante[];
    }
  | { status: "consulta_falhou"; mensagem: string };

export function useMensalidadeAgendamentoBloqueio(params: {
  ativo: boolean;
  clienteId?: string | null;
  clienteNome?: string | null;
  dataAgendamento?: string | null;
  vagaContratoId?: string | null;
  periodicoContratoId?: string | null;
  creditoContratoId?: string | null;
}): {
  state: MensalidadeAgendamentoUiState;
  tentarNovamente: () => void;
} {
  const [state, setState] = useState<MensalidadeAgendamentoUiState>({
    status: "idle",
  });
  const [tentativa, setTentativa] = useState(0);
  const tentarNovamente = useCallback(() => {
    setTentativa((atual) => atual + 1);
  }, []);

  const {
    ativo,
    clienteId,
    clienteNome,
    dataAgendamento,
    vagaContratoId,
    periodicoContratoId,
    creditoContratoId,
  } = params;

  useEffect(() => {
    if (!ativo) {
      setState({ status: "idle" });
      return;
    }
    const id = (clienteId ?? "").trim();
    const nome = (clienteNome ?? "").trim();
    if (!id && !nome) {
      setState({ status: "idle" });
      return;
    }

    const dataInformada = (dataAgendamento ?? "").trim();
    const dataIso = isValidDateBR(dataInformada)
      ? parseDateBRToIso(dataInformada)
      : todayIsoSaoPaulo();
    if (!dataIso) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void avaliarMensalidadeNovoAgendamento({
      clienteId: id || null,
      clienteNome: nome,
      dataAgendamento: dataIso,
      vagaContratoId,
      periodicoContratoId,
      creditoContratoId,
    })
      .then((resultado) => {
        if (cancelled) return;
        if (resultado.status === "bloqueado") {
          setState({
            status: "bloqueado",
            mensagem: resultado.mensagem || MENSALIDADE_ATRASO_BLOQUEIO_MSG,
            linhas: resultado.linhas,
            parcelas: resultado.parcelas,
          });
          return;
        }
        if (resultado.status === "consulta_falhou") {
          setState({
            status: "consulta_falhou",
            mensagem: resultado.mensagem || MENSALIDADE_ATRASO_CONSULTA_MSG,
          });
          return;
        }
        setState({ status: "livre" });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: "consulta_falhou",
          mensagem: MENSALIDADE_ATRASO_CONSULTA_MSG,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    ativo,
    clienteId,
    clienteNome,
    dataAgendamento,
    vagaContratoId,
    periodicoContratoId,
    creditoContratoId,
    tentativa,
  ]);

  useEffect(() => {
    if (!ativo) return;
    const aoVoltar = () => {
      if (document.visibilityState === "visible") {
        setTentativa((atual) => atual + 1);
      }
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [ativo]);

  return { state, tentarNovamente };
}
