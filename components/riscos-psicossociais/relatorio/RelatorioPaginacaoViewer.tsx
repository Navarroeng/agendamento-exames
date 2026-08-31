"use client";

import { useLayoutEffect, useState } from "react";
import { RISCOS_RELATORIO_PRINT_ROOT_ID } from "@/lib/riscos-relatorio-pdf";
import {
  calcularRodapesSecaoViewer,
  CONFIG_SECOES_DOM_RELATORIO,
} from "@/lib/riscos-relatorio-paginacao";
import {
  RELATORIO_RODAPE_CONFIDENCIAL,
  RELATORIO_RODAPE_NAVARRO,
  RELATORIO_RODAPE_TITULO,
  RELATORIO_RODAPE_VERSAO,
} from "@/lib/riscos-relatorio-rodape";

/**
 * Rodapés com número de folha no viewer (modal).
 * No PDF o número vem de @page { counter(page) } — Chromium não incrementa
 * counter(page) em elementos do DOM (origem do "Página 0").
 *
 * A capa não entra na numeração. Visão Executiva = Página 1.
 * Seções com novaPaginaObrigatoria (lib/riscos-relatorio-paginacao) alinham
 * ao início da próxima folha — ex.: indicadores-complementares após COPSOQ.
 */
type Folha = { top: number; pagina: number };

function yRelativo(el: HTMLElement, root: HTMLElement): number {
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return a.top - b.top;
}

export function RelatorioPaginacaoViewer() {
  const [folhas, setFolhas] = useState<Folha[]>([]);

  useLayoutEffect(() => {
    const root = document.getElementById(RISCOS_RELATORIO_PRINT_ROOT_ID);
    if (!root) return;

    const measure = () => {
      const capa = root.querySelector(".relatorio-a4-capa");
      const pageH =
        capa instanceof HTMLElement && capa.offsetHeight > 0
          ? capa.offsetHeight
          : root.getBoundingClientRect().width * (297 / 210);
      if (!pageH) return;

      const next: Folha[] = [];
      let pagina = 1;
      let fimAnterior = 0;

      for (const secao of CONFIG_SECOES_DOM_RELATORIO) {
        const el = root.querySelector(secao.seletor);
        if (!(el instanceof HTMLElement)) continue;

        const domY = yRelativo(el, root);
        const h = el.offsetHeight;
        const { rodapes, fimVirtual } = calcularRodapesSecaoViewer({
          domY,
          altura: h,
          pageH,
          novaPaginaObrigatoria: secao.novaPaginaObrigatoria,
          fluxo: secao.fluxo,
          fimAnterior,
        });

        for (const top of rodapes) {
          next.push({ top, pagina: pagina++ });
        }
        fimAnterior = fimVirtual;
      }

      setFolhas(next);
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  if (folhas.length === 0) return null;

  return (
    <div
      className="relatorio-viewer-paginacao riscos-relatorio-print-hide"
      aria-hidden
    >
      {folhas.map((f) => (
        <div
          key={f.pagina}
          className="relatorio-viewer-pagina-rodape"
          style={{ top: f.top }}
        >
          <span>{RELATORIO_RODAPE_NAVARRO}</span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>{RELATORIO_RODAPE_TITULO}</span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>{RELATORIO_RODAPE_VERSAO}</span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>{RELATORIO_RODAPE_CONFIDENCIAL}</span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>Página {f.pagina}</span>
        </div>
      ))}
    </div>
  );
}
