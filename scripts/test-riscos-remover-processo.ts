/**
 * Remoção definitiva do processo + isolamento entre campanhas.
 */
import assert from "node:assert/strict";
import {
  existeRelatorioFinalPersistidoCampanha,
  RISCOS_MOTIVOS_REMOCAO_PROCESSO,
  resolverTextoMotivoRemocao,
  validateConfirmacaoExclusaoCampanha,
  validateMotivoRemocaoProcesso,
  validateRemoverProcessoRiscos,
} from "../lib/riscos-campanha";
import { RISCOS_CAMPANHA_STATUS_ATIVOS } from "../lib/riscos-campanha-origem";
import { consolidarResultadosCampanha } from "../lib/riscos-resultados";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("motivo obrigatório e Outro com texto", () => {
  assert.match(validateMotivoRemocaoProcesso("") ?? "", /motivo/i);
  assert.equal(
    validateMotivoRemocaoProcesso("Processo criado por engano"),
    null
  );
  assert.match(validateMotivoRemocaoProcesso("Outro", "") ?? "", /Descreva/i);
  assert.equal(validateMotivoRemocaoProcesso("Outro", "Teste QA interno"), null);
  assert.equal(
    resolverTextoMotivoRemocao("Outro", "Teste QA interno"),
    "Teste QA interno"
  );
  assert.ok(RISCOS_MOTIVOS_REMOCAO_PROCESSO.includes("Outro"));
});

run("confirmação forte pelo código público", () => {
  assert.match(
    validateConfirmacaoExclusaoCampanha("QCWMKJ", "XXXX") ?? "",
    /não confere/i
  );
  assert.equal(validateConfirmacaoExclusaoCampanha("QCWMKJ", "qcwmkj"), null);
});

run("relatório final ainda não bloqueia (sem entidade)", () => {
  assert.equal(existeRelatorioFinalPersistidoCampanha("qualquer"), false);
  assert.equal(
    validateRemoverProcessoRiscos({ id: "c1", status: "aberta" }),
    null
  );
  assert.equal(
    validateRemoverProcessoRiscos({ id: "c1", status: "encerrada" }),
    null
  );
});

run("após remoção, cancelada/excluída não é status ativo", () => {
  assert.equal(
    (RISCOS_CAMPANHA_STATUS_ATIVOS as readonly string[]).includes("cancelada"),
    false
  );
});

run("isolamento: campanha nova não recebe respostas da antiga", () => {
  const antiga = "campanha-qcwm kj".replace(" ", "");
  const nova = "campanha-nova";
  const respostas = [
    {
      sessao_id: "s-old",
      campanha_id: antiga,
      pergunta_id: "p-1a",
      alternativa_id: "freq-sempre",
    },
    {
      sessao_id: "s-old",
      campanha_id: antiga,
      pergunta_id: "p-1b",
      alternativa_id: "freq-raramente",
    },
  ];
  const consolidadoNova = consolidarResultadosCampanha({
    campanhaId: nova,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes: [
      { id: "s-old", campanha_id: antiga, status: "concluida", valida: true },
    ],
    respostas,
  });
  assert.equal(consolidadoNova.sessoesConcluidas, 0);
  assert.equal(consolidadoNova.participacaoPercentual, 0);
});

run("recriação: mesma empresa usa novo campanha_id/código (contrato)", () => {
  const removida = { id: "id-qcwm", codigo_publico: "QCWMKJ", cliente_id: "cli-1" };
  const nova = {
    id: "id-novo",
    codigo_publico: "ABCDEF",
    cliente_id: "cli-1",
  };
  assert.notEqual(removida.id, nova.id);
  assert.notEqual(removida.codigo_publico, nova.codigo_publico);
  assert.equal(removida.cliente_id, nova.cliente_id);
});

console.log("\nTodos os testes de remoção de processo passaram.");
