/**
 * Empacota o relatório em folhas A4.
 * Não corta itens; cada seção começa em folha nova; o restante de uma
 * seção não é preenchido com a seção seguinte.
 */

export const RELATORIO_SECAO_INDICADORES_COMPLEMENTARES =
  "indicadores-complementares" as const;

export type RelatorioSecaoDomId =
  | "visao-executiva"
  | "panorama"
  | "graficos"
  | "ranking"
  | "detalhamento"
  | typeof RELATORIO_SECAO_INDICADORES_COMPLEMENTARES
  | "conclusoes";

export type ConfigSecaoDomRelatorio = {
  id: RelatorioSecaoDomId;
  seletor: string;
  /** Seção inicia obrigatoriamente em nova página (capítulo). */
  novaPaginaObrigatoria: boolean;
  /** Conteúdo pode ocupar várias folhas dentro da seção. */
  fluxo?: boolean;
};

export function classeSecaoRelatorio(id: RelatorioSecaoDomId): string {
  return `relatorio-secao-${id}`;
}

/** Ordem das seções no DOM do relatório — fonte da verdade para paginação. */
export const CONFIG_SECOES_DOM_RELATORIO: ConfigSecaoDomRelatorio[] = [
  {
    id: "visao-executiva",
    seletor: `.${classeSecaoRelatorio("visao-executiva")}`,
    novaPaginaObrigatoria: false,
  },
  {
    id: "panorama",
    seletor: `.${classeSecaoRelatorio("panorama")}`,
    novaPaginaObrigatoria: true,
  },
  {
    id: "graficos",
    seletor: `.${classeSecaoRelatorio("graficos")}`,
    novaPaginaObrigatoria: true,
  },
  {
    id: "ranking",
    seletor: `.${classeSecaoRelatorio("ranking")}`,
    novaPaginaObrigatoria: true,
  },
  {
    id: "detalhamento",
    seletor: `.${classeSecaoRelatorio("detalhamento")}`,
    novaPaginaObrigatoria: true,
    fluxo: true,
  },
  {
    id: RELATORIO_SECAO_INDICADORES_COMPLEMENTARES,
    seletor: `.${classeSecaoRelatorio(RELATORIO_SECAO_INDICADORES_COMPLEMENTARES)}`,
    novaPaginaObrigatoria: true,
    fluxo: true,
  },
  {
    id: "conclusoes",
    seletor: `.${classeSecaoRelatorio("conclusoes")}`,
    novaPaginaObrigatoria: true,
  },
];

export type ItemPaginacaoRelatorio = {
  id: string;
  altura: number;
};

export type SecaoPaginacaoRelatorio = {
  id: string;
  /** Título da seção — só na primeira folha dela (já com margem inferior). */
  cabecalhoAltura: number;
  itens: ItemPaginacaoRelatorio[];
  colunas: 1 | 2;
  /** Espaço entre itens (1 col) ou entre linhas (2 col). */
  gap: number;
};

export type FolhaRelatorio = {
  secaoId: string;
  cabecalho: boolean;
  itemIds: string[];
};

const EPS = 2;

function linhasDeGrid(
  itens: ItemPaginacaoRelatorio[],
  colunas: 1 | 2
): ItemPaginacaoRelatorio[][] {
  if (colunas === 1) {
    return itens.map((item) => [item]);
  }
  const linhas: ItemPaginacaoRelatorio[][] = [];
  for (let i = 0; i < itens.length; i += 2) {
    linhas.push(itens.slice(i, i + 2));
  }
  return linhas;
}

function alturaLinha(linha: ItemPaginacaoRelatorio[]): number {
  return linha.reduce((max, item) => Math.max(max, item.altura), 0);
}

export function empacotarSecaoRelatorio(
  secao: SecaoPaginacaoRelatorio,
  alturaUtil: number
): FolhaRelatorio[] {
  const util = Math.max(1, alturaUtil);
  const linhas = linhasDeGrid(secao.itens, secao.colunas);

  if (linhas.length === 0) {
    return [
      {
        secaoId: secao.id,
        cabecalho: secao.cabecalhoAltura > 0,
        itemIds: [],
      },
    ];
  }

  const folhas: FolhaRelatorio[] = [];
  let indice = 0;
  let primeira = true;

  while (indice < linhas.length) {
    const cabecalho = primeira ? secao.cabecalhoAltura : 0;
    let usado = cabecalho;
    const itemIds: string[] = [];
    let primeiraLinhaNaFolha = true;

    while (indice < linhas.length) {
      const linha = linhas[indice];
      const extra = primeiraLinhaNaFolha ? 0 : secao.gap;
      const preciso = extra + alturaLinha(linha);
      const cabe = usado + preciso <= util + EPS;

      if (!cabe && itemIds.length > 0) {
        break;
      }

      usado += preciso;
      for (const item of linha) itemIds.push(item.id);
      indice += 1;
      primeiraLinhaNaFolha = false;
    }

    folhas.push({
      secaoId: secao.id,
      cabecalho: primeira && secao.cabecalhoAltura > 0,
      itemIds,
    });
    primeira = false;

    if (itemIds.length === 0) {
      break;
    }
  }

  return folhas;
}

export function empacotarRelatorioEmFolhas(
  secoes: SecaoPaginacaoRelatorio[],
  alturaUtil: number
): FolhaRelatorio[] {
  return secoes.flatMap((secao) => empacotarSecaoRelatorio(secao, alturaUtil));
}

const EPS_VIEWER = 0.04;

/**
 * Calcula posições de rodapé no viewer modal, respeitando seções que
 * iniciam obrigatoriamente em nova página (ex.: indicadores-complementares).
 */
export function calcularRodapesSecaoViewer(input: {
  domY: number;
  altura: number;
  pageH: number;
  novaPaginaObrigatoria: boolean;
  fluxo?: boolean;
  fimAnterior: number;
}): { rodapes: number[]; fimVirtual: number } {
  const { domY, altura, pageH, novaPaginaObrigatoria, fluxo, fimAnterior } =
    input;

  const startY = novaPaginaObrigatoria
    ? Math.ceil(fimAnterior / pageH) * pageH
    : domY;

  const rodapes: number[] = [];
  if (fluxo) {
    const n = Math.max(1, Math.ceil(altura / pageH - EPS_VIEWER));
    for (let i = 0; i < n; i++) {
      rodapes.push(startY + Math.min((i + 1) * pageH, altura) - 1);
    }
  } else {
    rodapes.push(startY + altura - 1);
  }

  return { rodapes, fimVirtual: startY + altura };
}
