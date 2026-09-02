"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatUppercaseInput,
  isUppercaseField,
  normalizeUppercaseField,
} from "@/lib/text-normalize";
import {
  applyPacoteCompletoSstPrecoItensPayload,
  applyValorAutomaticoPacoteCompletoSstItem,
  calcSubtotalItens,
  formatQuantidadeColaboradoresInput,
  formatValorOrcamentoInput,
  inferValorManualOrcamentoItem,
  isPacoteCompletoSstValorAutomatico,
  parseQuantidadeColaboradores,
  resolveItemValorParaFormulario,
  resolveQuantidadeColaboradoresOrcamento,
  validateOrcamentoItensValores,
} from "@/lib/orcamento-calculo";
import {
  calcCondicoesPagamentoProposta,
  resolveQuantidadeParcelasEscolhida,
} from "@/lib/orcamento-pagamento";
import {
  calcValidadePropostaIso,
  resolveValidadePropostaIso,
} from "@/lib/orcamento-validade";
import {
  createEmptyOrcamentoItem,
  getEmptyOrcamentoForm,
} from "@/lib/orcamento-defaults";
import { emptyToNull, maskMoneyInput, parseMoney } from "@/lib/money";
import { isOrcamentoOrigemCliente } from "@/lib/orcamento-origem";
import type {
  OrcamentoComItens,
  OrcamentoFormValues,
  OrcamentoInsertPayload,
  OrcamentoItemFormItem,
} from "@/lib/orcamento-types";
import type { ClienteRecord } from "@/lib/types";
import { maskCNPJInput } from "@/lib/cnpj";

export type OrcamentoFormField = keyof Omit<OrcamentoFormValues, "itens">;

