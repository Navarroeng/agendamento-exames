"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useHistoricoUsuario, useAuditoriaUsuario } from "@/contexts/AuthContext";
import { AUDITORIA_MODULOS } from "@/lib/auditoria";
import {
  INVALID_DATE_TOAST,
  isValidDateBR,
  parseDateBRToIso,
} from "@/lib/agendamento-datetime";
import type { AgendamentoFaturaBloqueio } from "@/lib/agendamento-fatura-bloqueio";
import {
  EMPTY_ESOCIAL_FILTERS,
  ESOCIAL_PAGE_SIZE,
  computeESocialSummary,
  extractESocialFilterOptions,
  filterAgendamentosESocial,
  type ESocialFilters,
} from "@/lib/esocial-filters";
import {
  isValidEsocialRecibo,
  maskEsocialRecibo,
} from "@/lib/esocial-recibo";
import { useAgendamentosList } from "@/hooks/useAgendamentosList";
import { useClientesList } from "@/hooks/useClientesList";
import { buildClienteFilterOptions } from "@/lib/cliente-display";
import { atualizarEnvioEsocial } from "@/services/agendamento.service";
import {
  listarBloqueioFaturaPorAgendamentos,
} from "@/services/agendamento-fatura-bloqueio.service";
import { registrarHistorico } from "@/services/historico.service";
import type { AgendamentoWithExames } from "@/lib/types";

