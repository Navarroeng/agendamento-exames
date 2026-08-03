"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useHistoricoUsuario, useAuditoriaUsuario } from "@/contexts/AuthContext";
import { isValidMonthYearBR } from "@/lib/agendamento-datetime";
import { calcVencimentoFaturaCliente } from "@/lib/fatura-vencimento";
import { canReemitirFaturaCliente, faturaStatusPermitePagamento, mesReferenciaBRFromFatura } from "@/lib/fatura-reemissao";
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
  buildResumoClientesMes,
  buildResumoClinicasMes,
  getCurrentMonthYearBR,
  computeFaturaMesResumo,
  filterFaturaMesRowsByStatus,
} from "@/lib/fatura-mes-resumo";
import {
  buildFaturaItensFromAgendamentos,
  calcTotalFaturaItens,
  faturaComItensToPreview,
  faturaItensToInsert,
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
  ComprovanteValidationError,
} from "@/lib/fatura-comprovante";
import {
  buscarFaturaComItens,
  cancelarFatura,
  listarFaturas,
  marcarConferenciaCustosClinica,
  marcarFaturaPendente,
  atualizarPagamentoFatura,
  registrarPagamentoFatura,
  reabrirConferenciaCustosClinica,
  reemitirFaturaClienteCancelada,
  salvarFatura,
  sincronizarFaturasClienteNecessitaReemissao,
} from "@/services/fatura-historico.service";
import { sincronizarFaturasVencidas } from "@/services/fatura-inadimplencia.service";
import { listarFaturasClienteComAlteracaoPosEmissao } from "@/services/agendamento-fatura-bloqueio.service";
import { obterUrlComprovantePagamento } from "@/services/fatura-comprovante.service";
import { obterUrlFaturaClinicaConferencia } from "@/services/fatura-conferencia-clinica.service";
import { listarAgendamentosParaFatura } from "@/services/fatura.service";
import { useClientesList } from "@/hooks/useClientesList";
import { buildClienteFilterOptionsHistorico } from "@/lib/cliente-display";
import { FATURA_SEM_AGENDAMENTOS_VALIDOS_REEMISSAO_MSG, FATURA_SEM_ELEGIVEIS_MSG, FATURA_SEM_VALOR_COMPETENCIA_MSG } from "@/lib/fatura-elegibilidade";
import type {
  AgendamentoWithExames,
  FaturaPreviewState,
  FaturaRecord,
  FaturaStatus,
  FaturaTipo,
} from "@/lib/types";
import type { FaturaPagamentoModalMode } from "@/components/faturas/FaturaPagamentoModal";

const NO_RECORDS_TOAST = FATURA_SEM_ELEGIVEIS_MSG;

