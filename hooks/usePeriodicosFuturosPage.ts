"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { saveAgendamentoPrefill } from "@/lib/agendamento-prefill";
import {
  EMPTY_PERIODICO_FUTURO_FILTERS,
  extractPeriodicoFilterOptions,
  filterPeriodicosFuturosPorMes,
  listPeriodicoAnosDisponiveis,
  resolveInitialMesPeriodicos,
  toPeriodicoFuturoRow,
} from "@/lib/periodicos-futuro";
import {
  agruparPeriodicosPorColaboradorCiclo,
  countPeriodicoGruposByDisplayStatus,
  filterPeriodicoGrupos,
  isExameClinico,
  type PeriodicoFuturoGrupo,
} from "@/lib/periodico-agrupamento";
import {
  resolveMesParaAno,
  type YearMonth,
} from "@/lib/listagem-meses";
import type {
  PeriodicoFuturoDisplayStatus,
  PeriodicoFuturoFilters,
  PeriodicoFuturoRow,
} from "@/lib/types";
import {
  cancelarAcompanhamentoPeriodico,
  atualizarProximaDataPeriodico,
  listarPeriodicosFuturos,
  marcarPeriodicoReagendado,
  regularizarCpfPeriodicosFuturos,
} from "@/services/periodico-futuro.service";
import { PeriodicoCpfConflitoError } from "@/lib/periodico-cpf-regularizacao";

const PAGE_SIZE = 20;

