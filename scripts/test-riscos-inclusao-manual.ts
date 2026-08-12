/**
 * Testes: inclusão manual em Riscos Psicossociais (origem manual_cliente).
 */
import assert from "node:assert/strict";
import {
  exigeLaudosSstPorOrigem,
  isOrigemManualCliente,
  MSG_CAMPANHA_ATIVA_CLIENTE,
  RISCOS_CAMPANHA_ORIGEM,
} from "../lib/riscos-campanha-origem";
import {
  CONTRATO_VIGENTE_RISCOS_ERROR_MESSAGE,
  clienteTemContratoVigente,
} from "../lib/cliente-contrato-vigencia";
import {
  validateRiscosCampanhaManualCreateInput,
  type RiscosCampanhaRecord,
} from "../lib/riscos-campanha";
import {
  buildRiscosProcessoManualCliente,
  buildRiscosPsicossociaisProcesso,
  getEtapasRiscosPorOrigem,
  getTotalEtapasRiscosPorOrigem,
  isRiscosEtapaLiberadaByFluxo,
  RISCOS_PSICOSSOCIAIS_ETAPAS,
  type OrcamentoRiscosPsicossociaisRecord,
} from "../lib/riscos-psicossociais";
import type { LaudosSstProcesso } from "../lib/laudos-sst";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";

function run(name: string, fn: () => void) {
  fn();
  console.log("OK ", name);
}

