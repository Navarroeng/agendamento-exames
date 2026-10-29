import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildMensagemConfirmacaoVisitaAgendada,
  dataVisitaIsoLocal,
  enderecoVisitaInicial,
  MENSAGEM_CONFIRMACAO_VISITA_COPIADA,
  MENSAGEM_CONFIRMACAO_VISITA_SALVAR_ANTES,
  prepararCopiaConfirmacaoVisita,
  visitaFormTemAlteracoesNaoSalvas,
  visitaSalvaDoOrcamento,
  visitaSalvaPermiteCopiarConfirmacao,
  type VisitaConfirmacaoForm,
  type VisitaConfirmacaoSalva,
} from "../lib/orcamento-visita-confirmacao";
import { buildMensagemVisitaTecnica } from "../lib/orcamento-visita-mensagem";

const OBSERVACAO_INTERNA = "Anotação interna: portaria dos fundos, não enviar ao cliente.";

function formDe(salvo: VisitaConfirmacaoSalva): VisitaConfirmacaoForm {
  return {
    visita_status: salvo.visita_status,
    visita_data: dataVisitaIsoLocal(salvo.visita_data),
    visita_horario: (salvo.visita_horario ?? "").slice(0, 5),
    visita_responsavel: salvo.visita_responsavel ?? "",
    visita_endereco: salvo.visita_endereco ?? "",
    visita_observacao: salvo.visita_observacao ?? "",
  };
}

const salvaCompleta: VisitaConfirmacaoSalva = {
  visita_status: "agendada",
  visita_data: "2026-03-01",
  visita_horario: "09:00:00",
  visita_responsavel: "Pedro Navarro",
  visita_endereco: "Rua das Flores, 100 — Centro",
  visita_observacao: OBSERVACAO_INTERNA,
};

const mensagemCompleta = buildMensagemConfirmacaoVisitaAgendada({
  empresa: "Metalúrgica Silva",
  data: "2026-03-01T00:00:00.000Z",
  horario: "9:00",
  responsavel: "Pedro Navarro",
  endereco: "Rua das Flores, 100 — Centro",
});

assert.equal(mensagemCompleta.split("\n")[0], "Olá! Tudo bem? 😊");
assert.ok(mensagemCompleta.includes("da *Navarro Engenharia* à sua empresa:"));
assert.ok(mensagemCompleta.includes("🏢 *Empresa:* Metalúrgica Silva"));
assert.ok(mensagemCompleta.includes("📅 *Data:* 01/03/2026"));
assert.ok(mensagemCompleta.includes("🕒 *Horário:* 09:00"));
assert.ok(
  mensagemCompleta.includes("👤 *Responsável pela visita:* Pedro Navarro")
);
assert.ok(
  mensagemCompleta.includes("📍 *Endereço:* Rua das Flores, 100 — Centro")
);
assert.ok(mensagemCompleta.includes("\n\nPedimos que uma pessoa responsável"));
assert.ok(mensagemCompleta.endsWith("é só nos avisar!"));
assert.equal(mensagemCompleta.includes(OBSERVACAO_INTERNA), false);
assert.equal(dataVisitaIsoLocal("2026-03-01T00:00:00.000Z"), "2026-03-01");
assert.equal(
  new Date("2026-03-01T00:00:00.000Z").getDate() === 1 ||
    mensagemCompleta.includes("01/03/2026"),
  true
);
assert.ok(mensagemCompleta.includes("01/03/2026"));
assert.equal(mensagemCompleta.includes("28/02/2026"), false);
assert.equal(mensagemCompleta.includes("02/03/2026"), false);

const semOpcionais = buildMensagemConfirmacaoVisitaAgendada({
  empresa: "Oficina Lima",
  data: "2026-10-29",
  horario: "14:30",
  responsavel: "   ",
  endereco: "",
});
assert.equal(semOpcionais.includes("Responsável"), false);
assert.equal(semOpcionais.includes("Endereço"), false);
assert.equal(semOpcionais.includes("Observação"), false);
assert.equal(semOpcionais.includes(OBSERVACAO_INTERNA), false);
assert.ok(semOpcionais.includes("🏢 *Empresa:* Oficina Lima"));
assert.ok(semOpcionais.includes("📅 *Data:* 29/10/2026"));
assert.ok(semOpcionais.includes("🕒 *Horário:* 14:30"));
assert.equal(
  semOpcionais.split("\n").filter((linha) => linha.startsWith("📍")).length,
  0
);