function findFaturaRascunhoParaReferencia(
  rows: { referenciaNome: string; fatura: FaturaRecord | null }[] | undefined,
  referencia: string
): FaturaRecord | null | undefined {
  const normalized = referencia.trim().toLowerCase();
  const clienteRows =
    rows?.filter(
      (row) => row.referenciaNome.trim().toLowerCase() === normalized
    ) ?? [];

  const rascunho = clienteRows.find((row) => row.fatura?.status === "rascunho")
    ?.fatura;
  if (rascunho) return rascunho;

  if (clienteRows.some((row) => !row.fatura)) return undefined;

  return null;
}

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
      : (() => {
          const auto = calcVencimentoFaturaCliente(filters.mesReferencia);
          if (auto) return auto;
          return { iso: "", label: "—" };
        })();

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
  const auditContext = useAuditoriaUsuario();
  const auditOptions = useMemo(() => ({ auditContext }), [auditContext]);
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
  const [filters, setFilters] = useState<FaturaFilters>(() => ({
    ...EMPTY_FATURA_FILTERS,
    mesReferencia: getCurrentMonthYearBR(),
  }));
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
  const [conferenciaOpen, setConferenciaOpen] = useState(false);
  const [conferenciaFatura, setConferenciaFatura] =
    useState<FaturaRecord | null>(null);
  const [faturaDuplicidadeOpen, setFaturaDuplicidadeOpen] = useState(false);
  const [faturaDuplicidadeInfo, setFaturaDuplicidadeInfo] =
    useState<FaturaExistenteInfo | null>(null);
  const [faturaDuplicidadeTipo, setFaturaDuplicidadeTipo] =
    useState<FaturaTipo>("cliente");

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  const reloadAgendamentos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarAgendamentosParaFatura();
      setAgendamentos(data);
    } catch (err) {
      console.error("Erro ao carregar agendamentos para faturas:", err);
      toast.error("Erro ao carregar dados para faturas.");
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const reloadHistoricoRef = useRef(reloadHistorico);
  reloadHistoricoRef.current = reloadHistorico;

  const syncVencidasToastShownRef = useRef(false);
  const syncVencidasAttemptedRef = useRef(false);

  const reloadAll = useCallback(async () => {
    await Promise.all([reloadAgendamentos(), reloadHistorico()]);
  }, [reloadAgendamentos, reloadHistorico]);

  useEffect(() => {
    if (pageTipo !== "cliente") return;
    if (syncVencidasAttemptedRef.current) return;

    syncVencidasAttemptedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const atualizadas = await sincronizarFaturasVencidas(auditOptions);
        if (cancelled || atualizadas === 0) return;
        const data = await listarFaturas();
        if (!cancelled) setFaturas(data);
      } catch (err) {
        console.error("Erro ao sincronizar faturas vencidas:", err);
        if (!cancelled && !syncVencidasToastShownRef.current) {
          syncVencidasToastShownRef.current = true;
          toast.error("Não foi possível atualizar o status de faturas vencidas.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageTipo, auditOptions]);

  useEffect(() => {
    if (pageTipo !== "cliente") return;

    const emitidaIds = faturas
      .filter((f) => f.tipo === "cliente" && f.status === "emitida")
      .map((f) => f.id);

    if (emitidaIds.length === 0) return;

    let cancelled = false;

    void listarFaturasClienteComAlteracaoPosEmissao(emitidaIds)
      .then(async (ids) => {
        if (cancelled || ids.size === 0) return;
        await sincronizarFaturasClienteNecessitaReemissao(
          Array.from(ids),
          auditOptions
        );
        await reloadHistoricoRef.current();
      })
      .catch((err) => {
        console.error("Erro ao sincronizar faturas que necessitam reemissão:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [faturas, pageTipo, auditOptions]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        reloadAll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [reloadAll]);

  const filterOptions = useMemo(() => {
    const fromAgendamentos = extractFaturaFilterOptions(agendamentos);
    return {
      ...fromAgendamentos,
      clientes: buildClienteFilterOptionsHistorico(
        clientes,
        agendamentos.map((ag) => ag.cliente_nome)
      ),
    };
  }, [agendamentos, clientes]);

  const agendamentosFiltrados = useMemo(
    () => filterAgendamentosFatura(agendamentos, filters),
    [agendamentos, filters]
  );

  const mesReferenciaValido = useMemo(
    () =>
      !filters.mesReferencia.trim() ||
      isValidMonthYearBR(filters.mesReferencia),
    [filters.mesReferencia]
  );

  const resumoMesBase = useMemo(() => {
    if (!mesReferenciaValido) return null;
    return pageTipo === "cliente"
      ? buildResumoClientesMes(
          agendamentos,
          faturas,
          filters.mesReferencia,
          filters.cliente
        )
      : buildResumoClinicasMes(
          agendamentos,
          faturas,
          filters.mesReferencia,
          filters.clinica
        );
  }, [
    agendamentos,
    faturas,
    filters.cliente,
    filters.clinica,
    filters.mesReferencia,
    mesReferenciaValido,
    pageTipo,
  ]);

  const resumoMes = useMemo(() => {
    if (!resumoMesBase) return null;
    if (pageTipo !== "cliente" || !filters.status.trim()) {
      return resumoMesBase;
    }

    const rows = filterFaturaMesRowsByStatus(
      resumoMesBase.rows,
      filters.status
    );
    return {
      rows,
      resumo: computeFaturaMesResumo(rows),
    };
  }, [filters.status, pageTipo, resumoMesBase]);

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

  const syncClienteVencimentoNoPreview = useCallback((): boolean => {
    const current = previewRef.current;
    if (!current || current.tipo !== "cliente") return true;

    const mesReferencia =
      filters.mesReferencia.trim() ||
      (current.periodo_inicio
        ? `${current.periodo_inicio.split("-")[1]}/${current.periodo_inicio.slice(0, 4)}`
        : "");

    const vencimento = calcVencimentoFaturaCliente(mesReferencia);
    if (!vencimento) {
      toast.error("Não foi possível calcular o vencimento da fatura.");
      return false;
    }

    const updated: FaturaPreviewState = {
      ...current,
      data_vencimento: vencimento.iso,
      data_vencimento_label: vencimento.label,
    };
    previewRef.current = updated;
    setPreview(updated);
    return true;
  }, [filters.mesReferencia]);

  const bloquearFaturaDuplicada = useCallback(
    async (
      tipo: FaturaTipo,
      referencia: string,
      ignorarFaturaId?: string | null,
      mesReferenciaOverride?: string
    ): Promise<boolean> => {
      const mesReferencia =
        mesReferenciaOverride?.trim() || filters.mesReferencia.trim();
      if (!mesReferencia) return false;

      const existente = await verificarFaturaExistenteMes({
        tipo,
        referenciaNome: referencia,
        mesReferencia,
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

  const openPreviewForReferencia = useCallback(
    async (
      tipo: FaturaTipo,
      referenciaNome: string,
      options?: { readonly?: boolean }
    ) => {
      const referencia = referenciaNome.trim();
      const isCliente = tipo === "cliente";

      if (!referencia) {
        toast.error(
          isCliente
            ? "Cliente inválido para gerar a fatura."
            : "Clínica inválida para conferência."
        );
        return;
      }
      if (!filters.mesReferencia.trim()) {
        toast.error(
          isCliente
            ? "Informe o mês de referência para gerar a fatura."
            : "Informe o mês de referência para conferência."
        );
        return;
      }

      const mesFilters: FaturaFilters = {
        ...filters,
        ...(isCliente ? { cliente: referencia } : { clinica: referencia }),
      };
      const agsReferencia = filterAgendamentosFatura(agendamentos, mesFilters);

      const faturaExistente = findFaturaRascunhoParaReferencia(
        resumoMesBase?.rows,
        referencia
      );

      if (
        !options?.readonly &&
        (await bloquearFaturaDuplicada(
          tipo,
          referencia,
          faturaExistente?.status === "rascunho" ? faturaExistente.id : null
        ))
      ) {
        return;
      }

      const itens = buildFaturaItensFromAgendamentos(agsReferencia, tipo);
      if (itens.length === 0) {
        toast.error(NO_RECORDS_TOAST);
        return;
      }

      const nextPreview = buildPreviewFromAgendamentos(
        tipo,
        referencia,
        mesFilters,
        agsReferencia,
        {
          readonly: options?.readonly ?? false,
          ...(faturaExistente?.status === "rascunho"
            ? {
                faturaId: faturaExistente.id,
                numero: faturaExistente.numero,
                status: faturaExistente.status,
              }
            : {}),
        }
      );
      previewRef.current = nextPreview;
      setPreview(nextPreview);
      setPreviewOpen(true);
    },
    [agendamentos, bloquearFaturaDuplicada, filters, resumoMesBase?.rows]
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
      if (current.tipo === "cliente" && valorTotal <= 0) {
        throw new Error(FATURA_SEM_VALOR_COMPETENCIA_MSG);
      }

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
      }, auditOptions);

      const nextPreview = faturaComItensToPreview(saved, current.readonly);
      previewRef.current = nextPreview;
      setPreview(nextPreview);
      await reloadAll();
      return saved;
    },
    [filters.mesReferencia, geradoPor, reloadAll]
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
    if (current.tipo === "cliente" && !syncClienteVencimentoNoPreview()) return;
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
  }, [persistPreview, syncClienteVencimentoNoPreview]);

  const handleEmit = useCallback(async () => {
    const current = previewRef.current;
    if (!current || current.status === "cancelada") return;

    if (current.tipo === "cliente") {
      if (!syncClienteVencimentoNoPreview()) return;
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
      return;
    }

    setSaving(true);
    try {
      const saved = await persistPreview("rascunho");
      setConferenciaFatura(saved);
      setConferenciaOpen(true);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao preparar conferência dos custos."
      );
    } finally {
      setSaving(false);
    }
  }, [persistPreview, syncClienteVencimentoNoPreview]);

  const handleGeneratePdf = useCallback(async () => {
    const current = previewRef.current;
    if (!current) return;
    if (
      current.tipo === "cliente" &&
      (!current.faturaId || current.status === "rascunho") &&
      !syncClienteVencimentoNoPreview()
    ) {
      return;
    }
    setSaving(true);
    try {
      let fatura = current.faturaId
        ? await buscarFaturaComItens(current.faturaId)
        : null;

      if (!fatura || fatura.status === "rascunho") {
        fatura =
          current.tipo === "clinica"
            ? await persistPreview("rascunho")
            : await persistPreview("emitida");
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
  }, [persistPreview, syncClienteVencimentoNoPreview]);

  const handleVisualizar = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const fatura = await buscarFaturaComItens(id);
      if (!fatura) {
        toast.error("Fatura não encontrada.");
        return;
      }

      let faturaOrigemNumero: string | null = null;
      let faturaSubstitutaNumero: string | null = null;

      if (fatura.fatura_origem_id) {
        const origem = await buscarFaturaComItens(fatura.fatura_origem_id);
        faturaOrigemNumero = origem?.numero ?? null;
      }
      if (fatura.fatura_substituta_id) {
        const substituta = await buscarFaturaComItens(fatura.fatura_substituta_id);
        faturaSubstitutaNumero = substituta?.numero ?? null;
      }

      const nextPreview: FaturaPreviewState = {
        ...faturaComItensToPreview(fatura, true),
        faturaOrigemId: fatura.fatura_origem_id,
        faturaOrigemNumero,
        faturaSubstitutaId: fatura.fatura_substituta_id,
        faturaSubstitutaNumero,
      };
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
        "Tem certeza que deseja cancelar esta emissão?"
      );
      if (!ok) return;

      setSaving(true);
      try {
        await cancelarFatura(id, auditOptions);
        toast.success("Emissão cancelada. Fatura reaberta para emissão.");
        if (preview?.faturaId === id) {
          setPreview((prev) =>
            prev ? { ...prev, status: "rascunho" } : null
          );
        }
        await reloadAll();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao cancelar emissão."
        );
      } finally {
        setSaving(false);
      }
    },
    [faturas, preview?.faturaId, reloadAll]
  );

  const openPagamentoModal = useCallback(
    (id: string, mode: FaturaPagamentoModalMode) => {
      if (pageTipo === "clinica") return;

      const fatura = faturas.find((f) => f.id === id);
      if (!fatura) {
        toast.error("Fatura não encontrada.");
        return;
      }
      if (!faturaStatusPermitePagamento(fatura.status)) {
        toast.error("Pagamento só pode ser registrado em faturas emitidas.");
        return;
      }
      setPagamentoMode(mode);
      setPagamentoFatura({ ...fatura, pago: fatura.pago ?? false });
      setPagamentoOpen(true);
    },
    [faturas, pageTipo]
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
    async (
      dataPagamentoIso: string,
      observacao: string | null,
      comprovanteFile: File | null
    ) => {
      if (!pagamentoFatura) return;

      setSaving(true);
      try {
        if (pagamentoMode === "registrar") {
          await registrarPagamentoFatura(
            pagamentoFatura.id,
            {
              data_pagamento: dataPagamentoIso,
              observacao_pagamento: observacao,
              comprovanteFile,
            },
            auditOptions
          );
        } else {
          await atualizarPagamentoFatura(
            pagamentoFatura.id,
            {
              data_pagamento: dataPagamentoIso,
              observacao_pagamento: observacao,
              comprovanteFile,
            },
            pagamentoFatura.comprovante_pagamento_path,
            auditOptions
          );
        }
        toast.success(
          pagamentoMode === "registrar"
            ? "Pagamento registrado com sucesso"
            : "Pagamento atualizado com sucesso"
        );
        setPagamentoOpen(false);
        setPagamentoFatura(null);
        await reloadAll();
      } catch (err) {
        console.error(err);
        if (err instanceof ComprovanteValidationError) {
          toast.error(err.message);
        } else {
          toast.error("Erro ao registrar pagamento.");
        }
      } finally {
        setSaving(false);
      }
    },
    [pagamentoFatura, pagamentoMode, reloadAll, auditOptions]
  );

  const handleVerComprovante = useCallback(
    async (id: string) => {
      const fatura =
        faturas.find((f) => f.id === id) ??
        (pagamentoFatura?.id === id ? pagamentoFatura : null);

      const path = fatura?.comprovante_pagamento_path?.trim();
      if (!path) {
        toast.error("Comprovante não encontrado para esta fatura.");
        return;
      }

      try {
        const url = await obterUrlComprovantePagamento(path);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        console.error(err);
        toast.error("Erro ao abrir o comprovante.");
      }
    },
    [faturas, pagamentoFatura]
  );

  const handleVerFaturaClinica = useCallback(
    async (id: string) => {
      const fatura =
        faturas.find((f) => f.id === id) ??
        (conferenciaFatura?.id === id ? conferenciaFatura : null) ??
        (preview?.faturaId === id
          ? await buscarFaturaComItens(id).catch(() => null)
          : null);

      const path = fatura?.fatura_clinica_path?.trim();
      if (!path) {
        toast.error("Fatura da clínica não encontrada para este registro.");
        return;
      }

      try {
        const url = await obterUrlFaturaClinicaConferencia(path);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        console.error(err);
        toast.error("Erro ao abrir a fatura da clínica.");
      }
    },
    [conferenciaFatura, faturas, preview?.faturaId]
  );

  const handleCloseConferencia = useCallback(() => {
    if (saving) return;
    setConferenciaOpen(false);
    setConferenciaFatura(null);
  }, [saving]);

  const handleConfirmConferencia = useCallback(
    async (
      dataConferenciaIso: string,
      observacao: string | null,
      faturaFile: File | null
    ) => {
      if (!conferenciaFatura) return;

      setSaving(true);
      try {
        const previewCurrent = previewRef.current;
        const itens =
          previewCurrent?.faturaId === conferenciaFatura.id &&
          previewCurrent.itens.length > 0
            ? previewCurrent.itens
            : faturaItensToInsert(
                (
                  await buscarFaturaComItens(conferenciaFatura.id)
                )?.fatura_itens ?? []
              );

        const conferida = await marcarConferenciaCustosClinica(
          {
            faturaId: conferenciaFatura.id,
            referencia_nome: conferenciaFatura.referencia_nome,
            periodo_inicio:
              previewCurrent?.periodo_inicio ??
              conferenciaFatura.periodo_inicio,
            periodo_fim:
              previewCurrent?.periodo_fim ?? conferenciaFatura.periodo_fim,
            data_vencimento:
              previewCurrent?.data_vencimento ??
              conferenciaFatura.data_vencimento,
            gerado_por: geradoPor,
            itens,
            conferido_em: dataConferenciaIso,
            observacao_conferencia: observacao,
            faturaFile,
          },
          auditOptions
        );

        toast.success("Custos marcados como conferidos.");
        setConferenciaOpen(false);
        setConferenciaFatura(null);

        if (previewOpen && preview?.faturaId === conferida.id) {
          const nextPreview = faturaComItensToPreview(conferida, true);
          previewRef.current = nextPreview;
          setPreview(nextPreview);
        }

        await reloadAll();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao confirmar conferência dos custos."
        );
      } finally {
        setSaving(false);
      }
    },
    [
      auditOptions,
      conferenciaFatura,
      geradoPor,
      preview?.faturaId,
      previewOpen,
      reloadAll,
    ]
  );

  const handleMarcarPendente = useCallback(
    async (id: string) => {
      const fatura = faturas.find((f) => f.id === id);
      if (!fatura) return;

      const ok = window.confirm(
        `Marcar a fatura ${fatura.numero} como pendente? A data, observação e comprovante de pagamento serão removidos.`
      );
      if (!ok) return;

      setSaving(true);
      try {
        await marcarFaturaPendente(id, auditOptions);
        toast.success("Fatura marcada como pendente.");
        await reloadAll();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao marcar fatura como pendente.");
      } finally {
        setSaving(false);
      }
    },
    [faturas, reloadAll]
  );

  const handleVisualizarAgendamentos = useCallback(
    (referenciaNome: string) => {
      void openPreviewForReferencia(pageTipo, referenciaNome, {
        readonly: true,
      });
    },
    [openPreviewForReferencia, pageTipo]
  );

  const handleEmitirReferencia = useCallback(
    async (referenciaNome: string) => {
      const referencia = referenciaNome.trim();
      const isCliente = pageTipo === "cliente";

      if (!referencia) {
        toast.error(
          isCliente
            ? "Cliente inválido para gerar a fatura."
            : "Clínica inválida para conferência."
        );
        return;
      }
      if (!isValidMonthYearBR(filters.mesReferencia)) {
        toast.error(
          isCliente
            ? "Informe um mês de referência válido para emitir a fatura."
            : "Informe um mês de referência válido para conferência."
        );
        return;
      }

      const mesFilters: FaturaFilters = {
        ...filters,
        ...(isCliente ? { cliente: referencia } : { clinica: referencia }),
      };
      const agsReferencia = filterAgendamentosFatura(agendamentos, mesFilters);

      const faturaExistente = findFaturaRascunhoParaReferencia(
        resumoMesBase?.rows,
        referencia
      );

      if (
        await bloquearFaturaDuplicada(
          pageTipo,
          referencia,
          faturaExistente?.status === "rascunho" ? faturaExistente.id : null
        )
      ) {
        return;
      }

      const itens = buildFaturaItensFromAgendamentos(agsReferencia, pageTipo);
      if (itens.length === 0) {
        toast.error(NO_RECORDS_TOAST);
        return;
      }
      if (isCliente && calcTotalFaturaItens(itens) <= 0) {
        toast.error(FATURA_SEM_VALOR_COMPETENCIA_MSG);
        return;
      }

      const nextPreview = buildPreviewFromAgendamentos(
        pageTipo,
        referencia,
        mesFilters,
        agsReferencia,
        faturaExistente?.status === "rascunho"
          ? {
              faturaId: faturaExistente.id,
              numero: faturaExistente.numero,
              status: faturaExistente.status,
            }
          : undefined
      );

      previewRef.current = nextPreview;
      setSaving(true);
      try {
        if (isCliente) {
          if (!syncClienteVencimentoNoPreview()) return;
          await persistPreview("emitida");
          toast.success("Fatura emitida com sucesso!");
          return;
        }

        const saved = await persistPreview("rascunho");
        setConferenciaFatura(saved);
        setConferenciaOpen(true);
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : isCliente
              ? "Erro ao emitir fatura."
              : "Erro ao preparar conferência dos custos."
        );
      } finally {
        setSaving(false);
      }
    },
    [
      agendamentos,
      bloquearFaturaDuplicada,
      filters,
      pageTipo,
      persistPreview,
      resumoMesBase?.rows,
      syncClienteVencimentoNoPreview,
    ]
  );

  const handleReabrirConferencia = useCallback(
    async (id: string) => {
      if (pageTipo !== "clinica") return;

      const fatura = faturas.find((f) => f.id === id);
      if (!fatura) {
        toast.error("Registro de custos não encontrado.");
        return;
      }
      if (fatura.status !== "emitida") {
        toast.error("Somente custos conferidos podem ser reabertos.");
        return;
      }

      const ok = window.confirm(
        `Reabrir conferência dos custos da clínica ${fatura.referencia_nome}?\n\n` +
          "O status voltará para aberta para conferência. Valores e histórico serão mantidos."
      );
      if (!ok) return;

      setSaving(true);
      try {
        await reabrirConferenciaCustosClinica(id, auditOptions);
        toast.success("Conferência reaberta.");
        await reloadAll();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao reabrir conferência."
        );
      } finally {
        setSaving(false);
      }
    },
    [auditOptions, faturas, pageTipo, reloadAll]
  );

  const handleReemitirFatura = useCallback(
    async (id: string) => {
      if (pageTipo !== "cliente") return;

      let fatura = faturas.find((f) => f.id === id);
      if (!fatura) {
        try {
          const loaded = await buscarFaturaComItens(id);
          fatura = loaded ?? undefined;
        } catch {
          fatura = undefined;
        }
      }
      if (!fatura) {
        toast.error("Fatura não encontrada.");
        return;
      }
      if (!canReemitirFaturaCliente(fatura)) {
        toast.error("Esta fatura não pode ser reemitida.");
        return;
      }

      const mesReferencia =
        mesReferenciaBRFromFatura(fatura) ?? filters.mesReferencia.trim();

      if (!isValidMonthYearBR(mesReferencia)) {
        toast.error(
          "Não foi possível identificar o mês de referência da fatura."
        );
        return;
      }

      const referencia = fatura.referencia_nome.trim();
      const confirmMessage =
        fatura.status === "necessita_reemissao"
          ? `Reemitir fatura ${fatura.numero} para ${referencia} (${mesReferencia})?\n\n` +
            "Será gerada uma nova fatura emitida com os agendamentos e valores recalculados. " +
            "A fatura atual ficará como Substituída no histórico."
          : `Reemitir fatura ${fatura.numero} para ${referencia} (${mesReferencia})?\n\n` +
            "Será criada uma nova fatura com os agendamentos e valores atuais do mês. " +
            "A fatura cancelada permanecerá no histórico.";

      const ok = window.confirm(confirmMessage);
      if (!ok) return;

      if (
        await bloquearFaturaDuplicada(
          pageTipo,
          referencia,
          fatura.id,
          mesReferencia
        )
      ) {
        return;
      }

      const mesFilters: FaturaFilters = {
        ...filters,
        mesReferencia,
        cliente: referencia,
      };
      const agsReferencia = filterAgendamentosFatura(agendamentos, mesFilters);
      const itens = buildFaturaItensFromAgendamentos(agsReferencia, "cliente");
      if (itens.length === 0) {
        toast.error(FATURA_SEM_AGENDAMENTOS_VALIDOS_REEMISSAO_MSG);
        return;
      }
      if (calcTotalFaturaItens(itens) <= 0) {
        toast.error(FATURA_SEM_VALOR_COMPETENCIA_MSG);
        return;
      }

      const vencimento = calcVencimentoFaturaCliente(mesReferencia);
      if (!vencimento) {
        toast.error("Não foi possível calcular o vencimento da fatura.");
        return;
      }

      const { periodo_inicio, periodo_fim } = parsePeriodoIso(mesReferencia);

      setSaving(true);
      try {
        const nova = await reemitirFaturaClienteCancelada(
          {
            faturaCanceladaId: id,
            periodo_inicio,
            periodo_fim,
            mes_referencia: fatura.mes_referencia,
            mes_referencia_label: mesReferencia,
            data_vencimento: vencimento.iso,
            gerado_por: geradoPor,
            itens,
          },
          auditOptions
        );
        toast.success(`Fatura ${nova.numero} emitida com sucesso!`);
        await reloadAll();
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao reemitir fatura."
        );
      } finally {
        setSaving(false);
      }
    },
    [
      agendamentos,
      auditOptions,
      bloquearFaturaDuplicada,
      faturas,
      filters,
      geradoPor,
      pageTipo,
      reloadAll,
    ]
  );

  return {
    pageTipo,
    filters,
    historicoFilters,
    filterOptions,
    agendamentosFiltrados,
    mesReferenciaValido,
    resumoMes,
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
    handleVerComprovante,
    handleVerFaturaClinica,
    conferenciaOpen,
    conferenciaFatura,
    handleCloseConferencia,
    handleConfirmConferencia,
    handleMarcarPendente,
    faturaDuplicidadeOpen,
    faturaDuplicidadeInfo,
    faturaDuplicidadeTipo,
    handleCloseFaturaDuplicidade,
    handleVisualizarAgendamentos,
    handleEmitirReferencia,
    handleReabrirConferencia,
    handleReemitirFatura,
  };
}
