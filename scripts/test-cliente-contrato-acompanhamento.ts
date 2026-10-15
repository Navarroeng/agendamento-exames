/** Smoke test: contrato atual e labels de acompanhamento. */

import assert from "node:assert/strict";
import {
  formatValorContratoExibicao,
  getContratoAtual,
  getHistoricoContratos,
  labelClienteContratoStatus,
  labelClienteContratoStatusExibicao,
  labelFinanceiroContrato,
  labelPagamentoContrato,
  labelVencimentoBoletoContrato,
} from "../lib/cliente-contrato-mappers";
import type { ClienteContratoConsulta } from "../lib/cliente-contrato-atual";

function contrato(
  partial: Partial<ClienteContratoConsulta> &
    Pick<ClienteContratoConsulta, "id" | "status">
): ClienteContratoConsulta {
  return {
    cliente_id: "c1",
    data_inicio: "2026-07-01",
    data_fim: null,
    quantidade_colaboradores: 10,
    valor_contrato: 1000,
    condicao_pagamento: "à vista",
    tipo_contrato: "anual",
    reajuste_percentual: null,
    observacoes: null,
    numero: "CTR-2026-0001",
    numero_orcamento: "ORC-2026-0002",
    boleto_pago: false,
    boleto_vencimento: null,
    ...partial,
  };
}

assert.equal(labelClienteContratoStatus("aguardando_envio"), "Aguardando envio");
assert.equal(labelClienteContratoStatus("assinado"), "Assinado");
assert.equal(labelPagamentoContrato({ status: "assinado", boleto_pago: false }), "Pendente");
assert.equal(labelPagamentoContrato({ status: "pago", boleto_pago: true }), "Pago");
assert.equal(labelVencimentoBoletoContrato(null), "Não informado");

const atual = getContratoAtual([
  contrato({ id: "1", status: "encerrado" }),
  contrato({ id: "2", status: "aguardando_envio", numero: "CTR-2026-0002" }),
]);
assert.equal(atual?.id, "2");

const prefAtivo = getContratoAtual([
  contrato({ id: "1", status: "aguardando_envio" }),
  contrato({ id: "2", status: "ativo" }),
]);
assert.equal(prefAtivo?.id, "2");

const hoje = "2026-10-15";
const antigo = contrato({
  id: "antigo",
  status: "ativo",
  numero: null,
  numero_orcamento: null,
  orcamento_id: null,
  data_inicio: "2025-10-02",
  data_fim: "2026-10-02",
  valor_contrato: 1602,
  tipo_contrato: "anual",
  boleto_pago: true,
});
const mensalVigente = contrato({
  id: "novo",
  status: "aguardando_pagamento",
  numero: "CTR-2026-0043",
  numero_orcamento: "ORC-2026-0075",
  orcamento_id: "orc-75",
  data_inicio: "2026-10-14",
  data_fim: "2027-10-14",
  valor_contrato: 170,
  tipo_contrato: "anual",
  condicao_pagamento: "12 mensalidades",
  contrato_assinado_em: "2026-10-14",
  boleto_pago: false,
  boleto_vencimento: "2026-11-10",
  modalidadeOrcamento: "mensalidade",
  mensalidadePagamento: "mensal",
  mensalidadeDiaVencimento: 10,
});

const atualJet = getContratoAtual([antigo, mensalVigente], hoje);
assert.equal(atualJet?.id, "novo");
assert.equal(
  labelClienteContratoStatusExibicao(mensalVigente, hoje),
  "Ativo"
);
assert.equal(formatValorContratoExibicao(mensalVigente), "R$ 170,00/mês");
assert.equal(
  labelFinanceiroContrato(mensalVigente, hoje),
  "Parcelas a vencer"
);
assert.notEqual(
  labelClienteContratoStatusExibicao(mensalVigente, hoje),
  "Aguardando pagamento"
);

const historico = getHistoricoContratos([antigo, mensalVigente]);
assert.deepEqual(
  historico.map((item) => item.id),
  ["novo", "antigo"]
);
assert.equal(historico.filter((item) => item.orcamento_id === "orc-75").length, 1);

const futuro = contrato({
  ...mensalVigente,
  id: "futuro",
  numero: "CTR-2026-0099",
  orcamento_id: "orc-99",
  data_inicio: "2026-11-01",
  data_fim: "2027-11-01",
  contrato_assinado_em: "2026-10-14",
});
assert.equal(getContratoAtual([antigo, futuro], hoje)?.id, "antigo");
assert.equal(
  labelClienteContratoStatusExibicao(futuro, hoje),
  "Assinado"
);

assert.equal(getContratoAtual([antigo], hoje)?.id, "antigo");
assert.equal(
  labelClienteContratoStatusExibicao(antigo, hoje),
  "Expirado"
);

const anualAberto = contrato({
  id: "anual",
  status: "aguardando_pagamento",
  tipo_contrato: "anual",
  condicao_pagamento: "À vista",
  modalidadeOrcamento: "pontual",
  data_inicio: "2026-10-01",
  data_fim: "2027-10-01",
  boleto_pago: false,
  contrato_assinado_em: "2026-10-01",
});
assert.equal(getContratoAtual([antigo, anualAberto], hoje)?.id, "antigo");

assert.equal(
  labelFinanceiroContrato(
    {
      ...mensalVigente,
      parcelasMensalidade: [
        {
          vigenciaInicio: "2026-10-14",
          numero: 1,
          vencimentoIso: "2026-11-10",
          valor: 170,
          pagoEmIso: null,
        },
      ],
    },
    "2026-11-20"
  ),
  "Parcelas vencidas"
);

const duplicado = getContratoAtual(
  [
    mensalVigente,
    contrato({
      ...mensalVigente,
      id: "copia",
      data_fim: null,
      valor_contrato: 999,
    }),
  ],
  hoje
);
assert.equal(duplicado?.id, "novo");
assert.equal(duplicado?.valor_contrato, 170);

console.log("test-cliente-contrato-acompanhamento: OK");
