"use client";

import { useEffect, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { maskCPFInput } from "@/lib/cpf";
import { validarCpfRegularizacaoPeriodico } from "@/lib/periodico-cpf-regularizacao";
import type { PeriodicoFuturoGrupo } from "@/lib/periodico-agrupamento";

interface PeriodicoAdicionarCpfModalProps {
  open: boolean;
  grupo: PeriodicoFuturoGrupo | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (grupo: PeriodicoFuturoGrupo, cpf: string) => Promise<void> | void;
}

export function PeriodicoAdicionarCpfModal({
  open,
  grupo,
  saving = false,
  error = null,
  onClose,
  onSave,
}: PeriodicoAdicionarCpfModalProps) {
  const [cpf, setCpf] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !grupo) return;
    setCpf("");
    setLocalError(null);
  }, [open, grupo]);

  async function handleSave() {
    if (!grupo) return;
    const validado = validarCpfRegularizacaoPeriodico(cpf);
    if (!validado.ok) {
      setLocalError(validado.message);
      return;
    }
    setLocalError(null);
    await onSave(grupo, validado.masked);
  }

  if (!grupo) return null;

  const shownError = localError || error;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar CPF"
      subtitle="Regularize o colaborador para identificá-lo nos próximos agendamentos."
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-xs font-bold text-navy disabled:opacity-40"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-md space-y-4">
        <dl className="grid gap-3 rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-4 text-sm">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Colaborador
            </dt>
            <dd className="mt-0.5 font-semibold text-navy">{grupo.colaborador}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Empresa
            </dt>
            <dd className="mt-0.5 font-medium text-navy">{grupo.cliente_nome}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Cargo
            </dt>
            <dd className="mt-0.5 text-navy">{grupo.cargo_nome ?? "—"}</dd>
          </div>
        </dl>

        <Field
          label={
            <>
              CPF <RequiredMark />
            </>
          }
        >
          <input
            className="field-input w-full"
            placeholder="000.000.000-00"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            value={cpf}
            disabled={saving}
            onChange={(e) => {
              setCpf(maskCPFInput(e.target.value));
              if (localError) setLocalError(null);
            }}
          />
        </Field>

        {shownError ? (
          <p className="whitespace-pre-line text-xs font-medium text-brand-red">
            {shownError}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
