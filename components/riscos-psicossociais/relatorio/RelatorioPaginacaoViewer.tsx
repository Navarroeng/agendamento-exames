"use client";

import { useLayoutEffect, useState } from "react";
import { RISCOS_RELATORIO_PRINT_ROOT_ID } from "@/lib/riscos-relatorio-pdf";

/**
 * Rodapés com número de folha no viewer (modal).
 * No PDF o número vem de @page { counter(page) } — Chromium não incrementa
 * counter(page) em elementos do DOM (origem do "Página 0").
 *
 * A capa é a folha 1 (rodapé próprio, navy). Daqui em diante: 2, 3, …
 * Detalhamento COPSOQ pode ocupar várias folhas — fatiado pela altura A4.
 */
const SECOES: { sel: string; fluxo?: boolean }[] = [
  { sel: ".relatorio-secao-visao-executiva" },
  { sel: ".relatorio-secao-panorama" },
  { sel: ".relatorio-secao-graficos" },
  { sel: ".relatorio-secao-ranking" },
  { sel: ".relatorio-secao-detalhamento", fluxo: true },
  { sel: ".relatorio-secao-conclusoes" },
];

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
      let pagina = 2;

      for (const { sel, fluxo } of SECOES) {
        const el = root.querySelector(sel);
        if (!(el instanceof HTMLElement)) continue;
        const y = yRelativo(el, root);
        const h = el.offsetHeight;

        if (fluxo) {
          const n = Math.max(1, Math.ceil(h / pageH - 0.04));
          for (let i = 0; i < n; i++) {
            next.push({
              top: y + Math.min((i + 1) * pageH, h) - 1,
              pagina: pagina++,
            });
          }
        } else {
          next.push({ top: y + h - 1, pagina: pagina++ });
        }
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
          <span>
            Navarro Engenharia de Segurança e Medicina Ocupacional
          </span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>Relatório de Avaliação dos Riscos Psicossociais</span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>Página {f.pagina}</span>
        </div>
      ))}
    </div>
  );
}
