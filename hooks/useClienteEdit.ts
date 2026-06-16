"use client";

import { useCallback, useEffect, useState } from "react";
import { getEmptyClienteForm } from "@/lib/cliente-defaults";
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
    });
  }, [cliente?.id, cliente?.nome, cliente?.cnpj]);

  const setField = useCallback((field: ClienteEditField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const startEditing = useCallback(() => {
    if (!cliente) return;
    setForm({
      nome: cliente.nome,
      cnpj: maskCNPJInput(cliente.cnpj),
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
    });
    setEditing(false);
  }, [cliente]);

  const buildPayload = useCallback((): ClienteUpdate => ({
    nome: form.nome.trim(),
    cnpj: maskCNPJInput(form.cnpj.trim()),
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
