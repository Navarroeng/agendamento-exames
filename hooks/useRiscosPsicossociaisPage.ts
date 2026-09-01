"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuditoriaUsuario, useAuth } from "@/contexts/AuthContext";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import { isPerfilAdmin } from "@/lib/permissions";
import {
  podeAbrirPesquisaRiscos,
  RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG,
} from "@/lib/riscos-abrir-pesquisa-permissao";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import {
  DEFAULT_RISCOS_LISTAGEM_STATUS,
  EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS,
  buildRiscosPsicossociaisProcesso,
  filterRiscosPsicossociaisProcessos,
  filterRiscosPsicossociaisProcessosPorMes,
  filterRiscosPsicossociaisProcessosPorStatus,
  isRiscosListagemStatusMarcado,
  labelRiscosListagemStatusFiltro,
  resolverOrdenacaoListagemRiscos,
  sortRiscosPsicossociaisProcessosListagem,
  toggleRiscosListagemStatusFiltro,
  withRiscosProgressoAtualizado,
  type RiscosPsicossociaisFilters,
  type RiscosPsicossociaisListagemStatus,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";
import { mesclarCampanhaListagemModal } from "@/lib/riscos-campanha-origem";
import {
  CampanhaCicloExistenteError,
  MSG_CAMPANHA_CICLO_EXISTENTE,
} from "@/lib/riscos-campanha-ciclo";
import { identidadeCancelamentoProcessoRiscos } from "@/lib/riscos-processo-cancelamento";
import {
  resolveInitialMesListagem,
  resolveMesParaAno,
  type YearMonth,
} from "@/lib/listagem-meses";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  abrirCampanhaRiscos,
  buscarCampanhaPorCodigoPublico,
  cancelarProcessoListagemRiscos,
  criarCampanhaRiscos,
  exclusaoDefinitivaDisponivelNoClient,
  excluirCampanhaRiscos,
  encerrarCampanhaRiscos,
  prorrogarPrazoCampanhaRiscos,
  reabrirCampanhaRiscos,
  editarPeriodoCampanhaRiscos,
  garantirCodigoAcessoCampanha,
  removerProcessoRiscos,
} from "@/services/riscos-campanha.service";
import {
  atualizarParticipanteCampanha,
  confirmarImportacaoParticipantesCampanha,
  criarParticipanteCampanha,
  listarParticipantesCampanha,
  parseArquivoImportacaoParticipantes,
  validarImportacaoParticipantesCampanha,
} from "@/services/riscos-campanha-participantes.service";
import type {
  RiscosCampanhaParticipanteRecord,
  RiscosParticipanteInput,
} from "@/lib/riscos-campanha-participantes";
import {
  campanhaPermiteImportacaoParticipantes,
  type LinhaAvaliacaoImportacao,
  type SituacaoImportacaoParticipante,
} from "@/lib/riscos-participantes-excel";
import { normalizeCpfDigits } from "@/lib/cpf";
import { isArquivoExcelListaPresenca } from "@/lib/riscos-lista-presenca";
import {
  mensagemErroImportacaoLista,
  mensagemSucessoRecebimentoComImportacao,
  podeConcluirRecebimentoComExcel,
  resumirAvaliacaoImportacaoLista,
} from "@/lib/riscos-lista-presenca-importacao";
import {
  removerAnexoListaPresenca,
  salvarRecebimentoListaPresenca,
  salvarSolicitacaoListaPresenca,
} from "@/services/riscos-lista-presenca.service";
import { obterUrlRiscosListaPresencaAnexo } from "@/services/riscos-lista-presenca-storage.service";
import {
  removerLogoCampanha,
  salvarLogoCampanha,
  resolverUrlLogoCampanhaOuEmpresa,
} from "@/services/riscos-campanha-logo.service";
import { buscarRelatorioCampanha } from "@/services/riscos-relatorio.service";
import { listarProcessosRiscosPsicossociais } from "@/services/riscos-psicossociais.service";