export function usePeriodicosFuturosPage() {
  const router = useRouter();
  const auditContext = useAuditoriaUsuario();
  const auditOptions = useMemo(() => ({ auditContext }), [auditContext]);
  const [records, setRecords] = useState<PeriodicoFuturoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PeriodicoFuturoFilters>(
    EMPTY_PERIODICO_FUTURO_FILTERS
  );
  const [page, setPage] = useState(1);
  const [activeCard, setActiveCard] = useState<
    PeriodicoFuturoDisplayStatus | ""
  >("");
  const [mesSelecionado, setMesSelecionado] = useState<YearMonth>(() =>
    resolveInitialMesPeriodicos([])
  );
  const [editProximaDataRecord, setEditProximaDataRecord] =
    useState<PeriodicoFuturoGrupo | null>(null);
  const [adicionarCpfGrupo, setAdicionarCpfGrupo] =
    useState<PeriodicoFuturoGrupo | null>(null);
  const [adicionarCpfError, setAdicionarCpfError] = useState<string | null>(
    null
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarPeriodicosFuturos();
      setRecords(data.map(toPeriodicoFuturoRow));
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os periódicos futuros.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const anosDisponiveis = useMemo(
    () => listPeriodicoAnosDisponiveis(records),
    [records]
  );

  // Garante que o ano selecionado exista no seletor após o carregamento.
  useEffect(() => {
    if (anosDisponiveis.length === 0) return;
    if (!anosDisponiveis.includes(mesSelecionado.year)) {
      setMesSelecionado((prev) =>
        resolveMesParaAno(anosDisponiveis[0], prev.month, {
          allowFutureMonths: true,
        })
      );
    }
  }, [anosDisponiveis, mesSelecionado.year]);

  const recordsDoMes = useMemo(
    () => filterPeriodicosFuturosPorMes(records, mesSelecionado),
    [records, mesSelecionado]
  );

  const gruposDoMes = useMemo(
    () => agruparPeriodicosPorColaboradorCiclo(recordsDoMes),
    [recordsDoMes]
  );

  const filterOptions = useMemo(
    () => extractPeriodicoFilterOptions(recordsDoMes),
    [recordsDoMes]
  );

  const filteredRecords = useMemo(() => {
    const mergedFilters: PeriodicoFuturoFilters = {
      ...filters,
      mesReferencia: "",
      status: activeCard || filters.status,
    };
    return filterPeriodicoGrupos(gruposDoMes, mergedFilters);
  }, [gruposDoMes, filters, activeCard]);

  const counts = useMemo(
    () => countPeriodicoGruposByDisplayStatus(gruposDoMes),
    [gruposDoMes]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE)),
    [filteredRecords.length]
  );

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

  useEffect(() => {
    setPage(1);
  }, [filters, activeCard, mesSelecionado]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleFilterChange = useCallback(
    (field: keyof PeriodicoFuturoFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
      if (field === "status") setActiveCard("");
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_PERIODICO_FUTURO_FILTERS);
    setActiveCard("");
  }, []);

  const handleMesChange = useCallback((mes: YearMonth) => {
    setMesSelecionado(mes);
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setMesSelecionado((prev) =>
      resolveMesParaAno(year, prev.month, { allowFutureMonths: true })
    );
  }, []);

  const handleCardClick = useCallback((status: PeriodicoFuturoDisplayStatus) => {
    setActiveCard((prev) => (prev === status ? "" : status));
    setFilters((prev) => ({ ...prev, status: "" }));
  }, []);

  const handleCriarAgendamento = useCallback(
    (record: PeriodicoFuturoGrupo) => {
      saveAgendamentoPrefill({
        cliente_nome: record.cliente_nome,
        colaborador: record.colaborador,
        colaborador_cpf: record.colaborador_cpf ?? undefined,
        cargo_id: record.cargo_id ?? undefined,
        cargo_nome: record.cargo_nome ?? undefined,
        exame_nome:
          record.examesNomes.find((nome) => isExameClinico(nome)) ??
          record.examesNomes[0] ??
          record.exame_nome,
        aso: record.tipo_aso || "Periódico",
      });
      router.push("/");
    },
    [router]
  );

  const handleVisualizarAgendamento = useCallback(
    (agendamentoId: string) => {
      router.push(`/?abrirAgendamento=${encodeURIComponent(agendamentoId)}`);
    },
    [router]
  );

  const handleMarcarReagendado = useCallback(
    async (ids: string[]) => {
      setSaving(true);
      try {
        for (const id of ids) {
          await marcarPeriodicoReagendado(id, auditOptions);
        }
        toast.success(
          ids.length > 1
            ? "Periódicos do ciclo marcados como reagendados."
            : "Marcado como reagendado."
        );
        await refresh();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao marcar como reagendado.");
      } finally {
        setSaving(false);
      }
    },
    [refresh, auditOptions]
  );

  const handleCancelarAcompanhamento = useCallback(
    async (ids: string[]) => {
      setSaving(true);
      try {
        for (const id of ids) {
          await cancelarAcompanhamentoPeriodico(id, auditOptions);
        }
        toast.success(
          ids.length > 1
            ? "Acompanhamentos do ciclo cancelados."
            : "Acompanhamento cancelado."
        );
        await refresh();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao cancelar acompanhamento.");
      } finally {
        setSaving(false);
      }
    },
    [refresh, auditOptions]
  );

  const handleAbrirEditarProximaData = useCallback(
    (record: PeriodicoFuturoGrupo) => {
      if (!record.podeEditarProximaData) {
        toast.error(
          "Não é possível editar a próxima data de um periódico já realizado."
        );
        return;
      }
      setEditProximaDataRecord(record);
    },
    []
  );

  const handleFecharEditarProximaData = useCallback(() => {
    if (saving) return;
    setEditProximaDataRecord(null);
  }, [saving]);

  const handleSalvarProximaData = useCallback(
    async (id: string, novaDataIso: string) => {
      const ids = editProximaDataRecord?.ids?.length
        ? editProximaDataRecord.ids
        : [id];
      setSaving(true);
      try {
        for (const periodicoId of ids) {
          await atualizarProximaDataPeriodico(
            periodicoId,
            novaDataIso,
            auditOptions
          );
        }
        toast.success("Próxima data atualizada.");
        setEditProximaDataRecord(null);
        await refresh();
      } catch (err) {
        console.error(err);
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Erro ao atualizar a próxima data.";
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [refresh, auditOptions, editProximaDataRecord]
  );

  const handleAbrirAdicionarCpf = useCallback((grupo: PeriodicoFuturoGrupo) => {
    if (grupo.temCpf) return;
    setAdicionarCpfError(null);
    setAdicionarCpfGrupo(grupo);
  }, []);

  const handleFecharAdicionarCpf = useCallback(() => {
    if (saving) return;
    setAdicionarCpfGrupo(null);
    setAdicionarCpfError(null);
  }, [saving]);

  const handleSalvarCpf = useCallback(
    async (grupo: PeriodicoFuturoGrupo, cpf: string) => {
      setSaving(true);
      setAdicionarCpfError(null);
      try {
        await regularizarCpfPeriodicosFuturos({
          periodicoIds: grupo.ids,
          cpf,
          colaborador: grupo.colaborador,
          clienteNome: grupo.cliente_nome,
          cargoId: grupo.cargo_id,
          cargoNome: grupo.cargo_nome,
          contratoId: grupo.contrato_id,
          auditOptions,
        });
        toast.success("CPF regularizado. O colaborador passa a ser identificado por este CPF.");
        setAdicionarCpfGrupo(null);
        await refresh();
      } catch (err) {
        console.error(err);
        const message =
          err instanceof PeriodicoCpfConflitoError
            ? err.message
            : err instanceof Error && err.message
              ? err.message
              : "Não foi possível salvar o CPF.";
        setAdicionarCpfError(message);
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [auditOptions, refresh]
  );

  const canActOnRecord = useCallback(
    (record: PeriodicoFuturoGrupo) => record.temAcaoAtiva,
    []
  );

  return {
    records,
    loading,
    saving,
    error,
    filters,
    mesSelecionado,
    anosDisponiveis,
    filterOptions,
    filteredRecords,
    paginatedRecords,
    counts,
    page,
    totalPages,
    activeCard,
    editProximaDataRecord,
    adicionarCpfGrupo,
    adicionarCpfError,
    handleFilterChange,
    handleClearFilters,
    handleMesChange,
    handleYearChange,
    handleCardClick,
    setPage,
    handleCriarAgendamento,
    handleVisualizarAgendamento,
    handleMarcarReagendado,
    handleCancelarAcompanhamento,
    handleAbrirEditarProximaData,
    handleFecharEditarProximaData,
    handleSalvarProximaData,
    handleAbrirAdicionarCpf,
    handleFecharAdicionarCpf,
    handleSalvarCpf,
    canActOnRecord,
    refresh,
  };
}
