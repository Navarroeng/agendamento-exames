/**
 * Laudos pontuais exclusivos (AET / Insalubridade):
 * Implantação termina na visita realizada; elaboração segue em Laudos SST;
 * nunca entram em Riscos Psicossociais.
 *
 * Executar: npx tsx scripts/test-laudo-pontual-implantacao-fluxo.ts
 */
import assert from "node:assert/strict";
import {
  buildImplantacaoProcesso,
  IMPLANTACAO_LAUDO_PONTUAL_TOTAL_ETAPAS,
  labelImplantacaoEtapa,
  resolveImplantacaoEtapaAtual,
} from "../lib/implantacao-clientes";
import type { ImplantacaoAetRecord } from "../lib/implantacao-aet";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoRecord } from "../lib/orcamento-types";
import {
  buildLaudosSstProcesso,
  isProcessoElegivelLaudoPontualLaudosSst,
  isProcessoElegivelLaudosSst,
  isProcessoVisivelLaudosSst,
  labelEtapaAtualLaudosSst,
} from "../lib/laudos-sst";
import {
  isProcessoElegivelRiscosPsicossociais,
  isProcessoElegivelRiscosPsicossociaisPorLaudos,
  isProcessoVisivelRiscosAutomatico,
} from "../lib/riscos-psicossociais";
import { SERVICO_AET_NOME } from "../lib/servico-aet";
import { SERVICO_INSALUBRIDADE_NOME } from "../lib/servico-insalubridade";
import {
  resolveLaudoPontualKind,
  fluxoToLaudoPontualKind,
} from "../lib/servico-laudo-pontual";
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
  visita_realizada_em: "2026-09-22T14:00:00Z",
  elaboracao_status: "em_elaboracao",
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

console.log("ok: laudo-pontual-implantacao-fluxo");
