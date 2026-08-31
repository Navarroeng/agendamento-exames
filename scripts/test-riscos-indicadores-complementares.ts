/**
 * Indicadores complementares — Comportamentos Ofensivos (relatório/portal).
 */
import assert from "node:assert/strict";
import { gerarConteudoExecutivo } from "../lib/riscos-relatorio-conteudo";
import {
  indicadoresComplementaresDeRelatorio,
  listarTemasIndicadoresConclusao,
  montarIndicadoresComplementares,
} from "../lib/riscos-indicadores-complementares";
import type { RiscosRelatorioRecord } from "../lib/riscos-relatorio";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function blocoOfensivos(
  itens: Array<{
    codigo: string;
    totais: Array<{ alternativaId: string; label: string; quantidade: number }>;
  }>
) {
  return {
    titulo: "Comportamentos Ofensivos",
    respondentesComAlgumaResposta: 1,
    media: null,
    classificacao: null,
    itens: itens.map((item) => ({
      perguntaCodigo: item.codigo,
      perguntaTexto: `Pergunta ${item.codigo}`,
      totais: item.totais,
    })),
  };
}

function relatorioComOfensivos(
  ofensivos: ReturnType<typeof blocoOfensivos> | null,
  dimensoesExtras?: RiscosRelatorioRecord["resultado_json"]["dimensoes"]
): RiscosRelatorioRecord {
  return {
    id: "r1",
    campanha_id: "c1",
    cliente_id: null,
    codigo_publico: "TST",
    empresa_nome: "Empresa Teste",
    gerado_em: "2026-08-31T12:00:00.000Z",
    gerado_por: "Teste",
    gerado_por_user_id: null,
    participantes: 3,
    respondentes: 3,
    pendentes: 0,
    taxa_participacao: 100,
    status: "gerado",
    pdf_url: null,
    resultado_json: {
      versao: 2,
      capa: {
        empresaNome: "Empresa Teste",
        codigoPublico: "TST",
        dataInicio: "2026-01-01",
        dataEncerramento: "2026-01-31",
        participantes: 3,
        respondentes: 3,
        pendentes: 0,
        taxaParticipacao: 100,
      },
      resumoExecutivo: {
        participacaoPercentual: 100,
        statusGeralMensagem: "",
        quantidadeDimensoes: 10,
        dimensoesCriticas: [],
      },
      dimensoes: dimensoesExtras ?? [],
      comportamentosOfensivos: ofensivos as never,
      conclusao: null,
      recomendacoes: null,
    },
  };
}

run("CENÁRIO A: todas Não → 4 sem indicação", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      { codigo: "20", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      { codigo: "21", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      { codigo: "22", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      { codigo: "23", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
    ])
  );
  assert.equal(out.statusGeral, "sem_indicacao");
  assert.equal(out.algumRequerAtencao, false);
  assert.ok(out.indicadores.every((i) => i.status === "sem_indicacao"));
  assert.match(out.textoOrientacaoSecao ?? "", /não foram identificadas respostas indicativas/i);
});

run("CENÁRIO B: bullying com exposição → requer atenção", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      { codigo: "20", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      { codigo: "21", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      { codigo: "22", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      {
        codigo: "23",
        totais: [
          { alternativaId: "exp-nao", label: "Não", quantidade: 2 },
          { alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 },
        ],
      },
    ])
  );
  const bullying = out.indicadores.find((i) => i.codigo === "23");
  assert.equal(bullying?.status, "requer_atencao");
  assert.equal(bullying?.labelStatus, "Requer atenção");
  assert.deepEqual(out.temasRequerAtencao, ["bullying"]);
  assert.equal(out.statusGeral, "requer_atencao");

  const exec = gerarConteudoExecutivo(
    relatorioComOfensivos(
      blocoOfensivos([
        { codigo: "20", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
        { codigo: "21", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
        { codigo: "22", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
        {
          codigo: "23",
          totais: [
            { alternativaId: "exp-nao", label: "Não", quantidade: 2 },
            { alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 },
          ],
        },
      ])
    )
  );
  assert.ok(exec.conclusaoTecnica.some((p) => /bullying/i.test(p)));
  assert.ok(!exec.conclusaoTecnica.some((p) => /33|1 de 3|poucas vezes/i.test(p)));
});

run("CENÁRIO C: dois indicadores com exposição", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      { codigo: "20", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      {
        codigo: "21",
        totais: [{ alternativaId: "exp-mensalmente", label: "Sim, mensalmente", quantidade: 1 }],
      },
      { codigo: "22", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      {
        codigo: "23",
        totais: [{ alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 }],
      },
    ])
  );
  assert.equal(out.temasRequerAtencao.length, 2);
  assert.ok(out.temasRequerAtencao.includes("bullying"));
  assert.ok(out.temasRequerAtencao.includes("ameaças de violência"));

  const temas = listarTemasIndicadoresConclusao(out.temasRequerAtencao);
  assert.match(temas, /bullying/);
  assert.match(temas, /ameaças de violência/);
  assert.match(temas, / e /);
});

