/** Smoke: Lista de Presença + liberação de Cadastro dos Colaboradores. */

import assert from "node:assert/strict";
import { buildLaudosSstProcesso } from "../lib/laudos-sst";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";
import {
  isListaPresencaEtapaConcluida,
  isSolicitacaoListaConcluida,
  isValidEmailListaPresenca,
  resolverEtapaAtualListaPresenca,
} from "../lib/riscos-lista-presenca";
import {
  buildRiscosProcessoManualCliente,
  buildRiscosPsicossociaisProcesso,
  isRiscosEtapaLiberada,
  isRiscosEtapaLiberadaByFluxo,
  RISCOS_PSICOSSOCIAIS_ETAPA_LABELS,
  RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS,
} from "../lib/riscos-psicossociais";
import { RISCOS_CAMPANHA_ORIGEM } from "../lib/riscos-campanha-origem";
import type { RiscosCampanhaRecord } from "../lib/riscos-campanha";

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

const solicitacaoNovaSemEmail = buildRiscosPsicossociaisProcesso(
  laudosConcluido,
  {
    orcamento_id: "o1",
    etapa_atual: "lista_presenca",
    etapas_concluidas: 0,
    entrada_em: "2026-08-12T15:00:00Z",
    lista_solicitada: true,
    lista_solicitada_em: "2026-08-13",
    lista_solicitada_email: null,
    lista_recebida: false,
  }
);
assert.equal(
  isSolicitacaoListaConcluida(solicitacaoNovaSemEmail.listaPresenca),
  true
);
assert.equal(solicitacaoNovaSemEmail.listaPresencaConcluida, false);

const solicitacaoSemData = buildRiscosPsicossociaisProcesso(laudosConcluido, {
  orcamento_id: "o1",
  etapa_atual: "lista_presenca",
  etapas_concluidas: 0,
  entrada_em: "2026-08-12T15:00:00Z",
  lista_solicitada: true,
  lista_solicitada_em: null,
  lista_solicitada_email: "legado@empresa.com.br",
  lista_recebida: false,
});
assert.equal(
  isSolicitacaoListaConcluida(solicitacaoSemData.listaPresenca),
  false
);
assert.equal(soSolicitacao.etapasConcluidas, 1); // só Laudo SST automático
assert.equal(soSolicitacao.etapaAtual, "lista_presenca_solicitada");
assert.equal(isRiscosEtapaLiberadaByFluxo(soSolicitacao, "lista_presenca"), true);
assert.equal(
  isRiscosEtapaLiberadaByFluxo(soSolicitacao, "cadastro_colaboradores"),
  false
);
assert.equal(isRiscosEtapaLiberada(soSolicitacao, "lista_presenca"), true);
assert.equal(
  isRiscosEtapaLiberada(soSolicitacao, "cadastro_colaboradores"),
  false
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

const completaNova = buildRiscosPsicossociaisProcesso(laudosConcluido, {
  orcamento_id: "o1",
  etapa_atual: "lista_presenca",
  etapas_concluidas: 0,
  entrada_em: "2026-08-12T15:00:00Z",
  lista_solicitada: true,
  lista_solicitada_em: "2026-08-13",
  lista_solicitada_email: null,
  lista_recebida: true,
  lista_anexo_path: "o1/lista.pdf",
  lista_anexo_nome: "lista.pdf",
});
assert.equal(isListaPresencaEtapaConcluida(completaNova.listaPresenca), true);
assert.equal(completaNova.listaPresencaConcluida, true);
assert.equal(
  isRiscosEtapaLiberadaByFluxo(completaNova, "cadastro_colaboradores"),
  true
);
assert.equal(completa.etapasConcluidas, 2);
assert.equal(completa.progressoLabel, `2 de ${RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS}`);
assert.equal(completa.etapaAtual, "abrir_pesquisa");
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
assert.equal(isRiscosEtapaLiberada(semAnexo, "cadastro_colaboradores"), false);

assert.equal(solicitacaoSemData.etapaAtual, "solicitar_lista_presenca");
assert.equal(
  resolverEtapaAtualListaPresenca(solicitacaoSemData.listaPresenca),
  "solicitar_lista_presenca"
);
assert.equal(
  RISCOS_PSICOSSOCIAIS_ETAPA_LABELS[soSolicitacao.etapaAtual],
  "Lista de presença solicitada"
);

const campanhaManual: RiscosCampanhaRecord = {
  id: "camp-manual-lista",
  orcamento_id: null,
  cliente_id: "cli-1",
  cnpj: "12345678000199",
  empresa_nome: "Empresa Manual",
  data_inicio: "2026-08-01",
  data_encerramento: "2026-08-31",
  quantidade_prevista: 10,
  status: "em_preparacao",
  codigo_publico: "MANUAL1",
  codigo_acesso_exibicao: "XXXX",
  origem: RISCOS_CAMPANHA_ORIGEM.manual_cliente,
  responsavel: "AGATHA",
  observacoes: null,
  criado_por: "AGATHA",
  logo_url: null,
  logo_storage_path: null,
  logo_origem: null,
  logo_nome: null,
  logo_tipo: null,
  logo_tamanho: null,
  created_at: "2026-08-11T12:00:00.000Z",
};

const manualSemSolicitacao = buildRiscosProcessoManualCliente({
  campanha: campanhaManual,
  tracking: null,
});
assert.equal(manualSemSolicitacao.etapaAtual, "solicitar_lista_presenca");
assert.equal(
  RISCOS_PSICOSSOCIAIS_ETAPA_LABELS[manualSemSolicitacao.etapaAtual],
  "Solicitar lista de presença"
);

const manualSolicitada = buildRiscosProcessoManualCliente({
  campanha: campanhaManual,
  tracking: {
    orcamento_id: campanhaManual.id,
    etapa_atual: "lista_presenca",
    etapas_concluidas: 0,
    lista_solicitada: true,
    lista_solicitada_em: "2026-08-12",
    lista_recebida: false,
  },
});
assert.equal(manualSolicitada.etapaAtual, "lista_presenca_solicitada");
assert.equal(manualSolicitada.listaPresencaConcluida, false);

console.log("test-riscos-lista-presenca: OK");
