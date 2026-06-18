"use client";

import { useCallback, useState } from "react";
import { maskCPFInput } from "@/lib/cpf";
import { getEmptyForm } from "@/lib/form-defaults";
import {
  parseDateBRToIso,
  parseHorarioToStorage,
} from "@/lib/agendamento-datetime";
import { maskEsocialRecibo } from "@/lib/esocial-recibo";
import { emptyToNull, isSim } from "@/lib/money";
import type { CargoAgendamentoFields } from "@/lib/agendamento-cargo";
import type {
  AgendamentoFormValues,
  AgendamentoInsert,
  AgendamentoStatus,
} from "@/lib/types";

export type FormField = keyof AgendamentoFormValues;

export function useAgendamentoForm() {
  const [form, setForm] = useState<AgendamentoFormValues>(getEmptyForm);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((field: FormField, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "aso_enviado_clinica" && value !== "Sim") {
        next.data_aso_enviado_clinica = "";
      }
      if (field === "aso_assinado" && value !== "Sim") {
        next.data_aso_assinado = "";
      }
      if (field === "aso_enviado_cliente" && value !== "Sim") {
        next.data_aso_enviado_cliente = "";
      }
      if (field === "envio_esocial" && value !== "Sim") {
        next.data_envio_esocial = "";
        next.esocial_recibo = "";
      }
      if (field === "esocial_recibo") {
        next.esocial_recibo = maskEsocialRecibo(value);
      }
      if (field === "colaborador_cpf") {
        next.colaborador_cpf = maskCPFInput(value);
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setForm(getEmptyForm());
  }, []);

  const loadForm = useCallback((values: AgendamentoFormValues) => {
    setForm(values);
  }, []);

  const buildPayload = useCallback(
    (
      status: AgendamentoStatus,
      cargo?: CargoAgendamentoFields
    ): AgendamentoInsert => ({
      data_agendamento:
        parseDateBRToIso(form.data_agendamento) ?? form.data_agendamento,
      horario: emptyToNull(
        parseHorarioToStorage(form.horario) ?? form.horario
      ),
      cliente_nome: form.cliente_nome,
      colaborador: form.colaborador,
      colaborador_cpf: maskCPFInput(form.colaborador_cpf.trim()),
      aso: form.aso,
      clinica_nome: form.clinica_nome,
      responsavel: form.responsavel,
      observacoes: emptyToNull(form.observacoes),
      aso_enviado_clinica: isSim(form.aso_enviado_clinica),
      data_aso_enviado_clinica: isSim(form.aso_enviado_clinica)
        ? emptyToNull(form.data_aso_enviado_clinica)
        : null,
      aso_assinado: isSim(form.aso_assinado),
      data_aso_assinado: isSim(form.aso_assinado)
        ? emptyToNull(form.data_aso_assinado)
        : null,
      aso_enviado_cliente: isSim(form.aso_enviado_cliente),
      data_aso_enviado_cliente: isSim(form.aso_enviado_cliente)
        ? emptyToNull(form.data_aso_enviado_cliente)
        : null,
      numero_matricula: emptyToNull(form.numero_matricula),
      envio_esocial: isSim(form.envio_esocial),
      data_envio_esocial: isSim(form.envio_esocial)
        ? emptyToNull(form.data_envio_esocial)
        : null,
      esocial_recibo: isSim(form.envio_esocial)
        ? emptyToNull(maskEsocialRecibo(form.esocial_recibo))
        : null,
      cargo_id: cargo?.cargo_id ?? null,
      cargo_nome: cargo?.cargo_nome ?? null,
      status,
    }),
    [form]
  );

  return {
    form,
    setField,
    reset,
    loadForm,
    buildPayload,
    saving,
    setSaving,
  };
}
