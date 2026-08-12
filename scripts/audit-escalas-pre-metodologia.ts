/**
 * Auditoria pré-implementação: escalas por dimensão.
 */
import { COPSOQ_DIMENSOES } from "../lib/copsoq/dimensoes";
import { COPSOQ_PERGUNTAS } from "../lib/copsoq/perguntas";
import { getCopsoqEscala } from "../lib/copsoq/escalas";

for (const d of COPSOQ_DIMENSOES.filter((x) => x.entraNoCalculo)) {
  const ps = COPSOQ_PERGUNTAS.filter(
    (p) => p.dimensaoId === d.id && p.entraNoCalculo
  );
  console.log(`## ${d.nome} (${d.tipo})`);
  const destinos = new Set<string>();
  for (const p of ps) {
    const e = getCopsoqEscala(p.tipoEscala);
    const alts = e?.alternativas ?? [];
    const scores = alts.map((a) => a.pontuacao);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const n = alts.length;
    const dest = n === 5 ? "0–5" : n === 4 ? "0–4" : `? (${n})`;
    destinos.add(dest);
    console.log(
      `  ${p.codigo} | ${p.tipoEscala} | ${n} alts | original ${min}–${max} | dest ${dest} | inv=${p.pontuacaoInvertida}`
    );
  }
  console.log(
    `  → destinos na dimensão: ${Array.from(destinos).join(", ")} | mista=${destinos.size > 1}`
  );
  console.log("");
}
