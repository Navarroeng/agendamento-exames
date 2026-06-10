"use client";

import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { CLIENTE_CONTRATO_STATUS_OPTIONS } from "@/lib/cliente-contrato-constants";
import type { ClienteContratoFormField } from "@/hooks/useClienteContratoForm";
import { maskMoneyInput } from "@/lib/money";
import type { ClienteContratoFormValues } from "@/lib/types";

interface ClienteContratoFormModalProps {
  open: boolean;
  saving: boolean;
  editing: boolean;
  form: ClienteContratoFormValues;
  onChange: (field: ClienteContratoFormField, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function ClienteContratoFormModal({
  open,
  saving,
  editing,
  form,
  onChange,
  onClose,
  onSave,
}: ClienteContratoFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar contrato" : "Novo contrato"}
      wide
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-muted"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? "Salvando..." : "Salvar contrato"}
          </button>
        </div>
      }
    >
      <div className="form-grid grid grid-cols-1 gap-x-5 gap-y-[18px] md:grid-cols-2">
        <Field label={<>Data início <RequiredMark /></>}>
          <input
            className="field-input"
            type="date"
            value={form.data_inicio}
            disabled={saving}
            onChange={(e) => onChange("data_inicio", e.target.value)}
          />
        </Field>
        <Field label="Data fim">
          <input
            className="field-input"
            type="date"
            value={form.data_fim}
            disabled={saving}
            onChange={(e) => onChange("data_fim", e.target.value)}
          />
          <p className="mt-1.5 text-xs text-[#64748b]">
            Sugerida automaticamente como 12 meses após a data de início.
          </p>
        </Field>
        <Field label="Quantidade colaboradores">
          <input
            className="field-input"
            type="number"
            min={0}
            placeholder="Ex.: 120"
            value={form.quantidade_colaboradores}
            disabled={saving}
            onChange={(e) =>
              onChange("quantidade_colaboradores", e.target.value)
            }
          />
        </Field>
        <Field label="Valor contrato">
          <input
            className="field-input"
            type="text"
            inputMode="numeric"
            placeholder="R$ 0,00"
            value={form.valor_contrato}
            disabled={saving}
            onChange={(e) =>
              onChange("valor_contrato", maskMoneyInput(e.target.value))
            }
          />
        </Field>
        <Field label="Condição pagamento">
          <input
            className="field-input"
            placeholder="Ex.: 30 dias, boleto mensal"
            value={form.condicao_pagamento}
            disabled={saving}
            onChange={(e) => onChange("condicao_pagamento", e.target.value)}
          />
        </Field>
        <Field label="Reajuste %">
          <input
            className="field-input"
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 5,50"
            value={form.reajuste_percentual}
            disabled={saving}
            onChange={(e) => onChange("reajuste_percentual", e.target.value)}
          />
        </Field>
        <Field label="Status">
          <select
            className="field-input"
            value={form.status}
            disabled={saving}
            onChange={(e) => onChange("status", e.target.value)}
          >
            {CLIENTE_CONTRATO_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Observações" className="md:col-span-2">
          <textarea
            className="field-input !h-[92px] resize-none py-3"
            placeholder="Condições comerciais, reajustes, renovações..."
            value={form.observacoes}
            disabled={saving}
            onChange={(e) => onChange("observacoes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
