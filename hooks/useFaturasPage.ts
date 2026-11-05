"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useHistoricoUsuario, useAuditoriaUsuario } from "@/contexts/AuthContext";
import { isValidMonthYearBR } from "@/lib/agendamento-datetime";
import { formatDateBR } from "@/lib/format";
import {
  calcVencimentoFaturaCliente,
  calcDataVencimentoClinicaCompetencia,
} from "@/lib/fatura-vencimento";
import {
  dataNoPeriodo,
  dataOcupadaPorOutroFechamento,
  dataVencimentoFechamento,
  exameChave,
  janelaBuscaFechamento,
  parseMesReferenciaBR,
  type ClinicaCicloConfig,
  type ExameVinculoFatura,
  type PeriodoRegistradoClinica,
} from "@/lib/clinica-fechamento";
import { useClinicasList } from "@/hooks/useClinicasList";
import { canReemitirFaturaCliente, faturaStatusPermitePagamento, mesReferenciaBRFromFatura } from "@/lib/fatura-reemissao";
import {
  EMPTY_FATURA_FILTERS,
  emptyHistoricoFiltersForTipo,
  extractFaturaFilterOptions,
  filterAgendamentosDaReferenciaFatura,
  filterAgendamentosFatura,
  filterFaturasHistorico,
  formatPeriodoFatura,
  mesReferenciaIsoFromBR,
  FATURA_HISTORICO_PAGE_SIZE,
  type FaturaFilters,
  type FaturaHistoricoFilters,
} from "@/lib/fatura-filters";
import {
  isAgendamentoDaClinica,
  referenciaIdUnicaDosAgendamentos,
  resolveClienteFromCatalog,
  resolverReferenciaIdCliente,
  type ClienteCatalogItem,
} from "@/lib/fatura-empresa-match";
import {
  buildResumoClientesMes,
  buildResumoClinicasMes,
  type FaturaMesRow,
  type ItemResumoCustoClinica,
  getCurrentMonthYearBR,
  computeFaturaMesResumo,
  filterFaturaMesRowsByStatus,
} from "@/lib/fatura-mes-resumo";
import {
  mesReferenciaBRToYearMonth,
  resolveInitialMesListagem,
  resolveMesParaAno,
  yearMonthToMesReferenciaBR,
  type YearMonth,
} from "@/lib/listagem-meses";
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
  ajustarPeriodoCustosClinica,
  listarItensCustosClinica,
  listarPeriodosCustosClinicaAtivos,
  marcarConferenciaCustosClinica,
  marcarFaturaPendente,
  atualizarPagamentoFatura,
  obterItensFaturaClienteAtualizados,
  registrarPagamentoFatura,
  reabrirConferenciaCustosClinica,
  reemitirFaturaClienteCancelada,
  salvarFatura,
  sincronizarFaturasClienteNecessitaReemissao,
} from "@/services/fatura-historico.service";
import { corrigirItensFaturaClienteInconsistentes } from "@/services/fatura-itens-correcao.service";
import { sincronizarFaturasVencidas } from "@/services/fatura-inadimplencia.service";
import { listarFaturasClienteComAlteracaoPosEmissao } from "@/services/agendamento-fatura-bloqueio.service";
import { obterUrlComprovantePagamento } from "@/services/fatura-comprovante.service";
import { obterUrlFaturaClinicaConferencia } from "@/services/fatura-conferencia-clinica.service";
import { listarFaturasDaCompetencia } from "@/services/fatura-competencia.service";
import { listarAgendamentosParaFatura } from "@/services/fatura.service";
import { useClientesList } from "@/hooks/useClientesList";
import { buildClienteFilterOptionsHistorico } from "@/lib/cliente-display";
import { FATURA_SEM_AGENDAMENTOS_VALIDOS_REEMISSAO_MSG, FATURA_SEM_ELEGIVEIS_MSG, FATURA_SEM_VALOR_COMPETENCIA_MSG, isValorTotalFaturavel } from "@/lib/fatura-elegibilidade";
import type {
  AgendamentoWithExames,
  FaturaPreviewState,
  FaturaRecord,
  FaturaStatus,
  FaturaTipo,
} from "@/lib/types";
import type { FaturaPagamentoModalMode } from "@/components/faturas/FaturaPagamentoModal";
import type { FaturaEnvioEmailModalOrigem } from "@/components/faturas/FaturaEnvioEmailModal";
import { obterEmailEnvioSugeridoCliente } from "@/lib/fatura-envio-sugestao";
import { faturaPreviewPermiteEmitir } from "@/lib/fatura-preview-rodape";
import { buscarUltimoEmailEnvioCliente } from "@/services/fatura-envio.service";

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
    diaVencimentoClinica?: number | null;
    vencimentoMes?: "mesmo_mes" | "mes_seguinte" | null;
    periodoInicio?: string | null;
    periodoFim?: string | null;
    dataFechamento?: string | null;
    dataVencimento?: string | null;
    clinicaId?: string | null;
    periodoAjustado?: boolean | null;
  }
): FaturaPreviewState {
  const itens = buildFaturaItensFromAgendamentos(agendamentos, tipo);
  const periodoPadrao = parsePeriodoIso(filters.mesReferencia);
  const periodo_inicio = extras?.periodoInicio ?? periodoPadrao.periodo_inicio;
  const periodo_fim = extras?.periodoFim ?? periodoPadrao.periodo_fim;
  const mesFechamento = parseMesReferenciaBR(filters.mesReferencia);
  const vencimento =
    tipo === "clinica"
      ? (() => {
          if (extras?.dataVencimento) {
            const iso = extras.dataVencimento.split("T")[0];
            return { iso, label: formatDateBR(iso) };
          }
          const porCiclo =
            mesFechamento &&
            dataVencimentoFechamento({
              diaVencimento: extras?.diaVencimentoClinica,
              anoFechamento: mesFechamento.ano,
              mesFechamento: mesFechamento.mes,
              vencimentoMes: extras?.vencimentoMes,
            });
          if (porCiclo) {
            return { iso: porCiclo.iso, label: formatDateBR(porCiclo.iso) };
          }
          const porDia = calcDataVencimentoClinicaCompetencia(
            extras?.diaVencimentoClinica,
            filters.mesReferencia
          );
          if (porDia) {
            return { iso: porDia.iso, label: porDia.label };
          }
          const iso = periodo_fim ?? new Date().toISOString().split("T")[0];
          return { iso, label: formatDateBR(iso) };
        })()
      : (() => {
          const auto = calcVencimentoFaturaCliente(filters.mesReferencia);
          if (auto) return auto;
          return { iso: "", label: "—" };
        })();

  return {
    tipo,
    referenciaNome,
    periodoLabel:
      periodo_inicio && periodo_fim
        ? `${formatDateBR(periodo_inicio)} a ${formatDateBR(periodo_fim)}`
        : formatPeriodoFatura(filters.mesReferencia),
    periodo_inicio,
    periodo_fim,
    data_fechamento: extras?.dataFechamento ?? periodo_fim,
    periodo_ajustado: extras?.periodoAjustado ?? null,
    mes_referencia:
      tipo === "clinica" ? mesReferenciaIsoFromBR(filters.mesReferencia) : null,
    data_vencimento: vencimento.iso,
    data_vencimento_label: vencimento.label,
    itens,
    numero: extras?.numero ?? null,
    faturaId: extras?.faturaId ?? null,
    status: extras?.status ?? null,
    readonly: extras?.readonly ?? false,
    referencia_id:
      tipo === "cliente"
        ? referenciaIdUnicaDosAgendamentos(agendamentos)
        : extras?.clinicaId ?? null,
  };
}

