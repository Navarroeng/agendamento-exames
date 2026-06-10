"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useHistoricoUsuario } from "@/contexts/AuthContext";
import {
  isValidDateBR,
  parseDateBRToIso,
} from "@/lib/agendamento-datetime";
import {
  EMPTY_FATURA_FILTERS,
  emptyHistoricoFiltersForTipo,
  extractFaturaFilterOptions,
  filterAgendamentosFatura,
  filterFaturasHistorico,
  formatPeriodoFatura,
  FATURA_HISTORICO_PAGE_SIZE,
  type FaturaFilters,
  type FaturaHistoricoFilters,
} from "@/lib/fatura-filters";
import {
  buildFaturaItensFromAgendamentos,
  calcTotalFaturaItens,
  faturaComItensToPreview,
  parsePeriodoIso,
} from "@/lib/fatura-mappers";
import {
  FATURA_CLINICA_DUPLICADA_MSG,
  FATURA_DUPLICADA_MSG,
} from "@/lib/duplicidade-validations";
import { gerarPdfFromFatura } from "@/lib/fatura-pdf";
import {
  verificarFaturaExistenteMes,
  type FaturaExistenteInfo,
} from "@/services/duplicidade.service";
import {
  buscarFaturaComItens,
  cancelarFatura,
  listarFaturas,
  marcarFaturaPendente,
  registrarPagamentoFatura,
  salvarFatura,
} from "@/services/fatura-historico.service";
import { listarAgendamentosParaFatura } from "@/services/fatura.service";
import { useClientesList } from "@/hooks/useClientesList";
import { buildClienteFilterOptions } from "@/lib/cliente-display";
import { FATURA_SEM_ELEGIVEIS_MSG } from "@/lib/fatura-elegibilidade";
import type {
  AgendamentoWithExames,
  FaturaPreviewState,
  FaturaRecord,
  FaturaStatus,
  FaturaTipo,
} from "@/lib/types";
import type { FaturaPagamentoModalMode } from "@/components/faturas/FaturaPagamentoModal";

const NO_RECORDS_TOAST = FATURA_SEM_ELEGIVEIS_MSG;

function buildPreviewFromAgendamentos(
  tipo: FaturaTipo,
  referenciaNome: string,
  filters: FaturaFilters,
  agendamentos: AgendamentoWithExames[],
  extras?: {
    faturaId?: string | null;
    numero?: string | null;
    status?: FaturaStatus | null;
    readonly?: boolean;
  }
): FaturaPreviewState {
  const itens = buildFaturaItensFromAgendamentos(agendamentos, tipo);
  const { periodo_inicio, periodo_fim } = parsePeriodoIso(filters.mesReferencia);
  const vencimento =
    tipo === "clinica"
      ? {
          iso:
            periodo_fim ?? new Date().toISOString().split("T")[0],
          label: "",
        }
      : {
          iso: parseDateBRToIso(filters.dataVencimento)!,
          label: filters.dataVencimento,
        };

  return {
    tipo,
    referenciaNome,
    periodoLabel: formatPeriodoFatura(filters.mesReferencia),
    periodo_inicio,
    periodo_fim,
    data_vencimento: vencimento.iso,
    data_vencimento_label: vencimento.label,
    itens,
    numero: extras?.numero ?? null,
    faturaId: extras?.faturaId ?? null,
    status: extras?.status ?? null,
    readonly: extras?.readonly ?? false,
  };
}

