/** Smoke: etapas derivadas do fluxo Riscos (auto 6 / manual 5). */

import assert from "node:assert/strict";
import { buildLaudosSstProcesso } from "../lib/laudos-sst";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";
import type { RiscosCampanhaRecord } from "../lib/riscos-campanha";
import { RISCOS_CAMPANHA_ORIGEM } from "../lib/riscos-campanha-origem";
import {
  buildRiscosPsicossociaisProcesso,
  isProcessoElegivelRiscosPsicossociais,
  isRiscosEtapaLiberada,
  isRiscosEtapaLiberadaByFluxo,
  RISCOS_PSICOSSOCIAIS_ETAPA_LABELS,
  RISCOS_PSICOSSOCIAIS_ETAPAS,
  RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS,
  RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS,
} from "../lib/riscos-psicossociais";

assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS.length, 6);
assert.equal(RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS, 6);
assert.equal(RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS, 5);
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[0].id, "laudos_sst");
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[0].label, "Laudo SST Automático");
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[0].automatica, true);
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[1].id, "lista_presenca");
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[2].id, "cadastro_colaboradores");
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[3].id, "link_enviado");
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[4].id, "aguardando_respostas");
assert.equal(
  RISCOS_PSICOSSOCIAIS_ETAPA_LABELS.aguardando_respostas,
  "Aguardando respostas"
);
assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[5].id, "finalizado");

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
  possuiPacoteCompletoSst: true,
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
assert.equal(riscosAguardando.progressoLabel, "0 de 6");
assert.equal(riscosAguardando.progressoPercentual, 0);
assert.equal(riscosAguardando.dataEntrada, "2026-08-12T15:00:00Z");
assert.equal(isRiscosEtapaLiberadaByFluxo(riscosAguardando, "laudos_sst"), true);
assert.equal(isRiscosEtapaLiberadaByFluxo(riscosAguardando, "lista_presenca"), false);
assert.equal(
  isRiscosEtapaLiberadaByFluxo(riscosAguardando, "cadastro_colaboradores"),
  false
);
assert.equal(isRiscosEtapaLiberada(riscosAguardando, "laudos_sst"), true);
assert.equal(isRiscosEtapaLiberada(riscosAguardando, "lista_presenca"), false);
assert.equal(
  isRiscosEtapaLiberada(riscosAguardando, "cadastro_colaboradores"),
  false
);

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
assert.equal(riscosLiberado.progressoLabel, "1 de 6");
assert.equal(riscosLiberado.progressoPercentual, 17);
// Conclusão de Laudos NÃO altera o mês/data de entrada em Riscos.
assert.equal(riscosLiberado.dataEntrada, "2026-08-12T15:00:00Z");
assert.equal(isRiscosEtapaLiberadaByFluxo(riscosLiberado, "lista_presenca"), true);
assert.equal(
  isRiscosEtapaLiberadaByFluxo(riscosLiberado, "cadastro_colaboradores"),
  false
);
assert.equal(
  isRiscosEtapaLiberada(riscosLiberado, "cadastro_colaboradores"),
  false
);

const listaTracking = {
  orcamento_id: "o1",
  etapa_atual: "cadastro_empresa" as const,
  etapas_concluidas: 2,
  entrada_em: "2026-08-12T15:00:00Z",
  lista_solicitada: true,
  lista_solicitada_em: "2026-08-10",
  lista_solicitada_email: "cliente@empresa.com.br",
  lista_recebida: true,
  lista_anexo_path: "o1/lista.pdf",
};

const riscosComLista = buildRiscosPsicossociaisProcesso(
  laudosConcluido,
  listaTracking
);
assert.equal(riscosComLista.etapaAtual, "cadastro_colaboradores");
assert.equal(riscosComLista.progressoLabel, "2 de 6");
assert.equal(
  isRiscosEtapaLiberadaByFluxo(riscosComLista, "cadastro_colaboradores"),
  true
);

const campanhaPrep: RiscosCampanhaRecord = {
  id: "c1",
  orcamento_id: "o1",
  cliente_id: null,
  cnpj: "12345678000190",
  empresa_nome: "ACME",
  data_inicio: "2026-08-01",
  data_encerramento: "2026-08-31",
  quantidade_prevista: 2,
  status: "em_preparacao",
  codigo_publico: "ABC123",
  codigo_acesso_exibicao: "XXXX",
  origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
  responsavel: "BRUNA",
  observacoes: null,
  criado_por: null,
  logo_url: null,
  logo_storage_path: null,
  logo_origem: null,
  logo_nome: null,
  logo_tipo: null,
  logo_tamanho: null,
};

const riscosCadastro = buildRiscosPsicossociaisProcesso(
  laudosConcluido,
  listaTracking,
  campanhaPrep,
  {
    participantes: [{ status: "pendente" }],
  }
);
assert.equal(riscosCadastro.etapaAtual, "link_enviado");
assert.equal(riscosCadastro.progressoLabel, "3 de 6");

const campanhaAberta = { ...campanhaPrep, status: "aberta" as const };
const riscosLink = buildRiscosPsicossociaisProcesso(
  laudosConcluido,
  listaTracking,
  campanhaAberta,
  {
    participantes: [{ status: "pendente" }, { status: "iniciado" }],
  }
);
assert.equal(riscosLink.etapaAtual, "aguardando_respostas");
assert.equal(riscosLink.progressoLabel, "4 de 6");
assert.equal(
  RISCOS_PSICOSSOCIAIS_ETAPA_LABELS[riscosLink.etapaAtual],
  "Aguardando respostas"
);

const riscosQuestionario = buildRiscosPsicossociaisProcesso(
  laudosConcluido,
  listaTracking,
  campanhaAberta,
  {
    participantes: [{ status: "respondido" }, { status: "respondido" }],
  }
);
assert.equal(riscosQuestionario.etapaAtual, "finalizado");
assert.equal(riscosQuestionario.progressoLabel, "5 de 6");
assert.equal(riscosQuestionario.status, "em_andamento");

const riscosFinal = buildRiscosPsicossociaisProcesso(
  laudosConcluido,
  listaTracking,
  { ...campanhaAberta, status: "encerrada" },
  {
    participantes: [{ status: "respondido" }, { status: "respondido" }],
    relatorioGerado: true,
  }
);
assert.equal(riscosFinal.etapaAtual, "finalizado");
assert.equal(riscosFinal.progressoLabel, "6 de 6");
assert.equal(riscosFinal.progressoPercentual, 100);
assert.equal(riscosFinal.status, "concluido");

// Encerrada sozinha NÃO finaliza o processo.
const riscosEncerradaSemRelatorio = buildRiscosPsicossociaisProcesso(
  laudosConcluido,
  listaTracking,
  { ...campanhaAberta, status: "encerrada" },
  {
    participantes: [{ status: "respondido" }, { status: "respondido" }],
    relatorioGerado: false,
  }
);
assert.equal(riscosEncerradaSemRelatorio.status, "em_andamento");
assert.equal(riscosEncerradaSemRelatorio.etapaAtual, "finalizado");
assert.equal(riscosEncerradaSemRelatorio.progressoLabel, "5 de 6");

const riscosSemTracking = buildRiscosPsicossociaisProcesso(
  laudosEmAndamento,
  null
);
assert.equal(riscosSemTracking.etapaAtual, "laudos_sst");
assert.equal(riscosSemTracking.dataEntrada, "2026-08-12T15:00:00Z");

console.log("test-riscos-psicossociais: OK");
