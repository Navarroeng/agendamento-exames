/** Smoke: Lista de Presença + liberação de Cadastro dos Colaboradores. */

import assert from "node:assert/strict";
import { buildLaudosSstProcesso } from "../lib/laudos-sst";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";
import {
  isListaPresencaEtapaConcluida,
  isSolicitacaoListaConcluida,
  isValidEmailListaPresenca,
} from "../lib/riscos-lista-presenca";
import {
  buildRiscosPsicossociaisProcesso,
  isRiscosEtapaLiberada,
  isRiscosEtapaLiberadaByFluxo,
  RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS,
} from "../lib/riscos-psicossociais";

assert.equal(isValidEmailListaPresenca("cliente@empresa.com.br"), true);
assert.equal(isValidEmailListaPresenca("invalido"), false);

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

const laudosConcluido = buildLaudosSstProcesso(implantacao, {
  orcamento_id: "o1",
  etapa_atual: "envio_cliente",
  etapas_concluidas: 6,
  status: "concluido",
  entrada_em: "2026-08-12T15:00:00Z",
  concluido_em: "2026-08-20T10:00:00Z",
});

const soSolicitacao = buildRiscosPsicossociaisProcesso(laudosConcluido, {
  orcamento_id: "o1",
  etapa_atual: "lista_presenca",
  etapas_concluidas: 0,
  entrada_em: "2026-08-12T15:00:00Z",
  lista_solicitada: true,
  lista_solicitada_em: "2026-08-10",
  lista_solicitada_email: "cliente@empresa.com.br",
  lista_recebida: false,
});

assert.equal(isSolicitacaoListaConcluida(soSolicitacao.listaPresenca), true);
assert.equal(soSolicitacao.listaPresencaConcluida, false);
assert.equal(soSolicitacao.etapasConcluidas, 1); // só Laudo SST automático
assert.equal(soSolicitacao.etapaAtual, "lista_presenca");
assert.equal(isRiscosEtapaLiberadaByFluxo(soSolicitacao, "lista_presenca"), true);
assert.equal(
  isRiscosEtapaLiberadaByFluxo(soSolicitacao, "cadastro_colaboradores"),
  false
);
assert.equal(isRiscosEtapaLiberada(soSolicitacao, "lista_presenca"), true);
assert.equal(
  isRiscosEtapaLiberada(soSolicitacao, "cadastro_colaboradores"),
  true
);

const completa = buildRiscosPsicossociaisProcesso(laudosConcluido, {
  orcamento_id: "o1",
  etapa_atual: "lista_presenca",
  etapas_concluidas: 0,
  entrada_em: "2026-08-12T15:00:00Z",
  lista_solicitada: true,
  lista_solicitada_em: "2026-08-10",
  lista_solicitada_email: "cliente@empresa.com.br",
  lista_recebida: true,
  lista_anexo_path: "o1/lista.pdf",
  lista_anexo_nome: "lista.pdf",
});

assert.equal(isListaPresencaEtapaConcluida(completa.listaPresenca), true);
assert.equal(completa.listaPresencaConcluida, true);
assert.equal(completa.etapasConcluidas, 2);
assert.equal(completa.progressoLabel, `2 de ${RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS}`);
assert.equal(completa.etapaAtual, "cadastro_colaboradores");
assert.equal(
  isRiscosEtapaLiberadaByFluxo(completa, "cadastro_colaboradores"),
  true
);
assert.equal(isRiscosEtapaLiberada(completa, "cadastro_colaboradores"), true);

const semAnexo = buildRiscosPsicossociaisProcesso(laudosConcluido, {
  orcamento_id: "o1",
  etapa_atual: "lista_presenca",
  etapas_concluidas: 1,
  entrada_em: "2026-08-12T15:00:00Z",
  lista_solicitada: true,
  lista_solicitada_em: "2026-08-10",
  lista_solicitada_email: "cliente@empresa.com.br",
  lista_recebida: true,
  lista_anexo_path: null,
});
assert.equal(semAnexo.listaPresencaConcluida, false);
assert.equal(
  isRiscosEtapaLiberadaByFluxo(semAnexo, "cadastro_colaboradores"),
  false
);
assert.equal(isRiscosEtapaLiberada(semAnexo, "cadastro_colaboradores"), true);

console.log("test-riscos-lista-presenca: OK");
