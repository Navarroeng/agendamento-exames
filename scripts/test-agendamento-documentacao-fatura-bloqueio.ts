import assert from "node:assert/strict";
import {
  AGENDAMENTO_FATURA_SOMENTE_DOCUMENTACAO_MSG,
  buildDocumentacaoPayloadFromForm,
} from "../lib/agendamento-documentacao";
import { buildHistoricoAlteracoesDocumentacao } from "../lib/agendamento-historico-diff";
import {
  getDocumentacaoValidationMessage,
  isDocumentacaoCompleta,
} from "../lib/validate-agendamento";
import type { AgendamentoFormValues, AgendamentoWithExames } from "../lib/types";

function formDoc(overrides: Partial<AgendamentoFormValues> = {}): AgendamentoFormValues {
  return {
    data_agendamento: "01/06/2026",
    horario: "09:00",
    cliente_nome: "CLIENTE TESTE",
    colaborador: "COLABORADOR",
    colaborador_cpf: "529.982.247-25",
    aso: "Admissional",
    clinica_nome: "CLINICA",
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
    ...overrides,
  };
}

function agendamentoBase(
  overrides: Partial<AgendamentoWithExames> = {}
): AgendamentoWithExames {
  return {
    id: "ag-1",
    data_agendamento: "2026-06-01",
    horario: "09:00",
    cliente_nome: "CLIENTE TESTE",
    colaborador: "COLABORADOR",
    colaborador_cpf: "52998224725",
    aso: "Admissional",
    clinica_nome: "CLINICA",
    responsavel: "Bruna",
    observacoes: null,
    aso_enviado_clinica: false,
    data_aso_enviado_clinica: null,
    aso_assinado: false,
    data_aso_assinado: null,
    aso_enviado_cliente: false,
    data_aso_enviado_cliente: null,
    numero_matricula: null,
    envio_esocial: false,
    data_envio_esocial: null,
    esocial_recibo: null,
    status: "agendado",
    agendamento_exames: [],
    ...overrides,
  };
}

assert.match(
  AGENDAMENTO_FATURA_SOMENTE_DOCUMENTACAO_MSG,
  /documentação pode ser atualizada/i
);

assert.equal(isDocumentacaoCompleta(formDoc()), true, "doc completa com defaults Não");

assert.equal(
  isDocumentacaoCompleta(
    formDoc({ aso_assinado: "Sim", data_aso_assinado: "2026-06-10" })
  ),
  true,
  "aso assinado com data"
);

assert.equal(
  isDocumentacaoCompleta(formDoc({ aso_assinado: "Sim", data_aso_assinado: "" })),
  false,
  "aso assinado sem data invalido"
);

assert.equal(
  getDocumentacaoValidationMessage(
    formDoc({ envio_esocial: "Sim", data_envio_esocial: "2026-06-10" })
  ),
  "Informe o Nº Recibo completo do e-Social.",
  "esocial sim exige recibo"
);

const payload = buildDocumentacaoPayloadFromForm(
  formDoc({
    aso_assinado: "Sim",
    data_aso_assinado: "2026-06-10",
    envio_esocial: "Sim",
    data_envio_esocial: "2026-06-11",
    esocial_recibo: "123456789012345678901",
    numero_matricula: "12345",
  })
);

assert.equal(payload.aso_assinado, true);
assert.equal(payload.data_aso_assinado, "2026-06-10");
assert.equal(payload.numero_matricula, "12345");
assert.equal(payload.envio_esocial, true);
assert.ok(payload.esocial_recibo?.startsWith("1.2."), "recibo esocial formatado");

const payloadObservacao = buildDocumentacaoPayloadFromForm(
  formDoc({ observacoes: "Colaborador retorna após afastamento." })
);
assert.equal(
  payloadObservacao.observacoes,
  "Colaborador retorna após afastamento.",
  "observacao salva no payload documentacao"
);

const historico = buildHistoricoAlteracoesDocumentacao(
  agendamentoBase(),
  payload,
  "Rafaela"
);

assert.ok(historico.length >= 4, "registra alteracoes documentais");
assert.ok(
  historico.some((entry) => entry.detalhes.includes("ASO assinado de Não para Sim")),
  "auditoria aso assinado"
);
assert.ok(
  historico.some((entry) => entry.detalhes.includes("data de envio ao e-Social")),
  "auditoria data esocial"
);
assert.ok(
  !historico.some((entry) => entry.detalhes.includes("data do agendamento")),
  "nao registra campos bloqueados"
);

const historicoObservacao = buildHistoricoAlteracoesDocumentacao(
  agendamentoBase(),
  buildDocumentacaoPayloadFromForm(
    formDoc({ observacoes: "Retorno após licença médica." })
  ),
  "Bruna"
);

assert.ok(
  historicoObservacao.some((entry) =>
    entry.detalhes.includes("Bruna incluiu a observação do agendamento.")
  ),
  "auditoria ao incluir observacao"
);

assert.equal(
  buildHistoricoAlteracoesDocumentacao(
    agendamentoBase({ observacoes: "Mesma observação." }),
    buildDocumentacaoPayloadFromForm(
      formDoc({ observacoes: "Mesma observação." })
    ),
    "Bruna"
  ).length,
  0,
  "nao registra observacao sem alteracao"
);

console.log("test-agendamento-documentacao-fatura-bloqueio: OK");
