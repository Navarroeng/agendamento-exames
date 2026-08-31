/**
 * Mapa informativo categoria → perguntas.
 * Deriva exclusivamente de COPSOQ_DIMENSOES + COPSOQ_PERGUNTAS (dimensaoId).
 * Não duplica o agrupamento usado no cálculo.
 */

import { COPSOQ_DIMENSOES } from "@/lib/copsoq/dimensoes";
import { getPerguntasOrdenadas } from "@/lib/copsoq/instrument";
import type { CopsoqDimensaoTipo, CopsoqPergunta } from "@/lib/copsoq/types";

export type MapaPerguntaCopsoq = {
  id: string;
  ordem: number;
  numeroVisual: string;
  codigo: string;
  texto: string;
  dimensaoId: string;
};

export type MapaCategoriaCopsoq = {
  id: string;
  nome: string;
  tipo: CopsoqDimensaoTipo;
  entraNoCalculo: boolean;
  perguntas: MapaPerguntaCopsoq[];
};

export type MapaQuestionarioCopsoq = {
  categoriasAvaliadas: MapaCategoriaCopsoq[];
  comportamentosOfensivos: MapaCategoriaCopsoq | null;
  totais: {
    perguntas: number;
    categoriasAvaliadas: number;
    indicadoresOfensivos: number;
  };
};

export function formatNumeroVisualQuestionario(ordem: number): string {
  return String(ordem).padStart(2, "0");
}

function toMapaPergunta(p: CopsoqPergunta): MapaPerguntaCopsoq {
  return {
    id: p.id,
    ordem: p.ordem,
    numeroVisual: formatNumeroVisualQuestionario(p.ordem),
    codigo: p.codigo,
    texto: p.texto,
    dimensaoId: p.dimensaoId,
  };
}

export function montarMapaQuestionarioCopsoq(): MapaQuestionarioCopsoq {
  const perguntas = getPerguntasOrdenadas();
  const categorias: MapaCategoriaCopsoq[] = COPSOQ_DIMENSOES.map((dim) => ({
    id: dim.id,
    nome: dim.nome,
    tipo: dim.tipo,
    entraNoCalculo: dim.entraNoCalculo,
    perguntas: perguntas
      .filter((p) => p.dimensaoId === dim.id)
      .map(toMapaPergunta),
  }));

  const categoriasAvaliadas = categorias.filter((c) => c.entraNoCalculo);
  const comportamentosOfensivos =
    categorias.find((c) => c.id === "comportamentos-ofensivos") ?? null;

  return {
    categoriasAvaliadas,
    comportamentosOfensivos,
    totais: {
      perguntas: perguntas.length,
      categoriasAvaliadas: categoriasAvaliadas.length,
      indicadoresOfensivos: comportamentosOfensivos?.perguntas.length ?? 0,
    },
  };
}

export function todasCategoriasDoMapa(
  mapa: MapaQuestionarioCopsoq
): MapaCategoriaCopsoq[] {
  return mapa.comportamentosOfensivos
    ? [...mapa.categoriasAvaliadas, mapa.comportamentosOfensivos]
    : mapa.categoriasAvaliadas;
}

export function normalizarBuscaMapa(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function perguntaCombinaBusca(
  pergunta: MapaPerguntaCopsoq,
  q: string
): boolean {
  if (!q) return true;
  if (pergunta.numeroVisual === q || String(pergunta.ordem) === q) return true;
  if (normalizarBuscaMapa(pergunta.codigo) === q) return true;
  if (normalizarBuscaMapa(pergunta.texto).includes(q)) return true;
  return false;
}

function categoriaCombinaBusca(
  categoria: MapaCategoriaCopsoq,
  q: string
): boolean {
  if (!q) return true;
  if (normalizarBuscaMapa(categoria.nome).includes(q)) return true;
  return categoria.perguntas.some((p) => perguntaCombinaBusca(p, q));
}

export function idsPerguntasQueCombinam(
  categoria: MapaCategoriaCopsoq,
  busca: string
): Set<string> {
  const q = normalizarBuscaMapa(busca);
  if (!q) return new Set();
  return new Set(
    categoria.perguntas.filter((p) => perguntaCombinaBusca(p, q)).map((p) => p.id)
  );
}

export function filtrarMapaQuestionario(
  mapa: MapaQuestionarioCopsoq,
  busca: string
): MapaQuestionarioCopsoq {
  const q = normalizarBuscaMapa(busca);
  if (!q) return mapa;

  const categoriasAvaliadas = mapa.categoriasAvaliadas.filter((c) =>
    categoriaCombinaBusca(c, q)
  );
  const ofensivos =
    mapa.comportamentosOfensivos &&
    categoriaCombinaBusca(mapa.comportamentosOfensivos, q)
      ? mapa.comportamentosOfensivos
      : null;

  return {
    categoriasAvaliadas,
    comportamentosOfensivos: ofensivos,
    totais: mapa.totais,
  };
}

export function idsCategoriasVisiveis(mapa: MapaQuestionarioCopsoq): string[] {
  return todasCategoriasDoMapa(mapa).map((c) => c.id);
}
