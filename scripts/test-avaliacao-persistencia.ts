import assert from "node:assert/strict";
import { buildCopsoqFlow, getPerguntasOrdenadas } from "../lib/copsoq";
import {
  calcularFlowIndexRetomada,
  mapRespostasParaEstadoLocal,
  perguntasObrigatoriasPendentes,
  validarPayloadResposta,
} from "../lib/avaliacao-persistencia";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const perguntas = getPerguntasOrdenadas();
const p1 = perguntas[0]!;
const { items } = buildCopsoqFlow();

run("TESTE 7 bloquear valor fora da escala", () => {
  const r = validarPayloadResposta({
    perguntaId: p1.id,
    alternativaId: "alternativa-fantasma-999",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "alternativa_invalida");
});

run("TESTE 7b aceitar alternativa válida da escala", () => {
  const r = validarPayloadResposta({
    perguntaId: p1.id,
    alternativaId: "freq-sempre",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.alternativaId, "freq-sempre");
    assert.equal(r.valor, 4);
  }
});

run("TESTE 1/2 upsert lógico: única resposta por pergunta no mapa", () => {
  const respostas = [
    { perguntaId: p1.id, alternativaId: "freq-sempre", fontes: [] as string[] },
  ];
  const alterada = [
    {
      perguntaId: p1.id,
      alternativaId: "freq-nunca",
      fontes: [] as string[],
    },
  ];
  const map = mapRespostasParaEstadoLocal(alterada);
  assert.equal(map[p1.id], "freq-nunca");
  assert.equal(perguntasObrigatoriasPendentes(respostas).length, 39);
});

run("TESTE 8 finalizar incompleto bloqueia", () => {
  const pendentes = perguntasObrigatoriasPendentes([
    { perguntaId: p1.id, alternativaId: "freq-sempre", fontes: [] },
  ]);
  assert.ok(pendentes.length > 0);
  assert.ok(pendentes.includes(perguntas[1]!.id));
});

run("TESTE 9 completo: sem pendentes obrigatórias", () => {
  const todas = perguntas.map((p) => ({
    perguntaId: p.id,
    alternativaId: "freq-nunca",
    fontes: [] as string[],
  }));
  // Ajusta alternativas por escala real
  const corretas = perguntas.map((p) => {
    const ok = validarPayloadResposta({
      perguntaId: p.id,
      alternativaId:
        p.tipoEscala === "frequencia"
          ? "freq-nunca"
          : p.tipoEscala === "intensidade"
            ? "int-muito-pouco"
            : p.tipoEscala === "satisfacao"
              ? "sat-muito-insatisfeito"
              : p.tipoEscala === "saude"
                ? "sau-ruim"
                : p.tipoEscala === "exposicao"
                  ? "exp-nao"
                  : "imp-nao",
    });
    assert.equal(ok.ok, true, `escala inválida em ${p.codigo}`);
    return {
      perguntaId: p.id,
      alternativaId: ok.ok ? ok.alternativaId : "",
      fontes: [] as string[],
    };
  });
  assert.equal(perguntasObrigatoriasPendentes(corretas).length, 0);
  assert.equal(todas.length, 40);
});

run("TESTE 3/4 retomada: flowIndex na primeira sem resposta", () => {
  const idx = calcularFlowIndexRetomada(items, [
    { perguntaId: p1.id, alternativaId: "freq-sempre", fontes: [] },
  ]);
  const item = items[idx]!;
  assert.equal(item.type, "pergunta");
  if (item.type === "pergunta") {
    assert.equal(item.pergunta.id, perguntas[1]!.id);
  }
});

run("isolamento: pergunta de outra campanha não existe no instrumento", () => {
  const r = validarPayloadResposta({
    perguntaId: "pergunta-de-outra-campanha",
    alternativaId: "freq-sempre",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "pergunta_invalida");
});

run("1B pontuação invertida na persistência", () => {
  const p1b = perguntas.find((p) => p.codigo === "1B")!;
  const r = validarPayloadResposta({
    perguntaId: p1b.id,
    alternativaId: "freq-sempre",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.valor, 0);
});

console.log("\nTodos os testes de persistência/validação passaram.");
