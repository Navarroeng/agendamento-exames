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
  isAgendamentoCompleto,
  VALIDATION_TOAST_MESSAGE,
} from "@/lib/validate-agendamento";
import {
  INVALID_DATE_TOAST,
  INVALID_TIME_TOAST,
  isValidDateBR,
  isValidHorario24,
  parseDateBRToIso,
} from "@/lib/agendamento-datetime";
import {
  EXAME_DUPLICADO_TOAST,
  verificarDuplicidadeExamesNoFormulario,
} from "@/lib/duplicidade-validations";
import {
  verificarAgendamentoMesmoMes,
  type AgendamentoMesmoMesInfo,
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
  buildClienteFilterOptions,
  resolveClienteIdByNome,
} from "@/lib/cliente-display";
import { buildMensagemClinicaWhatsApp } from "@/lib/agendamento-mensagem-clinica";
import { useHistoricoUsuario, useAuditoriaUsuario } from "@/contexts/AuthContext";
import {
  buildHistoricoAlteracoes,
  buildHistoricoCancelamento,
  buildHistoricoCriacao,
} from "@/lib/agendamento-historico-diff";
import {
  CONTRATO_VIGENTE_ERROR_MESSAGE,
  verificarContratoVigentePorNome,
} from "@/lib/cliente-contrato-vigencia";
import {
  atualizarAgendamentoComExames,
  cancelarAgendamento,
  salvarAgendamentoComExames,
} from "@/services/agendamento.service";
import { listarCargosAtivos, listarExamesObrigatoriosPorCargo } from "@/services/cargo.service";
import { registrarHistorico } from "@/services/historico.service";
import {
  cancelarPeriodicosPorAgendamento,
  criarPeriodicosDeAgendamento,
} from "@/services/periodico-futuro.service";
import { mapAgendamentosToTableRows } from "@/lib/agendamentos-table";
import {
  AGENDAMENTOS_PAGE_SIZE,
  EMPTY_AGENDAMENTO_FILTERS,
  extractFilterOptions,
  filterAgendamentos,
  type AgendamentoFilters,
} from "@/lib/agendamento-filters";
import type { AgendamentoStatus, AgendamentoWithExames, CargoRecord } from "@/lib/types";

