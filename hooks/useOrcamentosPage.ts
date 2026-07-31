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
  buildCondicoesComerciaisFromForm,
  formatCondicaoAprovada,
  formatPagamentoFromCondicoes,
  type OrcamentoAprovacaoFormValues,
  type OrcamentoAprovacaoRecord,
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
import {
  ORCAMENTO_JA_APROVADO_MSG,
  orcamentoPermiteAprovar,
  orcamentoPermiteCancelar,
  orcamentoPermiteEditar,
} from "@/lib/orcamento-acoes";
import {
  CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG,
  podeEncerrarContrato as usuarioPodeEncerrarContrato,
} from "@/lib/contrato-permissoes";
import {
  ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG,
  podeAlterarResponsavelProcesso,
} from "@/lib/orcamento-responsavel";
import {
  alterarResponsavelProcesso,
  listarUsuariosAtivosParaResponsavel,
} from "@/services/orcamento-responsavel.service";
import type { PerfilUsuario } from "@/lib/types";
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
  atualizarAcompanhamentoDocumentalContrato,
  atualizarAcompanhamentoFinanceiro,
  atualizarCondicoesAprovadas,
  buscarAprovacaoPorOrcamentoId,
  cancelarOrcamento,
  listarHistoricoCondicoesAprovadas,
  salvarAprovacaoOrcamento,
} from "@/services/orcamento-aprovacao.service";
import { buscarContratoPorOrcamentoId } from "@/services/cliente-contrato.service";
import {
  buildAuditoriaEncerramentoContrato,
  encerrarContratoDeOrcamento,
  listarAgendamentosFuturosDoContrato,
  type DestinoAgendamentosFuturos,
} from "@/services/orcamento-encerrar-contrato.service";
import type {
  OrcamentoContratoDocumentalUpdatePayload,
  OrcamentoFinanceiroUpdatePayload,
} from "@/lib/orcamento-aprovacao";
import {
  obterUrlOrcamentoComprovante,
  uploadOrcamentoComprovantePagamento,
} from "@/services/orcamento-comprovante.service";
import {
  obterUrlOrcamentoOnboarding,
  removerArquivoOrcamentoOnboarding,
  uploadOrcamentoListaFuncionarios,
  uploadOrcamentoLogo,
} from "@/services/orcamento-onboarding-storage.service";
import {
  removerOrcamentoListaFuncionarios,
  removerOrcamentoLogo,
  salvarOrcamentoListaFuncionarios,
  salvarOrcamentoLogo,
  salvarOrcamentoProcuracao,
  salvarOrcamentoVisitaTecnica,
} from "@/services/orcamento-onboarding.service";
import { registrarAuditoria } from "@/services/auditoria.service";

function focusOrcamentoPrimeiroCampo(): void {
  requestAnimationFrame(() => {
    document.getElementById("orcamento-primeiro-campo")?.focus();
  });
}

