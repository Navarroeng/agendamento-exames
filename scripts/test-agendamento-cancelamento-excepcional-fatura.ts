import assert from "node:assert/strict";
import {
  podeCancelarExcepcionalAdminPorFatura,
  resolverBloqueioAgendamentoFatura,
} from "../lib/agendamento-fatura-bloqueio";
import {
  faturaClienteEmitidaPossuiAlteracaoPosEmissao,
} from "../lib/fatura-alteracao-pos-emissao";
import { canReemitirFaturaCliente } from "../lib/fatura-reemissao";
import { isPerfilAdmin } from "../lib/permissions";
import type { FaturaRecord } from "../lib/types";

function fatura(status: FaturaRecord["status"]): FaturaRecord {
  return {
    id: "f1",
    numero: "FAT-001",
    tipo: "cliente",
    referencia_id: null,
    referencia_nome: "Cliente A",
    periodo_inicio: "2026-06-01",
    periodo_fim: "2026-06-30",
    mes_referencia: "2026-06",
    data_emissao: "2026-06-30",
    data_vencimento: "2026-07-05",
    valor_total: 100,
    total_exames: 1,
    status,
    gerado_por: "Admin",
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
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  };
}

assert.equal(isPerfilAdmin("admin"), true);
assert.equal(isPerfilAdmin("operacional"), false);

const bloqueioEmitida = resolverBloqueioAgendamentoFatura([
  {
    id: "f1",
    numero: "FAT-001",
    tipo: "cliente",
    status: "emitida",
    pago: false,
    data_vencimento: "2026-07-05",
  },
]);

assert.equal(
  podeCancelarExcepcionalAdminPorFatura(bloqueioEmitida, true),
  true
);
assert.equal(
  podeCancelarExcepcionalAdminPorFatura(bloqueioEmitida, false),
  false
);

assert.equal(
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(fatura("emitida"), [
    { status: "agendado" },
    { status: "cancelado" },
  ]),
  true
);
assert.equal(
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(fatura("emitida"), [
    { status: "agendado" },
  ]),
  false
);

assert.equal(canReemitirFaturaCliente(fatura("cancelada")), true);
assert.equal(canReemitirFaturaCliente(fatura("necessita_reemissao")), true);
assert.equal(canReemitirFaturaCliente(fatura("emitida")), false);
assert.equal(
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(fatura("necessita_reemissao"), []),
  true
);

console.log("test-agendamento-cancelamento-excepcional-fatura: ok");