export function useESocialPage() {
  const usuario = useHistoricoUsuario();
  const auditContext = useAuditoriaUsuario();
  const {
    agendamentos,
    loading,
    error,
    refresh,
    reloadAgendamentos,
    updateAgendamentoInList,
    getById,
  } = useAgendamentosList();
  const { clientes } = useClientesList();

  const [filters, setFilters] = useState<ESocialFilters>(EMPTY_ESOCIAL_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const [viewAgendamento, setViewAgendamento] =
    useState<AgendamentoWithExames | null>(null);

  const [marcarEnviadoOpen, setMarcarEnviadoOpen] = useState(false);
  const [marcarEnviadoId, setMarcarEnviadoId] = useState<string | null>(null);
  const [dataEnvioInput, setDataEnvioInput] = useState("");
  const [reciboInput, setReciboInput] = useState("");
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

  const filterOptions = useMemo(() => {
    const fromAgendamentos = extractESocialFilterOptions(agendamentos);
    return {
      ...fromAgendamentos,
      clientes: buildClienteFilterOptions(clientes),
    };
  }, [agendamentos, clientes]);

  const filteredAgendamentos = useMemo(
    () => filterAgendamentosESocial(agendamentos, filters),
    [agendamentos, filters]
  );

  const periodAgendamentos = useMemo(
    () =>
      filterAgendamentosESocial(agendamentos, {
        ...filters,
        statusEsocial: "todos",
      }),
    [
      agendamentos,
      filters.cliente,
      filters.colaborador,
      filters.mesReferencia,
      filters.dataInicio,
      filters.dataFim,
    ]
  );

  const summary = useMemo(
    () => computeESocialSummary(periodAgendamentos),
    [periodAgendamentos]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAgendamentos.length / ESOCIAL_PAGE_SIZE)),
    [filteredAgendamentos.length]
  );

  const paginatedAgendamentos = useMemo(() => {
    const start = (page - 1) * ESOCIAL_PAGE_SIZE;
    return filteredAgendamentos.slice(start, start + ESOCIAL_PAGE_SIZE);
  }, [filteredAgendamentos, page]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleFilterChange = useCallback(
    (field: keyof ESocialFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_ESOCIAL_FILTERS);
    setPage(1);
  }, []);

  const toggleFilters = useCallback(() => {
    setFiltersExpanded((prev) => !prev);
  }, []);

  const handleVisualizar = useCallback(
    (id: string) => {
      const ag = getById(id);
      if (!ag) {
        toast.error("Agendamento não encontrado.");
        return;
      }
      setViewAgendamento(ag);
    },
    [getById]
  );

  const openMarcarEnviado = useCallback((id: string) => {
    setMarcarEnviadoId(id);
    setDataEnvioInput("");
    setReciboInput("");
    setMarcarEnviadoOpen(true);
  }, []);

  const closeMarcarEnviado = useCallback(() => {
    if (saving) return;
    setMarcarEnviadoOpen(false);
    setMarcarEnviadoId(null);
    setDataEnvioInput("");
    setReciboInput("");
  }, [saving]);

  const handleConfirmMarcarEnviado = useCallback(async () => {
    if (!marcarEnviadoId) return;

    if (!dataEnvioInput.trim()) {
      toast.error("Informe a data de envio ao e-Social.");
      return;
    }
    if (!isValidDateBR(dataEnvioInput)) {
      toast.error(INVALID_DATE_TOAST);
      return;
    }

    const recibo = maskEsocialRecibo(reciboInput);
    if (!recibo || !isValidEsocialRecibo(recibo)) {
      toast.error("Informe o Nº Recibo completo do e-Social.");
      return;
    }

    const dataIso = parseDateBRToIso(dataEnvioInput);
    if (!dataIso) return;

    setSaving(true);
    try {
      const updated = await atualizarEnvioEsocial(
        marcarEnviadoId,
        true,
        dataIso,
        recibo
      );
      updateAgendamentoInList(marcarEnviadoId, {
        envio_esocial: updated.envio_esocial,
        data_envio_esocial: updated.data_envio_esocial,
        esocial_recibo: updated.esocial_recibo ?? recibo,
      });
      await registrarHistorico(marcarEnviadoId, usuario, [
        {
          acao: "Alteração",
          detalhes: `${usuario} marcou o agendamento como enviado ao eSocial. Data: ${dataEnvioInput}. Recibo: ${recibo}.`,
        },
      ], {
        auditContext,
        auditModulo: AUDITORIA_MODULOS.esocial,
        registroNome: getById(marcarEnviadoId)?.colaborador,
      });
      await reloadAgendamentos();
      toast.success("e-Social marcado como enviado.");
      setMarcarEnviadoOpen(false);
      setMarcarEnviadoId(null);
      setDataEnvioInput("");
      setReciboInput("");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar envio ao e-Social.");
    } finally {
      setSaving(false);
    }
  }, [
    dataEnvioInput,
    reciboInput,
    marcarEnviadoId,
    reloadAgendamentos,
    updateAgendamentoInList,
    usuario,
    auditContext,
    getById,
  ]);

  const handleMarcarPendente = useCallback(
    async (id: string) => {
      const ag = getById(id);
      if (!ag) {
        toast.error("Agendamento não encontrado.");
        return;
      }

      const ok = window.confirm(
        `Marcar o agendamento de ${ag.colaborador} como pendente de e-Social? A data de envio e o Nº Recibo serão removidos.`
      );
      if (!ok) return;

      setSaving(true);
      try {
        const updated = await atualizarEnvioEsocial(id, false, null, null);
        updateAgendamentoInList(id, {
          envio_esocial: updated.envio_esocial,
          data_envio_esocial: updated.data_envio_esocial,
          esocial_recibo: updated.esocial_recibo,
        });
        await registrarHistorico(id, usuario, [
          {
            acao: "Alteração",
            detalhes: `${usuario} marcou o envio ao e-Social como Pendente`,
          },
        ], {
          auditContext,
          auditModulo: AUDITORIA_MODULOS.esocial,
          registroNome: ag.colaborador,
        });
        await reloadAgendamentos();
        toast.success("e-Social marcado como pendente.");
      } catch (err) {
        console.error(err);
        toast.error("Erro ao atualizar status do e-Social.");
      } finally {
        setSaving(false);
      }
    },
    [getById, reloadAgendamentos, updateAgendamentoInList, usuario, auditContext]
  );

  const viewFaturaBloqueio = useMemo(() => {
    if (!viewAgendamento) return null;
    return bloqueioPorAgendamento.get(viewAgendamento.id) ?? null;
  }, [viewAgendamento, bloqueioPorAgendamento]);

  return {
    loading,
    error,
    saving,
    filters,
    filtersExpanded,
    filterOptions,
    filteredAgendamentos,
    paginatedAgendamentos,
    summary,
    page,
    totalPages,
    handleFilterChange,
    handleClearFilters,
    toggleFilters,
    setPage,
    viewAgendamento,
    setViewAgendamento,
    viewFaturaBloqueio,
    bloqueioPorAgendamento,
    handleVisualizar,
    openMarcarEnviado,
    closeMarcarEnviado,
    handleConfirmMarcarEnviado,
    handleMarcarPendente,
    marcarEnviadoOpen,
    dataEnvioInput,
    setDataEnvioInput,
    reciboInput,
    setReciboInput,
  };
}