export function useAgendamentosPage() {
  const searchParams = useSearchParams();
  const prefillAppliedRef = useRef(false);
  const historicoUsuario = useHistoricoUsuario();
  const auditContext = useAuditoriaUsuario();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewAgendamento, setViewAgendamento] =
    useState<AgendamentoWithExames | null>(null);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoAgendamentoId, setHistoricoAgendamentoId] = useState<
    string | null
  >(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [duplicidadeMesOpen, setDuplicidadeMesOpen] = useState(false);
  const [duplicidadeMesInfo, setDuplicidadeMesInfo] =
    useState<AgendamentoMesmoMesInfo | null>(null);
  const [pendingSaveStatus, setPendingSaveStatus] =
    useState<AgendamentoStatus | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [cargoId, setCargoId] = useState("");
  const [cargoNomeSalvo, setCargoNomeSalvo] = useState("");
  const [cargosAtivos, setCargosAtivos] = useState<CargoRecord[]>([]);
  const [cargosLoading, setCargosLoading] = useState(false);

  const {
    form,
    setField,
    reset,
    loadForm,
    buildPayload,
    saving,
    setSaving,
  } = useAgendamentoForm();

  const { clinicas: clinicasList } = useClinicasList();
  const { clientes, loading: clientesLoading } = useClientesList();
  const contratoVigencia = useContratoVigenciaCheck(
    form.cliente_nome,
    form.data_agendamento
  );
  const contratoInvalido = contratoVigencia.status === "invalid";
  const clinicasAtivas = useMemo(
    () => clinicasList.filter((c) => c.status === "ativa"),
    [clinicasList]
  );

  const {
    exams,
    totals,
    pricingLoading,
    hasExamWarnings,
    addExam,
    removeExam,
    updateExam,
    resetExams,
    loadExams,
    getExamesPayload,
    mergeExamesFromCargo,
  } = useExams(form.clinica_nome, form.aso);

  const { exames: catalogExames, loading: catalogLoading } =
    useExamesCatalogOptions();

  const { agendamentos, loading, error, refresh, getById } =
    useAgendamentosList();
  const [filters, setFilters] = useState<AgendamentoFilters>(
    EMPTY_AGENDAMENTO_FILTERS
  );
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [page, setPage] = useState(1);

  const filterOptions = useMemo(() => {
    const fromAgendamentos = extractFilterOptions(agendamentos);
    return {
      ...fromAgendamentos,
      clientes: buildClienteFilterOptions(clientes),
    };
  }, [agendamentos, clientes]);

  const filteredAgendamentos = useMemo(
    () => filterAgendamentos(agendamentos, filters),
    [agendamentos, filters]
  );

  const totalPages = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(filteredAgendamentos.length / AGENDAMENTOS_PAGE_SIZE)
      ),
    [filteredAgendamentos.length]
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * AGENDAMENTOS_PAGE_SIZE;
    const slice = filteredAgendamentos.slice(
      start,
      start + AGENDAMENTOS_PAGE_SIZE
    );
    return mapAgendamentosToTableRows(slice);
  }, [filteredAgendamentos, page]);

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
    setFilters(EMPTY_AGENDAMENTO_FILTERS);
  }, []);

  const cargosFormOptions = useMemo(
    () => buildCargosFormOptions(cargosAtivos, cargoId, cargoNomeSalvo),
    [cargosAtivos, cargoId, cargoNomeSalvo]
  );

  const resetForm = useCallback(() => {
    reset();
    resetExams();
    setClienteId("");
    setCargoId("");
    setCargoNomeSalvo("");
    setEditingId(null);
  }, [reset, resetExams]);

  useEffect(() => {
    if (!form.cliente_nome.trim() || clienteId) return;
    const id = resolveClienteIdByNome(clientes, form.cliente_nome);
    if (id) setClienteId(id);
  }, [clientes, form.cliente_nome, clienteId]);

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
    if (prefill.aso) setField("aso", prefill.aso);

    const clienteResolved = resolveClienteIdByNome(clientes, prefill.cliente_nome);
    if (clienteResolved) setClienteId(clienteResolved);

    if (prefill.cargo_id) {
      setCargoId(prefill.cargo_id);
      if (prefill.cargo_nome) setCargoNomeSalvo(prefill.cargo_nome);
    }

    setShowForm(true);
    setFiltersExpanded(false);

    if (prefill.exame_nome) {
      void mergeExamesFromCargo([prefill.exame_nome]);
    }

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
    mergeExamesFromCargo,
  ]);

  const handleClear = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    resetForm();
    setFiltersExpanded(false);
  }, [resetForm]);

  const toggleFilters = useCallback(() => {
    setFiltersExpanded((prev) => !prev);
  }, []);

  const handleClienteChange = useCallback(
    (nextClienteId: string) => {
      setClienteId(nextClienteId);
      if (!nextClienteId) {
        setField("cliente_nome", "");
        return;
      }
      const cliente = clientes.find((c) => c.id === nextClienteId);
      if (cliente) setField("cliente_nome", cliente.nome);
    },
    [clientes, setField]
  );

  const handleCargoChange = useCallback(
    async (nextCargoId: string) => {
      setCargoId(nextCargoId);
      if (!nextCargoId) {
        setCargoNomeSalvo("");
        return;
      }

      const found = cargosAtivos.find((cargo) => cargo.id === nextCargoId);
      if (found) setCargoNomeSalvo(found.nome);

      try {
        const exames = await listarExamesObrigatoriosPorCargo(nextCargoId);
        if (exames.length === 0) {
          toast.message("Este cargo não possui exames obrigatórios vinculados.");
          return;
        }

        const added = await mergeExamesFromCargo(exames.map((exame) => exame.nome));
        if (added === 0) {
          toast.error(EXAME_DUPLICADO_TOAST);
          return;
        }

        toast.success(`${added} exame(s) do cargo adicionado(s).`);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar exames do cargo.");
      }
    },
    [cargosAtivos, mergeExamesFromCargo]
  );

  const handleEditar = useCallback(
    (id: string) => {
      const agendamento = getById(id);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }
      loadForm(agendamentoToFormValues(agendamento));
      loadExams(agendamentoToExams(agendamento));
      setClienteId(
        resolveClienteIdByNome(clientes, agendamento.cliente_nome ?? "")
      );
      setCargoId(agendamento.cargo_id ?? "");
      setCargoNomeSalvo(agendamento.cargo_nome ?? "");
      setEditingId(id);
      setShowForm(true);
      setFiltersExpanded(false);
      requestAnimationFrame(() => {
        document
          .getElementById("novo-agendamento")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [getById, loadForm, loadExams, clientes]
  );

  const handleVisualizar = useCallback(
    (id: string) => {
      const agendamento = getById(id);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }
      setViewAgendamento(agendamento);
    },
    [getById]
  );

  const handleHistorico = useCallback((id: string) => {
    setHistoricoAgendamentoId(id);
    setHistoricoOpen(true);
  }, []);

  const handleCancelar = useCallback(
    (id: string) => {
      const agendamento = getById(id);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }
      if (agendamento.status === "cancelado") {
        toast.error("Este agendamento já está cancelado.");
        return;
      }

      setCancelTargetId(id);
      setCancelModalOpen(true);
    },
    [getById]
  );

  const closeHistoricoModal = useCallback(() => {
    setHistoricoOpen(false);
    setHistoricoAgendamentoId(null);
  }, []);

  const closeCancelModal = useCallback(() => {
    setCancelModalOpen(false);
    setCancelTargetId(null);
  }, []);

  const handleConfirmarCancelamento = useCallback(
    async (motivo: string) => {
      if (!cancelTargetId) return;

      const agendamento = getById(cancelTargetId);
      if (!agendamento) {
        toast.error("Agendamento não encontrado.");
        return;
      }

      setSaving(true);
      try {
        await cancelarAgendamento(cancelTargetId, motivo);
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
        toast.success("Agendamento cancelado com sucesso!");
        setCancelModalOpen(false);
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
      cancelTargetId,
      getById,
      setSaving,
      editingId,
      closeForm,
      viewAgendamento,
      refresh,
      historicoUsuario,
    ]
  );

  const executeSave = useCallback(
    async (status: AgendamentoStatus, skipMesCheck = false) => {
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
        toast.error(INVALID_DATE_TOAST);
        return;
      }
      if (!form.horario.trim()) {
        toast.error(VALIDATION_TOAST_MESSAGE);
        return;
      }
      if (!isValidHorario24(form.horario)) {
        toast.error(INVALID_TIME_TOAST);
        return;
      }

      if (!isAgendamentoCompleto(form, exams)) {
        toast.error(
          getAgendamentoValidationMessage(form, exams) ??
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

      const dataIso = parseDateBRToIso(form.data_agendamento);
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

      if (!skipMesCheck) {
        if (dataIso) {
          const existente = await verificarAgendamentoMesmoMes({
            clienteNome: form.cliente_nome,
            colaborador: form.colaborador,
            dataAgendamentoIso: dataIso,
            ignorarAgendamentoId: editingId,
          });

          if (existente) {
            setDuplicidadeMesInfo(existente);
            setPendingSaveStatus(status);
            setDuplicidadeMesOpen(true);
            return;
          }
        }
      }

      setSaving(true);
      try {
        const cargoFields = buildCargoAgendamentoFields(
          cargoId,
          cargosAtivos,
          cargoNomeSalvo
        );
        const payload = buildPayload(status, cargoFields);
        const examesPayload = getExamesPayload();

        if (editingId) {
          const anterior = getById(editingId);
          if (!anterior) {
            toast.error("Agendamento não encontrado.");
            return;
          }
          await atualizarAgendamentoComExames(editingId, payload, examesPayload);
          const alteracoes = buildHistoricoAlteracoes(
            anterior,
            payload,
            examesPayload,
            historicoUsuario
          );
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
          toast.success("Agendamento atualizado com sucesso!");
        } else {
          const novoId = await salvarAgendamentoComExames(payload, examesPayload);
          await registrarHistorico(
            novoId,
            historicoUsuario,
            buildHistoricoCriacao(historicoUsuario),
            {
              auditContext,
              registroNome: payload.colaborador,
            }
          );

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

        setDuplicidadeMesOpen(false);
        setDuplicidadeMesInfo(null);
        setPendingSaveStatus(null);
        setShowForm(false);
        resetForm();
        setFiltersExpanded(false);
        refresh();
      } catch (err) {
        console.error("Erro completo ao salvar:", err);
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "";
        toast.error(message || "Erro ao salvar agendamento");
      } finally {
        setSaving(false);
      }
    },
    [
      hasExamWarnings,
      form,
      exams,
      setSaving,
      buildPayload,
      getExamesPayload,
      cargoId,
      cargoNomeSalvo,
      cargosAtivos,
      editingId,
      getById,
      resetForm,
      refresh,
      historicoUsuario,
    ]
  );

  const handleSave = useCallback(
    async (status: AgendamentoStatus) => {
      await executeSave(status);
    },
    [executeSave]
  );

  const closeDuplicidadeMesModal = useCallback(() => {
    setDuplicidadeMesOpen(false);
    setDuplicidadeMesInfo(null);
    setPendingSaveStatus(null);
  }, []);

  const handleConfirmSaveMesmoMes = useCallback(async () => {
    if (!pendingSaveStatus) return;
    const status = pendingSaveStatus;
    setDuplicidadeMesOpen(false);
    await executeSave(status, true);
  }, [executeSave, pendingSaveStatus]);

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

  return {
    showForm,
    editingId,
    viewAgendamento,
    setViewAgendamento,
    historicoOpen,
    historicoAgendamentoId,
    cancelModalOpen,
    saving,
    form,
    setField,
    clinicasAtivas,
    clientes,
    clientesLoading,
    clienteId,
    handleClienteChange,
    cargoId,
    cargosAtivos: cargosFormOptions,
    cargosLoading,
    handleCargoChange,
    exams,
    totals,
    catalogExames,
    catalogLoading,
    pricingLoading,
    addExam,
    removeExam,
    updateExam,
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
    handleSave,
    handleCopyMensagemClinica,
    duplicidadeMesOpen,
    duplicidadeMesInfo,
    closeDuplicidadeMesModal,
    handleConfirmSaveMesmoMes,
    contratoVigencia,
    contratoInvalido,
  };
}
