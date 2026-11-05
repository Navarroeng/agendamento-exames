/** Quantidade de colaboradores no histórico de contratos SST, por contratação. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ClienteContratoConsulta } from "../lib/cliente-contrato-atual";
import {
  formatValorContratoExibicao,
  getHistoricoContratos,
  labelQuantidadeColaboradoresContrato,
} from "../lib/cliente-contrato-mappers";

function contrato(
  over: Partial<ClienteContratoConsulta> & Pick<ClienteContratoConsulta, "id">
): ClienteContratoConsulta {
  return {
    cliente_id: "c1",
    data_inicio: "2026-01-01",
    data_fim: "2026-12-31",
    quantidade_colaboradores: null,
    valor_contrato: 2040,
    condicao_pagamento: "12 mensalidades",
    tipo_contrato: "mensal",
    reajuste_percentual: null,
    observacoes: null,
    status: "encerrado",
    ...over,
  };
}

const atual = contrato({
  id: "atual",
  numero: "CTR-2026-0010",
  status: "ativo",
  quantidade_colaboradores: 18,
  valor_contrato: 2400,
  quantidadeColaboradoresOrcamento: 99,
});
const anterior = contrato({
  id: "anterior",
  numero: "CTR-2025-0004",
  data_inicio: "2025-01-01",
  data_fim: "2025-12-31",
  quantidade_colaboradores: 11,
  valor_contrato: 1602,
});
const novoDoOrcamento = contrato({
  id: "novo",
  numero: "CTR-2026-0011",
  orcamento_id: "orc-novo",
  numero_orcamento: "ORC-2026-0088",
  status: "assinado",
  quantidade_colaboradores: null,
  quantidadeColaboradoresOrcamento: 7,
  valor_contrato: 980,
});
const importado = contrato({
  id: "importado",
  numero: "CTR-2023-0002",
  data_inicio: "2023-03-01",
  data_fim: "2024-02-29",
  orcamento_id: null,
  quantidade_colaboradores: 4,
  valor_contrato: 750,
});
const semQuantidade = contrato({
  id: "sem",
  numero: "CTR-2022-0001",
  quantidade_colaboradores: null,
  quantidadeColaboradoresOrcamento: null,
  valor_contrato: 500,
});

assert.equal(labelQuantidadeColaboradoresContrato(atual), "18");
assert.equal(labelQuantidadeColaboradoresContrato(anterior), "11");
assert.notEqual(
  labelQuantidadeColaboradoresContrato(anterior),
  labelQuantidadeColaboradoresContrato(atual)
);
assert.equal(labelQuantidadeColaboradoresContrato(novoDoOrcamento), "7");
assert.equal(labelQuantidadeColaboradoresContrato(importado), "4");
assert.equal(labelQuantidadeColaboradoresContrato(semQuantidade), "—");
assert.equal(
  labelQuantidadeColaboradoresContrato(
    contrato({
      id: "zero-gravado",
      quantidade_colaboradores: 0,
    })
  ),
  "0"
);
assert.equal(
  labelQuantidadeColaboradoresContrato(
    contrato({
      id: "ausente",
      quantidade_colaboradores: null,
    })
  ),
  "—"
);
assert.equal(atual.quantidade_colaboradores, 18);
assert.equal(atual.valor_contrato, 2400);
const valoresAntes = [atual, anterior, novoDoOrcamento, importado, semQuantidade].map(
  (item) => formatValorContratoExibicao(item)
);
for (const item of [atual, anterior, novoDoOrcamento, importado, semQuantidade]) {
  labelQuantidadeColaboradoresContrato(item);
}
assert.deepEqual(
  [atual, anterior, novoDoOrcamento, importado, semQuantidade].map((item) =>
    formatValorContratoExibicao(item)
  ),
  valoresAntes
);
const historico = getHistoricoContratos([
  anterior,
  atual,
  novoDoOrcamento,
  importado,
  semQuantidade,
]);
assert.deepEqual(
  historico.map((item) => [item.id, item.valor_contrato, item.status]),
  [
    ["novo", 980, "assinado"],
    ["atual", 2400, "ativo"],
    ["sem", 500, "encerrado"],
    ["anterior", 1602, "encerrado"],
    ["importado", 750, "encerrado"],
  ]
);

const tabela = readFileSync(
  "components/clientes/ClienteContratosHistoricoTable.tsx",
  "utf8"
);
const cabecalhos = tabela.slice(
  tabela.indexOf('"Contrato"'),
  tabela.indexOf('"Ações"')
);
assert.match(
  cabecalhos,
  /"Contrato"[\s\S]*"Aprovação"[\s\S]*"Valor"[\s\S]*"Colaboradores"[\s\S]*"Status"[\s\S]*"Financeiro"/
);
assert.doesNotMatch(cabecalhos, /"Orçamento"/);
assert.doesNotMatch(tabela, /numero_orcamento/);
assert.match(tabela, /labelQuantidadeColaboradoresContrato\(contrato\)/);
assert.match(tabela, /overflow-x-auto/);
assert.match(tabela, /min-w-\[1180px\]/);
assert.match(tabela, /tabular-nums/);
assert.doesNotMatch(tabela, /contrato_vagas|funcionarios/);

const servico = readFileSync("services/cliente-contrato.service.ts", "utf8");
assert.match(servico, /quantidade_colaboradores/);
assert.match(servico, /quantidadeColaboradoresOrcamento/);
assert.doesNotMatch(
  servico,
  /quantidade_colaboradores:\s*\n?\s*aprovacao/
);

console.log("test-historico-contratos-colaboradores: OK");
