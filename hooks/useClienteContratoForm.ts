"use client";

import { useCallback, useState } from "react";
import { suggestDataFimAnual } from "@/lib/cliente-contrato-dates";
import { getEmptyClienteContratoForm } from "@/lib/cliente-contrato-defaults";
import { contratoToFormValues } from "@/lib/cliente-contrato-mappers";
import { emptyToNull, parseMoney } from "@/lib/money";
import type {
  ClienteContratoFormValues,
  ClienteContratoInsert,
  ClienteContratoRecord,
} from "@/lib/types";

export type ClienteContratoFormField = keyof ClienteContratoFormValues;

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalPercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

export function useClienteContratoForm() {
  const [form, setForm] = useState<ClienteContratoFormValues>(
    getEmptyClienteContratoForm
  );
  const [saving, setSaving] = useState(false);

  const setField = useCallback(
    (field: ClienteContratoFormField, value: string) => {
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "data_inicio" && value) {
          const prevSuggestion = prev.data_inicio
            ? suggestDataFimAnual(prev.data_inicio)
            : "";
          if (!prev.data_fim || prev.data_fim === prevSuggestion) {
            next.data_fim = suggestDataFimAnual(value);
          }
        }
        return next;
      });
    },
    []
  );

  const reset = useCallback(() => {
    setForm(getEmptyClienteContratoForm());
  }, []);

  const loadForm = useCallback((contrato: ClienteContratoRecord) => {
    setForm(contratoToFormValues(contrato));
  }, []);

  const buildPayload = useCallback(
    (clienteId: string): ClienteContratoInsert => ({
      cliente_id: clienteId,
      data_inicio: form.data_inicio,
      data_fim: emptyToNull(form.data_fim),
      quantidade_colaboradores: parseOptionalInt(form.quantidade_colaboradores),
      valor_contrato: form.valor_contrato.trim()
        ? parseMoney(form.valor_contrato)
        : null,
      condicao_pagamento: emptyToNull(form.condicao_pagamento),
      tipo_contrato: form.tipo_contrato,
      reajuste_percentual: parseOptionalPercent(form.reajuste_percentual),
      observacoes: emptyToNull(form.observacoes),
      status: form.status,
      liberado_para_agendamento: true,
    }),
    [form]
  );

  const validate = useCallback((): boolean => {
    return form.data_inicio.trim() !== "";
  }, [form.data_inicio]);

  return {
    form,
    setField,
    reset,
    loadForm,
    buildPayload,
    validate,
    saving,
    setSaving,
  };
}
