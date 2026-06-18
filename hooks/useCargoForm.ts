"use client";

import { useCallback, useState } from "react";
import {
  formatUppercaseInput,
  isUppercaseField,
  normalizeUppercaseField,
} from "@/lib/text-normalize";
import {
  isValidadePeriodicoSelecionada,
  parseValidadePeriodicoMeses,
} from "@/lib/cargo-periodico";
import { getEmptyCargoForm } from "@/lib/cargo-defaults";
import type { CargoComExames, CargoFormValues, CargoInsert } from "@/lib/types";

export type CargoFormField = keyof Omit<CargoFormValues, "exameIds">;

export function useCargoForm() {
  const [form, setForm] = useState<CargoFormValues>(getEmptyCargoForm);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((field: CargoFormField, value: string) => {
    const nextValue = isUppercaseField("cargo", field)
      ? formatUppercaseInput(value)
      : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
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

  const buildPayload = useCallback((): CargoInsert => {
    if (!isValidadePeriodicoSelecionada(form.validadePeriodicoMeses)) {
      throw new Error("Selecione a validade dos exames periódicos.");
    }

    return {
      nome: normalizeUppercaseField(form.nome),
      descricao: form.descricao.trim() || null,
      ativo: form.ativo === "Ativo",
      validade_periodico_meses: parseValidadePeriodicoMeses(
        form.validadePeriodicoMeses
      ),
    };
  }, [form]);

  const getValidationError = useCallback((): string | null => {
    if (form.nome.trim() === "") {
      return "Informe o nome do cargo.";
    }
    if (!isValidadePeriodicoSelecionada(form.validadePeriodicoMeses)) {
      return "Selecione a validade dos exames periódicos.";
    }
    if (form.exameIds.length === 0) {
      return "Selecione ao menos um exame obrigatório.";
    }
    return null;
  }, [form]);

  const validate = useCallback(
    (): boolean => getValidationError() === null,
    [getValidationError]
  );

  return {
    form,
    setField,
    toggleExame,
    setExameIds,
    reset,
    loadForm,
    buildPayload,
    getValidationError,
    validate,
    saving,
    setSaving,
  };
}
