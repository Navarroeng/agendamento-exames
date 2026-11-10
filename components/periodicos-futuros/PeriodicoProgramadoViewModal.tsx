"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCPF } from "@/lib/cpf";
import {
  PERIODICO_PROGRAMADO_SITUACAO,
  type VisualizacaoPeriodicoProgramado,
} from "@/lib/periodico-programado-visualizacao";

interface PeriodicoProgramadoViewModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  dados: VisualizacaoPeriodicoProgramado | null;
  onClose: () => void;
}

function Campo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </dt>
      <dd className="mt-0.5 whitespace-pre-wrap font-semibold text-navy">
        {value}
      </dd>
    </div>
  );
}

export function PeriodicoProgramadoViewModal({
  open,
  loading,
  error,
  dados,
  onClose,
}: PeriodicoProgramadoViewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const exames = dados?.examesPrevistos ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/55 backdrop-blur-md"
        onClick={onClose}
        aria-label="Fechar"
      />
      <div
        className="animate-modal-in relative flex max-h-[96vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_40px_80px_-20px_rgba(45,35,95,0.35)] sm:rounded-[24px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="periodico-programado-view-title"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e8edf5] px-5 py-4">
          <div>
            <h3
              id="periodico-programado-view-title"
              className="text-lg font-extrabold text-navy"
            >
              Periódico programado
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">
              Consulta dos dados salvos desta programação.
            </p>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9]"
            onClick={onClose}
            aria-label="Fechar periódico programado"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-app-muted">
              Carregando periódico programado...
            </p>
          ) : error ? (
            <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-brand-red">
              {error}
            </p>
          ) : dados ? (
            <dl className="grid gap-3 rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-4 text-sm">
              <Campo label="Colaborador" value={dados.colaborador} />
              {dados.cpf ? <Campo label="CPF" value={formatCPF(dados.cpf)} /> : null}
              {dados.empresa ? (
                <Campo label="Empresa" value={dados.empresa} />
              ) : null}
              <Campo label="Tipo de ASO" value={dados.tipoAso || "—"} />
              <Campo
                label="Data prevista"
                value={formatDateIsoToBR(dados.dataPrevistaIso) || "—"}
              />
              <Campo label="Situação" value={PERIODICO_PROGRAMADO_SITUACAO} />
              {exames.length > 0 ? (
                <Campo label="Exames previstos" value={exames.join(", ")} />
              ) : null}
              {dados.cargo ? <Campo label="Cargo" value={dados.cargo} /> : null}
              {dados.observacoes ? (
                <Campo label="Observações" value={dados.observacoes} />
              ) : null}
              {dados.motivo ? <Campo label="Motivo" value={dados.motivo} /> : null}
              {dados.origem ? <Campo label="Origem" value={dados.origem} /> : null}
              {dados.clinica ? (
                <Campo label="Clínica" value={dados.clinica} />
              ) : null}
              {dados.horario ? (
                <Campo label="Horário" value={dados.horario} />
              ) : null}
            </dl>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-[#e8edf5] px-5 py-3">
          <button
            type="button"
            className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-xs font-bold text-navy"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
