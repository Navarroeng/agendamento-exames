/** Smoke: elegibilidade e progresso base do módulo Laudos SST. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildLaudosSstProcesso,
  filterLaudosSstProcessos,
  filterLaudosSstProcessosPorMes,
  grupoOrdenacaoLaudosSst,
  isProcessoElegivelLaudoPontualLaudosSst,
  isProcessoElegivelLaudosSst,
  isProcessoVisivelLaudosSst,
  isVisitaTecnicaEfetivamenteConcluida,
  LAUDOS_SST_ETAPAS,
  LAUDOS_SST_TOTAL_ETAPAS,
  laudosSstEtapaAtualBadgeClass,
  deveCorrigirEntradaInicialLaudosSst,
  payloadInicialLaudosSst,
  resolverEntradaLaudosSst,
  sortLaudosSstProcessos,
} from "../lib/laudos-sst";
import type { ImplantacaoAetRecord } from "../lib/implantacao-aet";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";
import { isProcessoElegivelRiscosPsicossociais } from "../lib/riscos-psicossociais";
import { SERVICO_AET_NOME } from "../lib/servico-aet";
import { SERVICO_INSALUBRIDADE_NOME } from "../lib/servico-insalubridade";
import type { LaudoPontualKind } from "../lib/servico-laudo-pontual";
import { SERVICO_LTCAT_NOME } from "../lib/servico-ltcat";
import { SERVICO_PARECER_TECNICO_NOME } from "../lib/servico-parecer-tecnico";
import { SERVICO_PERICULOSIDADE_NOME } from "../lib/servico-periculosidade";
import { SERVICO_PGR_NOME } from "../lib/servico-pgr";
import { classifyOrcamentoFluxoImplantacao } from "../lib/servico-treinamentos";

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
  isProcessoElegivelLaudosSst(
    baseProcesso({ etapaAtual: "concluido", possuiPacoteCompletoSst: true })
  ),
  true
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({
      etapaAtual: "treinamento_agendado",
      possuiPacoteCompletoSst: true,
    })
  ),
  true
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({
      etapaAtual: "treinamento_agendado",
      possuiPacoteCompletoSst: false,
    })
  ),
  false,
  "somente treinamento sem pacote não entra em Laudos"
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({
      etapaAtual: "concluido",
      possuiPacoteCompletoSst: true,
      fluxoImplantacao: "aet",
    })
  ),
  false,
  "AET exclusivo não entra no fluxo PGR de Laudos SST"
);
assert.equal(
  isProcessoElegivelLaudoPontualLaudosSst(
    baseProcesso({
      etapaAtual: "concluido",
      fluxoImplantacao: "aet",
    })
  ),
  true
);
assert.equal(
  isProcessoElegivelLaudoPontualLaudosSst(
    baseProcesso({
      etapaAtual: "visita_aet",
      fluxoImplantacao: "insalubridade",
    })
  ),
  false
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({
      etapaAtual: "concluido",
      possuiPacoteCompletoSst: true,
      orcamento: {
        ...baseProcesso({ etapaAtual: "concluido" }).orcamento,
        status: "cancelado",
      } as ImplantacaoProcesso["orcamento"],
    })
  ),
  false
);

function aprovacaoVisita(
  salvaEm: string | null,
  necessaria: boolean | null = true
): ImplantacaoProcesso["aprovacao"] {
  return {
    visita_tecnica_necessaria: necessaria,
    visita_tecnica_salva_em: salvaEm,
  } as ImplantacaoProcesso["aprovacao"];
}

const visitaPendente = baseProcesso({
  etapaAtual: "visita",
  possuiPacoteCompletoSst: true,
  aprovacao: aprovacaoVisita(null, null),
});
assert.equal(isVisitaTecnicaEfetivamenteConcluida(visitaPendente), false);
assert.equal(
  isProcessoElegivelLaudosSst(visitaPendente),
  false,
  "visita pendente não libera Laudos SST"
);
assert.equal(isProcessoVisivelLaudosSst(visitaPendente, null), false);

const abaAgendamentosSemSalvar = baseProcesso({
  etapaAtual: "aguardando_agendamentos",
  possuiPacoteCompletoSst: true,
  agendamentosRealizados: 0,
  quantidadeContratada: 10,
  aprovacao: aprovacaoVisita(null, null),
});
assert.equal(
  isProcessoElegivelLaudosSst(abaAgendamentosSemSalvar),
  false,
  "rótulo de Agendamentos sem visita salva não libera"
);

const visitaConcluidaAgendamentosPendentes = baseProcesso({
  etapaAtual: "aguardando_agendamentos",
  possuiPacoteCompletoSst: true,
  agendamentosRealizados: 2,
  quantidadeContratada: 10,
  aprovacao: aprovacaoVisita("2026-09-15T10:00:00Z", false),
});
assert.equal(
  isVisitaTecnicaEfetivamenteConcluida(visitaConcluidaAgendamentosPendentes),
  true
);
assert.equal(
  isProcessoElegivelLaudosSst(visitaConcluidaAgendamentosPendentes),
  true,
  "visita concluída libera com agendamentos ainda pendentes"
);
assert.equal(
  isProcessoVisivelLaudosSst(visitaConcluidaAgendamentosPendentes, null),
  true
);
assert.equal(
  isProcessoElegivelRiscosPsicossociais(visitaConcluidaAgendamentosPendentes),
  false,
  "Riscos não acompanha a liberação antecipada de Laudos"
);

const laudosParalelo = buildLaudosSstProcesso(
  visitaConcluidaAgendamentosPendentes,
  null
);
assert.equal(laudosParalelo.status, "em_andamento");
assert.equal(laudosParalelo.etapaAtual, "epis");
assert.equal(laudosParalelo.etapasConcluidas, 0);
assert.equal(laudosParalelo.implantacao.etapaAtual, "aguardando_agendamentos");
assert.equal(laudosParalelo.workflow.enviadoCliente, null);
assert.equal(laudosParalelo.workflow.pgrRealizado, null);

assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({
      etapaAtual: "aguardando_agendamentos",
      possuiPacoteCompletoSst: false,
      aprovacao: aprovacaoVisita("2026-09-15T10:00:00Z"),
    })
  ),
  false,
  "sem Pacote completo a visita não entra no fluxo PGR"
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({
      etapaAtual: "aguardando_agendamentos",
      possuiPacoteCompletoSst: true,
      fluxoImplantacao: "aet",
      aprovacao: aprovacaoVisita("2026-09-15T10:00:00Z"),
    })
  ),
  false,
  "AET não usa a visita técnica do fluxo padrão"
);
assert.equal(
  isProcessoElegivelLaudoPontualLaudosSst(
    baseProcesso({ etapaAtual: "concluido", fluxoImplantacao: "ltcat" })
  ),
  true,
  "LTCAT continua entrando quando a implantação encerra na visita realizada"
);
assert.equal(
  isProcessoElegivelLaudoPontualLaudosSst(
    baseProcesso({ etapaAtual: "visita_agendada", fluxoImplantacao: "ltcat" })
  ),
  false,
  "LTCAT com visita ainda não realizada não entra em Laudos SST"
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({
      etapaAtual: "aguardando_agendamentos",
      possuiPacoteCompletoSst: true,
      aprovacao: aprovacaoVisita("2026-09-15T10:00:00Z"),
      orcamento: {
        ...baseProcesso({ etapaAtual: "aguardando_agendamentos" }).orcamento,
        status: "cancelado",
      } as ImplantacaoProcesso["orcamento"],
    })
  ),
  false,
  "cancelado com visita salva não entra em Laudos SST"
);
assert.equal(
  isProcessoElegivelLaudosSst(
    baseProcesso({
      etapaAtual: "concluido",
      possuiPacoteCompletoSst: true,
      aprovacao: null,
    })
  ),
  true,
  "implantação concluída antiga continua elegível sem novo salvamento da visita"
);
assert.equal(
  isProcessoVisivelLaudosSst(
    baseProcesso({
      etapaAtual: "visita",
      possuiPacoteCompletoSst: true,
    }),
    {
      orcamento_id: "o1",
      etapa_atual: "processo_inicial",
      etapas_concluidas: 1,
      status: "em_andamento",
    }
  ),
  true,
  "tracking já trabalhado permanece visível"
);

const serviceSrc = readFileSync(
  join(process.cwd(), "services/laudos-sst.service.ts"),
  "utf8"
);
assert.match(serviceSrc, /onConflict:\s*"orcamento_id"/);
assert.match(serviceSrc, /ignoreDuplicates:\s*true/);
assert.match(serviceSrc, /payloadInicialLaudosSst/);
assert.doesNotMatch(serviceSrc, /pgr_realizado:\s*true/);
assert.doesNotMatch(serviceSrc, /enviado_cliente:\s*true/);
assert.doesNotMatch(
  serviceSrc,
  /from\("orcamento_aprovacoes"\)/,
  "listar Laudos não regrava a visita nem a implantação"
);
const libLaudosSrc = readFileSync(
  join(process.cwd(), "lib/laudos-sst.ts"),
  "utf8"
);
assert.match(libLaudosSrc, /visita_tecnica_salva_em/);

const built = buildLaudosSstProcesso(
  baseProcesso({ etapaAtual: "concluido" }),
  null
);
assert.equal(built.etapaAtual, "epis");
assert.equal(built.etapasConcluidas, 0);
assert.equal(built.progressoLabel, "0 de 6");
assert.equal(built.status, "em_andamento");
assert.equal(built.dataConclusaoImplantacao, null);
assert.equal(built.laudoPontualKind, null);
assert.equal(built.etapaAtualLabel, "EPIs");

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
  const etapaAtual =
    etapas >= 6 ? "envio_cliente" : LAUDOS_SST_ETAPAS[etapas].id;
  return buildLaudosSstProcesso(base, {
    orcamento_id: numero,
    etapa_atual: etapaAtual,
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
  ["Empresa C", "Empresa D", "Empresa A", "Empresa B", "Empresa E"]
);
assert.equal(grupoOrdenacaoLaudosSst(ordenados[0]), 1);
assert.equal(grupoOrdenacaoLaudosSst(ordenados[2]), 2);
assert.equal(grupoOrdenacaoLaudosSst(ordenados[4]), 3);
assert.equal(ordenados[0].etapasConcluidas, 2);
assert.equal(ordenados[1].etapasConcluidas, 1);
assert.equal(ordenados[2].etapasConcluidas, 0);
assert.equal(ordenados[4].status, "concluido");

const isotechPrimeiro = sortLaudosSstProcessos([
  processoOrdenacao("EPIs 1", 0, "2026-08-01"),
  processoOrdenacao("ISOTECH", 1, "2026-08-15"),
  processoOrdenacao("LEGRAND", 6, "2026-08-02"),
  processoOrdenacao("EPIs 2", 0, "2026-08-10"),
]);
assert.deepEqual(
  isotechPrimeiro.map((p) => p.implantacao.orcamento.numero),
  ["ISOTECH", "EPIs 1", "EPIs 2", "LEGRAND"]
);

const progressoDesc = sortLaudosSstProcessos([
  processoOrdenacao("Empresa C", 1, "2026-08-01"),
  processoOrdenacao("Empresa A", 4, "2026-08-20"),
  processoOrdenacao("Empresa B", 2, "2026-08-05"),
  processoOrdenacao("Empresa D", 0, "2026-08-03"),
  processoOrdenacao("Empresa E", 6, "2026-08-01"),
]);
assert.deepEqual(
  progressoDesc.map((p) => p.implantacao.orcamento.numero),
  ["Empresa A", "Empresa B", "Empresa C", "Empresa D", "Empresa E"]
);

const empateAndamento = sortLaudosSstProcessos([
  processoOrdenacao("Mais nova", 3, "2026-08-17"),
  processoOrdenacao("Mais antiga", 3, "2026-08-10"),
]);
assert.deepEqual(
  empateAndamento.map((p) => p.implantacao.orcamento.numero),
  ["Mais antiga", "Mais nova"]
);

const riscosSrc = readFileSync(
  join(process.cwd(), "lib/riscos-psicossociais.ts"),
  "utf8"
);
assert.match(riscosSrc, /sortRiscosPsicossociaisProcessosListagem/);
assert.doesNotMatch(riscosSrc, /grupoOrdenacaoLaudosSst/);

const indigo =
  "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-[#eef2ff] text-[#4338ca]";
const azulProcessoInicial =
  "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-[#E8EEFF] text-[#3F51D7]";
const lilasCronograma =
  "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-[#F1EDFF] text-[#6D4AFF]";
const verde =
  "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-brand-green-soft text-brand-green";

assert.equal(
  laudosSstEtapaAtualBadgeClass("processo_inicial", "em_andamento"),
  azulProcessoInicial
);
assert.equal(laudosSstEtapaAtualBadgeClass("epis", "em_andamento"), indigo);
assert.equal(
  laudosSstEtapaAtualBadgeClass("cronograma_acoes", "em_andamento"),
  lilasCronograma
);
assert.equal(
  laudosSstEtapaAtualBadgeClass("pgr_pcmso_ltcat", "em_andamento"),
  indigo
);
assert.equal(
  laudosSstEtapaAtualBadgeClass("autorizacao_pedro", "em_andamento"),
  indigo
);
assert.equal(
  laudosSstEtapaAtualBadgeClass("envio_cliente", "em_andamento"),
  indigo
);
assert.equal(laudosSstEtapaAtualBadgeClass("processo_inicial", "concluido"), verde);
assert.equal(laudosSstEtapaAtualBadgeClass("epis", "concluido"), verde);
assert.equal(
  laudosSstEtapaAtualBadgeClass("cronograma_acoes", "concluido"),
  verde
);

const fonteBadge = readFileSync(join(process.cwd(), "lib/laudos-sst.ts"), "utf8");
assert.match(fonteBadge, /cronograma_acoes[\s\S]*#F1EDFF[\s\S]*#6D4AFF/);
assert.doesNotMatch(
  [
    laudosSstEtapaAtualBadgeClass("epis", "em_andamento"),
    laudosSstEtapaAtualBadgeClass("processo_inicial", "em_andamento"),
    laudosSstEtapaAtualBadgeClass("pgr_pcmso_ltcat", "em_andamento"),
  ].join(" "),
  /#F1EDFF|#6D4AFF/
);

function comOrigem(
  etapaAtual: ImplantacaoProcesso["etapaAtual"],
  patch: Partial<ImplantacaoProcesso["orcamento"]>
): ImplantacaoProcesso["orcamento"] {
  return {
    ...baseProcesso({ etapaAtual }).orcamento,
    ...patch,
  };
}

const gestaoMensalVisitaSalva = baseProcesso({
  etapaAtual: "aguardando_agendamentos",
  possuiPacoteCompletoSst: false,
  possuiGestaoSstMensal: true,
  quantidadeContratada: 1,
  agendamentosRealizados: 0,
  dataAprovacao: "2026-10-15T12:00:00Z",
  aprovacao: {
    visita_tecnica_necessaria: true,
    visita_tecnica_salva_em: "2026-10-20T14:00:00Z",
    updated_at: "2026-11-05T12:00:00Z",
  } as ImplantacaoProcesso["aprovacao"],
  orcamento: comOrigem("aguardando_agendamentos", {
    id: "orc-0080",
    numero: "ORC-2026-0080",
    modalidade: "mensalidade",
    origem_cliente: "google",
  }),
});
assert.equal(
  isProcessoElegivelLaudosSst(gestaoMensalVisitaSalva),
  true,
  "Gestão SST mensal entra após a visita salva, com agendamentos pendentes"
);
assert.equal(
  isProcessoElegivelRiscosPsicossociais(gestaoMensalVisitaSalva),
  false,
  "Gestão SST mensal não libera Riscos só pela visita"
);
assert.equal(
  resolverEntradaLaudosSst(gestaoMensalVisitaSalva, "2026-11-05T12:00:00Z"),
  "2026-10-20T14:00:00Z",
  "competência segue a visita salva, não a data da sincronização"
);

const renovacaoVisitaDispensada = baseProcesso({
  etapaAtual: "aguardando_agendamentos",
  possuiPacoteCompletoSst: false,
  possuiGestaoSstMensal: true,
  quantidadeContratada: 8,
  agendamentosRealizados: 0,
  dataAprovacao: "2026-10-03T12:00:00Z",
  aprovacao: {
    visita_tecnica_necessaria: false,
    visita_tecnica_salva_em: "2026-10-08T15:00:00Z",
    visita_tecnica_data: null,
    visita_tecnica_horario: null,
    visita_tecnica_endereco: null,
    updated_at: "2026-11-05T12:00:00Z",
  } as ImplantacaoProcesso["aprovacao"],
  orcamento: comOrigem("aguardando_agendamentos", {
    id: "orc-0073",
    numero: "ORC-2026-0073",
    modalidade: "mensalidade",
    origem_cliente: "renovacao",
  }),
});
assert.equal(
  isVisitaTecnicaEfetivamenteConcluida(renovacaoVisitaDispensada),
  true,
  "visita dispensada não exige data, horário ou endereço"
);
assert.equal(isProcessoElegivelLaudosSst(renovacaoVisitaDispensada), true);
const payloadRenovacao = payloadInicialLaudosSst(
  renovacaoVisitaDispensada,
  "2026-11-05T12:00:00Z"
);
assert.equal(payloadRenovacao.orcamento_id, "orc-0073");
assert.equal(payloadRenovacao.etapa_atual, "epis");
assert.equal(payloadRenovacao.etapas_concluidas, 0);
assert.equal(payloadRenovacao.status, "em_andamento");
assert.equal(payloadRenovacao.entrada_em, "2026-10-08T15:00:00Z");
assert.equal("pgr_realizado" in payloadRenovacao, false);
assert.equal("enviado_cliente" in payloadRenovacao, false);
assert.equal("pcmso_realizado" in payloadRenovacao, false);
assert.equal("ltcat_realizado" in payloadRenovacao, false);

const renovacaoVisitaReaproveitada = baseProcesso({
  etapaAtual: "concluido",
  possuiPacoteCompletoSst: false,
  possuiGestaoSstMensal: true,
  dataAprovacao: "2026-10-03T12:00:00Z",
  aprovacao: {
    visita_tecnica_necessaria: null,
    visita_tecnica_salva_em: null,
    updated_at: "2026-11-05T12:00:00Z",
  } as ImplantacaoProcesso["aprovacao"],
  orcamento: comOrigem("concluido", {
    id: "orc-0075",
    numero: "ORC-2026-0075",
    modalidade: "mensalidade",
    origem_cliente: "renovacao",
  }),
});
assert.equal(
  isVisitaTecnicaEfetivamenteConcluida(renovacaoVisitaReaproveitada),
  false
);
assert.equal(
  isProcessoElegivelLaudosSst(renovacaoVisitaReaproveitada),
  true,
  "renovação concluída sem novo registro de visita continua elegível"
);
assert.equal(
  resolverEntradaLaudosSst(
    renovacaoVisitaReaproveitada,
    "2026-11-05T12:00:00Z"
  ),
  "2026-10-03T12:00:00Z"
);

const mensalSemServicoLaudos = baseProcesso({
  etapaAtual: "concluido",
  possuiPacoteCompletoSst: false,
  possuiGestaoSstMensal: false,
  orcamento: comOrigem("concluido", {
    id: "orc-sem-laudo",
    numero: "ORC-2026-0099",
    modalidade: "mensalidade",
    origem_cliente: "renovacao",
  }),
});
assert.equal(isProcessoElegivelLaudosSst(mensalSemServicoLaudos), false);
assert.equal(isProcessoVisivelLaudosSst(mensalSemServicoLaudos, null), false);

const gestaoVisitaPendente = baseProcesso({
  etapaAtual: "visita",
  possuiPacoteCompletoSst: false,
  possuiGestaoSstMensal: true,
  aprovacao: {
    visita_tecnica_necessaria: null,
    visita_tecnica_salva_em: null,
  } as ImplantacaoProcesso["aprovacao"],
  orcamento: comOrigem("visita", {
    modalidade: "mensalidade",
    origem_cliente: "renovacao",
  }),
});
assert.equal(isProcessoElegivelLaudosSst(gestaoVisitaPendente), false);

const contratoAnterior = baseProcesso({
  etapaAtual: "concluido",
  possuiGestaoSstMensal: true,
  dataAprovacao: "2025-10-01T12:00:00Z",
  orcamento: comOrigem("concluido", {
    id: "orc-anterior",
    numero: "ORC-2025-0040",
    modalidade: "mensalidade",
  }),
});
const trackingAnterior = {
  orcamento_id: "orc-anterior",
  etapa_atual: "envio_cliente" as const,
  etapas_concluidas: 6,
  status: "concluido" as const,
  entrada_em: "2025-10-01T12:00:00Z",
  pgr_realizado: true,
  enviado_cliente: true,
};
const laudosAnterior = buildLaudosSstProcesso(contratoAnterior, trackingAnterior);
const laudosRenovacao = buildLaudosSstProcesso(renovacaoVisitaDispensada, null);
assert.equal(trackingAnterior.status, "concluido");
assert.equal(trackingAnterior.pgr_realizado, true);
assert.equal(laudosAnterior.implantacao.orcamento.id, "orc-anterior");
assert.equal(laudosAnterior.workflow.pgrRealizado, true);
assert.equal(laudosRenovacao.etapaAtual, "epis");
assert.equal(laudosRenovacao.etapasConcluidas, 0);
assert.equal(laudosRenovacao.workflow.pgrRealizado, null);
assert.equal(laudosRenovacao.workflow.enviadoCliente, null);
assert.equal(laudosRenovacao.tracking, null);
const payloadAnterior = payloadInicialLaudosSst(
  contratoAnterior,
  "2026-11-05T12:00:00Z"
);
assert.notEqual(payloadAnterior.orcamento_id, payloadRenovacao.orcamento_id);
assert.equal("pgr_realizado" in payloadAnterior, false);
assert.deepEqual(
  payloadInicialLaudosSst(renovacaoVisitaDispensada, "2026-11-05T12:00:00Z"),
  payloadRenovacao,
  "sincronizar de novo gera o mesmo payload e não outra linha"
);

const trackingRenovacao = {
  ...payloadRenovacao,
  etapa_atual: "epis" as const,
};
const naCompetencia = buildLaudosSstProcesso(
  renovacaoVisitaDispensada,
  trackingRenovacao
);
const outubro = filterLaudosSstProcessosPorMes(
  [naCompetencia],
  { year: 2026, month: 10 }
);
const novembro = filterLaudosSstProcessosPorMes(
  [naCompetencia],
  { year: 2026, month: 11 }
);
assert.equal(outubro.length, 1);
assert.equal(outubro[0].implantacao.orcamento.numero, "ORC-2026-0073");
assert.equal(novembro.length, 0);
const recarregado = buildLaudosSstProcesso(
  renovacaoVisitaDispensada,
  trackingRenovacao
);
assert.equal(recarregado.dataEntrada, naCompetencia.dataEntrada);
assert.equal(
  filterLaudosSstProcessosPorMes([recarregado], { year: 2026, month: 10 })
    .length,
  1
);
assert.equal(
  deveCorrigirEntradaInicialLaudosSst(renovacaoVisitaDispensada, {
    ...trackingRenovacao,
    entrada_em: "2026-11-05T12:00:00Z",
  }),
  "2026-10-08T15:00:00Z",
  "linha vazia no mês errado volta para a visita salva"
);
assert.equal(
  deveCorrigirEntradaInicialLaudosSst(
    renovacaoVisitaDispensada,
    trackingRenovacao
  ),
  null,
  "reexecutar com a competência certa não altera a linha"
);
assert.equal(
  deveCorrigirEntradaInicialLaudosSst(contratoAnterior, trackingAnterior),
  null,
  "progresso do contrato anterior não é reescrito"
);

const gestaoCancelada = baseProcesso({
  etapaAtual: "concluido",
  possuiGestaoSstMensal: true,
  orcamento: comOrigem("concluido", {
    status: "cancelado",
    modalidade: "mensalidade",
    origem_cliente: "renovacao",
  }),
});
assert.equal(isProcessoElegivelLaudosSst(gestaoCancelada), false);

const laudosPontuais: Array<[LaudoPontualKind, string]> = [
  ["aet", SERVICO_AET_NOME],
  ["insalubridade", SERVICO_INSALUBRIDADE_NOME],
  ["ltcat", SERVICO_LTCAT_NOME],
  ["parecer_tecnico", SERVICO_PARECER_TECNICO_NOME],
  ["periculosidade", SERVICO_PERICULOSIDADE_NOME],
  ["pgr", SERVICO_PGR_NOME],
];

for (const [fluxo, nome] of laudosPontuais) {
  const catalogoId = `catalogo-${fluxo}`;
  assert.equal(
    classifyOrcamentoFluxoImplantacao(
      [{ servico_id: catalogoId, servico_nome: nome }],
      "catalogo-treinamentos",
      fluxo === "aet" ? catalogoId : "outro-aet",
      fluxo === "insalubridade" ? catalogoId : "outro-insalubridade",
      fluxo === "ltcat" ? catalogoId : "outro-ltcat",
      fluxo === "parecer_tecnico" ? catalogoId : "outro-parecer",
      fluxo === "periculosidade" ? catalogoId : "outro-periculosidade",
      fluxo === "pgr" ? catalogoId : "outro-pgr"
    ),
    fluxo,
    nome
  );
  assert.equal(
    classifyOrcamentoFluxoImplantacao(
      [{ servico_id: "id-de-outro-servico", servico_nome: nome }],
      "catalogo-treinamentos",
      fluxo === "aet" ? catalogoId : "outro-aet",
      fluxo === "insalubridade" ? catalogoId : "outro-insalubridade",
      fluxo === "ltcat" ? catalogoId : "outro-ltcat",
      fluxo === "parecer_tecnico" ? catalogoId : "outro-parecer",
      fluxo === "periculosidade" ? catalogoId : "outro-periculosidade",
      fluxo === "pgr" ? catalogoId : "outro-pgr"
    ),
    "padrao",
    `${nome} não muda de fluxo só pelo nome quando o id gravado é outro serviço`
  );

  const aet = {
    visita_status: "realizada",
    visita_data: "2026-10-29",
    visita_realizada_em: "2026-11-05T13:09:00.000Z",
    elaboracao_status: "aguardando",
    laudo_path: null,
    enviado_cliente: false,
    enviado_em: null,
  } as ImplantacaoAetRecord;
  const pontual = baseProcesso({
    etapaAtual: "concluido",
    fluxoImplantacao: fluxo,
    possuiPacoteCompletoSst: false,
    possuiGestaoSstMensal: false,
    totalEtapas: 5,
    etapasConcluidas: 5,
    progressoLabel: "5 de 5",
    dataAprovacao: "2026-10-29T18:00:00.000Z",
    aet,
    orcamento: comOrigem("concluido", {
      id: `orc-0084-${fluxo}`,
      numero: "ORC-2026-0084",
      cliente_nome: "DROGARIA NOVA GERACAO",
      cliente_cnpj: "51.809.436/0001-67",
      modalidade: "pontual",
    }),
    aprovacao: {
      orcamento_aprovacao_itens: [
        { servico_id: "id-gravado-antigo", servico_nome: nome },
      ],
    } as ImplantacaoProcesso["aprovacao"],
  });
  assert.equal(isProcessoElegivelLaudoPontualLaudosSst(pontual), true, nome);
  assert.equal(isProcessoElegivelLaudosSst(pontual), false, nome);
  assert.equal(isProcessoVisivelLaudosSst(pontual, null), true, nome);
  const laudo = buildLaudosSstProcesso(pontual, null);
  assert.equal(laudo.laudoPontualKind, fluxo, nome);
  assert.equal(laudo.tracking, null, nome);
  assert.equal(laudo.status, "em_andamento", nome);
  assert.equal(laudo.etapasConcluidas, 1, nome);
  assert.equal(laudo.dataEntrada, "2026-10-29", nome);
  assert.equal(
    filterLaudosSstProcessosPorMes([laudo], { year: 2026, month: 10 }).length,
    1,
    nome
  );
  assert.equal(
    filterLaudosSstProcessosPorMes([laudo], { year: 2026, month: 11 }).length,
    0,
    nome
  );
  const recarregado = buildLaudosSstProcesso(pontual, null);
  assert.equal(recarregado.dataEntrada, laudo.dataEntrada, nome);
  assert.equal(recarregado.laudoPontualKind, fluxo, nome);
}

assert.equal(
  classifyOrcamentoFluxoImplantacao(
    [{ servico_id: "outro", servico_nome: "PGR" }],
    null,
    null,
    null,
    null,
    null,
    null,
    "catalogo-pgr-longo"
  ),
  "padrao",
  "o nome curto PGR não vira laudo pontual"
);

const visitaSemRelogio = baseProcesso({
  etapaAtual: "concluido",
  fluxoImplantacao: "parecer_tecnico",
  dataAprovacao: "2026-10-29T18:00:00.000Z",
  aet: {
    visita_status: "realizada",
    visita_data: "2026-10-29",
    visita_realizada_em: "",
    elaboracao_status: "aguardando",
    enviado_cliente: false,
  } as ImplantacaoAetRecord,
});
assert.equal(
  buildLaudosSstProcesso(visitaSemRelogio, null).dataEntrada,
  "2026-10-29",
  "relógio vazio não esconde o laudo nem o joga para o mês da correção"
);

const paginaLaudos = readFileSync(
  join(process.cwd(), "components/laudos-sst/LaudosSstPage.tsx"),
  "utf8"
);
const tabelaLaudos = readFileSync(
  join(process.cwd(), "components/laudos-sst/LaudosSstTable.tsx"),
  "utf8"
);
assert.match(paginaLaudos, /useOrcamentoProcessoModal/);
assert.match(paginaLaudos, /openProcesso\(orcamentoId,\s*"financeiro"\)/);
assert.match(paginaLaudos, /ancorarAba="financeiro"/);
assert.match(paginaLaudos, /refresh\(\{\s*silent:\s*true\s*\}\)/);
assert.match(tabelaLaudos, /Abrir financeiro do orçamento/);
assert.match(tabelaLaudos, /if \(!id\)/);
assert.doesNotMatch(paginaLaudos, /\/orcamentos\?abrir=/);

console.log("test-laudos-sst: OK");