const outraEmpresa = buildMensagemConfirmacaoVisitaAgendada({
  empresa: "Cerâmica Norte",
  data: "2026-10-29",
  horario: "14:30",
  responsavel: "",
  endereco: "",
});
assert.ok(outraEmpresa.includes("Cerâmica Norte"));
assert.equal(outraEmpresa.includes("Oficina Lima"), false);
assert.equal(outraEmpresa.includes("Metalúrgica Silva"), false);

assert.equal(
  enderecoVisitaInicial({
    enderecoSalvo: null,
    enderecoEmpresa: "Rua da Empresa, 1",
    visitaStatus: "aguardando_agendamento",
  }),
  "Rua da Empresa, 1"
);
assert.equal(
  enderecoVisitaInicial({
    enderecoSalvo: "  ",
    enderecoEmpresa: "Rua da Empresa, 1",
    visitaStatus: "aguardando_agendamento",
  }),
  "Rua da Empresa, 1"
);
assert.equal(
  enderecoVisitaInicial({
    enderecoSalvo: "Obra, km 4",
    enderecoEmpresa: "Rua da Empresa, 1",
    visitaStatus: "aguardando_agendamento",
  }),
  "Obra, km 4"
);
assert.equal(
  enderecoVisitaInicial({
    enderecoSalvo: null,
    enderecoEmpresa: "Rua da Empresa, 1",
    visitaStatus: "agendada",
  }),
  ""
);
assert.equal(
  enderecoVisitaInicial({
    enderecoSalvo: null,
    enderecoEmpresa: "Rua da Empresa, 1",
    visitaStatus: "realizada",
  }),
  ""
);
assert.notEqual(
  enderecoVisitaInicial({
    enderecoSalvo: null,
    enderecoEmpresa: "",
    visitaStatus: "agendada",
  }),
  OBSERVACAO_INTERNA
);

assert.equal(
  visitaSalvaDoOrcamento(
    { ...salvaCompleta, orcamento_id: "orc-metalurgica" },
    "orc-ceramica"
  ),
  null
);
assert.equal(
  visitaSalvaDoOrcamento(
    { ...salvaCompleta, orcamento_id: "orc-metalurgica" },
    "orc-metalurgica"
  )?.orcamento_id,
  "orc-metalurgica"
);

assert.equal(visitaSalvaPermiteCopiarConfirmacao(salvaCompleta), true);
assert.equal(
  visitaSalvaPermiteCopiarConfirmacao({
    ...salvaCompleta,
    visita_status: "realizada",
  }),
  false
);
assert.equal(
  visitaSalvaPermiteCopiarConfirmacao({
    ...salvaCompleta,
    visita_status: "aguardando_agendamento",
  }),
  false
);
assert.equal(
  visitaSalvaPermiteCopiarConfirmacao({
    ...salvaCompleta,
    visita_data: null,
  }),
  false
);
assert.equal(
  visitaSalvaPermiteCopiarConfirmacao({
    ...salvaCompleta,
    visita_horario: "  ",
  }),
  false
);

const formIgual = formDe(salvaCompleta);
assert.equal(visitaFormTemAlteracoesNaoSalvas(formIgual, salvaCompleta), false);
assert.equal(
  visitaFormTemAlteracoesNaoSalvas(
    { ...formIgual, visita_horario: "09:00" },
    { ...salvaCompleta, visita_horario: "09:00:00" }
  ),
  false
);
assert.equal(
  visitaFormTemAlteracoesNaoSalvas(
    { ...formIgual, visita_data: "2026-03-01" },
    { ...salvaCompleta, visita_data: "2026-03-01T00:00:00.000Z" }
  ),
  false
);

const copia = prepararCopiaConfirmacaoVisita({
  form: formIgual,
  salvo: salvaCompleta,
  empresa: "Metalúrgica Silva",
});
assert.equal(copia.ok, true);
if (copia.ok) {
  assert.equal(copia.mensagem.includes(OBSERVACAO_INTERNA), false);
  assert.ok(copia.mensagem.includes("*Empresa:* Metalúrgica Silva"));
  assert.ok(copia.mensagem.includes("01/03/2026"));
  assert.equal(salvaCompleta.visita_status, "agendada");
}

