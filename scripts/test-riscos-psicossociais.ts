/** Smoke: transição Laudos SST concluído → Riscos Psicossociais. */

import assert from "node:assert/strict";
import { buildLaudosSstProcesso } from "../lib/laudos-sst";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";
import {
  buildRiscosPsicossociaisProcesso,
  isProcessoElegivelRiscosPsicossociais,
  RISCOS_PSICOSSOCIAIS_ETAPAS,
  RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS,
} from "../lib/riscos-psicossociais";

assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS.length, 6);
assert.equal(RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS, 6);
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[0].id, "lista_presenca");
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[5].id, "enviado_cliente");

const implantacao = {
  orcamento: {
    id: "o1",
    numero: "ORC-2026-0001",
    cliente_nome: "ACME",
    cliente_cnpj: "12.345.678/0001-90",
    responsavel: "BRUNA",
    status: "aprovado",
  },
  etapaAtual: "concluido",
  dataAprovacao: "2026-06-01T12:00:00Z",
  numeroContrato: "CT-1",
} as ImplantacaoProcesso;

const laudosEmAndamento = buildLaudosSstProcesso(implantacao, {
  orcamento_id: "o1",
  etapa_atual: "epis",
  etapas_concluidas: 2,
  status: "em_andamento",
});
assert.equal(
  isProcessoElegivelRiscosPsicossociais(laudosEmAndamento, {
    orcamento_id: "o1",
    etapa_atual: "epis",
    etapas_concluidas: 2,
    status: "em_andamento",
  }),
  false
);

const laudosConcluido = buildLaudosSstProcesso(implantacao, {
  orcamento_id: "o1",
  etapa_atual: "envio_cliente",
  etapas_concluidas: 6,
  status: "concluido",
  concluido_em: "2026-08-07T10:00:00Z",
});
assert.equal(laudosConcluido.status, "concluido");
assert.equal(
  isProcessoElegivelRiscosPsicossociais(laudosConcluido, {
    orcamento_id: "o1",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 6,
    status: "concluido",
  }),
  true
);

const riscos = buildRiscosPsicossociaisProcesso(laudosConcluido, null);
assert.equal(riscos.etapaAtual, "lista_presenca");
assert.equal(riscos.etapasConcluidas, 0);
assert.equal(riscos.progressoLabel, "0 de 6");
assert.equal(riscos.status, "em_andamento");
assert.equal(riscos.implantacao.orcamento.id, "o1");
assert.equal(riscos.dataEntrada, "2026-08-07T10:00:00Z");

const riscosComTracking = buildRiscosPsicossociaisProcesso(laudosConcluido, {
  orcamento_id: "o1",
  etapa_atual: "envio_qr_code",
  etapas_concluidas: 2,
  entrada_em: "2026-08-07T10:00:00Z",
});
assert.equal(riscosComTracking.etapaAtual, "envio_qr_code");
assert.equal(riscosComTracking.progressoLabel, "2 de 6");

console.log("test-riscos-psicossociais: OK");
