"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";
import {
  MOTIVOS_EXAME_FUTURO,
  TIPOS_ASO_EXAME_FUTURO,
  type MotivoExameFuturo,
} from "@/lib/contrato-programacao-futura";
import {
  formatDateIsoToBR,
  parseDateBRToIso,
  isValidDateBR,
} from "@/lib/agendamento-datetime";
import { formatCPF } from "@/lib/cpf";
import type { InformarExameFuturoFormResult } from "@/components/orcamentos/InformarExameFuturoModal";

export type ProgramarVagaFuturoContext = {
  vagaId: string;
  colaborador: string;
  colaboradorCpf: string | null;
  cargoNome: string | null;
  cargoId: string | null;
};

interface ProgramarVagaFuturoModalProps {
  open: boolean;
  saving: boolean;
  numeroContrato: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  context: ProgramarVagaFuturoContext | null;
  onClose: () => void;
  onConfirm: (data: InformarExameFuturoFormResult) => void;
}

export function ProgramarVagaFuturoModal({
  open,
  saving,
  numeroContrato,
  vigenciaInicio,
  vigenciaFim,
  context,
  onClose,
  onConfirm,
}: ProgramarVagaFuturoModalProps) {
  const [tipoAso, setTipoAso] = useState<string>("Periódico");
  const [dataPrevista, setDataPrevista] = useState("");
  const [motivo, setMotivo] = useState<MotivoExameFuturo | "">("ASO ainda vigente");
  const [motivoDetalhe, setMotivoDetalhe] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTipoAso("Periódico");
    setDataPrevista("");
    setMotivo("ASO ainda vigente");
    setMotivoDetalhe("");
    setObservacoes("");
    setError(null);
  }, [open, context?.vagaId]);

  function handleConfirm() {
    if (!context) return;
    if (!tipoAso.trim()) {
      setError("Selecione o tipo de ASO.");
      return;
    }
    if (!dataPrevista.trim() || !isValidDateBR(dataPrevista)) {
      setError("Informe a data prevista (DD/MM/AAAA).");
      return;
    }
    const iso = parseDateBRToIso(dataPrevista);
    if (!iso) {
      setError("Data prevista inválida.");
      return;
    }
    if (!motivo) {
      setError("Selecione o motivo.");
      return;
    }
    if (motivo === "Outro" && !motivoDetalhe.trim()) {
      setError("Descreva o motivo (Outro).");
      return;
    }

    onConfirm({
      colaborador: context.colaborador.trim(),
      colaboradorCpf: context.colaboradorCpf,
      tipoAso: tipoAso.trim(),
      dataPrevistaIso: iso,
      motivo,
      motivoDetalhe: motivo === "Outro" ? motivoDetalhe.trim() : null,
      observacoes: observacoes.trim() || null,
    });
  }

  const vigenciaLabel =
    vigenciaInicio && vigenciaFim
      ? `${formatDateIsoToBR(vigenciaInicio)} a ${formatDateIsoToBR(vigenciaFim)}`
      : "—";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Programar para o futuro"
      subtitle={numeroContrato ? `Contrato ${numeroContrato}` : undefined}
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary justify-center sm:w-auto"
            onClick={handleConfirm}
            disabled={saving || !context}
          >
            {saving ? "Salvando..." : "Confirmar programação"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#475569]">
          Define a obrigação contratual desta vaga como exame futuro e cria o
          acompanhamento em Periódicos Futuros (origem Implantação Inicial).
        </p>

        <div className="grid gap-3 rounded-xl border border-[#e4ebf4] bg-[#f8fafc] px-3.5 py-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Colaborador
            </p>
            <p className="font-semibold text-navy">
              {context?.colaborador ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              CPF
            </p>
            <p className="font-semibold text-navy">
              {context?.colaboradorCpf
                ? formatCPF(context.colaboradorCpf)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Cargo
            </p>
            <p className="font-semibold text-navy">
              {context?.cargoNome?.trim() || "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Vigência
            </p>
            <p className="font-semibold text-navy">{vigenciaLabel}</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Tipo de ASO <RequiredMark />
          </label>
          <select
            className="field-input"
            value={tipoAso}
            disabled={saving}
            onChange={(e) => {
              setTipoAso(e.target.value);
              setError(null);
            }}
          >
            {TIPOS_ASO_EXAME_FUTURO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Data prevista <RequiredMark />
          </label>
          <input
            className="field-input"
            placeholder="DD/MM/AAAA"
            value={dataPrevista}
            disabled={saving}
            onChange={(e) => {
              setDataPrevista(e.target.value);
              setError(null);
            }}
          />
          <p className="mt-1 text-[11px] text-[#64748b]">
            Deve estar dentro da vigência do contrato.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Motivo <RequiredMark />
          </label>
          <select
            className="field-input"
            value={motivo}
            disabled={saving}
            onChange={(e) => {
              setMotivo(e.target.value as MotivoExameFuturo | "");
              setError(null);
            }}
          >
            {MOTIVOS_EXAME_FUTURO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {motivo === "Outro" ? (
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Descreva o motivo <RequiredMark />
            </label>
            <input
              className="field-input"
              value={motivoDetalhe}
              disabled={saving}
              onChange={(e) => {
                setMotivoDetalhe(e.target.value);
                setError(null);
              }}
            />
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Observações
          </label>
          <textarea
            className="field-input min-h-[72px]"
            value={observacoes}
            disabled={saving}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        {error ? (
          <p className="text-sm font-semibold text-brand-red">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
