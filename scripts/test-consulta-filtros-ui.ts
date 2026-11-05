import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ATRASO_FILTRO_TEXTO_MS,
  planoConsultaFiltros,
} from "../lib/consulta-filtros-ui";
import {
  getDefaultAgendamentoFilters,
  type AgendamentoFilters,
} from "../lib/agendamento-filters";
import {
  getDefaultESocialFilters,
  type ESocialFilters,
} from "../lib/esocial-filters";

const CAMPOS_TEXTO_AGENDAMENTO = [
  "cliente",
  "colaborador",
  "tipoExame",
  "aso",
  "responsavel",
] as const satisfies readonly (keyof AgendamentoFilters)[];

const CAMPOS_TEXTO_ESOCIAL = [
  "cliente",
  "colaborador",
  "dataInicio",
  "dataFim",
] as const satisfies readonly (keyof ESocialFilters)[];

const base = getDefaultAgendamentoFilters();

assert.deepEqual(
  planoConsultaFiltros(base, base, CAMPOS_TEXTO_AGENDAMENTO),
  { tipo: "inalterado" }
);

assert.deepEqual(
  planoConsultaFiltros(
    { ...base, colaborador: "ERICA" },
    base,
    CAMPOS_TEXTO_AGENDAMENTO
  ),
  { tipo: "aplicar", aguardarMs: ATRASO_FILTRO_TEXTO_MS, pagina: 1 }
);

assert.equal(ATRASO_FILTRO_TEXTO_MS, 350);

assert.deepEqual(
  planoConsultaFiltros(
    { ...base, status: [] },
    base,
    CAMPOS_TEXTO_AGENDAMENTO
  ),
  { tipo: "aplicar", aguardarMs: 0, pagina: 1 },
  "status muda junto com a página 1, sem esperar o texto"
);

assert.deepEqual(
  planoConsultaFiltros(
    { ...base, colaborador: "ERICA", mesReferencia: "" },
    { ...base, colaborador: "ERI" },
    CAMPOS_TEXTO_AGENDAMENTO
  ),
  { tipo: "aplicar", aguardarMs: 0, pagina: 1 },
  "mês e texto no mesmo passo consultam imediatamente a página 1"
);

assert.deepEqual(
  planoConsultaFiltros(
    { ...base, status: [...base.status] },
    base,
    CAMPOS_TEXTO_AGENDAMENTO
  ),
  { tipo: "inalterado" },
  "a mesma seleção de status não dispara outra consulta"
);

const esocial = getDefaultESocialFilters();
assert.deepEqual(
  planoConsultaFiltros(
    { ...esocial, colaborador: "ERICA DA SILVA COSTA" },
    esocial,
    CAMPOS_TEXTO_ESOCIAL
  ),
  { tipo: "aplicar", aguardarMs: 350, pagina: 1 }
);
assert.deepEqual(
  planoConsultaFiltros(
    { ...esocial, statusEsocial: "todos" },
    esocial,
    CAMPOS_TEXTO_ESOCIAL
  ),
  { tipo: "aplicar", aguardarMs: 0, pagina: 1 }
);

let seq = 0;
let aplicado = 0;
function iniciar() {
  return ++seq;
}
function responder(id: number, valor: number) {
  if (id !== seq) return;
  aplicado = valor;
}

const primeira = iniciar();
const segunda = iniciar();
responder(primeira, 1);
assert.equal(aplicado, 0, "resposta antiga não substitui a consulta mais nova");
responder(segunda, 2);
assert.equal(aplicado, 2);

const paginaAgendamentos = readFileSync(
  new URL("../components/agendamentos/AgendamentoPage.tsx", import.meta.url),
  "utf8"
);
assert.equal(
  paginaAgendamentos.includes("{!loading && !error && ("),
  false,
  "o formulário de filtros não pode depender de loading"
);
assert.match(paginaAgendamentos, /<AgendamentosFilters/);

const tabelaEsocial = readFileSync(
  new URL("../components/esocial/ESocialTable.tsx", import.meta.url),
  "utf8"
);
assert.match(tabelaEsocial, /agendamentos\.length > 0 && \(/);
assert.doesNotMatch(
  tabelaEsocial,
  /\{!loading && !error && agendamentos\.length > 0/
);

console.log("consulta-filtros-ui ok");