export function useOrcamentosPage() {
  const auditContext = useAuditoriaUsuario();
  const { profile } = useAuth();
  const podeEncerrarContrato = usuarioPodeEncerrarContrato(profile?.perfil);
  const resolvePodeAlterarResponsavel = useCallback(
    (orcamento: {
      status: OrcamentoComItens["status"];
      responsavel: string;
      responsavel_user_id?: string | null;
    }) =>
      podeAlterarResponsavelProcesso({
        perfil: profile?.perfil,
        usuarioId: profile?.user_id,
        usuarioNome: profile?.nome ?? auditContext.usuarioNome,
        orcamento,
      }),
    [auditContext.usuarioNome, profile?.nome, profile?.perfil, profile?.user_id]
  );

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
  const [encerrarContratoTarget, setEncerrarContratoTarget] = useState<{
    orcamento: OrcamentoComItens;
    contratoNumero: string | null;
    futurosCount: number;
  } | null>(null);
  const [alterarResponsavelTarget, setAlterarResponsavelTarget] =
    useState<OrcamentoComItens | null>(null);
  const [alterarResponsavelSaving, setAlterarResponsavelSaving] =
    useState(false);
  const [usuariosResponsavel, setUsuariosResponsavel] = useState<
    PerfilUsuario[]
  >([]);
  const [usuariosResponsavelLoading, setUsuariosResponsavelLoading] =
    useState(false);

  const [aprovarOrcamento, setAprovarOrcamento] =
    useState<OrcamentoComItens | null>(null);
  const [aprovarAprovacao, setAprovarAprovacao] =
    useState<OrcamentoAprovacaoRecord | null>(null);
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [aprovarMode, setAprovarMode] = useState<"consulta" | "aprovacao">(
    "aprovacao"
  );
  const [aprovarSaving, setAprovarSaving] = useState(false);
  const [funcionariosPreviewUrl, setFuncionariosPreviewUrl] = useState<
    string | null
  >(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const { orcamentos, loading, error, refresh } = useOrcamentosList();
  const { clientes, refresh: refreshClientes } = useClientesList();
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
        if (!orcamentoPermiteEditar(orcamento.status)) {
          toast.error(
            orcamento.status === "aprovado"
              ? "Orçamento aprovado não pode ser editado. Use Visualizar para consultar."
              : "Orçamento cancelado não pode ser editado."
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
        if (mode === "aprovacao" && !orcamentoPermiteAprovar(orcamento.status)) {
          toast.error(
            orcamento.status === "aprovado"
              ? ORCAMENTO_JA_APROVADO_MSG
              : "Orçamento cancelado não pode ser aprovado."
          );
          return;
        }
        const aprovacao = await buscarAprovacaoPorOrcamentoId(id);
        setAprovarMode(mode);
        setAprovarOrcamento(orcamento);
        setAprovarAprovacao(aprovacao);
        setFuncionariosPreviewUrl(null);
        setLogoPreviewUrl(null);
        if (aprovacao?.funcionarios_lista_path) {
          try {
            setFuncionariosPreviewUrl(
              await obterUrlOrcamentoOnboarding(aprovacao.funcionarios_lista_path)
            );
          } catch (err) {
            console.error(err);
          }
        }
        if (aprovacao?.logo_path) {
          try {
            setLogoPreviewUrl(
              await obterUrlOrcamentoOnboarding(aprovacao.logo_path)
            );
          } catch (err) {
            console.error(err);
          }
        }
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
      const basePayload = buildPayload(
        editingId ? editingResponsavel : auditContext.usuarioNome
      );
      const payload = editingId
        ? basePayload
        : {
            ...basePayload,
            criado_por: auditContext.usuarioNome,
            criado_por_user_id: profile?.user_id ?? null,
            responsavel_user_id: profile?.user_id ?? null,
          };
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
    profile?.user_id,
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
      if (
        !orcamentoPermiteCancelar(orcamento.status, {
          podeEncerrarContrato,
        })
      ) {
        toast.error(
          orcamento.status === "cancelado" ||
            orcamento.status === "contrato_encerrado"
            ? "Este orçamento já está encerrado/cancelado."
            : orcamento.status === "aprovado" && !podeEncerrarContrato
              ? CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG
              : "Este orçamento não pode ser cancelado."
        );
        if (orcamento.status === "aprovado" && !podeEncerrarContrato) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.tentativa_encerrar_contrato_sem_permissao,
            registroId: orcamento.id,
            registroNome: orcamento.numero,
            descricao: `Usuário ${auditContext.usuarioNome} tentou encerrar o contrato do orçamento ${orcamento.numero} sem permissão.`,
          });
        }
        return;
      }

      const contrato = await buscarContratoPorOrcamentoId(orcamento.id);
      if (
        contrato &&
        contrato.status !== "encerrado" &&
        !contrato.encerrado_em
      ) {
        if (!podeEncerrarContrato) {
          toast.error(CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG);
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.tentativa_encerrar_contrato_sem_permissao,
            registroId: orcamento.id,
            registroNome: orcamento.numero,
            descricao: `Usuário ${auditContext.usuarioNome} tentou encerrar o contrato ${contrato.numero || contrato.id} sem permissão.`,
          });
          return;
        }
        const futuros = await listarAgendamentosFuturosDoContrato(contrato.id);
        setEncerrarContratoTarget({
          orcamento,
          contratoNumero: contrato.numero ?? null,
          futurosCount: futuros.length,
        });
        return;
      }

      setCancelTarget(orcamento);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar orçamento.");
    } finally {
      setActionLoading(false);
    }
  }, [auditContext, podeEncerrarContrato]);

  const closeCancelar = useCallback(() => {
    if (cancelSaving) return;
    setCancelTarget(null);
  }, [cancelSaving]);

  const closeEncerrarContrato = useCallback(() => {
    if (cancelSaving) return;
    setEncerrarContratoTarget(null);
  }, [cancelSaving]);

  const handleOpenAlterarResponsavel = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        const orcamento = await buscarOrcamentoComItens(id);
        if (!orcamento) {
          toast.error("Orçamento não encontrado.");
          return;
        }
        if (
          !podeAlterarResponsavelProcesso({
            perfil: profile?.perfil,
            usuarioId: profile?.user_id,
            usuarioNome: profile?.nome ?? auditContext.usuarioNome,
            orcamento,
          })
        ) {
          toast.error(
            orcamento.status === "cancelado" ||
              orcamento.status === "contrato_encerrado"
              ? ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG
              : "Você não possui permissão para alterar o responsável deste processo."
          );
          return;
        }

        setUsuariosResponsavelLoading(true);
        const usuarios = await listarUsuariosAtivosParaResponsavel();
        setUsuariosResponsavel(usuarios);
        setAlterarResponsavelTarget(orcamento);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar dados para alteração de responsável.");
      } finally {
        setUsuariosResponsavelLoading(false);
        setActionLoading(false);
      }
    },
    [auditContext.usuarioNome, profile?.nome, profile?.perfil, profile?.user_id]
  );

  const closeAlterarResponsavel = useCallback(() => {
    if (alterarResponsavelSaving) return;
    setAlterarResponsavelTarget(null);
  }, [alterarResponsavelSaving]);

  const handleConfirmAlterarResponsavel = useCallback(
    async (params: {
      novoResponsavelUserId: string;
      novoResponsavelNome: string;
      motivo: string;
    }) => {
      if (!alterarResponsavelTarget) return;
      setAlterarResponsavelSaving(true);
      try {
        const result = await alterarResponsavelProcesso({
          orcamentoId: alterarResponsavelTarget.id,
          novoResponsavelUserId: params.novoResponsavelUserId,
          novoResponsavelNome: params.novoResponsavelNome,
          motivo: params.motivo,
        });

        const contratoTxt = result.numeroContrato
          ? ` Contrato: ${result.numeroContrato}.`
          : "";

        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.alteracao_responsavel_processo,
          registroId: result.orcamento.id,
          registroNome: result.orcamento.numero,
          descricao: `${auditContext.usuarioNome} alterou o responsável do processo ${result.orcamento.numero} de ${result.responsavelAnterior} para ${result.responsavelNovo}.${contratoTxt}\nMotivo:\n${result.motivo}`,
          dadosAntes: {
            responsavel: result.responsavelAnterior,
          },
          dadosDepois: {
            responsavel: result.responsavelNovo,
            motivo: result.motivo,
            contrato: result.numeroContrato,
          },
        });

        if (aprovarOrcamento?.id === result.orcamento.id) {
          setAprovarOrcamento(result.orcamento);
        }

        setAlterarResponsavelTarget(null);
        toast.success("Responsável pelo processo alterado com sucesso.");
        refresh();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao alterar o responsável do processo."
        );
      } finally {
        setAlterarResponsavelSaving(false);
      }
    },
    [alterarResponsavelTarget, aprovarOrcamento?.id, auditContext, refresh]
  );

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
        toast.error(
          err instanceof Error ? err.message : "Erro ao cancelar orçamento."
        );
      } finally {
        setCancelSaving(false);
      }
    },
    [auditContext, cancelTarget, refresh]
  );

  const handleConfirmEncerrarContrato = useCallback(
    async (params: {
      motivo: string;
      destinoAgendamentosFuturos: DestinoAgendamentosFuturos;
    }) => {
      if (!encerrarContratoTarget) return;
      if (!podeEncerrarContrato) {
        toast.error(CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.tentativa_encerrar_contrato_sem_permissao,
          registroId: encerrarContratoTarget.orcamento.id,
          registroNome: encerrarContratoTarget.orcamento.numero,
          descricao: `Usuário ${auditContext.usuarioNome} tentou encerrar o contrato ${encerrarContratoTarget.contratoNumero || encerrarContratoTarget.orcamento.numero} sem permissão.`,
        });
        return;
      }
      setCancelSaving(true);
      try {
        const { orcamento } = encerrarContratoTarget;
        const result = await encerrarContratoDeOrcamento({
          orcamentoId: orcamento.id,
          motivo: params.motivo,
          usuarioNome: auditContext.usuarioNome,
          destinoAgendamentosFuturos: params.destinoAgendamentosFuturos,
        });

        const numeroContrato =
          result.contrato.numero ||
          encerrarContratoTarget.contratoNumero ||
          result.contrato.id;

        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.cancelamento,
          registroId: orcamento.id,
          registroNome: orcamento.numero,
          descricao: buildAuditoriaEncerramentoContrato({
            usuarioNome: auditContext.usuarioNome,
            contratoNumero: numeroContrato,
            motivo: params.motivo,
            dataHora: new Date(),
          }),
          dadosDepois: {
            status: "contrato_encerrado",
            contrato_id: result.contrato.id,
            contrato_status: "encerrado",
            motivo_encerramento: params.motivo,
            agendamentos_futuros_cancelados: result.futurosCancelados,
          },
        });

        toast.success(
          result.futurosCancelados > 0
            ? `Contrato encerrado. ${result.futurosCancelados} agendamento(s) futuro(s) cancelado(s).`
            : "Contrato encerrado. Histórico preservado."
        );
        setEncerrarContratoTarget(null);
        refresh();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao encerrar contrato."
        );
      } finally {
        setCancelSaving(false);
      }
    },
    [auditContext, encerrarContratoTarget, podeEncerrarContrato, refresh]
  );

  const closeAprovar = useCallback(() => {
    if (aprovarSaving) return;
    setAprovarOpen(false);
    setAprovarOrcamento(null);
    setAprovarAprovacao(null);
    setAprovarMode("aprovacao");
    setFuncionariosPreviewUrl(null);
    setLogoPreviewUrl(null);
  }, [aprovarSaving]);

  const handleSalvarAprovacao = useCallback(
    async (formValues: OrcamentoAprovacaoFormValues) => {
      if (!aprovarOrcamento) return;
      if (!orcamentoPermiteAprovar(aprovarOrcamento.status)) {
        toast.error(
          aprovarOrcamento.status === "aprovado"
            ? ORCAMENTO_JA_APROVADO_MSG
            : "Orçamento cancelado não pode ser aprovado."
        );
        return;
      }
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
            registroNome: integracao.numero_contrato || integracao.cliente_nome,
            descricao: `Contrato ${integracao.numero_contrato} criado automaticamente a partir do orçamento ${integracao.numero_orcamento}.`,
          });
        } else if (integracao.contrato_ja_existia) {
          toast.message(ORCAMENTO_CONTRATO_JA_VINCULADO_MSG);
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.clientes,
            acao: AUDITORIA_ACOES.edicao,
            registroId: integracao.contrato_id,
            registroNome: integracao.numero_contrato || integracao.cliente_nome,
            descricao: `Contrato ${integracao.numero_contrato || "existente"} já vinculado ao orçamento ${integracao.numero_orcamento}.`,
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
        refreshClientes();
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

  const handleAtualizarCondicoesAprovadas = useCallback(
    async (formValues: OrcamentoAprovacaoFormValues) => {
      if (!aprovarOrcamento || !aprovarAprovacao) return;
      setAprovarSaving(true);
      try {
        const before = aprovarAprovacao;
        const payload = buildCondicoesComerciaisFromForm(formValues, parseMoney);
        const { aprovacao: saved, historico } = await atualizarCondicoesAprovadas(
          aprovarAprovacao.id,
          payload,
          auditContext.usuarioNome
        );

        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.edicao,
          registroId: aprovarOrcamento.id,
          registroNome: aprovarOrcamento.numero,
          descricao: `${auditContext.usuarioNome} alterou as condições finais aprovadas do orçamento ${aprovarOrcamento.numero}.`,
          dadosAntes: {
            quantidade_colaboradores: before.quantidade_colaboradores,
            valor_final: before.valor_final,
            pagamento: formatCondicaoAprovada(before),
          },
          dadosDepois: {
            quantidade_colaboradores: payload.quantidade_colaboradores,
            valor_final: payload.valor_final,
            pagamento: formatPagamentoFromCondicoes(payload),
            historico_id: historico.id,
          },
        });

        setAprovarAprovacao(saved);
        toast.success(
          "Condições aprovadas atualizadas. Financeiro, Contrato e Clientes sincronizados."
        );
        refresh();
        refreshClientes();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao atualizar condições aprovadas."
        );
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarAprovacao, aprovarOrcamento, auditContext, refresh, refreshClientes]
  );

  const handleListarHistoricoCondicoes = useCallback(
    async (aprovacaoId: string) => listarHistoricoCondicoesAprovadas(aprovacaoId),
    []
  );

  const handleSalvarContrato = useCallback(
    async (
      aprovacaoId: string,
      payload: OrcamentoContratoDocumentalUpdatePayload
    ) => {
      if (!aprovarOrcamento || !aprovarAprovacao) return;
      setAprovarSaving(true);
      try {
        const before = aprovarAprovacao;
        const saved = await atualizarAcompanhamentoDocumentalContrato(
          aprovacaoId,
          payload
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
            descricao: `Contrato assinado em ${formatDateIsoToBR(saved.contrato_assinado_em)}. Vigência iniciada a partir da assinatura (12 meses). Aba Financeiro liberada.`,
          });
        } else if (
          before.contrato_assinado &&
          saved.contrato_assinado &&
          before.contrato_assinado_em !== saved.contrato_assinado_em &&
          saved.contrato_assinado_em
        ) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.edicao,
            registroId: aprovarOrcamento.id,
            registroNome: aprovarOrcamento.numero,
            descricao: `Data de assinatura alterada para ${formatDateIsoToBR(saved.contrato_assinado_em)}. Vigência recalculada (início + 12 meses).`,
          });
        }

        setAprovarAprovacao(saved);
        toast.success("Acompanhamento do contrato salvo.");
        refresh();
        refreshClientes();
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
    [aprovarAprovacao, aprovarOrcamento, auditContext, refresh, refreshClientes]
  );

  const handleSalvarFinanceiro = useCallback(
    async (
      aprovacaoId: string,
      payload: OrcamentoFinanceiroUpdatePayload,
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
          nextPayload = {
            ...nextPayload,
            comprovante_path: uploaded.path,
            comprovante_nome: uploaded.nome,
            comprovante_tipo: uploaded.tipo,
            comprovante_tamanho: uploaded.tamanho,
          };
        }

        // Não apaga comprovante/histórico ao marcar boleto como Não.
        if (!nextPayload.boleto_pago) {
          nextPayload = {
            ...nextPayload,
            comprovante_path: before.comprovante_path,
            comprovante_nome: before.comprovante_nome,
            comprovante_tipo: before.comprovante_tipo,
            comprovante_tamanho: before.comprovante_tamanho,
            boleto_pago_em: before.boleto_pago_em,
          };
        }

        const saved = await atualizarAcompanhamentoFinanceiro(
          aprovacaoId,
          nextPayload
        );

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
            descricao: `Pagamento inicial confirmado em ${formatDateIsoToBR(saved.boleto_pago_em)}. Contrato ativado e liberado para agendamentos.`,
          });
        }

        if (before.boleto_pago && !saved.boleto_pago) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.edicao,
            registroId: aprovarOrcamento.id,
            registroNome: aprovarOrcamento.numero,
            descricao:
              "Pagamento inicial desmarcado. Contrato bloqueado novamente para agendamentos deste vínculo.",
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
        toast.success(
          saved.boleto_pago
            ? "Pagamento confirmado. Cliente liberado para agendamentos."
            : "Acompanhamento financeiro salvo."
        );
        refresh();
        refreshClientes();
      } catch (err) {
        console.error(err);
        const message =
          err instanceof Error ? err.message : "Erro ao salvar financeiro.";
        toast.error(message);
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarAprovacao, aprovarOrcamento, auditContext, refresh, refreshClientes]
  );

  const handleSalvarProcuracao = useCallback(
    async (
      aprovacaoId: string,
      payload: {
        procuracao_status: "ativa" | "inativa";
        observacao_procuracao: string | null;
      }
    ) => {
      if (!aprovarOrcamento) return;
      setAprovarSaving(true);
      try {
        const saved = await salvarOrcamentoProcuracao(
          aprovacaoId,
          aprovarOrcamento.id,
          payload
        );
        setAprovarAprovacao(saved);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.edicao,
          registroId: aprovarOrcamento.id,
          registroNome: aprovarOrcamento.numero,
          descricao: `Procuração marcada como ${payload.procuracao_status} no orçamento ${aprovarOrcamento.numero}.`,
        });
        toast.success(
          payload.procuracao_status === "ativa"
            ? "Procuração ativa. Lista de funcionários liberada."
            : "Procuração salva."
        );
        refreshClientes();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar procuração."
        );
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarOrcamento, auditContext, refreshClientes]
  );

  const handleSalvarFuncionarios = useCallback(
    async (aprovacaoId: string, file: File | null) => {
      if (!aprovarOrcamento || !aprovarAprovacao) return;
      setAprovarSaving(true);
      try {
        const oldPath = aprovarAprovacao.funcionarios_lista_path ?? "";
        const oldNome = aprovarAprovacao.funcionarios_lista_nome ?? "";
        let meta = {
          path: oldPath,
          nome: oldNome,
          tipo: aprovarAprovacao.funcionarios_lista_tipo ?? "",
          tamanho: aprovarAprovacao.funcionarios_lista_tamanho ?? 0,
        };
        if (file) {
          meta = await uploadOrcamentoListaFuncionarios(aprovacaoId, file);
        }
        if (!meta.path) {
          throw new Error("Anexe a lista de funcionários.");
        }
        const saved = await salvarOrcamentoListaFuncionarios(aprovacaoId, meta);
        setAprovarAprovacao(saved);
        setFuncionariosPreviewUrl(
          await obterUrlOrcamentoOnboarding(meta.path)
        );
        if (oldPath && oldPath !== meta.path) {
          await removerArquivoOrcamentoOnboarding(oldPath);
        }
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.edicao,
          registroId: aprovarOrcamento.id,
          registroNome: aprovarOrcamento.numero,
          descricao:
            oldPath && file
              ? `${auditContext.usuarioNome} substituiu a lista de funcionários ${oldNome || "arquivo"} por ${meta.nome}.`
              : `Lista de funcionários anexada: ${meta.nome}.`,
        });
        toast.success("Lista salva. Logo da empresa liberada.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar lista."
        );
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarAprovacao, aprovarOrcamento, auditContext]
  );

  const handleSubstituirFuncionarios = useCallback(
    async (aprovacaoId: string, file: File) => {
      await handleSalvarFuncionarios(aprovacaoId, file);
    },
    [handleSalvarFuncionarios]
  );

  const handleRemoverFuncionarios = useCallback(
    async (aprovacaoId: string) => {
      if (!aprovarOrcamento || !aprovarAprovacao) return;
      setAprovarSaving(true);
      try {
        const oldPath = aprovarAprovacao.funcionarios_lista_path ?? "";
        const oldNome = aprovarAprovacao.funcionarios_lista_nome ?? "arquivo";
        const saved = await removerOrcamentoListaFuncionarios(aprovacaoId);
        setAprovarAprovacao(saved);
        setFuncionariosPreviewUrl(null);
        await removerArquivoOrcamentoOnboarding(oldPath);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.exclusao,
          registroId: aprovarOrcamento.id,
          registroNome: aprovarOrcamento.numero,
          descricao: `${auditContext.usuarioNome} removeu a lista de funcionários ${oldNome}.`,
        });
        toast.success("Lista removida. Anexe uma nova lista para continuar.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao remover lista."
        );
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarAprovacao, aprovarOrcamento, auditContext]
  );

  const handleSalvarLogo = useCallback(
    async (aprovacaoId: string, file: File | null, possuiLogo: boolean) => {
      if (!aprovarOrcamento || !aprovarAprovacao) return;
      setAprovarSaving(true);
      try {
        if (!possuiLogo) {
          const saved = await salvarOrcamentoLogo(aprovacaoId, {
            possui_logo: false,
          });
          setAprovarAprovacao(saved);
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.orcamentos,
            acao: AUDITORIA_ACOES.edicao,
            registroId: aprovarOrcamento.id,
            registroNome: aprovarOrcamento.numero,
            descricao: "Empresa sem logomarca. Etapa Logo concluída sem anexo.",
          });
          toast.success("Etapa Logo salva. Visita técnica liberada.");
          return;
        }

        const oldPath = aprovarAprovacao.logo_path ?? "";
        const oldNome = aprovarAprovacao.logo_nome ?? "";
        let meta = {
          path: oldPath,
          nome: oldNome,
          tipo: aprovarAprovacao.logo_tipo ?? "",
          tamanho: aprovarAprovacao.logo_tamanho ?? 0,
        };
        if (file) {
          meta = await uploadOrcamentoLogo(aprovacaoId, file);
        }
        if (!meta.path) {
          throw new Error("Anexe a logomarca.");
        }
        const saved = await salvarOrcamentoLogo(aprovacaoId, {
          possui_logo: true,
          fileMeta: meta,
        });
        setAprovarAprovacao(saved);
        setLogoPreviewUrl(await obterUrlOrcamentoOnboarding(meta.path));
        if (oldPath && oldPath !== meta.path) {
          await removerArquivoOrcamentoOnboarding(oldPath);
        }
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.edicao,
          registroId: aprovarOrcamento.id,
          registroNome: aprovarOrcamento.numero,
          descricao:
            oldPath && file
              ? `${auditContext.usuarioNome} substituiu a logomarca ${oldNome || "arquivo"} por ${meta.nome}.`
              : `Logomarca anexada: ${meta.nome}.`,
        });
        toast.success("Logo salva. Visita técnica liberada.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar logo."
        );
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarAprovacao, aprovarOrcamento, auditContext]
  );

  const handleSubstituirLogo = useCallback(
    async (aprovacaoId: string, file: File) => {
      await handleSalvarLogo(aprovacaoId, file, true);
    },
    [handleSalvarLogo]
  );

  const handleRemoverLogo = useCallback(
    async (aprovacaoId: string) => {
      if (!aprovarOrcamento || !aprovarAprovacao) return;
      setAprovarSaving(true);
      try {
        const oldPath = aprovarAprovacao.logo_path ?? "";
        const oldNome = aprovarAprovacao.logo_nome ?? "arquivo";
        const saved = await removerOrcamentoLogo(aprovacaoId);
        setAprovarAprovacao(saved);
        setLogoPreviewUrl(null);
        await removerArquivoOrcamentoOnboarding(oldPath);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.exclusao,
          registroId: aprovarOrcamento.id,
          registroNome: aprovarOrcamento.numero,
          descricao: `${auditContext.usuarioNome} removeu a logomarca ${oldNome}.`,
        });
        toast.success(
          "Logomarca removida. Anexe outra ou selecione Não e salve."
        );
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao remover logo."
        );
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarAprovacao, aprovarOrcamento, auditContext]
  );

  const handleSalvarVisita = useCallback(
    async (
      aprovacaoId: string,
      payload: {
        visita_tecnica_necessaria: boolean;
        visita_tecnica_data: string | null;
        visita_tecnica_horario: string | null;
        visita_tecnica_endereco: string | null;
        visita_tecnica_observacoes: string | null;
      }
    ) => {
      if (!aprovarOrcamento) return;
      setAprovarSaving(true);
      try {
        const saved = await salvarOrcamentoVisitaTecnica(aprovacaoId, payload);
        setAprovarAprovacao(saved);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.orcamentos,
          acao: AUDITORIA_ACOES.edicao,
          registroId: aprovarOrcamento.id,
          registroNome: aprovarOrcamento.numero,
          descricao: payload.visita_tecnica_necessaria
            ? `Visita técnica agendada para ${payload.visita_tecnica_data} às ${payload.visita_tecnica_horario}.`
            : "Visita técnica registrada como não necessária.",
        });
        toast.success("Visita técnica salva. Aba Agendamentos liberada.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar visita técnica."
        );
        throw err;
      } finally {
        setAprovarSaving(false);
      }
    },
    [aprovarOrcamento, auditContext]
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
    encerrarContratoTarget,
    alterarResponsavelTarget,
    alterarResponsavelSaving,
    usuariosResponsavel,
    usuariosResponsavelLoading,
    aprovarOpen,
    aprovarMode,
    aprovarOrcamento,
    aprovarAprovacao,
    aprovarSaving,
    usuarioNome: auditContext.usuarioNome,
    podeEncerrarContrato,
    resolvePodeAlterarResponsavel,
    funcionariosPreviewUrl,
    logoPreviewUrl,
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
    closeEncerrarContrato,
    handleConfirmCancelar,
    handleConfirmEncerrarContrato,
    handleOpenAlterarResponsavel,
    closeAlterarResponsavel,
    handleConfirmAlterarResponsavel,
    handleOpenAprovar,
    closeAprovar,
    handleSalvarAprovacao,
    handleAtualizarCondicoesAprovadas,
    handleListarHistoricoCondicoes,
    handleSalvarContrato,
    handleSalvarFinanceiro,
    handleSalvarProcuracao,
    handleSalvarFuncionarios,
    handleSubstituirFuncionarios,
    handleRemoverFuncionarios,
    handleSalvarLogo,
    handleSubstituirLogo,
    handleRemoverLogo,
    handleSalvarVisita,
    handleVerComprovante,
    handleFilterChange,
    clearFilters,
    handleSelectCliente,
  };
}
