/**
 * Conteúdo executivo automático do relatório (sem alterar classificação COPSOQ).
 */
import assert from "node:assert/strict";
import type {
  RiscosRelatorioDimensaoSnapshot,
  RiscosRelatorioRecord,
} from "../lib/riscos-relatorio";
import {
  analisarDimensao,
  gerarConteudoExecutivo,
  montarPlanoAcao,
  recomendacoesDimensao,
  textoPossiveisImpactos,
  textoResultadoEncontrado,
} from "../lib/riscos-relatorio-conteudo";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function dim(
  partial: Partial<RiscosRelatorioDimensaoSnapshot> &
    Pick<
      RiscosRelatorioDimensaoSnapshot,
      "id" | "nome" | "tipo" | "media" | "classificacaoId" | "classificacaoLabel"
    >
): RiscosRelatorioDimensaoSnapshot {
  return {
    entraNoCalculo: true,
    classificacaoInterpretacao: "",
    cor: "#000",
    respondentesValidos: 12,
    descricao: "",
    ...partial,
  };
}

const favoravel = dim({
  id: "lideranca",
  nome: "Liderança",
  tipo: "PROTECAO",
  media: 3.8,
  classificacaoId: "situacao_favoravel",
  classificacaoLabel: "Situação Favorável",
});

const intermediario = dim({
  id: "demandas-trabalho",
  nome: "Demandas de Trabalho",
  tipo: "RISCO",
  media: 2.5,
  classificacaoId: "risco_intermediario",
  classificacaoLabel: "Risco Intermediário",
});

const critico = dim({
  id: "burnout-estresse",
  nome: "Burnout e Estresse",
  tipo: "RISCO",
  media: 3.9,
  classificacaoId: "risco_para_saude",
  classificacaoLabel: "Risco para Saúde",
});

run("análise de dimensão cobre os 4 blocos técnicos", () => {
  const a = analisarDimensao(critico);
  assert.ok(a.oQueAvalia.includes("esgotamento"));
  assert.ok(a.resultadoEncontrado.includes("Risco para Saúde"));
  assert.ok(a.possiveisImpactos.length > 40);
  assert.ok(a.recomendacoes.length >= 3);
});

run("texto com normalização menciona pontuação padronizada", () => {
  const iface = dim({
    id: "interface-trabalho-individuo",
    nome: "Interface trabalho-indivíduo",
    tipo: "PROTECAO",
    media: 4,
    mediaBruta: 3,
    maxEscalaBruta: 3,
    maxEscalaPadronizada: 4,
    classificacaoId: "situacao_favoravel",
    classificacaoLabel: "Situação Favorável",
  });
  const t = textoResultadoEncontrado(iface);
  assert.match(t, /pontuação original 3,00 \/ 3/i);
  assert.match(t, /pontuação padronizada 4,00 \/ 4/i);
  assert.match(t, /Situação Favorável/);
});

run("resultado favorável vs crítico diverge na narrativa", () => {
  const f = textoResultadoEncontrado(favoravel);
  const c = textoResultadoEncontrado(critico);
  assert.ok(f.toLowerCase().includes("proteção") || f.toLowerCase().includes("positivas"));
  assert.ok(c.toLowerCase().includes("elevada") || c.toLowerCase().includes("intervenção"));
  assert.notEqual(f, c);
});

run("impactos intermediários mencionam prevenção", () => {
  const t = textoPossiveisImpactos(intermediario);
  assert.match(t, /intermediário|prevenção|janela/i);
});

run("recomendações críticas são mais específicas/exigentes", () => {
  const fav = recomendacoesDimensao(favoravel);
  const cri = recomendacoesDimensao(critico);
  assert.ok(cri.length >= fav.length);
  assert.ok(cri.some((r) => /imediata|priorizar|plano de ação/i.test(r)));
});

run("plano de ação prioriza críticos e define prazos", () => {
  const plano = montarPlanoAcao([favoravel, intermediario, critico]);
  assert.equal(plano[0].prioridade, "Alta");
  assert.equal(plano[0].dimensaoId, "burnout-estresse");
  assert.equal(plano[0].prazoSugerido, "30 dias");
  assert.ok(plano.some((p) => p.prioridade === "Média"));
  assert.ok(plano.every((p) => p.status === "Pendente"));
});

run("conteúdo executivo é específico aos resultados da campanha", () => {
  const relatorio = {
    id: "r1",
    campanha_id: "c1",
    cliente_id: null,
    codigo_publico: "ABC123",
    empresa_nome: "Empresa Alpha",
    gerado_em: new Date().toISOString(),
    gerado_por: "Analista",
    gerado_por_user_id: null,
    participantes: 20,
    respondentes: 18,
    pendentes: 2,
    taxa_participacao: 90,
    status: "gerado",
    pdf_url: null,
    resultado_json: {
      versao: 2,
      capa: {
        empresaNome: "Empresa Alpha",
        codigoPublico: "ABC123",
        dataInicio: "2026-01-01",
        dataEncerramento: "2026-01-31",
        participantes: 20,
        respondentes: 18,
        pendentes: 2,
        taxaParticipacao: 90,
      },
      resumoExecutivo: {
        participacaoPercentual: 90,
        statusGeralMensagem: "x",
        quantidadeDimensoes: 3,
        dimensoesCriticas: [
          {
            id: critico.id,
            nome: critico.nome,
            classificacaoLabel: critico.classificacaoLabel,
          },
        ],
      },
      dimensoes: [favoravel, intermediario, critico],
      comportamentosOfensivos: {
        titulo: "",
        respondentesComAlgumaResposta: 0,
        media: null,
        classificacao: null,
        itens: [],
      },
      conclusao: null,
      recomendacoes: null,
    },
  } as RiscosRelatorioRecord;

  const out = gerarConteudoExecutivo(relatorio);
  assert.ok(out.resumoNarrativo.some((p) => p.includes("Empresa Alpha")));
  assert.ok(out.resumoNarrativo.some((p) => p.includes("ABC123")));
  assert.ok(out.resumoNarrativo.some((p) => /Burnout/i.test(p)));
  assert.ok(out.conclusaoTecnica.some((p) => /Risco para a Saúde/i.test(p)));
  assert.ok(out.recomendacoesGerais.some((p) => /30 dias|crític/i.test(p)));
  assert.ok(out.planoAcao.length >= 2);

  const favoravelOnly = {
    ...relatorio,
    resultado_json: {
      ...relatorio.resultado_json,
      dimensoes: [favoravel],
      resumoExecutivo: {
        ...relatorio.resultado_json.resumoExecutivo,
        dimensoesCriticas: [],
      },
    },
  } as RiscosRelatorioRecord;
  const outOk = gerarConteudoExecutivo(favoravelOnly);
  assert.ok(outOk.resumoNarrativo.some((p) => /favorável/i.test(p)));
  assert.ok(
    outOk.recomendacoesGerais.some((p) => /manter as boas práticas/i.test(p))
  );
  assert.notEqual(
    out.conclusaoTecnica.join(" "),
    outOk.conclusaoTecnica.join(" ")
  );
});

console.log("\nTodos os testes de conteúdo executivo passaram.");
