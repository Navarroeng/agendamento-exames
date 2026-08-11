"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, RequiredMark } from "@/components/ui/Field";
import { maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import {
  formatDataNascimentoBr,
  maskDataNascimentoInput,
} from "@/lib/date-br";
import type { RiscosParticipanteInput } from "@/lib/riscos-campanha-participantes";

const EMPTY_FORM: RiscosParticipanteInput = {
  nomeCompleto: "",
  cpf: "",
  dataNascimento: "",
  email: "",
};

interface RiscosParticipanteFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  saving?: boolean;
  initial?: RiscosParticipanteInput | null;
  onClose: () => void;
  onSave: (input: RiscosParticipanteInput) => Promise<void>;
}

export function RiscosParticipanteFormModal({
  open,
  mode,
  saving = false,
  initial = null,
  onClose,
  onSave,
}: RiscosParticipanteFormModalProps) {
  const [form, setForm] = useState<RiscosParticipanteInput>(EMPTY_FORM);
  const [cpfMasked, setCpfMasked] = useState("");
  const [nascMasked, setNascMasked] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const nasc =
        formatDataNascimentoBr(initial.dataNascimento) ||
        maskDataNascimentoInput(initial.dataNascimento);
      setForm({
        nomeCompleto: initial.nomeCompleto,
        cpf: initial.cpf,
        dataNascimento: nasc,
        email: initial.email ?? "",
      });
      setCpfMasked(maskCPFInput(initial.cpf));
      setNascMasked(nasc);
    } else {
      setForm(EMPTY_FORM);
      setCpfMasked("");
      setNascMasked("");
    }
    setError(null);
  }, [open, initial]);

  const loginCpf =
    normalizeCpfDigits(cpfMasked).length === 11
      ? maskCPFInput(cpfMasked)
      : "Informe o CPF";

  async function handleSalvar() {
    setError(null);
    try {
      await onSave({
        nomeCompleto: form.nomeCompleto,
        cpf: form.cpf,
        dataNascimento: nascMasked,
        email: form.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === "edit"
          ? "Editar participante da pesquisa"
          : "Cadastrar participante da pesquisa"
      }
      subtitle="Cadastre o participante que poderá responder ao Questionário de Riscos Psicossociais."
      size="wide"
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary justify-center sm:w-auto"
            disabled={saving}
            onClick={() => void handleSalvar()}
          >
            {saving
              ? "Salvando..."
              : mode === "edit"
                ? "Salvar alterações"
                : "Salvar participante"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={
              <>
                Nome completo <RequiredMark />
              </>
            }
            className="sm:col-span-2"
          >
            <input
              className="field-input w-full"
              value={form.nomeCompleto}
              disabled={saving}
              autoFocus
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  nomeCompleto: e.target.value,
                }))
              }
            />
          </Field>
          <Field
            label={
              <>
                CPF <RequiredMark />
              </>
            }
          >
            <input
              className="field-input w-full"
              inputMode="numeric"
              value={cpfMasked}
              disabled={saving}
              onChange={(e) => {
                const masked = maskCPFInput(e.target.value);
                setCpfMasked(masked);
                setForm((prev) => ({ ...prev, cpf: masked }));
              }}
            />
          </Field>
          <Field
            label={
              <>
                Data de nascimento <RequiredMark />
              </>
            }
          >
            <input
              className="field-input w-full"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              autoComplete="bday"
              value={nascMasked}
              disabled={saving}
              onChange={(e) => {
                const masked = maskDataNascimentoInput(e.target.value);
                setNascMasked(masked);
                setForm((prev) => ({ ...prev, dataNascimento: masked }));
              }}
            />
          </Field>
          <Field label="E-mail (opcional)" className="sm:col-span-2">
            <input
              type="email"
              className="field-input w-full"
              value={form.email ?? ""}
              disabled={saving}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </Field>
        </div>

        <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Acesso ao portal
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            O participante acessa pelo link/QR da campanha informando CPF e
            data de nascimento. Esses dados validam a autorização e não entram
            nos resultados da pesquisa.
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                CPF
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy">
                {loginCpf}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Data de nascimento
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy">
                {nascMasked || "Informe a data"}
              </dd>
            </div>
          </dl>
        </div>

        {error ? (
          <p className="text-xs font-medium text-brand-red">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
