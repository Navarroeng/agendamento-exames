/**
 * ASO Pontual — tipo, duplicidade temporal e Periódicos Futuros.
 * Executar: npx tsx scripts/test-agendamento-aso-pontual.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ASO_PONTUAL,
  isAsoPontual,
} from "../lib/agendamento-aso-pontual";
import {
  chaveConfirmacaoDuplicidadeAviso,
  classificarDuplicidade90Dias,
} from "../lib/agendamento-duplicidade-90dias";
import { TIPOS_ASO } from "../lib/constants";
import {
  decidirOrigemPeriodicoFuturo,
  TIPOS_ASO_PODEM_ORIGINAR_PERIODICO,
} from "../lib/periodico-geracao";

const root = join(__dirname, "..");
const CPF = "123.456.789-09";
const EMPRESA = "EMPRESA TESTE";
const PERIODICO = "2026-08-01";
const PONTUAL_30D = "2026-08-31";
const HOJE = "2026-08-02";
const ONTEM = "2026-08-01";

function decisao(partial: {
  tipoAsoNovo: string;
  tipoAsoExistente: string;
  dataNova?: string;
  dataExistente?: string;
}) {
  return classificarDuplicidade90Dias({
    cpfNovo: CPF,
    cpfExistente: CPF,
    empresaNova: EMPRESA,
    empresaExistente: EMPRESA,
    dataNova: partial.dataNova ?? PONTUAL_30D,
    dataExistente: partial.dataExistente ?? PERIODICO,
    statusExistente: "agendado",
    tipoAsoNovo: partial.tipoAsoNovo,
    tipoAsoExistente: partial.tipoAsoExistente,
  });
}

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("TIPOS_ASO inclui Pontual sem remover os existentes", () => {
  assert.ok(TIPOS_ASO.includes("Pontual"));
  assert.ok(TIPOS_ASO.includes("Admissional"));
  assert.ok(TIPOS_ASO.includes("Periódico"));
  assert.ok(TIPOS_ASO.includes("Demissional"));
  assert.equal(TIPOS_ASO.at(-1), "Pontual");
});

run("CASO 1 — Periódico recente + novo Periódico → bloqueado", () => {
  assert.equal(
    decisao({ tipoAsoNovo: "Periódico", tipoAsoExistente: "Periódico" }),
    "bloquear"
  );
});

run("CASO 2 — Periódico recente + Pontual 30 dias depois → permitido", () => {
  assert.equal(
    decisao({
      tipoAsoNovo: "Pontual",
      tipoAsoExistente: "Periódico",
      dataExistente: PERIODICO,
      dataNova: PONTUAL_30D,
    }),
    "permitir"
  );
});

run("CASO 3 — Periódico ontem + Pontual hoje → permitido", () => {
  assert.equal(
    decisao({
      tipoAsoNovo: "Pontual",
      tipoAsoExistente: "Periódico",
      dataExistente: ONTEM,
      dataNova: HOJE,
    }),
    "permitir"
  );
});

run("CASO 4 — Pontual recente + novo Pontual → permitido", () => {
  assert.equal(
    decisao({
      tipoAsoNovo: "Pontual",
      tipoAsoExistente: "Pontual",
      dataExistente: "2026-07-22",
      dataNova: "2026-08-01",
    }),
    "permitir"
  );
});

run("CASO 5 — Admissional recente + Pontual → permitido", () => {
  assert.equal(
    decisao({
      tipoAsoNovo: "Pontual",
      tipoAsoExistente: "Admissional",
      dataExistente: "2026-07-12",
      dataNova: "2026-08-01",
    }),
    "permitir"
  );
});

run("CASO 6 — Pontual recente + novo Periódico → regra normal do Periódico", () => {
  assert.equal(
    decisao({
      tipoAsoNovo: "Periódico",
      tipoAsoExistente: "Pontual",
      dataExistente: "2026-07-22",
      dataNova: "2026-08-01",
    }),
    "avisar"
  );
  assert.equal(
    decisao({
      tipoAsoNovo: "Periódico",
      tipoAsoExistente: "Periódico",
      dataExistente: PERIODICO,
      dataNova: "2026-08-15",
    }),
    "bloquear"
  );
});

run("CASO 7 — Periódico → Pontual → novo Periódico: Pontual não libera", () => {
  const comPeriodico = decisao({
    tipoAsoNovo: "Periódico",
    tipoAsoExistente: "Periódico",
    dataExistente: PERIODICO,
    dataNova: "2026-08-15",
  });
  assert.equal(comPeriodico, "bloquear");
  const pontualNoMeio = decisao({
    tipoAsoNovo: "Pontual",
    tipoAsoExistente: "Periódico",
    dataExistente: PERIODICO,
    dataNova: "2026-08-10",
  });
  assert.equal(pontualNoMeio, "permitir");
});

run("CASO 8 — confirmação de aviso duplicidade permanece para não-Pontual", () => {
  const chave = chaveConfirmacaoDuplicidadeAviso({
    existenteId: "id-1",
    cpf: CPF,
    empresa: EMPRESA,
    tipoAsoNovo: "Admissional",
    dataNovaIso: "2026-08-10",
  });
  assert.ok(chave.length > 0);
  assert.doesNotMatch(chave, /pontual/);
});

run("CASO 9 — UI/formulário expõe Pontual no select de ASO", () => {
  const form = readFileSync(
    join(root, "components/agendamentos/AgendamentoForm.tsx"),
    "utf8"
  );
  assert.match(form, /TIPOS_ASO/);
  assert.match(form, /value=\{a\}/);
  const constants = readFileSync(join(root, "lib/constants.ts"), "utf8");
  assert.match(constants, /"Pontual"/);
});

run("CASO 10 — Pontual concluído não gera Periódico Futuro", () => {
  assert.equal(isAsoPontual(ASO_PONTUAL), true);
  assert.equal(isAsoPontual("pontual"), true);
  assert.ok(!TIPOS_ASO_PODEM_ORIGINAR_PERIODICO.includes("Pontual" as never));
  assert.deepEqual(
    decidirOrigemPeriodicoFuturo({
      tipoAso: "Pontual",
      cumprindoPeriodicoExistente: false,
      cargoGeraAlerta: true,
      proximaDataIso: "2027-02-01",
      contratoDataFim: "2028-12-31",
    }),
    { gerar: false, motivo: "aso_pontual" }
  );
});

run("migration 115 isenta Pontual no trigger de duplicidade", () => {
  const sql = readFileSync(
    join(
      root,
      "supabase/migrations/115_agendamento_aso_pontual_duplicidade.sql"
    ),
    "utf8"
  );
  assert.match(sql, /'pontual'/i);
  assert.match(sql, /check_agendamento_duplicidade_90_dias/);
});

console.log("\nTodos os testes do ASO Pontual passaram.");