const suja = prepararCopiaConfirmacaoVisita({
  form: { ...formIgual, visita_horario: "10:00" },
  salvo: salvaCompleta,
  empresa: "Metalúrgica Silva",
});
assert.deepEqual(suja, { ok: false, motivo: "alteracoes_nao_salvas" });
assert.equal(JSON.stringify(suja).includes(OBSERVACAO_INTERNA), false);
assert.equal(JSON.stringify(suja).includes("10:00"), false);

const observacaoAlterada = prepararCopiaConfirmacaoVisita({
  form: { ...formIgual, visita_observacao: "outro texto interno" },
  salvo: salvaCompleta,
  empresa: "Metalúrgica Silva",
});
assert.deepEqual(observacaoAlterada, {
  ok: false,
  motivo: "alteracoes_nao_salvas",
});

const enderecoAlterado = prepararCopiaConfirmacaoVisita({
  form: { ...formIgual, visita_endereco: "Outro endereço ainda não salvo" },
  salvo: salvaCompleta,
  empresa: "Metalúrgica Silva",
});
assert.deepEqual(enderecoAlterado, {
  ok: false,
  motivo: "alteracoes_nao_salvas",
});

assert.equal(MENSAGEM_CONFIRMACAO_VISITA_COPIADA, "Mensagem copiada!");
assert.equal(
  MENSAGEM_CONFIRMACAO_VISITA_SALVAR_ANTES,
  "Salve as alterações da visita antes de copiar a confirmação."
);

const legado = buildMensagemVisitaTecnica({
  data: "2026-07-30",
  horario: "09:00",
  endereco: "Rua Exemplo, 100",
});
assert.equal(legado.includes("Olá!"), false);

const root = join(__dirname, "..");
const aba = readFileSync(
  join(root, "components/orcamentos/OrcamentoAbasAet.tsx"),
  "utf8"
);
assert.match(aba, /Copiar confirmação/);
assert.match(aba, /Endereço da visita/);
assert.match(aba, /flex-col gap-2 sm:flex-row/);
assert.match(aba, /MENSAGEM_CONFIRMACAO_VISITA_COPIADA/);
assert.match(aba, /MENSAGEM_CONFIRMACAO_VISITA_SALVAR_ANTES/);
assert.match(aba, /prepararCopiaConfirmacaoVisita/);
assert.doesNotMatch(aba, /visita_observacao:\s*form\.visita_observacao/);
const inicioCopia = aba.indexOf("async function handleCopiarConfirmacao");
const fimCopia = aba.indexOf("return (", inicioCopia);
const corpoCopia = aba.slice(inicioCopia, fimCopia);
assert.equal(corpoCopia.includes("onSalvar"), false);
assert.equal(corpoCopia.includes("visita_status"), false);

const migration = readFileSync(
  join(root, "supabase/migrations/151_implantacao_aet_visita_endereco.sql"),
  "utf8"
);
assert.match(migration, /add column if not exists visita_endereco text null/);
assert.match(migration, /a\.visita_endereco/);
assert.doesNotMatch(migration, /update\s+public\.implantacao_aet/i);
assert.doesNotMatch(
  migration,
  /visita_endereco\s*=\s*[^;\n]*visita_observacao/i
);

const service = readFileSync(
  join(root, "services/implantacao-aet.service.ts"),
  "utf8"
);
assert.match(service, /visita_endereco: params\.payload\.visita_endereco/);
assert.doesNotMatch(service, /from\("clientes"\)/);

const modal = readFileSync(
  join(root, "components/orcamentos/OrcamentoAprovarModal.tsx"),
  "utf8"
);
assert.match(modal, /enderecoEmpresa: orcamento\?\.cliente_endereco/);
assert.match(modal, /empresaNome=\{orcamento\.cliente_nome\}/);
assert.match(modal, /orcamentoId=\{orcamento\.id\}/);

const laudos = readFileSync(
  join(root, "components/laudos-sst/LaudosPontualModal.tsx"),
  "utf8"
);
assert.match(laudos, /empresaNome=\{orcamento\.cliente_nome\}/);
assert.match(laudos, /orcamentoId=\{orcamento\.id\}/);
assert.match(laudos, /visita_endereco: aet\?\.visita_endereco/);
assert.match(
  readFileSync(join(root, "lib/orcamento-visita-confirmacao.ts"), "utf8"),
  /navigator\.clipboard\?\.writeText/
);

console.log("ok: orcamento-visita-confirmacao");