export function useFaturasPage(pageTipo: FaturaTipo) {
  const geradoPor = useHistoricoUsuario();
  const auditContext = useAuditoriaUsuario();
  const auditOptions = useMemo(() => ({ auditContext }), [auditContext]);
  const { clientes } = useClientesList();
  const { clinicas } = useClinicasList();
  const clientesCatalog = useMemo<ClienteCatalogItem[]>(
    () =>
      clientes.map((c) => ({
        id: c.id,
        nome: c.nome,
        cnpj: c.cnpj,
      })),
    [clientes]
  );
  const clientesCatalogRef = useRef(clientesCatalog);
  clientesCatalogRef.current = clientesCatalog;

  const diaVencimentoPorClinica = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const c of clinicas) {
      const dia = c.dia_vencimento_fatura ?? null;
      for (const nome of [c.nome_fantasia, c.razao_social]) {
        const key = nome.trim().toLowerCase();
        if (key) map.set(key, dia);
      }
    }
    return map;
  }, [clinicas]);

  const ciclosClinica = useMemo<ClinicaCicloConfig[]>(
    () =>
      clinicas.map((c) => ({
        id: c.id,
        nomes: [c.nome_fantasia, c.razao_social].filter(Boolean),
        fechamentoApuracao: c.fechamento_apuracao ?? null,
        diaFechamento: c.dia_fechamento ?? null,
        diaVencimento: c.dia_vencimento_fatura ?? null,
        vencimentoMes: c.vencimento_mes ?? null,
      })),
    [clinicas]
  );

  const [periodosRegistrados, setPeriodosRegistrados] = useState<
    PeriodoRegistradoClinica[]
  >([]);
  const [itensCusto, setItensCusto] = useState<ExameVinculoFatura[]>([]);
  const [ajusteRow, setAjusteRow] = useState<FaturaMesRow | null>(null);
  const [ajusteErro, setAjusteErro] = useState<string | null>(null);
  const periodosRef = useRef(periodosRegistrados);
  periodosRef.current = periodosRegistrados;

  const itensPorFatura = useMemo(() => {
    const map = new Map<string, ItemResumoCustoClinica[]>();
    for (const item of itensCusto) {
      const lista = map.get(item.faturaId) ?? [];
      lista.push({
        faturaId: item.faturaId,
        agendamentoId: item.agendamentoId,
        exameNome: item.exameNome,
        valorTotal: 0,
        data: item.data,
      });
      map.set(item.faturaId, lista);
    }
    return map;
  }, [itensCusto]);

  const resolveDiaVencimentoClinica = useCallback(
    (referenciaNome: string): number | null => {
      return (
        diaVencimentoPorClinica.get(referenciaNome.trim().toLowerCase()) ?? null
      );
    },
    [diaVencimentoPorClinica]
  );

  const [agendamentos, setAgendamentos] = useState<AgendamentoWithExames[]>(
    []
  );
  const [faturas, setFaturas] = useState<FaturaRecord[]>([]);
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
  const [envioEmailModalOpen, setEnvioEmailModalOpen] = useState(false);
  const [envioEmailFatura, setEnvioEmailFatura] = useState<FaturaRecord | null>(
    null
  );
  const [envioEmailSugerido, setEnvioEmailSugerido] = useState<string | null>(
    null
  );
  const [envioEmailModalOrigem, setEnvioEmailModalOrigem] =
    useState<FaturaEnvioEmailModalOrigem>("pos-emissao");
  const [lembreteModalOpen, setLembreteModalOpen] = useState(false);
  const [lembreteFatura, setLembreteFatura] = useState<FaturaRecord | null>(
    null
  );
  const [lembreteEmailSugerido, setLembreteEmailSugerido] = useState<
    string | null
  >(null);
  const [lembreteHistoricoInicial, setLembreteHistoricoInicial] =
    useState(false);
  const lembreteAlvoRef = useRef<string | null>(null);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  const faturasRef = useRef(faturas);
  faturasRef.current = faturas;

  const reloadAgendamentos = useCallback(async () => {
    setLoading(true);
    try {
      if (pageTipo === "clinica" && isValidMonthYearBR(filters.mesReferencia)) {
        const janela = janelaBuscaFechamento(filters.mesReferencia, [
          ...periodosRef.current,
          ...faturasRef.current
            .filter((fatura) => fatura.tipo === "clinica")
            .map((fatura) => ({
              inicio: fatura.periodo_inicio,
              fim: fatura.periodo_fim,
            })),
        ]);
        const data = janela
          ? await listarAgendamentosParaFatura({
              inicio: janela.inicio,
              fim: janela.fim,
            })
          : await listarAgendamentosParaFatura();
        setAgendamentos(data);
        return;
      }
      const data = await listarAgendamentosParaFatura();
      setAgendamentos(data);
    } catch (err) {
      console.error("Erro ao carregar agendamentos para faturas:", err);
      toast.error("Erro ao carregar dados para faturas.");
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  }, [filters.mesReferencia, pageTipo]);

  const historicoRequestRef = useRef(0);

  const reloadHistorico = useCallback(async (): Promise<FaturaRecord[]> => {
    const requestId = ++historicoRequestRef.current;
    const mesReferencia = filters.mesReferencia;
    setHistoricoLoading(true);
    try {
      const data = await listarFaturasDaCompetencia(pageTipo, mesReferencia);
      if (requestId !== historicoRequestRef.current) return data;
      setFaturas(data);
      return data;
    } catch (err) {
      console.error("Erro ao carregar faturas da competência:", err);
      if (requestId !== historicoRequestRef.current) return [];
      toast.error("Erro ao carregar faturas da competência.");
      setFaturas([]);
      return [];
    } finally {
      if (requestId === historicoRequestRef.current) {
        setHistoricoLoading(false);
      }
    }
  }, [filters.mesReferencia, pageTipo]);

  const reloadHistoricoRef = useRef(reloadHistorico);
  reloadHistoricoRef.current = reloadHistorico;

  const syncVencidasToastShownRef = useRef(false);
  const syncVencidasAttemptedRef = useRef(false);

  const reloadAll = useCallback(async () => {
    await Promise.all([reloadAgendamentos(), reloadHistorico()]);
  }, [reloadAgendamentos, reloadHistorico]);

  const correcaoItensAttemptedRef = useRef(false);

  useEffect(() => {
    if (pageTipo !== "cliente") return;
    if (correcaoItensAttemptedRef.current) return;
    correcaoItensAttemptedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const result = await corrigirItensFaturaClienteInconsistentes();
        if (cancelled || result.itensRemovidos === 0) return;
        await reloadAll();
        toast.message(
          `${result.itensRemovidos} item(ns) removido(s) de fatura(s) com cliente incorreto.`
        );
      } catch (err) {
        console.error("Erro ao corrigir itens de fatura inconsistentes:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageTipo, reloadAll]);

  useEffect(() => {
    if (pageTipo !== "cliente") return;
    if (syncVencidasAttemptedRef.current) return;

    syncVencidasAttemptedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const atualizadas = await sincronizarFaturasVencidas(auditOptions);
        if (cancelled || atualizadas === 0) return;
        await reloadHistoricoRef.current();
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

  useEffect(() => {
    if (pageTipo !== "clinica" || !isValidMonthYearBR(filters.mesReferencia)) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const periodos = await listarPeriodosCustosClinicaAtivos();
        if (cancelled) return;
        setPeriodosRegistrados(periodos);
        const janela = janelaBuscaFechamento(filters.mesReferencia, periodos);
        if (!janela) return;
        const mesIso = parseMesReferenciaBR(filters.mesReferencia)?.iso;
        const itens = await listarItensCustosClinica({
          inicio: janela.inicio,
          fim: janela.fim,
          faturaIds: periodos
            .filter((periodo) => periodo.mesReferencia === mesIso)
            .map((periodo) => periodo.faturaId),
        });
        if (!cancelled) setItensCusto(itens);
      } catch (err) {
        console.error("Erro ao carregar períodos de fechamento:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.mesReferencia, pageTipo]);

  const periodosKey = periodosRegistrados
    .map((periodo) => `${periodo.faturaId}:${periodo.inicio}:${periodo.fim}`)
    .join("|");

  useEffect(() => {
    if (pageTipo !== "clinica") return;
    void reloadAgendamentos();
  }, [pageTipo, periodosKey, reloadAgendamentos]);

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
          filters.cliente,
          clientesCatalog
        )
      : buildResumoClinicasMes(
          agendamentos,
          faturas,
          filters.mesReferencia,
          filters.clinica,
          {
            porFechamento: true,
            clinicas: ciclosClinica,
            periodosRegistrados,
            itensPorFatura,
          }
        );
  }, [
    agendamentos,
    ciclosClinica,
    clientesCatalog,
    filters.cliente,
    filters.clinica,
    filters.mesReferencia,
    faturas,
    itensPorFatura,
    mesReferenciaValido,
    pageTipo,
    periodosRegistrados,
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

  const mesSelecionado = useMemo<YearMonth>(() => {
    return (
      mesReferenciaBRToYearMonth(filters.mesReferencia) ??
      resolveInitialMesListagem()
    );
  }, [filters.mesReferencia]);

  const handleMesChange = useCallback((mes: YearMonth) => {
    setFilters((prev) => ({
      ...prev,
      mesReferencia: yearMonthToMesReferenciaBR(mes),
    }));
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setFilters((prev) => {
      const current =
        mesReferenciaBRToYearMonth(prev.mesReferencia) ??
        resolveInitialMesListagem();
      const next = resolveMesParaAno(year, current.month);
      return {
        ...prev,
        mesReferencia: yearMonthToMesReferenciaBR(next),
      };
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      ...EMPTY_FATURA_FILTERS,
      mesReferencia: getCurrentMonthYearBR(),
    });
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

  const selecionarAgendamentosClinica = useCallback(
    (referenciaNome: string) => {
      const key = referenciaNome.trim().toLowerCase();
      const row = resumoMesBase?.rows.find(
        (item) => item.referenciaNome.trim().toLowerCase() === key
      );
      if (!row?.periodoInicio || !row.periodoFim) {
        return filterAgendamentosDaReferenciaFatura(agendamentos, {
          mesReferencia: filters.mesReferencia,
          tipo: "clinica",
          referenciaNome,
        });
      }
      const bloqueados = new Set<string>();
      for (const item of itensCusto) {
        if (row.fatura?.id && item.faturaId === row.fatura.id) continue;
        bloqueados.add(exameChave(item.agendamentoId, item.exameNome));
      }
      const config =
        ciclosClinica.find((clinica) =>
          clinica.nomes.some((nome) => nome.trim().toLowerCase() === key)
        ) ?? null;
      const mesIso = parseMesReferenciaBR(filters.mesReferencia)?.iso ?? "";
      const salvo = Boolean(
        row.fatura?.periodo_inicio && row.fatura.periodo_fim
      );
      return agendamentos.flatMap((ag) => {
        if (!isAgendamentoDaClinica(ag.clinica_nome, referenciaNome)) return [];
        if (!dataNoPeriodo(ag.data_agendamento, row.periodoInicio!, row.periodoFim!)) {
          return [];
        }
        if (
          dataOcupadaPorOutroFechamento({
            dataIso: ag.data_agendamento,
            nomeClinica: referenciaNome,
            clinicaId: row.clinicaId,
            mesFechamentoIso: mesIso,
            faturaIdAtual: row.fatura?.id,
            periodoSalvoNestaCompetencia: salvo,
            periodos: periodosRegistrados,
            config,
          })
        ) {
          return [];
        }
        const exames = (ag.agendamento_exames ?? []).filter(
          (exame) => !bloqueados.has(exameChave(ag.id, exame.tipo_exame))
        );
        if (exames.length === 0) return [];
        return [{ ...ag, agendamento_exames: exames }];
      });
    },
    [
      agendamentos,
      ciclosClinica,
      filters.mesReferencia,
      itensCusto,
      periodosRegistrados,
      resumoMesBase?.rows,
    ]
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
      const linhaClinica = isCliente
        ? undefined
        : resumoMesBase?.rows.find(
            (item) =>
              item.referenciaNome.trim().toLowerCase() ===
              referencia.toLowerCase()
          );
      const agsReferencia = isCliente
        ? filterAgendamentosDaReferenciaFatura(agendamentos, {
            mesReferencia: filters.mesReferencia,
            tipo,
            referenciaNome: referencia,
            referenciaId: resolveClienteFromCatalog(clientesCatalog, referencia)?.id,
            clientesCatalog,
          })
        : selecionarAgendamentosClinica(referencia);

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
          diaVencimentoClinica:
            tipo === "clinica"
              ? resolveDiaVencimentoClinica(referencia)
              : null,
          vencimentoMes:
            ciclosClinica.find((clinica) =>
              clinica.nomes.some(
                (nome) => nome.trim().toLowerCase() === referencia.toLowerCase()
              )
            )?.vencimentoMes ?? null,
          periodoInicio: linhaClinica?.periodoInicio,
          periodoFim: linhaClinica?.periodoFim,
          dataFechamento: linhaClinica?.dataFechamento,
          dataVencimento: linhaClinica?.dataVencimento,
          clinicaId: linhaClinica?.clinicaId,
          periodoAjustado: linhaClinica?.fatura?.periodo_ajustado,
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
    [
      agendamentos,
      bloquearFaturaDuplicada,
      ciclosClinica,
      clientesCatalog,
      filters,
      resolveDiaVencimentoClinica,
      resumoMesBase?.rows,
      selecionarAgendamentosClinica,
    ]
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

      const agsReferencia = filterAgendamentosDaReferenciaFatura(agendamentos, {
        mesReferencia: filters.mesReferencia,
        tipo,
        referenciaNome: referencia,
        referenciaId:
          tipo === "cliente"
            ? resolveClienteFromCatalog(clientesCatalog, referencia)?.id
            : null,
        clientesCatalog,
      });
      const itens = buildFaturaItensFromAgendamentos(agsReferencia, tipo);
      if (itens.length === 0) {
        toast.error(NO_RECORDS_TOAST);
        return;
      }

      const nextPreview = buildPreviewFromAgendamentos(
        tipo,
        referencia,
        filters,
        agsReferencia,
        {
          diaVencimentoClinica:
            tipo === "clinica"
              ? resolveDiaVencimentoClinica(referencia)
              : null,
        }
      );
      previewRef.current = nextPreview;
      setPreview(nextPreview);
      setPreviewOpen(true);
    },
    [
      agendamentos,
      bloquearFaturaDuplicada,
      clientesCatalog,
      filters,
      resolveDiaVencimentoClinica,
    ]
  );

  const handlePrevia = useCallback(() => {
    openPreviewForTipo(pageTipo);
  }, [openPreviewForTipo, pageTipo]);

  const persistPreview = useCallback(
    async (status: FaturaStatus) => {
      const current = previewRef.current;
      if (!current) throw new Error("Pré-visualização indisponível.");

      const mesReferencia =
        current.tipo === "clinica"
          ? filters.mesReferencia
          : current.periodo_inicio
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
      if (current.tipo === "cliente" && !isValorTotalFaturavel(valorTotal)) {
        throw new Error(FATURA_SEM_VALOR_COMPETENCIA_MSG);
      }

      const saved = await salvarFatura({
        faturaId: current.faturaId,
        tipo: current.tipo,
        referencia_nome: current.referenciaNome,
        referencia_id:
          current.tipo === "cliente"
            ? resolverReferenciaIdCliente(
                current.referencia_id,
                current.referenciaNome,
                clientesCatalogRef.current
              )
            : current.referencia_id ?? null,
        periodo_inicio: current.periodo_inicio,
        periodo_fim: current.periodo_fim,
        mes_referencia:
          current.tipo === "clinica"
            ? current.mes_referencia ?? mesReferenciaIsoFromBR(filters.mesReferencia)
            : undefined,
        data_fechamento: current.data_fechamento ?? current.periodo_fim,
        periodo_ajustado: current.periodo_ajustado,
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

  const abrirEnvioEmailModalCliente = useCallback(
    (
      fatura: FaturaRecord,
      origem: FaturaEnvioEmailModalOrigem,
      faturasFonte?: FaturaRecord[]
    ) => {
      const fonte = faturasFonte ?? faturas;
      const referenciaId = resolverReferenciaIdCliente(
        fatura.referencia_id,
        fatura.referencia_nome,
        clientesCatalogRef.current
      );
      const faturaModal =
        referenciaId && fatura.referencia_id !== referenciaId
          ? { ...fatura, referencia_id: referenciaId }
          : fatura;
      setEnvioEmailFatura(faturaModal);
      setEnvioEmailSugerido(
        obterEmailEnvioSugeridoCliente(fonte, referenciaId, fatura.id)
      );
      setEnvioEmailModalOrigem(origem);
      setEnvioEmailModalOpen(true);
    },
    [faturas]
  );

  const handleCloseEnvioEmailModal = useCallback(() => {
    setEnvioEmailModalOpen(false);
    setEnvioEmailFatura(null);
    setEnvioEmailSugerido(null);
  }, []);

  const handleEnviarEmailMenu = useCallback(
    async (faturaId: string) => {
      if (pageTipo !== "cliente") return;

      let fatura = faturas.find((f) => f.id === faturaId);
      if (!fatura) {
        setSaving(true);
        try {
          const loaded = await buscarFaturaComItens(faturaId);
          fatura = loaded ?? undefined;
        } catch {
          fatura = undefined;
        } finally {
          setSaving(false);
        }
      }

      if (!fatura) {
        toast.error("Fatura não encontrada.");
        return;
      }

      abrirEnvioEmailModalCliente(fatura, "menu");
    },
    [abrirEnvioEmailModalCliente, faturas, pageTipo]
  );

  const handleFaturaEnvioEmailEnviado = useCallback(
    (updated: FaturaRecord) => {
      setFaturas((prev) =>
        prev.map((f) =>
          f.id === updated.id
            ? {
                ...f,
                fatura_enviada_em:
                  updated.fatura_enviada_em ?? f.fatura_enviada_em,
                fatura_enviada_email:
                  updated.fatura_enviada_email ?? f.fatura_enviada_email,
                fatura_enviada_por:
                  updated.fatura_enviada_por ?? f.fatura_enviada_por,
                fatura_envio_reenvio_count:
                  updated.fatura_envio_reenvio_count ??
                  f.fatura_envio_reenvio_count,
              }
            : f
        )
      );

      if (previewRef.current?.faturaId === updated.id) {
        const nextPreview: FaturaPreviewState = {
          ...previewRef.current,
          fatura_enviada_em: updated.fatura_enviada_em,
          fatura_enviada_email: updated.fatura_enviada_email,
          fatura_enviada_por: updated.fatura_enviada_por,
          fatura_envio_reenvio_count: updated.fatura_envio_reenvio_count,
          emailEnvioSugerido: updated.fatura_enviada_email ?? null,
        };
        previewRef.current = nextPreview;
        setPreview(nextPreview);
      }
    },
    []
  );

  const abrirLembreteModalCliente = useCallback(
    (
      fatura: FaturaRecord,
      historicoInicial: boolean,
      faturasFonte?: FaturaRecord[]
    ) => {
      const fonte = faturasFonte ?? faturas;
      const referenciaId = resolverReferenciaIdCliente(
        fatura.referencia_id,
        fatura.referencia_nome,
        clientesCatalogRef.current
      );
      const faturaModal =
        referenciaId && fatura.referencia_id !== referenciaId
          ? { ...fatura, referencia_id: referenciaId }
          : fatura;
      lembreteAlvoRef.current = fatura.id;
      setLembreteFatura(faturaModal);
      setLembreteEmailSugerido(
        obterEmailEnvioSugeridoCliente(fonte, referenciaId, fatura.id)
      );
      setLembreteHistoricoInicial(historicoInicial);
      setLembreteModalOpen(true);

      if (!referenciaId) return;
      const alvoId = fatura.id;
      void buscarUltimoEmailEnvioCliente(referenciaId, fatura.id)
        .then((email) => {
          if (lembreteAlvoRef.current !== alvoId || !email) return;
          setLembreteEmailSugerido(email);
        })
        .catch((err) => {
          console.error("Erro ao recuperar e-mail de faturamento:", err);
        });
    },
    [faturas]
  );

  const resolverFaturaCliente = useCallback(
    async (faturaId: string): Promise<FaturaRecord | null> => {
      const local = faturas.find((f) => f.id === faturaId);
      if (local) return local;
      try {
        return (await buscarFaturaComItens(faturaId)) ?? null;
      } catch {
        return null;
      }
    },
    [faturas]
  );

  const handleAbrirLembrete = useCallback(
    async (faturaId: string, historicoInicial = false) => {
      if (pageTipo !== "cliente") return;
      const local = faturas.find((f) => f.id === faturaId);
      if (local) {
        abrirLembreteModalCliente(local, historicoInicial);
        return;
      }

      setSaving(true);
      try {
        const fatura = await resolverFaturaCliente(faturaId);
        if (!fatura) {
          toast.error("Fatura não encontrada.");
          return;
        }
        abrirLembreteModalCliente(fatura, historicoInicial);
      } finally {
        setSaving(false);
      }
    },
    [abrirLembreteModalCliente, faturas, pageTipo, resolverFaturaCliente]
  );

  const handleCloseLembreteModal = useCallback(() => {
    lembreteAlvoRef.current = null;
    setLembreteModalOpen(false);
    setLembreteFatura(null);
    setLembreteEmailSugerido(null);
  }, []);

  const handleLembreteEnviado = useCallback(
    (params: { faturaId: string; enviadoEm: string; email: string }) => {
      setFaturas((prev) =>
        prev.map((f) =>
          f.id === params.faturaId
            ? {
                ...f,
                fatura_lembrete_ultimo_em: params.enviadoEm,
                fatura_lembrete_ultimo_email: params.email,
              }
            : f
        )
      );
    },
    []
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

  const emitLockRef = useRef(false);

  const handleEmit = useCallback(async () => {
    if (emitLockRef.current) return;
    const current = previewRef.current;
    if (!current || !faturaPreviewPermiteEmitir(current)) return;

    if (current.tipo === "cliente" && !syncClienteVencimentoNoPreview()) return;

    emitLockRef.current = true;
    setSaving(true);
    try {
      if (current.tipo === "cliente") {
        const saved = await persistPreview("emitida");
        setPreviewOpen(false);
        previewRef.current = null;
        setPreview(null);
        if (saved) {
          const faturasAtualizadas = await reloadHistorico();
          abrirEnvioEmailModalCliente(saved, "pos-emissao", faturasAtualizadas);
        }
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
          : current.tipo === "cliente"
            ? "Erro ao emitir fatura."
            : "Erro ao preparar conferência dos custos."
      );
    } finally {
      emitLockRef.current = false;
      setSaving(false);
    }
  }, [
    persistPreview,
    syncClienteVencimentoNoPreview,
    abrirEnvioEmailModalCliente,
    reloadHistorico,
  ]);

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

      const referenciaId =
        fatura.tipo === "cliente"
          ? resolverReferenciaIdCliente(
              fatura.referencia_id,
              fatura.referencia_nome,
              clientesCatalogRef.current
            )
          : null;
      let emailEnvioSugerido =
        referenciaId
          ? obterEmailEnvioSugeridoCliente(faturas, referenciaId, fatura.id)
          : null;
      if (referenciaId) {
        try {
          emailEnvioSugerido =
            (await buscarUltimoEmailEnvioCliente(referenciaId, fatura.id)) ??
            emailEnvioSugerido;
        } catch (lookupErr) {
          console.error(
            "Erro ao recuperar e-mail de faturamento do cliente:",
            lookupErr
          );
        }
      }

      const nextPreview: FaturaPreviewState = {
        ...faturaComItensToPreview(fatura, true),
        emailEnvioSugerido,
        faturaOrigemId: fatura.fatura_origem_id,
        faturaOrigemNumero,
        faturaSubstitutaId: fatura.fatura_substituta_id,
        faturaSubstitutaNumero,
      };

      if (fatura.tipo === "cliente" && fatura.status === "rascunho") {
        const itensAtualizados = await obterItensFaturaClienteAtualizados(
          fatura
        );
        nextPreview.itens = itensAtualizados;
      }

      previewRef.current = nextPreview;
      setPreview(nextPreview);
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar fatura.");
    } finally {
      setSaving(false);
    }
  }, [faturas]);

  const handleFaturaAtualizada = useCallback((updated: FaturaPreviewState) => {
    previewRef.current = updated;
    setPreview(updated);
    setFaturas((prev) =>
      prev.map((f) =>
        f.id === updated.faturaId
          ? {
              ...f,
              fatura_enviada_em: updated.fatura_enviada_em ?? f.fatura_enviada_em,
              fatura_enviada_email:
                updated.fatura_enviada_email ?? f.fatura_enviada_email,
              fatura_enviada_por:
                updated.fatura_enviada_por ?? f.fatura_enviada_por,
              fatura_envio_reenvio_count:
                updated.fatura_envio_reenvio_count ?? f.fatura_envio_reenvio_count,
            }
          : f
      )
    );
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
            referencia_id:
              previewCurrent?.referencia_id ?? conferenciaFatura.referencia_id,
            periodo_inicio:
              previewCurrent?.periodo_inicio ??
              conferenciaFatura.periodo_inicio,
            periodo_fim:
              previewCurrent?.periodo_fim ?? conferenciaFatura.periodo_fim,
            mes_referencia:
              previewCurrent?.mes_referencia ??
              conferenciaFatura.mes_referencia,
            data_fechamento:
              previewCurrent?.data_fechamento ??
              conferenciaFatura.data_fechamento ??
              conferenciaFatura.periodo_fim,
            periodo_ajustado:
              previewCurrent?.periodo_ajustado ??
              conferenciaFatura.periodo_ajustado,
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
      const linhaClinica = isCliente
        ? undefined
        : resumoMesBase?.rows.find(
            (item) =>
              item.referenciaNome.trim().toLowerCase() ===
              referencia.toLowerCase()
          );
      const agsReferencia = isCliente
        ? filterAgendamentosDaReferenciaFatura(agendamentos, {
            mesReferencia: filters.mesReferencia,
            tipo: pageTipo,
            referenciaNome: referencia,
            referenciaId: resolveClienteFromCatalog(clientesCatalog, referencia)?.id,
            clientesCatalog,
          })
        : selecionarAgendamentosClinica(referencia);

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
      if (isCliente && !isValorTotalFaturavel(calcTotalFaturaItens(itens))) {
        toast.error(FATURA_SEM_VALOR_COMPETENCIA_MSG);
        return;
      }

      const nextPreview = buildPreviewFromAgendamentos(
        pageTipo,
        referencia,
        mesFilters,
        agsReferencia,
        {
          diaVencimentoClinica:
            pageTipo === "clinica"
              ? resolveDiaVencimentoClinica(referencia)
              : null,
          vencimentoMes:
            ciclosClinica.find((clinica) =>
              clinica.nomes.some(
                (nome) => nome.trim().toLowerCase() === referencia.toLowerCase()
              )
            )?.vencimentoMes ?? null,
          periodoInicio: linhaClinica?.periodoInicio,
          periodoFim: linhaClinica?.periodoFim,
          dataFechamento: linhaClinica?.dataFechamento,
          dataVencimento: linhaClinica?.dataVencimento,
          clinicaId: linhaClinica?.clinicaId,
          periodoAjustado: linhaClinica?.fatura?.periodo_ajustado,
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
      setSaving(true);
      try {
        if (isCliente) {
          if (!syncClienteVencimentoNoPreview()) return;
          const saved = await persistPreview("emitida");
          if (saved) {
            const faturasAtualizadas = await reloadHistorico();
            abrirEnvioEmailModalCliente(
              saved,
              "pos-emissao",
              faturasAtualizadas
            );
          }
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
      ciclosClinica,
      clientesCatalog,
      filters,
      pageTipo,
      persistPreview,
      resolveDiaVencimentoClinica,
      resumoMesBase?.rows,
      selecionarAgendamentosClinica,
      syncClienteVencimentoNoPreview,
      abrirEnvioEmailModalCliente,
      reloadHistorico,
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
      const agsReferencia = filterAgendamentosDaReferenciaFatura(agendamentos, {
        mesReferencia,
        tipo: "cliente",
        referenciaNome: referencia,
        referenciaId:
          fatura.referencia_id ||
          resolveClienteFromCatalog(clientesCatalog, referencia)?.id ||
          null,
        clientesCatalog,
      });
      const itens = buildFaturaItensFromAgendamentos(agsReferencia, "cliente");
      if (itens.length === 0) {
        toast.error(FATURA_SEM_AGENDAMENTOS_VALIDOS_REEMISSAO_MSG);
        return;
      }
      if (!isValorTotalFaturavel(calcTotalFaturaItens(itens))) {
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
        const faturasAtualizadas = await reloadHistorico();
        abrirEnvioEmailModalCliente(nova, "pos-emissao", faturasAtualizadas);
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
      clientesCatalog,
      faturas,
      filters,
      geradoPor,
      pageTipo,
      reloadAll,
      abrirEnvioEmailModalCliente,
      reloadHistorico,
    ]
  );

  const handleAbrirAjustePeriodo = useCallback((row: FaturaMesRow) => {
    if (row.fatura && row.fatura.status !== "rascunho") {
      toast.error(
        "Somente um fechamento aberto para conferência pode ter o período ajustado."
      );
      return;
    }
    if (row.fatura?.pago) {
      toast.error(
        "Fechamento com pagamento registrado não pode ter o período alterado por este caminho."
      );
      return;
    }
    setAjusteErro(null);
    setAjusteRow(row);
  }, []);

  const handleFecharAjustePeriodo = useCallback(() => {
    if (saving) return;
    setAjusteRow(null);
    setAjusteErro(null);
  }, [saving]);

  const handleSalvarAjustePeriodo = useCallback(
    async (params: { inicio: string; fim: string; motivo: string }) => {
      if (!ajusteRow) return;
      const config =
        ciclosClinica.find((clinica) =>
          clinica.nomes.some(
            (nome) =>
              nome.trim().toLowerCase() ===
              ajusteRow.referenciaNome.trim().toLowerCase()
          )
        ) ?? null;
      setSaving(true);
      setAjusteErro(null);
      try {
        await ajustarPeriodoCustosClinica(
          {
            faturaId: ajusteRow.fatura?.id,
            clinicaId: ajusteRow.clinicaId ?? config?.id ?? null,
            referenciaNome: ajusteRow.referenciaNome,
            mesFechamento: filters.mesReferencia,
            periodoInicio: params.inicio,
            periodoFim: params.fim,
            dataFechamento:
              ajusteRow.dataFechamento ??
              ajusteRow.periodoFim ??
              params.fim,
            dataVencimento:
              ajusteRow.dataVencimento ??
              ajusteRow.fatura?.data_vencimento ??
              params.fim,
            motivo: params.motivo,
            geradoPor,
            config: config
              ? {
                  fechamentoApuracao: config.fechamentoApuracao,
                  diaFechamento: config.diaFechamento,
                }
              : null,
          },
          auditOptions
        );
        toast.success("Período do fechamento ajustado.");
        setAjusteRow(null);
        await reloadAll();
      } catch (err) {
        console.error(err);
        const mensagem =
          err instanceof Error ? err.message : "Erro ao ajustar o período.";
        setAjusteErro(mensagem);
        toast.error(mensagem);
      } finally {
        setSaving(false);
      }
    },
    [
      ajusteRow,
      auditOptions,
      ciclosClinica,
      filters.mesReferencia,
      geradoPor,
      reloadAll,
    ]
  );

  return {
    pageTipo,
    filters,
    mesSelecionado,
    historicoFilters,
    filterOptions,
    agendamentosFiltrados,
    mesReferenciaValido,
    resumoMes,
    diaVencimentoPorClinica,
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
    auditOptions,
    handleFilterChange,
    handleMesChange,
    handleYearChange,
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
    handleFaturaAtualizada,
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
    ajusteRow,
    ajusteErro,
    handleAbrirAjustePeriodo,
    handleFecharAjustePeriodo,
    handleSalvarAjustePeriodo,
    envioEmailModalOpen,
    envioEmailFatura,
    envioEmailSugerido,
    envioEmailModalOrigem,
    handleCloseEnvioEmailModal,
    handleEnviarEmailMenu,
    handleFaturaEnvioEmailEnviado,
    lembreteModalOpen,
    lembreteFatura,
    lembreteEmailSugerido,
    lembreteHistoricoInicial,
    handleAbrirLembrete,
    handleCloseLembreteModal,
    handleLembreteEnviado,
  };
}
