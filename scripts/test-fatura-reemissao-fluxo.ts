import assert from "node:assert/strict";
import {
  canReemitirFaturaCliente,
  faturaStatusContaNoResumoEmitido,
  faturaStatusPermitePagamento,
} from "../lib/fatura-reemissao";
import {
  buildResumoClientesMes,
  deriveFaturaMesStatus,
  findFaturaReferenciaMes,
} from "../lib/fatura-mes-resumo";
import { faturaClienteEmitidaPossuiAlteracaoPosEmissao } from "../lib/fatura-alteracao-pos-emissao";
import type { FaturaRecord, AgendamentoWithExames } from "../lib/types";

function ag(
  id: string,
  cliente: string,
  data: string,
  valor: number
): AgendamentoWithExames {
  return {
    id,
    cliente_nome: cliente,
    data_agendamento: data,
    status: "agendado",
    colaborador: "Colab",
    clinica_nome: "Clínica A",
    responsavel: "Resp",
    aso: "Admissional",
    agendamento_exames: [
      {
        id: `${id}-e1`,
        agendamento_id: id,
        tipo_exame: "Clínico",
        valor_cliente: valor,
        custo_clinica: 0,
      },
    ],
  } as AgendamentoWithExames;
}

function fatura(
  id: string,
  cliente: string,
  mes: string,
  status: FaturaRecord["status"],
  overrides: Partial<FaturaRecord> = {}
): FaturaRecord {
  return {
    id,
    numero: overrides.numero ?? `FAT-${id}`,
    tipo: "cliente",
    referencia_id: null,
    referencia_nome: cliente,
    periodo_inicio: `${mes}-01`,
    periodo_fim: `${mes}-30`,
    mes_referencia: mes,
    data_emissao: status === "emitida" ? `${mes}-05` : null,
    data_vencimento: `${mes}-15`,
    valor_total: overrides.valor_total ?? 100,
    total_exames: 1,
    status,
    gerado_por: "Teste",
    pago: false,
    data_pagamento: null,
    observacao_pagamento: null,
    comprovante_pagamento_path: null,
    comprovante_pagamento_nome: null,
    conferido_em: null,
    conferido_por: null,
    fatura_clinica_path: null,
    fatura_clinica_nome: null,
    fatura_clinica_tipo: null,
    fatura_clinica_tamanho: null,
    observacao_conferencia: null,
    conferencia_registrada_em: null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const necessita = fatura("n1", "Empresa A", "2026-06", "necessita_reemissao");
const emitida = fatura("e1", "Empresa A", "2026-06", "emitida", {
  numero: "FAT-NEW",
  fatura_origem_id: "r1",
  valor_total: 120,
});
const reemitida = fatura("r1", "Empresa A", "2026-06", "reemitida", {
  numero: "FAT-OLD",
  fatura_substituta_id: "e1",
  valor_total: 100,
});

assert.equal(canReemitirFaturaCliente(necessita), true);
assert.equal(canReemitirFaturaCliente(emitida), false);
assert.equal(canReemitirFaturaCliente(reemitida), false);
assert.equal(
  canReemitirFaturaCliente(fatura("c1", "Empresa A", "2026-06", "cancelada")),
  true
);

assert.equal(faturaStatusPermitePagamento("emitida"), true);
assert.equal(faturaStatusPermitePagamento("reemitida"), false);
assert.equal(faturaStatusPermitePagamento("necessita_reemissao"), false);
assert.equal(faturaStatusContaNoResumoEmitido("reemitida"), false);
assert.equal(faturaStatusContaNoResumoEmitido("emitida"), true);

assert.equal(deriveFaturaMesStatus(necessita), "necessita_reemissao");
assert.equal(deriveFaturaMesStatus(reemitida), "reemitida");
assert.equal(deriveFaturaMesStatus(emitida), "emitida");

const found = findFaturaReferenciaMes(
  [reemitida, emitida],
  "cliente",
  "Empresa A",
  "06/2026"
);
assert.ok(found);
assert.equal(found!.id, "e1", "prioriza emitida ativa sobre reemitida histórica");

const foundNecessita = findFaturaReferenciaMes(
  [reemitida, necessita],
  "cliente",
  "Empresa A",
  "06/2026"
);
assert.equal(foundNecessita!.status, "necessita_reemissao");

assert.equal(
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(necessita, []),
  true,
  "status persistido indica alteracao"
);
assert.equal(
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(emitida, [{ status: "cancelado" }]),
  true
);
assert.equal(
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(reemitida, [{ status: "cancelado" }]),
  false,
  "fatura histórica reemitida não entra no fluxo ativo"
);

assert.equal(emitida.fatura_origem_id, "r1");
assert.equal(reemitida.fatura_substituta_id, "e1");

const resumoReemissao = buildResumoClientesMes(
  [ag("a1", "Empresa A", "2026-06-10", 120)],
  [reemitida, emitida],
  "06/2026",
  "Empresa A"
);
assert.ok(resumoReemissao);
assert.equal(resumoReemissao.rows.length, 1);
assert.equal(resumoReemissao.rows[0].fatura?.id, "e1");
assert.equal(resumoReemissao.resumo.valorEmitido, 120);
assert.equal(resumoReemissao.resumo.valorEmAberto, 120);
assert.equal(resumoReemissao.resumo.valorPrevisto, 120);

const resumoSemAgendamentos = buildResumoClientesMes(
  [],
  [reemitida, emitida],
  "06/2026",
  "Empresa A"
);
assert.ok(resumoSemAgendamentos);
assert.equal(
  resumoSemAgendamentos.rows.length,
  0,
  "faturas sem agendamentos válidos não entram na listagem ativa"
);

console.log("test-fatura-reemissao-fluxo: OK");
