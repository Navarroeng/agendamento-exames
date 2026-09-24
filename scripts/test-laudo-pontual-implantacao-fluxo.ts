/**
 * Laudos pontuais exclusivos (AET / Insalubridade):
 * Implantação termina na visita realizada; elaboração segue em Laudos SST;
 * nunca entram em Riscos Psicossociais.
 *
 * Executar: npx tsx scripts/test-laudo-pontual-implantacao-fluxo.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildImplantacaoProcesso,
  IMPLANTACAO_LAUDO_PONTUAL_TOTAL_ETAPAS,
  implantacaoEtapaToModalTab,
  labelImplantacaoEtapa,
  resolveImplantacaoEtapaAtual,
} from "../lib/implantacao-clientes";
import {
  validateAetElaboracaoPayload,
  validateAetEnvioPayload,
  type ImplantacaoAetRecord,
} from "../lib/implantacao-aet";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoRecord } from "../lib/orcamento-types";
import {
  buildLaudosPontualEtapas,
  buildLaudosSstProcesso,
  etapasProgressoLaudosSst,
  isLaudosPontualEtapaConcluida,
  isLaudosPontualEtapaLiberada,
  isProcessoElegivelLaudoPontualLaudosSst,
  isProcessoElegivelLaudosSst,
  isProcessoVisivelLaudosSst,
  labelEtapaAtualLaudosSst,
  resolveLaudosPontualTabInicial,
} from "../lib/laudos-sst";
import {
  isProcessoElegivelRiscosPsicossociais,
  isProcessoElegivelRiscosPsicossociaisPorLaudos,
  isProcessoVisivelRiscosAutomatico,
} from "../lib/riscos-psicossociais";
import { SERVICO_AET_NOME } from "../lib/servico-aet";
import { SERVICO_INSALUBRIDADE_NOME } from "../lib/servico-insalubridade";
import {
  assertPodeEditarElaboracaoEnvioLaudoPontual,
  copyLaudoPontual,
  resolveLaudoPontualKind,
  resolveLaudoPontualKindFromImplantacao,
  fluxoToLaudoPontualKind,
  LAUDO_PONTUAL_ELABORACAO_ENVIO_SOMENTE_LAUDOS_SST_MSG,
} from "../lib/servico-laudo-pontual";
import {
  buildOrcamentoEtapas,
  isOrcamentoEtapaLiberada,
  sanitizeOrcamentoEtapaTab,
} from "../lib/orcamento-etapas";
import { labelStatusServicoPontual } from "../lib/servicos-pontuais";

function aetRow(
  partial: Partial<ImplantacaoAetRecord> = {}
): ImplantacaoAetRecord {
  return {
    id: "aet1",
    orcamento_id: "o1",
    aprovacao_id: "ap1",
    documentos_conferidos: false,
    documentos_conferidos_em: null,
    documentos_conferidos_por: null,
    visita_status: "aguardando_agendamento",
    visita_data: null,
    visita_horario: null,
    visita_responsavel: null,
    visita_observacao: null,
    visita_realizada_em: null,
    elaboracao_status: "aguardando",
    elaboracao_observacao: null,
    elaboracao_concluida_em: null,
    laudo_path: null,
    laudo_nome: null,
    laudo_tipo: null,
    laudo_tamanho: null,
    enviado_cliente: false,
    enviado_em: null,
    envio_observacao: null,
    ...partial,
  };
}

function aprovacao(
  servicoNome: string,
  partial: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "ap1",
    orcamento_id: "o1",
    quantidade_colaboradores: 0,
    valor_final: 2500,
    condicao_pagamento: "2x",
    quantidade_parcelas: 2,
    valor_parcela: 1250,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "AGATHA",
    aprovado_em: "2026-09-17T12:00:00Z",
    contrato_enviado: false,
    contrato_enviado_em: null,
    contrato_assinado: true,
    contrato_assinado_em: "2026-09-17",
    contrato_salvo_em: "2026-09-17T12:00:00Z",
    observacao_contrato: null,
    boleto_vencimento: null,
    boleto_pago: true,
    boleto_pago_em: "2026-09-18",
    comprovante_path: null,
    comprovante_nome: null,
    comprovante_tipo: null,
    comprovante_tamanho: null,
    observacao_pagamento: null,
    created_at: "",
    updated_at: "",
    orcamento_aprovacao_itens: [
      {
        id: "ai1",
        aprovacao_id: "ap1",
        servico_id: servicoNome === SERVICO_AET_NOME ? "aet-1" : "insal-1",
        servico_nome: servicoNome,
        quantidade: 1,
        valor_unitario: 2500,
        valor_total: 2500,
        ordem: 0,
      },
    ],
    ...partial,
  };
}

function orcamento(partial: Partial<OrcamentoRecord> = {}): OrcamentoRecord {
  return {
    id: "o1",
    numero: "ORC-2026-0099",
    data_proposta: "2026-09-10",
    cliente_id: "c1",
    cliente_nome: "EMPRESA TESTE",
    cliente_cnpj: "123",
    cliente_endereco: null,
    cliente_setor: null,
    contato: null,
    email: null,
    telefone: null,
    origem_cliente: "indicacao",
    observacoes: null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: null,
    validade_proposta: null,
    subtotal: 2500,
    valor_total: 2500,
    status: "aprovado",
    assinatura_status: "nao_aplicavel",
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: "",
    updated_at: "",
    responsavel: "AGATHA",
    ...partial,
  } as OrcamentoRecord;
}

assert.equal(IMPLANTACAO_LAUDO_PONTUAL_TOTAL_ETAPAS, 5);
assert.equal(labelImplantacaoEtapa("elaboracao", "aet"), "AET em elaboração");
assert.equal(
  labelImplantacaoEtapa("elaboracao", "insalubridade"),
  "Insalub. em elaboração"
);
assert.notEqual(
  labelImplantacaoEtapa("elaboracao", "insalubridade"),
  "AET em elaboração"
);
assert.equal(labelImplantacaoEtapa("concluido", "aet"), "Concluído");
assert.equal(labelImplantacaoEtapa("concluido", "insalubridade"), "Concluído");

assert.equal(
  resolveLaudoPontualKind([
    { servico_id: "aet-1", servico_nome: SERVICO_AET_NOME },
  ]),
  "aet"
);
assert.equal(
  resolveLaudoPontualKind([
    { servico_id: "insal-1", servico_nome: SERVICO_INSALUBRIDADE_NOME },
  ]),
  "insalubridade"
);
assert.equal(fluxoToLaudoPontualKind("aet"), "aet");
assert.equal(fluxoToLaudoPontualKind("insalubridade"), "insalubridade");
assert.equal(fluxoToLaudoPontualKind("padrao"), null);

const visitaAguardando = aetRow();
const visitaAgendada = aetRow({
  visita_status: "agendada",
  visita_data: "2026-09-22",
  visita_horario: "09:00",
});
const visitaRealizada = aetRow({
  visita_status: "realizada",
  visita_data: "2026-09-22",
  visita_horario: "09:00",
  visita_responsavel: "Navarro",
  visita_observacao: "Acesso pela portaria 2",
  visita_realizada_em: "2026-09-22T14:00:00Z",
  elaboracao_status: "em_elaboracao",
});
const elaboracaoConcluida = aetRow({
  visita_status: "realizada",
  visita_data: "2026-09-22",
  visita_horario: "09:00",
  visita_responsavel: "Navarro",
  visita_observacao: "Acesso pela portaria 2",
  visita_realizada_em: "2026-09-22T14:00:00Z",
  elaboracao_status: "concluido",
  laudo_path: "ap1/laudo.pdf",
  laudo_nome: "Laudo.pdf",
});
const laudoFinalizado = aetRow({
  visita_status: "realizada",
  visita_data: "2026-09-22",
  visita_realizada_em: "2026-09-22T14:00:00Z",
  elaboracao_status: "concluido",
  laudo_path: "ap1/laudo.pdf",
  laudo_nome: "Laudo.pdf",
  enviado_cliente: true,
  enviado_em: "2026-09-24",
});

const apAet = aprovacao(SERVICO_AET_NOME);
const apInsal = aprovacao(SERVICO_INSALUBRIDADE_NOME);

// 1. AET antes da visita → ainda em Implantação
const aetAntes = buildImplantacaoProcesso({
  orcamento: orcamento({ numero: "ORC-2026-0063", cliente_nome: "ALUMINIO FIRENZE" }),
  aprovacao: apAet,
  contrato: null,
  fluxoImplantacao: "aet",
  aet: visitaAguardando,
});
assert.equal(aetAntes.etapaAtual, "visita_aet");
assert.equal(aetAntes.ativo, true);
assert.notEqual(aetAntes.etapaAtual, "concluido");
assert.equal(aetAntes.totalEtapas, 5);
assert.ok(aetAntes.etapasConcluidas < aetAntes.totalEtapas);
assert.equal(isProcessoElegivelLaudoPontualLaudosSst(aetAntes), false);
assert.equal(isProcessoElegivelLaudosSst(aetAntes), false);
assert.equal(isProcessoElegivelRiscosPsicossociais(aetAntes), false);

const aetAgendada = buildImplantacaoProcesso({
  orcamento: orcamento({ numero: "ORC-2026-0063" }),
  aprovacao: apAet,
  contrato: null,
  fluxoImplantacao: "aet",
  aet: visitaAgendada,
});
assert.equal(aetAgendada.etapaAtual, "visita_agendada");
assert.equal(isProcessoElegivelLaudoPontualLaudosSst(aetAgendada), false);

// 2. AET visita realizada → Implantação concluída 100%
const aetDepois = buildImplantacaoProcesso({
  orcamento: orcamento({
    id: "orc-0063",
    numero: "ORC-2026-0063",
    cliente_nome: "ALUMINIO FIRENZE",
  }),
  aprovacao: { ...apAet, orcamento_id: "orc-0063" },
  contrato: null,
  fluxoImplantacao: "aet",
  aet: { ...visitaRealizada, orcamento_id: "orc-0063" },
});
assert.equal(aetDepois.etapaAtual, "concluido");
assert.equal(aetDepois.ativo, false);
assert.equal(aetDepois.totalEtapas, 5);
assert.equal(aetDepois.etapasConcluidas, 5);
assert.equal(aetDepois.progressoLabel, "5 de 5");
assert.equal(
  labelImplantacaoEtapa(aetDepois.etapaAtual, aetDepois.fluxoImplantacao),
  "Concluído"
);
assert.ok(!aetDepois.etapasOperacionais.some((e) => e.id === "elaboracao"));
assert.ok(!aetDepois.etapasOperacionais.some((e) => e.id === "envio"));
assert.equal(isProcessoElegivelLaudosSst(aetDepois), false);
assert.equal(isProcessoElegivelLaudoPontualLaudosSst(aetDepois), true);

// 10. ORC-2026-0063 reproduz o resultado esperado
assert.equal(aetDepois.orcamento.numero, "ORC-2026-0063");
assert.equal(aetDepois.orcamento.cliente_nome, "ALUMINIO FIRENZE");
assert.equal(aetDepois.aet?.visita_status, "realizada");
assert.equal(aetDepois.aet?.visita_data, "2026-09-22");
assert.equal(aetDepois.aet?.visita_horario, "09:00");
assert.equal(aetDepois.aet?.visita_responsavel, "Navarro");
assert.equal(aetDepois.aet?.visita_observacao, "Acesso pela portaria 2");

// 3. Insalubridade antes da visita → ainda em Implantação
const insalAntes = buildImplantacaoProcesso({
  orcamento: orcamento({
    id: "orc-0065",
    numero: "ORC-2026-0065",
    cliente_nome: "AL ASSESSORIA",
  }),
  aprovacao: { ...apInsal, orcamento_id: "orc-0065" },
  contrato: null,
  fluxoImplantacao: "insalubridade",
  aet: { ...visitaAguardando, orcamento_id: "orc-0065" },
});
assert.equal(insalAntes.etapaAtual, "visita_aet");
assert.equal(insalAntes.ativo, true);
assert.equal(insalAntes.totalEtapas, 5);
assert.equal(isProcessoElegivelLaudoPontualLaudosSst(insalAntes), false);
assert.equal(isProcessoElegivelRiscosPsicossociais(insalAntes), false);

// 4. Insalubridade nunca usa "AET em elaboração"
assert.equal(
  labelStatusServicoPontual("elaboracao", "insalubridade"),
  "Insalub. em elaboração"
);
assert.equal(
  labelImplantacaoEtapa("elaboracao", insalAntes.fluxoImplantacao),
  "Insalub. em elaboração"
);
assert.notEqual(
  labelImplantacaoEtapa("elaboracao", "insalubridade"),
  labelImplantacaoEtapa("elaboracao", "aet")
);

// 5. Insalubridade visita realizada → Implantação concluída
const insalDepois = buildImplantacaoProcesso({
  orcamento: orcamento({
    id: "orc-0065",
    numero: "ORC-2026-0065",
    cliente_nome: "AL ASSESSORIA",
  }),
  aprovacao: { ...apInsal, orcamento_id: "orc-0065" },
  contrato: null,
  fluxoImplantacao: "insalubridade",
  aet: { ...visitaRealizada, orcamento_id: "orc-0065" },
});
assert.equal(insalDepois.etapaAtual, "concluido");
assert.equal(insalDepois.progressoLabel, "5 de 5");
assert.equal(insalDepois.etapasConcluidas, insalDepois.totalEtapas);
assert.equal(isProcessoElegivelLaudoPontualLaudosSst(insalDepois), true);
assert.equal(isProcessoElegivelLaudosSst(insalDepois), false);

// 6. Ambos continuam disponíveis em Laudos SST (mesmo registro, kind preservado)
const laudosAet = buildLaudosSstProcesso(aetDepois, null);
assert.equal(laudosAet.laudoPontualKind, "aet");
assert.equal(laudosAet.tracking, null);
assert.equal(laudosAet.status, "em_andamento");
assert.equal(laudosAet.totalEtapas, 3);
assert.equal(laudosAet.etapasConcluidas, 1);
assert.equal(labelEtapaAtualLaudosSst(laudosAet), "AET em elaboração");
assert.equal(isProcessoVisivelLaudosSst(aetDepois, null), true);

const laudosInsal = buildLaudosSstProcesso(insalDepois, null);
assert.equal(laudosInsal.laudoPontualKind, "insalubridade");
assert.equal(laudosInsal.tracking, null);
assert.equal(labelEtapaAtualLaudosSst(laudosInsal), "Insalub. em elaboração");
assert.notEqual(labelEtapaAtualLaudosSst(laudosInsal), "AET em elaboração");
assert.equal(isProcessoVisivelLaudosSst(insalDepois, null), true);

// 7. AET finalizado → NÃO vai para Riscos
const aetFinalizado = buildImplantacaoProcesso({
  orcamento: orcamento({ numero: "ORC-2026-0063" }),
  aprovacao: apAet,
  contrato: null,
  fluxoImplantacao: "aet",
  aet: laudoFinalizado,
});
assert.equal(aetFinalizado.etapaAtual, "concluido");
const laudosAetFim = buildLaudosSstProcesso(aetFinalizado, null);
assert.equal(laudosAetFim.status, "concluido");
assert.equal(laudosAetFim.etapasConcluidas, 3);
assert.equal(isProcessoElegivelRiscosPsicossociais(aetFinalizado), false);
assert.equal(
  isProcessoElegivelRiscosPsicossociaisPorLaudos(laudosAetFim, null),
  false
);
assert.equal(
  isProcessoVisivelRiscosAutomatico(aetFinalizado, null, false),
  false
);

// 8. Insalubridade finalizada → NÃO vai para Riscos
const insalFinalizado = buildImplantacaoProcesso({
  orcamento: orcamento({ numero: "ORC-2026-0065" }),
  aprovacao: apInsal,
  contrato: null,
  fluxoImplantacao: "insalubridade",
  aet: laudoFinalizado,
});
const laudosInsalFim = buildLaudosSstProcesso(insalFinalizado, null);
assert.equal(laudosInsalFim.laudoPontualKind, "insalubridade");
assert.equal(laudosInsalFim.status, "concluido");
assert.equal(isProcessoElegivelRiscosPsicossociais(insalFinalizado), false);
assert.equal(
  isProcessoElegivelRiscosPsicossociaisPorLaudos(laudosInsalFim, null),
  false
);
assert.equal(
  isProcessoVisivelRiscosAutomatico(insalFinalizado, null, false),
  false
);

// 9. Serviço SST normal não sofre alteração
const sst = buildImplantacaoProcesso({
  orcamento: orcamento({ numero: "ORC-2026-0028", cliente_nome: "PACOTE SST" }),
  aprovacao: aprovacao("Pacote completo - SST"),
  contrato: null,
  fluxoImplantacao: "padrao",
  possuiPacoteCompletoSst: true,
});
assert.equal(sst.fluxoImplantacao, "padrao");
assert.equal(sst.totalEtapas, 7);
assert.ok(!sst.etapasOperacionais.some((e) => e.id === "visita_aet"));
assert.ok(!sst.etapasOperacionais.some((e) => e.id === "elaboracao"));
assert.notEqual(sst.etapaAtual, "visita_aet");
assert.notEqual(sst.etapaAtual, "concluido");

const sstConcluido = {
  ...sst,
  etapaAtual: "concluido" as const,
  possuiPacoteCompletoSst: true,
};
assert.equal(isProcessoElegivelLaudosSst(sstConcluido), true);
assert.equal(isProcessoElegivelLaudoPontualLaudosSst(sstConcluido), false);
assert.equal(isProcessoElegivelRiscosPsicossociais(sstConcluido), true);

const laudosPacote = buildLaudosSstProcesso(sstConcluido, null);
assert.equal(laudosPacote.laudoPontualKind, null);
assert.equal(laudosPacote.totalEtapas, 6);
assert.equal(labelEtapaAtualLaudosSst(laudosPacote), "EPIs");

// Visita realizada com financeiro pendente ainda conclui a Implantação em 5/5
const apDebito = aprovacao(SERVICO_AET_NOME, {
  boleto_pago: false,
  boleto_pago_em: null,
  boleto_vencimento: "2026-10-08",
});
const aetDebitoVisita = buildImplantacaoProcesso({
  orcamento: orcamento({ numero: "ORC-2026-0063" }),
  aprovacao: apDebito,
  contrato: null,
  fluxoImplantacao: "aet",
  aet: visitaRealizada,
});
assert.equal(aetDebitoVisita.etapaAtual, "concluido");
assert.equal(aetDebitoVisita.etapasConcluidas, 5);
assert.equal(aetDebitoVisita.pagamentoPendente, true);

assert.equal(
  resolveImplantacaoEtapaAtual(apAet, { fluxo: "aet", aet: visitaAguardando }),
  "visita_aet"
);
assert.equal(
  resolveImplantacaoEtapaAtual(apAet, { fluxo: "aet", aet: visitaRealizada }),
  "concluido"
);
assert.equal(
  resolveImplantacaoEtapaAtual(apInsal, {
    fluxo: "insalubridade",
    aet: visitaRealizada,
  }),
  "concluido"
);

const copyAet = copyLaudoPontual("aet");
assert.equal(copyAet.titulo, "Laudo AET");
assert.equal(copyAet.andamento, "Andamento do Laudo AET");
assert.equal(copyAet.abaElaboracao, "AET em elaboração");
assert.equal(copyAet.etapaVisita, "Visita técnica");
assert.equal(copyAet.etapaElaboracao, "Elaboração do AET");
assert.equal(copyAet.etapaEnvio, "Envio ao cliente");
assert.equal(
  copyAet.textoElaboracao,
  "Acompanhe a elaboração do Laudo AET após a visita. Anexe o PDF final antes de concluir."
);
assert.equal(copyAet.upload, "Laudo AET final (PDF)");

const copyInsal = copyLaudoPontual("insalubridade");
assert.equal(copyInsal.titulo, "Laudo de Insalubridade");
assert.equal(copyInsal.andamento, "Andamento do Laudo de Insalubridade");
assert.equal(copyInsal.abaElaboracao, "Insalub. em elaboração");
assert.equal(copyInsal.etapaVisita, "Visita técnica");
assert.equal(copyInsal.etapaElaboracao, "Elaboração do Laudo");
assert.equal(copyInsal.etapaEnvio, "Envio ao cliente");
assert.doesNotMatch(copyInsal.etapaElaboracao, /AET/);
assert.equal(
  copyInsal.textoElaboracao,
  "Acompanhe a elaboração do Laudo de Insalubridade após a visita. Anexe o PDF final antes de concluir."
);
assert.equal(copyInsal.upload, "Laudo de Insalubridade final (PDF)");
for (const value of Object.values(copyInsal)) {
  if (typeof value !== "string") continue;
  assert.equal(
    value.includes("AET"),
    false,
    `copy de Insalubridade não pode conter AET: ${value}`
  );
}
assert.equal(
  copyInsal.auditElaboracaoConcluida("AGATHA").includes("AET"),
  false
);
assert.equal(copyInsal.toastAnexado.includes("AET"), false);
assert.equal(copyInsal.toastCarregarErro.includes("AET"), false);

assert.equal(
  resolveLaudoPontualKindFromImplantacao({
    fluxo: "insalubridade",
    itens: [
      { servico_id: "insal-1", servico_nome: SERVICO_INSALUBRIDADE_NOME },
    ],
  }),
  "insalubridade"
);
assert.equal(
  resolveLaudoPontualKindFromImplantacao({
    fluxo: "padrao",
    itens: [
      { servico_id: "insal-1", servico_nome: SERVICO_INSALUBRIDADE_NOME },
    ],
  }),
  "insalubridade"
);

const orc0065 = buildImplantacaoProcesso({
  orcamento: orcamento({
    id: "orc-0065-modal",
    numero: "ORC-2026-0065",
    cliente_nome: "AL ASSESSORIA",
  }),
  aprovacao: { ...apInsal, orcamento_id: "orc-0065-modal" },
  contrato: null,
  fluxoImplantacao: "insalubridade",
  aet: { ...visitaRealizada, orcamento_id: "orc-0065-modal" },
});
const laudos0065 = buildLaudosSstProcesso(orc0065, null);
assert.equal(laudos0065.laudoPontualKind, "insalubridade");
assert.equal(laudos0065.implantacao.orcamento.numero, "ORC-2026-0065");
assert.equal(laudos0065.implantacao.orcamento.cliente_nome, "AL ASSESSORIA");
const copy0065 = copyLaudoPontual(laudos0065.laudoPontualKind ?? "aet");
assert.equal(copy0065.titulo, "Laudo de Insalubridade");
assert.doesNotMatch(copy0065.titulo, /AET/);
assert.doesNotMatch(copy0065.andamento, /AET/);
assert.doesNotMatch(copy0065.abaElaboracao, /AET/);
assert.doesNotMatch(copy0065.textoElaboracao, /AET/);
assert.doesNotMatch(copy0065.upload, /AET/);
assert.doesNotMatch(copy0065.concluaAntesEnvio, /AET/);
assert.doesNotMatch(copy0065.textoEnvio, /AET/);
assert.equal(labelEtapaAtualLaudosSst(laudos0065), "Insalub. em elaboração");

assert.equal(
  validateAetElaboracaoPayload(
    { elaboracao_status: "concluido", elaboracao_observacao: null },
    visitaRealizada,
    "insalubridade"
  ),
  copyInsal.anexeAntesDeConcluir
);
assert.doesNotMatch(
  validateAetElaboracaoPayload(
    { elaboracao_status: "concluido", elaboracao_observacao: null },
    visitaRealizada,
    "insalubridade"
  ) ?? "",
  /AET/
);
assert.equal(
  validateAetEnvioPayload(
    { enviado_cliente: true, enviado_em: "2026-09-24", envio_observacao: null },
    visitaRealizada,
    "insalubridade"
  ),
  copyInsal.concluaAntesEnvio
);

const laudos0065Envio = buildLaudosSstProcesso(
  buildImplantacaoProcesso({
    orcamento: orcamento({ numero: "ORC-2026-0065" }),
    aprovacao: apInsal,
    contrato: null,
    fluxoImplantacao: "insalubridade",
    aet: laudoFinalizado,
  }),
  null
);
assert.equal(laudos0065Envio.status, "concluido");
assert.equal(labelEtapaAtualLaudosSst(laudos0065Envio), "Concluído");
assert.equal(isProcessoElegivelRiscosPsicossociais(laudos0065Envio.implantacao), false);

const abasImplantacaoAet = buildOrcamentoEtapas("aet").map((e) => e.id);
const abasImplantacaoInsal = buildOrcamentoEtapas("insalubridade").map(
  (e) => e.id
);
assert.deepEqual(abasImplantacaoAet, [
  "resumo",
  "aprovado",
  "contrato",
  "financeiro",
  "visita_aet",
]);
assert.deepEqual(abasImplantacaoInsal, abasImplantacaoAet);
assert.ok(!abasImplantacaoAet.includes("elaboracao"));
assert.ok(!abasImplantacaoAet.includes("envio"));
assert.equal(aetAntes.totalEtapas, IMPLANTACAO_LAUDO_PONTUAL_TOTAL_ETAPAS);
assert.equal(insalAntes.totalEtapas, IMPLANTACAO_LAUDO_PONTUAL_TOTAL_ETAPAS);
assert.equal(aetDepois.progressoLabel, "5 de 5");
assert.equal(insalDepois.progressoLabel, "5 de 5");

assert.equal(sanitizeOrcamentoEtapaTab("elaboracao", "aet"), "visita_aet");
assert.equal(
  sanitizeOrcamentoEtapaTab("envio", "insalubridade"),
  "visita_aet"
);
assert.equal(implantacaoEtapaToModalTab("elaboracao", "aet"), "visita_aet");
assert.equal(
  implantacaoEtapaToModalTab("envio", "insalubridade"),
  "visita_aet"
);
assert.equal(
  isOrcamentoEtapaLiberada("elaboracao", apAet, true, {
    fluxo: "aet",
    aet: visitaRealizada,
  }),
  false
);
assert.equal(
  isOrcamentoEtapaLiberada("envio", apInsal, true, {
    fluxo: "insalubridade",
    aet: laudoFinalizado,
  }),
  false
);

assert.throws(
  () => assertPodeEditarElaboracaoEnvioLaudoPontual("implantacao"),
  (err: unknown) =>
    err instanceof Error &&
    err.message === LAUDO_PONTUAL_ELABORACAO_ENVIO_SOMENTE_LAUDOS_SST_MSG
);
assert.throws(() => assertPodeEditarElaboracaoEnvioLaudoPontual(undefined));
assert.doesNotThrow(() =>
  assertPodeEditarElaboracaoEnvioLaudoPontual("laudos_sst")
);

assert.deepEqual(
  etapasProgressoLaudosSst(laudosAet).map((e) => e.id),
  ["visita", "elaboracao", "envio"]
);
assert.deepEqual(
  etapasProgressoLaudosSst(laudosAet).map((e) => e.label),
  ["Visita técnica", "Elaboração do AET", "Envio ao cliente"]
);
assert.deepEqual(
  etapasProgressoLaudosSst(laudosInsal).map((e) => e.id),
  ["visita", "elaboracao", "envio"]
);
assert.deepEqual(
  etapasProgressoLaudosSst(laudosInsal).map((e) => e.label),
  ["Visita técnica", "Elaboração do Laudo", "Envio ao cliente"]
);
assert.equal(laudosAet.totalEtapas, 3);
assert.equal(laudosInsal.totalEtapas, 3);

assert.deepEqual(
  buildLaudosPontualEtapas("aet").map((e) => e.label),
  ["Visita técnica", "Elaboração do AET", "Envio ao cliente"]
);
assert.deepEqual(
  buildLaudosPontualEtapas("insalubridade").map((e) => e.label),
  ["Visita técnica", "Elaboração do Laudo", "Envio ao cliente"]
);
assert.ok(
  !buildLaudosPontualEtapas("insalubridade").some((e) => /AET/i.test(e.label))
);

assert.equal(isLaudosPontualEtapaConcluida("visita", visitaRealizada), true);
assert.equal(isLaudosPontualEtapaLiberada("visita", visitaRealizada), true);
assert.equal(isLaudosPontualEtapaLiberada("elaboracao", visitaRealizada), true);
assert.equal(isLaudosPontualEtapaConcluida("elaboracao", visitaRealizada), false);
assert.equal(isLaudosPontualEtapaLiberada("envio", visitaRealizada), false);
assert.equal(isLaudosPontualEtapaLiberada("envio", elaboracaoConcluida), true);
assert.equal(
  isLaudosPontualEtapaConcluida("elaboracao", elaboracaoConcluida),
  true
);
assert.equal(isLaudosPontualEtapaConcluida("envio", elaboracaoConcluida), false);
assert.equal(isLaudosPontualEtapaConcluida("envio", laudoFinalizado), true);
assert.equal(resolveLaudosPontualTabInicial(visitaRealizada), "elaboracao");
assert.equal(resolveLaudosPontualTabInicial(elaboracaoConcluida), "envio");
assert.equal(resolveLaudosPontualTabInicial(laudoFinalizado), "envio");

assert.equal(laudosAet.implantacao.aet?.visita_status, "realizada");
assert.equal(laudosAet.implantacao.aet?.visita_data, aetDepois.aet?.visita_data);
assert.equal(
  laudosAet.implantacao.aet?.visita_horario,
  aetDepois.aet?.visita_horario
);
assert.equal(
  laudosAet.implantacao.aet?.visita_responsavel,
  aetDepois.aet?.visita_responsavel
);
assert.equal(
  laudosAet.implantacao.aet?.visita_observacao,
  aetDepois.aet?.visita_observacao
);
assert.equal(laudosInsal.implantacao.aet?.visita_data, insalDepois.aet?.visita_data);

const envioBloqueado = validateAetEnvioPayload(
  { enviado_cliente: true, enviado_em: "2026-09-24", envio_observacao: null },
  visitaRealizada,
  "aet"
);
assert.equal(envioBloqueado, copyAet.concluaAntesEnvio);
const envioLiberado = validateAetEnvioPayload(
  { enviado_cliente: true, enviado_em: "2026-09-24", envio_observacao: null },
  elaboracaoConcluida,
  "insalubridade"
);
assert.equal(envioLiberado, null);

const laudosAetAposElaboracao = buildLaudosSstProcesso(
  buildImplantacaoProcesso({
    orcamento: orcamento({ numero: "ORC-2026-0063" }),
    aprovacao: apAet,
    contrato: null,
    fluxoImplantacao: "aet",
    aet: elaboracaoConcluida,
  }),
  null
);
assert.equal(laudosAetAposElaboracao.status, "em_andamento");
assert.equal(laudosAetAposElaboracao.etapasConcluidas, 2);
assert.equal(labelEtapaAtualLaudosSst(laudosAetAposElaboracao), "Aguardando envio");
assert.equal(isLaudosPontualEtapaLiberada("envio", elaboracaoConcluida), true);

assert.equal(laudosAetFim.status, "concluido");
assert.equal(laudosAetFim.etapasConcluidas, 3);
assert.equal(labelEtapaAtualLaudosSst(laudosAetFim), "Concluído");
assert.equal(laudosInsalFim.status, "concluido");

const modalImplantacaoSrc = readFileSync(
  join(process.cwd(), "components/orcamentos/OrcamentoAprovarModal.tsx"),
  "utf8"
);
assert.doesNotMatch(modalImplantacaoSrc, /tab === "elaboracao"/);
assert.doesNotMatch(modalImplantacaoSrc, /tab === "envio"/);
assert.match(modalImplantacaoSrc, /permitirElaboracaoEnvio:\s*false/);
assert.match(modalImplantacaoSrc, /OrcamentoAbaAetVisita/);
assert.doesNotMatch(modalImplantacaoSrc, /somenteLeitura/);

const modalLaudosSrc = readFileSync(
  join(process.cwd(), "components/laudos-sst/LaudosPontualModal.tsx"),
  "utf8"
);
assert.match(modalLaudosSrc, /permitirElaboracaoEnvio:\s*true/);
assert.match(modalLaudosSrc, /tab === "visita"/);
assert.match(modalLaudosSrc, /tab === "elaboracao"/);
assert.match(modalLaudosSrc, /tab === "envio"/);
assert.match(modalLaudosSrc, /somenteLeitura/);
assert.match(modalLaudosSrc, /OrcamentoAbaAetVisita/);
assert.match(modalLaudosSrc, /OrcamentoAbaAetElaboracao/);
assert.match(modalLaudosSrc, /OrcamentoAbaAetEnvio/);
assert.doesNotMatch(modalLaudosSrc, /OrcamentoResumoAetStatus/);
assert.doesNotMatch(modalLaudosSrc, /handleSalvarVisita/);
assert.doesNotMatch(modalLaudosSrc, /Andamento do Laudo/);

const visitaAbaSrc = readFileSync(
  join(process.cwd(), "components/orcamentos/OrcamentoAbasAet.tsx"),
  "utf8"
);
assert.match(visitaAbaSrc, /somenteLeitura/);
assert.match(visitaAbaSrc, /Salvar visita/);
assert.match(visitaAbaSrc, /Status da elaboração/);
assert.match(visitaAbaSrc, /Observação/);
assert.match(visitaAbaSrc, /accept="application\/pdf,\.pdf"/);

const pgrModalSrc = readFileSync(
  join(process.cwd(), "components/laudos-sst/LaudosSstModal.tsx"),
  "utf8"
);
assert.match(pgrModalSrc, /LAUDOS_SST_ETAPAS\.map/);
assert.doesNotMatch(pgrModalSrc, /buildLaudosPontualEtapas/);
assert.doesNotMatch(pgrModalSrc, /OrcamentoAbaAetElaboracao/);

console.log("ok: laudo-pontual-implantacao-fluxo");