function syncQuantidadeColaboradores(
  itens: OrcamentoItemFormItem[],
  quantidade: string
): OrcamentoItemFormItem[] {
  return itens.map((item) => {
    const next = { ...item, quantidade };
    if (next.valor_manual) return next;
    const auto = applyValorAutomaticoPacoteCompletoSstItem(next);
    return { ...next, ...auto };
  });
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
              next.valor_manual = false;
              const auto = applyValorAutomaticoPacoteCompletoSstItem(next);
              next.valor_unitario = auto.valor_unitario;
              next.valor_total = auto.valor_total;
            }

            if (field === "valor_unitario") {
              next.valor_manual = true;
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
      setForm((prev) => ({
        ...prev,
        itens: prev.itens.map((item) => {
          if (item.id !== itemId) return item;

          const qtd = parseQuantidadeColaboradores(item.quantidade);
          if (isPacoteCompletoSstValorAutomatico(item.servico_nome, qtd)) {
            const auto = applyValorAutomaticoPacoteCompletoSstItem({
              ...item,
              valor_manual: false,
            });
            return { ...item, ...auto, valor_manual: false };
          }

          if (valorSugerido == null || valorSugerido <= 0) return item;
          const masked = formatValorOrcamentoInput(valorSugerido);
          return {
            ...item,
            valor_unitario: masked,
            valor_total: String(valorSugerido),
            valor_manual: false,
          };
        }),
      }));
    },
    []
  );

  const applyClienteSelection = useCallback((cliente: ClienteRecord | null) => {
    setForm((prev) => {
      if (!cliente) {
        return { ...prev, cliente_id: "" };
      }

      return {
        ...prev,
        cliente_id: cliente.id,
        cliente_nome: cliente.nome,
        cliente_cnpj: maskCNPJInput(cliente.cnpj ?? ""),
        cliente_endereco: cliente.endereco ?? "",
        cliente_setor: (cliente.setor ?? "").slice(0, 30),
        contato: cliente.contato ?? "",
        email: cliente.email ?? "",
        telefone: cliente.telefone ?? "",
      };
    });
  }, []);

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
      cliente_cnpj: orcamento.cliente_cnpj ?? "",
      cliente_endereco: orcamento.cliente_endereco ?? "",
      cliente_setor: (orcamento.cliente_setor ?? "").slice(0, 30),
      contato: orcamento.contato ?? "",
      email: orcamento.email ?? "",
      telefone: orcamento.telefone ?? "",
      origem_cliente: isOrcamentoOrigemCliente(orcamento.origem_cliente)
        ? orcamento.origem_cliente
        : "",
      observacoes: orcamento.observacoes ?? "",
      forma_pagamento: orcamento.forma_pagamento ?? "",
      quantidade_parcelas:
        orcamento.quantidade_parcelas != null
          ? String(
              resolveQuantidadeParcelasEscolhida(
                Number(orcamento.valor_total) || 0,
                orcamento.quantidade_parcelas
              )
            )
          : "",
      itens:
        itensDb.length > 0
          ? itensDb.map((item) => {
              const valor = resolveItemValorParaFormulario(item);
              const qtd =
                parseQuantidadeColaboradores(quantidadeReferencia) || 1;
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
                valor_manual: inferValorManualOrcamentoItem(
                  item.servico_nome,
                  qtd,
                  valor
                ),
              };
            })
          : [createEmptyOrcamentoItem()],
    });
  }, []);

  const totals = useMemo(() => {
    const subtotal = calcSubtotalItens(form.itens);
    const valorTotal = subtotal;
    const quantidadeEscolhida =
      form.quantidade_parcelas.trim() === ""
        ? null
        : Number(form.quantidade_parcelas);
    const condicoesPagamento = calcCondicoesPagamentoProposta(
      valorTotal,
      quantidadeEscolhida
    );
    const validadeProposta = form.data_proposta.trim()
      ? calcValidadePropostaIso(form.data_proposta)
      : "";
    return { subtotal, valorTotal, condicoesPagamento, validadeProposta };
  }, [form.data_proposta, form.itens, form.quantidade_parcelas]);

  useEffect(() => {
    const max = totals.condicoesPagamento.maxParcelas;
    const raw = form.quantidade_parcelas.trim();
    if (raw === "") return;
    const atual = Number(raw);
    if (!Number.isFinite(atual) || atual < 1 || atual > max) {
      setForm((prev) => ({
        ...prev,
        quantidade_parcelas: String(max),
      }));
    }
  }, [form.quantidade_parcelas, totals.condicoesPagamento.maxParcelas]);

  const buildPayload = useCallback(
    (responsavel: string): OrcamentoInsertPayload => {
    const itensRaw = form.itens
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
          valor_manual: item.valor_manual,
        };
      });

    const itens = applyPacoteCompletoSstPrecoItensPayload(itensRaw).map(
      ({ valor_manual: _manual, ...item }) => item
    );
    const subtotal = itens.reduce((sum, item) => sum + item.valor_total, 0);
    const validadeIso = resolveValidadePropostaIso(form.data_proposta);
    const quantidadeParcelas = resolveQuantidadeParcelasEscolhida(
      subtotal,
      form.quantidade_parcelas.trim() === ""
        ? null
        : Number(form.quantidade_parcelas)
    );

    if (!isOrcamentoOrigemCliente(form.origem_cliente)) {
      throw new Error("Informe a origem do cliente.");
    }

    return {
      numero: form.numero.trim(),
      data_proposta: form.data_proposta,
      cliente_id: form.cliente_id.trim() || null,
      cliente_nome: form.cliente_nome.trim(),
      cliente_cnpj: emptyToNull(maskCNPJInput(form.cliente_cnpj.trim())),
      cliente_endereco: emptyToNull(form.cliente_endereco),
      cliente_setor: emptyToNull(
        normalizeUppercaseField(form.cliente_setor).slice(0, 30)
      ),
      contato: emptyToNull(normalizeUppercaseField(form.contato)),
      email: emptyToNull(form.email),
      telefone: emptyToNull(form.telefone),
      responsavel: normalizeUppercaseField(responsavel),
      origem_cliente: form.origem_cliente,
      observacoes: emptyToNull(form.observacoes),
      desconto_percentual: 0,
      forma_pagamento: null,
      quantidade_parcelas: quantidadeParcelas,
      validade_proposta: validadeIso,
      subtotal,
      valor_total: subtotal,
      itens,
    };
  },
    [form]
  );

  const getValidationError = useCallback((): string | null => {
    if (form.cliente_nome.trim() === "") {
      return "Informe o cliente.";
    }
    if (!form.data_proposta.trim()) {
      return "Informe a data da proposta.";
    }
    if (!isOrcamentoOrigemCliente(form.origem_cliente)) {
      return "Informe a origem do cliente.";
    }
    if (form.cliente_setor.length > 30) {
      return "O setor deve ter no máximo 30 caracteres.";
    }

    const itensValidos = form.itens.filter(
      (item) => item.servico_nome.trim() !== ""
    );
    if (itensValidos.length === 0) {
      return "Adicione ao menos um serviço.";
    }

    return validateOrcamentoItensValores(
      itensValidos.map((item) => ({
        servico_nome: item.servico_nome,
        quantidade: parseQuantidadeColaboradores(item.quantidade),
        valor_unitario: parseMoney(item.valor_unitario),
        valor_manual: item.valor_manual,
      }))
    );
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
    applyClienteSelection,
    reset,
    loadForm,
    buildPayload,
    getValidationError,
    validate,
    saving,
    setSaving,
  };
}
