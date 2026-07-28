"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuditoriaUsuario, useAuth } from "@/contexts/AuthContext";
import { useOrcamentoForm } from "@/hooks/useOrcamentoForm";
import { useOrcamentosList } from "@/hooks/useOrcamentosList";
import { useServicosSstList } from "@/hooks/useServicosSstList";
import { useClientesList } from "@/hooks/useClientesList";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import { emptyToNull, parseMoney } from "@/lib/money";
import {
  buildAprovacaoDiffs,
  buildAprovacaoInsertPayload,
  type OrcamentoAprovacaoFormValues,
  type OrcamentoAprovacaoRecord,
  type OrcamentoContratoUpdatePayload,
} from "@/lib/orcamento-aprovacao";
import {
  EMPTY_ORCAMENTO_FILTERS,
  type OrcamentoComItens,
  type OrcamentoFilters,
} from "@/lib/orcamento-types";
import {
  isOrcamentoFormDirty,
  serializeOrcamentoFormSnapshot,
} from "@/lib/orcamento-form-dirty";
import { formatOrcamentoOrigemCliente } from "@/lib/orcamento-origem";
import { filterOrcamentos } from "@/lib/orcamento-filters";
import { gerarPdfOrcamento } from "@/lib/orcamento-pdf";
import { gerarNumeroOrcamento } from "@/services/orcamento.service";
import {
  atualizarOrcamento,
  buscarOrcamentoComItens,
  criarOrcamento,
  marcarOrcamentoComoEnviado,
} from "@/services/orcamento.service";
import {
  assertOrcamentoCnpjParaAprovacao,
  formatCnpjAuditoria,
  ORCAMENTO_CONTRATO_JA_VINCULADO_MSG,
} from "@/lib/orcamento-aprovacao-integracao";
import {
  atualizarAcompanhamentoContrato,
  buscarAprovacaoPorOrcamentoId,
  cancelarOrcamento,
  salvarAprovacaoOrcamento,
} from "@/services/orcamento-aprovacao.service";
import {
  deleteOrcamentoComprovantePagamento,
  obterUrlOrcamentoComprovante,
  uploadOrcamentoComprovantePagamento,
} from "@/services/orcamento-comprovante.service";
import { registrarAuditoria } from "@/services/auditoria.service";

function focusOrcamentoPrimeiroCampo(): void {
  requestAnimationFrame(() => {
    document.getElementById("orcamento-primeiro-campo")?.focus();
  });
}

