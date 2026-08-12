/**
 * Auditoria: classificação do produto (1,33 / 2,66) por dimensão.
 * Compara faixa antiga (2,33 / 3,66) × nova sobre médias-exemplo por tipo.
 *
 * Uso: npx tsx scripts/audit-copsoq-classificacao-produto.ts
 */
import assert from "node:assert/strict";
import { COPSOQ_DIMENSOES } from "../lib/copsoq/dimensoes";
import { COPSOQ_PERGUNTAS } from "../lib/copsoq/perguntas";
import {
  classificarMediaDimensao,
  COPSOQ_FAIXA_BAIXA_MAX,
  COPSOQ_FAIXA_MEDIA_MAX,
  COPSOQ_FAIXA_MEDIA_MIN,
} from "../lib/copsoq-engine/classification";
import { pontuarAlternativa, maxPontuacaoEscala } from "../lib/copsoq-engine/score";
import { getCopsoqEscala } from "../lib/copsoq/escalas";
import type { CopsoqDimensao } from "../lib/copsoq/types";

/** Classificação com cortes antigos das Orientações (só para coluna “antes”). */
function classificarAntiga(
  dimensao: CopsoqDimensao,
  media: number
): { id: string; label: string } {
  const BAIXA = 2.33;
  const MEDIA_MIN = 2.34;
  const MEDIA_MAX = 3.66;
  if (dimensao.tipo === "RISCO") {
    if (media <= BAIXA)
      return { id: "situacao_favoravel", label: "Situação Favorável" };
    if (media <= MEDIA_MAX)
      return { id: "risco_intermediario", label: "Risco Intermediário" };
    return { id: "risco_para_saude", label: "Risco para a Saúde" };
  }
  if (media > MEDIA_MAX)
    return { id: "situacao_favoravel", label: "Situação Favorável" };
  if (media >= MEDIA_MIN)
    return { id: "risco_intermediario", label: "Risco Intermediário" };
  return { id: "risco_para_saude", label: "Risco para a Saúde" };
}

const AMOSTRAS = [0, 1.33, 1.34, 2.0, 2.66, 2.67, 3.0, 4.0];

function cor(id: string): string {
  if (id === "situacao_favoravel") return "verde";
  if (id === "risco_intermediario") return "amarelo";
  if (id === "risco_para_saude") return "vermelho";
  return "—";
}

console.log("=== Auditoria classificação produto (1,33 / 2,66) ===\n");
console.log(
  `Cortes ativos: baixa≤${COPSOQ_FAIXA_BAIXA_MAX} | média ${COPSOQ_FAIXA_MEDIA_MIN}–${COPSOQ_FAIXA_MEDIA_MAX}\n`
);

const calc = COPSOQ_DIMENSOES.filter((d) => d.entraNoCalculo);
for (const dim of calc) {
  const perguntas = COPSOQ_PERGUNTAS.filter(
    (p) => p.dimensaoId === dim.id && p.entraNoCalculo
  );
  const invertidas = perguntas
    .filter((p) => p.pontuacaoInvertida)
    .map((p) => p.codigo);

  console.log(`## ${dim.nome}`);
  console.log(`tipo: ${dim.tipo}`);
  console.log(
    `perguntas: ${perguntas.map((p) => p.codigo).join(", ") || "—"}`
  );
  console.log(
    `invertidas: ${invertidas.length ? invertidas.join(", ") : "(nenhuma)"}`
  );
  console.log("média | antes (2,33/3,66) | depois (1,33/2,66) | cor");
  for (const m of AMOSTRAS) {
    const ant = classificarAntiga(dim, m);
    const nov = classificarMediaDimensao(dim, m);
    console.log(
      `${m.toFixed(2).padStart(4)} | ${ant.label.padEnd(22)} | ${nov.label.padEnd(22)} | ${cor(nov.id)}`
    );
  }
  console.log("");
}

// Validação 1B intacta
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
