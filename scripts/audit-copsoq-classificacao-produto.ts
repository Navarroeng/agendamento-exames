/**
 * Auditoria: classificação do produto (escalas finais 0–4 / 0–5).
 * Uso: npx tsx scripts/audit-copsoq-classificacao-produto.ts
 *
 * Para tabela completa por dimensão, preferir:
 *   npx tsx scripts/audit-metodologia-produto-escalas.ts
 */
import assert from "node:assert/strict";
import { COPSOQ_DIMENSOES } from "../lib/copsoq/dimensoes";
import { COPSOQ_PERGUNTAS } from "../lib/copsoq/perguntas";
import {
  classificarMediaDimensao,
  FAIXA_ESCALA_4,
  FAIXA_ESCALA_5,
} from "../lib/copsoq-engine/classification";
import { escalaFinalDimensao } from "../lib/copsoq-engine/escala-produto";
import { pontuarAlternativa, maxPontuacaoEscala } from "../lib/copsoq-engine/score";
import { getCopsoqEscala } from "../lib/copsoq/escalas";

const AMOSTRAS_5 = [0, 1.99, 2.0, 3.49, 3.5, 5.0];
const AMOSTRAS_4 = [0, 1.59, 1.6, 2.79, 2.8, 4.0];

function cor(id: string): string {
  if (id === "situacao_favoravel") return "verde";
  if (id === "risco_intermediario") return "amarelo";
  if (id === "risco_para_saude") return "vermelho";
  return "—";
}

console.log("=== Auditoria classificação produto (0–4 / 0–5) ===\n");
console.log(
  `Faixas 0–5: alto≥${FAIXA_ESCALA_5.altoMin} | médio≥${FAIXA_ESCALA_5.medioMin} | baixo≤${FAIXA_ESCALA_5.baixoMax}`
);
console.log(
  `Faixas 0–4: alto≥${FAIXA_ESCALA_4.altoMin} | médio≥${FAIXA_ESCALA_4.medioMin} | baixo≤${FAIXA_ESCALA_4.baixoMax}\n`
);

const calc = COPSOQ_DIMENSOES.filter((d) => d.entraNoCalculo);
for (const dim of calc) {
  const escala = escalaFinalDimensao(dim.id);
  const amostras = escala === 5 ? AMOSTRAS_5 : AMOSTRAS_4;
  const perguntas = COPSOQ_PERGUNTAS.filter(
    (p) => p.dimensaoId === dim.id && p.entraNoCalculo
  );
  const invertidas = perguntas
    .filter((p) => p.pontuacaoInvertida)
    .map((p) => p.codigo);

  console.log(`## ${dim.nome} (${dim.tipo}, escala 0–${escala})`);
  console.log(
    `perguntas: ${perguntas.map((p) => p.codigo).join(", ") || "—"}`
  );
  console.log(
    `invertidas: ${invertidas.length ? invertidas.join(", ") : "(nenhuma)"}`
  );
  console.log("média | classificação | cor");
  for (const m of amostras) {
    const nov = classificarMediaDimensao(dim, m, escala);
    console.log(
      `${m.toFixed(2).padStart(4)} | ${nov.label.padEnd(24)} | ${cor(nov.id)}`
    );
  }
  console.log("");
}

const p1b = COPSOQ_PERGUNTAS.find((p) => p.codigo === "1B")!;
assert.equal(p1b.pontuacaoInvertida, true);
const escala = getCopsoqEscala(p1b.tipoEscala)!;
const sempre = escala.alternativas.find((a) => a.label === "Sempre")!;
assert.equal(sempre.pontuacao, 4);
assert.equal(pontuarAlternativa(p1b, sempre), 0);
assert.equal(maxPontuacaoEscala(p1b), 4);
console.log("OK  1B invertida: Sempre impresso=4 → efetivo=0 (inalterado)\n");

console.log(`Dimensões auditadas: ${calc.length}`);
console.log("Auditoria concluída.");
