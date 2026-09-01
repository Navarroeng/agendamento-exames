/** Testes da regra de duplicidade 90 dias (mesmo ASO bloqueia; tipos diferentes avisam). */

import assert from "node:assert/strict";
import {
  chaveConfirmacaoDuplicidadeAviso,
  classificarDuplicidade90Dias,
  evaluaConflitoDuplicidade90Dias,
  isRecontratacaoDemissionalAdmissional,
  isStatusCanceladoAgendamento,
} from "../lib/agendamento-duplicidade-90dias";

const CPF = "459.872.378-58";
const EMPRESA = "ALUMINIO FIRENZE";
const BASE = "2026-06-24";
const NOVA = "2026-08-10";

function decisao(partial: {
  tipoAsoNovo: string;
  tipoAsoExistente: string;
  statusExistente?: string;
  empresaNova?: string;
  dataNova?: string;
  dataExistente?: string;
}) {
  return classificarDuplicidade90Dias({
    cpfNovo: CPF,
    cpfExistente: CPF,
    empresaNova: partial.empresaNova ?? EMPRESA,
    empresaExistente: EMPRESA,
    dataNova: partial.dataNova ?? NOVA,
    dataExistente: partial.dataExistente ?? BASE,
    statusExistente: partial.statusExistente ?? "agendado",
    tipoAsoNovo: partial.tipoAsoNovo,
    tipoAsoExistente: partial.tipoAsoExistente,
  });
}

// Caso real: Demissional → Admissional
assert.equal(
  decisao({ tipoAsoNovo: "Admissional", tipoAsoExistente: "Demissional" }),
  "avisar"
);
assert.equal(
  isRecontratacaoDemissionalAdmissional("Demissional", "Admissional"),
  true
);

// Mesmo tipo bloqueia
assert.equal(
  decisao({ tipoAsoNovo: "Admissional", tipoAsoExistente: "Admissional" }),
  "bloquear"
);
assert.equal(
  decisao({ tipoAsoNovo: "Periódico", tipoAsoExistente: "Periódico" }),
  "bloquear"
);

// Tipos diferentes avisam
assert.equal(
  decisao({ tipoAsoNovo: "Demissional", tipoAsoExistente: "Admissional" }),
  "avisar"
);

// Pontual: novo agendamento isento do intervalo temporal
assert.equal(
  decisao({ tipoAsoNovo: "Pontual", tipoAsoExistente: "Periódico" }),
  "permitir"
);
assert.equal(
  decisao({ tipoAsoNovo: "Pontual", tipoAsoExistente: "Pontual" }),
  "permitir"
);
// Periódico após Pontual existente: regra normal (avisar, não liberar bloqueio de mesmo tipo)
assert.equal(
  decisao({ tipoAsoNovo: "Periódico", tipoAsoExistente: "Pontual" }),
  "avisar"
);
assert.equal(
  decisao({
    tipoAsoNovo: "Retorno ao Trabalho",
    tipoAsoExistente: "Periódico",
  }),
  "avisar"
);
assert.equal(
  decisao({
    tipoAsoNovo: "Mudança de Função",
    tipoAsoExistente: "Admissional",
  }),
  "avisar"
);

// Cancelado permite
assert.equal(
  decisao({
    tipoAsoNovo: "Admissional",
    tipoAsoExistente: "Admissional",
    statusExistente: "cancelado",
  }),
  "permitir"
);
assert.equal(isStatusCanceladoAgendamento("CANCELADO"), true);
assert.equal(isStatusCanceladoAgendamento("Cancelado"), true);

// Após 90 dias permite mesmo tipo
assert.equal(
  decisao({
    tipoAsoNovo: "Admissional",
    tipoAsoExistente: "Admissional",
    dataExistente: "2026-01-01",
    dataNova: "2026-05-01",
  }),
  "permitir"
);

// Empresa diferente permite
assert.equal(
  decisao({
    tipoAsoNovo: "Admissional",
    tipoAsoExistente: "Admissional",
    empresaNova: "OUTRA EMPRESA",
  }),
  "permitir"
);

// Sem tipo novo: não decide bloqueio
assert.equal(
  decisao({ tipoAsoNovo: "", tipoAsoExistente: "Admissional" }),
  "permitir"
);

// Compat: evaluaConflito só bloqueia mesmo tipo
assert.equal(
  evaluaConflitoDuplicidade90Dias({
    cpfNovo: CPF,
    cpfExistente: CPF,
    empresaNova: EMPRESA,
    empresaExistente: EMPRESA,
    dataNova: NOVA,
    dataExistente: BASE,
    statusExistente: "agendado",
    tipoAsoNovo: "Admissional",
    tipoAsoExistente: "Admissional",
  }),
  true
);
assert.equal(
  evaluaConflitoDuplicidade90Dias({
    cpfNovo: CPF,
    cpfExistente: CPF,
    empresaNova: EMPRESA,
    empresaExistente: EMPRESA,
    dataNova: NOVA,
    dataExistente: BASE,
    statusExistente: "agendado",
    tipoAsoNovo: "Admissional",
    tipoAsoExistente: "Demissional",
  }),
  false
);

const chave = chaveConfirmacaoDuplicidadeAviso({
  existenteId: "abc",
  cpf: CPF,
  empresa: EMPRESA,
  tipoAsoNovo: "Admissional",
  dataNovaIso: NOVA,
});
assert.ok(chave.includes("45987237858"));
assert.ok(chave.includes("admissional"));

console.log("test-agendamento-duplicidade-90dias: OK");
