"use client";

import { useCallback, useState } from "react";
import { getEmptyExameCatalogForm } from "@/lib/exame-defaults";
import { normalizePreparo } from "@/lib/exame-preparo";
import { formatMoney, parseMoney } from "@/lib/money";import type {
  ExameCatalogFormValues,
  ExameCatalogInsert,
  ExameRecord,
} from "@/lib/types";

export type ExameCatalogFormField = keyof ExameCatalogFormValues;

export function useExameCatalogForm() {
  const [form, setForm] = useState<ExameCatalogFormValues>(getEmptyExameCatalogForm);
  const [preservedCategoria, setPreservedCategoria] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((field: ExameCatalogFormField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setForm(getEmptyExameCatalogForm());
    setPreservedCategoria(null);
  }, []);

  const loadForm = useCallback((exame: ExameRecord) => {
    setPreservedCategoria(exame.categoria ?? null);
    setForm({
      nome: exame.nome,
      valor_navarro: formatMoney(Number(exame.valor_navarro)),
      ativo: exame.ativo ? "Ativo" : "Inativo",
      preparo: exame.preparo ?? "",
    });
  }, []);

  const buildPayload = useCallback((): ExameCatalogInsert => {
    const preparo = normalizePreparo(form.preparo);
    return {
      nome: form.nome.trim(),
      categoria: preservedCategoria,
      valor_navarro: parseMoney(form.valor_navarro),
      ativo: form.ativo === "Ativo",
      preparo: preparo || null,
    };
  }, [form, preservedCategoria]);
  const validate = useCallback(
    (): boolean =>
      form.nome.trim() !== "" && form.valor_navarro.trim() !== "",
    [form]
  );

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
