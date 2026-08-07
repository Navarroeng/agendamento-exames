"use client";

import { useEffect, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { formatCPF } from "@/lib/cpf";
import { formatDateBR } from "@/lib/format";
import type { PeriodicoFuturoRow } from "@/lib/types";

interface PeriodicoEditarProximaDataModalProps {
  open: boolean;
  record: PeriodicoFuturoRow | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (id: string, novaDataIso: string) => Promise<void> | void;
}

export function PeriodicoEditarProximaDataModal({
  open,
  record,
  saving = false,
  onClose,
  onSave,
}: PeriodicoEditarProximaDataModalProps) {
  const [novaData, setNovaData] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !record) return;
    setNovaData(record.proxima_data?.slice(0, 10) ?? "");
    setError(null);
  }, [open, record]);

  async function handleSave() {
    if (!record) return;
    const trimmed = novaData.trim();
    if (!trimmed) {
      setError("Informe a nova próxima data.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      setError("Data inválida.");
      return;
    }
    setError(null);
    await onSave(record.id, trimmed);
  }

  if (!record) return null;

  const dataAtual = record.proxima_data?.slice(0, 10) ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar próxima data"
      subtitle="Altere a data prevista do acompanhamento periódico."
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
            {saving ? "Salvando..." : "Salvar nova data"}
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
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              CPF
            </dt>
            <dd className="mt-0.5 tabular-nums text-navy">
              {formatCPF(record.colaborador_cpf)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Empresa
            </dt>
            <dd className="mt-0.5 font-medium text-navy">{record.cliente_nome}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Data atual
            </dt>
            <dd className="mt-0.5 tabular-nums font-bold text-navy">
              {dataAtual ? formatDateBR(dataAtual) : "—"}
            </dd>
          </div>
        </dl>

        <Field
          label={
            <>
              Nova próxima data <RequiredMark />
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

        {error ? <p className="text-xs font-medium text-brand-red">{error}</p> : null}
      </div>
    </Modal>
  );
}
