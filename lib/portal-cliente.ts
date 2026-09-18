/**
 * Home do Portal do Cliente — DTOs e regras de apresentação.
 * Sem PII, sem respostas, sem código público.
 */

import { calcularParticipacaoOperacional } from "@/lib/copsoq-engine";
import { formatPeriodoCampanha } from "@/lib/riscos-campanha";
import { escolherCampanhaParaProgresso } from "@/lib/riscos-campanha-origem";
import {
  buildParticipantesResumo,
  type RiscosParticipanteStatus,
} from "@/lib/riscos-campanha-participantes";
import type { RiscosRelatorioResultadoJson } from "@/lib/riscos-relatorio";
import { relatorioLiberadoAoClientePortal } from "@/lib/riscos-relatorio-envio";
import {
  indicadoresComplementaresDeRelatorio,
  type StatusGeralIndicadoresComplementares,
} from "@/lib/riscos-indicadores-complementares";
import {
  portalContratoResumoVazio,
  type PortalContratoResumo,
} from "@/lib/portal-contrato";

export const PORTAL_DEV_CLIENTE_ID_ENV = "PORTAL_DEV_CLIENTE_ID";

export const PORTAL_NAO_HABILITADO_MSG =
  "O portal ainda não está habilitado.";

export const PORTAL_SEM_AVALIACAO_MSG =
  "Nenhuma avaliação disponível no momento.";

export const PORTAL_PRIVACIDADE_AVISO =
  "Sua empresa pode acompanhar apenas a situação de participação dos colaboradores. As respostas individuais são confidenciais e os resultados são apresentados de forma consolidada.";

export const PORTAL_PRIVACIDADE_CURTA =
  "As respostas são confidenciais. O Portal apresenta apenas a situação de participação e os resultados consolidados.";

export const PORTAL_SEM_CAMPANHAS_MSG =
  "Nenhuma avaliação realizada até o momento.";

export const PORTAL_SELECIONE_EMPRESA_MSG =
  "Selecione uma empresa para visualizar o portal.";

export const PORTAL_PREVIEW_INTERNO_LABEL = "Pré-visualização interna";

export const PORTAL_RESULTADOS_AGUARDANDO_MSG =
  "Os resultados consolidados estarão disponíveis após a conclusão da avaliação e geração do relatório.";

export const PORTAL_HISTORICO_UM_CICLO_MSG =
  "A evolução histórica ficará disponível após uma nova avaliação.";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PortalParticipacao = "concluida" | "pendente";

export type PortalParticipanteStatus = {
  nome: string;
  participacao: PortalParticipacao;
};

export type PortalClassificacao = "favoravel" | "atencao" | "desfavoravel";

export type PortalCategoriaResumo = {
  id: string;
  nome: string;
  classificacao: PortalClassificacao;
  /** Rótulo da metodologia do produto (ex.: Situação Moderada). */
  label: string;
};

export type PortalStatusHome =
  | "sem_avaliacao"
  | "programada"
  | "aberta"
  | "em_andamento"
  | "concluida"
  | "resultados_disponiveis";

export type PortalPontoAtencao = {
  id: string;
  nome: string;
  label: string;
};

export type PortalResumo = {
  campanhaId: string | null;
  empresaNome: string | null;
  ciclo: number | null;
  statusPortal: PortalStatusHome;
  statusCampanha: string | null;
  dataInicio: string | null;
  dataEncerramento: string | null;
  cadastrados: number;
  respondidos: number;
  pendentes: number;
  participacaoPercentual: number | null;
  participantes: PortalParticipanteStatus[];
  relatorioDisponivel: boolean;
  relatorioGeradoEm: string | null;
  logoUrl: string | null;
  empresaCnpj: string | null;
  planoAcaoDisponivel: boolean;
  categoriasFavoraveis: PortalCategoriaResumo[];
  categoriasAtencao: PortalCategoriaResumo[];
  categoriasDesfavoraveis: PortalCategoriaResumo[];
  pontosAtencao: PortalPontoAtencao[];
  historicoRiscos: PortalHistoricoCiclo[];
  indicadoresComplementaresDisponivel: boolean;
  indicadoresComplementaresStatus: StatusGeralIndicadoresComplementares;
  indicadoresComplementaresLabel: string;
  campanhasLista: PortalCampanhaListaItem[];
  contrato: PortalContratoResumo;
};

