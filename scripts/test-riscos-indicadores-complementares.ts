/**
 * Indicadores complementares — Comportamentos Ofensivos (relatório/portal).
 */
import assert from "node:assert/strict";
import { gerarConteudoExecutivo } from "../lib/riscos-relatorio-conteudo";
import {
  fraseConclusaoTemasIndicadores,
  fraseQuantidadeParticipantesIndicacao,
  indicadoresComplementaresDeRelatorio,
  listarTemasIndicadoresConclusao,
  MIN_RESPONDENTES_PARA_EXIBIR_QUANTITATIVO_OFENSIVOS,
  montarIndicadoresComplementares,
  politicaPermiteExibirQuantitativoOfensivos,
  quantidadeParticipantesComIndicacao,
  textoClienteSeguroOfensivos,
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
  respondentes = 3,
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
    participantes: respondentes,
    respondentes,
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
        participantes: respondentes,
        respondentes,
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

function bullying(indicacao: number, nao: number) {
  const totais = [{ alternativaId: "exp-nao", label: "Não", quantidade: nao }];
  if (indicacao > 0) {
    totais.push({
      alternativaId: "exp-poucas",
      label: "Sim, poucas vezes",
      quantidade: indicacao,
    });
  }
  return { codigo: "23", totais };
}

function todosNao(codigo: string, n: number) {
  return {
    codigo,
    totais: [{ alternativaId: "exp-nao", label: "Não", quantidade: n }],
  };
}

function textoCliente(indicadores: ReturnType<typeof montarIndicadoresComplementares>) {
  return JSON.stringify(indicadores);
}

run("constante de confidencialidade = 10", () => {
  assert.equal(MIN_RESPONDENTES_PARA_EXIBIR_QUANTITATIVO_OFENSIVOS, 10);
  assert.equal(politicaPermiteExibirQuantitativoOfensivos(9), false);
  assert.equal(politicaPermiteExibirQuantitativoOfensivos(10), true);
});

run("quantidade = participantes com indicação (soma alternativas ≠ Não)", () => {
  assert.equal(
    quantidadeParticipantesComIndicacao([
      { alternativaId: "exp-nao", label: "Não", quantidade: 2 },
      { alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 },
    ]),
    1
  );
  assert.equal(
    quantidadeParticipantesComIndicacao([
      { alternativaId: "exp-nao", label: "Não", quantidade: 17 },
      { alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 2 },
      { alternativaId: "exp-mensalmente", label: "Sim, mensalmente", quantidade: 1 },
    ]),
    3
  );
});

run("frase singular/plural de quantidade", () => {
  assert.equal(
    fraseQuantidadeParticipantesIndicacao(1),
    "1 participante apresentou indicação de exposição."
  );
  assert.equal(
    fraseQuantidadeParticipantesIndicacao(3),
    "3 participantes apresentaram indicação de exposição."
  );
});

run("CENÁRIO A: 3 respondentes, bullying sinalizado — sem quantidade", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      todosNao("20", 3),
      todosNao("21", 3),
      todosNao("22", 3),
      bullying(1, 2),
    ]),
    3
  );
  const b = out.indicadores.find((i) => i.codigo === "23")!;
  assert.equal(b.status, "requer_atencao");
  assert.equal(b.podeExibirQuantidade, false);
  assert.equal(b.quantidadeIndicacao, 1);
  assert.match(b.textoPrincipal, /bullying no ambiente de trabalho nos últimos 12 meses/i);
  assert.ok(!b.textoPrincipal.includes("1 participante"));
  assert.ok(b.textoAvisoConfidencialidade?.includes("confidencialidade"));
  const txt = textoCliente(out);
  assert.ok(!txt.includes("Sim, poucas vezes"));
  assert.ok(!txt.includes("33,3"));
  assert.ok(!txt.includes("1 de 3"));
});

run("CENÁRIO B: 10 respondentes, 1 indicação em bullying", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      todosNao("20", 10),
      todosNao("21", 10),
      todosNao("22", 10),
      bullying(1, 9),
    ]),
    10
  );
  const b = out.indicadores.find((i) => i.codigo === "23")!;
  assert.equal(b.podeExibirQuantidade, true);
  assert.match(b.textoPrincipal, /1 participante apresentou indicação de exposição/i);
  assert.ok(!JSON.stringify(out).includes("Sim, poucas vezes"));
});

run("CENÁRIO C: 20 respondentes, 3 indicações em bullying", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      todosNao("20", 20),
      todosNao("21", 20),
      todosNao("22", 20),
      {
        codigo: "23",
        totais: [
          { alternativaId: "exp-nao", label: "Não", quantidade: 17 },
          { alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 2 },
          { alternativaId: "exp-mensalmente", label: "Sim, mensalmente", quantidade: 1 },
        ],
      },
    ]),
    20
  );
  const b = out.indicadores.find((i) => i.codigo === "23")!;
  assert.match(b.textoPrincipal, /3 participantes apresentaram indicação de exposição/i);
  assert.ok(textoClienteSeguroOfensivos(b.textoPrincipal));
});

