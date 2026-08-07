"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import {
  EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS,
  buildRiscosPsicossociaisProcesso,
  filterRiscosPsicossociaisProcessos,
  filterRiscosPsicossociaisProcessosPorMes,
  type RiscosPsicossociaisEtapaId,
  type RiscosPsicossociaisFilters,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";
import {
  resolveInitialMesListagem,
  resolveMesParaAno,
  type YearMonth,
} from "@/lib/listagem-meses";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  removerAnexoListaPresenca,
  salvarRecebimentoListaPresenca,
  salvarSolicitacaoListaPresenca,
} from "@/services/riscos-lista-presenca.service";
import { obterUrlRiscosListaPresencaAnexo } from "@/services/riscos-lista-presenca-storage.service";
import { listarProcessosRiscosPsicossociais } from "@/services/riscos-psicossociais.service";

export function useRiscosPsicossociaisPage() {
  const auditContext = useAuditoriaUsuario();
  const [processos, setProcessos] = useState<RiscosPsicossociaisProcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLista, setSavingLista] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RiscosPsicossociaisFilters>(
    EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS
  );
  const [mesSelecionado, setMesSelecionado] = useState<YearMonth>(() =>
    resolveInitialMesListagem()
  );
  const [modalProcesso, setModalProcesso] =
    useState<RiscosPsicossociaisProcesso | null>(null);
  const [modalTab, setModalTab] =
    useState<RiscosPsicossociaisEtapaId>("laudos_sst");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarProcessosRiscosPsicossociais();
      setProcessos(data);
      setModalProcesso((prev) => {
        if (!prev) return null;
        const updated = data.find(
          (p) => p.implantacao.orcamento.id === prev.implantacao.orcamento.id
        );
        return updated ?? prev;
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar processos de Riscos Psicossociais."
      );
      setProcessos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtrados = useMemo(() => {
    const porMes = filterRiscosPsicossociaisProcessosPorMes(
      processos,
      mesSelecionado
    );
    return filterRiscosPsicossociaisProcessos(porMes, filters);
  }, [processos, filters, mesSelecionado]);

  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    for (const p of processos) {
      if (p.implantacao.orcamento.responsavel) {
        set.add(p.implantacao.orcamento.responsavel);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [processos]);

  const applyTrackingToModal = useCallback(
    (tracking: Parameters<typeof buildRiscosPsicossociaisProcesso>[1]) => {
      setModalProcesso((prev) => {
        if (!prev || !tracking) return prev;
        return buildRiscosPsicossociaisProcesso(prev.laudos, tracking);
      });
      setProcessos((prev) =>
        prev.map((p) => {
          if (
            !tracking ||
            p.implantacao.orcamento.id !== tracking.orcamento_id
          ) {
            return p;
          }
          return buildRiscosPsicossociaisProcesso(p.laudos, tracking);
        })
      );
    },
    []
  );

  const handleFilterChange = useCallback(
    <K extends keyof RiscosPsicossociaisFilters>(
      field: K,
      value: RiscosPsicossociaisFilters[K]
    ) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS);
  }, []);

  const handleMesChange = useCallback((mes: YearMonth) => {
    setMesSelecionado(mes);
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setMesSelecionado((prev) => resolveMesParaAno(year, prev.month));
  }, []);

  const openProcesso = useCallback((processo: RiscosPsicossociaisProcesso) => {
    setModalProcesso(processo);
    setModalTab(processo.etapaAtual);
  }, []);

  const closeModal = useCallback(() => {
    setModalProcesso(null);
    setModalTab("laudos_sst");
  }, []);

  const handleSalvarSolicitacaoLista = useCallback(
    async (input: { dataSolicitacaoIso: string; email: string }) => {
      if (!modalProcesso) return;
      const orcamentoId = modalProcesso.implantacao.orcamento.id;
      const antes = modalProcesso.listaPresenca;
      setSavingLista(true);
      try {
        const tracking = await salvarSolicitacaoListaPresenca({
          orcamentoId,
          dataSolicitacaoIso: input.dataSolicitacaoIso,
          email: input.email,
          usuarioNome: auditContext.usuarioNome,
        });
        applyTrackingToModal(tracking);
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.riscos_psicossociais,
          acao: AUDITORIA_ACOES.riscos_lista_solicitada,
          registroId: orcamentoId,
          registroNome: modalProcesso.implantacao.orcamento.numero,
          descricao: `Lista de presença solicitada para ${modalProcesso.implantacao.orcamento.cliente_nome} (${input.email}).`,
          dadosAntes: { ...antes },
          dadosDepois: {
            lista_solicitada: true,
            lista_solicitada_em: input.dataSolicitacaoIso,
            lista_solicitada_email: input.email,
          },
        });
        toast.success("Solicitação da lista salva.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao salvar a solicitação da lista."
        );
      } finally {
        setSavingLista(false);
      }
    },
    [modalProcesso, auditContext, applyTrackingToModal]
  );

  const handleSalvarRecebimentoLista = useCallback(
    async (file: File) => {
      if (!modalProcesso) return;
      const orcamentoId = modalProcesso.implantacao.orcamento.id;
      const antes = modalProcesso.listaPresenca;
      const substituindo = Boolean(antes.lista_anexo_path);
      setSavingLista(true);
      try {
        const tracking = await salvarRecebimentoListaPresenca({
          orcamentoId,
          file,
          usuarioNome: auditContext.usuarioNome,
        });
        applyTrackingToModal(tracking);
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.riscos_psicossociais,
          acao: substituindo
            ? AUDITORIA_ACOES.riscos_lista_anexo_substituido
            : AUDITORIA_ACOES.riscos_lista_recebida,
          registroId: orcamentoId,
          registroNome: modalProcesso.implantacao.orcamento.numero,
          descricao: substituindo
            ? `Anexo da lista de presença substituído por ${file.name}.`
            : `Lista de presença recebida e anexada (${file.name}).`,
          dadosAntes: { ...antes },
          dadosDepois: {
            lista_recebida: true,
            lista_anexo_nome: file.name,
            lista_anexo_path: tracking.lista_anexo_path,
          },
        });
        toast.success(
          substituindo
            ? "Anexo substituído com sucesso."
            : "Recebimento da lista salvo."
        );
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao salvar o recebimento da lista."
        );
      } finally {
        setSavingLista(false);
      }
    },
    [modalProcesso, auditContext, applyTrackingToModal]
  );

  const handleRemoverAnexoLista = useCallback(async () => {
    if (!modalProcesso) return;
    const orcamentoId = modalProcesso.implantacao.orcamento.id;
    const antes = modalProcesso.listaPresenca;
    if (!antes.lista_anexo_path) return;

    const ok = window.confirm(
      "Remover o anexo da lista de presença? A etapa voltará a ficar pendente e Cadastro da Empresa será bloqueado."
    );
    if (!ok) return;

    setSavingLista(true);
    try {
      const tracking = await removerAnexoListaPresenca({
        orcamentoId,
        usuarioNome: auditContext.usuarioNome,
      });
      applyTrackingToModal(tracking);
      await registrarAuditoria({
        usuarioId: auditContext.usuarioId,
        usuarioNome: auditContext.usuarioNome,
        usuarioEmail: auditContext.usuarioEmail,
        modulo: AUDITORIA_MODULOS.riscos_psicossociais,
        acao: AUDITORIA_ACOES.riscos_lista_anexo_removido,
        registroId: orcamentoId,
        registroNome: modalProcesso.implantacao.orcamento.numero,
        descricao: `Anexo da lista de presença removido (${antes.lista_anexo_nome ?? "arquivo"}).`,
        dadosAntes: { ...antes },
        dadosDepois: {
          lista_recebida: false,
          lista_anexo_path: null,
        },
      });
      toast.success("Anexo removido. Lista de Presença pendente.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao remover o anexo."
      );
    } finally {
      setSavingLista(false);
    }
  }, [modalProcesso, auditContext, applyTrackingToModal]);

  const handleVisualizarAnexoLista = useCallback(async () => {
    const path = modalProcesso?.listaPresenca.lista_anexo_path;
    if (!path) {
      toast.error("Nenhum anexo disponível.");
      return;
    }
    try {
      const url = await obterUrlRiscosListaPresencaAnexo(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível abrir o anexo.");
    }
  }, [modalProcesso]);

  return {
    processos: filtrados,
    loading,
    error,
    filters,
    mesSelecionado,
    responsaveis,
    modalProcesso,
    modalTab,
    savingLista,
    setModalTab,
    handleFilterChange,
    clearFilters,
    handleMesChange,
    handleYearChange,
    openProcesso,
    closeModal,
    handleSalvarSolicitacaoLista,
    handleSalvarRecebimentoLista,
    handleRemoverAnexoLista,
    handleVisualizarAnexoLista,
    refresh,
  };
}
