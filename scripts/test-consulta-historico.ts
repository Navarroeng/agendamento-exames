import assert from "node:assert/strict";
import { consultaAgendamentos } from "../lib/agendamento-consulta";
import {
  getDefaultAgendamentoFilters,
  type AgendamentoFilters,
} from "../lib/agendamento-filters";
import { consultaEsocial, limiteUrgenciaEsocial } from "../lib/esocial-consulta";
import { getDefaultESocialFilters } from "../lib/esocial-filters";
import { diaSeguinteIso, termoIlike } from "../lib/consulta-lotes";

function filtros(
  partial: Partial<AgendamentoFilters>
): AgendamentoFilters {
  return { ...getDefaultAgendamentoFilters(), ...partial };
}

const erica = consultaAgendamentos(
  filtros({
    mesReferencia: "",
    status: [],
    colaborador: "  erica   da silva costa ",
  }),
  null
);

assert.equal(
  erica.condicoes.some((item) => item.op === "gte" || item.op === "lt"),
  false,
  "todos os meses não restringe a data"
);
assert.equal(
  erica.condicoes.some((item) => item.op === "in"),
  false,
  "status todos não restringe status"
);
const colaborador = erica.condicoes.find(
  (item) => item.op === "ilike" && item.coluna === "colaborador"
);
assert.ok(colaborador && colaborador.op === "ilike");
assert.equal(colaborador.valor, "%ERICA DA SILVA COSTA%");
assert.deepEqual(erica.ordem, [
  { coluna: "data_agendamento", ascending: true },
  { coluna: "horario", ascending: true },
  { coluna: "id", ascending: true },
]);

const padrao = consultaAgendamentos(getDefaultAgendamentoFilters(), null);
assert.equal(padrao.ordem[0]?.coluna, "created_at");
assert.equal(padrao.ordem.at(-1)?.coluna, "id");
assert.ok(
  padrao.condicoes.some(
    (item) =>
      item.op === "in" &&
      item.valor.includes("agendado") &&
      !item.valor.includes("cancelado")
  )
);

const agosto = consultaAgendamentos(
  filtros({ mesReferencia: "08/2026", status: [], colaborador: "Érica" }),
  null
);
assert.ok(
  agosto.condicoes.some(
    (item) => item.op === "gte" && item.valor === "2026-08-01"
  )
);
assert.ok(
  agosto.condicoes.some(
    (item) => item.op === "lt" && item.valor === "2026-09-01"
  )
);
assert.equal(termoIlike("Érica"), "ERICA");
assert.equal(diaSeguinteIso("2026-08-31"), "2026-09-01");

const esocial = consultaEsocial(
  {
    ...getDefaultESocialFilters(),
    mesReferencia: "",
    colaborador: "erica",
    statusEsocial: "todos",
  },
  null,
  "2026-11-05"
);
assert.ok(
  esocial.condicoes.some(
    (item) => item.op === "neq" && item.valor === "cancelado"
  )
);
assert.equal(
  esocial.condicoes.some((item) => item.op === "gte" || item.op === "lt"),
  false
);
assert.equal(esocial.ordem.at(-1)?.coluna, "id");
assert.equal(limiteUrgenciaEsocial("2026-11-05"), "2026-10-06");

console.log("consulta de histórico ok");