export type PortalCampanhaListaItem = {
  campanhaId: string;
  ciclo: number | null;
  label: string;
  dataInicio: string | null;
  dataEncerramento: string | null;
  periodo: string | null;
  statusPortal: PortalStatusHome;
  statusCampanha: string | null;
  statusLabel: string;
  cadastrados: number;
  respondidos: number;
  pendentes: number;
  participacaoPercentual: number | null;
  relatorioDisponivel: boolean;
};

export type PortalHistoricoCategoriaPonto = {
  id: string;
  nome: string;
  classificacao: PortalClassificacao;
  label: string;
};

export type PortalHistoricoCiclo = {
  campanhaId: string;
  label: string;
  periodo: string | null;
  dataInicio: string | null;
  favoraveis: number;
  atencao: number;
  desfavoraveis: number;
  categorias: PortalHistoricoCategoriaPonto[];
};

export type PortalHistoricoSnapshotFonte = {
  campanha_id: string;
  cliente_id?: string | null;
  gerado_em?: string | null;
  relatorio_enviado_em?: string | null;
  resultado_json: RiscosRelatorioResultadoJson | Record<string, unknown> | null;
};

export type PortalSnapshotFonte = {
  gerado_em: string | null;
  relatorio_enviado_em?: string | null;
  resultado_json: RiscosRelatorioResultadoJson | Record<string, unknown> | null;
};

export type PortalCampanhaFonte = {
  id: string;
  empresa_nome: string;
  status: string;
  data_inicio: string;
  data_encerramento: string;
  created_at?: string | null;
  cnpj?: string | null;
};

export type PortalParticipanteFonte = {
  nome_completo: string;
  status: string;
  removido_em?: string | null;
};

export const PORTAL_TIMELINE_ETAPAS = [
  { id: "participantes", label: "Participantes" },
  { id: "pesquisa", label: "Pesquisa" },
  { id: "resultados", label: "Resultados" },
  { id: "plano_acao", label: "Plano de Ação" },
  { id: "concluido", label: "Concluído" },
] as const;

export type PortalTimelineEtapaId =
  (typeof PORTAL_TIMELINE_ETAPAS)[number]["id"];

export type PortalTimelineEstado = "concluida" | "atual" | "proxima" | "futura";

export const PORTAL_STATUS_LABELS: Record<PortalStatusHome, string> = {
  sem_avaliacao: "Sem avaliação",
  programada: "Avaliação programada",
  aberta: "Pesquisa aberta",
  em_andamento: "Pesquisa em andamento",
  concluida: "Avaliação concluída",
  resultados_disponiveis: "Resultados disponíveis",
};

/** Rótulos compactos da lista/detalhe no Portal (apresentação, sem alterar o processo). */
export const PORTAL_STATUS_CLIENTE_LABELS: Record<PortalStatusHome, string> = {
  sem_avaliacao: "Sem avaliação",
  programada: "Programada",
  aberta: "Em andamento",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  resultados_disponiveis: "Resultados disponíveis",
};

export const PORTAL_CLASSIFICACAO_LABEL: Record<PortalClassificacao, string> = {
  favoravel: "Situação Favorável",
  atencao: "Situação Moderada",
  desfavoravel: "Situação Desfavorável",
};

export function portalResumoVazio(): PortalResumo {
  return {
    campanhaId: null,
    empresaNome: null,
    ciclo: null,
    statusPortal: "sem_avaliacao",
    statusCampanha: null,
    dataInicio: null,
    dataEncerramento: null,
    cadastrados: 0,
    respondidos: 0,
    pendentes: 0,
    participacaoPercentual: null,
    participantes: [],
    relatorioDisponivel: false,
    relatorioGeradoEm: null,
    logoUrl: null,
    empresaCnpj: null,
    planoAcaoDisponivel: false,
    categoriasFavoraveis: [],
    categoriasAtencao: [],
    categoriasDesfavoraveis: [],
    pontosAtencao: [],
    historicoRiscos: [],
    indicadoresComplementaresDisponivel: false,
    indicadoresComplementaresStatus: "indisponivel",
    indicadoresComplementaresLabel: "Indisponível",
    campanhasLista: [],
    contrato: portalContratoResumoVazio(),
  };
}

export function isPortalUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

/** Fallback local opcional. Produção usa o cliente escolhido pelo staff. */
export function resolvePortalDevClienteId(
  env: Record<string, string | undefined> = process.env
): string | null {
  const raw = String(env[PORTAL_DEV_CLIENTE_ID_ENV] ?? "").trim();
  if (!isPortalUuid(raw)) return null;
  return raw;
}

