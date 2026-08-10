"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, RequiredMark } from "@/components/ui/Field";
import { maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import type { RiscosParticipanteInput } from "@/lib/riscos-campanha-participantes";

type FormState = RiscosParticipanteInput & { unidade: string };

const EMPTY_FORM: FormState = {
  nomeCompleto: "",
  cpf: "",
  cargo: "",
  setor: "",
  email: "",
  unidade: "",
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [cpfMasked, setCpfMasked] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        nomeCompleto: initial.nomeCompleto,
        cpf: initial.cpf,
        cargo: initial.cargo ?? "",
        setor: initial.setor ?? "",
        email: initial.email ?? "",
        unidade: "",
      });
      setCpfMasked(maskCPFInput(initial.cpf));
    } else {
      setForm(EMPTY_FORM);
      setCpfMasked("");
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
      // Unidade é apenas visual nesta etapa (sem coluna no banco).
      await onSave({
        nomeCompleto: form.nomeCompleto,
        cpf: form.cpf,
        cargo: form.cargo,
        setor: form.setor,
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
      title={mode === "edit" ? "Editar colaborador" : "Adicionar colaborador"}
      subtitle="Cadastro do participante autorizado a responder a pesquisa"
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
                : "Salvar colaborador"}
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
          <Field label="E-mail (opcional)">
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
          <Field label="Cargo">
            <input
              className="field-input w-full"
              value={form.cargo ?? ""}
              disabled={saving}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, cargo: e.target.value }))
              }
            />
          </Field>
          <Field label="Setor">
            <input
              className="field-input w-full"
              value={form.setor ?? ""}
              disabled={saving}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, setor: e.target.value }))
              }
            />
          </Field>
          <Field label="Unidade (opcional)" className="sm:col-span-2">
            <input
              className="field-input w-full"
              value={form.unidade}
              disabled={saving}
              placeholder="Será persistida em etapa futura"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, unidade: e.target.value }))
              }
            />
          </Field>
        </div>

        <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Dados de acesso
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            Informações preparatórias — autenticação ainda não está ativa.
          </p>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Login
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy">
                CPF · {loginCpf}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Senha provisória
              </dt>
              <dd className="mt-0.5 font-semibold text-navy">
                Será gerada automaticamente
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
