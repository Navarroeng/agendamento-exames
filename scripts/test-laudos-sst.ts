/** Smoke: elegibilidade e progresso base do módulo Laudos SST. */

import assert from "node:assert/strict";
import {
  buildLaudosSstProcesso,
  filterLaudosSstProcessos,
  isProcessoElegivelLaudosSst,
  LAUDOS_SST_ETAPAS,
  LAUDOS_SST_TOTAL_ETAPAS,
  sortLaudosSstProcessos,
} from "../lib/laudos-sst";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";

assert.equal(LAUDOS_SST_ETAPAS.length, 6);
assert.equal(LAUDOS_SST_TOTAL_ETAPAS, 6);
assert.equal(LAUDOS_SST_ETAPAS[0].id, "epis");
assert.equal(LAUDOS_SST_ETAPAS[5].id, "envio_cliente");

function baseProcesso(
  partial: Partial<ImplantacaoProcesso> & {
    etapaAtual: ImplantacaoProcesso["etapaAtual"];
  }
): ImplantacaoProcesso {
  const { etapaAtual, ...rest } = partial;
  return {
    orcamento: {
      id: "o1",
      numero: "ORC-2026-0001",
      data_proposta: "2026-01-01",
      cliente_id: null,
      cliente_nome: "ACME",
      cliente_cnpj: "12.345.678/0001-90",
      cliente_endereco: null,
      cliente_setor: null,
      contato: null,
      email: null,
      telefone: null,
      responsavel: "BRUNA",
      origem_cliente: "indicacao",
      observacoes: null,
      motivo_cancelamento: null,
      observacao_cancelamento: null,
      cancelado_em: null,
      cancelado_por: null,
      desconto_percentual: 0,
      forma_pagamento: null,
      validade_proposta: null,
      subtotal: 1000,
      valor_total: 1000,
      status: "aprovado",
      assinatura_status: "nao_aplicavel",
      assinatura_token: null,
      aceite_em: null,
      aceite_ip: null,
      aceite_usuario_nome: null,
      link_aceite_expira_em: null,
      created_at: "",
      updated_at: "",
    },
    aprovacao: null,
    contrato: null,
    etapaAtual,
    etapasConcluidas: 0,
    totalEtapas: 8,
    progressoLabel: "0 de 8",
    agendamentoLiberado: true,
    agendamentoLabel: "Liberado",
    dataAprovacao: "2026-06-01T12:00:00Z",
    numeroContrato: "CT-1",
    ativo: false,
    quantidadeContratada: 10,
    agendamentosRealizados: 10,
    examesProgramadosFuturos: 0,
    asosContratuaisEmAberto: 0,
    agendamentosIniciaisDispensados: false,
    concluidoComExamesFuturos: false,
    fluxoImplantacao: "padrao",
    treinamento: null,
    etapasOperacionais: [],
    ...rest,
  } as ImplantacaoProcesso;
}

assert.equal(
  isProcessoElegivelLaudosSst(baseProcesso({ etapaAtual: "concluido" })),
  true
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({ etapaAtual: "treinamento_agendado" })
  ),
  true
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({ etapaAtual: "aguardando_agendamentos" })
  ),
  false
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({
      etapaAtual: "concluido",
      orcamento: {
        ...baseProcesso({ etapaAtual: "concluido" }).orcamento,
        status: "cancelado",
      } as ImplantacaoProcesso["orcamento"],
    })
  ),
  false
);

const built = buildLaudosSstProcesso(
  baseProcesso({ etapaAtual: "concluido" }),
  null
);
assert.equal(built.etapaAtual, "epis");
assert.equal(built.etapasConcluidas, 0);
assert.equal(built.progressoLabel, "0 de 6");
assert.equal(built.status, "em_andamento");
assert.equal(built.dataConclusaoImplantacao, null);

const withTracking = buildLaudosSstProcesso(
  baseProcesso({ etapaAtual: "concluido" }),
  {
    orcamento_id: "o1",
    etapa_atual: "cronograma_acoes",
    etapas_concluidas: 2,
  }
);
assert.equal(withTracking.etapaAtual, "cronograma_acoes");
assert.equal(withTracking.etapasConcluidas, 2);
assert.equal(withTracking.progressoLabel, "2 de 6");
assert.equal(withTracking.status, "em_andamento");

