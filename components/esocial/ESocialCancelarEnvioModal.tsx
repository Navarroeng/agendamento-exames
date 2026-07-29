"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";
import {
  getESocialVisualStatusSemCancelamento,
  isEnvioEsocialConcluido,
} from "@/lib/esocial-filters";
import type { AgendamentoWithExames } from "@/lib/types";

interface ESocialCancelarEnvioModalProps {
  open: boolean;
  agendamento: AgendamentoWithExames | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

export function ESocialCancelarEnvioModal({
  open,
  agendamento,
  saving,
  onClose,
  onConfirm,
}: ESocialCancelarEnvioModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setError(null);
  }, [open]);

  if (!agendamento) return null;

  const jaEnviado = isEnvioEsocialConcluido(agendamento.envio_esocial);
  const statusAtual = getESocialVisualStatusSemCancelamento(agendamento);

  function handleConfirm() {
    if (!motivo.trim()) {
      setError("Informe o motivo do cancelamento.");
      return;
    }
    const ok = window.confirm(
      "Tem certeza de que deseja cancelar este envio ao eSocial?"
    );
    if (!ok) return;
    onConfirm(motivo.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancelar envio ao eSocial"
      subtitle={`${agendamento.colaborador} · ${agendamento.cliente_nome}`}
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Voltar
          </button>
          <button
            type="button"
            className="btn justify-center border-brand-red/30 bg-brand-red-soft text-brand-red hover:bg-[#fee2e2] sm:w-auto"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#475569]">
          Informe o motivo do cancelamento deste envio.
        </p>

        {jaEnviado ? (
          <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[12px] leading-relaxed text-[#92400e]">
            Este cancelamento altera o controle interno do sistema. Caso o evento
            já tenha sido transmitido ao eSocial, verifique se será necessário
            realizar exclusão, retificação ou outro procedimento no ambiente
            oficial.
          </div>
        ) : null}

        <p className="text-[11px] text-[#64748b]">
          Status atual:{" "}
          <strong className="text-navy">
            {statusAtual === "enviado"
              ? "Enviado"
              : statusAtual === "urgente"
                ? "Enviar urgente"
                : "Pendente"}
          </strong>
          . O registro permanecerá visível com status{" "}
          <strong className="text-navy">Cancelado</strong>.
        </p>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Motivo do cancelamento <RequiredMark />
          </label>
          <textarea
            className="field-input min-h-[100px] resize-y"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            placeholder="Ex.: evento será retificado no portal oficial"
            disabled={saving}
          />
          {error ? (
            <p className="mt-1 text-[11px] font-medium text-brand-red">{error}</p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
