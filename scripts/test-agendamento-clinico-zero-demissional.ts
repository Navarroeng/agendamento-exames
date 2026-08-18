import assert from "node:assert/strict";
import {
  assertExamesValorClientePermitido,
  exigeMotivoClinicoZeroDemissional,
  MOTIVO_CLINICO_ZERO_DEMISSIONAL_TOAST,
  VALOR_CLIENTE_ZERO_BLOQUEADO_MSG,
} from "../lib/agendamento-clinico-zero-demissional";
import {
  getAgendamentoValidationMessage,
  isAgendamentoCompleto,
} from "../lib/validate-agendamento";
import { MOTIVO_ASO_INCLUSO_CONTRATO } from "../lib/contrato-creditos-aso";
import type { AgendamentoFormValues, ExameFormItem } from "../lib/types";

function baseForm(aso: string): AgendamentoFormValues {
  return {
    data_agendamento: "16/06/2026",
    horario: "09:00",
    cliente_nome: "Empresa X",
    colaborador: "João",
    colaborador_cpf: "529.982.247-25",
    aso,
    clinica_nome: "Clínica A",
    responsavel: "Maria",
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

function clinicoExam(valor: string, motivo = ""): ExameFormItem {
  return {
    id: "1",
    exame_id: "",
    tipo_exame: "Clínico",
    valor_cliente: valor,
    custo_clinica: "45,00",
    lucro: valor,
    aviso: "",
    precoAutomatico: false,
    clinicoValorManual: true,
    motivo_valor_zero: motivo,
  };
}

const cargoId = "cargo-1";

assert.equal(
  exigeMotivoClinicoZeroDemissional("Demissional", clinicoExam("0,00")),
  true
);

assert.throws(
  () =>
    assertExamesValorClientePermitido("Demissional", [
      {
        tipo_exame: "Clínico",
        valor_cliente: 0,
        custo_clinica: 45,
      },
    ]),
  (err: unknown) =>
    err instanceof Error && err.message === MOTIVO_CLINICO_ZERO_DEMISSIONAL_TOAST
);

assert.doesNotThrow(() =>
  assertExamesValorClientePermitido("Demissional", [
    {
      tipo_exame: "Clínico",
      valor_cliente: 0,
      custo_clinica: 45,
      motivo_valor_zero: "Cortesia autorizada.",
    },
  ])
);

assert.throws(
  () =>
    assertExamesValorClientePermitido("Demissional", [
      {
        tipo_exame: "Audiometria",
        valor_cliente: 0,
        custo_clinica: 30,
      },
    ]),
  (err: unknown) =>
    err instanceof Error && err.message === VALOR_CLIENTE_ZERO_BLOQUEADO_MSG
);

assert.throws(
  () =>
    assertExamesValorClientePermitido("Admissional", [
      {
        tipo_exame: "Clínico",
        valor_cliente: 0,
        custo_clinica: 45,
        motivo_valor_zero: "Tentativa inválida",
      },
    ]),
  (err: unknown) =>
    err instanceof Error && err.message === VALOR_CLIENTE_ZERO_BLOQUEADO_MSG
);

const formDemissional = baseForm("Demissional");
const examComMotivo = clinicoExam("0,00", "ASO anterior dentro do prazo legal.");
assert.equal(
  getAgendamentoValidationMessage(formDemissional, [examComMotivo], cargoId),
  null
);
assert.equal(
  isAgendamentoCompleto(formDemissional, [examComMotivo], cargoId),
  true
);

const examSemMotivo = clinicoExam("0,00");
assert.equal(
  getAgendamentoValidationMessage(formDemissional, [examSemMotivo], cargoId),
  MOTIVO_CLINICO_ZERO_DEMISSIONAL_TOAST
);

const formAdmissional = baseForm("Admissional");
assert.equal(
  getAgendamentoValidationMessage(formAdmissional, [clinicoExam("0,00")], cargoId),
  "Preencha todos os campos obrigatórios antes de salvar."
);

assert.doesNotThrow(() =>
  assertExamesValorClientePermitido("Admissional", [
    {
      tipo_exame: "Clínico",
      valor_cliente: 0,
      custo_clinica: 45,
      motivo_valor_zero: MOTIVO_ASO_INCLUSO_CONTRATO,
    },
    {
      tipo_exame: "Audiometria",
      valor_cliente: 33,
      custo_clinica: 21,
    },
  ])
);

const examContrato = clinicoExam("0,00", MOTIVO_ASO_INCLUSO_CONTRATO);
assert.equal(
  getAgendamentoValidationMessage(formAdmissional, [examContrato], cargoId),
  null
);
assert.equal(isAgendamentoCompleto(formAdmissional, [examContrato], cargoId), true);

console.log("test-agendamento-clinico-zero-demissional: ok");
