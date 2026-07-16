import assert from "node:assert/strict";
import {
  CONFERENCIA_DATA_OBRIGATORIA_MSG,
  CONFERENCIA_FATURA_OBRIGATORIA_MSG,
  buildFaturaClinicaStoragePath,
} from "../lib/fatura-conferencia-clinica";
import {
  CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO,
  CUSTOS_CLINICA_ACAO_REABRIR,
  CUSTOS_CLINICA_ACAO_VER_FATURA,
  FATURA_MES_STATUS_LABELS_CLINICA,
  custosClinicaConferido,
  custosClinicaEmAberto,
  deriveFaturaMesStatusClinica,
  formatAuditoriaMarcarConferido,
  formatAuditoriaReabrirConferencia,
  historicoStatusLabelClinica,
  periodoLabelCustosClinica,
} from "../lib/custos-clinicas-conferencia";
import { buildResumoClinicasMes } from "../lib/fatura-mes-resumo";
import type { AgendamentoWithExames, FaturaRecord } from "../lib/types";

function fatura(
  status: FaturaRecord["status"],
  pago = false,
  extras: Partial<FaturaRecord> = {}
): FaturaRecord {
  return {
    id: "f1",
    numero: "CC-001",
    tipo: "clinica",
    referencia_id: null,
    referencia_nome: "Clínica Teste",
    periodo_inicio: "2026-06-01",
    periodo_fim: "2026-06-30",
    mes_referencia: "2026-06",
    data_emissao: status === "emitida" ? "2026-06-30" : null,
    data_vencimento: "2026-06-30",
    valor_total: 500,
    total_exames: 3,
    status,
    gerado_por: "Admin",
    pago,
    data_pagamento: pago ? "2026-07-05" : null,
    observacao_pagamento: null,
    comprovante_pagamento_path: null,
    comprovante_pagamento_nome: null,
    conferido_em: extras.conferido_em ?? null,
    conferido_por: extras.conferido_por ?? null,
    fatura_clinica_path: extras.fatura_clinica_path ?? null,
    fatura_clinica_nome: extras.fatura_clinica_nome ?? null,
    fatura_clinica_tipo: extras.fatura_clinica_tipo ?? null,
    fatura_clinica_tamanho: extras.fatura_clinica_tamanho ?? null,
    observacao_conferencia: extras.observacao_conferencia ?? null,
    conferencia_registrada_em: extras.conferencia_registrada_em ?? null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  };
}

assert.equal(
  FATURA_MES_STATUS_LABELS_CLINICA.aberta_emissao,
  "Aberta para conferência"
);
assert.equal(FATURA_MES_STATUS_LABELS_CLINICA.rascunho, "Aberta para conferência");
assert.equal(FATURA_MES_STATUS_LABELS_CLINICA.emitida, "Conferido");
assert.equal(FATURA_MES_STATUS_LABELS_CLINICA.paga, "Pago");

assert.equal(historicoStatusLabelClinica("rascunho", false), "Aberta para conferência");
assert.equal(historicoStatusLabelClinica("emitida", false), "Conferido");
assert.equal(historicoStatusLabelClinica("emitida", true), "Conferido");

assert.equal(deriveFaturaMesStatusClinica(null), "aberta_emissao");
assert.equal(deriveFaturaMesStatusClinica(fatura("rascunho")), "rascunho");
assert.equal(deriveFaturaMesStatusClinica(fatura("emitida")), "emitida");
assert.equal(deriveFaturaMesStatusClinica(fatura("emitida", true)), "emitida");

assert.equal(custosClinicaConferido(fatura("emitida")), true);
assert.equal(custosClinicaConferido(fatura("emitida", true)), true);
assert.equal(custosClinicaConferido(fatura("rascunho")), false);
assert.equal(custosClinicaConferido(null), false);

assert.equal(custosClinicaEmAberto(null), true);
assert.equal(custosClinicaEmAberto(fatura("rascunho")), true);
assert.equal(custosClinicaEmAberto(fatura("emitida")), false);

assert.equal(CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO, "Marcar como conferido");
assert.equal(CUSTOS_CLINICA_ACAO_REABRIR, "Reabrir conferência");
assert.equal(CUSTOS_CLINICA_ACAO_VER_FATURA, "Ver fatura da clínica");

assert.equal(
  CONFERENCIA_DATA_OBRIGATORIA_MSG,
  "Informe a data da conferência."
);
assert.equal(
  CONFERENCIA_FATURA_OBRIGATORIA_MSG,
  "Anexe a fatura da clínica para concluir a conferência."
);

assert.match(
  buildFaturaClinicaStoragePath("uuid-1", "fatura.pdf"),
  /^uuid-1\/faturas\/fatura-clinica-\d+\.pdf$/
);

assert.equal(
  periodoLabelCustosClinica(fatura("rascunho")),
  "01/06/2026 a 30/06/2026"
);

assert.equal(
  formatAuditoriaMarcarConferido("Maria", "Clínica ABC"),
  "Maria conferiu os custos da clínica Clínica ABC. O valor foi considerado pago."
);

assert.equal(
  formatAuditoriaReabrirConferencia("João", "Clínica XYZ"),
  "João reabriu a conferência dos custos da clínica Clínica XYZ. O valor voltou para em aberto."
);

function canReabrirConferencia(record: FaturaRecord): boolean {
  return record.tipo === "clinica" && record.status === "emitida";
}

assert.equal(canReabrirConferencia(fatura("emitida")), true);
assert.equal(canReabrirConferencia(fatura("emitida", true)), true);
assert.equal(canReabrirConferencia(fatura("rascunho")), false);

function agClinica(
  id: string,
  clinica: string,
  custo: number
): AgendamentoWithExames {
  return {
    id,
    cliente_nome: "Empresa",
    clinica_nome: clinica,
    data_agendamento: "2026-06-10",
    status: "agendado",
    colaborador: "João",
    responsavel: "Resp",
    aso: "Admissional",
    agendamento_exames: [
      {
        id: `${id}-e1`,
        agendamento_id: id,
        tipo_exame: "Clínico",
        valor_cliente: 0,
        custo_clinica: custo,
      },
    ],
  } as AgendamentoWithExames;
}

const resumoAberto = buildResumoClinicasMes(
  [agClinica("ag1", "Clínica Alpha", 200)],
  [],
  "06/2026"
);
assert.ok(resumoAberto);
assert.equal(resumoAberto.resumo.valorEmAberto, 200);
assert.equal(resumoAberto.resumo.valorPago, 0);

const resumoConferido = buildResumoClinicasMes(
  [agClinica("ag2", "Clínica Beta", 300)],
  [
    {
      ...fatura("emitida"),
      referencia_nome: "Clínica Beta",
    },
  ],
  "06/2026"
);
assert.ok(resumoConferido);
assert.equal(resumoConferido.resumo.valorPago, 300);
assert.equal(resumoConferido.resumo.valorEmAberto, 0);

const resumoLegadoPago = buildResumoClinicasMes(
  [agClinica("ag2", "Clínica Beta", 300)],
  [
    {
      ...fatura("emitida", true),
      referencia_nome: "Clínica Beta",
    },
  ],
  "06/2026"
);
assert.ok(resumoLegadoPago);
assert.equal(resumoLegadoPago.resumo.valorPago, 300);
assert.equal(resumoLegadoPago.resumo.valorEmAberto, 0);

console.log("test-custos-clinicas-conferencia: ok");