run("CENÁRIO D: campanha 1 respondente — DTO não expõe quantidades", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      { codigo: "20", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 1 }] },
      { codigo: "21", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 1 }] },
      { codigo: "22", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 1 }] },
      {
        codigo: "23",
        totais: [{ alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 }],
      },
    ])
  );
  const serializado = JSON.stringify(out);
  assert.ok(!serializado.includes("quantidade"));
  assert.ok(!serializado.includes("Sim, poucas vezes"));
  assert.ok(!serializado.includes("33,3"));
});

run("CENÁRIO E: 2 Não + 1 Sim poucas vezes — só requer atenção no bullying", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      { codigo: "20", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      { codigo: "21", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      { codigo: "22", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      {
        codigo: "23",
        totais: [
          { alternativaId: "exp-nao", label: "Não", quantidade: 2 },
          { alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 },
        ],
      },
    ])
  );
  assert.equal(out.indicadores.find((i) => i.codigo === "23")?.labelStatus, "Requer atenção");
  assert.ok(!JSON.stringify(out).includes("1 de 3"));
});

run("CENÁRIO F: contadores COPSOQ independentes dos complementares", () => {
  const rel = relatorioComOfensivos(
    blocoOfensivos([
      { codigo: "20", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      { codigo: "21", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      { codigo: "22", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 3 }] },
      {
        codigo: "23",
        totais: [{ alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 }],
      },
    ]),
    [
      {
        id: "d1",
        nome: "A",
        tipo: "RISCO",
        entraNoCalculo: true,
        media: 1,
        classificacaoId: "situacao_favoravel",
        classificacaoLabel: "Situação Favorável",
        classificacaoInterpretacao: "",
        cor: "#16a34a",
        respondentesValidos: 3,
        descricao: "",
      },
    ]
  );
  const comp = indicadoresComplementaresDeRelatorio(rel);
  assert.equal(comp.statusGeral, "requer_atencao");
  assert.equal(rel.resultado_json.dimensoes.length, 1);
  assert.equal(rel.resultado_json.dimensoes[0]?.classificacaoId, "situacao_favoravel");
});

run("CENÁRIO G: sem respostas válidas → sem dados", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      { codigo: "20", totais: [] },
      { codigo: "21", totais: [] },
      { codigo: "22", totais: [] },
      { codigo: "23", totais: [] },
    ])
  );
  assert.ok(out.indicadores.every((i) => i.status === "sem_dados"));
  assert.equal(out.statusGeral, "sem_dados");
  assert.match(out.textoOrientacaoSecao ?? "", /Não há respostas válidas/i);
  assert.ok(!/não foram identificadas respostas indicativas de exposição/i.test(out.textoOrientacaoSecao ?? ""));
});

run("CENÁRIO H: snapshot histórico com comportamentosOfensivos", () => {
  const rel = relatorioComOfensivos(
    blocoOfensivos([
      { codigo: "23", totais: [{ alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 }] },
      { codigo: "20", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 2 }] },
      { codigo: "21", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 2 }] },
      { codigo: "22", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 2 }] },
    ])
  );
  const out = indicadoresComplementaresDeRelatorio(rel);
  assert.equal(out.disponivel, true);
  assert.equal(out.indicadores.length, 4);
});

run("CENÁRIO I: snapshot sem comportamentosOfensivos → indisponível", () => {
  const rel = relatorioComOfensivos(null);
  (rel.resultado_json as { comportamentosOfensivos?: unknown }).comportamentosOfensivos =
    undefined;
  const out = indicadoresComplementaresDeRelatorio(rel);
  assert.equal(out.disponivel, false);
  assert.equal(out.statusGeral, "indisponivel");
});

run("recomendação preventiva quando requer atenção", () => {
  const exec = gerarConteudoExecutivo(
    relatorioComOfensivos(
      blocoOfensivos([
        { codigo: "23", totais: [{ alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 }] },
        { codigo: "20", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 1 }] },
        { codigo: "21", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 1 }] },
        { codigo: "22", totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: 1 }] },
      ])
    )
  );
  assert.ok(
    exec.recomendacoesGerais.some((r) =>
      /indicadores de comportamentos ofensivos/i.test(r)
    )
  );
  assert.ok(!exec.recomendacoesGerais.some((r) => /30 dias|investigação obrigatória/i.test(r)));
});

console.log("\nTodos os testes de indicadores complementares passaram.");
