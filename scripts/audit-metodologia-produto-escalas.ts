/**
 * Auditoria — metodologia do produto (escalas impressas 0–3 / 0–4).
 * Uso: npx tsx scripts/audit-metodologia-produto-escalas.ts
 */
import assert from "node:assert/strict";
import { COPSOQ_DIMENSOES } from "../lib/copsoq/dimensoes";
import { getCopsoqEscala } from "../lib/copsoq/escalas";
import {
  classificarMediaDimensao,
  FAIXA_ESCALA_3,
  FAIXA_ESCALA_4,
} from "../lib/copsoq-engine/classification";
import { perguntasCalculoDaDimensao } from "../lib/copsoq-engine/dimensions";
import {
  escalaDimensaoProduto,
  maxEscalaImpressaPergunta,
  numeroAlternativasPergunta,
} from "../lib/copsoq-engine/escala-produto";
import { pontuarAlternativa } from "../lib/copsoq-engine/score";
import { amplitudeEfetivaPergunta } from "../lib/copsoq-engine/scale-normalize";

function cor(id: string): string {
  if (id === "situacao_favoravel") return "verde";
  if (id === "risco_intermediario") return "amarelo";
  if (id === "risco_para_saude") return "vermelho";
  return "—";
}

function faixaTexto(escala: 3 | 4, tipo: "RISCO" | "PROTECAO"): string {
  const f = escala === 4 ? FAIXA_ESCALA_4 : FAIXA_ESCALA_3;
  if (tipo === "RISCO") {
    return `Fav ≤${f.baixoMax} | Mod ${f.medioMin}–<${f.altoMin} | Desfav ≥${f.altoMin} (0–${escala})`;
  }
  return `Fav ≥${f.altoMin} | Mod ${f.medioMin}–<${f.altoMin} | Desfav ≤${f.baixoMax} (0–${escala})`;
}

console.log("=== Auditoria metodologia produto (escalas 0–3 / 0–4) ===\n");

const calc = COPSOQ_DIMENSOES.filter((d) => d.entraNoCalculo);
const misturas: string[] = [];
const porEscala: { "3": string[]; "4": string[] } = { "3": [], "4": [] };

for (const dim of calc) {
  const perguntas = perguntasCalculoDaDimensao(dim.id);
  let escala: 3 | 4;
  try {
    escala = escalaDimensaoProduto(dim.id);
  } catch (e) {
    misturas.push(dim.nome);
    console.log(`## ${dim.nome} — ERRO: ${(e as Error).message}\n`);
    continue;
  }
  porEscala[String(escala) as "3" | "4"].push(dim.nome);

  let soma = 0;
  const detalhe: string[] = [];
  const invertidas: string[] = [];

  for (const p of perguntas) {
    const nAlt = numeroAlternativasPergunta(p);
    const esc = getCopsoqEscala(p.tipoEscala)!;
    const amp = amplitudeEfetivaPergunta(p);
    const impressos = esc.alternativas.map((a) => a.pontuacao);
    const origMin = Math.min(...impressos);
    const origMax = Math.max(...impressos);
    if (p.pontuacaoInvertida) invertidas.push(p.codigo);

    const midIdx = Math.floor(esc.alternativas.length / 2);
    const altMid = esc.alternativas[midIdx]!;
    const efetivo = pontuarAlternativa(p, altMid);
    soma += efetivo;

    detalhe.push(
      `${p.codigo}(${nAlt} alts, ${origMin}–${origMax}` +
        `${p.pontuacaoInvertida ? ", invertida" : ""}; amp efetiva ${amp.min}–${amp.max}; max=${maxEscalaImpressaPergunta(p)})`
    );
  }

  const mediaExemplo = soma / perguntas.length;
  const cls = classificarMediaDimensao(dim, mediaExemplo, escala);

  console.log(`## ${dim.nome}`);
  console.log(`tipo: ${dim.tipo === "RISCO" ? "RISCO" : "PROTEÇÃO"}`);
  console.log(`perguntas: ${perguntas.map((p) => p.codigo).join(", ")}`);
  console.log(`detalhe: ${detalhe.join("; ")}`);
  console.log(`escala impressa: 0–${escala}`);
  console.log(
    `invertidas: ${invertidas.length ? invertidas.join(", ") : "(nenhuma)"}`
  );
  console.log(
    `média-exemplo (alt. central): ${mediaExemplo.toFixed(4)} / ${escala}`
  );
  console.log(`faixa: ${faixaTexto(escala, dim.tipo)}`);
  console.log(`classificação: ${cls.label}`);
  console.log(`cor: ${cor(cls.id)}`);
  console.log("");
}

assert.equal(misturas.length, 0, `Dimensões mistas: ${misturas.join(", ")}`);

console.log("--- Resumo ---");
console.log(`Dimensões 0–4: ${porEscala["4"].join("; ")}`);
console.log(`Dimensões 0–3: ${porEscala["3"].join("; ")}`);
console.log(`Dimensões mistas: nenhuma`);
console.log(`Dimensões auditadas: ${calc.length}`);
console.log("Auditoria concluída.");
