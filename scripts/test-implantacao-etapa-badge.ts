import assert from "node:assert/strict";
import {
  IMPLANTACAO_ETAPA_BADGE,
  IMPLANTACAO_ETAPA_BADGE_BASE,
  IMPLANTACAO_ETAPA_LABELS,
  type ImplantacaoEtapaId,
} from "../lib/implantacao-clientes";

const etapas: ImplantacaoEtapaId[] = [
  "contrato",
  "financeiro",
  "procuracao",
  "funcionarios",
  "logo",
  "visita",
  "aguardando_agendamentos",
  "concluido",
  "contrato_encerrado",
];

for (const etapa of etapas) {
  const tone = IMPLANTACAO_ETAPA_BADGE[etapa];
  assert.ok(tone, `badge missing for ${etapa}`);
  assert.ok(tone.className.includes("border-"), `${etapa} precisa de borda`);
  assert.ok(tone.className.includes("bg-"), `${etapa} precisa de fundo`);
  assert.ok(tone.className.includes("text-"), `${etapa} precisa de texto`);
  assert.ok(IMPLANTACAO_ETAPA_LABELS[etapa], `label missing for ${etapa}`);
}

assert.equal(IMPLANTACAO_ETAPA_BADGE.contrato.family, "contrato");
assert.equal(IMPLANTACAO_ETAPA_BADGE.financeiro.family, "financeiro");
assert.equal(IMPLANTACAO_ETAPA_BADGE.procuracao.family, "procuracao");
assert.equal(IMPLANTACAO_ETAPA_BADGE.funcionarios.family, "lista");
assert.equal(IMPLANTACAO_ETAPA_BADGE.logo.family, "logo");
assert.equal(IMPLANTACAO_ETAPA_BADGE.visita.family, "visita");
assert.equal(
  IMPLANTACAO_ETAPA_BADGE.aguardando_agendamentos.family,
  "agendamentos"
);
assert.equal(IMPLANTACAO_ETAPA_BADGE.concluido.family, "concluido");
assert.equal(IMPLANTACAO_ETAPA_BADGE.contrato_encerrado.family, "encerrado");

assert.ok(IMPLANTACAO_ETAPA_BADGE_BASE.includes("rounded-full"));
assert.ok(IMPLANTACAO_ETAPA_BADGE_BASE.includes("border"));

// Rosa para agendamentos; amarelo para lista (não mais o inverso)
assert.ok(
  IMPLANTACAO_ETAPA_BADGE.aguardando_agendamentos.className.includes("fce7f3")
);
assert.ok(IMPLANTACAO_ETAPA_BADGE.funcionarios.className.includes("fef9c3"));

console.log("ok: implantacao-etapa-badge");
