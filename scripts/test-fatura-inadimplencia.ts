import assert from "node:assert/strict";
import {
  deriveFaturaClienteStatusExibicao,
  resolverBloqueioAgendamentoFatura,
} from "../lib/agendamento-fatura-bloqueio";
import {
  faturaBloqueiaNovoAgendamento,
  faturaDeveMarcarComoVencida,
  formatAuditoriaAgendamentoBloqueadoInadimplencia,
  mapFaturaParaPendenciaInadimplencia,
} from "../lib/fatura-inadimplencia";
import { deriveFaturaMesStatus } from "../lib/fatura-mes-resumo";
import {
  faturaStatusContaNoResumoEmitido,
  faturaStatusPermitePagamento,
} from "../lib/fatura-reemissao";
import type { FaturaRecord } from "../lib/types";

function fatura(
  overrides: Partial<FaturaRecord> = {}
): FaturaRecord {
  return {
    id: overrides.id ?? "f1",
    numero: overrides.numero ?? "FAT-CLI-2026-00001",
    tipo: overrides.tipo ?? "cliente",
    referencia_id: null,
    referencia_nome: overrides.referencia_nome ?? "Cliente Teste",
    periodo_inicio: "2026-05-01",
    periodo_fim: "2026-05-31",
    mes_referencia: overrides.mes_referencia ?? "2026-05",
    data_emissao: "2026-06-01T12:00:00Z",
    data_vencimento: overrides.data_vencimento ?? "2026-06-07",
    valor_total: overrides.valor_total ?? 180,
    total_exames: 1,
    status: overrides.status ?? "emitida",
    gerado_por: "Teste",
    pago: overrides.pago ?? false,
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
    created_at: "2026-06-01T12:00:00Z",
    updated_at: "2026-06-01T12:00:00Z",
    ...overrides,
  };
}

// Emitida dentro do mês do vencimento → ainda não vira vencida
assert.equal(
  faturaDeveMarcarComoVencida(
    fatura({ data_vencimento: "2026-06-07" }),
    new Date(2026, 5, 30)
  ),
  false,
  "jun/2026 no mês do vencimento não marca vencida"
);

// Mês seguinte ao vencimento → deve marcar vencida
assert.equal(
  faturaDeveMarcarComoVencida(
    fatura({ data_vencimento: "2026-06-07" }),
    new Date(2026, 6, 1)
  ),
  true,
  "jul/2026 após mês do vencimento marca vencida"
);

assert.equal(
  faturaDeveMarcarComoVencida(
    fatura({ pago: true, data_vencimento: "2026-06-07" }),
    new Date(2026, 6, 1)
  ),
  false,
  "fatura paga não marca vencida"
);

// Bloqueio de novos agendamentos
assert.equal(
  faturaBloqueiaNovoAgendamento(fatura({ status: "emitida" })),
  false,
  "emitida em atraso no mês do vencimento não bloqueia"
);

assert.equal(
  faturaBloqueiaNovoAgendamento(fatura({ status: "vencida" })),
  true,
  "vencida bloqueia novos agendamentos"
);

assert.equal(
  faturaBloqueiaNovoAgendamento(fatura({ status: "vencida", pago: true })),
  false,
  "vencida paga não bloqueia"
);

assert.equal(
  faturaBloqueiaNovoAgendamento(fatura({ status: "rascunho" })),
  false,
  "rascunho não bloqueia"
);

// Resumo / pagamento
assert.equal(faturaStatusPermitePagamento("vencida"), true);
assert.equal(faturaStatusContaNoResumoEmitido("vencida"), true);
assert.equal(deriveFaturaMesStatus(fatura({ status: "vencida" })), "vencida");
assert.equal(
  deriveFaturaMesStatus(fatura({ status: "vencida", pago: true })),
  "paga"
);

// Exibição
assert.equal(
  deriveFaturaClienteStatusExibicao({
    status: "emitida",
    pago: false,
    data_vencimento: "2020-01-01",
  }),
  "Em aberto",
  "emitida em atraso continua em aberto até virar vencida"
);

assert.equal(
  deriveFaturaClienteStatusExibicao({
    status: "vencida",
    pago: false,
    data_vencimento: "2020-01-01",
  }),
  "Vencida"
);

// Pendência para modal
const pendencia = mapFaturaParaPendenciaInadimplencia(
  fatura({ status: "vencida", valor_total: 180 })
);
assert.equal(pendencia.mesReferenciaBR, "05/2026");
assert.equal(pendencia.dataVencimentoBR, "07/06/2026");
assert.equal(pendencia.valorTotal, 180);

assert.equal(
  formatAuditoriaAgendamentoBloqueadoInadimplencia("05/2026"),
  "Novo agendamento bloqueado. Cliente possui fatura vencida referente ao período 05/2026."
);

// Edição de agendamento vinculado continua bloqueada para vencida
assert.equal(
  resolverBloqueioAgendamentoFatura([
    {
      id: "f1",
      numero: "FAT-VENC",
      tipo: "cliente",
      status: "vencida",
      pago: false,
      data_vencimento: "2026-06-07",
    },
  ]).bloqueado,
  true
);

console.log("test-fatura-inadimplencia: OK");
