/**
 * Auditoria final — metodologia do produto (escalas 0–4 / 0–5).
 * Uso: npx tsx scripts/audit-metodologia-produto-escalas.ts
 */
import assert from "node:assert/strict";
import { COPSOQ_DIMENSOES } from "../lib/copsoq/dimensoes";
import { getCopsoqEscala } from "../lib/copsoq/escalas";
import {
  classificarMediaDimensao,
  FAIXA_ESCALA_4,
  FAIXA_ESCALA_5,
} from "../lib/copsoq-engine/classification";
import { perguntasCalculoDaDimensao } from "../lib/copsoq-engine/dimensions";
import {
  converterPontuacaoEfetivaParaEscalaFinal,
  escalaFinalDimensao,
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

function faixaTexto(escala: 4 | 5, tipo: "RISCO" | "PROTECAO"): string {
  const f = escala === 5 ? FAIXA_ESCALA_5 : FAIXA_ESCALA_4;
  if (tipo === "RISCO") {
    return `Fav ≤${f.baixoMax} | Mod ${f.medioMin}–<${f.altoMin} | Desfav ≥${f.altoMin} (escala 0–${escala})`;
  }
  return `Fav ≥${f.altoMin} | Mod ${f.medioMin}–<${f.altoMin} | Desfav ≤${f.baixoMax} (escala 0–${escala})`;
}

console.log("=== Auditoria metodologia produto (escalas finais 0–4 / 0–5) ===\n");

const calc = COPSOQ_DIMENSOES.filter((d) => d.entraNoCalculo);
const misturas: string[] = [];
const porEscala: { "4": string[]; "5": string[] } = { "4": [], "5": [] };

for (const dim of calc) {
  const perguntas = perguntasCalculoDaDimensao(dim.id);
  let escalaFinal: 4 | 5;
  try {
    escalaFinal = escalaFinalDimensao(dim.id);
  } catch (e) {
    misturas.push(dim.nome);
    console.log(`## ${dim.nome} — ERRO: ${(e as Error).message}\n`);
    continue;
  }
  porEscala[String(escalaFinal) as "4" | "5"].push(dim.nome);

  // Média-exemplo: pontuação efetiva média de cada pergunta (média das alts impressas), convertida
  let somaFinal = 0;
  const detalhePerguntas: string[] = [];
  const invertidas: string[] = [];

  for (const p of perguntas) {
    const nAlt = numeroAlternativasPergunta(p);
    const escala = getCopsoqEscala(p.tipoEscala)!;
    const amp = amplitudeEfetivaPergunta(p);
    const impressos = escala.alternativas.map((a) => a.pontuacao);
    const origMin = Math.min(...impressos);
    const origMax = Math.max(...impressos);
    if (p.pontuacaoInvertida) invertidas.push(p.codigo);

    // Exemplo: alternativa do meio da escala impressa
    const midIdx = Math.floor(escala.alternativas.length / 2);
    const altMid = escala.alternativas[midIdx]!;
    const efetivo = pontuarAlternativa(p, altMid);
    const final = converterPontuacaoEfetivaParaEscalaFinal(p, efetivo);
    somaFinal += final;

    detalhePerguntas.push(
      `${p.codigo}(${nAlt} alts, orig ${origMin}–${origMax}` +
        `${p.pontuacaoInvertida ? ", invertida" : ""} → final ${amp.min}–${amp.max} mapeado 0–${escalaFinal})`
    );
  }

  const mediaExemplo = somaFinal / perguntas.length;
  const cls = classificarMediaDimensao(dim, mediaExemplo, escalaFinal);

  console.log(`## ${dim.nome}`);
  console.log(`tipo: ${dim.tipo === "RISCO" ? "RISCO" : "PROTEÇÃO"}`);
  console.log(`perguntas: ${perguntas.map((p) => p.codigo).join(", ")}`);
  console.log(`alts por pergunta: ${detalhePerguntas.join("; ")}`);
  console.log(`escala original (impressa): ver por pergunta acima`);
  console.log(`escala final: 0–${escalaFinal}`);
  console.log(
    `invertidas: ${invertidas.length ? invertidas.join(", ") : "(nenhuma)"}`
  );
  console.log(
    `média-exemplo (alt. central de cada pergunta): ${mediaExemplo.toFixed(4)} / ${escalaFinal}`
  );
  console.log(`faixa: ${faixaTexto(escalaFinal, dim.tipo)}`);
  console.log(`classificação: ${cls.label}`);
  console.log(`cor: ${cor(cls.id)}`);
  console.log("");
}

assert.equal(misturas.length, 0, `Dimensões mistas: ${misturas.join(", ")}`);

console.log("--- Resumo ---");
console.log(`Dimensões 0–5: ${porEscala["5"].join("; ")}`);
console.log(`Dimensões 0–4: ${porEscala["4"].join("; ")}`);
console.log(`Dimensões mistas: nenhuma`);
console.log(`Dimensões auditadas: ${calc.length}`);
console.log("Auditoria concluída.");
