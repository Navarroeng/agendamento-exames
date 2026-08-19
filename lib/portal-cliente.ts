/**
 * Home do Portal do Cliente — DTOs e regras de apresentação.
 * Sem PII, sem respostas, sem código público.
 */

import { calcularParticipacaoOperacional } from "@/lib/copsoq-engine";
import { escolherCampanhaParaProgresso } from "@/lib/riscos-campanha-origem";
import {
  buildParticipantesResumo,
  type RiscosParticipanteStatus,
} from "@/lib/riscos-campanha-participantes";
import type { RiscosRelatorioResultadoJson } from "@/lib/riscos-relatorio";

export const PORTAL_DEV_CLIENTE_ID_ENV = "PORTAL_DEV_CLIENTE_ID";

export const PORTAL_NAO_HABILITADO_MSG =
  "O portal ainda não está habilitado.";

export const PORTAL_SEM_AVALIACAO_MSG =
  "Nenhuma avaliação disponível no momento.";

export const PORTAL_PRIVACIDADE_AVISO =
  "Sua empresa pode acompanhar apenas a situação de participação dos colaboradores. As respostas individuais são confidenciais e os resultados são apresentados de forma consolidada.";

export const PORTAL_RESULTADOS_AGUARDANDO_MSG =
  "Os resultados consolidados estarão disponíveis após a conclusão da avaliação e geração do relatório.";

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
  dataInicio: string | null;
  dataEncerramento: string | null;
  cadastrados: number;
  respondidos: number;
  pendentes: number;
  participacaoPercentual: number | null;
  participantes: PortalParticipanteStatus[];
  relatorioDisponivel: boolean;
  relatorioGeradoEm: string | null;
  categoriasFavoraveis: PortalCategoriaResumo[];
  categoriasAtencao: PortalCategoriaResumo[];
  categoriasDesfavoraveis: PortalCategoriaResumo[];
  pontosAtencao: PortalPontoAtencao[];
};

export type PortalCampanhaFonte = {
  id: string;
  empresa_nome: string;
  status: string;
  data_inicio: string;
  data_encerramento: string;
  created_at?: string | null;
};

export type PortalParticipanteFonte = {
  nome_completo: string;
  status: string;
  removido_em?: string | null;
};

export type PortalSnapshotFonte = {
  gerado_em: string | null;
  resultado_json: RiscosRelatorioResultadoJson | Record<string, unknown> | null;
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

export function portalResumoVazio(): PortalResumo {
  return {
    campanhaId: null,
    empresaNome: null,
    ciclo: null,
    statusPortal: "sem_avaliacao",
    dataInicio: null,
    dataEncerramento: null,
    cadastrados: 0,
    respondidos: 0,
    pendentes: 0,
    participacaoPercentual: null,
    participantes: [],
    relatorioDisponivel: false,
    relatorioGeradoEm: null,
    categoriasFavoraveis: [],
    categoriasAtencao: [],
    categoriasDesfavoraveis: [],
    pontosAtencao: [],
  };
}

export function isPortalUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

/** Lê o cliente de desenvolvimento. Nunca usa query string. */
export function resolvePortalDevClienteId(
  env: Record<string, string | undefined> = process.env
): string | null {
  const raw = String(env[PORTAL_DEV_CLIENTE_ID_ENV] ?? "").trim();
  if (!isPortalUuid(raw)) return null;
  return raw;
}

export function escolherCampanhaAtualPortal(
  campanhas: readonly PortalCampanhaFonte[]
): PortalCampanhaFonte | null {
  return escolherCampanhaParaProgresso(campanhas);
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

export function resolverStatusPortal(input: {
  statusCampanha: string | null | undefined;
  respondidos: number;
  relatorioDisponivel: boolean;
}): PortalStatusHome {
  const status = String(input.statusCampanha ?? "").trim();
  if (status === "em_preparacao") return "programada";
  if (status === "aberta") {
    return input.respondidos > 0 ? "em_andamento" : "aberta";
  }
  if (status === "encerrada") {
    return input.relatorioDisponivel
      ? "resultados_disponiveis"
      : "concluida";
  }
  return "sem_avaliacao";
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
    };
    if (!item.id || !item.nome) continue;
    if (classificacao === "favoravel") favoraveis.push(item);
    else if (classificacao === "atencao") atencao.push(item);
    else desfavoraveis.push(item);
  }

  const criticasRaw = (json as RiscosRelatorioResultadoJson | undefined)
    ?.resumoExecutivo?.dimensoesCriticas;
  const criticas = Array.isArray(criticasRaw) ? criticasRaw : [];
  const pontosAtencao: PortalPontoAtencao[] = criticas
    .slice(0, 3)
    .map((c) => ({
      id: String(c.id ?? ""),
      nome: String(c.nome ?? "").trim(),
      label: String(c.classificacaoLabel ?? "").trim(),
    }))
    .filter((c) => c.id && c.nome);

  return { favoraveis, atencao, desfavoraveis, pontosAtencao };
}

export function montarPortalResumo(input: {
  campanha: PortalCampanhaFonte | null;
  participantes: readonly PortalParticipanteFonte[];
  snapshot: PortalSnapshotFonte | null;
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
  const extraido = temSnapshot
    ? extrairCategoriasDoSnapshot(input.snapshot?.resultado_json)
    : {
        favoraveis: [] as PortalCategoriaResumo[],
        atencao: [] as PortalCategoriaResumo[],
        desfavoraveis: [] as PortalCategoriaResumo[],
        pontosAtencao: [] as PortalPontoAtencao[],
      };

  const statusPortal = resolverStatusPortal({
    statusCampanha: input.campanha.status,
    respondidos: resumo.respondidos,
    relatorioDisponivel: temSnapshot,
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
    dataInicio,
    dataEncerramento,
    cadastrados: resumo.cadastrados,
    respondidos: resumo.respondidos,
    pendentes: resumo.pendentes,
    participacaoPercentual: participacao.percentual,
    participantes,
    relatorioDisponivel: temSnapshot,
    relatorioGeradoEm: temSnapshot
      ? String(input.snapshot?.gerado_em ?? "").trim() || null
      : null,
    categoriasFavoraveis: extraido.favoraveis,
    categoriasAtencao: extraido.atencao,
    categoriasDesfavoraveis: extraido.desfavoraveis,
    pontosAtencao: extraido.pontosAtencao,
  };
}

export function estadoTimelinePortal(
  statusPortal: PortalStatusHome,
  etapaId: PortalTimelineEtapaId
): PortalTimelineEstado {
  const ordem: PortalTimelineEtapaId[] = [
    "participantes",
    "pesquisa",
    "resultados",
    "plano_acao",
    "concluido",
  ];
  const atual: PortalTimelineEtapaId =
    statusPortal === "programada"
      ? "participantes"
      : statusPortal === "aberta" || statusPortal === "em_andamento"
        ? "pesquisa"
        : statusPortal === "concluida"
          ? "resultados"
          : statusPortal === "resultados_disponiveis"
            ? "plano_acao"
            : "participantes";

  const iEtapa = ordem.indexOf(etapaId);
  const iAtual = ordem.indexOf(atual);
  if (iEtapa < iAtual) return "concluida";
  if (iEtapa === iAtual) {
    if (statusPortal === "concluida" && etapaId === "resultados") {
      return "atual";
    }
    return "atual";
  }
  if (iEtapa === iAtual + 1 && statusPortal === "resultados_disponiveis") {
    return "proxima";
  }
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
