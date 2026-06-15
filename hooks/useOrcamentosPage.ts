"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuditoriaUsuario, useAuth } from "@/contexts/AuthContext";
import { useOrcamentoForm } from "@/hooks/useOrcamentoForm";
import { useOrcamentosList } from "@/hooks/useOrcamentosList";
import { useServicosSstList } from "@/hooks/useServicosSstList";
import { useClientesList } from "@/hooks/useClientesList";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import {
  EMPTY_ORCAMENTO_FILTERS,
  type OrcamentoFilters,
} from "@/lib/orcamento-types";
import { filterOrcamentos } from "@/lib/orcamento-filters";
import { gerarPdfOrcamento } from "@/lib/orcamento-pdf";
import { canExcluirOrcamento } from "@/lib/permissions";
import { gerarNumeroOrcamento } from "@/services/orcamento.service";
import {
  atualizarOrcamento,
  buscarOrcamentoComItens,
  criarOrcamento,
  duplicarOrcamento,
  excluirOrcamento,
} from "@/services/orcamento.service";
import { registrarAuditoria } from "@/services/auditoria.service";
import type { OrcamentoComItens } from "@/lib/orcamento-types";

export function useOrcamentosPage() {
  const auditContext = useAuditoriaUsuario();
  const { profile } = useAuth();
  const podeExcluir = canExcluirOrcamento(profile?.perfil);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOrcamento, setViewOrcamento] = useState<OrcamentoComItens | null>(
    null
  );
  const [viewLoading, setViewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState<OrcamentoFilters>(
    EMPTY_ORCAMENTO_FILTERS
  );

  const { orcamentos, loading, error, refresh } = useOrcamentosList();
  const { clientes } = useClientesList();
  const { servicos, loading: servicosLoading } = useServicosSstList();

  const {
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
    saving,
    setSaving,
  } = useOrcamentoForm();

  const orcamentosFiltrados = useMemo(
    () => filterOrcamentos(orcamentos, filters),
    [orcamentos, filters]
  );

  const resetForm = useCallback(() => {
    reset();
    setEditingId(null);
  }, [reset]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    resetForm();
  }, [resetForm]);

  const handleNovo = useCallback(async () => {
    resetForm();
    try {
      const numero = await gerarNumeroOrcamento();
      reset();
      setField("numero", numero);
    } catch (err) {
      console.error(err);
    }
    setShowForm(true);
    requestAnimationFrame(() => {
      document
        .getElementById("cadastrar-orcamento")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [reset, resetForm, setField]);

  const handleEditar = useCallback(
    async (id: string) => {
      setViewLoading(true);
      try {
        const orcamento = await buscarOrcamentoComItens(id);
        if (!orcamento) {
          toast.error("Orçamento não encontrado.");
          return;
        }
        loadForm(orcamento);
        setEditingId(id);
        setShowForm(true);
        requestAnimationFrame(() => {
          document
            .getElementById("cadastrar-orcamento")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar orçamento.");
      } finally {
        setViewLoading(false);
      }
    },
    [loadForm]
  );

  const handleVisualizar = useCallback(async (id: string) => {
    setViewLoading(true);
    try {
      const orcamento = await buscarOrcamentoComItens(id);
      if (!orcamento) {
        toast.error("Orçamento não encontrado.");
        return;
      }
      setViewOrcamento(orcamento);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar orçamento.");
    } finally {
      setViewLoading(false);
    }
  }, []);

  const closeView = useCallback(() => {
    setViewOrcamento(null);
  }, []);

  const handleSave = useCallback(async () => {
    const validationError = getValidationError();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const isEditing = Boolean(editingId);

      const saved = isEditing
        ? await atualizarOrcamento(editingId!, payload)
        : await criarOrcamento(payload);

      await registrarAuditoria({
        ...auditContext,
        modulo: AUDITORIA_MODULOS.orcamentos,
        acao: isEditing ? AUDITORIA_ACOES.edicao : AUDITORIA_ACOES.criacao,
        registroId: saved.id,
        registroNome: saved.numero,
        descricao: isEditing
          ? `Orçamento ${saved.numero} atualizado.`
          : `Orçamento ${saved.numero} criado.`,
        dadosDepois: {
          cliente: saved.cliente_nome,
          valor_total: saved.valor_total,
          status: saved.status,
        },
      });

      toast.success(
        isEditing ? "Orçamento atualizado com sucesso." : "Orçamento criado com sucesso."
      );
      closeForm();
      refresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar orçamento.");
    } finally {
      setSaving(false);
    }
  }, [
    auditContext,
    buildPayload,
    closeForm,
    editingId,
    getValidationError,
    refresh,
    setSaving,
  ]);

  const handleDuplicar = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        const copia = await duplicarOrcamento(id);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.criacao,
          registroId: copia.id,
          registroNome: copia.numero,
          descricao: `Orçamento duplicado a partir de ${id}. Novo número: ${copia.numero}.`,
        });
        toast.success(`Orçamento duplicado: ${copia.numero}`);
        refresh();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao duplicar orçamento.");
      } finally {
        setActionLoading(false);
      }
    },
    [auditContext, refresh]
  );

  const handleGerarPdf = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        const orcamento = await buscarOrcamentoComItens(id);
        if (!orcamento) {
          toast.error("Orçamento não encontrado.");
          return;
        }
        await gerarPdfOrcamento(orcamento);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.envio,
          registroId: orcamento.id,
          registroNome: orcamento.numero,
          descricao: `PDF da proposta ${orcamento.numero} gerado.`,
        });
        toast.success("PDF gerado com sucesso.");
      } catch (err) {
        console.error(err);
        toast.error("Erro ao gerar PDF.");
      } finally {
        setActionLoading(false);
      }
    },
    [auditContext]
  );

  const handleExcluir = useCallback(
    async (id: string, numero: string) => {
      if (!podeExcluir) {
        toast.error("Seu perfil não pode excluir orçamentos.");
        return;
      }

      if (
        !window.confirm(
          `Excluir o orçamento ${numero}? Esta ação não pode ser desfeita.`
        )
      ) {
        return;
      }

      setActionLoading(true);
      try {
        await excluirOrcamento(id);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.exclusao,
          registroId: id,
          registroNome: numero,
          descricao: `Orçamento ${numero} excluído.`,
        });
        toast.success("Orçamento excluído.");
        refresh();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao excluir orçamento.");
      } finally {
        setActionLoading(false);
      }
    },
    [auditContext, podeExcluir, refresh]
  );

  const handleFilterChange = useCallback(
    (field: keyof OrcamentoFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_ORCAMENTO_FILTERS);
  }, []);

  const handleSelectCliente = useCallback(
    (clienteId: string) => {
      const cliente = clientes.find((item) => item.id === clienteId);
      setField("cliente_id", clienteId);
      if (cliente) {
        setField("cliente_nome", cliente.nome);
      }
    },
    [clientes, setField]
  );

  return {
    showForm,
    editingId,
    orcamentos: orcamentosFiltrados,
    loading,
    error,
    filters,
    clientes,
    servicos,
    servicosLoading,
    viewOrcamento,
    viewLoading,
    actionLoading,
    podeExcluir,
    form,
    totals,
    setField,
    addItem,
    removeItem,
    updateItem,
    applyServicoSugerido,
    saving,
    resetForm,
    closeForm,
    handleNovo,
    handleEditar,
    handleVisualizar,
    handleSave,
    handleDuplicar,
    handleGerarPdf,
    handleExcluir,
    handleFilterChange,
    clearFilters,
    handleSelectCliente,
    closeView,
  };
}
