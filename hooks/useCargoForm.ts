"use client";

import { useCallback, useState } from "react";
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
      const nextAlertas = { ...prev.exameAlertas };
      if (selected.has(exameId)) {
        selected.delete(exameId);
        delete nextAlertas[exameId];
      } else {
        selected.add(exameId);
        nextAlertas[exameId] = false;
      }
      return {
        ...prev,
        exameIds: Array.from(selected),
        exameAlertas: nextAlertas,
      };
    });
  }, []);

  const setExameAlerta = useCallback((exameId: string, gerarAlerta: boolean) => {
    setForm((prev) => ({
      ...prev,
      exameAlertas: { ...prev.exameAlertas, [exameId]: gerarAlerta },
    }));
  }, []);

  const setExameIds = useCallback((exameIds: string[]) => {
    setForm((prev) => ({ ...prev, exameIds }));
  }, []);

  const reset = useCallback(() => {
    setForm(getEmptyCargoForm());
  }, []);

  const loadForm = useCallback((cargo: CargoComExames) => {
    const ativos = (cargo.cargo_exames ?? []).filter((item) => item.ativo);
    const exameAlertas: Record<string, boolean> = {};
    ativos.forEach((item) => {
      exameAlertas[item.exame_id] = Boolean(item.gerar_alerta_6m);
    });

    setForm({
      nome: cargo.nome,
      descricao: cargo.descricao ?? "",
      ativo: cargo.ativo ? "Ativo" : "Inativo",
      exameIds: ativos.map((item) => item.exame_id),
      exameAlertas,
    });
  }, []);

  const buildPayload = useCallback((): CargoInsert => ({
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    ativo: form.ativo === "Ativo",
  }), [form]);

  const validate = useCallback(
    (): boolean => form.nome.trim() !== "" && form.exameIds.length > 0,
    [form]
  );

  return {
    form,
    setField,
    toggleExame,
    setExameAlerta,
    setExameIds,
    reset,
    loadForm,
    buildPayload,
    validate,
    saving,
    setSaving,
  };
}
