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
  abrirCampanhaRiscos,
  criarCampanhaRiscos,
  garantirCodigoAcessoCampanha,
} from "@/services/riscos-campanha.service";
import {
  atualizarParticipanteCampanha,
  criarParticipanteCampanha,
  listarParticipantesCampanha,
  removerParticipanteCampanha,
} from "@/services/riscos-campanha-participantes.service";
import type {
  RiscosCampanhaParticipanteRecord,
  RiscosParticipanteInput,
} from "@/lib/riscos-campanha-participantes";
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
  const [savingCampanha, setSavingCampanha] = useState(false);
  const [savingParticipante, setSavingParticipante] = useState(false);
  const [modalParticipantes, setModalParticipantes] = useState<
    RiscosCampanhaParticipanteRecord[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RiscosPsicossociaisFilters>(
    EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS
  );
  const [mesSelecionado, setMesSelecionado] = useState<YearMonth>(() =>
    resolveInitialMesListagem()
  );
  const [modalProcesso, setModalProcesso] =
    useState<RiscosPsicossociaisProcesso | null>(null);

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
        return buildRiscosPsicossociaisProcesso(
          prev.laudos,
          tracking,
          prev.campanha
        );
      });
      setProcessos((prev) =>
        prev.map((p) => {
          if (
            !tracking ||
            p.implantacao.orcamento.id !== tracking.orcamento_id
          ) {
            return p;
          }
          return buildRiscosPsicossociaisProcesso(
            p.laudos,
            tracking,
            p.campanha
          );
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

  const carregarParticipantes = useCallback(async (campanhaId: string) => {
    try {
      const rows = await listarParticipantesCampanha(campanhaId);
      setModalParticipantes(rows);
    } catch (err) {
      console.error(err);
      setModalParticipantes([]);
    }
  }, []);

  const openProcesso = useCallback(
    (processo: RiscosPsicossociaisProcesso) => {
      setModalProcesso(processo);
      if (processo.campanha?.id) {
        void carregarParticipantes(processo.campanha.id);
      } else {
        setModalParticipantes([]);
      }
    },
    [carregarParticipantes]
  );

  const closeModal = useCallback(() => {
    setModalProcesso(null);
    setModalParticipantes([]);
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

  const handleCriarCampanha = useCallback(
    async (input: {
      dataInicioIso: string;
      dataEncerramentoIso: string;
      quantidadePrevista: number;
    }) => {
      if (!modalProcesso) return;
      const { orcamento } = modalProcesso.implantacao;
      if (modalProcesso.campanha) {
        toast.error("Já existe uma campanha para este processo.");
        return;
      }

      setSavingCampanha(true);
      try {
        const campanha = await criarCampanhaRiscos(
          {
            orcamentoId: orcamento.id,
            clienteId: orcamento.cliente_id ?? null,
            cnpj: orcamento.cliente_cnpj ?? "",
            empresaNome: orcamento.cliente_nome ?? "",
            dataInicioIso: input.dataInicioIso,
            dataEncerramentoIso: input.dataEncerramentoIso,
            quantidadePrevista: input.quantidadePrevista,
          },
          { auditContext }
        );

        setModalProcesso((prev) =>
          prev ? { ...prev, campanha } : prev
        );
        setProcessos((prev) =>
          prev.map((p) =>
            p.implantacao.orcamento.id === orcamento.id
              ? { ...p, campanha }
              : p
          )
        );
        setModalParticipantes([]);
        toast.success("Campanha criada com sucesso.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao criar a campanha."
        );
      } finally {
        setSavingCampanha(false);
      }
    },
    [modalProcesso, auditContext]
  );

  const atualizarCampanhaNoEstado = useCallback(
    (campanha: NonNullable<RiscosPsicossociaisProcesso["campanha"]>) => {
      setModalProcesso((prev) => (prev ? { ...prev, campanha } : prev));
      setProcessos((prev) =>
        prev.map((p) =>
          p.campanha?.id === campanha.id ||
          p.implantacao.orcamento.id === campanha.orcamento_id
            ? { ...p, campanha }
            : p
        )
      );
    },
    []
  );

  const handleAbrirCampanha = useCallback(async () => {
    const campanhaId = modalProcesso?.campanha?.id;
    if (!campanhaId) return;
    setSavingCampanha(true);
    try {
      const campanha = await abrirCampanhaRiscos(campanhaId, { auditContext });
      atualizarCampanhaNoEstado(campanha);
      toast.success("Pesquisa aberta para respostas.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao abrir a pesquisa."
      );
      throw err;
    } finally {
      setSavingCampanha(false);
    }
  }, [modalProcesso, auditContext, atualizarCampanhaNoEstado]);

  const handleGarantirCodigoAcesso = useCallback(
    async (regenerar = false) => {
      const campanhaId = modalProcesso?.campanha?.id;
      if (!campanhaId) return;
      if (
        regenerar &&
        typeof window !== "undefined" &&
        !window.confirm(
          "Gerar um novo código invalida o código anterior. Continuar?"
        )
      ) {
        return;
      }
      setSavingCampanha(true);
      try {
        const campanha = await garantirCodigoAcessoCampanha(campanhaId, {
          regenerar,
        });
        atualizarCampanhaNoEstado(campanha);
        toast.success(
          regenerar
            ? "Novo código de acesso gerado."
            : "Código de acesso disponível."
        );
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao gerar código de acesso."
        );
      } finally {
        setSavingCampanha(false);
      }
    },
    [modalProcesso, atualizarCampanhaNoEstado]
  );

  const handleCriarParticipante = useCallback(
    async (input: RiscosParticipanteInput) => {
      const campanhaId = modalProcesso?.campanha?.id;
      if (!campanhaId) {
        throw new Error("Crie a pesquisa antes de cadastrar participantes.");
      }
      setSavingParticipante(true);
      try {
        await criarParticipanteCampanha(
          { campanhaId, input },
          { auditContext }
        );
        await carregarParticipantes(campanhaId);
        toast.success("Participante cadastrado.");
      } catch (err) {
        console.error(err);
        throw err instanceof Error
          ? err
          : new Error("Erro ao cadastrar participante.");
      } finally {
        setSavingParticipante(false);
      }
    },
    [modalProcesso, auditContext, carregarParticipantes]
  );

  const handleEditarParticipante = useCallback(
    async (participanteId: string, input: RiscosParticipanteInput) => {
      const campanhaId = modalProcesso?.campanha?.id;
      if (!campanhaId) return;
      setSavingParticipante(true);
      try {
        await atualizarParticipanteCampanha(
          { participanteId, input },
          { auditContext }
        );
        await carregarParticipantes(campanhaId);
        toast.success("Participante atualizado.");
      } catch (err) {
        console.error(err);
        throw err instanceof Error
          ? err
          : new Error("Erro ao editar participante.");
      } finally {
        setSavingParticipante(false);
      }
    },
    [modalProcesso, auditContext, carregarParticipantes]
  );

  const handleRemoverParticipante = useCallback(
    async (participanteId: string) => {
      const campanhaId = modalProcesso?.campanha?.id;
      if (!campanhaId) return;
      setSavingParticipante(true);
      try {
        await removerParticipanteCampanha(participanteId, { auditContext });
        await carregarParticipantes(campanhaId);
        toast.success("Participante removido.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao remover participante."
        );
      } finally {
        setSavingParticipante(false);
      }
    },
    [modalProcesso, auditContext, carregarParticipantes]
  );

  return {
    processos: filtrados,
    loading,
    error,
    filters,
    mesSelecionado,
    responsaveis,
    modalProcesso,
    modalParticipantes,
    savingLista,
    savingCampanha,
    savingParticipante,
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
    handleCriarCampanha,
    handleAbrirCampanha,
    handleGarantirCodigoAcesso,
    handleCriarParticipante,
    handleEditarParticipante,
    handleRemoverParticipante,
    refresh,
  };
}