export function useFaturasPage(pageTipo: FaturaTipo) {
  const geradoPor = useHistoricoUsuario();
  const { clientes } = useClientesList();

  const [agendamentos, setAgendamentos] = useState<AgendamentoWithExames[]>(
    []
  );
  const [faturas, setFaturas] = useState<Awaited<ReturnType<typeof listarFaturas>>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [historicoLoading, setHistoricoLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<FaturaFilters>(EMPTY_FATURA_FILTERS);
  const [historicoFilters, setHistoricoFilters] =
    useState<FaturaHistoricoFilters>(() =>
      emptyHistoricoFiltersForTipo(pageTipo)
    );
  const [historicoPage, setHistoricoPage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<FaturaPreviewState | null>(null);
  const previewRef = useRef<FaturaPreviewState | null>(null);
  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [pagamentoMode, setPagamentoMode] =
    useState<FaturaPagamentoModalMode>("registrar");
  const [pagamentoFatura, setPagamentoFatura] = useState<FaturaRecord | null>(
    null
  );
  const [faturaDuplicidadeOpen, setFaturaDuplicidadeOpen] = useState(false);
  const [faturaDuplicidadeInfo, setFaturaDuplicidadeInfo] =
    useState<FaturaExistenteInfo | null>(null);
  const [faturaDuplicidadeTipo, setFaturaDuplicidadeTipo] =
    useState<FaturaTipo>("cliente");

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  const reloadHistorico = useCallback(async () => {
    setHistoricoLoading(true);
    try {
      const data = await listarFaturas();
      setFaturas(data);
    } catch (err) {
      console.error("Erro ao carregar histórico de faturas:", err);
      toast.error("Erro ao carregar histórico de faturas.");
    } finally {
      setHistoricoLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await listarAgendamentosParaFatura();
        if (!cancelled) setAgendamentos(data);
      } catch (err) {
        console.error("Erro ao carregar agendamentos para faturas:", err);
        if (!cancelled) {
          toast.error("Erro ao carregar dados para faturas.");
          setAgendamentos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    reloadHistorico();
    return () => {
      cancelled = true;
    };
  }, [reloadHistorico]);

  const filterOptions = useMemo(() => {
    const fromAgendamentos = extractFaturaFilterOptions(agendamentos);
    return {
      ...fromAgendamentos,
      clientes: buildClienteFilterOptions(clientes),
    };
  }, [agendamentos, clientes]);

  const agendamentosFiltrados = useMemo(
    () => filterAgendamentosFatura(agendamentos, filters),
    [agendamentos, filters]
  );

  const faturasDoTipo = useMemo(
    () => faturas.filter((f) => f.tipo === pageTipo),
    [faturas, pageTipo]
  );

  const faturasFiltradas = useMemo(
    () => filterFaturasHistorico(faturasDoTipo, historicoFilters),
    [faturasDoTipo, historicoFilters]
  );

  const totalHistoricoPages = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(faturasFiltradas.length / FATURA_HISTORICO_PAGE_SIZE)
      ),
    [faturasFiltradas.length]
  );

  const faturasPaginadas = useMemo(() => {
    const start = (historicoPage - 1) * FATURA_HISTORICO_PAGE_SIZE;
    return faturasFiltradas.slice(
      start,
      start + FATURA_HISTORICO_PAGE_SIZE
    );
  }, [faturasFiltradas, historicoPage]);

  useEffect(() => {
    setHistoricoPage(1);
  }, [historicoFilters]);

  useEffect(() => {
    if (historicoPage > totalHistoricoPages) {
      setHistoricoPage(totalHistoricoPages);
    }
  }, [historicoPage, totalHistoricoPages]);

  const handleHistoricoPageChange = useCallback((page: number) => {
    setHistoricoPage(page);
  }, []);

  const handleFilterChange = useCallback(
    (field: keyof FaturaFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_FATURA_FILTERS);
  }, []);

  const handleHistoricoFilterChange = useCallback(
    (field: keyof FaturaHistoricoFilters, value: string) => {
      if (field === "tipo") return;
      setHistoricoFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleClearHistoricoFilters = useCallback(() => {
    setHistoricoFilters(emptyHistoricoFiltersForTipo(pageTipo));
    setHistoricoPage(1);
  }, [pageTipo]);

  const validateVencimento = useCallback((): boolean => {
    if (!filters.dataVencimento.trim()) {
      toast.error("Informe a data de vencimento antes de gerar a fatura.");
      return false;
    }
    if (!isValidDateBR(filters.dataVencimento)) {
      toast.error("Data de vencimento inválida. Use o formato DD/MM/AAAA.");
      return false;
    }
    return true;
  }, [filters.dataVencimento]);

  const bloquearFaturaDuplicada = useCallback(
    async (
      tipo: FaturaTipo,
      referencia: string,
      ignorarFaturaId?: string | null
    ): Promise<boolean> => {
      if (!filters.mesReferencia.trim()) return false;

      const existente = await verificarFaturaExistenteMes({
        tipo,
        referenciaNome: referencia,
        mesReferencia: filters.mesReferencia,
        ignorarFaturaId,
      });

      if (!existente) return false;

      setFaturaDuplicidadeTipo(tipo);
      setFaturaDuplicidadeInfo(existente);
      setFaturaDuplicidadeOpen(true);
      toast.error(
        tipo === "cliente" ? FATURA_DUPLICADA_MSG : FATURA_CLINICA_DUPLICADA_MSG
      );
      return true;
    },
    [filters.mesReferencia]
  );

  const openPreviewForTipo = useCallback(
    async (tipo: FaturaTipo) => {
      const referencia =
        tipo === "cliente" ? filters.cliente.trim() : filters.clinica.trim();

      if (tipo === "cliente" && !referencia) {
        toast.error(
          "Selecione ou informe a empresa/cliente para gerar a fatura."
        );
        return;
      }
      if (tipo === "clinica" && !referencia) {
        toast.error("Selecione ou informe a clínica para gerar a fatura.");
        return;
      }
      if (!filters.mesReferencia.trim()) {
        toast.error("Informe o mês de referência para gerar a fatura.");
        return;
      }
      if (tipo === "cliente" && !validateVencimento()) return;

      if (await bloquearFaturaDuplicada(tipo, referencia)) return;

      const itens = buildFaturaItensFromAgendamentos(
        agendamentosFiltrados,
        tipo
      );
      if (itens.length === 0) {
        toast.error(NO_RECORDS_TOAST);
        return;
      }

      const nextPreview = buildPreviewFromAgendamentos(
        tipo,
        referencia,
        filters,
        agendamentosFiltrados
      );
      previewRef.current = nextPreview;
      setPreview(nextPreview);
      setPreviewOpen(true);
    },
    [
      agendamentosFiltrados,
      bloquearFaturaDuplicada,
      filters,
      validateVencimento,
    ]
  );

  const handlePrevia = useCallback(() => {
    openPreviewForTipo(pageTipo);
  }, [openPreviewForTipo, pageTipo]);

  const persistPreview = useCallback(
    async (status: FaturaStatus) => {
      const current = previewRef.current;
      if (!current) throw new Error("Pré-visualização indisponível.");

      const mesReferencia = current.periodo_inicio
        ? `${current.periodo_inicio.split("-")[1]}/${current.periodo_inicio.slice(0, 4)}`
        : filters.mesReferencia;

      if (mesReferencia.trim()) {
        const existente = await verificarFaturaExistenteMes({
          tipo: current.tipo,
          referenciaNome: current.referenciaNome,
          mesReferencia,
          ignorarFaturaId: current.faturaId,
        });

        if (existente) {
          setFaturaDuplicidadeTipo(current.tipo);
          setFaturaDuplicidadeInfo(existente);
          setFaturaDuplicidadeOpen(true);
          throw new Error(
            current.tipo === "cliente"
              ? FATURA_DUPLICADA_MSG
              : FATURA_CLINICA_DUPLICADA_MSG
          );
        }
      }

      const valorTotal = calcTotalFaturaItens(current.itens);

      const saved = await salvarFatura({
        faturaId: current.faturaId,
        tipo: current.tipo,
        referencia_nome: current.referenciaNome,
        periodo_inicio: current.periodo_inicio,
        periodo_fim: current.periodo_fim,
        data_vencimento: current.data_vencimento,
        valor_total: valorTotal,
        total_exames: current.itens.length,
        status,
        gerado_por: geradoPor,
        itens: current.itens,
      });

      const nextPreview = faturaComItensToPreview(saved, current.readonly);
      previewRef.current = nextPreview;
      setPreview(nextPreview);
      await reloadHistorico();
      return saved;
    },
    [filters.mesReferencia, geradoPor, reloadHistorico]
  );

  const handleCloseFaturaDuplicidade = useCallback(() => {
    setFaturaDuplicidadeOpen(false);
    setFaturaDuplicidadeInfo(null);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    previewRef.current = null;
    setPreview(null);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    const current = previewRef.current;
    if (!current || current.readonly) return;
    setSaving(true);
    try {
      await persistPreview("rascunho");
      toast.success("Fatura salva como rascunho.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar rascunho."
      );
    } finally {
      setSaving(false);
    }
  }, [persistPreview]);

  const handleEmit = useCallback(async () => {
    const current = previewRef.current;
    if (!current || current.status === "cancelada") return;
    setSaving(true);
    try {
      await persistPreview("emitida");
      toast.success("Fatura emitida com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao emitir fatura."
      );
    } finally {
      setSaving(false);
    }
  }, [persistPreview]);

  const handleGeneratePdf = useCallback(async () => {
    const current = previewRef.current;
    if (!current) return;
    setSaving(true);
    try {
      let fatura = current.faturaId
        ? await buscarFaturaComItens(current.faturaId)
        : null;

      if (!fatura || fatura.status === "rascunho") {
        fatura = await persistPreview("emitida");
      }

      if (!fatura) throw new Error("Fatura não encontrada.");

      await gerarPdfFromFatura(fatura);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao gerar PDF da fatura."
      );
    } finally {
      setSaving(false);
    }
  }, [persistPreview]);

  const handleVisualizar = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const fatura = await buscarFaturaComItens(id);
      if (!fatura) {
        toast.error("Fatura não encontrada.");
        return;
      }
      const nextPreview = faturaComItensToPreview(fatura, true);
      previewRef.current = nextPreview;
      setPreview(nextPreview);
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar fatura.");
    } finally {
      setSaving(false);
    }
  }, []);

  const handleHistoricoPdf = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const fatura = await buscarFaturaComItens(id);
      if (!fatura) {
        toast.error("Fatura não encontrada.");
        return;
      }
      await gerarPdfFromFatura(fatura);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF da fatura.");
    } finally {
      setSaving(false);
    }
  }, []);

  const handleCancelar = useCallback(
    async (id: string) => {
      const fatura = faturas.find((f) => f.id === id);
      if (!fatura) return;

      const ok = window.confirm(
        `Cancelar a fatura ${fatura.numero}? Esta ação não pode ser desfeita.`
      );
      if (!ok) return;

      setSaving(true);
      try {
        await cancelarFatura(id);
        toast.success("Fatura cancelada.");
        if (preview?.faturaId === id) {
          setPreview((prev) =>
            prev ? { ...prev, status: "cancelada" } : null
          );
        }
        await reloadHistorico();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao cancelar fatura.");
      } finally {
        setSaving(false);
      }
    },
    [faturas, preview?.faturaId, reloadHistorico]
  );

  const openPagamentoModal = useCallback(
    (id: string, mode: FaturaPagamentoModalMode) => {
      const fatura = faturas.find((f) => f.id === id);
      if (!fatura) {
        toast.error("Fatura não encontrada.");
        return;
      }
      if (fatura.status !== "emitida") {
        toast.error("Pagamento só pode ser registrado em faturas emitidas.");
        return;
      }
      setPagamentoMode(mode);
      setPagamentoFatura({ ...fatura, pago: fatura.pago ?? false });
      setPagamentoOpen(true);
    },
    [faturas]
  );

  const handleMarcarPago = useCallback(
    (id: string) => openPagamentoModal(id, "registrar"),
    [openPagamentoModal]
  );

  const handleEditarPagamento = useCallback(
    (id: string) => openPagamentoModal(id, "editar"),
    [openPagamentoModal]
  );

  const handleClosePagamento = useCallback(() => {
    if (saving) return;
    setPagamentoOpen(false);
    setPagamentoFatura(null);
  }, [saving]);

  const handleConfirmPagamento = useCallback(
    async (dataPagamentoIso: string, observacao: string | null) => {
      if (!pagamentoFatura) return;

      setSaving(true);
      try {
        await registrarPagamentoFatura(pagamentoFatura.id, {
          data_pagamento: dataPagamentoIso,
          observacao_pagamento: observacao,
        });
        toast.success(
          pagamentoMode === "registrar"
            ? "Pagamento registrado com sucesso"
            : "Pagamento atualizado com sucesso"
        );
        setPagamentoOpen(false);
        setPagamentoFatura(null);
        await reloadHistorico();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao registrar pagamento.");
      } finally {
        setSaving(false);
      }
    },
    [pagamentoFatura, pagamentoMode, reloadHistorico]
  );

  const handleMarcarPendente = useCallback(
    async (id: string) => {
      const fatura = faturas.find((f) => f.id === id);
      if (!fatura) return;

      const ok = window.confirm(
        `Marcar a fatura ${fatura.numero} como pendente? A data e observação de pagamento serão removidas.`
      );
      if (!ok) return;

      setSaving(true);
      try {
        await marcarFaturaPendente(id);
        toast.success("Fatura marcada como pendente.");
        await reloadHistorico();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao marcar fatura como pendente.");
      } finally {
        setSaving(false);
      }
    },
    [faturas, reloadHistorico]
  );

  return {
    pageTipo,
    filters,
    historicoFilters,
    filterOptions,
    agendamentosFiltrados,
    faturas: faturasDoTipo,
    faturasFiltradas,
    faturasPaginadas,
    historicoPage,
    totalHistoricoPages,
    loading,
    historicoLoading,
    saving,
    previewOpen,
    preview,
    handleFilterChange,
    handleClearFilters,
    handleHistoricoFilterChange,
    handleClearHistoricoFilters,
    handleHistoricoPageChange,
    handlePrevia,
    handleClosePreview,
    handleSaveDraft,
    handleEmit,
    handleGeneratePdf,
    handleVisualizar,
    handleHistoricoPdf,
    handleCancelar,
    pagamentoOpen,
    pagamentoMode,
    pagamentoFatura,
    handleMarcarPago,
    handleEditarPagamento,
    handleClosePagamento,
    handleConfirmPagamento,
    handleMarcarPendente,
    faturaDuplicidadeOpen,
    faturaDuplicidadeInfo,
    faturaDuplicidadeTipo,
    handleCloseFaturaDuplicidade,
  };
}
