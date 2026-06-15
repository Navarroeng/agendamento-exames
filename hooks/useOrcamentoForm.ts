"use client";

import { useCallback, useMemo, useState } from "react";
import {
  calcItemTotal,
  calcSubtotalItens,
  calcValorTotalOrcamento,
} from "@/lib/orcamento-calculo";
import {
  createEmptyOrcamentoItem,
  getEmptyOrcamentoForm,
} from "@/lib/orcamento-defaults";
import { emptyToNull, maskMoneyInput, parseMoney } from "@/lib/money";
import type {
  OrcamentoComItens,
  OrcamentoFormValues,
  OrcamentoInsertPayload,
  OrcamentoItemFormItem,
} from "@/lib/orcamento-types";

export type OrcamentoFormField = keyof Omit<OrcamentoFormValues, "itens">;

export function useOrcamentoForm() {
  const [form, setForm] = useState<OrcamentoFormValues>(getEmptyOrcamentoForm);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((field: OrcamentoFormField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      itens: [...prev.itens, createEmptyOrcamentoItem()],
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setForm((prev) => {
      if (prev.itens.length <= 1) return prev;
      return {
        ...prev,
        itens: prev.itens.filter((item) => item.id !== id),
      };
    });
  }, []);

  const updateItem = useCallback(
    (
      id: string,
      field: keyof OrcamentoItemFormItem,
      value: string,
      servicoNome?: string
    ) => {
      setForm((prev) => ({
        ...prev,
        itens: prev.itens.map((item) => {
          if (item.id !== id) return item;

          const next: OrcamentoItemFormItem = {
            ...item,
            [field]:
              field === "valor_unitario" ? maskMoneyInput(value) : value,
          };

          if (field === "servico_id" && servicoNome !== undefined) {
            next.servico_nome = servicoNome;
          }

          if (
            field === "quantidade" ||
            field === "valor_unitario" ||
            field === "servico_id"
          ) {
            const total = calcItemTotal(next.quantidade, next.valor_unitario);
            next.valor_total = total > 0 ? String(total) : "";
          }

          return next;
        }),
      }));
    },
    []
  );

  const applyServicoSugerido = useCallback(
    (itemId: string, valorSugerido: number | null) => {
      if (valorSugerido == null || valorSugerido <= 0) return;
      const masked = maskMoneyInput(String(Math.round(valorSugerido * 100)));
      updateItem(itemId, "valor_unitario", masked);
    },
    [updateItem]
  );

  const reset = useCallback(() => {
    setForm(getEmptyOrcamentoForm());
  }, []);

  const loadForm = useCallback((orcamento: OrcamentoComItens) => {
    setForm({
      numero: orcamento.numero,
      data_proposta: orcamento.data_proposta.split("T")[0],
      cliente_id: orcamento.cliente_id ?? "",
      cliente_nome: orcamento.cliente_nome,
      contato: orcamento.contato ?? "",
      email: orcamento.email ?? "",
      telefone: orcamento.telefone ?? "",
      responsavel: orcamento.responsavel,
      observacoes: orcamento.observacoes ?? "",
      desconto_percentual: String(Number(orcamento.desconto_percentual)),
      forma_pagamento: orcamento.forma_pagamento ?? "",
      validade_proposta: orcamento.validade_proposta?.split("T")[0] ?? "",
      status: orcamento.status,
      itens:
        (orcamento.orcamento_itens ?? []).length > 0
          ? (orcamento.orcamento_itens ?? []).map((item) => ({
              id: item.id,
              servico_id: item.servico_id ?? "",
              servico_nome: item.servico_nome,
              quantidade: String(item.quantidade),
              valor_unitario:
                Number(item.valor_unitario) > 0
                  ? maskMoneyInput(
                      String(Math.round(Number(item.valor_unitario) * 100))
                    )
                  : "",
              valor_total: String(item.valor_total),
            }))
          : [createEmptyOrcamentoItem()],
    });
  }, []);

  const totals = useMemo(() => {
    const subtotal = calcSubtotalItens(form.itens);
    const valorTotal = calcValorTotalOrcamento(
      subtotal,
      form.desconto_percentual
    );
    return { subtotal, valorTotal };
  }, [form.desconto_percentual, form.itens]);

  const buildPayload = useCallback((): OrcamentoInsertPayload => {
    const itens = form.itens
      .filter((item) => item.servico_nome.trim() !== "")
      .map((item, index) => {
        const quantidade = Number(String(item.quantidade).replace(",", ".")) || 1;
        const valorUnitario = parseMoney(item.valor_unitario);
        const valorTotal =
          item.valor_total.trim() !== ""
            ? parseMoney(item.valor_total)
            : calcItemTotal(item.quantidade, item.valor_unitario);

        return {
          servico_id: item.servico_id.trim() || null,
          servico_nome: item.servico_nome.trim(),
          quantidade,
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          ordem: index,
        };
      });

    const validadeIso = form.validade_proposta.trim() || null;

    return {
      numero: form.numero.trim(),
      data_proposta: form.data_proposta,
      cliente_id: form.cliente_id.trim() || null,
      cliente_nome: form.cliente_nome.trim(),
      contato: emptyToNull(form.contato),
      email: emptyToNull(form.email),
      telefone: emptyToNull(form.telefone),
      responsavel: form.responsavel.trim(),
      observacoes: emptyToNull(form.observacoes),
      desconto_percentual:
        Number(String(form.desconto_percentual).replace(",", ".")) || 0,
      forma_pagamento: emptyToNull(form.forma_pagamento),
      validade_proposta: validadeIso,
      subtotal: totals.subtotal,
      valor_total: totals.valorTotal,
      status: form.status,
      itens,
    };
  }, [form, totals.subtotal, totals.valorTotal]);

  const getValidationError = useCallback((): string | null => {
    if (form.cliente_nome.trim() === "") {
      return "Informe o cliente.";
    }
    if (form.responsavel.trim() === "") {
      return "Informe o responsável Navarro.";
    }
    if (!form.data_proposta.trim()) {
      return "Informe a data da proposta.";
    }

    const itensValidos = form.itens.filter(
      (item) => item.servico_nome.trim() !== ""
    );
    if (itensValidos.length === 0) {
      return "Adicione ao menos um serviço.";
    }

    for (const item of itensValidos) {
      const qtd = Number(String(item.quantidade).replace(",", "."));
      if (!qtd || qtd <= 0) {
        return "Informe quantidade válida para todos os serviços.";
      }
    }

    return null;
  }, [form]);

  const validate = useCallback(
    (): boolean => getValidationError() === null,
    [getValidationError]
  );

  return {
    form,
    totals,
    setField,
    addItem,
    removeItem,
    updateItem,
    applyServicoSugerido,
    reset,
    loadForm,
    buildPayload,
    getValidationError,
    validate,
    saving,
    setSaving,
  };
}
