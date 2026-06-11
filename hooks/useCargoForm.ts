"use client";

import { useCallback, useState } from "react";
import { parseValidadePeriodicoMeses } from "@/lib/cargo-periodico";
import { getEmptyCargoForm } from "@/lib/cargo-defaults";
import type { CargoComExames, CargoFormValues, CargoInsert } from "@/lib/types";

export type CargoFormField = keyof Omit<CargoFormValues, "exameIds">;

export function useCargoForm() {
  const [form, setForm] = useState<CargoFormValues>(getEmptyCargoForm);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((field: CargoFormField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleExame = useCallback((exameId: string) => {
    setForm((prev) => {
      const selected = new Set(prev.exameIds);
      if (selected.has(exameId)) {
        selected.delete(exameId);
      } else {
        selected.add(exameId);
      }
      return {
        ...prev,
        exameIds: Array.from(selected),
      };
    });
  }, []);

  const setExameIds = useCallback((exameIds: string[]) => {
    setForm((prev) => ({ ...prev, exameIds }));
  }, []);

  const reset = useCallback(() => {
    setForm(getEmptyCargoForm());
  }, []);

  const loadForm = useCallback((cargo: CargoComExames) => {
    const ativos = (cargo.cargo_exames ?? []).filter((item) => item.ativo);

    setForm({
      nome: cargo.nome,
      descricao: cargo.descricao ?? "",
      ativo: cargo.ativo ? "Ativo" : "Inativo",
      validadePeriodicoMeses: String(
        parseValidadePeriodicoMeses(cargo.validade_periodico_meses)
      ) as CargoFormValues["validadePeriodicoMeses"],
      exameIds: ativos.map((item) => item.exame_id),
    });
  }, []);

  const buildPayload = useCallback((): CargoInsert => ({
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    ativo: form.ativo === "Ativo",
    validade_periodico_meses: parseValidadePeriodicoMeses(
      form.validadePeriodicoMeses
    ),
  }), [form]);

  const validate = useCallback(
    (): boolean => form.nome.trim() !== "" && form.exameIds.length > 0,
    [form]
  );

  return {
    form,
    setField,
    toggleExame,
    setExameIds,
    reset,
    loadForm,
    buildPayload,
    validate,
    saving,
    setSaving,
  };
}
