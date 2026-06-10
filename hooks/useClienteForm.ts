"use client";

import { useCallback, useState } from "react";
import { getEmptyClienteForm } from "@/lib/cliente-defaults";
import { maskCNPJInput, onlyDigits } from "@/lib/cnpj";
import type { ClienteFormValues, ClienteInsert } from "@/lib/types";

export type ClienteFormField = keyof ClienteFormValues;

export function useClienteForm() {
  const [form, setForm] = useState<ClienteFormValues>(getEmptyClienteForm);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((field: ClienteFormField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setForm(getEmptyClienteForm());
  }, []);

  const buildPayload = useCallback((): ClienteInsert => ({
    nome: form.nome.trim(),
    cnpj: maskCNPJInput(form.cnpj.trim()),
  }), [form]);

  const validate = useCallback((): boolean => {
    return (
      form.nome.trim() !== "" && onlyDigits(form.cnpj).length >= 14
    );
  }, [form]);

  return {
    form,
    setField,
    reset,
    buildPayload,
    validate,
    saving,
    setSaving,
  };
}