export type PortalEmpresaOpcao = {
  id: string;
  nome: string;
};

export type ResolveClientePortalPreview =
  | { ok: true; clienteId: string; origem: "request" | "env" }
  | { ok: true; clienteId: null; origem: "none" }
  | { ok: false; motivo: "uuid_invalido" };

/**
 * Cliente do preview interno.
 * UUID inválido na request NÃO cai no fallback de ambiente (evita misturar empresas).
 */
export function resolverClienteIdPortalPreview(input: {
  requestedClienteId?: string | null;
  envClienteId?: string | null;
}): ResolveClientePortalPreview {
  const requested = String(input.requestedClienteId ?? "").trim();
  if (requested) {
    if (!isPortalUuid(requested)) return { ok: false, motivo: "uuid_invalido" };
    return { ok: true, clienteId: requested, origem: "request" };
  }
  const envId = String(input.envClienteId ?? "").trim();
  if (isPortalUuid(envId)) {
    return { ok: true, clienteId: envId, origem: "env" };
  }
  return { ok: true, clienteId: null, origem: "none" };
}

export function isPerfilStaffNavarro(
  perfil: string | null | undefined,
  ativo: boolean | null | undefined = true
): boolean {
  if (ativo === false) return false;
  return perfil === "admin" || perfil === "operacional";
}

