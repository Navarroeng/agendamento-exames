/** Smoke: regras de conclusão das 6 etapas de Laudos SST. */

import assert from "node:assert/strict";
import { LAUDOS_SST_ETAPAS } from "../lib/laudos-sst";
import {
  contarEtapasConsecutivasConcluidas,
  EMPTY_LAUDOS_WORKFLOW,
  isLaudosEtapaConcluida,
  isLaudosEtapaLiberada,
  isPgrPcmsoLtcatDocumentosProntos,
  proximaEtapaLaudos,
  resolverEtapaAtualLaudos,
  type LaudosSstWorkflow,
} from "../lib/laudos-sst-etapas";

const ordem = LAUDOS_SST_ETAPAS.map((e) => e.id);

function w(partial: Partial<LaudosSstWorkflow>): LaudosSstWorkflow {
  return { ...EMPTY_LAUDOS_WORKFLOW, ...partial };
}

assert.equal(isLaudosEtapaConcluida("epis", w({ epiDisponibiliza: true })), true);
assert.equal(isLaudosEtapaConcluida("epis", w({ epiDisponibiliza: false })), true);
assert.equal(isLaudosEtapaConcluida("epis", w({})), false);

assert.equal(
  isLaudosEtapaConcluida(
    "processo_inicial",
    w({ cadastroRealizado: false, cadastroData: "2026-08-13" })
  ),
  false
);
assert.equal(
  isLaudosEtapaConcluida(
    "processo_inicial",
    w({ cadastroRealizado: true, cadastroData: "2026-08-13" })
  ),
  true
);
assert.equal(
  isLaudosEtapaConcluida("processo_inicial", w({ cadastroRealizado: true })),
  false
);

const cronoEpiNao = w({
  epiDisponibiliza: false,
  cronogramaElaborado: true,
  cronogramaData: "2026-08-13",
});
assert.equal(isLaudosEtapaConcluida("cronograma_acoes", cronoEpiNao), true);

const cronoEpiSimSemPergunta = w({
  epiDisponibiliza: true,
  cronogramaElaborado: true,
  cronogramaData: "2026-08-13",
});
assert.equal(isLaudosEtapaConcluida("cronograma_acoes", cronoEpiSimSemPergunta), false);

const cronoEpiSimOk = w({
  epiDisponibiliza: true,
  cronogramaElaborado: true,
  cronogramaData: "2026-08-13",
  cronogramaEpiRespostas: { itens_considerados: true },
});
assert.equal(isLaudosEtapaConcluida("cronograma_acoes", cronoEpiSimOk), true);

const docs = w({
  pgrRealizado: true,
  pgrData: "2026-01-01",
  pcmsoRealizado: true,
  pcmsoData: "2026-01-02",
  ltcatRealizado: true,
  ltcatData: "2026-01-03",
});
assert.equal(isPgrPcmsoLtcatDocumentosProntos(docs), true);
assert.equal(isLaudosEtapaConcluida("pgr_pcmso_ltcat", docs), false);
assert.equal(
  isLaudosEtapaConcluida("pgr_pcmso_ltcat", { ...docs, enviadoPedro: true }),
  true
);

const fluxo = w({
  epiDisponibiliza: false,
  cadastroRealizado: true,
  cadastroData: "2026-08-13",
});
assert.equal(contarEtapasConsecutivasConcluidas(fluxo, ordem), 2);
assert.equal(resolverEtapaAtualLaudos(fluxo, ordem), "cronograma_acoes");
assert.equal(isLaudosEtapaLiberada("cronograma_acoes", fluxo, ordem), true);
assert.equal(isLaudosEtapaLiberada("pgr_pcmso_ltcat", fluxo, ordem), false);

const regressao = w({
  epiDisponibiliza: true,
  cadastroRealizado: false,
  cadastroData: "2026-08-13",
  cronogramaElaborado: true,
  cronogramaData: "2026-08-13",
  cronogramaEpiRespostas: { itens_considerados: true },
});
assert.equal(contarEtapasConsecutivasConcluidas(regressao, ordem), 1);
assert.equal(isLaudosEtapaLiberada("cronograma_acoes", regressao, ordem), false);
assert.equal(isLaudosEtapaConcluida("cronograma_acoes", regressao), true);

assert.equal(proximaEtapaLaudos("epis", ordem), "processo_inicial");
assert.equal(proximaEtapaLaudos("envio_cliente", ordem), null);

const completo: LaudosSstWorkflow = {
  epiDisponibiliza: false,
  cadastroRealizado: true,
  cadastroData: "2026-08-13",
  cronogramaElaborado: true,
  cronogramaData: "2026-08-13",
  cronogramaEpiRespostas: {},
  pgrRealizado: true,
  pgrData: "2026-08-13",
  pcmsoRealizado: true,
  pcmsoData: "2026-08-13",
  ltcatRealizado: true,
  ltcatData: "2026-08-13",
  enviadoPedro: true,
  enviadoPedroEm: "2026-08-13T12:00:00.000Z",
  aprovacaoPedro: true,
  aprovacaoPedroEm: "2026-08-13T15:00:00.000Z",
  aprovacaoPedroPorNome: "Pedro",
  enviadoCliente: true,
  enviadoClienteEmail: "cliente@empresa.com",
  enviadoClienteData: "2026-08-13",
};
assert.equal(contarEtapasConsecutivasConcluidas(completo, ordem), 6);
assert.equal(resolverEtapaAtualLaudos(completo, ordem), "envio_cliente");

const pgrSemData = w({
  pgrRealizado: true,
  pgrData: null,
  pcmsoRealizado: true,
  pcmsoData: "2026-01-02",
  ltcatRealizado: true,
  ltcatData: "2026-01-03",
  enviadoPedro: true,
});
assert.equal(isLaudosEtapaConcluida("pgr_pcmso_ltcat", pgrSemData), false);

console.log("test-laudos-sst-etapas: OK");
