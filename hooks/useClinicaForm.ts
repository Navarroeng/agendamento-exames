"use client";

import { useCallback, useState } from "react";
import {
  formatUppercaseInput,
  isUppercaseField,
  normalizeUppercaseField,
} from "@/lib/text-normalize";
import { getEmptyClinicaForm } from "@/lib/clinica-defaults";
import {
  clinicaToFormValues,
  formValuesToClinicaInsert,
} from "@/lib/clinica-mappers";
import type { ClinicaFormValues, ClinicaInsert, ClinicaRecord } from "@/lib/types";

export type ClinicaFormField = keyof ClinicaFormValues;

export function useClinicaForm() {
  const [form, setForm] = useState<ClinicaFormValues>(getEmptyClinicaForm);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((field: ClinicaFormField, value: string) => {
    const nextValue = isUppercaseField("clinica", field)
      ? formatUppercaseInput(value)
      : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  }, []);

  const reset = useCallback(() => {
    setForm(getEmptyClinicaForm());
  }, []);

  const loadForm = useCallback((clinica: ClinicaRecord) => {
    setForm(clinicaToFormValues(clinica));
  }, []);

  const buildPayload = useCallback((): ClinicaInsert => {
    return formValuesToClinicaInsert(form);
  }, [form]);

  const validate = useCallback((): boolean => {
    return (
      form.razao_social.trim() !== "" &&
      form.nome_fantasia.trim() !== "" &&
      form.cnpj.trim() !== "" &&
      form.responsavel.trim() !== "" &&
      form.telefone.trim() !== "" &&
      form.email.trim() !== "" &&
      form.cidade.trim() !== "" &&
      form.estado.trim() !== ""
    );
  }, [form]);

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