const campanhaManual: RiscosCampanhaRecord = {
  id: "camp-manual-1",
  orcamento_id: null,
  cliente_id: "cli-1",
  cnpj: "12345678000199",
  empresa_nome: "Empresa Antiga LTDA",
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

run("TESTE 1 validação criação manual", () => {
  assert.equal(
    validateRiscosCampanhaManualCreateInput({
      clienteId: "cli-1",
      cnpj: "12.345.678/0001-99",
      empresaNome: "Empresa",
      responsavel: "AGATHA",
      dataInicioIso: "2026-08-01",
      dataEncerramentoIso: "2026-08-31",
    }),
    null
  );
  assert.ok(
    validateRiscosCampanhaManualCreateInput({
      clienteId: "",
      cnpj: "123",
      empresaNome: "Empresa",
      responsavel: "AGATHA",
      dataInicioIso: "2026-08-01",
      dataEncerramentoIso: "2026-08-31",
    })
  );
  assert.equal(
    validateRiscosCampanhaManualCreateInput({
      clienteId: "cli-1",
      cnpj: "12345678000199",
      empresaNome: "Empresa",
      responsavel: "",
      dataInicioIso: "2026-08-01",
      dataEncerramentoIso: "2026-08-31",
    }),
    "Selecione o responsável interno."
  );
});

run("TESTE 2/3/5 processo manual sem Laudos SST no total", () => {
  const p = buildRiscosProcessoManualCliente({
    campanha: campanhaManual,
    tracking: null,
  });
  assert.equal(p.origem, "manual_cliente");
  assert.equal(p.exigeLaudosSst, false);
  assert.equal(p.totalEtapas, 5);
  assert.equal(getTotalEtapasRiscosPorOrigem(p.origem), 5);
  assert.equal(getEtapasRiscosPorOrigem(p.origem).some((e) => e.id === "laudos_sst"), false);
  assert.equal(p.campanha?.orcamento_id, null);
  assert.equal(p.implantacao.numeroContrato, null);
  assert.equal(p.etapaAtual, "lista_presenca");
  assert.ok(!p.progressoLabel.includes("de 6"));
  assert.ok(p.progressoLabel.includes("de 5"));
});

run("TESTE 4 Laudos não bloqueia fluxo manual", () => {
  const p = buildRiscosProcessoManualCliente({
    campanha: campanhaManual,
    tracking: null,
  });
  assert.equal(isRiscosEtapaLiberadaByFluxo(p, "lista_presenca"), true);
  assert.equal(isRiscosEtapaLiberadaByFluxo(p, "cadastro_colaboradores"), false);
  // Com lista concluída, avança sem Laudos.
  const tracking: OrcamentoRiscosPsicossociaisRecord = {
    orcamento_id: campanhaManual.id,
    etapa_atual: "cadastro_empresa",
    etapas_concluidas: 1,
    status: "em_andamento",
    lista_solicitada: true,
    lista_solicitada_em: "2026-08-01",
    lista_solicitada_email: "a@b.com",
    lista_recebida: true,
    lista_anexo_path: "x/y.pdf",
    lista_anexo_nome: "y.pdf",
    lista_anexo_tipo: "application/pdf",
    lista_anexo_tamanho: 10,
  };
  const comLista = buildRiscosProcessoManualCliente({
    campanha: campanhaManual,
    tracking,
  });
  assert.equal(isRiscosEtapaLiberadaByFluxo(comLista, "cadastro_colaboradores"), true);
  assert.equal(comLista.etapaAtual, "cadastro_colaboradores");
  assert.equal(comLista.progressoLabel, "1 de 5");
});

run("TESTE 8 fluxo normal ainda tem 6 etapas e Laudos", () => {
  assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS.length, 6);
  assert.equal(exigeLaudosSstPorOrigem("orcamento"), true);
  assert.equal(isOrigemManualCliente("orcamento"), false);

  const implantacao = {
    orcamento: {
      id: "orc-1",
      numero: "ORC-1",
      cliente_nome: "Cliente Fluxo",
      cliente_cnpj: "12345678000199",
      responsavel: "AGATHA",
      cliente_id: "cli",
      data_proposta: "2026-01-01",
      cliente_endereco: null,
      cliente_setor: null,
      contato: null,
      email: null,
      telefone: null,
      origem_cliente: null,
      observacoes: null,
      motivo_cancelamento: null,
      observacao_cancelamento: null,
      cancelado_em: null,
      cancelado_por: null,
      desconto_percentual: 0,
      forma_pagamento: null,
      validade_proposta: null,
      subtotal: 0,
      valor_total: 0,
      status: "aprovado",
      assinatura_status: "nao_aplicavel",
      assinatura_token: null,
      aceite_em: null,
      aceite_ip: null,
      aceite_usuario_nome: null,
      link_aceite_expira_em: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    aprovacao: null,
    contrato: null,
    etapaAtual: "concluido",
    etapasConcluidas: 0,
    totalEtapas: 0,
    progressoLabel: "—",
    agendamentoLiberado: false,
    agendamentoLabel: "Bloqueado",
    dataAprovacao: null,
    numeroContrato: "C-1",
    ativo: true,
    quantidadeContratada: 10,
    agendamentosRealizados: 0,
    examesProgramadosFuturos: 0,
    asosContratuaisEmAberto: 0,
    agendamentosIniciaisDispensados: false,
    concluidoComExamesFuturos: false,
    fluxoImplantacao: "padrao",
    treinamento: null,
    etapasOperacionais: [],
  } as ImplantacaoProcesso;

  const laudos: LaudosSstProcesso = {
    implantacao,
    etapaAtual: "epis",
    etapasConcluidas: 0,
    totalEtapas: 6,
    progressoLabel: "0 de 6",
    status: "em_andamento",
    dataEntrada: "2026-01-01",
    concluidoEm: null,
    dataConclusaoImplantacao: null,
  };

  const normal = buildRiscosPsicossociaisProcesso(laudos, null, null);
  assert.equal(normal.exigeLaudosSst, true);
  assert.equal(normal.totalEtapas, 6);
  assert.equal(normal.implantacao.numeroContrato, "C-1");
});

run("TESTE 9 mensagem de duplicidade centralizada", () => {
  assert.ok(MSG_CAMPANHA_ATIVA_CLIENTE.includes("Já existe"));
});

run("TESTE 10 manual sem contrato undefined", () => {
  const p = buildRiscosProcessoManualCliente({
    campanha: campanhaManual,
    tracking: null,
  });
  assert.equal(p.implantacao.numeroContrato, null);
  assert.equal(p.implantacao.orcamento.numero, "");
  assert.ok(p.implantacao.orcamento.cliente_nome);
});

run("TESTE 11 contrato vigente é pré-requisito da inclusão manual", () => {
  const vigente = {
    id: "c1",
    status: "ativo" as const,
    data_inicio: "2026-01-01",
    data_fim: "2026-12-31",
    orcamento_id: null as string | null,
    boleto_pago: false,
    liberado_para_agendamento: true,
  };
  assert.equal(clienteTemContratoVigente([vigente], "2026-08-11"), true);
  assert.equal(clienteTemContratoVigente([], "2026-08-11"), false);
  assert.equal(
    clienteTemContratoVigente(
      [{ ...vigente, status: "encerrado" }],
      "2026-08-11"
    ),
    false
  );
  assert.ok(CONTRATO_VIGENTE_RISCOS_ERROR_MESSAGE.includes("contrato vigente"));
});

console.log("\nTodos os testes de inclusão manual passaram.");
