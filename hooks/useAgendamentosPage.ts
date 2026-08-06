"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  consumeAgendamentoPrefill,
  parseAgendamentoPrefillFromSearchParams,
} from "@/lib/agendamento-prefill";
import {
  agendamentoToExams,
  agendamentoToFormValues,
} from "@/lib/agendamento-mappers";
import {
  getAgendamentoValidationMessage,
  getDocumentacaoValidationMessage,
  isAgendamentoCompleto,
  isDocumentacaoCompleta,
  VALIDATION_TOAST_MESSAGE,
} from "@/lib/validate-agendamento";
import {
  CLINICO_NAO_REMOVIVEL_RETORNO_TOAST,
  filtrarNomesExamesParaAso,
  isAsoRetornoAoTrabalho,
  podeRemoverExameAgendamento,
} from "@/lib/agendamento-aso-retorno-trabalho";
import { cargoSemExamesVinculados } from "@/lib/agendamento-exames-cargo";
import {
  applyValoresCreditoContratoNosExames,
  applyValoresCreditoContratoNosExamesPayload,
  type ContratoCreditoAsoRecord,
} from "@/lib/contrato-creditos-aso";
import {
  listarExamesDisponiveisParaAdicionar,
  mensagemExameJaNoAgendamento,
  separarExamesCatalogoParaAdicionar,
} from "@/lib/agendamento-exames-adicionais";
import {
  DATA_AGENDAMENTO_PASSADA_MSG,
  INVALID_DATE_TOAST,
  INVALID_TIME_TOAST,
  isDataAgendamentoPermitida,
  isValidDateBR,
  isValidHorario24,
  parseDateBRToIso,
} from "@/lib/agendamento-datetime";
import {
  EXAME_DUPLICADO_TOAST,
  verificarDuplicidadeExamesNoFormulario,
} from "@/lib/duplicidade-validations";
import {
  isAgendamentoDuplicidade90DiasError,
  AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG,
} from "@/lib/agendamento-duplicidade-90dias";
import {
  ESOCIAL_RECIBO_DUPLICADO_COMPLEMENTO,
  isEsocialReciboDuplicadoError,
} from "@/lib/esocial-recibo-duplicidade";
import {
  verificarDuplicidadeAgendamento90Dias,
  registrarTentativaBloqueadaDuplicidadeAgendamento,
  type AgendamentoDuplicidade90DiasInfo,
} from "@/services/duplicidade.service";
import { useAgendamentoForm } from "@/hooks/useAgendamentoForm";
import { useContratoVigenciaCheck } from "@/hooks/useContratoVigenciaCheck";
import { useAgendamentosList } from "@/hooks/useAgendamentosList";
import { useExams, useExamesCatalogOptions } from "@/hooks/useExams";
import { useClinicasList } from "@/hooks/useClinicasList";
import { useClientesList } from "@/hooks/useClientesList";
import {
  buildCargoAgendamentoFields,
  buildCargosFormOptions,
} from "@/lib/agendamento-cargo";
import {
  buildClienteFilterOptionsHistorico,
  resolveClienteIdByNome,
} from "@/lib/cliente-display";
import { clienteProcuracaoRequerAtencao } from "@/lib/cliente-procuracao";
import {
  CLIENTE_DISPONIVEL_AGENDAMENTO_MSG,
  filterClientesParaNovoAgendamento,
  isClienteDisponivelAgendamento,
} from "@/lib/cliente-disponivel-agendamento";
import {
  assertClienteDisponivelParaAgendamento,
  isClienteIndisponivelAgendamentoError,
} from "@/services/cliente.service";
import { buildMensagemClinicaWhatsApp } from "@/lib/agendamento-mensagem-clinica";
import {
  agendamentoPossuiComplementares,
  isOrdemChegada,
  suggestHorarioInicio,
  validateClinicaAtendimento,
} from "@/lib/clinica-regras-atendimento";
import { useHistoricoUsuario, useAuditoriaUsuario, useAuth } from "@/contexts/AuthContext";
import {
  buildHistoricoAlteracoes,
  buildHistoricoAlteracoesDocumentacao,
  buildHistoricoAsoRetido,
  buildHistoricoCancelamento,
  buildHistoricoCriacao,
  buildHistoricoLiberarAsoRetido,
} from "@/lib/agendamento-historico-diff";
import { buildDocumentacaoPayloadFromForm } from "@/lib/agendamento-documentacao";
import { isAgendamentoAsoRetido, AsoRetidoAnexoValidationError } from "@/lib/agendamento-aso-retido-anexo";
import {
  liberarAgendamentoAsoRetido,
  marcarAgendamentoAsoRetido,
  uploadAsoRetidoAnexo,
} from "@/services/agendamento-aso-retido.service";
import {
  CONTRATO_VIGENTE_ERROR_MESSAGE,
  verificarContratoVigentePorNome,
} from "@/lib/cliente-contrato-vigencia";
import {
  atualizarAgendamentoComExames,
  atualizarDocumentacaoAgendamento,
  buscarAgendamentoComExamesPorId,
  cancelarAgendamento,
  salvarAgendamentoComExames,
} from "@/services/agendamento.service";
import { invalidarContabilizacaoPorCancelamento } from "@/services/contrato-agendamentos.service";
import {
  listarCreditosDisponiveisDoCliente,
  vincularCreditoUtilizadoAoContrato,
} from "@/services/contrato-creditos-aso.service";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  marcarFaturaClienteNecessitaReemissao,
  obterFaturasClienteIdsPorAgendamento,
} from "@/services/fatura-historico.service";
import { listarCargosAtivos, listarExamesObrigatoriosPorCargo } from "@/services/cargo.service";
import { registrarHistorico } from "@/services/historico.service";
import {
  registrarCargoAlteradoExamesRecalculados,
  registrarExameRemovidoAgendamento,
  registrarExamesCarregadosPorCargo,
  registrarExamesComplementaresRemovidosRetornoTrabalho,
  auditarClinicoZeroDemissionalSeNecessario,
} from "@/services/agendamento-form-audit.service";
import { registrarAgendamentoClienteSemProcuracao } from "@/services/cliente-procuracao-audit.service";
import {
  cancelarPeriodicosPorAgendamento,
  criarPeriodicosDeAgendamento,
} from "@/services/periodico-futuro.service";
import {
  listarPeriodicosPendentesColaborador,
  vincularPeriodicoAoAgendamento,
} from "@/services/contrato-programacao-futura.service";
import { createClient } from "@/lib/supabase/client";
import { normalizeCpfDigits } from "@/lib/cpf";
import {
  AGENDAMENTO_BLOQUEADO_FATURA_MSG,
  CANCELAMENTO_EXCEPCIONAL_POS_CANCEL_TOAST,
  isAgendamentoBloqueadoFaturaError,
  type AgendamentoFaturaBloqueio,
} from "@/lib/agendamento-fatura-bloqueio";
import { isPerfilAdmin } from "@/lib/permissions";
import {
  listarBloqueioFaturaPorAgendamentos,
  obterBloqueioFaturaAgendamento,
  registrarCancelamentoExcepcionalFaturaEmitida,
  registrarTentativaCancelamentoBloqueadaFatura,
  registrarTentativaEdicaoBloqueadaFatura,
} from "@/services/agendamento-fatura-bloqueio.service";
import {
  assertClienteSemInadimplencia,
  isClienteInadimplenteError,
  validarClienteParaNovoAgendamento,
} from "@/services/fatura-inadimplencia.service";
import type { InadimplenciaClienteInfo } from "@/components/modals/AgendamentoClienteInadimplenciaModal";
import {
  CLIENTE_INADIMPLENCIA_VALIDATION_MSG,
  type FaturaPendenciaInadimplencia,
} from "@/lib/fatura-inadimplencia";
import { mapAgendamentosToTableRows } from "@/lib/agendamentos-table";
import {
  AGENDAMENTOS_PAGE_SIZE,
  getDefaultAgendamentoFilters,
  extractFilterOptions,
  filterAgendamentos,
  type AgendamentoFilters,
} from "@/lib/agendamento-filters";
import {
  cycleAgendamentoTableSort,
  orderAgendamentosForTable,
  type AgendamentoTableSortState,
} from "@/lib/agendamento-table-sort";
import type {
  AgendamentoStatus,
  AgendamentoWithExames,
  CargoRecord,
  ExameFormItem,
  PeriodicoFuturoRecord,
} from "@/lib/types";