export function useOrcamentosPage() {
  const auditContext = useAuditoriaUsuario();
  useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState<OrcamentoFilters>(
    EMPTY_ORCAMENTO_FILTERS
  );
  const [editingResponsavel, setEditingResponsavel] = useState("");
  const [editingOrigemInicial, setEditingOrigemInicial] = useState<
    string | null
  >(null);
  const [formBaseline, setFormBaseline] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const pendingBaselineRef = useRef(false);

  const [cancelTarget, setCancelTarget] = useState<OrcamentoComItens | null>(
    null
  );
  const [cancelSaving, setCancelSaving] = useState(false);

  const [aprovarOrcamento, setAprovarOrcamento] =
    useState<OrcamentoComItens | null>(null);
  const [aprovarAprovacao, setAprovarAprovacao] =
    useState<OrcamentoAprovacaoRecord | null>(null);
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [aprovarMode, setAprovarMode] = useState<"consulta" | "aprovacao">(
    "aprovacao"
  );
  const [aprovarSaving, setAprovarSaving] = useState(false);

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
    setEditingOrigemInicial(null);
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
    setEditingOrigemInicial(null);
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
    setEditingOrigemInicial(null);
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
        if (orcamento.status === "cancelado") {
          toast.error("Orçamento cancelado não pode ser editado.");
          return;
        }
        if (orcamento.status === "aprovado") {
          toast.error(
            "Orçamento aprovado não pode ser editado. Use Aprovar para consultar as condições finais."
          );
          return;
        }
        loadForm(orcamento);
        setEditingResponsavel(orcamento.responsavel);
        setEditingOrigemInicial(orcamento.origem_cliente);
        setEditingId(id);
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

  const openOrcamentoDetalhe = useCallback(
    async (id: string, mode: "consulta" | "aprovacao") => {
      setActionLoading(true);
      try {
        const orcamento = await buscarOrcamentoComItens(id);
        if (!orcamento) {
          toast.error("Orçamento não encontrado.");
          return;
        }
        if (mode === "aprovacao" && orcamento.status === "cancelado") {
          toast.error("Orçamento cancelado não pode ser aprovado.");
          return;
        }
        const aprovacao = await buscarAprovacaoPorOrcamentoId(id);
        setAprovarMode(mode);
        setAprovarOrcamento(orcamento);
        setAprovarAprovacao(aprovacao);
        setAprovarOpen(true);
      } catch (err) {
        console.error(err);
        toast.error(
          mode === "consulta"
            ? "Erro ao abrir orçamento."
            : "Erro ao abrir aprovação."
        );
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  const handleVisualizar = useCallback(
    async (id: string) => {
      await openOrcamentoDetalhe(id, "consulta");
    },
    [openOrcamentoDetalhe]
  );

  const handleOpenAprovar = useCallback(
    async (id: string) => {
      await openOrcamentoDetalhe(id, "aprovacao");
    },
    [openOrcamentoDetalhe]
  );

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

      const origemAntes = formatOrcamentoOrigemCliente(editingOrigemInicial);
      const origemDepois = formatOrcamentoOrigemCliente(saved.origem_cliente);

      await registrarAuditoria({
        ...auditContext,
        modulo: AUDITORIA_MODULOS.orcamentos,
        acao: isEditing ? AUDITORIA_ACOES.edicao : AUDITORIA_ACOES.criacao,
        registroId: saved.id,
        registroNome: saved.numero,
        descricao: isEditing
          ? `Orçamento ${saved.numero} atualizado.`
          : `Orçamento ${saved.numero} criado com origem ${origemDepois}.`,
        dadosDepois: {
          cliente: saved.cliente_nome,
          valor_total: saved.valor_total,
          status: saved.status,
          origem_cliente: saved.origem_cliente,
        },
      });

      if (isEditing && origemAntes !== origemDepois) {
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.edicao,
          registroId: saved.id,
          registroNome: saved.numero,
          descricao: `${auditContext.usuarioNome} alterou a origem do cliente de ${origemAntes} para ${origemDepois}.`,
          dadosAntes: { origem_cliente: editingOrigemInicial },
          dadosDepois: { origem_cliente: saved.origem_cliente },
        });
      }

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
    editingOrigemInicial,
    editingResponsavel,
    getValidationError,
    refresh,
    setSaving,
  ]);

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

        let statusAtualizado = false;
        if (orcamento.status === "em_elaboracao") {
          statusAtualizado = await marcarOrcamentoComoEnviado(orcamento.id);
        }

        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.envio,
          registroId: orcamento.id,
          registroNome: orcamento.numero,
          descricao: statusAtualizado
            ? `PDF da proposta ${orcamento.numero} gerado. Status alterado para Enviado.`
            : `PDF da proposta ${orcamento.numero} gerado.`,
        });
        toast.success(
          statusAtualizado
            ? "PDF gerado. Status atualizado para Enviado."
            : "PDF gerado com sucesso."
        );
        if (statusAtualizado) refresh();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao gerar PDF.");
      } finally {
        setActionLoading(false);
      }
    },
    [auditContext, refresh]
  );

  const handleOpenCancelar = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      const orcamento = await buscarOrcamentoComItens(id);
      if (!orcamento) {
        toast.error("Orçamento não encontrado.");
        return;
      }
      if (orcamento.status === "cancelado") {
        toast.error("Este orçamento já está cancelado.");
        return;
      }
      if (orcamento.status === "aprovado") {
        toast.error("Orçamento aprovado não pode ser cancelado nesta etapa.");
        return;
      }
      setCancelTarget(orcamento);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar orçamento.");
    } finally {
      setActionLoading(false);
    }
  }, []);

  const closeCancelar = useCallback(() => {
    if (cancelSaving) return;
    setCancelTarget(null);
  }, [cancelSaving]);

  const handleConfirmCancelar = useCallback(
    async (motivo: string, observacao: string) => {
      if (!cancelTarget) return;
      setCancelSaving(true);
      try {
        await cancelarOrcamento({
          id: cancelTarget.id,
          motivo,
          observacao: emptyToNull(observacao),
          canceladoPor: auditContext.usuarioNome,
        });

        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.cancelamento,
          registroId: cancelTarget.id,
          registroNome: cancelTarget.numero,
          descricao: `${auditContext.usuarioNome} cancelou o orçamento ${cancelTarget.numero}. Motivo: ${motivo}.`,
          dadosDepois: {
            status: "cancelado",
            motivo_cancelamento: motivo,
            observacao_cancelamento: emptyToNull(observacao),
          },
        });

        toast.success("Orçamento cancelado.");
        setCancelTarget(null);
        refresh();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao cancelar orçamento.");
      } finally {
        setCancelSaving(false);
      }
    },
    [auditContext, cancelTarget, refresh]
  );

  const closeAprovar = useCallback(() => {
    if (aprovarSaving) return;
    setAprovarOpen(false);
    setAprovarOrcamento(null);
    setAprovarAprovacao(null);
    setAprovarMode("aprovacao");
  }, [aprovarSaving]);

  const handleSalvarAprovacao = useCallback(
    async (formValues: OrcamentoAprovacaoFormValues) => {
      if (!aprovarOrcamento) return;
      setAprovarSaving(true);
      try {
        assertOrcamentoCnpjParaAprovacao(aprovarOrcamento.cliente_cnpj);

        const payload = buildAprovacaoInsertPayload(
          aprovarOrcamento,
          formValues,
          auditContext.usuarioNome,
          parseMoney
        );
        const diffs = buildAprovacaoDiffs(
          aprovarOrcamento,
          formValues,
          parseMoney
        ).filter((d) => d.changed);

        const { aprovacao: saved, integracao } = await salvarAprovacaoOrcamento(
          aprovarOrcamento.id,
          payload,
          aprovarOrcamento.cliente_cnpj
        );

        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.edicao,
          registroId: aprovarOrcamento.id,
          registroNome: aprovarOrcamento.numero,
          descricao: formValues.condicoes_iguais
            ? `${auditContext.usuarioNome} aprovou o orçamento ${aprovarOrcamento.numero} conforme as condições originais.`
            : `${auditContext.usuarioNome} aprovou o orçamento ${aprovarOrcamento.numero}.`,
          dadosDepois: {
            status: "aprovado",
            valor_final: payload.valor_final,
            quantidade_colaboradores: payload.quantidade_colaboradores,
            condicoes_iguais: formValues.condicoes_iguais,
            cliente_id: integracao.cliente_id,
            contrato_id: integracao.contrato_id,
          },
        });

        for (const diff of diffs) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.edicao,
            registroId: aprovarOrcamento.id,
            registroNome: aprovarOrcamento.numero,
            descricao: `${diff.label} alterado na aprovação de ${diff.original} para ${diff.aprovado}.`,
            dadosAntes: { [diff.label]: diff.original },
            dadosDepois: { [diff.label]: diff.aprovado },
          });
        }

        const cnpjFmt = formatCnpjAuditoria(integracao.cnpj_digits);
        if (integracao.cliente_localizado) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.clientes,
            acao: AUDITORIA_ACOES.edicao,
            registroId: integracao.cliente_id,
            registroNome: integracao.cliente_nome,
            descricao: `Cliente localizado pelo CNPJ ${cnpjFmt}.`,
          });
        }
        if (integracao.cliente_criado) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.clientes,
            acao: AUDITORIA_ACOES.criacao,
            registroId: integracao.cliente_id,
            registroNome: integracao.cliente_nome,
            descricao: `Cliente ${integracao.cliente_nome} criado automaticamente a partir do orçamento ${integracao.numero_orcamento}.`,
          });
        }
        if (integracao.contrato_criado) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.clientes,
            acao: AUDITORIA_ACOES.criacao,
            registroId: integracao.contrato_id,
            registroNome: integracao.cliente_nome,
            descricao: `Novo contrato criado para o cliente ${integracao.cliente_nome} a partir do orçamento ${integracao.numero_orcamento}.`,
          });
        } else if (integracao.contrato_ja_existia) {
          toast.message(ORCAMENTO_CONTRATO_JA_VINCULADO_MSG);
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.clientes,
            acao: AUDITORIA_ACOES.edicao,
            registroId: integracao.contrato_id,
            registroNome: integracao.cliente_nome,
            descricao: `Contrato já vinculado ao orçamento ${integracao.numero_orcamento} foi atualizado com as condições aprovadas.`,
          });
        }

        const refreshed = await buscarOrcamentoComItens(aprovarOrcamento.id);
        if (refreshed) setAprovarOrcamento(refreshed);
        setAprovarAprovacao(saved);
        toast.success(
          integracao.cliente_criado
            ? "Aprovação salva. Cliente e contrato criados."
            : "Aprovação salva. Contrato vinculado ao cliente."
        );
        refresh();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao salvar aprovação."
        );
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarOrcamento, auditContext, refresh]
  );

  const handleSalvarContrato = useCallback(
    async (
      aprovacaoId: string,
      payload: OrcamentoContratoUpdatePayload,
      file: File | null
    ) => {
      if (!aprovarOrcamento || !aprovarAprovacao) return;
      setAprovarSaving(true);
      try {
        const before = aprovarAprovacao;
        let nextPayload = { ...payload };

        if (file) {
          const uploaded = await uploadOrcamentoComprovantePagamento(
            aprovacaoId,
            file
          );
          if (before.comprovante_path && before.comprovante_path !== uploaded.path) {
            try {
              await deleteOrcamentoComprovantePagamento(before.comprovante_path);
            } catch (err) {
              console.error(err);
            }
          }
          nextPayload = {
            ...nextPayload,
            comprovante_path: uploaded.path,
            comprovante_nome: uploaded.nome,
            comprovante_tipo: uploaded.tipo,
            comprovante_tamanho: uploaded.tamanho,
          };
        }

        if (!nextPayload.boleto_pago) {
          if (before.comprovante_path && !file) {
            try {
              await deleteOrcamentoComprovantePagamento(before.comprovante_path);
            } catch (err) {
              console.error(err);
            }
          }
          nextPayload = {
            ...nextPayload,
            comprovante_path: null,
            comprovante_nome: null,
            comprovante_tipo: null,
            comprovante_tamanho: null,
            boleto_pago_em: null,
          };
        }

        const saved = await atualizarAcompanhamentoContrato(
          aprovacaoId,
          nextPayload
        );

        if (!before.contrato_enviado && saved.contrato_enviado && saved.contrato_enviado_em) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.envio,
            registroId: aprovarOrcamento.id,
            registroNome: aprovarOrcamento.numero,
            descricao: `Contrato enviado ao cliente em ${formatDateIsoToBR(saved.contrato_enviado_em)}.`,
          });
        }

        if (
          !before.contrato_assinado &&
          saved.contrato_assinado &&
          saved.contrato_assinado_em
        ) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.edicao,
            registroId: aprovarOrcamento.id,
            registroNome: aprovarOrcamento.numero,
            descricao: `Contrato assinado em ${formatDateIsoToBR(saved.contrato_assinado_em)}.`,
          });
        }

        if (
          saved.boleto_vencimento &&
          saved.boleto_vencimento !== before.boleto_vencimento
        ) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.edicao,
            registroId: aprovarOrcamento.id,
            registroNome: aprovarOrcamento.numero,
            descricao: `Vencimento do boleto inicial registrado para ${formatDateIsoToBR(saved.boleto_vencimento)}.`,
          });
        }

        if (!before.boleto_pago && saved.boleto_pago && saved.boleto_pago_em) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.edicao,
            registroId: aprovarOrcamento.id,
            registroNome: aprovarOrcamento.numero,
            descricao: `Pagamento inicial confirmado em ${formatDateIsoToBR(saved.boleto_pago_em)}.`,
          });
        }

        if (file && saved.comprovante_nome) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.edicao,
            registroId: aprovarOrcamento.id,
            registroNome: aprovarOrcamento.numero,
            descricao: `Comprovante de pagamento anexado: ${saved.comprovante_nome}.`,
          });
        }

        setAprovarAprovacao(saved);
        toast.success("Acompanhamento do contrato salvo.");
        refresh();
      } catch (err) {
        console.error(err);
        const message =
          err instanceof Error ? err.message : "Erro ao salvar acompanhamento.";
        toast.error(message);
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarAprovacao, aprovarOrcamento, auditContext, refresh]
  );

  const handleVerComprovante = useCallback(async (path: string) => {
    try {
      const url = await obterUrlOrcamentoComprovante(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível abrir o comprovante.");
    }
  }, []);

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
    viewLoading,
    actionLoading,
    form,
    totals,
    formDirty,
    discardConfirmOpen,
    cancelTarget,
    cancelSaving,
    aprovarOpen,
    aprovarMode,
    aprovarOrcamento,
    aprovarAprovacao,
    aprovarSaving,
    usuarioNome: auditContext.usuarioNome,
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
    handleGerarPdf,
    handleOpenCancelar,
    closeCancelar,
    handleConfirmCancelar,
    handleOpenAprovar,
    closeAprovar,
    handleSalvarAprovacao,
    handleSalvarContrato,
    handleVerComprovante,
    handleFilterChange,
    clearFilters,
    handleSelectCliente,
  };
}
