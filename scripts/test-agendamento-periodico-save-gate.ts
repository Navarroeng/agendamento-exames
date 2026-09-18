/**
 * Implantação → Agendar (vaga comprometida) + Periódico Futuro no save.
 * Executar: node scripts/run-ts-test.js scripts/test-agendamento-periodico-save-gate.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  aplicarPrefillPeriodicoDecision,
  continuarSaveAposDecisaoModalPeriodico,
  decisaoPeriodicoAposAlterarAso,
  decisaoPeriodicoAposConsultaSemPendencia,
  devePreservarDecisaoPeriodicoNoPrefill,
  deveVincularAgendamentoAVagaDoPrefill,
  resolverPeriodicoSaveGate,
} from "../lib/agendamento-periodico-save-gate";
import { isAgendamentoCompleto } from "../lib/validate-agendamento";
import { isExameFaturavel } from "../lib/fatura-elegibilidade";
import {
  classificarDuplicidade90Dias,
} from "../lib/agendamento-duplicidade-90dias";
import { isAsoPontual } from "../lib/agendamento-aso-pontual";
import {
  contarCardsPorVagasContrato,
  type ContratoVagaRecord,
} from "../lib/contrato-vagas";
import {
  aplicarPatchProgramacaoFutura,
  ORIGEM_PERIODICO_IMPLANTACAO,
  validarEdicaoProgramacaoFutura,
} from "../lib/contrato-programacao-futura";
import type {
  AgendamentoFormValues,
  ExameFormItem,
  PeriodicoFuturoRecord,
} from "../lib/types";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function formPeriodico(): AgendamentoFormValues {
  return {
    data_agendamento: "18/09/2026",
    horario: "09:00",
    cliente_nome: "FESHI SERVICOS ADUANEIROS E TRANSPORTES LTDA",
    colaborador: "CARLOS ROBERTO CANATO",
    colaborador_cpf: "529.982.247-25",
    aso: "Periódico",
    clinica_nome: "Clinimed Saúde Ocupacional",
    responsavel: "Bruna",
    observacoes: "",
    aso_enviado_clinica: "Não",
    data_aso_enviado_clinica: "",
    aso_assinado: "Não",
    data_aso_assinado: "",
    aso_enviado_cliente: "Não",
    data_aso_enviado_cliente: "",
    numero_matricula: "",
    envio_esocial: "Não",
    data_envio_esocial: "",
    esocial_recibo: "",
  };
}

function clinicoZero(): ExameFormItem {
  return {
    id: "ex-clinico",
    exame_id: "exame-clinico",
    tipo_exame: "Clínico",
    valor_cliente: "0,00",
    custo_clinica: "40,00",
    lucro: "-40,00",
    aviso: "",
    precoAutomatico: false,
    clinicoValorManual: false,
  };
}

function vaga(status: ContratoVagaRecord["status"]): ContratoVagaRecord {
  return {
    id: "vaga-carlos",
    contrato_id: "ctr-2026-0028",
    orcamento_id: "orc-2026-0037",
    indice: 1,
    colaborador: "CARLOS ROBERTO CANATO",
    colaborador_cpf: "52998224725",
    cargo_id: "cargo-1",
    cargo_nome: "Motorista",
    status,
    credito_aso_id: null,
    agendamento_id: status === "agendada" ? "ag-novo" : null,
    periodico_futuro_id: null,
    created_at: "",
    updated_at: "",
  };
}

run("Implantação → Agendar → Periódico sem Periódico Futuro → salva", () => {
  const prefillDecision = aplicarPrefillPeriodicoDecision([]);
  assert.equal(prefillDecision, "none");

  const aposConsulta = decisaoPeriodicoAposConsultaSemPendencia(prefillDecision);
  assert.equal(aposConsulta, "skip");

  const gate = resolverPeriodicoSaveGate({
    isNovoAgendamento: true,
    periodicoDecision: aposConsulta,
    modalJaAberto: false,
  });
  assert.equal(gate.acao, "seguir");
  assert.equal(gate.periodicoDecision, "skip");
});

run("Consulta vazia no save (none) também segue e marca skip", () => {
  const gate = resolverPeriodicoSaveGate({
    isNovoAgendamento: true,
    periodicoDecision: "none",
    modalJaAberto: false,
    consulta: { encontrouElegivel: false },
  });
  assert.equal(gate.acao, "seguir");
  assert.equal(gate.periodicoDecision, "skip");
});

run("Implantação → Agendar → Periódico com Periódico Futuro → abre o modal", () => {
  const gate = resolverPeriodicoSaveGate({
    isNovoAgendamento: true,
    periodicoDecision: "none",
    modalJaAberto: false,
    consulta: { encontrouElegivel: true },
  });
  assert.equal(gate.acao, "abrir_modal");
  assert.equal(gate.periodicoDecision, "none");
});

run("Após decidir no modal → salvamento pendente continua", () => {
  const skip = continuarSaveAposDecisaoModalPeriodico("continuou_sem_vinculo");
  assert.equal(skip.periodicoDecision, "skip");
  assert.equal(skip.continuarSavePendente, true);

  const link = continuarSaveAposDecisaoModalPeriodico("antecipou_e_vinculou");
  assert.equal(link.periodicoDecision, "link");
  assert.equal(link.continuarSavePendente, true);

  const aposSkip = resolverPeriodicoSaveGate({
    isNovoAgendamento: true,
    periodicoDecision: skip.periodicoDecision,
    modalJaAberto: false,
  });
  assert.equal(aposSkip.acao, "seguir");
});

run("Modal não entra em loop: já aberto + none → aguarda, não consulta de novo", () => {
  const gate = resolverPeriodicoSaveGate({
    isNovoAgendamento: true,
    periodicoDecision: "none",
    modalJaAberto: true,
  });
  assert.equal(gate.acao, "aguardar_modal");

  const segunda = resolverPeriodicoSaveGate({
    isNovoAgendamento: true,
    periodicoDecision: "none",
    modalJaAberto: true,
    consulta: { encontrouElegivel: true },
  });
  assert.equal(segunda.acao, "aguardar_modal");
});

run("Cancelar o modal não dispara o save pendente e permite reabrir", () => {
  const cancelou = continuarSaveAposDecisaoModalPeriodico("cancelou");
  assert.equal(cancelou.continuarSavePendente, false);
  assert.equal(cancelou.periodicoDecision, "none");
});

run("Agendamento criado fica vinculado à vaga_id do prefill", () => {
  assert.equal(
    deveVincularAgendamentoAVagaDoPrefill({
      vagaId: "vaga-carlos",
      vagaDecision: "link",
      vagaLock: true,
    }),
    true
  );
  assert.equal(
    deveVincularAgendamentoAVagaDoPrefill({
      vagaId: "",
      vagaDecision: "link",
      vagaLock: true,
    }),
    false
  );
  assert.equal(
    deveVincularAgendamentoAVagaDoPrefill({
      vagaId: "vaga-carlos",
      vagaDecision: "none",
      vagaLock: false,
    }),
    false
  );
});

run("Vaga deixa de permanecer Comprometida após o vínculo", () => {
  const antes = contarCardsPorVagasContrato([vaga("comprometida")], 1);
  assert.equal(antes.vagasComprometidas, 1);
  assert.equal(antes.agendados, 0);

  const depois = contarCardsPorVagasContrato([vaga("agendada")], 1);
  assert.equal(depois.vagasComprometidas, 0);
  assert.equal(depois.agendados, 1);
  assert.equal(depois.pendentesDefinicao, 0);
});

run("Clínico R$ 0,00 em Periódico continua permitido (e não faturável)", () => {
  assert.equal(
    isAgendamentoCompleto(formPeriodico(), [clinicoZero()], "cargo-1"),
    true
  );
  assert.equal(
    isExameFaturavel({ status: "agendado", valor: 0 }),
    false
  );
  assert.equal(
    isAgendamentoCompleto(
      { ...formPeriodico(), aso: "Admissional" },
      [clinicoZero()],
      "cargo-1"
    ),
    false
  );
});

run("Duplicidade 90 dias permanece igual", () => {
  assert.equal(
    classificarDuplicidade90Dias({
      cpfNovo: "529.982.247-25",
      cpfExistente: "529.982.247-25",
      empresaNova: "FESHI",
      empresaExistente: "FESHI",
      dataNova: "2026-09-18",
      dataExistente: "2026-08-01",
      statusExistente: "agendado",
      tipoAsoNovo: "Periódico",
      tipoAsoExistente: "Periódico",
    }),
    "bloquear"
  );
  assert.equal(
    classificarDuplicidade90Dias({
      cpfNovo: "529.982.247-25",
      cpfExistente: "529.982.247-25",
      empresaNova: "FESHI",
      empresaExistente: "FESHI",
      dataNova: "2026-09-18",
      dataExistente: "2026-08-01",
      statusExistente: "agendado",
      tipoAsoNovo: "Periódico",
      tipoAsoExistente: "Admissional",
    }),
    "avisar"
  );
});

run("ASO Pontual permanece igual", () => {
  assert.equal(isAsoPontual("Pontual"), true);
  assert.equal(
    classificarDuplicidade90Dias({
      cpfNovo: "529.982.247-25",
      cpfExistente: "529.982.247-25",
      empresaNova: "FESHI",
      empresaExistente: "FESHI",
      dataNova: "2026-09-18",
      dataExistente: "2026-08-01",
      statusExistente: "agendado",
      tipoAsoNovo: "Pontual",
      tipoAsoExistente: "Periódico",
    }),
    "permitir"
  );
});

run("Programar para o futuro permanece igual", () => {
  const record: PeriodicoFuturoRecord = {
    id: "pf-1",
    agendamento_id: null,
    cliente_nome: "FESHI",
    colaborador: "CARLOS ROBERTO CANATO",
    cargo_id: "cargo-1",
    cargo_nome: "Motorista",
    exame_id: null,
    tipo_exame: "Periódico",
    exame_nome: "Periódico",
    data_realizada: null,
    proxima_data: "2027-04-22",
    data_prevista_original: "2027-04-22",
    antecipado: false,
    status: "ativo",
    origem: ORIGEM_PERIODICO_IMPLANTACAO,
    contrato_id: "ctr-2026-0028",
    colaborador_cpf: "52998224725",
    tipo_aso: "Periódico",
    consome_previsao_contrato: true,
    agendamento_vinculado_id: null,
  };
  const validado = validarEdicaoProgramacaoFutura({
    tipoAso: "Periódico",
    dataPrevistaIso: "2027-05-10",
  });
  assert.equal(validado.ok, true);
  if (validado.ok) {
    const depois = aplicarPatchProgramacaoFutura(record, validado.patch);
    assert.equal(depois.id, "pf-1");
    assert.equal(depois.tipo_aso, "Periódico");
    assert.equal(depois.proxima_data, "2027-05-10");
    assert.equal(depois.status, "ativo");
  }
});

run("Prefill da Implantação preserva decisão; troca de ASO reabre consulta", () => {
  assert.equal(
    devePreservarDecisaoPeriodicoNoPrefill({ vagaLock: true }),
    true
  );
  assert.equal(
    devePreservarDecisaoPeriodicoNoPrefill({
      vagaLock: false,
      periodicoIds: ["pf-1"],
    }),
    true
  );
  assert.equal(
    devePreservarDecisaoPeriodicoNoPrefill({ vagaLock: false }),
    false
  );
  assert.equal(aplicarPrefillPeriodicoDecision(["pf-1"]), "link");
  assert.equal(decisaoPeriodicoAposAlterarAso(), "none");
});

run("Fonte oficial do vínculo continua vincularAgendamentoAVaga", () => {
  const hook = readFileSync(
    join(process.cwd(), "hooks/useAgendamentosPage.ts"),
    "utf8"
  );
  assert.match(hook, /vincularAgendamentoAVaga/);
  assert.match(hook, /deveVincularAgendamentoAVagaDoPrefill/);
  assert.match(hook, /resolverPeriodicoSaveGate/);
});

console.log("test-agendamento-periodico-save-gate: OK");
