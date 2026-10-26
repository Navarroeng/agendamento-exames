import type { FaturaStatus } from "@/lib/types";

/** Tamanho de cada página ao ler a competência. A leitura segue até a última página. */
export const FATURA_COMPETENCIA_PAGE_SIZE = 1000;

const STATUS_IMPEDE_EMISSAO: readonly FaturaStatus[] = [
  "rascunho",
  "emitida",
  "vencida",
  "necessita_reemissao",
];

export type FaturaCompetenciaRef = {
  mes_referencia?: string | null;
  periodo_inicio?: string | null;
};

/**
 * Aceita `YYYY-MM`, `YYYY-MM-DD`, data com horário ou `MM/AAAA`.
 * Devolve `YYYY-MM`.
 */
export function competenciaIsoFromTexto(
  valor: string | null | undefined
): string | null {
  const texto = valor?.trim() ?? "";
  if (!texto) return null;
  const base = texto.split("T")[0] ?? "";

  const iso = base.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (iso) {
    const mes = Number(iso[2]);
    if (mes < 1 || mes > 12) return null;
    if (iso[3]) {
      const dia = Number(iso[3]);
      if (dia < 1 || dia > 31) return null;
    }
    return `${iso[1]}-${iso[2]}`;
  }

  const br = base.match(/^(\d{2})\/(\d{4})$/);
  if (!br) return null;
  const mes = Number(br[1]);
  if (mes < 1 || mes > 12) return null;
  return `${br[2]}-${br[1]}`;
}

/**
 * Competência da fatura: `mes_referencia` quando identifica um mês e,
 * na falta dele, o mês de `periodo_inicio`. Não usa a data de emissão.
 */
export function competenciaIsoDaFatura(
  fatura: FaturaCompetenciaRef
): string | null {
  const mesRef = fatura.mes_referencia?.trim() ?? "";
  if (mesRef) {
    const parsed = competenciaIsoFromTexto(mesRef);
    if (parsed) return parsed;
  }
  return competenciaIsoFromTexto(fatura.periodo_inicio);
}

/** A fatura pertence à competência informada (`YYYY-MM` ou `MM/AAAA`). */
export function faturaPertenceACompetencia(
  fatura: FaturaCompetenciaRef,
  mesReferencia: string
): boolean {
  const alvo = competenciaIsoFromTexto(mesReferencia);
  if (!alvo) return false;
  return competenciaIsoDaFatura(fatura) === alvo;
}

/** Intervalo civil `[inicio, fimExclusivo)` do mês `YYYY-MM`. */
export function intervaloCompetenciaIso(mesIso: string): {
  inicio: string;
  fimExclusivo: string;
} | null {
  const norm = competenciaIsoFromTexto(mesIso);
  if (!norm) return null;
  const [anoTexto, mesTexto] = norm.split("-");
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const fimAno = mes === 12 ? ano + 1 : ano;
  const fimMes = mes === 12 ? 1 : mes + 1;
  return {
    inicio: `${norm}-01`,
    fimExclusivo: `${fimAno}-${String(fimMes).padStart(2, "0")}-01`,
  };
}

/**
 * Filtro PostgREST que cobre a competência e o fallback de `periodo_inicio`.
 * O resultado ainda passa por `faturaPertenceACompetencia`, que é a regra única.
 */
export function filtroOrFaturasDaCompetencia(mesReferencia: string): string | null {
  const mesIso = competenciaIsoFromTexto(mesReferencia);
  const intervalo = mesIso ? intervaloCompetenciaIso(mesIso) : null;
  if (!mesIso || !intervalo) return null;
  const [ano, mes] = mesIso.split("-");
  const br = `${mes}/${ano}`;
  return [
    `mes_referencia.eq.${mesIso}`,
    `mes_referencia.like.${mesIso}%`,
    `mes_referencia.eq.${br}`,
    `and(periodo_inicio.gte.${intervalo.inicio},periodo_inicio.lt.${intervalo.fimExclusivo})`,
  ].join(",");
}

/** Junta todas as páginas. Para quando a página volta incompleta. */
export async function coletarPaginas<T>(
  buscar: (from: number, pageSize: number) => Promise<T[]>,
  pageSize = FATURA_COMPETENCIA_PAGE_SIZE
): Promise<T[]> {
  if (pageSize < 1) return [];
  const todas: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const pagina = await buscar(from, pageSize);
    todas.push(...pagina);
    if (pagina.length < pageSize) break;
  }
  return todas;
}

export function referenciaFaturaConfere(
  fatura: { referencia_nome: string; referencia_id?: string | null },
  referenciaNome: string,
  referenciaId?: string | null
): boolean {
  if (referenciaId?.trim() && fatura.referencia_id?.trim()) {
    return fatura.referencia_id === referenciaId;
  }
  return (
    fatura.referencia_nome.trim().toLowerCase() ===
    referenciaNome.trim().toLowerCase()
  );
}

type FaturaEmissaoRef = FaturaCompetenciaRef & {
  id: string;
  status: FaturaStatus;
  referencia_nome: string;
  referencia_id?: string | null;
};

/**
 * Fatura que impede nova emissão na competência.
 * Cancelada, substituída e reemitida não bloqueiam.
 */
export function encontrarFaturaQueImpedeEmissao<T extends FaturaEmissaoRef>(
  faturas: T[],
  params: {
    referenciaNome: string;
    referenciaId?: string | null;
    mesReferencia: string;
    ignorarFaturaId?: string | null;
  }
): T | null {
  const nome = params.referenciaNome.trim();
  if (!nome || !competenciaIsoFromTexto(params.mesReferencia)) return null;

  return (
    faturas.find((fatura) => {
      if (params.ignorarFaturaId && fatura.id === params.ignorarFaturaId) {
        return false;
      }
      if (!STATUS_IMPEDE_EMISSAO.includes(fatura.status)) return false;
      if (
        !referenciaFaturaConfere(fatura, nome, params.referenciaId)
      ) {
        return false;
      }
      return faturaPertenceACompetencia(fatura, params.mesReferencia);
    }) ?? null
  );
}
