"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatUppercaseInput,
  isUppercaseField,
  normalizeUppercaseField,
} from "@/lib/text-normalize";
import { getEmptyClienteForm } from "@/lib/cliente-defaults";
import { normalizeClienteProcuracao } from "@/lib/cliente-procuracao";
import {
  boolToDisponivelAgendamentoForm,
  formToDisponivelAgendamento,
} from "@/lib/cliente-disponivel-agendamento";
import { maskCNPJInput, onlyDigits } from "@/lib/cnpj";
import type { ClienteFormValues, ClienteRecord, ClienteUpdate } from "@/lib/types";

export type ClienteEditField = keyof ClienteFormValues;

export function useClienteEdit(cliente: ClienteRecord | null) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClienteFormValues>(getEmptyClienteForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cliente) {
      setEditing(false);
      setForm(getEmptyClienteForm());
      return;
    }

    setEditing(false);
    setForm({
      nome: cliente.nome,
      cnpj: maskCNPJInput(cliente.cnpj),
      procuracao: normalizeClienteProcuracao(cliente.procuracao),
      disponivel_agendamento: boolToDisponivelAgendamentoForm(
        cliente.disponivel_agendamento
      ),
    });
  }, [
    cliente?.id,
    cliente?.nome,
    cliente?.cnpj,
    cliente?.procuracao,
    cliente?.disponivel_agendamento,
  ]);

  const setField = useCallback((field: ClienteEditField, value: string) => {
    const nextValue = isUppercaseField("cliente", field)
      ? formatUppercaseInput(value)
      : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  }, []);

  const startEditing = useCallback(() => {
    if (!cliente) return;
    setForm({
      nome: cliente.nome,
      cnpj: maskCNPJInput(cliente.cnpj),
      procuracao: normalizeClienteProcuracao(cliente.procuracao),
      disponivel_agendamento: boolToDisponivelAgendamentoForm(
        cliente.disponivel_agendamento
      ),
    });
    setEditing(true);
  }, [cliente]);

  const cancelEditing = useCallback(() => {
    if (!cliente) {
      setForm(getEmptyClienteForm());
      setEditing(false);
      return;
    }

    setForm({
      nome: cliente.nome,
      cnpj: maskCNPJInput(cliente.cnpj),
      procuracao: normalizeClienteProcuracao(cliente.procuracao),
      disponivel_agendamento: boolToDisponivelAgendamentoForm(
        cliente.disponivel_agendamento
      ),
    });
    setEditing(false);
  }, [cliente]);

  const buildPayload = useCallback((): ClienteUpdate => ({
    nome: normalizeUppercaseField(form.nome),
    cnpj: maskCNPJInput(form.cnpj.trim()),
    procuracao: form.procuracao,
    disponivel_agendamento: formToDisponivelAgendamento(
      form.disponivel_agendamento
    ),
  }), [form]);

  const validate = useCallback((): boolean => {
    return form.nome.trim() !== "" && onlyDigits(form.cnpj).length >= 14;
  }, [form]);

  return {
    editing,
    form,
    setField,
    startEditing,
    cancelEditing,
    buildPayload,
    validate,
    saving,
    setSaving,
  };
}
