"use client";

import { useEffect, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  TIPOS_ASO_EXAME_FUTURO,
  validarEdicaoProgramacaoFutura,
} from "@/lib/contrato-programacao-futura";
import { formatCPF } from "@/lib/cpf";

export type EditarProgramacaoFuturaRecord = {
  id: string;
  colaborador: string;
  colaborador_cpf?: string | null;
  cliente_nome?: string | null;
  proxima_data: string;
  tipo_aso?: string | null;
  exame_nome?: string | null;
  tipo_exame?: string | null;
};

export type EditarProgramacaoFuturaSave = {
  dataPrevistaIso: string;
  tipoAso: string;
};

interface EditarProgramacaoFuturaModalProps {
  open: boolean;
  record: EditarProgramacaoFuturaRecord | null;
  saving?: boolean;
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
  onClose: () => void;
  onSave: (id: string, data: EditarProgramacaoFuturaSave) => Promise<void> | void;
}

function tipoAsoInicial(record: EditarProgramacaoFuturaRecord): string {
  const atual = (record.tipo_aso || record.exame_nome || record.tipo_exame || "").trim();
  if ((TIPOS_ASO_EXAME_FUTURO as readonly string[]).includes(atual)) return atual;
  return TIPOS_ASO_EXAME_FUTURO[0];
}

export function EditarProgramacaoFuturaModal({
  open,
  record,
  saving = false,
  vigenciaInicio,
  vigenciaFim,
  onClose,
  onSave,
}: EditarProgramacaoFuturaModalProps) {
  const [novaData, setNovaData] = useState("");
  const [tipoAso, setTipoAso] = useState<string>(TIPOS_ASO_EXAME_FUTURO[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !record) return;
    setNovaData(record.proxima_data?.slice(0, 10) ?? "");
    setTipoAso(tipoAsoInicial(record));
    setError(null);
  }, [open, record]);

  async function handleSave() {
    if (!record) return;
    const validado = validarEdicaoProgramacaoFutura({
      tipoAso,
      dataPrevistaIso: novaData,
      dataInicioContrato: vigenciaInicio,
      dataFimContrato: vigenciaFim,
    });
    if (!validado.ok) {
      setError(validado.message);
      return;
    }
    setError(null);
    await onSave(record.id, {
      dataPrevistaIso: validado.patch.proxima_data,
      tipoAso: validado.patch.tipo_aso,
    });
  }

  if (!record) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar programação futura"
      subtitle="Altere a data programada e o tipo de ASO desta programação."
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
            {saving ? "Salvando..." : "Salvar alterações"}
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
            <dd className="mt-0.5 font-semibold text-navy">{record.colaborador}</dd>
          </div>
          {record.colaborador_cpf ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                CPF
              </dt>
              <dd className="mt-0.5 tabular-nums text-navy">
                {formatCPF(record.colaborador_cpf)}
              </dd>
            </div>
          ) : null}
          {record.cliente_nome ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Empresa
              </dt>
              <dd className="mt-0.5 font-medium text-navy">{record.cliente_nome}</dd>
            </div>
          ) : null}
        </dl>

        <Field
          label={
            <>
              Data programada <RequiredMark />
            </>
          }
        >
          <input
            type="date"
            className="field-input w-full"
            value={novaData}
            disabled={saving}
            onChange={(e) => {
              setNovaData(e.target.value);
              if (error) setError(null);
            }}
          />
        </Field>

        <Field
          label={
            <>
              Tipo de ASO <RequiredMark />
            </>
          }
        >
          <select
            className="field-input w-full"
            value={tipoAso}
            disabled={saving}
            onChange={(e) => {
              setTipoAso(e.target.value);
              if (error) setError(null);
            }}
          >
            {TIPOS_ASO_EXAME_FUTURO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </Field>

        {error ? <p className="text-xs font-medium text-brand-red">{error}</p> : null}
      </div>
    </Modal>
  );
}
