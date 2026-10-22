/**
 * Marca visual M (Gestão SST mensal) na coluna Orçamento da Implantação.
 * Identifica pela modalidade do orçamento, não pela quantidade de parcelas.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isOrcamentoMensalidade } from "../lib/orcamento-modalidade";
import { usaControleParcelasMensalidade } from "../lib/mensalidade-parcelas";

const tabela = readFileSync(
  join(process.cwd(), "components/implantacao/ImplantacaoTable.tsx"),
  "utf8"
);

assert.match(tabela, /isOrcamentoMensalidade/);
assert.match(tabela, /title="Gestão SST mensal"/);
assert.match(tabela, /aria-label="Gestão SST mensal"/);
assert.match(tabela, />\s*M\s*</);
assert.match(tabela, /origem_cliente === "renovacao"/);
assert.match(tabela, /title="Cliente em renovação de contrato"/);
assert.match(tabela, />\s*R\s*</);
assert.match(tabela, /h-\[22px\] w-\[22px\]/);
assert.match(tabela, /border-brand-blue bg-brand-blue-soft text-brand-blue/);

const marcaM = tabela.indexOf('title="Gestão SST mensal"');
const marcaR = tabela.indexOf('title="Cliente em renovação de contrato"');
assert.ok(marcaM > 0 && marcaR > marcaM, "M deve aparecer antes de R no JSX");

assert.doesNotMatch(
  tabela.slice(
    tabela.indexOf("processo.orcamento.numero"),
    tabela.indexOf("formatClienteNomeDisplay")
  ),
  /usaControleParcelasMensalidade/
);
assert.doesNotMatch(
  tabela.slice(
    tabela.indexOf("processo.orcamento.numero"),
    tabela.indexOf("formatClienteNomeDisplay")
  ),
  /quantidade_parcelas|mensalidade_pagamento/
);

assert.equal(isOrcamentoMensalidade("mensalidade"), true);
assert.equal(isOrcamentoMensalidade("pontual"), false);
assert.equal(
  isOrcamentoMensalidade("mensalidade"),
  true,
  "à vista continua Gestão SST mensal: a modalidade não muda"
);
assert.equal(
  usaControleParcelasMensalidade("mensalidade", "avista"),
  false,
  "controle de parcelas à vista não é o critério do M"
);
assert.equal(usaControleParcelasMensalidade("mensalidade", "mensal"), true);

console.log("ok: implantacao-orcamento-marca");
