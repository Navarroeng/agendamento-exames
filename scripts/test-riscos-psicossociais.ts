/** Smoke: entrada simultânea Implantação → Laudos + Riscos; aba automática. */

import assert from "node:assert/strict";
import { buildLaudosSstProcesso } from "../lib/laudos-sst";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";
import {
  buildRiscosPsicossociaisProcesso,
  isProcessoElegivelRiscosPsicossociais,
  isRiscosEtapaLiberada,
  RISCOS_PSICOSSOCIAIS_ETAPAS,
  RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS,
  RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS,
} from "../lib/riscos-psicossociais";

assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS.length, 7);
assert.equal(RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS, 7);
assert.equal(RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS, 6);
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[0].id, "laudos_sst");
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[0].automatica, true);
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[1].id, "lista_presenca");
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[6].id, "enviado_cliente");

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

assert.equal(isProcessoElegivelRiscosPsicossociais(implantacao), true);

const laudosEmAndamento = buildLaudosSstProcesso(implantacao, {
  orcamento_id: "o1",
  etapa_atual: "epis",
  etapas_concluidas: 2,
  status: "em_andamento",
  entrada_em: "2026-08-12T15:00:00Z",
});

const riscosAguardando = buildRiscosPsicossociaisProcesso(laudosEmAndamento, {
  orcamento_id: "o1",
  etapa_atual: "lista_presenca",
  etapas_concluidas: 0,
  entrada_em: "2026-08-12T15:00:00Z",
});

assert.equal(riscosAguardando.etapaAtual, "laudos_sst");
assert.equal(riscosAguardando.laudosSstConcluido, false);
assert.equal(riscosAguardando.etapasConcluidas, 0);
assert.equal(riscosAguardando.progressoLabel, "0 de 7");
assert.equal(riscosAguardando.dataEntrada, "2026-08-12T15:00:00Z");
assert.equal(isRiscosEtapaLiberada(riscosAguardando, "laudos_sst"), true);
assert.equal(isRiscosEtapaLiberada(riscosAguardando, "lista_presenca"), false);
assert.equal(isRiscosEtapaLiberada(riscosAguardando, "cadastro_empresa"), false);

const laudosConcluido = buildLaudosSstProcesso(implantacao, {
  orcamento_id: "o1",
  etapa_atual: "envio_cliente",
  etapas_concluidas: 6,
  status: "concluido",
  entrada_em: "2026-08-12T15:00:00Z",
  concluido_em: "2026-09-20T10:00:00Z",
});
assert.equal(laudosConcluido.status, "concluido");

const riscosLiberado = buildRiscosPsicossociaisProcesso(laudosConcluido, {
  orcamento_id: "o1",
  etapa_atual: "lista_presenca",
  etapas_concluidas: 0,
  entrada_em: "2026-08-12T15:00:00Z",
});

assert.equal(riscosLiberado.laudosSstConcluido, true);
assert.equal(riscosLiberado.etapaAtual, "lista_presenca");
assert.equal(riscosLiberado.etapasConcluidas, 1);
assert.equal(riscosLiberado.progressoLabel, "1 de 7");
// Conclusão de Laudos NÃO altera o mês/data de entrada em Riscos.
assert.equal(riscosLiberado.dataEntrada, "2026-08-12T15:00:00Z");
assert.equal(isRiscosEtapaLiberada(riscosLiberado, "lista_presenca"), true);
assert.equal(isRiscosEtapaLiberada(riscosLiberado, "cadastro_empresa"), false);

const riscosComTracking = buildRiscosPsicossociaisProcesso(laudosConcluido, {
  orcamento_id: "o1",
  etapa_atual: "envio_qr_code",
  etapas_concluidas: 2,
  entrada_em: "2026-08-12T15:00:00Z",
  lista_solicitada: true,
  lista_solicitada_em: "2026-08-10",
  lista_solicitada_email: "cliente@empresa.com.br",
  lista_recebida: true,
  lista_anexo_path: "o1/lista.pdf",
});
assert.equal(riscosComTracking.etapaAtual, "envio_qr_code");
assert.equal(riscosComTracking.progressoLabel, "3 de 7");
assert.equal(isRiscosEtapaLiberada(riscosComTracking, "cadastro_empresa"), true);

const riscosSemTracking = buildRiscosPsicossociaisProcesso(
  laudosEmAndamento,
  null
);
assert.equal(riscosSemTracking.etapaAtual, "laudos_sst");
assert.equal(riscosSemTracking.dataEntrada, "2026-08-12T15:00:00Z");

console.log("test-riscos-psicossociais: OK");
