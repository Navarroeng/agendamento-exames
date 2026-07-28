"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  isOrcamentoFormDirty,
  serializeOrcamentoFormSnapshot,
} from "@/lib/orcamento-form-dirty";
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

function focusOrcamentoPrimeiroCampo(): void {
  requestAnimationFrame(() => {
    document.getElementById("orcamento-primeiro-campo")?.focus();
  });
}

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
  const [editingResponsavel, setEditingResponsavel] = useState("");
  const [formBaseline, setFormBaseline] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const pendingBaselineRef = useRef(false);

  const { orcamentos, loading, error, refresh } = useOrcamentosList();
  const { clientes } = useClientesList();
  const { servicos, loading: servicosLoading, error: servicosError } =
    useServicosSstList();

  const {
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
    saving,
    setSaving,
  } = useOrcamentoForm();

  const orcamentosFiltrados = useMemo(
    () => filterOrcamentos(orcamentos, filters),
    [orcamentos, filters]
  );

  const formDirty = isOrcamentoFormDirty(form, formBaseline);

  useEffect(() => {
    if (!showForm || !pendingBaselineRef.current) return;
    setFormBaseline(serializeOrcamentoFormSnapshot(form));
    pendingBaselineRef.current = false;
    focusOrcamentoPrimeiroCampo();
  }, [showForm, form]);

  const resetForm = useCallback(() => {
    reset();
    setEditingId(null);
    setEditingResponsavel("");
    if (showForm) {
      pendingBaselineRef.current = true;
    } else {
      setFormBaseline(null);
    }
  }, [reset, showForm]);

  const closeForm = useCallback(() => {
    setDiscardConfirmOpen(false);
    setShowForm(false);
    setFormBaseline(null);
    pendingBaselineRef.current = false;
    reset();
    setEditingId(null);
    setEditingResponsavel("");
  }, [reset]);

  const requestCloseForm = useCallback(() => {
    if (discardConfirmOpen) return;
    if (isOrcamentoFormDirty(form, formBaseline)) {
      setDiscardConfirmOpen(true);
      return;
    }
    closeForm();
  }, [closeForm, discardConfirmOpen, form, formBaseline]);

  const continueEditing = useCallback(() => {
    setDiscardConfirmOpen(false);
  }, []);

  const discardAndClose = useCallback(() => {
    closeForm();
  }, [closeForm]);

  const handleNovo = useCallback(async () => {
    setDiscardConfirmOpen(false);
    reset();
    setEditingId(null);
    setEditingResponsavel("");
    try {
      const numero = await gerarNumeroOrcamento();
      reset();
      setField("numero", numero);
    } catch (err) {
      console.error(err);
    }
    pendingBaselineRef.current = true;
    setShowForm(true);
  }, [reset, setField]);

  const handleEditar = useCallback(
    async (id: string) => {
      setViewLoading(true);
      setDiscardConfirmOpen(false);
      try {
        const orcamento = await buscarOrcamentoComItens(id);
        if (!orcamento) {
          toast.error("Orçamento não encontrado.");
          return;
        }
        loadForm(orcamento);
        setEditingResponsavel(orcamento.responsavel);
        setEditingId(id);
        setViewOrcamento(null);
        pendingBaselineRef.current = true;
        setShowForm(true);
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
      const payload = buildPayload(
        editingId ? editingResponsavel : auditContext.usuarioNome
      );
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
        isEditing
          ? "Orçamento atualizado com sucesso."
          : "Orçamento criado com sucesso."
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
    editingResponsavel,
    getValidationError,
    refresh,
    setSaving,
  ]);

  const handleDuplicar = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        const copia = await duplicarOrcamento(id, auditContext.usuarioNome);
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
      if (!clienteId) {
        applyClienteSelection(null);
        return;
      }
      const cliente = clientes.find((item) => item.id === clienteId);
      applyClienteSelection(cliente ?? null);
    },
    [applyClienteSelection, clientes]
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
    servicosError,
    viewOrcamento,
    viewLoading,
    actionLoading,
    podeExcluir,
    form,
    totals,
    formDirty,
    discardConfirmOpen,
    setField,
    addItem,
    removeItem,
    updateItem,
    applyServicoSugerido,
    saving,
    resetForm,
    closeForm,
    requestCloseForm,
    continueEditing,
    discardAndClose,
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
