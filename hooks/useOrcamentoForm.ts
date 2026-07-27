"use client";

import { useCallback, useMemo, useState } from "react";
import {
  formatUppercaseInput,
  isUppercaseField,
  normalizeUppercaseField,
} from "@/lib/text-normalize";
import {
  calcSubtotalItens,
  calcValorTotalOrcamento,
  formatQuantidadeColaboradoresInput,
  parseQuantidadeColaboradores,
  resolveItemValorParaFormulario,
  resolveQuantidadeColaboradoresOrcamento,
} from "@/lib/orcamento-calculo";
import { calcCondicoesPagamentoProposta } from "@/lib/orcamento-pagamento";
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

function syncQuantidadeColaboradores(
  itens: OrcamentoItemFormItem[],
  quantidade: string
): OrcamentoItemFormItem[] {
  return itens.map((item) => ({ ...item, quantidade }));
}

export function useOrcamentoForm() {
  const [form, setForm] = useState<OrcamentoFormValues>(getEmptyOrcamentoForm);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((field: OrcamentoFormField, value: string) => {
    const nextValue = isUppercaseField("orcamento", field)
      ? formatUppercaseInput(value)
      : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  }, []);

  const addItem = useCallback(() => {
    setForm((prev) => {
      const quantidadeReferencia =
        prev.itens.find((item) => item.quantidade.trim())?.quantidade ?? "1";
      return {
        ...prev,
        itens: [
          ...prev.itens,
          { ...createEmptyOrcamentoItem(), quantidade: quantidadeReferencia },
        ],
      };
    });
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
      setForm((prev) => {
        if (field === "quantidade") {
          const quantidade = formatQuantidadeColaboradoresInput(value);
          return {
            ...prev,
            itens: syncQuantidadeColaboradores(prev.itens, quantidade),
          };
        }

        return {
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

            if (field === "valor_unitario") {
              next.valor_total = next.valor_unitario;
            }

            return next;
          }),
        };
      });
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
    const itensDb = [...(orcamento.orcamento_itens ?? [])].sort(
      (a, b) => a.ordem - b.ordem
    );
    const quantidadeReferencia = String(
      resolveQuantidadeColaboradoresOrcamento({ orcamento_itens: itensDb }) || 1
    );

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
        itensDb.length > 0
          ? itensDb.map((item) => {
              const valor = resolveItemValorParaFormulario(item);
              return {
                id: item.id,
                servico_id: item.servico_id ?? "",
                servico_nome: item.servico_nome,
                quantidade: quantidadeReferencia,
                valor_unitario:
                  valor > 0
                    ? maskMoneyInput(String(Math.round(valor * 100)))
                    : "",
                valor_total: valor > 0 ? String(valor) : "",
              };
            })
          : [createEmptyOrcamentoItem()],
    });
  }, []);

  const totals = useMemo(() => {
    const subtotal = calcSubtotalItens(form.itens);
    const valorTotal = calcValorTotalOrcamento(
      subtotal,
      form.desconto_percentual
    );
    const condicoesPagamento = calcCondicoesPagamentoProposta(valorTotal);
    return { subtotal, valorTotal, condicoesPagamento };
  }, [form.desconto_percentual, form.itens]);

  const buildPayload = useCallback((): OrcamentoInsertPayload => {
    const itens = form.itens
      .filter((item) => item.servico_nome.trim() !== "")
      .map((item, index) => {
        const quantidade = parseQuantidadeColaboradores(item.quantidade) || 1;
        const valor = parseMoney(item.valor_unitario);

        return {
          servico_id: item.servico_id.trim() || null,
          servico_nome: item.servico_nome.trim(),
          quantidade,
          valor_unitario: valor,
          valor_total: valor,
          ordem: index,
        };
      });

    const validadeIso = form.validade_proposta.trim() || null;

    return {
      numero: form.numero.trim(),
      data_proposta: form.data_proposta,
      cliente_id: form.cliente_id.trim() || null,
      cliente_nome: form.cliente_nome.trim(),
      contato: emptyToNull(normalizeUppercaseField(form.contato)),
      email: emptyToNull(form.email),
      telefone: emptyToNull(form.telefone),
      responsavel: normalizeUppercaseField(form.responsavel),
      observacoes: emptyToNull(form.observacoes),
      desconto_percentual:
        Number(String(form.desconto_percentual).replace(",", ".")) || 0,
      forma_pagamento: null,
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
      if (!parseQuantidadeColaboradores(item.quantidade)) {
        return "Informe quantidade de colaboradores válida (mínimo 1) para todos os serviços.";
      }
      if (parseMoney(item.valor_unitario) < 0) {
        return "Informe valor válido para todos os serviços.";
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