export function useAgendamentosPage() {
  const searchParams = useSearchParams();
  const prefillAppliedRef = useRef(false);
  const examsManuallyModifiedRef = useRef(false);
  const prevAsoRef = useRef("");
  const historicoUsuario = useHistoricoUsuario();
  const auditContext = useAuditoriaUsuario();
  const { profile } = useAuth();
  const isAdmin = isPerfilAdmin(profile?.perfil);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSomenteDocumentacao, setEditingSomenteDocumentacao] =
    useState(false);
  const [viewAgendamento, setViewAgendamento] =
    useState<AgendamentoWithExames | null>(null);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoAgendamentoId, setHistoricoAgendamentoId] = useState<
    string | null
  >(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelModalVariant, setCancelModalVariant] = useState<
    "normal" | "excepcional"
  >("normal");
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<AgendamentoStatus | null>(
    null
  );
  const [dataFieldError, setDataFieldError] = useState<string | null>(null);
  const [asoRetidoModalOpen, setAsoRetidoModalOpen] = useState(false);
  const [asoRetidoTargetId, setAsoRetidoTargetId] = useState<string | null>(
    null
  );
  const [liberarAsoRetidoModalOpen, setLiberarAsoRetidoModalOpen] =
    useState(false);
  const [liberarAsoRetidoTargetId, setLiberarAsoRetidoTargetId] = useState<
    string | null
  >(null);
  const [duplicidade90DiasOpen, setDuplicidade90DiasOpen] = useState(false);
  const [duplicidade90DiasInfo, setDuplicidade90DiasInfo] =
    useState<AgendamentoDuplicidade90DiasInfo | null>(null);
  const [periodicoVinculoOpen, setPeriodicoVinculoOpen] = useState(false);
  const [periodicoVinculoList, setPeriodicoVinculoList] = useState<
    PeriodicoFuturoRecord[]
  >([]);
  const [periodicoContratoNumeros, setPeriodicoContratoNumeros] = useState<
    Record<string, string>
  >({});
  const periodicoDecisionRef = useRef<"none" | "skip" | "link">("none");
  const periodicoLinkIdRef = useRef<string | null>(null);
  const periodicoAlertKeyRef = useRef<string | null>(null);
  const pendingSaveStatusRef = useRef<AgendamentoStatus | null>(null);
  const [cargoChangeModalOpen, setCargoChangeModalOpen] = useState(false);
  const [pendingCargoId, setPendingCargoId] = useState<string | null>(null);
  const [cargoChangeLoading, setCargoChangeLoading] = useState(false);
  const [examesAdicionaisModalOpen, setExamesAdicionaisModalOpen] =
    useState(false);
  const [examesAdicionaisLoading, setExamesAdicionaisLoading] = useState(false);
  const [clienteProcuracaoModalOpen, setClienteProcuracaoModalOpen] =
    useState(false);
  const [pendingClienteId, setPendingClienteId] = useState<string | null>(null);
  const [clienteProcuracaoConfirmLoading, setClienteProcuracaoConfirmLoading] =
    useState(false);
  const [inadimplenciaModalOpen, setInadimplenciaModalOpen] = useState(false);
  const [inadimplenciaPendencias, setInadimplenciaPendencias] = useState<
    FaturaPendenciaInadimplencia[]
  >([]);
  const [inadimplenciaCliente, setInadimplenciaCliente] =
    useState<InadimplenciaClienteInfo | null>(null);
  const [clienteValidacaoLoading, setClienteValidacaoLoading] = useState(false);
  const clienteValidacaoSeqRef = useRef(0);
  const [clienteId, setClienteId] = useState("");
  const [creditoAsoModalOpen, setCreditoAsoModalOpen] = useState(false);
  const [creditosAsoDisponiveis, setCreditosAsoDisponiveis] = useState<
    Array<
      ContratoCreditoAsoRecord & {
        contrato_numero: string | null;
        contrato_data_inicio: string | null;
        contrato_data_fim: string | null;
      }
    >
  >([]);
  const [creditoAsoSelectedId, setCreditoAsoSelectedId] = useState<string | null>(
    null
  );
  const [creditoAsoEmUsoId, setCreditoAsoEmUsoId] = useState<string | null>(null);
  const [creditoAsoNumeroContrato, setCreditoAsoNumeroContrato] = useState<
    string | null
  >(null);
  const [cargoId, setCargoId] = useState("");
  const [cargoNomeSalvo, setCargoNomeSalvo] = useState("");
  const [cargosAtivos, setCargosAtivos] = useState<CargoRecord[]>([]);
  const [cargosLoading, setCargosLoading] = useState(false);

  const formularioClienteLiberado = useMemo(() => {
    const isNovo = !editingId && !editingSomenteDocumentacao;
    return !isNovo || (Boolean(clienteId) && !clienteValidacaoLoading);
  }, [editingId, editingSomenteDocumentacao, clienteId, clienteValidacaoLoading]);

  const {
    form,
    setField,
    reset,
    loadForm,
    buildPayload,
    buildDocumentacaoPayload,
    saving,
    setSaving,
  } = useAgendamentoForm();

  const { clinicas: clinicasList } = useClinicasList();
  const { clientes, loading: clientesLoading } = useClientesList();

  const clientesParaAgendamento = useMemo(
    () =>
      filterClientesParaNovoAgendamento(clientes, {
        editingId,
        clienteNomeAtual: form.cliente_nome,
      }),
    [clientes, editingId, form.cliente_nome]
  );
  const contratoVigencia = useContratoVigenciaCheck(
    form.cliente_nome,
    form.data_agendamento
  );
  const contratoInvalido = contratoVigencia.status === "invalid";
  const clinicasAtivas = useMemo(
    () => clinicasList.filter((c) => c.status === "ativa"),
    [clinicasList]
  );
  const selectedClinica = useMemo(() => {
    const nome = form.clinica_nome.trim();
    if (!nome) return null;
    return (
      clinicasList.find(
        (clinica) =>
          clinica.nome_fantasia === nome || clinica.razao_social === nome
      ) ?? null
    );
  }, [clinicasList, form.clinica_nome]);

  const {
    exams,
    totals,
    pricingLoading,
    hasExamWarnings,
    removeExam,
    updateExam,
    resetExams,
    loadExams,
    getExamesPayload,
    replaceExamesFromCargo,
    appendExamesFromNomes,
    enforceRetornoTrabalhoExames,
  } = useExams(form.clinica_nome, form.aso);

  const handleRemoveExam = useCallback(
    (id: string) => {
      const exam = exams.find((item) => item.id === id);
      if (
        exam?.tipo_exame.trim() &&
        !podeRemoverExameAgendamento(form.aso, exam.tipo_exame)
      ) {
        toast.error(CLINICO_NAO_REMOVIVEL_RETORNO_TOAST);
        return;
      }
      examsManuallyModifiedRef.current = true;
      removeExam(id);
      if (exam?.tipo_exame.trim()) {
        void registrarExameRemovidoAgendamento(auditContext, {
          exameNome: exam.tipo_exame,
          cargoNome: cargoNomeSalvo,
          colaborador: form.colaborador,
          agendamentoId: editingId,
        });
      }
    },
    [
      exams,
      removeExam,
      auditContext,
      cargoNomeSalvo,
      form.colaborador,
      editingId,
      form.aso,
    ]
  );

  useEffect(() => {
    const prev = prevAsoRef.current;
    const next = form.aso;
    if (prev === next) return;
    prevAsoRef.current = next;

    if (isAsoRetornoAoTrabalho(next)) {
      void (async () => {
        const removed = await enforceRetornoTrabalhoExames();
        if (removed) {
          examsManuallyModifiedRef.current = false;
          await registrarExamesComplementaresRemovidosRetornoTrabalho(
            auditContext,
            {
              colaborador: form.colaborador,
              agendamentoId: editingId,
            }
          );
        }
      })();
      return;
    }

    if (
      isAsoRetornoAoTrabalho(prev) &&
      cargoId &&
      !examsManuallyModifiedRef.current
    ) {
      void (async () => {
        try {
          const examesObrigatorios =
            await listarExamesObrigatoriosPorCargo(cargoId);
          await replaceExamesFromCargo(
            examesObrigatorios.map((exame) => exame.nome)
          );
        } catch (err) {
          console.error(err);
          toast.error("Erro ao recarregar exames do cargo.");
        }
      })();
    }
  }, [
    form.aso,
    form.colaborador,
    cargoId,
    enforceRetornoTrabalhoExames,
    auditContext,
    editingId,
    replaceExamesFromCargo,
  ]);

  const handleUpdateExam = useCallback(
    (id: string, field: keyof ExameFormItem, value: string) => {
      updateExam(id, field, value);
    },
    [updateExam]
  );

  const hasComplementares = useMemo(
    () => agendamentoPossuiComplementares(exams),
    [exams]
  );

  useEffect(() => {
    if (!selectedClinica || !isOrdemChegada(selectedClinica)) return;
    const suggested = suggestHorarioInicio(selectedClinica, hasComplementares);
    if (suggested) setField("horario", suggested);
  }, [selectedClinica?.id, hasComplementares, setField, selectedClinica]);

  const { exames: catalogExames, loading: catalogLoading } =
    useExamesCatalogOptions();

  const examesDisponiveisParaAdicionar = useMemo(
    () => listarExamesDisponiveisParaAdicionar(catalogExames, exams),
    [catalogExames, exams]
  );

  const handleOpenExamesAdicionais = useCallback(() => {
    if (editingSomenteDocumentacao) return;
    if (!formularioClienteLiberado) {
      toast.error("Selecione e valide o cliente antes de incluir exames.");
      return;
    }
    if (!cargoId.trim()) {
      toast.error("Selecione um cargo antes de incluir exames adicionais.");
      return;
    }
    if (isAsoRetornoAoTrabalho(form.aso)) {
      toast.error(
        "Para ASO Retorno ao Trabalho, apenas o exame Clínico é permitido."
      );
      return;
    }
    setExamesAdicionaisModalOpen(true);
  }, [cargoId, editingSomenteDocumentacao, form.aso, formularioClienteLiberado]);

  const closeExamesAdicionaisModal = useCallback(() => {
    if (examesAdicionaisLoading) return;
    setExamesAdicionaisModalOpen(false);
  }, [examesAdicionaisLoading]);

  const handleConfirmExamesAdicionais = useCallback(
    async (selectedIds: string[]) => {
      if (selectedIds.length === 0) return;

      const selecionados = catalogExames.filter((exame) =>
        selectedIds.includes(exame.id)
      );
      const { novos, duplicados } = separarExamesCatalogoParaAdicionar(
        selecionados,
        exams
      );

      duplicados.forEach((exame) => {
        toast.error(mensagemExameJaNoAgendamento(exame.nome));
      });

      if (novos.length === 0) {
        setExamesAdicionaisModalOpen(false);
        return;
      }

      setExamesAdicionaisLoading(true);
      try {
        const { added, duplicates } = await appendExamesFromNomes(
          novos.map((exame) => exame.nome)
        );

        duplicates.forEach((nome) => {
          toast.error(mensagemExameJaNoAgendamento(nome));
        });

        if (added > 0) {
          examsManuallyModifiedRef.current = true;
          toast.success(
            added === 1
              ? "1 exame adicional incluído."
              : `${added} exames adicionais incluídos.`
          );
          setExamesAdicionaisModalOpen(false);
        }
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao incluir exames adicionais."
        );
      } finally {
        setExamesAdicionaisLoading(false);
      }
    },
    [appendExamesFromNomes, catalogExames, exams]
  );

  const { agendamentos, loading, error, refresh, getById } =
    useAgendamentosList();

  const [filters, setFilters] = useState<AgendamentoFilters>(() =>
    getDefaultAgendamentoFilters()
  );
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [tableSort, setTableSort] = useState<AgendamentoTableSortState | null>(
    null
  );
  const [bloqueioPorAgendamento, setBloqueioPorAgendamento] = useState<
    Map<string, AgendamentoFaturaBloqueio>
  >(new Map());

  useEffect(() => {
    const ids = agendamentos.map((agendamento) => agendamento.id);
    if (ids.length === 0) {
      setBloqueioPorAgendamento(new Map());
      return;
    }

    let cancelled = false;

    void listarBloqueioFaturaPorAgendamentos(ids)
      .then((map) => {
        if (!cancelled) setBloqueioPorAgendamento(map);
      })
      .catch((err) => {
        console.error("Erro ao carregar bloqueio por fatura:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [agendamentos]);

  const bloquearEdicaoAgendamentoFaturado = useCallback(
    async (id: string): Promise<boolean> => {
      let bloqueio = bloqueioPorAgendamento.get(id);
      if (bloqueio === undefined) {
        bloqueio = await obterBloqueioFaturaAgendamento(id);
        setBloqueioPorAgendamento((prev) => {
          const next = new Map(prev);
          next.set(id, bloqueio!);
          return next;
        });
      }

      if (!bloqueio?.bloqueado) return false;

      toast.error(AGENDAMENTO_BLOQUEADO_FATURA_MSG);
      const agendamento = getById(id);
      if (
        agendamento &&
        bloqueio.faturaNumero &&
        bloqueio.faturaStatusLabel
      ) {
        await registrarTentativaEdicaoBloqueadaFatura(auditContext, {
          agendamentoId: id,
          cliente: agendamento.cliente_nome,
          colaborador: agendamento.colaborador,
          dataAgendamento: agendamento.data_agendamento,
          faturaNumero: bloqueio.faturaNumero,
          faturaStatusLabel: bloqueio.faturaStatusLabel,
        });
      }

      return true;
    },
    [auditContext, bloqueioPorAgendamento, getById]
  );

  const obterBloqueioAtualizado = useCallback(
    async (id: string): Promise<AgendamentoFaturaBloqueio> => {
      let bloqueio = bloqueioPorAgendamento.get(id);
      if (bloqueio === undefined) {
        bloqueio = await obterBloqueioFaturaAgendamento(id);
        setBloqueioPorAgendamento((prev) => {
          const next = new Map(prev);
          next.set(id, bloqueio!);
          return next;
        });
      }
      return bloqueio ?? { bloqueado: false };
    },
    [bloqueioPorAgendamento]
  );

  const filterOptions = useMemo(() => {
    const fromAgendamentos = extractFilterOptions(agendamentos);
    return {
      ...fromAgendamentos,
      clientes: buildClienteFilterOptionsHistorico(
        clientes,
        agendamentos.map((ag) => ag.cliente_nome)
      ),
    };
  }, [agendamentos, clientes]);

  const filteredAgendamentos = useMemo(
    () => filterAgendamentos(agendamentos, filters),
    [agendamentos, filters]
  );

  const orderedAgendamentos = useMemo(
    () => orderAgendamentosForTable(filteredAgendamentos, filters, tableSort),
    [filteredAgendamentos, filters, tableSort]
  );

  const totalPages = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(orderedAgendamentos.length / AGENDAMENTOS_PAGE_SIZE)
      ),
    [orderedAgendamentos.length]
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * AGENDAMENTOS_PAGE_SIZE;
    const slice = orderedAgendamentos.slice(
      start,
      start + AGENDAMENTOS_PAGE_SIZE
    );
    return mapAgendamentosToTableRows(slice).map((row) => {
      const bloqueio = bloqueioPorAgendamento.get(row.agendamentoId);
      return {
        ...row,
        bloqueadoPorFatura: bloqueio?.bloqueado ?? false,
        podeCancelarExcepcionalAdmin:
          Boolean(bloqueio?.bloqueado && isAdmin),
        faturaBloqueioNumero: bloqueio?.faturaNumero ?? null,
        faturaBloqueioStatus: bloqueio?.faturaStatusLabel ?? null,
      };
    });
  }, [orderedAgendamentos, page, bloqueioPorAgendamento, isAdmin]);

  const viewFaturaBloqueio = useMemo(() => {
    if (!viewAgendamento) return null;
    return bloqueioPorAgendamento.get(viewAgendamento.id) ?? null;
  }, [viewAgendamento, bloqueioPorAgendamento]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    let cancelled = false;

    async function loadCargos() {
      setCargosLoading(true);
      try {
        const data = await listarCargosAtivos();
        if (!cancelled) setCargosAtivos(data);
      } catch (err) {
        console.error("Erro ao carregar cargos:", err);
        if (!cancelled) setCargosAtivos([]);
      } finally {
        if (!cancelled) setCargosLoading(false);
      }
    }

    loadCargos();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFilterChange = useCallback(
    (field: keyof AgendamentoFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters(getDefaultAgendamentoFilters());
  }, []);

  const handleSortColumn = useCallback(
    (column: AgendamentoTableSortState["column"]) => {
      setTableSort((prev) => cycleAgendamentoTableSort(prev, column));
      setPage(1);
    },
    []
  );

  const cargosFormOptions = useMemo(
    () => buildCargosFormOptions(cargosAtivos, cargoId, cargoNomeSalvo),
    [cargosAtivos, cargoId, cargoNomeSalvo]
  );

  const cargoSemExames = useMemo(
    () =>
      cargoSemExamesVinculados(
        cargoId,
        exams,
        pricingLoading || cargosLoading
      ),
    [cargoId, exams, pricingLoading, cargosLoading]
  );

  const resetForm = useCallback(() => {
    reset();
    resetExams();
    examsManuallyModifiedRef.current = false;
    setClienteId("");
    setCargoId("");
    setCargoNomeSalvo("");
    setEditingId(null);
    setEditingStatus(null);
    setEditingSomenteDocumentacao(false);
    setPendingCargoId(null);
    setCargoChangeModalOpen(false);
    setClienteProcuracaoModalOpen(false);
    setPendingClienteId(null);
    setCreditoAsoModalOpen(false);
    setCreditosAsoDisponiveis([]);
    setCreditoAsoSelectedId(null);
    setCreditoAsoEmUsoId(null);
    setCreditoAsoNumeroContrato(null);
    setInadimplenciaModalOpen(false);
    setInadimplenciaPendencias([]);
    setInadimplenciaCliente(null);
    setClienteValidacaoLoading(false);
    clienteValidacaoSeqRef.current += 1;
    prevAsoRef.current = "";
  }, [reset, resetExams]);

  const clearFormPorInadimplencia = useCallback(() => {
    setClienteId("");
    setField("cliente_nome", "");
    setCargoId("");
    setCargoNomeSalvo("");
    setField("clinica_nome", "");
    resetExams();
    examsManuallyModifiedRef.current = false;
  }, [setField, resetExams]);

  const resolverInfoClienteInadimplencia = useCallback(
    (clienteNome: string): InadimplenciaClienteInfo => {
      const nome = clienteNome.trim();
      const found = clientes.find((c) => c.nome.trim() === nome);
      return {
        razaoSocial: found?.nome ?? nome,
        cnpj: found?.cnpj ?? "",
      };
    },
    [clientes]
  );

  const exibirBloqueioInadimplencia = useCallback(
    (
      pendencias: FaturaPendenciaInadimplencia[],
      clienteInfo?: InadimplenciaClienteInfo
    ) => {
      setInadimplenciaPendencias(pendencias);
      setInadimplenciaCliente(
        clienteInfo ??
          (form.cliente_nome.trim()
            ? resolverInfoClienteInadimplencia(form.cliente_nome)
            : null)
      );
      setInadimplenciaModalOpen(true);
      clearFormPorInadimplencia();
    },
    [clearFormPorInadimplencia, form.cliente_nome, resolverInfoClienteInadimplencia]
  );

  const validarESelecionarCliente = useCallback(
    async (nextClienteId: string): Promise<boolean> => {
      const cliente = clientes.find((c) => c.id === nextClienteId);
      if (!cliente) return false;

      const mesmoClienteEmEdicao =
        Boolean(editingId) &&
        form.cliente_nome.trim().toLowerCase() ===
          cliente.nome.trim().toLowerCase();

      if (
        !isClienteDisponivelAgendamento(cliente.disponivel_agendamento) &&
        !mesmoClienteEmEdicao
      ) {
        toast.error(CLIENTE_DISPONIVEL_AGENDAMENTO_MSG);
        return false;
      }

      const seq = ++clienteValidacaoSeqRef.current;
      setClienteValidacaoLoading(true);

      try {
        const pendencias = await validarClienteParaNovoAgendamento(
          cliente.nome,
          {
            auditContext,
            clienteId: cliente.id,
          }
        );

        if (seq !== clienteValidacaoSeqRef.current) return false;

        if (pendencias.length > 0) {
          exibirBloqueioInadimplencia(pendencias, {
            razaoSocial: cliente.nome,
            cnpj: cliente.cnpj,
          });
          return false;
        }

        if (clienteProcuracaoRequerAtencao(cliente.procuracao)) {
          setPendingClienteId(nextClienteId);
          setClienteProcuracaoModalOpen(true);
          return false;
        }

        setClienteId(nextClienteId);
        setField("cliente_nome", cliente.nome);

        if (!editingId) {
          try {
            const creditos = await listarCreditosDisponiveisDoCliente({
              clienteId: cliente.id,
              clienteCnpj: cliente.cnpj,
            });
            if (seq !== clienteValidacaoSeqRef.current) return false;
            if (creditos.length > 0) {
              setCreditosAsoDisponiveis(creditos);
              setCreditoAsoSelectedId(
                creditos.length === 1 ? creditos[0].id : null
              );
              setCreditoAsoModalOpen(true);
            } else {
              setCreditosAsoDisponiveis([]);
              setCreditoAsoSelectedId(null);
              setCreditoAsoEmUsoId(null);
              setCreditoAsoNumeroContrato(null);
            }
          } catch (credErr) {
            console.error("Erro ao consultar créditos ASO:", credErr);
          }
        }

        return true;
      } catch (err) {
        if (seq !== clienteValidacaoSeqRef.current) return false;
        console.error("Erro ao validar situação financeira do cliente:", err);
        toast.error(CLIENTE_INADIMPLENCIA_VALIDATION_MSG);
        clearFormPorInadimplencia();
        return false;
      } finally {
        if (seq === clienteValidacaoSeqRef.current) {
          setClienteValidacaoLoading(false);
        }
      }
    },
    [clientes, editingId, form.cliente_nome, auditContext, setField, clearFormPorInadimplencia, exibirBloqueioInadimplencia]
  );

  const closeInadimplenciaModal = useCallback(() => {
    setInadimplenciaModalOpen(false);
    setInadimplenciaPendencias([]);
    setInadimplenciaCliente(null);
    clearFormPorInadimplencia();
  }, [clearFormPorInadimplencia]);

  const isNovoAgendamento = !editingId && !editingSomenteDocumentacao;
  const formularioDependeClienteValido = isNovoAgendamento;

  const openFormForCreate = useCallback(() => {
    resetForm();
    setShowForm(true);
    setFiltersExpanded(false);
    requestAnimationFrame(() => {
      document
        .getElementById("novo-agendamento")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [resetForm]);

  const handleNovoAgendamento = useCallback(() => {
    openFormForCreate();
  }, [openFormForCreate]);

  useEffect(() => {
    if (prefillAppliedRef.current) return;

    const prefill =
      consumeAgendamentoPrefill() ??
      parseAgendamentoPrefillFromSearchParams(searchParams);

    if (!prefill) return;
    prefillAppliedRef.current = true;

    resetForm();
    setField("cliente_nome", prefill.cliente_nome);
    setField("colaborador", prefill.colaborador);
    if (prefill.colaborador_cpf) {
      setField("colaborador_cpf", prefill.colaborador_cpf);
    }
    if (prefill.aso) setField("aso", prefill.aso);

    const clienteResolved = resolveClienteIdByNome(clientes, prefill.cliente_nome);
    if (clienteResolved) {
      void validarESelecionarCliente(clienteResolved);
    }

    if (prefill.cargo_id && clienteResolved) {
      setCargoId(prefill.cargo_id);
      if (prefill.cargo_nome) setCargoNomeSalvo(prefill.cargo_nome);

      void (async () => {
        try {
          const examesObrigatorios = await listarExamesObrigatoriosPorCargo(
            prefill.cargo_id!
          );
          const nomes = examesObrigatorios.map((exame) => exame.nome);
          await replaceExamesFromCargo(nomes);
          if (nomes.length > 0 && prefill.cargo_nome) {
            await registrarExamesCarregadosPorCargo(auditContext, {
              cargoNome: prefill.cargo_nome,
              exames: nomes,
              colaborador: prefill.colaborador,
            });
          }
        } catch (err) {
          console.error("Erro ao carregar exames do cargo (prefill):", err);
        }
      })();
    }

    setShowForm(true);
    setFiltersExpanded(false);

    requestAnimationFrame(() => {
      document
        .getElementById("novo-agendamento")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [
    searchParams,
    clientes,
    resetForm,
    setField,
    replaceExamesFromCargo,
    auditContext,
    validarESelecionarCliente,
  ]);

  const handleClear = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    resetForm();
    setDataFieldError(null);
    setFiltersExpanded(false);
  }, [resetForm]);

  const getDataOriginalIso = useCallback((): string | null => {
    if (!editingId) return null;
    return getById(editingId)?.data_agendamento ?? null;
  }, [editingId, getById]);

  const validateDataAgendamentoField = useCallback(
    (opts?: { fromSave?: boolean }): boolean => {
      const value = form.data_agendamento.trim();
      if (!value) {
        setDataFieldError(null);
        return true;
      }
      if (!isValidDateBR(value)) {
        // Formato incompleto/inválido: sem mensagem de data passada no blur.
        if (!opts?.fromSave) setDataFieldError(null);
        return true;
      }
      const dataIso = parseDateBRToIso(value);
      if (
        dataIso &&
        !isDataAgendamentoPermitida({
          dataIso,
          dataOriginalIso: getDataOriginalIso(),
        })
      ) {
        setDataFieldError(DATA_AGENDAMENTO_PASSADA_MSG);
        return false;
      }
      setDataFieldError(null);
      return true;
    },
    [form.data_agendamento, getDataOriginalIso]
  );

  const handleFormFieldChange = useCallback(
    (field: Parameters<typeof setField>[0], value: string) => {
      setField(field, value);
      if (field === "colaborador_cpf" || field === "aso") {
        // Reabre verificação quando CPF/ASO mudam
        periodicoDecisionRef.current = "none";
        periodicoLinkIdRef.current = null;
        periodicoAlertKeyRef.current = null;
      }
      if (field !== "data_agendamento") return;

      const trimmed = value.trim();
      if (!trimmed || trimmed.length < 10 || !isValidDateBR(trimmed)) {
        setDataFieldError(null);
        return;
      }
      const dataIso = parseDateBRToIso(trimmed);
      const dataOriginalIso = editingId
        ? getById(editingId)?.data_agendamento ?? null
        : null;
      if (
        dataIso &&
        !isDataAgendamentoPermitida({
          dataIso,
          dataOriginalIso,
        })
      ) {
        setDataFieldError((prev) =>
          prev ? DATA_AGENDAMENTO_PASSADA_MSG : null
        );
        return;
      }
      setDataFieldError(null);
    },
    [setField, editingId, getById]
  );

  const verificarPeriodicoFuturoPendente = useCallback(
    async (opts?: { force?: boolean; fromSave?: boolean }) => {
      if (editingId) return false;
      if (periodicoDecisionRef.current !== "none" && !opts?.force) {
        return false;
      }

      const cpf = normalizeCpfDigits(form.colaborador_cpf);
      if (cpf.length !== 11 && !form.colaborador.trim()) return false;
      if (!form.cliente_nome.trim()) return false;

      const alertKey = `${cpf}|${form.cliente_nome.trim().toLowerCase()}|${form.aso.trim().toLowerCase()}`;
      if (
        !opts?.force &&
        !opts?.fromSave &&
        periodicoAlertKeyRef.current === alertKey
      ) {
        return false;
      }

      try {
        const pendentes = await listarPeriodicosPendentesColaborador({
          clienteNome: form.cliente_nome,
          colaborador: form.colaborador,
          colaboradorCpf: form.colaborador_cpf,
          tipoAso: form.aso || null,
        });
        if (pendentes.length === 0) return false;

        periodicoAlertKeyRef.current = alertKey;
        setPeriodicoVinculoList(pendentes);

        const contratoIds = Array.from(
          new Set(
            pendentes
              .map((p) => p.contrato_id)
              .filter((id): id is string => Boolean(id))
          )
        );
        if (contratoIds.length > 0) {
          const supabase = createClient();
          const { data } = await supabase
            .from("cliente_contratos")
            .select("id, numero")
            .in("id", contratoIds);
          const map: Record<string, string> = {};
          for (const row of data ?? []) {
            if (row.id && row.numero) map[String(row.id)] = String(row.numero);
          }
          setPeriodicoContratoNumeros(map);
        } else {
          setPeriodicoContratoNumeros({});
        }

        setPeriodicoVinculoOpen(true);
        return true;
      } catch (periodicoErr) {
        console.error(
          "Erro ao verificar periódico futuro pendente:",
          periodicoErr
        );
        return false;
      }
    },
    [
      editingId,
      form.aso,
      form.cliente_nome,
      form.colaborador,
      form.colaborador_cpf,
    ]
  );

  const handleCpfBlur = useCallback(() => {
    const cpf = normalizeCpfDigits(form.colaborador_cpf);
    if (cpf.length === 11) {
      void verificarPeriodicoFuturoPendente();
    }
  }, [form.colaborador_cpf, verificarPeriodicoFuturoPendente]);

  useEffect(() => {
    if (editingId || !showForm) return;
    if (!form.aso.trim()) return;
    const cpf = normalizeCpfDigits(form.colaborador_cpf);
    if (cpf.length !== 11 && !form.colaborador.trim()) return;
    if (!form.cliente_nome.trim()) return;
    void verificarPeriodicoFuturoPendente();
    // Revalida ao mudar o tipo de ASO (CPF/cliente já podem estar preenchidos).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: só reage a ASO
  }, [editingId, form.aso, showForm, verificarPeriodicoFuturoPendente]);

  const handleDataBlur = useCallback(() => {
    validateDataAgendamentoField();
  }, [validateDataAgendamentoField]);
  const toggleFilters = useCallback(() => {
    setFiltersExpanded((prev) => !prev);
  }, []);

  const handleClienteChange = useCallback(
    (nextClienteId: string) => {
      if (clienteValidacaoLoading) return;
      if (nextClienteId === clienteId) return;

      if (!nextClienteId) {
        clienteValidacaoSeqRef.current += 1;
        setClienteValidacaoLoading(false);
        setClienteId("");
        setField("cliente_nome", "");
        return;
      }

      void validarESelecionarCliente(nextClienteId);
    },
    [clienteId, clienteValidacaoLoading, setField, validarESelecionarCliente]
  );

  const closeClienteProcuracaoModal = useCallback(() => {
    setClienteProcuracaoModalOpen(false);
    setPendingClienteId(null);
    setClienteId("");
    setField("cliente_nome", "");
  }, [setField]);

  const handleConfirmClienteProcuracao = useCallback(async () => {
    if (!pendingClienteId) return;

    const cliente = clientes.find((c) => c.id === pendingClienteId);
    if (!cliente) {
      closeClienteProcuracaoModal();
      return;
    }

    setClienteProcuracaoConfirmLoading(true);
    try {
      setClienteId(pendingClienteId);
      setField("cliente_nome", cliente.nome);
      await registrarAgendamentoClienteSemProcuracao(auditContext, {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        agendamentoId: editingId,
        colaborador: form.colaborador.trim() || null,
      });
      setClienteProcuracaoModalOpen(false);
      setPendingClienteId(null);

      if (!editingId) {
        try {
          const creditos = await listarCreditosDisponiveisDoCliente({
            clienteId: cliente.id,
            clienteCnpj: cliente.cnpj,
          });
          if (creditos.length > 0) {
            setCreditosAsoDisponiveis(creditos);
            setCreditoAsoSelectedId(
              creditos.length === 1 ? creditos[0].id : null
            );
            setCreditoAsoModalOpen(true);
          }
        } catch (credErr) {
          console.error("Erro ao consultar créditos ASO:", credErr);
        }
      }
    } finally {
      setClienteProcuracaoConfirmLoading(false);
    }
  }, [
    pendingClienteId,
    clientes,
    closeClienteProcuracaoModal,
    setField,
    auditContext,
    editingId,
    form.colaborador,
  ]);

  const handleCreditoAsoNaoUtilizar = useCallback(() => {
    setCreditoAsoModalOpen(false);
    setCreditoAsoEmUsoId(null);
    setCreditoAsoNumeroContrato(null);
    setCreditoAsoSelectedId(null);
  }, []);

  const handleCreditoAsoUtilizar = useCallback(() => {
    const id =
      creditoAsoSelectedId ||
      (creditosAsoDisponiveis.length === 1
        ? creditosAsoDisponiveis[0].id
        : null);
    if (!id) {
      toast.error("Selecione o ASO contratual que deseja utilizar.");
      return;
    }
    const credito = creditosAsoDisponiveis.find((c) => c.id === id);
    setCreditoAsoEmUsoId(id);
    setCreditoAsoNumeroContrato(credito?.contrato_numero ?? null);
    setCreditoAsoModalOpen(false);

    // Aplica valor zero nos exames do cargo já carregados (feedback visual).
    void (async () => {
      try {
        let nomesCargo: string[] = [];
        if (cargoId) {
          const obrigatorios = await listarExamesObrigatoriosPorCargo(cargoId);
          nomesCargo = obrigatorios.map((e) => e.nome).filter(Boolean);
        }
        loadExams(applyValoresCreditoContratoNosExames(exams, nomesCargo));
      } catch (err) {
        console.error(err);
      }
    })();
  }, [
    creditoAsoSelectedId,
    creditosAsoDisponiveis,
    cargoId,
    exams,
    loadExams,
  ]);

  const showClienteProcuracaoAlert = useMemo(() => {
    if (!clienteId) return false;
    const cliente = clientes.find((c) => c.id === clienteId);
    return !!cliente && clienteProcuracaoRequerAtencao(cliente.procuracao);
  }, [clienteId, clientes]);

  const applyCargoChange = useCallback(
    async (nextCargoId: string) => {
      const previousCargoId = cargoId;
      const cargoAnteriorNome =
        cargosAtivos.find((cargo) => cargo.id === previousCargoId)?.nome ??
        cargoNomeSalvo;
      const found = cargosAtivos.find((cargo) => cargo.id === nextCargoId);
      setCargoId(nextCargoId);
      if (found) setCargoNomeSalvo(found.nome);

      try {
        const examesObrigatorios =
          await listarExamesObrigatoriosPorCargo(nextCargoId);
        const nomes = examesObrigatorios.map((exame) => exame.nome);
        const examesAudit = filtrarNomesExamesParaAso(nomes, form.aso);

        if (nomes.length === 0) {
          await replaceExamesFromCargo([]);
          examsManuallyModifiedRef.current = false;
          return;
        }

        await replaceExamesFromCargo(nomes);
        examsManuallyModifiedRef.current = false;

        const cargoNovoNome = found?.nome ?? cargoNomeSalvo;
        if (
          previousCargoId &&
          previousCargoId !== nextCargoId &&
          cargoAnteriorNome
        ) {
          await registrarCargoAlteradoExamesRecalculados(auditContext, {
            cargoAnterior: cargoAnteriorNome,
            cargoNovo: cargoNovoNome,
            exames: examesAudit,
            colaborador: form.colaborador,
            agendamentoId: editingId,
          });
        } else if (cargoNovoNome) {
          await registrarExamesCarregadosPorCargo(auditContext, {
            cargoNome: cargoNovoNome,
            exames: examesAudit,
            colaborador: form.colaborador,
            agendamentoId: editingId,
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar exames do cargo.");
      }
    },
    [
      cargosAtivos,
      replaceExamesFromCargo,
      cargoId,
      cargoNomeSalvo,
      auditContext,
      form.colaborador,
      editingId,
      form.aso,
    ]
  );

  const handleCargoChange = useCallback(
    async (nextCargoId: string) => {
      if (nextCargoId === cargoId) return;

      if (!nextCargoId) {
        setCargoId("");
        setCargoNomeSalvo("");
        await replaceExamesFromCargo([]);
        examsManuallyModifiedRef.current = false;
        return;
      }

      if (!formularioClienteLiberado) {
        toast.error("Selecione e valide o cliente antes de escolher o cargo.");
        return;
      }

      if (examsManuallyModifiedRef.current) {
        setPendingCargoId(nextCargoId);
        setCargoChangeModalOpen(true);
        return;
      }

      setCargoChangeLoading(true);
      try {
        await applyCargoChange(nextCargoId);
      } finally {
        setCargoChangeLoading(false);
      }
    },
    [cargoId, applyCargoChange, replaceExamesFromCargo, formularioClienteLiberado]
  );

  const closeCargoChangeModal = useCallback(() => {
    setCargoChangeModalOpen(false);
    setPendingCargoId(null);
  }, []);

  const handleConfirmCargoChange = useCallback(async () => {
    if (!pendingCargoId) return;

    setCargoChangeLoading(true);
    try {
      await applyCargoChange(pendingCargoId);
      setCargoChangeModalOpen(false);
      setPendingCargoId(null);
    } finally {
      setCargoChangeLoading(false);
    }
  }, [applyCargoChange, pendingCargoId]);

  const handleEditar = useCallback(
    async (id: string) => {
      const bloqueio = await obterBloqueioAtualizado(id);

      const agendamento = getById(id);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }
      loadForm(agendamentoToFormValues(agendamento));
      loadExams(agendamentoToExams(agendamento));
      prevAsoRef.current = agendamento.aso ?? "";
      setClienteId(
        resolveClienteIdByNome(clientes, agendamento.cliente_nome ?? "")
      );
      setCargoId(agendamento.cargo_id ?? "");
      setCargoNomeSalvo(agendamento.cargo_nome ?? "");
      examsManuallyModifiedRef.current = false;
      setEditingSomenteDocumentacao(bloqueio.bloqueado);
      setEditingStatus(agendamento.status);
      setEditingId(id);
      setShowForm(true);
      setFiltersExpanded(false);
      requestAnimationFrame(() => {
        document
          .getElementById("novo-agendamento")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      if (isAsoRetornoAoTrabalho(agendamento.aso ?? "")) {
        void enforceRetornoTrabalhoExames();
      }
    },
    [getById, loadForm, loadExams, clientes, enforceRetornoTrabalhoExames, obterBloqueioAtualizado]
  );

  const handleVisualizar = useCallback(
    async (id: string) => {
      const local = getById(id);
      if (local) {
        setViewAgendamento(local);
        return;
      }
      try {
        const remoto = await buscarAgendamentoComExamesPorId(id);
        if (!remoto) {
          toast.error("Agendamento não encontrado.");
          return;
        }
        setViewAgendamento(remoto);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível abrir o agendamento.");
      }
    },
    [getById]
  );

  useEffect(() => {
    const abrirId = searchParams.get("abrirAgendamento")?.trim();
    if (!abrirId) return;
    void handleVisualizar(abrirId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("abrirAgendamento");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [searchParams, handleVisualizar]);

  const handleHistorico = useCallback((id: string) => {
    setHistoricoAgendamentoId(id);
    setHistoricoOpen(true);
  }, []);

  const handleCancelar = useCallback(
    async (id: string) => {
      const agendamento = getById(id);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }
      if (agendamento.status === "cancelado") {
        toast.error("Este agendamento já está cancelado.");
        return;
      }

      const bloqueio = await obterBloqueioAtualizado(id);

      if (bloqueio.bloqueado) {
        if (!isAdmin) {
          toast.error(AGENDAMENTO_BLOQUEADO_FATURA_MSG);
          if (bloqueio.faturaNumero && bloqueio.faturaStatusLabel) {
            await registrarTentativaCancelamentoBloqueadaFatura(auditContext, {
              agendamentoId: id,
              cliente: agendamento.cliente_nome,
              colaborador: agendamento.colaborador,
              dataAgendamento: agendamento.data_agendamento,
              faturaNumero: bloqueio.faturaNumero,
              faturaStatusLabel: bloqueio.faturaStatusLabel,
            });
          }
          return;
        }

        setCancelModalVariant("excepcional");
        setCancelTargetId(id);
        setCancelModalOpen(true);
        return;
      }

      setCancelModalVariant("normal");
      setCancelTargetId(id);
      setCancelModalOpen(true);
    },
    [auditContext, getById, isAdmin, obterBloqueioAtualizado]
  );

  const closeHistoricoModal = useCallback(() => {
    setHistoricoOpen(false);
    setHistoricoAgendamentoId(null);
  }, []);

  const closeCancelModal = useCallback(() => {
    setCancelModalOpen(false);
    setCancelModalVariant("normal");
    setCancelTargetId(null);
  }, []);

  const closeAsoRetidoModal = useCallback(() => {
    setAsoRetidoModalOpen(false);
    setAsoRetidoTargetId(null);
  }, []);

  const closeLiberarAsoRetidoModal = useCallback(() => {
    setLiberarAsoRetidoModalOpen(false);
    setLiberarAsoRetidoTargetId(null);
  }, []);

  const handleAsoRetido = useCallback(
    (id: string) => {
      const agendamento = getById(id);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }
      if (agendamento.status !== "agendado") {
        toast.error("ASO Retido disponível apenas para agendamentos confirmados.");
        return;
      }
      setAsoRetidoTargetId(id);
      setAsoRetidoModalOpen(true);
    },
    [getById]
  );

  const handleLiberarAsoRetido = useCallback(
    (id: string) => {
      const agendamento = getById(id);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }
      if (agendamento.status !== "aso_retido") {
        toast.error("Este agendamento não está com status ASO Retido.");
        return;
      }
      setLiberarAsoRetidoTargetId(id);
      setLiberarAsoRetidoModalOpen(true);
    },
    [getById]
  );

  const handleConfirmarAsoRetido = useCallback(
    async (file: File, observacao: string) => {
      if (!asoRetidoTargetId) return;

      const agendamento = getById(asoRetidoTargetId);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }

      setSaving(true);
      try {
        const { path, nome } = await uploadAsoRetidoAnexo(asoRetidoTargetId, file);
        await marcarAgendamentoAsoRetido(asoRetidoTargetId, {
          anexoPath: path,
          anexoNome: nome,
          observacao: observacao.trim() || null,
          usuario: historicoUsuario,
        });
        await registrarHistorico(
          asoRetidoTargetId,
          historicoUsuario,
          buildHistoricoAsoRetido(historicoUsuario, nome, observacao),
          {
            auditContext,
            registroNome: agendamento.colaborador,
          }
        );
        toast.success("Agendamento marcado como ASO Retido.");
        closeAsoRetidoModal();
        refresh();
      } catch (err) {
        console.error("Erro ao marcar ASO Retido:", err);
        if (err instanceof AsoRetidoAnexoValidationError) {
          toast.error(err.message);
          return;
        }
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "";
        toast.error(message || "Erro ao marcar ASO Retido.");
      } finally {
        setSaving(false);
      }
    },
    [
      asoRetidoTargetId,
      auditContext,
      closeAsoRetidoModal,
      getById,
      historicoUsuario,
      refresh,
    ]
  );

  const handleConfirmarLiberarAsoRetido = useCallback(async () => {
    if (!liberarAsoRetidoTargetId) return;

    const agendamento = getById(liberarAsoRetidoTargetId);
    if (!agendamento) {
      toast.error("Agendamento não encontrado.");
      return;
    }

    setSaving(true);
    try {
      await liberarAgendamentoAsoRetido(liberarAsoRetidoTargetId);
      await registrarHistorico(
        liberarAsoRetidoTargetId,
        historicoUsuario,
        buildHistoricoLiberarAsoRetido(historicoUsuario),
        {
          auditContext,
          registroNome: agendamento.colaborador,
        }
      );
      toast.success("ASO Retido liberado. Status voltou para Agendado.");
      closeLiberarAsoRetidoModal();
      refresh();
    } catch (err) {
      console.error("Erro ao liberar ASO Retido:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao liberar ASO Retido.");
    } finally {
      setSaving(false);
    }
  }, [
    auditContext,
    closeLiberarAsoRetidoModal,
    getById,
    historicoUsuario,
    liberarAsoRetidoTargetId,
    refresh,
  ]);

  const handleConfirmarCancelamento = useCallback(
    async (motivo: string) => {
      if (!cancelTargetId) return;
      if (!motivo.trim()) {
        toast.error("Informe o motivo do cancelamento.");
        return;
      }

      const agendamento = getById(cancelTargetId);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }

      const isExcepcional = cancelModalVariant === "excepcional";
      const bloqueio = isExcepcional
        ? await obterBloqueioAtualizado(cancelTargetId)
        : null;

      if (!isExcepcional && (await bloquearEdicaoAgendamentoFaturado(cancelTargetId))) {
        return;
      }

      if (isExcepcional && !bloqueio?.bloqueado) {
        toast.error(
          "Cancelamento excepcional disponível apenas para agendamentos vinculados a fatura emitida."
        );
        return;
      }

      setSaving(true);
      try {
        await cancelarAgendamento(cancelTargetId, motivo, {
          cancelamentoExcepcionalAdmin: isExcepcional,
        });
        await cancelarPeriodicosPorAgendamento(cancelTargetId);
        await registrarHistorico(
          cancelTargetId,
          historicoUsuario,
          buildHistoricoCancelamento(historicoUsuario, motivo),
          {
            auditContext,
            registroNome: agendamento.colaborador,
          }
        );

        if (
          isExcepcional &&
          bloqueio?.faturaNumero &&
          bloqueio.faturaStatusLabel
        ) {
          await registrarCancelamentoExcepcionalFaturaEmitida(auditContext, {
            agendamentoId: cancelTargetId,
            cliente: agendamento.cliente_nome,
            colaborador: agendamento.colaborador,
            dataAgendamento: agendamento.data_agendamento,
            faturaNumero: bloqueio.faturaNumero,
            faturaStatusLabel: bloqueio.faturaStatusLabel,
            motivo,
          });

          const faturaIds = bloqueio.faturaId
            ? [bloqueio.faturaId]
            : await obterFaturasClienteIdsPorAgendamento(cancelTargetId);

          for (const faturaId of faturaIds) {
            await marcarFaturaClienteNecessitaReemissao(faturaId, {
              auditContext,
            }, {
              agendamentoId: cancelTargetId,
              cliente: agendamento.cliente_nome,
              colaborador: agendamento.colaborador,
              motivo,
            });
          }
        }

        toast.success("Agendamento cancelado com sucesso!");
        try {
          await invalidarContabilizacaoPorCancelamento(
            cancelTargetId,
            historicoUsuario
          );
        } catch (err) {
          console.error(
            "Erro ao invalidar contabilização do contrato após cancelamento:",
            err
          );
        }
        if (isExcepcional) {
          toast.warning(CANCELAMENTO_EXCEPCIONAL_POS_CANCEL_TOAST);
        }

        setCancelModalOpen(false);
        setCancelModalVariant("normal");
        setCancelTargetId(null);
        if (editingId === cancelTargetId) {
          closeForm();
        }
        if (viewAgendamento?.id === cancelTargetId) {
          setViewAgendamento({
            ...viewAgendamento,
            status: "cancelado",
            motivo_cancelamento: motivo,
          });
        }
        refresh();
      } catch (err) {
        console.error("Erro completo ao cancelar:", err);
        if (isAgendamentoBloqueadoFaturaError(err)) {
          toast.error(err.message);
          return;
        }
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "";
        toast.error(message || "Erro ao cancelar agendamento");
      } finally {
        setSaving(false);
      }
    },
    [
      auditContext,
      cancelModalVariant,
      cancelTargetId,
      closeForm,
      editingId,
      getById,
      historicoUsuario,
      obterBloqueioAtualizado,
      refresh,
      viewAgendamento,
      bloquearEdicaoAgendamentoFaturado,
    ]
  );

  const bloquearDuplicidade90Dias = useCallback(
    async (
      existente: AgendamentoDuplicidade90DiasInfo,
      novaDataIso: string
    ) => {
      setDuplicidade90DiasInfo(existente);
      setDuplicidade90DiasOpen(true);
      await registrarTentativaBloqueadaDuplicidadeAgendamento(auditContext, {
        existente,
        novaDataAgendamento: novaDataIso,
        colaborador: form.colaborador,
        colaboradorCpf: form.colaborador_cpf,
        clienteNome: form.cliente_nome,
      });
    },
    [auditContext, form.colaborador, form.colaborador_cpf, form.cliente_nome]
  );

  const executeSave = useCallback(
    async (status: AgendamentoStatus) => {
      const bloquearCamposAso = isAgendamentoAsoRetido(editingStatus);

      if (editingId && editingSomenteDocumentacao) {
        if (!isDocumentacaoCompleta(form, { bloquearCamposAso })) {
          toast.error(
            getDocumentacaoValidationMessage(form) ?? VALIDATION_TOAST_MESSAGE
          );
          return;
        }

        setSaving(true);
        try {
          const anterior = getById(editingId);
          if (!anterior) {
            toast.error("Agendamento não encontrado.");
            return;
          }
          const docPayload = buildDocumentacaoPayloadFromForm(form, {
            bloquearCamposAso,
            asoFieldsFrom: bloquearCamposAso ? anterior : undefined,
          });
          const alteracoes = buildHistoricoAlteracoesDocumentacao(
            anterior,
            docPayload,
            historicoUsuario,
            { bloquearCamposAso }
          );
          await atualizarDocumentacaoAgendamento(editingId, docPayload);
          if (alteracoes.length > 0) {
            await registrarHistorico(
              editingId,
              historicoUsuario,
              alteracoes,
              {
                auditContext,
                registroNome: anterior.colaborador,
              }
            );
          }
          toast.success("Documentação atualizada com sucesso!");
          setShowForm(false);
          resetForm();
          setFiltersExpanded(false);
          refresh();
        } catch (err) {
          console.error("Erro ao salvar documentação:", err);
          if (isEsocialReciboDuplicadoError(err)) {
            toast.error(
              `${err.message} ${ESOCIAL_RECIBO_DUPLICADO_COMPLEMENTO}`
            );
            return;
          }
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "";
          toast.error(message || "Erro ao salvar documentação");
        } finally {
          setSaving(false);
        }
        return;
      }

      if (editingId && (await bloquearEdicaoAgendamentoFaturado(editingId))) {
        return;
      }

      if (!editingId && !editingSomenteDocumentacao) {
        const clienteNome = form.cliente_nome.trim();
        if (!clienteNome) {
          toast.error(VALIDATION_TOAST_MESSAGE);
          return;
        }
        try {
          await assertClienteDisponivelParaAgendamento(clienteNome);
        } catch (err) {
          if (isClienteIndisponivelAgendamentoError(err)) {
            toast.error(err.message);
            clearFormPorInadimplencia();
            return;
          }
          throw err;
        }
        try {
          await assertClienteSemInadimplencia(clienteNome);
        } catch (err) {
          if (isClienteInadimplenteError(err)) {
            exibirBloqueioInadimplencia(
              err.pendencias,
              resolverInfoClienteInadimplencia(clienteNome)
            );
            return;
          }
          toast.error(CLIENTE_INADIMPLENCIA_VALIDATION_MSG);
          return;
        }
      }

      if (hasExamWarnings) {
        toast.error(
          "Corrija os exames: há combinações que a clínica não realiza."
        );
        return;
      }

      if (!form.data_agendamento.trim()) {
        toast.error(VALIDATION_TOAST_MESSAGE);
        return;
      }
      if (!isValidDateBR(form.data_agendamento)) {
        setDataFieldError(INVALID_DATE_TOAST);
        toast.error(INVALID_DATE_TOAST);
        return;
      }

      const dataIso = parseDateBRToIso(form.data_agendamento);
      const dataOriginalIso = editingId
        ? getById(editingId)?.data_agendamento ?? null
        : null;
      if (
        dataIso &&
        !isDataAgendamentoPermitida({
          dataIso,
          dataOriginalIso,
        })
      ) {
        setDataFieldError(DATA_AGENDAMENTO_PASSADA_MSG);
        toast.error(DATA_AGENDAMENTO_PASSADA_MSG);
        return;
      }
      setDataFieldError(null);

      if (!form.horario.trim()) {
        toast.error(VALIDATION_TOAST_MESSAGE);
        return;
      }
      if (!isValidHorario24(form.horario)) {
        toast.error(INVALID_TIME_TOAST);
        return;
      }

      const regraClinicaErro = validateClinicaAtendimento({
        clinica: selectedClinica,
        dataAgendamento: form.data_agendamento,
        horario: form.horario,
        exams,
      });
      if (regraClinicaErro) {
        toast.error(regraClinicaErro);
        return;
      }

      if (!isAgendamentoCompleto(form, exams, cargoId, { bloquearCamposAso })) {
        toast.error(
          getAgendamentoValidationMessage(form, exams, cargoId) ??
            VALIDATION_TOAST_MESSAGE
        );
        return;
      }

      const examesValidos = exams.filter((e) => e.tipo_exame.trim() && !e.aviso);
      const dupExames = verificarDuplicidadeExamesNoFormulario(examesValidos);
      if (dupExames.duplicado) {
        toast.error(dupExames.mensagem ?? EXAME_DUPLICADO_TOAST);
        return;
      }

      if (dataIso) {
        const contrato = await verificarContratoVigentePorNome(
          form.cliente_nome,
          dataIso
        );
        if (!contrato.vigente) {
          toast.error(CONTRATO_VIGENTE_ERROR_MESSAGE);
          return;
        }
      }

      if (dataIso) {
        const existente = await verificarDuplicidadeAgendamento90Dias({
          clienteNome: form.cliente_nome,
          colaboradorCpf: form.colaborador_cpf,
          dataAgendamentoIso: dataIso,
          ignorarAgendamentoId: editingId,
        });

        if (existente) {
          await bloquearDuplicidade90Dias(existente, dataIso);
          return;
        }
      }

      if (!editingId && periodicoDecisionRef.current === "none") {
        try {
          const opened = await verificarPeriodicoFuturoPendente({
            force: true,
            fromSave: true,
          });
          if (opened) {
            pendingSaveStatusRef.current = status;
            return;
          }
        } catch (periodicoErr) {
          console.error(
            "Erro ao verificar periódico futuro pendente:",
            periodicoErr
          );
        }
      }

      const periodicoLinkId =
        periodicoDecisionRef.current === "link"
          ? periodicoLinkIdRef.current
          : null;

      setSaving(true);
      try {
        const cargoFields = buildCargoAgendamentoFields(
          cargoId,
          cargosAtivos,
          cargoNomeSalvo
        );
        const payloadStatus =
          editingId && isAgendamentoAsoRetido(editingStatus)
            ? "aso_retido"
            : status;
        let payload = buildPayload(payloadStatus, cargoFields);

        const clienteIdResolvido =
          clienteId.trim() ||
          resolveClienteIdByNome(clientes, payload.cliente_nome) ||
          null;
        payload = {
          ...payload,
          cliente_id: clienteIdResolvido,
        };

        if (editingId) {
          const atual = getById(editingId);
          // Preserva campos legados; a seleção de previsão fica em contrato_agendamentos.
          payload = {
            ...payload,
            contrato_id: atual?.contrato_id ?? null,
            consome_saldo_contrato: atual?.consome_saldo_contrato ?? null,
            vinculado_contrato_em: atual?.vinculado_contrato_em ?? null,
            vinculado_contrato_por: atual?.vinculado_contrato_por ?? null,
          };
        } else {
          payload = {
            ...payload,
            contrato_id: null,
            consome_saldo_contrato: false,
            vinculado_contrato_em: null,
            vinculado_contrato_por: null,
          };
        }

        const examesPayloadRaw = getExamesPayload();
        let examesPayload = examesPayloadRaw;

        if (!editingId && creditoAsoEmUsoId) {
          let nomesCargo: string[] = [];
          if (cargoId) {
            try {
              const obrigatorios = await listarExamesObrigatoriosPorCargo(cargoId);
              nomesCargo = obrigatorios
                .map((e) => e.nome?.trim() || "")
                .filter(Boolean);
            } catch (cargoErr) {
              console.error("Erro ao carregar exames do cargo:", cargoErr);
            }
          }
          examesPayload = applyValoresCreditoContratoNosExamesPayload(
            examesPayloadRaw,
            nomesCargo
          );
        }

        if (editingId) {
          const anterior = getById(editingId);
          if (!anterior) {
            toast.error("Agendamento não encontrado.");
            return;
          }
          const anteriorParaHistorico: typeof anterior = {
            ...anterior,
            agendamento_exames: (anterior.agendamento_exames ?? []).map(
              (exame) => ({ ...exame })
            ),
          };
          if (bloquearCamposAso) {
            payload.aso_enviado_clinica = anterior.aso_enviado_clinica;
            payload.data_aso_enviado_clinica = anterior.data_aso_enviado_clinica;
            payload.aso_assinado = anterior.aso_assinado;
            payload.data_aso_assinado = anterior.data_aso_assinado;
            payload.aso_enviado_cliente = anterior.aso_enviado_cliente;
            payload.data_aso_enviado_cliente = anterior.data_aso_enviado_cliente;
          }
          const alteracoes = buildHistoricoAlteracoes(
            anteriorParaHistorico,
            payload,
            examesPayload,
            historicoUsuario
          );
          await atualizarAgendamentoComExames(editingId, payload, examesPayload);
          await auditarClinicoZeroDemissionalSeNecessario(auditContext, {
            aso: payload.aso,
            exams,
            anterior: anteriorParaHistorico,
            agendamentoId: editingId,
            colaborador: payload.colaborador,
          });
          if (alteracoes.length > 0) {
            await registrarHistorico(
              editingId,
              historicoUsuario,
              alteracoes,
              {
                auditContext,
                registroNome: payload.colaborador,
              }
            );
          }

          const cargoAlterou =
            (anterior.cargo_id ?? "") !== (cargoFields.cargo_id ?? "");
          if (cargoFields.cargo_id && dataIso && cargoAlterou) {
            try {
              const criados = await criarPeriodicosDeAgendamento(editingId, {
                cliente_nome: payload.cliente_nome,
                colaborador: payload.colaborador,
                cargo_id: cargoFields.cargo_id,
                cargo_nome: cargoFields.cargo_nome ?? null,
                data_agendamento: dataIso,
                exames: examesPayload,
              });
              if (criados > 0) {
                toast.message(
                  `${criados} periódico(s) futuro(s) recalculado(s) conforme o novo cargo.`
                );
              }
            } catch (periodicoErr) {
              console.error("Erro ao recalcular periódicos futuros:", periodicoErr);
            }
          }

          toast.success("Agendamento atualizado com sucesso!");
        } else {
          const novoId = await salvarAgendamentoComExames(payload, examesPayload);
          await auditarClinicoZeroDemissionalSeNecessario(auditContext, {
            aso: payload.aso,
            exams,
            anterior: null,
            agendamentoId: novoId,
            colaborador: payload.colaborador,
          });

          if (creditoAsoEmUsoId) {
            const credito = creditosAsoDisponiveis.find(
              (c) => c.id === creditoAsoEmUsoId
            );
            if (credito) {
              try {
                await vincularCreditoUtilizadoAoContrato({
                  creditoId: credito.id,
                  agendamentoId: novoId,
                  contratoId: credito.contrato_id,
                  colaborador: payload.colaborador,
                  colaboradorCpf: payload.colaborador_cpf ?? null,
                  usuarioNome: historicoUsuario,
                  numeroContrato: credito.contrato_numero,
                });
              } catch (creditoErr) {
                console.error(creditoErr);
                toast.error(
                  creditoErr instanceof Error
                    ? creditoErr.message
                    : "Agendamento salvo, mas o crédito contratual não pôde ser vinculado."
                );
              }
            }
          }

          await registrarHistorico(
            novoId,
            historicoUsuario,
            buildHistoricoCriacao(historicoUsuario),
            {
              auditContext,
              registroNome: payload.colaborador,
            }
          );

          if (periodicoLinkId) {
            try {
              await vincularPeriodicoAoAgendamento({
                periodicoId: periodicoLinkId,
                agendamentoId: novoId,
                usuarioNome: historicoUsuario,
                dataAgendamentoIso: dataIso,
                usuarioEmail: auditContext.usuarioEmail,
                usuarioId: auditContext.usuarioId,
              });
              toast.message(
                "Periódico Futuro vinculado a este agendamento."
              );
            } catch (vinculoErr) {
              console.error(
                "Erro ao vincular periódico futuro:",
                vinculoErr
              );
              toast.error(
                "Agendamento salvo, mas não foi possível vincular o Periódico Futuro."
              );
            }
          }

          if (cargoFields.cargo_id && dataIso) {
            try {
              const criados = await criarPeriodicosDeAgendamento(novoId, {
                cliente_nome: payload.cliente_nome,
                colaborador: payload.colaborador,
                cargo_id: cargoFields.cargo_id,
                cargo_nome: cargoFields.cargo_nome ?? null,
                data_agendamento: dataIso,
                exames: examesPayload,
              });
              if (criados > 0) {
                toast.message(
                  `${criados} periódico(s) futuro(s) registrado(s) para acompanhamento.`
                );
              }
            } catch (periodicoErr) {
              console.error("Erro ao criar periódicos futuros:", periodicoErr);
            }
          }

          toast.success(
            status === "rascunho"
              ? "Rascunho salvo com sucesso!"
              : "Agendamento salvo com sucesso!"
          );
        }

        setDuplicidade90DiasOpen(false);
        setDuplicidade90DiasInfo(null);
        setPeriodicoVinculoOpen(false);
        setPeriodicoVinculoList([]);
        periodicoDecisionRef.current = "none";
        periodicoLinkIdRef.current = null;
        pendingSaveStatusRef.current = null;
        periodicoAlertKeyRef.current = null;
        setShowForm(false);
        resetForm();
        setFiltersExpanded(false);
        refresh();
      } catch (err) {
        console.error("Erro completo ao salvar:", err);
        if (isAgendamentoBloqueadoFaturaError(err)) {
          toast.error(err.message);
          return;
        }
        if (isClienteInadimplenteError(err)) {
          exibirBloqueioInadimplencia(
            err.pendencias,
            resolverInfoClienteInadimplencia(form.cliente_nome)
          );
          return;
        }
        if (isAgendamentoDuplicidade90DiasError(err) && dataIso) {
          await bloquearDuplicidade90Dias(err.info, dataIso);
          return;
        }
        if (isEsocialReciboDuplicadoError(err)) {
          toast.error(
            `${err.message} ${ESOCIAL_RECIBO_DUPLICADO_COMPLEMENTO}`
          );
          return;
        }
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "";
        if (message === AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG && dataIso) {
          const existente = await verificarDuplicidadeAgendamento90Dias({
            clienteNome: form.cliente_nome,
            colaboradorCpf: form.colaborador_cpf,
            dataAgendamentoIso: dataIso,
            ignorarAgendamentoId: editingId,
          });
          if (existente) {
            await bloquearDuplicidade90Dias(existente, dataIso);
            return;
          }
        }
        toast.error(message || "Erro ao salvar agendamento");
      } finally {
        setSaving(false);
      }
    },
    [
      hasExamWarnings,
      bloquearEdicaoAgendamentoFaturado,
      editingSomenteDocumentacao,
      editingStatus,
      form,
      exams,
      selectedClinica,
      setSaving,
      buildPayload,
      getExamesPayload,
      cargoId,
      cargoNomeSalvo,
      cargosAtivos,
      clienteId,
      editingId,
      getById,
      resetForm,
      refresh,
      historicoUsuario,
      auditContext,
      bloquearDuplicidade90Dias,
      exibirBloqueioInadimplencia,
      resolverInfoClienteInadimplencia,
      historicoUsuario,
      clientes,
      verificarPeriodicoFuturoPendente,
    ]
  );

  const handleSave = useCallback(
    async (status: AgendamentoStatus) => {
      await executeSave(status);
    },
    [executeSave]
  );

  const auditarDecisaoPeriodico = useCallback(
    async (
      decisao: "cancelou" | "continuou_sem_vinculo" | "antecipou_e_vinculou",
      periodicoId?: string | null
    ) => {
      const periodico =
        periodicoVinculoList.find((p) => p.id === periodicoId) ??
        periodicoVinculoList[0] ??
        null;
      const dataPrevista =
        periodico?.data_prevista_original?.slice(0, 10) ||
        periodico?.proxima_data?.slice(0, 10) ||
        "";
      const decisaoLabel =
        decisao === "cancelou"
          ? "cancelou o aviso de periódico futuro"
          : decisao === "continuou_sem_vinculo"
            ? "optou por continuar sem vincular ao periódico futuro"
            : "optou por antecipar/vincular ao periódico futuro";
      try {
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: historicoUsuario,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.periodicos_futuros,
          acao:
            decisao === "cancelou"
              ? AUDITORIA_ACOES.cancelamento
              : decisao === "continuou_sem_vinculo"
                ? AUDITORIA_ACOES.sem_vinculo_contrato_implantacao
                : AUDITORIA_ACOES.reagendamento,
          registroId: periodico?.id ?? null,
          registroNome: form.colaborador || periodico?.colaborador || "",
          descricao: `${historicoUsuario} ${decisaoLabel} para ${form.colaborador || periodico?.colaborador || "colaborador"} (CPF ${normalizeCpfDigits(form.colaborador_cpf) || "—"})${dataPrevista ? `, previsto para ${dataPrevista}` : ""}.`,
          dadosDepois: {
            decisao,
            colaborador: form.colaborador,
            colaborador_cpf: normalizeCpfDigits(form.colaborador_cpf),
            periodico_futuro_id: periodico?.id ?? null,
            data_prevista: dataPrevista || null,
            aso: form.aso || null,
          },
        });
      } catch (err) {
        console.error("Erro ao auditar decisão de periódico futuro:", err);
      }
    },
    [
      auditContext.usuarioEmail,
      auditContext.usuarioId,
      form.aso,
      form.colaborador,
      form.colaborador_cpf,
      historicoUsuario,
      periodicoVinculoList,
    ]
  );

  const handleCancelarPeriodicoVinculo = useCallback(() => {
    void auditarDecisaoPeriodico("cancelou");
    const fromSave = pendingSaveStatusRef.current !== null;
    setPeriodicoVinculoOpen(false);
    setPeriodicoVinculoList([]);
    periodicoDecisionRef.current = "none";
    periodicoLinkIdRef.current = null;
    pendingSaveStatusRef.current = null;
    periodicoAlertKeyRef.current = null;
    if (!fromSave) {
      setField("colaborador_cpf", "");
      setField("colaborador", "");
    }
  }, [auditarDecisaoPeriodico, setField]);

  const handleContinuarComPeriodicoPendente = useCallback(() => {
    void auditarDecisaoPeriodico("continuou_sem_vinculo");
    periodicoDecisionRef.current = "skip";
    periodicoLinkIdRef.current = null;
    setPeriodicoVinculoOpen(false);
    const pending = pendingSaveStatusRef.current;
    if (pending) {
      void executeSave(pending);
    }
  }, [auditarDecisaoPeriodico, executeSave]);

  const handleUtilizarPeriodicoPendente = useCallback(
    (periodicoId: string) => {
      if (!periodicoId) {
        handleCancelarPeriodicoVinculo();
        return;
      }
      void auditarDecisaoPeriodico("antecipou_e_vinculou", periodicoId);
      periodicoDecisionRef.current = "link";
      periodicoLinkIdRef.current = periodicoId;
      setPeriodicoVinculoOpen(false);
      const pending = pendingSaveStatusRef.current;
      if (pending) {
        void executeSave(pending);
      }
    },
    [auditarDecisaoPeriodico, executeSave, handleCancelarPeriodicoVinculo]
  );

  const closeDuplicidade90DiasModal = useCallback(() => {
    setDuplicidade90DiasOpen(false);
    setDuplicidade90DiasInfo(null);
  }, []);

  const handleCopyMensagemClinica = useCallback(async () => {
    const message = buildMensagemClinicaWhatsApp({
      form,
      clientes,
      clinicas: clinicasList,
      exams,
      catalogExames,
    });

    try {
      await navigator.clipboard.writeText(message);
      toast.success("Mensagem copiada");
    } catch (err) {
      console.error("Erro ao copiar mensagem:", err);
      toast.error("Não foi possível copiar a mensagem.");
    }
  }, [form, clientes, clinicasList, exams, catalogExames]);

  const bloquearCamposAsoDocumentacao = isAgendamentoAsoRetido(editingStatus);

  return {
    showForm,
    editingId,
    editingSomenteDocumentacao,
    viewAgendamento,
    setViewAgendamento,
    viewFaturaBloqueio,
    historicoOpen,
    historicoAgendamentoId,
    cancelModalOpen,
    cancelModalVariant,
    saving,
    form,
    setField: handleFormFieldChange,
    dataFieldError,
    handleDataBlur,
    clinicasAtivas,
    clientes: clientesParaAgendamento,
    clientesFormulario: clientesParaAgendamento,
    clientesLoading,
    clienteId,
    handleClienteChange,
    creditoAsoModalOpen,
    creditosAsoDisponiveis,
    creditoAsoSelectedId,
    setCreditoAsoSelectedId,
    creditoAsoEmUsoId,
    creditoAsoNumeroContrato,
    handleCreditoAsoNaoUtilizar,
    handleCreditoAsoUtilizar,
    cargoId,
    cargosAtivos: cargosFormOptions,
    cargosLoading,
    handleCargoChange,
    exams,
    totals,
    catalogExames,
    catalogLoading,
    pricingLoading,
    cargoSemExames,
    removeExam: handleRemoveExam,
    updateExam: handleUpdateExam,
    loading,
    error,
    filters,
    filterOptions,
    filtersExpanded,
    filteredAgendamentos,
    agendamentos,
    paginatedRows,
    page,
    totalPages,
    handleFilterChange,
    handleClearFilters,
    tableSort,
    handleSortColumn,
    toggleFilters,
    closeForm,
    setPage,
    handleNovoAgendamento,
    handleClear,
    handleEditar,
    handleVisualizar,
    handleHistorico,
    handleCancelar,
    closeHistoricoModal,
    closeCancelModal,
    handleConfirmarCancelamento,
    asoRetidoModalOpen,
    closeAsoRetidoModal,
    handleAsoRetido,
    handleConfirmarAsoRetido,
    liberarAsoRetidoModalOpen,
    closeLiberarAsoRetidoModal,
    handleLiberarAsoRetido,
    handleConfirmarLiberarAsoRetido,
    bloquearCamposAsoDocumentacao,
    handleSave,
    handleCopyMensagemClinica,
    duplicidade90DiasOpen,
    duplicidade90DiasInfo,
    closeDuplicidade90DiasModal,
    periodicoVinculoOpen,
    periodicoVinculoList,
    periodicoContratoNumeros,
    handleCpfBlur,
    handleCancelarPeriodicoVinculo,
    handleContinuarComPeriodicoPendente,
    handleUtilizarPeriodicoPendente,
    cargoChangeModalOpen,
    cargoChangeLoading,
    closeCargoChangeModal,
    handleConfirmCargoChange,
    contratoVigencia,
    contratoInvalido,
    showClienteProcuracaoAlert,
    clienteProcuracaoModalOpen,
    clienteProcuracaoConfirmLoading,
    closeClienteProcuracaoModal,
    handleConfirmClienteProcuracao,
    examesAdicionaisModalOpen,
    examesAdicionaisLoading,
    examesDisponiveisParaAdicionar,
    handleOpenExamesAdicionais,
    closeExamesAdicionaisModal,
    handleConfirmExamesAdicionais,
    inadimplenciaModalOpen,
    inadimplenciaPendencias,
    inadimplenciaCliente,
    closeInadimplenciaModal,
    clienteValidacaoLoading,
    formularioClienteLiberado,
  };
}
