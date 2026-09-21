/**
 * Cargo do Novo Agendamento a partir da vaga comprometida (Implantação e CPF).
 * Executar: node scripts/run-ts-test.js scripts/test-agendamento-cargo-vaga.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCargosFormOptions,
  resolveCargoAtivoParaAgendamento,
  resolveCargoIdFromPrefill,
} from "../lib/agendamento-cargo";

const FILIAL_0004_ID = "d6c18ba3-a459-4023-a142-06b1e67a3e3b";
const FILIAL_0002_ID = "687b141d-9d70-482f-8875-ee9dfcbb2a42";

const CATALOGO_ATIVO = [
  { id: "cargo-aux", nome: "Auxiliar Administrativo" },
  { id: "cargo-exportacao", nome: "Assistente de Exportação" },
  { id: "cargo-motorista", nome: "Motorista" },
];

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

run("cargo_id válido e ativo preenche o cargo do catálogo", () => {
  const resolved = resolveCargoAtivoParaAgendamento(CATALOGO_ATIVO, {
    cargo_id: "cargo-aux",
    cargo_nome: "texto qualquer da vaga",
  });
  assert.deepEqual(resolved, {
    cargoId: "cargo-aux",
    cargoNome: "Auxiliar Administrativo",
  });
});

run("somente cargo_nome, igualdade após normalização de caixa/espaços", () => {
  const resolved = resolveCargoAtivoParaAgendamento(CATALOGO_ATIVO, {
    cargo_id: null,
    cargo_nome: "  AUXILIAR   ADMINISTRATIVO  ",
  });
  assert.equal(resolved?.cargoId, "cargo-aux");
  assert.equal(resolved?.cargoNome, "Auxiliar Administrativo");
  assert.equal(
    resolveCargoIdFromPrefill(CATALOGO_ATIVO, {
      cargo_nome: "auxiliar administrativo",
    }),
    "cargo-aux"
  );
});

run("cargo_nome inexistente no catálogo deixa Cargo vazio", () => {
  const snapshot = CATALOGO_ATIVO.map((c) => ({ ...c }));
  const resolved = resolveCargoAtivoParaAgendamento(snapshot, {
    cargo_id: null,
    cargo_nome: "ASSISTENTE DE EXPORT",
  });
  assert.equal(resolved, null);
  assert.deepEqual(snapshot, CATALOGO_ATIVO, "não altera o catálogo");
});

run("nome apenas parecido não seleciona outro cargo", () => {
  assert.equal(
    resolveCargoAtivoParaAgendamento(CATALOGO_ATIVO, {
      cargo_nome: "Assistente de Export",
    }),
    null
  );
  assert.equal(
    resolveCargoIdFromPrefill(CATALOGO_ATIVO, {
      cargo_nome: "Assistente de Exportação",
    }),
    "cargo-exportacao"
  );
  assert.equal(
    resolveCargoIdFromPrefill(CATALOGO_ATIVO, {
      cargo_nome: "Assistente de Export",
    }),
    ""
  );
});

run("cargo_id inativo resulta em Cargo vazio, mesmo com nome de cargo ativo", () => {
  assert.equal(
    resolveCargoAtivoParaAgendamento(CATALOGO_ATIVO, {
      cargo_id: "cargo-inativo",
      cargo_nome: "Auxiliar Administrativo",
    }),
    null
  );
  assert.equal(
    resolveCargoIdFromPrefill(CATALOGO_ATIVO, { cargo_id: "cargo-inativo" }),
    ""
  );
});

run("texto livre não vira opção temporária do select nem registro novo", () => {
  const catalogo = CATALOGO_ATIVO.map((c) => ({ ...c }));
  const resolved = resolveCargoAtivoParaAgendamento(catalogo, {
    cargo_nome: "ASSISTENTE DE EXPORT",
  });
  assert.equal(resolved, null);
  const options = buildCargosFormOptions(catalogo, "", "ASSISTENTE DE EXPORT");
  assert.deepEqual(
    options.map((c) => c.id),
    catalogo.map((c) => c.id)
  );
  assert.equal(
    options.some(
      (c) =>
        c.nome.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR") ===
        "assistente de export"
    ),
    false
  );
  assert.deepEqual(catalogo, CATALOGO_ATIVO);
});

run("duas empresas de mesmo nome usam a vaga do clienteId, não a da homônima", () => {
  const vagaFilial0004 = {
    clienteId: FILIAL_0004_ID,
    cargo_id: null as string | null,
    cargo_nome: "ASSISTENTE DE EXPORT",
  };
  const vagaFilial0002 = {
    clienteId: FILIAL_0002_ID,
    cargo_id: "cargo-motorista" as string | null,
    cargo_nome: "Motorista",
  };

  const vagaDoCliente =
    FILIAL_0004_ID === vagaFilial0004.clienteId
      ? vagaFilial0004
      : vagaFilial0002;

  assert.equal(vagaDoCliente.clienteId, FILIAL_0004_ID);
  assert.equal(
    resolveCargoAtivoParaAgendamento(CATALOGO_ATIVO, vagaDoCliente),
    null,
    "não pega o Motorista da filial homônima"
  );
  assert.deepEqual(
    resolveCargoAtivoParaAgendamento(CATALOGO_ATIVO, vagaFilial0002),
    { cargoId: "cargo-motorista", cargoNome: "Motorista" }
  );
});

run("fluxo Implantação → Agendar passa cargo_id/nome e aplica o mesmo resolver", () => {
  const implantacao = read("components/orcamentos/OrcamentoAbaAgendamentos.tsx");
  assert.match(implantacao, /function handleAgendarVaga/);
  assert.match(implantacao, /saveAgendamentoPrefill\(/);
  assert.match(implantacao, /cargo_id:\s*vaga\.cargo_id/);
  assert.match(implantacao, /cargo_nome:\s*vaga\.cargo_nome/);
  assert.match(implantacao, /cliente_id:\s*contrato\?\.cliente_id/);

  const hook = read("hooks/useAgendamentosPage.ts");
  assert.match(hook, /resolveCargoAtivoParaAgendamento\(cargosAtivos, staged\)/);
  assert.doesNotMatch(hook, /resolveCargoIdFromPrefill\(cargosAtivos, staged\)/);
});

run("fluxo Novo Agendamento → CPF → vaga comprometida usa o mesmo resolver", () => {
  const hook = read("hooks/useAgendamentosPage.ts");
  const body = hook.slice(
    hook.indexOf("const handleVagaComprometidaVincular"),
    hook.indexOf("const showClienteProcuracaoAlert")
  );
  assert.match(body, /resolveCargoAtivoParaAgendamento\(cargosAtivos, vaga\)/);
  assert.doesNotMatch(body, /if \(vaga\.cargo_id\)/);
  assert.match(
    hook,
    /buscarVagaComprometidaPorCpf\(\{\s*clienteId: clienteId \|\| undefined/
  );
});

run("prefill e CPF não criam cargo; busca da vaga permanece por clienteId", () => {
  const hook = read("hooks/useAgendamentosPage.ts");
  const implantacao = read("components/orcamentos/OrcamentoAbaAgendamentos.tsx");
  const cargoLib = read("lib/agendamento-cargo.ts");
  const vagas = read("services/contrato-vagas.service.ts");

  assert.doesNotMatch(hook, /criarCargoComExames|atualizarCargoComExames/);
  assert.doesNotMatch(implantacao, /criarCargoComExames|atualizarCargoComExames/);
  assert.doesNotMatch(cargoLib, /criarCargoComExames|\.insert\(/);

  const busca = vagas.slice(
    vagas.indexOf("export async function buscarVagaComprometidaPorCpf"),
    vagas.indexOf("export async function vincularAgendamentoAVaga")
  );
  assert.match(busca, /if \(params\.clienteId\)/);
  assert.match(busca, /\.eq\("cliente_id", params\.clienteId\)/);
  assert.doesNotMatch(busca, /\.eq\("nome"/);
});

console.log("test-agendamento-cargo-vaga: OK");
