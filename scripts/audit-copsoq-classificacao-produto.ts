/**
 * Auditoria: classificação do produto (escalas impressas 0–3 / 0–4).
 * Uso: npx tsx scripts/audit-copsoq-classificacao-produto.ts
 */
import assert from "node:assert/strict";
import { COPSOQ_DIMENSOES } from "../lib/copsoq/dimensoes";
import { COPSOQ_PERGUNTAS } from "../lib/copsoq/perguntas";
import {
  classificarMediaDimensao,
  FAIXA_ESCALA_3,
  FAIXA_ESCALA_4,
} from "../lib/copsoq-engine/classification";
import { escalaDimensaoProduto } from "../lib/copsoq-engine/escala-produto";
import { pontuarAlternativa, maxPontuacaoEscala } from "../lib/copsoq-engine/score";
import { getCopsoqEscala } from "../lib/copsoq/escalas";

const AMOSTRAS_4 = [0, 1.59, 1.6, 2.79, 2.8, 4.0];
const AMOSTRAS_3 = [0, 1.19, 1.2, 2.09, 2.1, 3.0];

function cor(id: string): string {
  if (id === "situacao_favoravel") return "verde";
  if (id === "risco_intermediario") return "amarelo";
  if (id === "risco_para_saude") return "vermelho";
  return "—";
}

console.log("=== Auditoria classificação produto (0–3 / 0–4) ===\n");
console.log(
  `Faixas 0–4: alto≥${FAIXA_ESCALA_4.altoMin} | médio≥${FAIXA_ESCALA_4.medioMin} | baixo≤${FAIXA_ESCALA_4.baixoMax}`
);
console.log(
  `Faixas 0–3: alto≥${FAIXA_ESCALA_3.altoMin} | médio≥${FAIXA_ESCALA_3.medioMin} | baixo≤${FAIXA_ESCALA_3.baixoMax}\n`
);

const calc = COPSOQ_DIMENSOES.filter((d) => d.entraNoCalculo);
for (const dim of calc) {
  const escala = escalaDimensaoProduto(dim.id);
  const amostras = escala === 4 ? AMOSTRAS_4 : AMOSTRAS_3;
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
console.log("OK  1B invertida: Sempre impresso=4 → efetivo=0\n");

console.log(`Dimensões auditadas: ${calc.length}`);
console.log("Auditoria concluída.");
