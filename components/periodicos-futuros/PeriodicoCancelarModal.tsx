"use client";

import { useEffect, useState } from "react";
import { formatCPF } from "@/lib/cpf";
import { formatDateBR } from "@/lib/format";
import type { PeriodicoFuturoGrupo } from "@/lib/periodico-agrupamento";
import { PERIODICO_CANCELAR_AVISO_AGENDAMENTO_ATIVO } from "@/lib/periodico-cancelamento";

interface PeriodicoCancelarModalProps {
  open: boolean;
  grupo: PeriodicoFuturoGrupo | null;
  temAgendamentoAtivoVinculado: boolean;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

export function PeriodicoCancelarModal({
  open,
  grupo,
  temAgendamentoAtivoVinculado,
  saving = false,
  error = null,
  onClose,
  onConfirm,
}: PeriodicoCancelarModalProps) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (open) setMotivo("");
  }, [open, grupo?.grupoKey]);

  if (!open || !grupo) return null;

  const handleClose = () => {
    if (saving) return;
    setMotivo("");
    onClose();
  };

  const handleConfirm = () => {
    if (!motivo.trim() || saving) return;
    onConfirm(motivo.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="periodico-cancel-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fef2f2] to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fef2f2] text-lg text-[#dc2626]">
              ✕
            </div>
            <div>
              <h3
                id="periodico-cancel-modal-title"
                className="text-lg font-extrabold text-[#2d2a4a]"
              >
                Cancelar periódico
              </h3>
              <p className="mt-1 text-sm text-[#8b95a8]">
                Esta ação encerra a obrigação periódica. O registro permanece no histórico.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Empresa
              </dt>
              <dd className="font-semibold text-navy">{grupo.cliente_nome}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Colaborador
              </dt>
              <dd className="font-semibold text-navy">{grupo.colaborador}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
                CPF
              </dt>
              <dd className="tabular-nums text-[#334155]">
                {grupo.temCpf ? formatCPF(grupo.colaborador_cpf) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Exames
              </dt>
              <dd className="text-[#334155]" title={grupo.examesTitulo}>
                {grupo.examesLabel}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Próxima data
              </dt>
              <dd className="tabular-nums font-semibold text-navy">
                {formatDateBR(grupo.proxima_data)}
              </dd>
            </div>
          </dl>

          {temAgendamentoAtivoVinculado ? (
            <div className="rounded-[12px] border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[12px] font-medium text-[#92400e]">
              {PERIODICO_CANCELAR_AVISO_AGENDAMENTO_ATIVO}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="motivo-cancelamento-periodico"
              className="mb-2 block text-[13px] font-bold text-[#253454]"
            >
              Motivo do cancelamento <span className="text-brand-red">*</span>
            </label>
            <textarea
              id="motivo-cancelamento-periodico"
              className="field-input !h-[120px] w-full resize-none py-3"
              placeholder="Informe o motivo do cancelamento deste periódico"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={saving}
            />
          </div>

          {error ? (
            <p className="text-[12px] font-medium text-brand-red">{error}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#e8edf5] bg-[#f8f9fc] px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={handleClose}
            disabled={saving}
          >
            Voltar
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[14px] border border-transparent bg-[#dc2626] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,0.25)] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleConfirm}
            disabled={saving || !motivo.trim()}
          >
            {saving ? "Cancelando..." : "Cancelar periódico"}
          </button>
        </div>
      </div>
    </div>
  );
}