export function useRiscosPsicossociaisPage() {
  const auditContext = useAuditoriaUsuario();
  const { profile } = useAuth();
  const isAdmin = isPerfilAdmin(profile?.perfil);
  const podeAutorizarAbrirPesquisa = podeAbrirPesquisaRiscos({
    perfil: profile?.perfil,
    email: profile?.email,
  });
  const [processos, setProcessos] = useState<RiscosPsicossociaisProcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLista, setSavingLista] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingCampanha, setSavingCampanha] = useState(false);
  const [savingParticipante, setSavingParticipante] = useState(false);
  const [savingRemoverProcesso, setSavingRemoverProcesso] = useState(false);
  const [processoParaRemover, setProcessoParaRemover] =
    useState<RiscosPsicossociaisProcesso | null>(null);
  const [processoParaCancelar, setProcessoParaCancelar] =
    useState<RiscosPsicossociaisProcesso | null>(null);
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
  const [statusListagem, setStatusListagem] = useState<
    RiscosPsicossociaisListagemStatus[]
  >(() => [...DEFAULT_RISCOS_LISTAGEM_STATUS]);
  const [modalProcesso, setModalProcesso] =
    useState<RiscosPsicossociaisProcesso | null>(null);
  /** false até o status da campanha ser relido do banco (não usar listagem stale). */
  const [campanhaStatusSincronizado, setCampanhaStatusSincronizado] =
    useState(false);
  const [relatorioViewerOpen, setRelatorioViewerOpen] = useState(false);
  const [relatorioViewer, setRelatorioViewer] =
    useState<RiscosRelatorioRecord | null>(null);
  const [relatorioViewerLogoUrl, setRelatorioViewerLogoUrl] = useState<
    string | null
  >(null);
  const [relatorioViewerCnpj, setRelatorioViewerCnpj] = useState<string | null>(
    null
  );
  const [relatorioViewerCampanhaStatus, setRelatorioViewerCampanhaStatus] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarProcessosRiscosPsicossociais();
      setProcessos(data);
      setModalProcesso((prev) => {
        if (!prev) return null;
        const updated =
          data.find((p) => p.processoKey === prev.processoKey) ??
          (prev.campanha?.id
            ? data.find((p) => p.campanha?.id === prev.campanha?.id)
            : undefined);
        if (!updated) return prev;
        if (
          updated.status === "cancelado" ||
          updated.etapaAtual === "cancelado"
        ) {
          return { ...updated, processoKey: prev.processoKey };
        }
        // Modal aberto: status da campanha só vem de sync/abrir/encerrar (API),
        // nunca volta a ser o da listagem (pode estar stale/otimista).
        if (prev.campanha?.id) {
          const campanha = mesclarCampanhaListagemModal(
            updated.campanha,
            prev.campanha
          );
          return withRiscosProgressoAtualizado(
            { ...updated, processoKey: prev.processoKey },
            { campanha }
          );
        }
        return { ...updated, processoKey: prev.processoKey };
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
    const porBusca = filterRiscosPsicossociaisProcessos(porMes, filters);
    const porStatus = filterRiscosPsicossociaisProcessosPorStatus(
      porBusca,
      statusListagem
    );
    return sortRiscosPsicossociaisProcessosListagem(
      porStatus,
      resolverOrdenacaoListagemRiscos(statusListagem)
    );
  }, [processos, filters, mesSelecionado, statusListagem]);

  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    for (const p of processos) {
      const r =
        p.campanha?.responsavel?.trim() ||
        p.implantacao.orcamento.responsavel?.trim();
      if (r) set.add(r);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [processos]);

  const applyTrackingToModal = useCallback(
    (tracking: Parameters<typeof buildRiscosPsicossociaisProcesso>[1]) => {
      setModalProcesso((prev) => {
        if (!prev || !tracking) return prev;
        const next = buildRiscosPsicossociaisProcesso(
          prev.laudos,
          tracking,
          prev.campanha,
          {
            origem: prev.origem,
            participantesCadastrados: prev.participantesCadastrados,
            participantesRespondidos: prev.participantesRespondidos,
            relatorioGerado: prev.relatorioGerado,
          }
        );
        return { ...next, processoKey: prev.processoKey };
      });
      setProcessos((prev) =>
        prev.map((p) => {
          if (!tracking) return p;
          const matchManual =
            p.exigeLaudosSst === false &&
            p.campanha?.id &&
            tracking.orcamento_id === p.campanha.id;
          const matchOrcamento =
            p.exigeLaudosSst !== false &&
            p.implantacao.orcamento.id === tracking.orcamento_id;
          if (!matchManual && !matchOrcamento) return p;
          const next = buildRiscosPsicossociaisProcesso(
            p.laudos,
            tracking,
            p.campanha,
            {
              origem: p.origem,
              participantesCadastrados: p.participantesCadastrados,
              participantesRespondidos: p.participantesRespondidos,
              relatorioGerado: p.relatorioGerado,
            }
          );
          return { ...next, processoKey: p.processoKey };
        })
      );
    },
    []
  );

  const listaTargetFromProcesso = useCallback(
    (processo: RiscosPsicossociaisProcesso) => {
      if (!processo.exigeLaudosSst && processo.campanha?.id) {
        return { campanhaId: processo.campanha.id };
      }
      return { orcamentoId: processo.implantacao.orcamento.id };
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

  const handleStatusListagemChange = useCallback(
    (statuses: RiscosPsicossociaisListagemStatus[]) => {
      setStatusListagem(statuses);
    },
    []
  );

  const toggleStatusListagem = useCallback(
    (value: RiscosPsicossociaisListagemStatus) => {
      setStatusListagem((prev) => toggleRiscosListagemStatusFiltro(prev, value));
    },
    []
  );

  const carregarParticipantes = useCallback(async (campanhaId: string) => {
    try {
      const rows = await listarParticipantesCampanha(campanhaId);
      setModalParticipantes(rows);
      setModalProcesso((prev) =>
        prev && prev.campanha?.id === campanhaId
          ? withRiscosProgressoAtualizado(prev, { participantes: rows })
          : prev
      );
      setProcessos((prev) =>
        prev.map((p) =>
          p.campanha?.id === campanhaId
            ? withRiscosProgressoAtualizado(p, { participantes: rows })
            : p
        )
      );
    } catch (err) {
      console.error(err);
      setModalParticipantes([]);
    }
  }, []);

  const atualizarCampanhaNoEstado = useCallback(
    (campanha: NonNullable<RiscosPsicossociaisProcesso["campanha"]>) => {
      setModalProcesso((prev) =>
        prev ? withRiscosProgressoAtualizado(prev, { campanha }) : prev
      );
      setProcessos((prev) =>
        prev.map((p) =>
          p.campanha?.id === campanha.id ||
          (campanha.orcamento_id != null &&
            p.implantacao.orcamento.id === campanha.orcamento_id)
            ? withRiscosProgressoAtualizado(p, { campanha })
            : p
        )
      );
    },
    []
  );

  const sincronizarCampanhaDoBanco = useCallback(
    async (codigoPublico: string, statusListagem?: string) => {
      const fresh = await buscarCampanhaPorCodigoPublico(codigoPublico);
      if (!fresh) return null;
      atualizarCampanhaNoEstado(fresh);
      if (statusListagem && statusListagem !== fresh.status) {
        toast.message(
          `Status sincronizado com o banco: ${fresh.status === "em_preparacao" ? "Em preparação" : fresh.status === "aberta" ? "Aberta" : fresh.status === "cancelada" ? "Cancelada" : "Encerrada"} (antes na tela: ${statusListagem}).`
        );
      }
      return fresh;
    },
    [atualizarCampanhaNoEstado]
  );

  const openProcesso = useCallback(
    (processo: RiscosPsicossociaisProcesso) => {
      setCampanhaStatusSincronizado(!processo.campanha);
      setModalProcesso(processo);
      if (!processo.campanha?.id || !processo.campanha.codigo_publico) {
        setModalParticipantes([]);
        setCampanhaStatusSincronizado(true);
        return;
      }
      const codigo = processo.campanha.codigo_publico;
      const statusListagem = processo.campanha.status;
      const campanhaId = processo.campanha.id;
      void (async () => {
        try {
          const [fresh, rows] = await Promise.all([
            sincronizarCampanhaDoBanco(codigo, statusListagem),
            listarParticipantesCampanha(campanhaId),
          ]);
          setModalParticipantes(rows);
          if (fresh) {
            setModalProcesso((prev) =>
              prev
                ? withRiscosProgressoAtualizado(prev, {
                    campanha: fresh,
                    participantes: rows,
                  })
                : prev
            );
            setProcessos((prev) =>
              prev.map((p) =>
                p.campanha?.id === fresh.id
                  ? withRiscosProgressoAtualizado(p, {
                      campanha: fresh,
                      participantes: rows,
                    })
                  : p
              )
            );
          } else {
            setModalProcesso((prev) =>
              prev
                ? withRiscosProgressoAtualizado(prev, { participantes: rows })
                : prev
            );
            setProcessos((prev) =>
              prev.map((p) =>
                p.campanha?.id === campanhaId
                  ? withRiscosProgressoAtualizado(p, { participantes: rows })
                  : p
              )
            );
          }
          setCampanhaStatusSincronizado(true);
        } catch (err) {
          console.error(err);
          setCampanhaStatusSincronizado(false);
          toast.error(
            err instanceof Error
              ? err.message
              : "Não foi possível sincronizar o status da campanha com o banco."
          );
          void carregarParticipantes(campanhaId);
        }
      })();
    },
    [sincronizarCampanhaDoBanco, carregarParticipantes]
  );

  const closeModal = useCallback(() => {
    setModalProcesso(null);
    setModalParticipantes([]);
    setCampanhaStatusSincronizado(false);
  }, []);

  /** Abre o Relatório Executivo sem passar pelo modal de detalhes. */
  const openVisualizarRelatorio = useCallback(
    async (processo: RiscosPsicossociaisProcesso) => {
      const campanha = processo.campanha;
      if (!campanha?.id) {
        toast.error("Campanha não encontrada para este processo.");
        return;
      }
      if (!processo.relatorioGerado) {
        openProcesso(processo);
        return;
      }

      const toastId = toast.loading("Carregando relatório…");
      try {
        const [relatorio, logoUrl] = await Promise.all([
          buscarRelatorioCampanha(campanha.id),
          resolverUrlLogoCampanhaOuEmpresa(campanha),
        ]);
        if (!relatorio) {
          toast.error(
            "Relatório não encontrado. Abra o processo para gerar novamente.",
            { id: toastId }
          );
          return;
        }
        setRelatorioViewer(relatorio);
        setRelatorioViewerLogoUrl(logoUrl);
        setRelatorioViewerCnpj(
          campanha.cnpj ||
            processo.implantacao.orcamento.cliente_cnpj ||
            null
        );
        setRelatorioViewerCampanhaStatus(campanha.status);
        setRelatorioViewerOpen(true);
        toast.dismiss(toastId);
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Não foi possível abrir o relatório.",
          { id: toastId }
        );
      }
    },
    [openProcesso]
  );

  const closeVisualizarRelatorio = useCallback(() => {
    setRelatorioViewerOpen(false);
    setRelatorioViewer(null);
    setRelatorioViewerLogoUrl(null);
    setRelatorioViewerCnpj(null);
    setRelatorioViewerCampanhaStatus(null);
  }, []);

  const handleSalvarSolicitacaoLista = useCallback(
    async (input: { dataSolicitacaoIso: string }) => {
      if (!modalProcesso) return;
      const target = listaTargetFromProcesso(modalProcesso);
      const registroId =
        "campanhaId" in target && target.campanhaId
          ? target.campanhaId
          : target.orcamentoId!;
      const antes = modalProcesso.listaPresenca;
      setSavingLista(true);
      try {
        const tracking = await salvarSolicitacaoListaPresenca({
          ...target,
          dataSolicitacaoIso: input.dataSolicitacaoIso,
          usuarioNome: auditContext.usuarioNome,
        });
        applyTrackingToModal(tracking);
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.riscos_psicossociais,
          acao: AUDITORIA_ACOES.riscos_lista_solicitada,
          registroId,
          registroNome:
            modalProcesso.implantacao.orcamento.cliente_nome ||
            modalProcesso.implantacao.orcamento.numero,
          descricao: `Lista de presença solicitada para ${modalProcesso.implantacao.orcamento.cliente_nome}.`,
          dadosAntes: { ...antes },
          dadosDepois: {
            lista_solicitada: true,
            lista_solicitada_em: input.dataSolicitacaoIso,
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
    [modalProcesso, auditContext, applyTrackingToModal, listaTargetFromProcesso]
  );

  const handlePrepararImportacaoParticipantesExcel = useCallback(
    async (file: File) => {
      const campanha = modalProcesso?.campanha;
      const campanhaId = campanha?.id;
      if (!campanhaId || !campanha) {
        throw new Error("Crie a pesquisa antes de importar participantes.");
      }
      const bloqueio = campanhaPermiteImportacaoParticipantes(campanha.status);
      if (bloqueio) throw new Error(bloqueio);

      const parsed = await parseArquivoImportacaoParticipantes(file);
      if (!parsed.ok) {
        throw new Error(parsed.error);
      }

      const server = await validarImportacaoParticipantesCampanha({
        campanhaId,
        linhas: parsed.linhas,
      });

      const avaliadas: LinhaAvaliacaoImportacao[] = server.linhas.map((l) => ({
        linha: l.linha,
        nomeCompleto: l.nomeCompleto,
        cpf: l.cpf,
        cpfDigits: normalizeCpfDigits(l.cpf),
        dataNascimento: l.dataNascimento,
        email: "",
        situacao: l.situacao as SituacaoImportacaoParticipante,
        motivo: l.motivo,
        pronto: l.pronto,
        input: l.pronto
          ? {
              nomeCompleto: l.nomeCompleto,
              cpf: normalizeCpfDigits(l.cpf),
              dataNascimento: l.dataNascimento,
            }
          : undefined,
      }));

      const linhasProntas = avaliadas
        .filter((a) => a.pronto && a.input)
        .map((a) => ({
          linha: a.linha,
          ...a.input!,
        }));

      return {
        arquivoNome: file.name,
        linhasEncontradas: parsed.totalLinhasDados,
        validos: server.validos,
        comErro: server.comErro,
        avaliadas,
        linhasProntas,
        parseError: null as string | null,
      };
    },
    [modalProcesso]
  );

  const handleSalvarRecebimentoLista = useCallback(
    async (file: File) => {
      if (!modalProcesso) return;
      const target = listaTargetFromProcesso(modalProcesso);
      const registroId =
        "campanhaId" in target && target.campanhaId
          ? target.campanhaId
          : target.orcamentoId!;
      const antes = modalProcesso.listaPresenca;
      const substituindo = Boolean(antes.lista_anexo_path);
      const ehExcel = isArquivoExcelListaPresenca(file.name, file.type);

      setSavingLista(true);
      try {
        let importados = 0;
        let jaExistentes = 0;
        let errosImportacao = 0;

        if (ehExcel) {
          const campanha = modalProcesso.campanha;
          if (!campanha?.id) {
            toast.error(
              "Crie a pesquisa antes de anexar o Excel, para importar os participantes automaticamente. PDF e imagem podem ser usados como comprovante."
            );
            return;
          }

          let preview: Awaited<
            ReturnType<typeof handlePrepararImportacaoParticipantesExcel>
          >;
          try {
            preview = await handlePrepararImportacaoParticipantesExcel(file);
          } catch (err) {
            toast.error(
              mensagemErroImportacaoLista({
                parseError:
                  err instanceof Error ? err.message : String(err),
              })
            );
            return;
          }

          if (
            !podeConcluirRecebimentoComExcel({
              parseOk: true,
              avaliadas: preview.avaliadas,
            })
          ) {
            toast.error(
              mensagemErroImportacaoLista({ avaliadas: preview.avaliadas })
            );
            return;
          }

          const resumo = resumirAvaliacaoImportacaoLista(preview.avaliadas);
          jaExistentes = resumo.jaExistentes;
          errosImportacao = resumo.erros;

          if (preview.linhasProntas.length > 0) {
            const result = await confirmarImportacaoParticipantesCampanha(
              { campanhaId: campanha.id, linhas: preview.linhasProntas },
              { auditContext }
            );
            importados = result.importados;
            await carregarParticipantes(campanha.id);
          }
        }

        const tracking = await salvarRecebimentoListaPresenca({
          ...target,
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
          registroId,
          registroNome:
            modalProcesso.implantacao.orcamento.cliente_nome ||
            modalProcesso.implantacao.orcamento.numero,
          descricao: substituindo
            ? `Anexo da lista de presença substituído por ${file.name}.`
            : ehExcel
              ? `Lista de presença recebida em Excel (${file.name}). ${importados} participante(s) importado(s).`
              : `Lista de presença recebida e anexada (${file.name}).`,
          dadosAntes: { ...antes },
          dadosDepois: {
            lista_recebida: true,
            lista_anexo_nome: file.name,
            lista_anexo_path: tracking.lista_anexo_path,
            participantes_importados: ehExcel ? importados : undefined,
          },
        });

        if (ehExcel) {
          const msg = mensagemSucessoRecebimentoComImportacao({
            importados,
            jaExistentes,
            erros: errosImportacao,
          });
          toast.success(
            msg.titulo,
            msg.descricao ? { description: msg.descricao } : undefined
          );
        } else {
          toast.success(
            substituindo
              ? "Anexo substituído com sucesso."
              : "Recebimento da lista salvo."
          );
        }
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
    [
      modalProcesso,
      auditContext,
      applyTrackingToModal,
      listaTargetFromProcesso,
      handlePrepararImportacaoParticipantesExcel,
      carregarParticipantes,
    ]
  );

  const handleRemoverAnexoLista = useCallback(async () => {
    if (!modalProcesso) return;
    const target = listaTargetFromProcesso(modalProcesso);
    const registroId =
      "campanhaId" in target && target.campanhaId
        ? target.campanhaId
        : target.orcamentoId!;
    const antes = modalProcesso.listaPresenca;
    if (!antes.lista_anexo_path) return;

    const ok = window.confirm(
      "Remover o anexo da lista de presença? A etapa voltará a ficar pendente e Cadastro da Empresa será bloqueado."
    );
    if (!ok) return;

    setSavingLista(true);
    try {
      const tracking = await removerAnexoListaPresenca({
        ...target,
        usuarioNome: auditContext.usuarioNome,
      });
      applyTrackingToModal(tracking);
      await registrarAuditoria({
        usuarioId: auditContext.usuarioId,
        usuarioNome: auditContext.usuarioNome,
        usuarioEmail: auditContext.usuarioEmail,
        modulo: AUDITORIA_MODULOS.riscos_psicossociais,
        acao: AUDITORIA_ACOES.riscos_lista_anexo_removido,
        registroId,
        registroNome:
          modalProcesso.implantacao.orcamento.cliente_nome ||
          modalProcesso.implantacao.orcamento.numero,
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
  }, [modalProcesso, auditContext, applyTrackingToModal, listaTargetFromProcesso]);

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

  const handleUploadLogoCampanha = useCallback(
    async (file: File) => {
      const campanhaAtual = modalProcesso?.campanha;
      if (!campanhaAtual) {
        toast.error("Crie a pesquisa antes de anexar o logo.");
        return;
      }
      setSavingLogo(true);
      try {
        const origem = campanhaAtual.logo_storage_path ? "campanha" : "manual";
        const campanha = await salvarLogoCampanha({
          campanhaId: campanhaAtual.id,
          file,
          origem,
          auditContext,
        });
        atualizarCampanhaNoEstado(campanha);
        toast.success("Logo da campanha salvo.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar o logo."
        );
        throw err;
      } finally {
        setSavingLogo(false);
      }
    },
    [modalProcesso, auditContext, atualizarCampanhaNoEstado]
  );

  const handleRemoverLogoCampanha = useCallback(async () => {
    const campanhaAtual = modalProcesso?.campanha;
    if (!campanhaAtual?.logo_storage_path) return;
    const ok = window.confirm(
      "Remover o logo desta campanha? O logo oficial da empresa não será alterado."
    );
    if (!ok) return;

    setSavingLogo(true);
    try {
      const campanha = await removerLogoCampanha({
        campanhaId: campanhaAtual.id,
        auditContext,
      });
      atualizarCampanhaNoEstado(campanha);
      toast.success("Logo da campanha removido.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao remover o logo."
      );
    } finally {
      setSavingLogo(false);
    }
  }, [modalProcesso, auditContext, atualizarCampanhaNoEstado]);

  const handleCriarCampanha = useCallback(
    async (input: {
      dataInicioIso: string;
      dataEncerramentoIso: string;
    }) => {
      if (!modalProcesso) return;
      if (!modalProcesso.exigeLaudosSst) {
        toast.error("Esta pesquisa já foi criada pela inclusão manual.");
        return;
      }
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
          },
          { auditContext }
        );

        setModalProcesso((prev) =>
          prev ? withRiscosProgressoAtualizado(prev, { campanha }) : prev
        );
        setProcessos((prev) =>
          prev.map((p) =>
            p.implantacao.orcamento.id === orcamento.id
              ? withRiscosProgressoAtualizado(p, { campanha })
              : p
          )
        );
        setModalParticipantes([]);
        await refresh();
        toast.success("Campanha criada com sucesso.");
      } catch (err) {
        console.error(err);
        if (err instanceof CampanhaCicloExistenteError) {
          atualizarCampanhaNoEstado(err.campanha);
          setCampanhaStatusSincronizado(true);
          await refresh();
          toast.error(MSG_CAMPANHA_CICLO_EXISTENTE);
          return;
        }
        toast.error(
          err instanceof Error ? err.message : "Erro ao criar a campanha."
        );
      } finally {
        setSavingCampanha(false);
      }
    },
    [modalProcesso, auditContext, refresh, atualizarCampanhaNoEstado]
  );

  const handleAbrirCampanha = useCallback(async () => {
    const campanhaId = modalProcesso?.campanha?.id;
    if (!campanhaId) return;
    if (!podeAutorizarAbrirPesquisa) {
      throw new Error(RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG);
    }
    setSavingCampanha(true);
    try {
      const campanha = await abrirCampanhaRiscos(campanhaId, { auditContext });
      if (campanha.status !== "aberta") {
        throw new Error(
          "A abertura não foi confirmada no banco. O status da campanha não foi alterado."
        );
      }
      setModalProcesso((prev) =>
        prev ? withRiscosProgressoAtualizado(prev, { campanha }) : prev
      );
      setProcessos((prev) =>
        prev.map((p) =>
          p.campanha?.id === campanha.id
            ? withRiscosProgressoAtualizado(p, { campanha })
            : p
        )
      );
      setCampanhaStatusSincronizado(true);
      await refresh();
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
  }, [modalProcesso, auditContext, refresh, podeAutorizarAbrirPesquisa]);

  const handleEncerrarCampanha = useCallback(async () => {
    const campanhaId = modalProcesso?.campanha?.id;
    if (!campanhaId) return;
    setSavingCampanha(true);
    try {
      const campanha = await encerrarCampanhaRiscos(campanhaId, {
        auditContext,
      });
      if (campanha.status !== "encerrada") {
        throw new Error(
          "O encerramento não foi confirmado no banco. O status da campanha não foi alterado."
        );
      }
      setModalProcesso((prev) =>
        prev ? withRiscosProgressoAtualizado(prev, { campanha }) : prev
      );
      setProcessos((prev) =>
        prev.map((p) =>
          p.campanha?.id === campanha.id
            ? withRiscosProgressoAtualizado(p, { campanha })
            : p
        )
      );
      setCampanhaStatusSincronizado(true);
      await refresh();
      toast.success("Pesquisa encerrada.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao encerrar a pesquisa."
      );
      throw err;
    } finally {
      setSavingCampanha(false);
    }
  }, [modalProcesso, auditContext, refresh]);

  const handleProrrogarPrazo = useCallback(
    async (novaDataEncerramentoIso: string) => {
      const campanhaId = modalProcesso?.campanha?.id;
      if (!campanhaId) return;
      if (!podeAutorizarAbrirPesquisa) {
        throw new Error(RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG);
      }
      setSavingCampanha(true);
      try {
        const campanha = await prorrogarPrazoCampanhaRiscos(
          campanhaId,
          novaDataEncerramentoIso,
          { auditContext }
        );
        atualizarCampanhaNoEstado(campanha);
        setCampanhaStatusSincronizado(true);
        await refresh();
        toast.success("Prazo prorrogado. O link original permanece o mesmo.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao prorrogar o prazo."
        );
        throw err;
      } finally {
        setSavingCampanha(false);
      }
    },
    [
      modalProcesso,
      auditContext,
      refresh,
      podeAutorizarAbrirPesquisa,
      atualizarCampanhaNoEstado,
    ]
  );

  const handleReabrirCampanha = useCallback(
    async (novaDataEncerramentoIso: string) => {
      const campanhaId = modalProcesso?.campanha?.id;
      if (!campanhaId) return;
      if (!podeAutorizarAbrirPesquisa) {
        throw new Error(RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG);
      }
      setSavingCampanha(true);
      try {
        const campanha = await reabrirCampanhaRiscos(
          campanhaId,
          novaDataEncerramentoIso,
          { auditContext }
        );
        atualizarCampanhaNoEstado(campanha);
        setCampanhaStatusSincronizado(true);
        await refresh();
        toast.success("Pesquisa reaberta. Respostas já concluídas foram preservadas.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao reabrir a pesquisa."
        );
        throw err;
      } finally {
        setSavingCampanha(false);
      }
    },
    [
      modalProcesso,
      auditContext,
      refresh,
      podeAutorizarAbrirPesquisa,
      atualizarCampanhaNoEstado,
    ]
  );

  const handleEditarPeriodo = useCallback(
    async (input: {
      novaDataInicioIso: string;
      novaDataEncerramentoIso: string;
      confirmarPrazoEncerrado?: boolean;
    }) => {
      const campanhaId = modalProcesso?.campanha?.id;
      if (!campanhaId) return;
      if (!podeAutorizarAbrirPesquisa) {
        throw new Error(RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG);
      }
      setSavingCampanha(true);
      try {
        const campanha = await editarPeriodoCampanhaRiscos(
          campanhaId,
          input,
          { auditContext }
        );
        atualizarCampanhaNoEstado(campanha);
        setCampanhaStatusSincronizado(true);
        await refresh();
        toast.success("Período atualizado. O link original permanece o mesmo.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao editar o período."
        );
        throw err;
      } finally {
        setSavingCampanha(false);
      }
    },
    [
      modalProcesso,
      auditContext,
      refresh,
      podeAutorizarAbrirPesquisa,
      atualizarCampanhaNoEstado,
    ]
  );

  const handleCancelarProcesso = useCallback(
    async (motivo: string, processoAlvo?: RiscosPsicossociaisProcesso) => {
      const alvo =
        processoAlvo ?? processoParaCancelar ?? modalProcesso ?? null;
      if (!alvo) return;
      const ids = identidadeCancelamentoProcessoRiscos({
        origem: alvo.origem,
        processoKey: alvo.processoKey,
        orcamentoId: alvo.implantacao.orcamento.id,
        campanhaId: alvo.campanha?.id ?? null,
      });
      if (!ids.orcamentoId && !ids.campanhaId) {
        toast.error("Não foi possível identificar o processo a cancelar.");
        return;
      }
      setSavingCampanha(true);
      try {
        const result = await cancelarProcessoListagemRiscos({
          orcamentoId: ids.orcamentoId,
          campanhaId: ids.campanhaId,
          motivo,
          auditOptions: { auditContext },
        });
        if (result.status !== "cancelado") {
          throw new Error("O cancelamento não foi confirmado no banco.");
        }
        setProcessoParaCancelar(null);
        await refresh();
        toast.success("Processo cancelado. O histórico foi preservado.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao cancelar o processo."
        );
        throw err;
      } finally {
        setSavingCampanha(false);
      }
    },
    [modalProcesso, processoParaCancelar, auditContext, refresh]
  );

  const openCancelarProcesso = useCallback(
    (processo: RiscosPsicossociaisProcesso) => {
      if (
        processo.status === "cancelado" ||
        processo.etapaAtual === "cancelado"
      ) {
        toast.error("Este processo já está cancelado.");
        return;
      }
      if (
        processo.status === "concluido" ||
        processo.etapaAtual === "finalizado"
      ) {
        toast.error("Processo concluído não pode ser cancelado.");
        return;
      }
      setProcessoParaCancelar(processo);
    },
    []
  );

  const closeCancelarProcesso = useCallback(() => {
    if (savingCampanha) return;
    setProcessoParaCancelar(null);
  }, [savingCampanha]);

  const handleExcluirCampanha = useCallback(
    async (confirmacaoCodigo: string) => {
      const campanhaId = modalProcesso?.campanha?.id;
      if (!campanhaId) return;
      if (!exclusaoDefinitivaDisponivelNoClient()) {
        toast.error(
          "Exclusão definitiva não está disponível neste ambiente."
        );
        return;
      }
      setSavingCampanha(true);
      try {
        await excluirCampanhaRiscos(campanhaId, confirmacaoCodigo, {
          auditContext,
        });
        setModalProcesso(null);
        setModalParticipantes([]);
        setCampanhaStatusSincronizado(false);
        await refresh();
        toast.success("Campanha excluída definitivamente.");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao excluir a campanha."
        );
        throw err;
      } finally {
        setSavingCampanha(false);
      }
    },
    [modalProcesso, auditContext, refresh]
  );

  const openRemoverProcesso = useCallback(
    (processo: RiscosPsicossociaisProcesso) => {
      if (!isAdmin) {
        toast.error("Somente administradores podem remover o processo.");
        return;
      }
      if (!processo.campanha?.id) {
        toast.error("Não há campanha para remover neste processo.");
        return;
      }
      setProcessoParaRemover(processo);
    },
    [isAdmin]
  );

  const closeRemoverProcesso = useCallback(() => {
    if (savingRemoverProcesso) return;
    setProcessoParaRemover(null);
  }, [savingRemoverProcesso]);

  const handleRemoverProcesso = useCallback(
    async (input: {
      confirmacaoCodigo: string;
      motivoOpcao: string;
      motivoOutro?: string;
    }) => {
      if (!isAdmin) {
        toast.error("Somente administradores podem remover o processo.");
        return;
      }
      const campanhaId = processoParaRemover?.campanha?.id;
      if (!campanhaId) return;
      setSavingRemoverProcesso(true);
      try {
        const result = await removerProcessoRiscos(campanhaId, input, {
          auditContext,
        });
        setProcessoParaRemover(null);
        if (modalProcesso?.campanha?.id === campanhaId) {
          setModalProcesso(null);
          setModalParticipantes([]);
          setCampanhaStatusSincronizado(false);
        }
        await refresh();
        toast.success(
          `Processo ${result.codigo_publico} removido. A empresa pode iniciar um novo processo.`
        );
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao remover o processo."
        );
        throw err;
      } finally {
        setSavingRemoverProcesso(false);
      }
    },
    [isAdmin, processoParaRemover, auditContext, refresh, modalProcesso]
  );

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
      if (!campanhaId) {
        throw new Error("Pesquisa não encontrada.");
      }
      if (!isAdmin) {
        toast.error("Somente administradores podem editar participantes.");
        throw new Error("Somente administradores podem editar participantes.");
      }
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
          : new Error("Erro ao atualizar participante.");
      } finally {
        setSavingParticipante(false);
      }
    },
    [modalProcesso, auditContext, carregarParticipantes, isAdmin]
  );

  const handleConfirmarImportacaoParticipantesExcel = useCallback(
    async (
      linhas: Array<{
        nomeCompleto: string;
        cpf: string;
        dataNascimento: string;
        email?: string;
        linha?: number;
      }>
    ) => {
      const campanhaId = modalProcesso?.campanha?.id;
      if (!campanhaId) {
        throw new Error("Crie a pesquisa antes de importar participantes.");
      }
      setSavingParticipante(true);
      try {
        const result = await confirmarImportacaoParticipantesCampanha(
          { campanhaId, linhas },
          { auditContext }
        );
        await carregarParticipantes(campanhaId);
        return result;
      } catch (err) {
        console.error(err);
        throw err instanceof Error
          ? err
          : new Error("Erro ao importar participantes.");
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
      if (!isAdmin) {
        toast.error("Somente administradores podem remover participantes.");
        return;
      }
      setSavingParticipante(true);
      try {
        const res = await fetch(
          `/api/riscos/participante/${encodeURIComponent(participanteId)}/remover`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              usuarioNome: auditContext?.usuarioNome,
              usuarioEmail: auditContext?.usuarioEmail,
            }),
          }
        );
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Erro ao remover participante.");
        }
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
    [modalProcesso, auditContext, carregarParticipantes, isAdmin]
  );

  const handleRelatorioAtualizado = useCallback(
    (relatorio: RiscosRelatorioRecord | null) => {
      const patch = relatorio
        ? {
            relatorioGerado: true,
            relatorioGeradoEm: relatorio.gerado_em,
            relatorioEnviadoEm: relatorio.relatorio_enviado_em ?? null,
          }
        : {
            relatorioGerado: false,
            relatorioGeradoEm: null,
            relatorioEnviadoEm: null,
          };
      setModalProcesso((prev) =>
        prev ? withRiscosProgressoAtualizado(prev, patch) : prev
      );
      setProcessos((prev) =>
        prev.map((p) => {
          if (!modalProcesso || p.processoKey !== modalProcesso.processoKey) {
            return p;
          }
          const next = withRiscosProgressoAtualizado(p, patch);
          if (relatorio?.relatorio_enviado_em) {
            return { ...next, concluidoEm: relatorio.relatorio_enviado_em };
          }
          if (!relatorio?.relatorio_enviado_em && relatorio) {
            return { ...next, concluidoEm: null };
          }
          return next;
        })
      );
    },
    [modalProcesso]
  );

  return {
    processos: filtrados,
    loading,
    error,
    filters,
    mesSelecionado,
    statusListagem,
    responsaveis,
    modalProcesso,
    modalParticipantes,
    savingLista,
    savingLogo,
    savingCampanha,
    savingParticipante,
    handleFilterChange,
    clearFilters,
    handleMesChange,
    handleYearChange,
    handleStatusListagemChange,
    toggleStatusListagem,
    openProcesso,
    openVisualizarRelatorio,
    closeVisualizarRelatorio,
    relatorioViewerOpen,
    relatorioViewer,
    relatorioViewerLogoUrl,
    relatorioViewerCnpj,
    relatorioViewerCampanhaStatus,
    closeModal,
    handleSalvarSolicitacaoLista,
    handleSalvarRecebimentoLista,
    handleRemoverAnexoLista,
    handleVisualizarAnexoLista,
    handleUploadLogoCampanha,
    handleRemoverLogoCampanha,
    handleCriarCampanha,
    handleAbrirCampanha,
    handleEncerrarCampanha,
    handleProrrogarPrazo,
    handleReabrirCampanha,
    handleEditarPeriodo,
    handleCancelarProcesso,
    openCancelarProcesso,
    closeCancelarProcesso,
    processoParaCancelar,
    handleExcluirCampanha,
    exclusaoDefinitivaDisponivel: exclusaoDefinitivaDisponivelNoClient(),
    isAdmin,
    podeAutorizarAbrirPesquisa,
    processoParaRemover,
    openRemoverProcesso,
    closeRemoverProcesso,
    handleRemoverProcesso,
    savingRemoverProcesso,
    handleGarantirCodigoAcesso,
    handleCriarParticipante,
    handleEditarParticipante,
    handlePrepararImportacaoParticipantesExcel,
    handleConfirmarImportacaoParticipantesExcel,
    handleRemoverParticipante,
    campanhaStatusSincronizado,
    auditContext,
    handleRelatorioAtualizado,
    refresh,
  };
}
