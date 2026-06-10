"use client";

import { useCallback, useState } from "react";
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
    setForm((prev) => ({ ...prev, [field]: value }));
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
