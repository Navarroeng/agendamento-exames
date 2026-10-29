"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { useServicosSstList } from "@/hooks/useServicosSstList";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS, type AuditoriaAcao } from "@/lib/auditoria";
import { ORCAMENTO_JA_APROVADO_MSG } from "@/lib/orcamento-acoes";
import type {
  OrcamentoAprovacaoFormValues,
  OrcamentoAprovacaoRecord,
  OrcamentoContratoDocumentalUpdatePayload,
  OrcamentoFinanceiroUpdatePayload,
} from "@/lib/orcamento-aprovacao";
import {
  buildCondicoesComerciaisFromForm,
  formatCondicaoAprovada,
  formatPagamentoFromCondicoes,
} from "@/lib/orcamento-aprovacao";
import { parseMoney } from "@/lib/money";
import type { OrcamentoComItens } from "@/lib/orcamento-types";
import type { OrcamentoEtapaId } from "@/lib/orcamento-etapas";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  atualizarAcompanhamentoDocumentalContrato,
  atualizarAcompanhamentoFinanceiro,
  atualizarCondicoesAprovadas,
  buscarAprovacaoPorOrcamentoId,
  listarHistoricoCondicoesAprovadas,
} from "@/services/orcamento-aprovacao.service";
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
import { uploadOrcamentoComprovantePagamento, obterUrlOrcamentoComprovante } from "@/services/orcamento-comprovante.service";
import { buscarOrcamentoComItens } from "@/services/orcamento.service";
import type { ImplantacaoTreinamentoEventoRecord, ImplantacaoTreinamentoRecord, ImplantacaoTreinamentoSavePayload } from "@/lib/implantacao-treinamento";
import {
  buscarTreinamentoPorAprovacaoId,
  listarEventosTreinamento,
  salvarImplantacaoTreinamento,
} from "@/services/implantacao-treinamento.service";
import { IMPLANTACAO_TREINAMENTO_STATUS_LABELS } from "@/lib/implantacao-treinamento";