/** Uma opção por cliente, só campanhas não canceladas. */
export function consolidarEmpresasPortalPreview(
  campanhas: ReadonlyArray<{
    cliente_id?: string | null;
    empresa_nome?: string | null;
    status?: string | null;
  }>,
  clientes: ReadonlyArray<{ id: string; nome?: string | null }>
): PortalEmpresaOpcao[] {
  const nomesCadastro = new Map(
    clientes.map((c) => [c.id, String(c.nome ?? "").trim()])
  );
  const porCliente = new Map<string, string>();
  for (const campanha of campanhas) {
    if (String(campanha.status ?? "") === "cancelada") continue;
    const id = String(campanha.cliente_id ?? "").trim();
    if (!isPortalUuid(id)) continue;
    if (porCliente.has(id)) continue;
    const nome =
      nomesCadastro.get(id) ||
      String(campanha.empresa_nome ?? "").trim() ||
      "Empresa";
    porCliente.set(id, nome);
  }
  return Array.from(porCliente.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function escolherCampanhaAtualPortal(
  campanhas: readonly PortalCampanhaFonte[]
): PortalCampanhaFonte | null {
  return escolherCampanhaParaProgresso(campanhas);
}

/** Campanha da empresa: a solicitada, se pertencer à lista; senão a atual. */
export function escolherCampanhaPortalDaEmpresa(
  campanhas: readonly PortalCampanhaFonte[],
  campanhaIdSolicitada?: string | null
): PortalCampanhaFonte | null {
  const requested = String(campanhaIdSolicitada ?? "").trim();
  if (requested) {
    return campanhas.find((c) => c.id === requested) ?? null;
  }
  return escolherCampanhaAtualPortal(campanhas);
}

/**
 * Rótulo do cliente: 100% de participação com campanha ainda aberta
 * não vira "Concluída" — só o status real da campanha/relatório.
 */
export function labelStatusClientePortal(input: {
  statusPortal: PortalStatusHome;
  statusCampanha?: string | null;
}): string {
  const campanha = String(input.statusCampanha ?? "").trim();
  if (input.statusPortal === "resultados_disponiveis") {
    return PORTAL_STATUS_CLIENTE_LABELS.resultados_disponiveis;
  }
  if (campanha === "aberta") {
    return PORTAL_STATUS_CLIENTE_LABELS.em_andamento;
  }
  if (campanha === "em_preparacao" || input.statusPortal === "programada") {
    return PORTAL_STATUS_CLIENTE_LABELS.programada;
  }
  return PORTAL_STATUS_CLIENTE_LABELS[input.statusPortal];
}

export function cicloFromDataInicio(dataInicio: string | null | undefined): number | null {
  const y = String(dataInicio ?? "").slice(0, 4);
  if (!/^\d{4}$/.test(y)) return null;
  const n = Number(y);
  return n >= 2000 && n <= 2100 ? n : null;
}

export function participanteAtivoNoPortal(
  p: Pick<PortalParticipanteFonte, "status" | "removido_em">
): boolean {
  if (p.removido_em) return false;
  const status = String(p.status ?? "").trim().toLowerCase();
  return status !== "removido" && status !== "invalidado";
}

export function mapParticipacaoPortal(
  status: string | null | undefined
): PortalParticipacao {
  return String(status ?? "").trim().toLowerCase() === "respondido"
    ? "concluida"
    : "pendente";
}

export function mapClassificacaoPortal(
  classificacaoId: string | null | undefined
): PortalClassificacao | null {
  if (classificacaoId === "situacao_favoravel") return "favoravel";
  if (classificacaoId === "risco_intermediario") return "atencao";
  if (classificacaoId === "risco_para_saude") return "desfavoravel";
  return null;
}

export function pesquisaConcluidaPortal(input: {
  cadastrados: number;
  respondidos: number;
  pendentes: number;
}): boolean {
  return (
    input.cadastrados > 0 &&
    input.pendentes === 0 &&
    input.respondidos >= input.cadastrados
  );
}

/**
 * Status executivo do Portal.
 * Não usa só a porcentagem nem só o status da campanha:
 * relatório persistido da campanha prevalece mesmo se ela ainda estiver aberta.
 */
export function resolverStatusPortal(input: {
  statusCampanha: string | null | undefined;
  respondidos: number;
  pendentes: number;
  cadastrados: number;
  relatorioDisponivel: boolean;
}): PortalStatusHome {
  const status = String(input.statusCampanha ?? "").trim();
  if (!status || status === "cancelada") return "sem_avaliacao";
  if (status === "em_preparacao") return "programada";

  if (input.relatorioDisponivel) return "resultados_disponiveis";

  if (status === "encerrada") return "concluida";

  if (status === "aberta") {
    if (pesquisaConcluidaPortal(input)) return "concluida";
    return input.respondidos > 0 ? "em_andamento" : "aberta";
  }

  return "sem_avaliacao";
}

function labelCategoriaPortal(
  classificacao: PortalClassificacao,
  classificacaoLabel: string | null | undefined
): string {
  const fromSnapshot = String(classificacaoLabel ?? "").trim();
  return fromSnapshot || PORTAL_CLASSIFICACAO_LABEL[classificacao];
}

export function extrairCategoriasDoSnapshot(
  json: RiscosRelatorioResultadoJson | Record<string, unknown> | null | undefined
): {
  favoraveis: PortalCategoriaResumo[];
  atencao: PortalCategoriaResumo[];
  desfavoraveis: PortalCategoriaResumo[];
  pontosAtencao: PortalPontoAtencao[];
} {
  const favoraveis: PortalCategoriaResumo[] = [];
  const atencao: PortalCategoriaResumo[] = [];
  const desfavoraveis: PortalCategoriaResumo[] = [];

  const dimensoes = Array.isArray((json as { dimensoes?: unknown })?.dimensoes)
    ? ((json as RiscosRelatorioResultadoJson).dimensoes ?? [])
    : [];

  for (const d of dimensoes) {
    if (!d || d.entraNoCalculo === false) continue;
    const classificacao = mapClassificacaoPortal(d.classificacaoId);
    if (!classificacao) continue;
    const item: PortalCategoriaResumo = {
      id: String(d.id ?? ""),
      nome: String(d.nome ?? "").trim(),
      classificacao,
      label: labelCategoriaPortal(classificacao, d.classificacaoLabel),
    };
    if (!item.id || !item.nome) continue;
    if (classificacao === "favoravel") favoraveis.push(item);
    else if (classificacao === "atencao") atencao.push(item);
    else desfavoraveis.push(item);
  }

  const pontosAtencao: PortalPontoAtencao[] = [
    ...desfavoraveis,
    ...atencao,
  ].map((c) => ({
    id: c.id,
    nome: c.nome,
    label: c.label,
  }));

  return { favoraveis, atencao, desfavoraveis, pontosAtencao };
}

export function montarPortalResumo(input: {
  campanha: PortalCampanhaFonte | null;
  participantes: readonly PortalParticipanteFonte[];
  snapshot: PortalSnapshotFonte | null;
  logoUrl?: string | null;
  historicoRiscos?: PortalHistoricoCiclo[];
  campanhasLista?: PortalCampanhaListaItem[];
}): PortalResumo {
  if (!input.campanha) return portalResumoVazio();

  const ativos = input.participantes.filter(participanteAtivoNoPortal);
  const resumo = buildParticipantesResumo(
    ativos.map((p) => ({
      status: p.status as RiscosParticipanteStatus,
    }))
  );
  const participacao = calcularParticipacaoOperacional(
    resumo.respondidos,
    resumo.cadastrados
  );

  const temSnapshot = Boolean(input.snapshot?.resultado_json);
  const relatorioLiberado = relatorioLiberadoAoClientePortal({
    temSnapshot,
    relatorioGeradoEm: input.snapshot?.gerado_em,
    relatorioEnviadoEm: input.snapshot?.relatorio_enviado_em,
  });
  const extraido = temSnapshot
    ? extrairCategoriasDoSnapshot(input.snapshot?.resultado_json)
    : {
        favoraveis: [] as PortalCategoriaResumo[],
        atencao: [] as PortalCategoriaResumo[],
        desfavoraveis: [] as PortalCategoriaResumo[],
        pontosAtencao: [] as PortalPontoAtencao[],
      };

  const indicadoresComplementares = temSnapshot
    ? indicadoresComplementaresDeRelatorio({
        resultado_json: input.snapshot?.resultado_json as
          | RiscosRelatorioResultadoJson
          | undefined,
        respondentesValidos:
          (input.snapshot?.resultado_json as RiscosRelatorioResultadoJson | null)
            ?.capa?.respondentes ?? undefined,
      })
    : {
        disponivel: false,
        statusGeral: "indisponivel" as const,
        labelStatusGeral: "Indisponível",
      };

  const statusPortal = resolverStatusPortal({
    statusCampanha: input.campanha.status,
    respondidos: resumo.respondidos,
    pendentes: resumo.pendentes,
    cadastrados: resumo.cadastrados,
    relatorioDisponivel: relatorioLiberado,
  });

  const participantes: PortalParticipanteStatus[] = [...ativos]
    .map((p) => ({
      nome: String(p.nome_completo ?? "").trim(),
      participacao: mapParticipacaoPortal(p.status),
    }))
    .filter((p) => p.nome)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const dataInicio = String(input.campanha.data_inicio ?? "").slice(0, 10) || null;
  const dataEncerramento =
    String(input.campanha.data_encerramento ?? "").slice(0, 10) || null;

  return {
    campanhaId: input.campanha.id,
    empresaNome: String(input.campanha.empresa_nome ?? "").trim() || null,
    ciclo: cicloFromDataInicio(dataInicio),
    statusPortal,
    statusCampanha: String(input.campanha.status ?? "").trim() || null,
    dataInicio,
    dataEncerramento,
    cadastrados: resumo.cadastrados,
    respondidos: resumo.respondidos,
    pendentes: resumo.pendentes,
    participacaoPercentual: participacao.percentual,
    participantes,
    relatorioDisponivel: relatorioLiberado,
    relatorioGeradoEm: temSnapshot
      ? String(input.snapshot?.gerado_em ?? "").trim() || null
      : null,
    logoUrl: String(input.logoUrl ?? "").trim() || null,
    empresaCnpj: String(input.campanha.cnpj ?? "").trim() || null,
    planoAcaoDisponivel: false,
    categoriasFavoraveis: extraido.favoraveis,
    categoriasAtencao: extraido.atencao,
    categoriasDesfavoraveis: extraido.desfavoraveis,
    pontosAtencao: extraido.pontosAtencao,
    historicoRiscos: input.historicoRiscos ?? [],
    indicadoresComplementaresDisponivel: indicadoresComplementares.disponivel,
    indicadoresComplementaresStatus: indicadoresComplementares.statusGeral,
    indicadoresComplementaresLabel: indicadoresComplementares.labelStatusGeral,
    campanhasLista: input.campanhasLista ?? [],
    contrato: portalResumoVazio().contrato,
  };
}

export function pathPortalRelatorio(campanhaId: string): string {
  const id = campanhaId.trim();
  if (!isPortalUuid(id)) return "";
  return `/portal/relatorio/${id}`;
}

export function pathPortalRelatorioPdf(
  campanhaId: string,
  clienteId: string
): string {
  if (!isPortalUuid(campanhaId) || !isPortalUuid(clienteId)) return "";
  return `/api/portal/riscos/relatorio/${campanhaId}/pdf?cliente_id=${encodeURIComponent(clienteId)}`;
}

export function snapshotTemResultadoConsolidado(
  json: RiscosRelatorioResultadoJson | Record<string, unknown> | null | undefined
): boolean {
  return Array.isArray((json as { dimensoes?: unknown } | null)?.dimensoes);
}

export function labelCicloPortal(input: {
  dataInicio: string | null | undefined;
  dataEncerramento: string | null | undefined;
  anoDuplicado: boolean;
}): string {
  const inicio = String(input.dataInicio ?? "").slice(0, 10) || null;
  const fim = String(input.dataEncerramento ?? "").slice(0, 10) || null;
  const ciclo = cicloFromDataInicio(inicio);
  const base = ciclo ? `Ciclo ${ciclo}` : "Avaliação";
  if (!input.anoDuplicado) return base;
  if (inicio && fim) return `${base} · ${formatPeriodoCampanha(inicio, fim)}`;
  return base;
}

/**
 * Histórico consolidado por campanha com relatório persistido.
 * Não recalcula COPSOQ — usa classificação já gravada no snapshot.
 */
export function montarHistoricoRiscosPortal(input: {
  clienteId: string;
  campanhas: readonly PortalCampanhaFonte[];
  snapshots: readonly PortalHistoricoSnapshotFonte[];
}): PortalHistoricoCiclo[] {
  const clienteId = String(input.clienteId ?? "").trim();
  const porId = new Map(
    input.campanhas
      .filter((c) => c.id && String(c.status ?? "") !== "cancelada")
      .map((c) => [c.id, c])
  );

  const elegiveis: Array<{
    campanha: PortalCampanhaFonte;
    extraido: ReturnType<typeof extrairCategoriasDoSnapshot>;
  }> = [];

  for (const snap of input.snapshots) {
    const campanhaId = String(snap.campanha_id ?? "").trim();
    const campanha = porId.get(campanhaId);
    if (!campanha) continue;
    const snapCliente = String(snap.cliente_id ?? "").trim();
    if (snapCliente && clienteId && snapCliente !== clienteId) continue;
    if (!snapshotTemResultadoConsolidado(snap.resultado_json)) continue;
    if (
      !relatorioLiberadoAoClientePortal({
        temSnapshot: true,
        relatorioGeradoEm: snap.gerado_em,
        relatorioEnviadoEm: snap.relatorio_enviado_em,
      })
    ) {
      continue;
    }
    elegiveis.push({
      campanha,
      extraido: extrairCategoriasDoSnapshot(snap.resultado_json),
    });
  }

  elegiveis.sort((a, b) => {
    const da = String(a.campanha.data_inicio ?? "").slice(0, 10);
    const db = String(b.campanha.data_inicio ?? "").slice(0, 10);
    if (da !== db) return da.localeCompare(db);
    return String(a.campanha.created_at ?? "").localeCompare(
      String(b.campanha.created_at ?? "")
    );
  });

  const porAno = new Map<number, number>();
  for (const item of elegiveis) {
    const ano = cicloFromDataInicio(item.campanha.data_inicio);
    if (ano == null) continue;
    porAno.set(ano, (porAno.get(ano) ?? 0) + 1);
  }

  return elegiveis.map(({ campanha, extraido }) => {
    const dataInicio = String(campanha.data_inicio ?? "").slice(0, 10) || null;
    const dataEncerramento =
      String(campanha.data_encerramento ?? "").slice(0, 10) || null;
    const ciclo = cicloFromDataInicio(dataInicio);
    const anoDuplicado = ciclo != null && (porAno.get(ciclo) ?? 0) > 1;
    return {
      campanhaId: campanha.id,
      label: labelCicloPortal({
        dataInicio,
        dataEncerramento,
        anoDuplicado,
      }),
      periodo:
        dataInicio && dataEncerramento
          ? formatPeriodoCampanha(dataInicio, dataEncerramento)
          : null,
      dataInicio,
      favoraveis: extraido.favoraveis.length,
      atencao: extraido.atencao.length,
      desfavoraveis: extraido.desfavoraveis.length,
      categorias: [
        ...extraido.desfavoraveis,
        ...extraido.atencao,
        ...extraido.favoraveis,
      ],
    };
  });
}

export function montarListaCampanhasPortal(input: {
  campanhas: readonly PortalCampanhaFonte[];
  participantesPorCampanha: ReadonlyMap<
    string,
    readonly PortalParticipanteFonte[]
  >;
  snapshots: readonly PortalHistoricoSnapshotFonte[];
}): PortalCampanhaListaItem[] {
  const snapsPorCampanha = new Map(
    input.snapshots.map((s) => [String(s.campanha_id ?? "").trim(), s])
  );

  const itens: Array<PortalCampanhaListaItem & { createdAt: string }> = [];
  for (const campanha of input.campanhas) {
    if (!campanha.id || String(campanha.status ?? "") === "cancelada") continue;
    const participantes = input.participantesPorCampanha.get(campanha.id) ?? [];
    const ativos = participantes.filter(participanteAtivoNoPortal);
    const resumo = buildParticipantesResumo(
      ativos.map((p) => ({
        status: p.status as RiscosParticipanteStatus,
      }))
    );
    const participacao = calcularParticipacaoOperacional(
      resumo.respondidos,
      resumo.cadastrados
    );
    const snap = snapsPorCampanha.get(campanha.id);
    const temSnapshot = Boolean(snap?.resultado_json);
    const relatorioDisponivel = relatorioLiberadoAoClientePortal({
      temSnapshot,
      relatorioGeradoEm: snap?.gerado_em,
      relatorioEnviadoEm: snap?.relatorio_enviado_em,
    });
    const statusPortal = resolverStatusPortal({
      statusCampanha: campanha.status,
      respondidos: resumo.respondidos,
      pendentes: resumo.pendentes,
      cadastrados: resumo.cadastrados,
      relatorioDisponivel,
    });
    const dataInicio =
      String(campanha.data_inicio ?? "").slice(0, 10) || null;
    const dataEncerramento =
      String(campanha.data_encerramento ?? "").slice(0, 10) || null;
    itens.push({
      campanhaId: campanha.id,
      ciclo: cicloFromDataInicio(dataInicio),
      label: "",
      dataInicio,
      dataEncerramento,
      periodo:
        dataInicio && dataEncerramento
          ? formatPeriodoCampanha(dataInicio, dataEncerramento)
          : null,
      statusPortal,
      statusCampanha: String(campanha.status ?? "").trim() || null,
      statusLabel: labelStatusClientePortal({
        statusPortal,
        statusCampanha: campanha.status,
      }),
      cadastrados: resumo.cadastrados,
      respondidos: resumo.respondidos,
      pendentes: resumo.pendentes,
      participacaoPercentual: participacao.percentual,
      relatorioDisponivel,
      createdAt: String(campanha.created_at ?? ""),
    });
  }

  itens.sort((a, b) => {
    const da = a.dataInicio ?? "";
    const db = b.dataInicio ?? "";
    if (da !== db) return db.localeCompare(da);
    const ca = a.createdAt ?? "";
    const cb = b.createdAt ?? "";
    if (ca !== cb) return cb.localeCompare(ca);
    return String(b.campanhaId).localeCompare(String(a.campanhaId));
  });

  const porAno = new Map<number, number>();
  for (const item of itens) {
    if (item.ciclo == null) continue;
    porAno.set(item.ciclo, (porAno.get(item.ciclo) ?? 0) + 1);
  }

  return itens.map((item) => ({
    campanhaId: item.campanhaId,
    ciclo: item.ciclo,
    label: labelCicloPortal({
      dataInicio: item.dataInicio,
      dataEncerramento: item.dataEncerramento,
      anoDuplicado: item.ciclo != null && (porAno.get(item.ciclo) ?? 0) > 1,
    }),
    dataInicio: item.dataInicio,
    dataEncerramento: item.dataEncerramento,
    periodo: item.periodo,
    statusPortal: item.statusPortal,
    statusCampanha: item.statusCampanha,
    statusLabel: item.statusLabel,
    cadastrados: item.cadastrados,
    respondidos: item.respondidos,
    pendentes: item.pendentes,
    participacaoPercentual: item.participacaoPercentual,
    relatorioDisponivel: item.relatorioDisponivel,
  }));
}

export function historicoResultadosComparaveis(
  historico: readonly PortalHistoricoCiclo[]
): boolean {
  if (historico.length < 2) return false;
  const conjuntos = historico.map(
    (ciclo) => new Set(ciclo.categorias.map((c) => c.id).filter(Boolean))
  );
  const base = conjuntos[0];
  if (!base || base.size === 0) return false;
  return conjuntos.every(
    (atual) =>
      atual.size === base.size &&
      Array.from(base).every((id) => atual.has(id))
  );
}

export function montarPrincipaisResultadosPortal(input: {
  categoriasFavoraveis: readonly PortalCategoriaResumo[];
  categoriasAtencao: readonly PortalCategoriaResumo[];
  categoriasDesfavoraveis: readonly PortalCategoriaResumo[];
  indicadoresComplementaresDisponivel?: boolean;
  indicadoresComplementaresStatus?: StatusGeralIndicadoresComplementares;
  indicadoresComplementaresLabel?: string;
}): {
  positivos: PortalCategoriaResumo[];
  positivosOcultos: number;
  pontosAtencao: PortalCategoriaResumo[];
  atencaoOcultos: number;
  semDesfavoraveis: boolean;
  indicadorComplementarAtencao: boolean;
  indicadorComplementarLabel: string;
} {
  const positivos = input.categoriasFavoraveis.slice(0, 3);
  const pontosAtencao = [
    ...input.categoriasDesfavoraveis,
    ...input.categoriasAtencao,
  ].slice(0, 3);
  const atencaoTotal =
    input.categoriasDesfavoraveis.length + input.categoriasAtencao.length;
  return {
    positivos,
    positivosOcultos: Math.max(0, input.categoriasFavoraveis.length - 3),
    pontosAtencao,
    atencaoOcultos: Math.max(0, atencaoTotal - 3),
    semDesfavoraveis: input.categoriasDesfavoraveis.length === 0,
    indicadorComplementarAtencao:
      Boolean(input.indicadoresComplementaresDisponivel) &&
      input.indicadoresComplementaresStatus === "requer_atencao",
    indicadorComplementarLabel: String(
      input.indicadoresComplementaresLabel ?? ""
    ).trim(),
  };
}

export function categoriasHistoricoUnicas(
  historico: readonly PortalHistoricoCiclo[]
): Array<{ id: string; nome: string }> {
  const map = new Map<string, string>();
  for (const ciclo of historico) {
    for (const c of ciclo.categorias) {
      if (!c.id || map.has(c.id)) continue;
      map.set(c.id, c.nome);
    }
  }
  return Array.from(map.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export type PortalTimelineFonte = Pick<
  PortalResumo,
  "statusPortal" | "relatorioDisponivel" | "planoAcaoDisponivel"
>;

/**
 * Etapa atual a partir do estado real:
 * pesquisa só permanece atual enquanto houver pendências ou a coleta não tiver
 * sido consolidada; relatório da campanha avança para Resultados.
 * Plano de Ação / Concluído só avançam quando houver dado real.
 */
export function etapaAtualPortal(
  resumo: PortalTimelineFonte
): PortalTimelineEtapaId {
  if (resumo.planoAcaoDisponivel) return "plano_acao";
  if (resumo.relatorioDisponivel) return "resultados";
  if (resumo.statusPortal === "concluida") return "resultados";
  if (
    resumo.statusPortal === "aberta" ||
    resumo.statusPortal === "em_andamento"
  ) {
    return "pesquisa";
  }
  if (resumo.statusPortal === "programada") return "participantes";
  if (resumo.statusPortal === "resultados_disponiveis") return "resultados";
  return "participantes";
}

export function estadoTimelinePortal(
  resumo: PortalTimelineFonte,
  etapaId: PortalTimelineEtapaId
): PortalTimelineEstado {
  const ordem: PortalTimelineEtapaId[] = [
    "participantes",
    "pesquisa",
    "resultados",
    "plano_acao",
    "concluido",
  ];
  const atual = etapaAtualPortal(resumo);
  const iEtapa = ordem.indexOf(etapaId);
  const iAtual = ordem.indexOf(atual);
  if (iEtapa < iAtual) return "concluida";
  if (iEtapa === iAtual) return "atual";
  if (iEtapa === iAtual + 1) return "proxima";
  return "futura";
}

/** Chaves que jamais podem aparecer no JSON enviado ao browser. */
export const PORTAL_CAMPOS_PROIBIDOS = [
  "cpf",
  "data_nascimento",
  "email",
  "codigo_acesso",
  "codigo_publico",
  "codigoPublico",
  "codigo_acesso_exibicao",
  "identificador_anonimo",
  "resultado_json",
  "alternativa_id",
  "sessao_id",
  "participante_id",
] as const;

export function dtoContemCampoProibido(value: unknown): string | null {
  const json = JSON.stringify(value);
  for (const campo of PORTAL_CAMPOS_PROIBIDOS) {
    if (json.includes(`"${campo}"`)) return campo;
  }
  return null;
}
