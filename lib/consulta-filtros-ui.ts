export const ATRASO_FILTRO_TEXTO_MS = 350;

export type CampoFiltro<T> = keyof T;

export type PlanoConsultaFiltros =
  | { tipo: "inalterado" }
  | { tipo: "aplicar"; aguardarMs: number; pagina: 1 };

function valoresFiltroIguais(atual: unknown, aplicado: unknown): boolean {
  if (Array.isArray(atual) && Array.isArray(aplicado)) {
    return (
      atual.length === aplicado.length &&
      atual.every((item, index) => Object.is(item, aplicado[index]))
    );
  }
  return Object.is(atual, aplicado);
}

/**
 * Texto espera o debounce. Qualquer outro campo aplica a consulta na hora,
 * já na página 1, no mesmo passo em que os filtros consultados mudam.
 */
export function planoConsultaFiltros<T extends object>(
  atual: T,
  aplicado: T,
  camposTexto: readonly CampoFiltro<T>[]
): PlanoConsultaFiltros {
  const texto = new Set(camposTexto.map((campo) => String(campo)));
  let textoMudou = false;
  let demaisMudou = false;
  const chaves = Object.keys(atual);
  const chavesAplicadas = Object.keys(aplicado);
  for (let indice = 0; indice < chavesAplicadas.length; indice += 1) {
    const chave = chavesAplicadas[indice];
    if (!Object.prototype.hasOwnProperty.call(atual, chave)) chaves.push(chave);
  }

  for (let indice = 0; indice < chaves.length; indice += 1) {
    const chave = chaves[indice];
    const valorAtual = (atual as Record<string, unknown>)[chave];
    const valorAplicado = (aplicado as Record<string, unknown>)[chave];
    if (valoresFiltroIguais(valorAtual, valorAplicado)) continue;
    if (texto.has(chave)) textoMudou = true;
    else demaisMudou = true;
  }

  if (!textoMudou && !demaisMudou) return { tipo: "inalterado" };
  return {
    tipo: "aplicar",
    aguardarMs: demaisMudou ? 0 : ATRASO_FILTRO_TEXTO_MS,
    pagina: 1,
  };
}
