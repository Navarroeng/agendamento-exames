import assert from "node:assert/strict";
import { consultaAgendamentos } from "../lib/agendamento-consulta";
import {
  getDefaultAgendamentoFilters,
  type AgendamentoFilters,
} from "../lib/agendamento-filters";
import { consultaEsocial, limiteUrgenciaEsocial } from "../lib/esocial-consulta";
import { getDefaultESocialFilters } from "../lib/esocial-filters";
import { diaSeguinteIso, exigirGravacaoUnica, termoBuscaRegex } from "../lib/consulta-lotes";
import { filtroOrCpfExato } from "../lib/cpf";

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
  (item) => item.op === "imatch" && item.coluna === "colaborador"
);
assert.ok(colaborador && colaborador.op === "imatch");
assert.match(String(colaborador.valor), /\[EÉÈÊËeéèêë\]/);
assert.match(String(colaborador.valor), /\\s\+/);
assert.equal(termoBuscaRegex("  érica   da silva costa "), termoBuscaRegex("ERICA DA SILVA COSTA"));
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
assert.equal(termoBuscaRegex("Érica"), termoBuscaRegex("erica"));
assert.equal(diaSeguinteIso("2026-08-31"), "2026-09-01");
assert.deepEqual(exigirGravacaoUnica([" a ", "a", "b"]), ["a", "b"]);
assert.throws(
  () => exigirGravacaoUnica(Array.from({ length: 400 }, (_, i) => `id-${i}-${"x".repeat(40)}`)),
  /não foi aplicada/
);
assert.equal(
  filtroOrCpfExato("colaborador_cpf", "529.982.247-25"),
  'colaborador_cpf.eq.52998224725,colaborador_cpf.eq."529.982.247-25"'
);

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
