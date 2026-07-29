"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";
import type { DestinoAgendamentosFuturos } from "@/services/orcamento-encerrar-contrato.service";

interface OrcamentoEncerrarContratoModalProps {
  open: boolean;
  numeroOrcamento: string;
  numeroContrato: string | null;
  futurosCount: number;
  saving: boolean;
  onClose: () => void;
  onConfirm: (params: {
    motivo: string;
    destinoAgendamentosFuturos: DestinoAgendamentosFuturos;
  }) => void;
}

export function OrcamentoEncerrarContratoModal({
  open,
  numeroOrcamento,
  numeroContrato,
  futurosCount,
  saving,
  onClose,
  onConfirm,
}: OrcamentoEncerrarContratoModalProps) {
  const [motivo, setMotivo] = useState("");
  const [destinoFuturos, setDestinoFuturos] =
    useState<DestinoAgendamentosFuturos>("manter");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setDestinoFuturos("manter");
    setError(null);
  }, [open]);

  function handleConfirm() {
    if (!motivo.trim()) {
      setError("Informe o motivo do encerramento.");
      return;
    }
    onConfirm({
      motivo: motivo.trim(),
      destinoAgendamentosFuturos: destinoFuturos,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Encerrar contrato"
      subtitle={`Orçamento ${numeroOrcamento}${
        numeroContrato ? ` · ${numeroContrato}` : ""
      }`}
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
            {saving ? "Encerrando..." : "Encerrar contrato"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#7f1d1d]">
          <p className="font-extrabold">
            Este orçamento já foi convertido em contrato.
          </p>
          <p className="mt-1.5 font-semibold">Deseja encerrar o contrato?</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#991b1b]">
            Essa ação encerrará a vigência do contrato e interromperá sua
            utilização no sistema, preservando todo o histórico para consulta.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Motivo do encerramento <RequiredMark />
          </label>
          <input
            className="field-input"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            placeholder="Ex.: Cliente desistiu dos serviços."
            disabled={saving}
          />
          {error ? (
            <p className="mt-1 text-[11px] font-medium text-brand-red">{error}</p>
          ) : null}
        </div>

        {futurosCount > 0 ? (
          <fieldset className="space-y-2 rounded-xl border border-[#e4ebf4] bg-[#f8fafc] px-4 py-3">
            <legend className="px-1 text-xs font-bold text-navy">
              O que deseja fazer com os agendamentos futuros? ({futurosCount})
            </legend>
            <label className="flex items-center gap-2 text-sm text-[#334155]">
              <input
                type="radio"
                name="destino_futuros"
                checked={destinoFuturos === "manter"}
                disabled={saving}
                onChange={() => setDestinoFuturos("manter")}
              />
              Manter os agendamentos
            </label>
            <label className="flex items-center gap-2 text-sm text-[#334155]">
              <input
                type="radio"
                name="destino_futuros"
                checked={destinoFuturos === "cancelar"}
                disabled={saving}
                onChange={() => setDestinoFuturos("cancelar")}
              />
              Cancelar automaticamente todos os agendamentos futuros
            </label>
          </fieldset>
        ) : null}
      </div>
    </Modal>
  );
}