run("CENÁRIO D: 50 respondentes, 4 indicações em ameaças", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      todosNao("20", 50),
      {
        codigo: "21",
        totais: [
          { alternativaId: "exp-nao", label: "Não", quantidade: 46 },
          { alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 4 },
        ],
      },
      todosNao("22", 50),
      todosNao("23", 50),
    ]),
    50
  );
  const a = out.indicadores.find((i) => i.codigo === "21")!;
  assert.match(a.textoPrincipal, /4 participantes apresentaram indicação de exposição/i);
});

run("CENÁRIO E: todos Não → sem indicação, sem quantitativo", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      todosNao("20", 5),
      todosNao("21", 5),
      todosNao("22", 5),
      todosNao("23", 5),
    ]),
    5
  );
  assert.equal(out.statusGeral, "sem_indicacao");
  assert.ok(out.indicadores.every((i) => i.status === "sem_indicacao"));
  assert.ok(out.indicadores.every((i) => !i.podeExibirQuantidade));
  assert.ok(out.indicadores.every((i) => i.textoPrincipal.includes("Não foram identificadas")));
});

run("CENÁRIO F: sem respostas válidas → sem dados", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      { codigo: "20", totais: [] },
      { codigo: "21", totais: [] },
      { codigo: "22", totais: [] },
      { codigo: "23", totais: [] },
    ]),
    5
  );
  assert.ok(out.indicadores.every((i) => i.status === "sem_dados"));
  assert.equal(out.statusGeral, "sem_dados");
});

run("CENÁRIO G: 9 respondentes — quantidade suprimida", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([bullying(1, 8), todosNao("20", 9), todosNao("21", 9), todosNao("22", 9)]),
    9
  );
  const b = out.indicadores.find((i) => i.codigo === "23")!;
  assert.equal(b.podeExibirQuantidade, false);
  assert.ok(!b.textoPrincipal.includes("participante"));
});

run("CENÁRIO H: 10 respondentes — quantidade permitida (fronteira)", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([bullying(1, 9), todosNao("20", 10), todosNao("21", 10), todosNao("22", 10)]),
    10
  );
  const b = out.indicadores.find((i) => i.codigo === "23")!;
  assert.equal(b.podeExibirQuantidade, true);
  assert.match(b.textoPrincipal, /1 participante apresentou/i);
});

run("CENÁRIO I: múltiplos indicadores — síntese e conclusão sem quantidades", () => {
  const out = montarIndicadoresComplementares(
    blocoOfensivos([
      todosNao("20", 15),
      {
        codigo: "21",
        totais: [
          { alternativaId: "exp-nao", label: "Não", quantidade: 14 },
          { alternativaId: "exp-poucas", label: "Sim, poucas vezes", quantidade: 1 },
        ],
      },
      todosNao("22", 15),
      bullying(2, 13),
    ]),
    15
  );
  assert.ok(out.sintese);
  assert.equal(out.sintese!.temas.length, 2);
  assert.ok(!/\d+\s+participantes?\s+apresent/i.test(out.sintese!.textoIntro));
  const conclusao = fraseConclusaoTemasIndicadores(out.temasRequerAtencao);
  assert.match(conclusao, /relacionadas a/);
  assert.ok(!conclusao.includes("participante"));
});

run("CENÁRIO J: snapshot histórico sem bloco — seguro", () => {
  const rel = relatorioComOfensivos(null);
  (rel.resultado_json as { comportamentosOfensivos?: unknown }).comportamentosOfensivos =
    undefined;
  const out = indicadoresComplementaresDeRelatorio(rel);
  assert.equal(out.disponivel, false);
  assert.equal(out.statusGeral, "indisponivel");
});

run("conclusão técnica e recomendação — sem frequências", () => {
  const exec = gerarConteudoExecutivo(
    relatorioComOfensivos(
      blocoOfensivos([bullying(1, 2), todosNao("20", 3), todosNao("21", 3), todosNao("22", 3)]),
      3
    )
  );
  assert.ok(exec.conclusaoTecnica.some((p) => /bullying/i.test(p)));
  assert.ok(
    exec.conclusaoTecnica.some((p) =>
      /foram identificadas respostas indicativas/i.test(p)
    )
  );
  assert.ok(!exec.conclusaoTecnica.some((p) => /poucas vezes|33|1 de 3/i.test(p)));
  assert.ok(
    exec.recomendacoesGerais.some((r) =>
      /indicadores de comportamentos ofensivos/i.test(r)
    )
  );
});

run("contadores COPSOQ independentes dos complementares", () => {
  const rel = relatorioComOfensivos(
    blocoOfensivos([bullying(1, 2), todosNao("20", 3), todosNao("21", 3), todosNao("22", 3)]),
    3,
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
  assert.equal(rel.resultado_json.dimensoes[0]?.classificacaoId, "situacao_favoravel");
});

run("listar temas para conclusão", () => {
  const temas = listarTemasIndicadoresConclusao([
    "bullying",
    "ameaças de violência",
  ]);
  assert.match(temas, /bullying/);
  assert.match(temas, / e ameaças de violência/);
});

console.log("\nTodos os testes de indicadores complementares passaram.");