const concluido = buildLaudosSstProcesso(
  baseProcesso({ etapaAtual: "concluido" }),
  {
    orcamento_id: "o1",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 6,
    status: "concluido",
    concluido_em: "2026-08-07T12:00:00Z",
  }
);
assert.equal(concluido.status, "concluido");
assert.equal(concluido.etapasConcluidas, 6);
assert.equal(concluido.progressoLabel, "6 de 6");
assert.equal(concluido.etapaAtual, "envio_cliente");

const workflowProgresso = buildLaudosSstProcesso(
  baseProcesso({ etapaAtual: "concluido" }),
  {
    orcamento_id: "o1",
    etapa_atual: "cronograma_acoes",
    etapas_concluidas: 2,
    epi_disponibiliza: true,
    cadastro_realizado: false,
  }
);
assert.equal(workflowProgresso.etapasConcluidas, 1);
assert.equal(workflowProgresso.etapaAtual, "processo_inicial");
assert.equal(workflowProgresso.progressoLabel, "1 de 6");

const dataCivil = buildLaudosSstProcesso(
  baseProcesso({ etapaAtual: "concluido" }),
  {
    orcamento_id: "o1",
    etapa_atual: "processo_inicial",
    etapas_concluidas: 1,
    epi_disponibiliza: false,
    cadastro_realizado: true,
    cadastro_data: "2026-08-13T03:00:00.000Z",
  }
);
assert.equal(dataCivil.workflow.cadastroData, "2026-08-13");
assert.equal(dataCivil.etapasConcluidas, 2);

const seisDeSeis = buildLaudosSstProcesso(
  baseProcesso({ etapaAtual: "concluido" }),
  {
    orcamento_id: "o1",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 4,
    epi_disponibiliza: false,
    cadastro_realizado: true,
    cadastro_data: "2026-08-13",
    cronograma_elaborado: true,
    cronograma_data: "2026-08-13",
    pgr_realizado: true,
    pgr_data: "2026-08-13",
    pcmso_realizado: true,
    pcmso_data: "2026-08-13",
    ltcat_realizado: true,
    ltcat_data: "2026-08-13",
    enviado_pedro: true,
    aprovacao_pedro: true,
    enviado_cliente: true,
    enviado_cliente_email: "cliente@empresa.com",
    enviado_cliente_data: "2026-08-13",
  }
);
assert.equal(seisDeSeis.status, "concluido");
assert.equal(seisDeSeis.etapasConcluidas, 6);
assert.equal(seisDeSeis.progressoLabel, "6 de 6");

const filtrados = filterLaudosSstProcessos([built], {
  busca: "acme",
  responsavel: "",
});
assert.equal(filtrados.length, 1);

function processoOrdenacao(
  numero: string,
  etapas: number,
  entrada: string
): ReturnType<typeof buildLaudosSstProcesso> {
  const base = baseProcesso({ etapaAtual: "concluido" });
  base.orcamento = { ...base.orcamento, id: numero, numero };
  return buildLaudosSstProcesso(base, {
    orcamento_id: numero,
    etapa_atual: etapas >= 6 ? "envio_cliente" : "epis",
    etapas_concluidas: etapas,
    status: etapas >= 6 ? "concluido" : "em_andamento",
    entrada_em: `${entrada}T12:00:00.000Z`,
  });
}

const ordenados = sortLaudosSstProcessos([
  processoOrdenacao("Empresa C", 2, "2026-08-05"),
  processoOrdenacao("Empresa B", 0, "2026-08-12"),
  processoOrdenacao("Empresa D", 1, "2026-08-10"),
  processoOrdenacao("Empresa A", 0, "2026-08-06"),
  processoOrdenacao("Empresa E", 6, "2026-08-01"),
]);
assert.deepEqual(
  ordenados.map((p) => p.implantacao.orcamento.numero),
  ["Empresa A", "Empresa B", "Empresa D", "Empresa C", "Empresa E"]
);
assert.equal(ordenados[0].etapasConcluidas, 0);
assert.equal(ordenados[1].etapasConcluidas, 0);
assert.equal(ordenados[4].etapasConcluidas, 6);

console.log("test-laudos-sst: OK");