export function useOrcamentoProcessoModal(params: {
  onChanged?: (opts?: { silent?: boolean }) => void;
}) {
  const onChanged = params.onChanged;
  const auditContext = useAuditoriaUsuario();
  const { servicos } = useServicosSstList();

  const [actionLoading, setActionLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOrcamento, setModalOrcamento] = useState<OrcamentoComItens | null>(
    null
  );
  const [modalAprovacao, setModalAprovacao] =
    useState<OrcamentoAprovacaoRecord | null>(null);
  const [modalInitialTab, setModalInitialTab] =
    useState<OrcamentoEtapaId | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [funcionariosPreviewUrl, setFuncionariosPreviewUrl] = useState<
    string | null
  >(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [modalTreinamento, setModalTreinamento] =
    useState<ImplantacaoTreinamentoRecord | null>(null);
  const [modalTreinamentoEventos, setModalTreinamentoEventos] = useState<
    ImplantacaoTreinamentoEventoRecord[]
  >([]);

  const openProcesso = useCallback(
    async (orcamentoId: string, tab: OrcamentoEtapaId | null) => {
      setActionLoading(true);
      try {
        const orcamento = await buscarOrcamentoComItens(orcamentoId);
        if (!orcamento || orcamento.id !== orcamentoId) {
          toast.error("Orçamento não encontrado.");
          return;
        }
        const aprovacao = await buscarAprovacaoPorOrcamentoId(orcamentoId);
        setModalOrcamento(orcamento);
        setModalAprovacao(aprovacao);
        setModalInitialTab(tab);
        setFuncionariosPreviewUrl(null);
        setLogoPreviewUrl(null);
        setModalTreinamento(null);
        setModalTreinamentoEventos([]);
        if (aprovacao?.id) {
          try {
            const treino = await buscarTreinamentoPorAprovacaoId(aprovacao.id);
            setModalTreinamento(treino);
            if (treino) {
              setModalTreinamentoEventos(
                await listarEventosTreinamento(treino.id)
              );
            }
          } catch (err) {
            console.error(err);
          }
        }
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
        setModalOpen(true);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao abrir processo de implantação.");
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  const closeModal = useCallback(() => {
    if (modalSaving) return;
    setModalOpen(false);
    setModalOrcamento(null);
    setModalAprovacao(null);
    setModalInitialTab(null);
    setFuncionariosPreviewUrl(null);
    setLogoPreviewUrl(null);
    setModalTreinamento(null);
    setModalTreinamentoEventos([]);
    onChanged?.({ silent: true });
  }, [modalSaving, onChanged]);

  const handleSalvarAprovacao = useCallback(
    async (_form: OrcamentoAprovacaoFormValues) => {
      toast.error(ORCAMENTO_JA_APROVADO_MSG);
    },
    []
  );

  const handleAtualizarCondicoesAprovadas = useCallback(
    async (formValues: OrcamentoAprovacaoFormValues) => {
      if (!modalOrcamento || !modalAprovacao) return;
      setModalSaving(true);
      try {
        const before = modalAprovacao;
        const payload = buildCondicoesComerciaisFromForm(
          formValues,
          parseMoney,
          modalOrcamento.modalidade,
          modalOrcamento.orcamento_itens
        );
        const { aprovacao: saved, historico } = await atualizarCondicoesAprovadas(
          modalAprovacao.id,
          payload,
          auditContext.usuarioNome
        );

        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.implantacao_clientes,
          acao: AUDITORIA_ACOES.edicao,
          registroId: modalOrcamento.id,
          registroNome: modalOrcamento.numero,
          descricao: `${auditContext.usuarioNome} alterou as condições finais aprovadas do orçamento ${modalOrcamento.numero}.`,
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

        setModalAprovacao(saved);
        toast.success(
          "Condições aprovadas atualizadas. Financeiro, Contrato e Clientes sincronizados."
        );
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao atualizar condições aprovadas."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalAprovacao, modalOrcamento, onChanged]
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
      if (!modalOrcamento || !modalAprovacao) return;
      setModalSaving(true);
      try {
        const before = modalAprovacao;
        const saved = await atualizarAcompanhamentoDocumentalContrato(
          aprovacaoId,
          payload
        );

        if (
          !before.contrato_enviado &&
          saved.contrato_enviado &&
          saved.contrato_enviado_em
        ) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.implantacao_clientes,
            acao: AUDITORIA_ACOES.envio,
            registroId: modalOrcamento.id,
            registroNome: modalOrcamento.numero,
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
            modulo: AUDITORIA_MODULOS.implantacao_clientes,
            acao: AUDITORIA_ACOES.edicao,
            registroId: modalOrcamento.id,
            registroNome: modalOrcamento.numero,
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
            modulo: AUDITORIA_MODULOS.implantacao_clientes,
            acao: AUDITORIA_ACOES.edicao,
            registroId: modalOrcamento.id,
            registroNome: modalOrcamento.numero,
            descricao: `Data de assinatura alterada para ${formatDateIsoToBR(saved.contrato_assinado_em)}. Vigência recalculada (início + 12 meses).`,
          });
        }

        setModalAprovacao(saved);
        toast.success("Acompanhamento do contrato salvo.");
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar acompanhamento."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalAprovacao, modalOrcamento, onChanged]
  );

  const handleSalvarFinanceiro = useCallback(
    async (
      aprovacaoId: string,
      payload: OrcamentoFinanceiroUpdatePayload,
      file: File | null
    ) => {
      if (!modalOrcamento || !modalAprovacao) return;
      setModalSaving(true);
      try {
        const before = modalAprovacao;
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
            modulo: AUDITORIA_MODULOS.implantacao_clientes,
            acao: AUDITORIA_ACOES.edicao,
            registroId: modalOrcamento.id,
            registroNome: modalOrcamento.numero,
            descricao: `Vencimento do boleto inicial registrado para ${formatDateIsoToBR(saved.boleto_vencimento)}.`,
          });
        }

        if (!before.boleto_pago && saved.boleto_pago) {
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.implantacao_clientes,
            acao: AUDITORIA_ACOES.edicao,
            registroId: modalOrcamento.id,
            registroNome: modalOrcamento.numero,
            descricao:
              "Pagamento do boleto confirmado. Contrato ativado e liberado para agendamentos.",
          });
        }

        setModalAprovacao(saved);
        toast.success("Acompanhamento financeiro salvo.");
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar financeiro."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalAprovacao, modalOrcamento, onChanged]
  );

  const handleSalvarProcuracao = useCallback(
    async (
      aprovacaoId: string,
      payload: {
        procuracao_status: "pendente" | "ativa" | "nao_necessaria";
        observacao_procuracao: string | null;
      }
    ) => {
      if (!modalOrcamento) return;
      setModalSaving(true);
      try {
        const before = modalAprovacao;
        const saved = await salvarOrcamentoProcuracao(
          aprovacaoId,
          modalOrcamento.id,
          {
            ...payload,
            atualizadoPor: auditContext.usuarioNome,
          }
        );
        setModalAprovacao(saved);

        const label =
          payload.procuracao_status === "ativa"
            ? "Ativa"
            : payload.procuracao_status === "nao_necessaria"
              ? "Não necessária"
              : "Pendente";
        const clienteNome = modalOrcamento.cliente_nome?.trim() || "cliente";
        let descricao = `${auditContext.usuarioNome} definiu a procuração do cliente ${clienteNome} como ${label} (orçamento ${modalOrcamento.numero}).`;
        if (
          payload.procuracao_status === "nao_necessaria" &&
          payload.observacao_procuracao
        ) {
          descricao += `\nJustificativa:\n${payload.observacao_procuracao}`;
        }
        if (
          before &&
          (before.procuracao_status === "ativa" ||
            before.procuracao_status === "nao_necessaria") &&
          payload.procuracao_status === "pendente"
        ) {
          descricao = `${auditContext.usuarioNome} reabriu a etapa de procuração do orçamento ${modalOrcamento.numero} (status Pendente). Próximas etapas bloqueadas novamente.`;
        }

        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.implantacao_clientes,
          acao: AUDITORIA_ACOES.procuracao_alterada,
          registroId: modalOrcamento.id,
          registroNome: modalOrcamento.numero,
          descricao,
          dadosAntes: before
            ? {
                procuracao_status: before.procuracao_status,
                observacao_procuracao: before.observacao_procuracao,
              }
            : null,
          dadosDepois: {
            procuracao_status: payload.procuracao_status,
            observacao_procuracao: payload.observacao_procuracao,
          },
        });
        toast.success(
          payload.procuracao_status === "pendente"
            ? "Procuração pendente. Próximas etapas bloqueadas."
            : payload.procuracao_status === "ativa"
              ? "Procuração ativa. Lista de funcionários liberada."
              : "Procuração marcada como não necessária. Lista de funcionários liberada."
        );
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar procuração."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalAprovacao, modalOrcamento, onChanged]
  );

  const handleSalvarFuncionarios = useCallback(
    async (aprovacaoId: string, file: File | null) => {
      if (!modalOrcamento || !modalAprovacao) return;
      setModalSaving(true);
      try {
        const oldPath = modalAprovacao.funcionarios_lista_path ?? "";
        const oldNome = modalAprovacao.funcionarios_lista_nome ?? "";
        let meta = {
          path: oldPath,
          nome: oldNome,
          tipo: modalAprovacao.funcionarios_lista_tipo ?? "",
          tamanho: modalAprovacao.funcionarios_lista_tamanho ?? 0,
        };
        if (file) {
          meta = await uploadOrcamentoListaFuncionarios(aprovacaoId, file);
        }
        if (!meta.path) {
          throw new Error("Anexe a lista de funcionários.");
        }
        const saved = await salvarOrcamentoListaFuncionarios(aprovacaoId, meta);
        setModalAprovacao(saved);
        setFuncionariosPreviewUrl(await obterUrlOrcamentoOnboarding(meta.path));
        if (oldPath && oldPath !== meta.path) {
          await removerArquivoOrcamentoOnboarding(oldPath);
        }
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.implantacao_clientes,
          acao: AUDITORIA_ACOES.edicao,
          registroId: modalOrcamento.id,
          registroNome: modalOrcamento.numero,
          descricao:
            oldPath && file
              ? `${auditContext.usuarioNome} substituiu a lista de funcionários ${oldNome || "arquivo"} por ${meta.nome}.`
              : `Lista de funcionários anexada: ${meta.nome}.`,
        });
        toast.success("Lista salva. Logo da empresa liberada.");
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar lista."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalAprovacao, modalOrcamento, onChanged]
  );

  const handleSubstituirFuncionarios = useCallback(
    async (aprovacaoId: string, file: File) => {
      await handleSalvarFuncionarios(aprovacaoId, file);
    },
    [handleSalvarFuncionarios]
  );

  const handleRemoverFuncionarios = useCallback(
    async (aprovacaoId: string) => {
      if (!modalOrcamento || !modalAprovacao) return;
      setModalSaving(true);
      try {
        const oldPath = modalAprovacao.funcionarios_lista_path ?? "";
        const oldNome = modalAprovacao.funcionarios_lista_nome ?? "arquivo";
        const saved = await removerOrcamentoListaFuncionarios(aprovacaoId);
        setModalAprovacao(saved);
        setFuncionariosPreviewUrl(null);
        await removerArquivoOrcamentoOnboarding(oldPath);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.implantacao_clientes,
          acao: AUDITORIA_ACOES.exclusao,
          registroId: modalOrcamento.id,
          registroNome: modalOrcamento.numero,
          descricao: `${auditContext.usuarioNome} removeu a lista de funcionários ${oldNome}.`,
        });
        toast.success("Lista removida. Anexe uma nova lista para continuar.");
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao remover lista."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalAprovacao, modalOrcamento, onChanged]
  );

  const handleSalvarLogo = useCallback(
    async (aprovacaoId: string, file: File | null, possuiLogo: boolean) => {
      if (!modalOrcamento || !modalAprovacao) return;
      setModalSaving(true);
      try {
        if (!possuiLogo) {
          const saved = await salvarOrcamentoLogo(aprovacaoId, {
            possui_logo: false,
          });
          setModalAprovacao(saved);
          await registrarAuditoria({
            ...auditContext,
            modulo: AUDITORIA_MODULOS.implantacao_clientes,
            acao: AUDITORIA_ACOES.edicao,
            registroId: modalOrcamento.id,
            registroNome: modalOrcamento.numero,
            descricao: "Empresa sem logomarca. Etapa Logo concluída sem anexo.",
          });
          toast.success("Etapa Logo salva. Visita técnica liberada.");
          onChanged?.();
          return;
        }

        const oldPath = modalAprovacao.logo_path ?? "";
        const oldNome = modalAprovacao.logo_nome ?? "";
        let meta = {
          path: oldPath,
          nome: oldNome,
          tipo: modalAprovacao.logo_tipo ?? "",
          tamanho: modalAprovacao.logo_tamanho ?? 0,
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
        setModalAprovacao(saved);
        setLogoPreviewUrl(await obterUrlOrcamentoOnboarding(meta.path));
        if (oldPath && oldPath !== meta.path) {
          await removerArquivoOrcamentoOnboarding(oldPath);
        }
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.implantacao_clientes,
          acao: AUDITORIA_ACOES.edicao,
          registroId: modalOrcamento.id,
          registroNome: modalOrcamento.numero,
          descricao:
            oldPath && file
              ? `${auditContext.usuarioNome} substituiu a logomarca ${oldNome || "arquivo"} por ${meta.nome}.`
              : `Logomarca anexada: ${meta.nome}.`,
        });
        toast.success("Logo salva. Visita técnica liberada.");
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar logo."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalAprovacao, modalOrcamento, onChanged]
  );

  const handleSubstituirLogo = useCallback(
    async (aprovacaoId: string, file: File) => {
      await handleSalvarLogo(aprovacaoId, file, true);
    },
    [handleSalvarLogo]
  );

  const handleRemoverLogo = useCallback(
    async (aprovacaoId: string) => {
      if (!modalOrcamento || !modalAprovacao) return;
      setModalSaving(true);
      try {
        const oldPath = modalAprovacao.logo_path ?? "";
        const oldNome = modalAprovacao.logo_nome ?? "arquivo";
        const saved = await removerOrcamentoLogo(aprovacaoId);
        setModalAprovacao(saved);
        setLogoPreviewUrl(null);
        await removerArquivoOrcamentoOnboarding(oldPath);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.implantacao_clientes,
          acao: AUDITORIA_ACOES.exclusao,
          registroId: modalOrcamento.id,
          registroNome: modalOrcamento.numero,
          descricao: `${auditContext.usuarioNome} removeu a logomarca ${oldNome}.`,
        });
        toast.success(
          "Logomarca removida. Anexe outra ou selecione Não e salve."
        );
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao remover logo."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalAprovacao, modalOrcamento, onChanged]
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
      if (!modalOrcamento) return;
      setModalSaving(true);
      try {
        const saved = await salvarOrcamentoVisitaTecnica(aprovacaoId, payload);
        setModalAprovacao(saved);
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.implantacao_clientes,
          acao: AUDITORIA_ACOES.edicao,
          registroId: modalOrcamento.id,
          registroNome: modalOrcamento.numero,
          descricao: payload.visita_tecnica_necessaria
            ? `Visita técnica agendada para ${payload.visita_tecnica_data} às ${payload.visita_tecnica_horario}.`
            : "Visita técnica registrada como não necessária.",
        });
        toast.success("Visita técnica salva. Aba Agendamentos liberada.");
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar visita técnica."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalOrcamento, onChanged]
  );

  const handleSalvarTreinamento = useCallback(
    async (
      aprovacaoId: string,
      payload: ImplantacaoTreinamentoSavePayload
    ) => {
      if (!modalOrcamento) return;
      setModalSaving(true);
      try {
        const before = modalTreinamento;
        const saved = await salvarImplantacaoTreinamento({
          orcamentoId: modalOrcamento.id,
          aprovacaoId,
          payload,
          usuarioNome: auditContext.usuarioNome,
        });
        setModalTreinamento(saved);
        setModalTreinamentoEventos(await listarEventosTreinamento(saved.id));

        let acao: AuditoriaAcao = AUDITORIA_ACOES.edicao;
        let descricao = `Agendamento de treinamento atualizado (${IMPLANTACAO_TREINAMENTO_STATUS_LABELS[saved.status]}).`;
        if (!before) {
          acao = AUDITORIA_ACOES.criacao;
          descricao = `Agendamento de treinamento criado (${IMPLANTACAO_TREINAMENTO_STATUS_LABELS[saved.status]}).`;
        } else if (saved.status === "cancelado" && before.status !== "cancelado") {
          acao = AUDITORIA_ACOES.treinamento_cancelado;
          descricao = `Treinamento cancelado. Motivo: ${saved.motivo_cancelamento ?? "—"}.`;
        } else if (saved.status === "reagendado" || (before.data_treinamento && before.data_treinamento !== saved.data_treinamento)) {
          acao = AUDITORIA_ACOES.treinamento_reagendado;
          descricao = `Treinamento reagendado para ${saved.data_treinamento ?? "—"} ${saved.horario_inicio ?? ""}.`;
        } else if (saved.status === "confirmado" && before.status !== "confirmado") {
          acao = AUDITORIA_ACOES.treinamento_confirmado;
          descricao = "Treinamento confirmado.";
        } else if (saved.status === "realizado" && before.status !== "realizado") {
          acao = AUDITORIA_ACOES.treinamento_realizado;
          descricao = "Treinamento marcado como realizado.";
        } else if (saved.status === "agendado") {
          acao = AUDITORIA_ACOES.treinamento_agendado;
          descricao = `Treinamento agendado para ${saved.data_treinamento ?? "—"} ${saved.horario_inicio ?? ""}.`;
        }

        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.implantacao_clientes,
          acao,
          registroId: modalOrcamento.id,
          registroNome: modalOrcamento.numero,
          descricao,
          dadosAntes: before
            ? {
                status: before.status,
                data: before.data_treinamento,
                horario: before.horario_inicio,
              }
            : null,
          dadosDepois: {
            status: saved.status,
            data: saved.data_treinamento,
            horario: saved.horario_inicio,
          },
        });
        toast.success("Agendamento do treinamento salvo.");
        onChanged?.();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao salvar agendamento do treinamento."
        );
        throw err;
      } finally {
        setModalSaving(false);
      }
    },
    [auditContext, modalOrcamento, modalTreinamento, onChanged]
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

  const handleAprovacaoAtualizada = useCallback(
    (saved: OrcamentoAprovacaoRecord) => {
      setModalAprovacao(saved);
      onChanged?.({ silent: true });
    },
    [onChanged]
  );

  return {
    actionLoading,
    modalOpen,
    modalOrcamento,
    modalAprovacao,
    modalInitialTab,
    modalSaving,
    servicos,
    usuarioNome: auditContext.usuarioNome,
    funcionariosPreviewUrl,
    logoPreviewUrl,
    modalTreinamento,
    modalTreinamentoEventos,
    openProcesso,
    closeModal,
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
    handleSalvarTreinamento,
    handleVerComprovante,
    handleAprovacaoAtualizada,
  };
}
