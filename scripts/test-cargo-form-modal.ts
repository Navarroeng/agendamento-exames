/**
 * UX do cadastro de cargo: Novo e Editar no Modal compartilhado.
 * Executar: node scripts/run-ts-test.js scripts/test-cargo-form-modal.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getEmptyCargoForm } from "../lib/cargo-defaults";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

run("Novo e Editar usam o Modal compartilhado size=xl", () => {
  const modal = read("components/cargos/CargoFormModal.tsx");
  const page = read("components/cargos/CargosPage.tsx");
  assert.match(modal, /from \"@\/components\/ui\/Modal\"/);
  assert.match(modal, /size=\"xl\"/);
  assert.match(modal, /title=\{isEditing \? \"Editar cargo\" : \"Novo cargo\"\}/);
  assert.match(modal, /<CargoForm/);
  assert.match(modal, /embeddedInModal/);
  assert.match(page, /<CargoFormModal/);
  assert.doesNotMatch(page, /showForm &&/);
});

run("não há mais scroll até o formulário no final da página", () => {
  const hook = read("hooks/useCargosPage.ts");
  const page = read("components/cargos/CargosPage.tsx");
  assert.doesNotMatch(hook, /scrollIntoView/);
  assert.doesNotMatch(hook, /cadastrar-cargo/);
  assert.doesNotMatch(page, /scrollIntoView/);
});

run("rodapé só tem Cancelar e o botão principal, sem Limpar", () => {
  const actions = read("components/cargos/CargoFormActions.tsx");
  assert.match(actions, /Cancelar/);
  assert.match(actions, /Salvar cargo/);
  assert.match(actions, /Salvar alterações/);
  assert.doesNotMatch(actions, /Limpar/);
  assert.doesNotMatch(actions, /onClear/);
});

run("fechar reseta o form e Novo não herda edição anterior", () => {
  const hook = read("hooks/useCargosPage.ts");
  const empty = getEmptyCargoForm();
  assert.equal(empty.nome, "");
  assert.equal(empty.validadePeriodicoMeses, "");
  assert.deepEqual(empty.exameIds, []);
  assert.match(hook, /const closeForm = useCallback/);
  assert.match(hook, /resetForm\(\)/);
  assert.match(hook, /setEditingId\(null\)/);
  const novo = hook.slice(hook.indexOf("const handleNovo"));
  const novoBody = novo.slice(0, novo.indexOf("const handleEditar"));
  assert.match(novoBody, /resetForm\(\)/);
  assert.match(novoBody, /setShowForm\(true\)/);
  assert.doesNotMatch(novoBody, /loadForm/);
});

run("Editar carrega o cargo antes de abrir o modal", () => {
  const hook = read("hooks/useCargosPage.ts");
  const editar = hook.slice(
    hook.indexOf("const handleEditar"),
    hook.indexOf("const handleVisualizar")
  );
  assert.match(editar, /buscarCargoComExames\(id\)/);
  assert.match(editar, /loadForm\(cargo\)/);
  assert.match(editar, /setEditingId\(id\)/);
  const loadAt = editar.indexOf("loadForm(cargo)");
  const showAt = editar.indexOf("setShowForm(true)");
  assert.ok(loadAt >= 0 && showAt > loadAt);
});

run("salvar continua fechando, atualizando a lista e mantendo o toast", () => {
  const hook = read("hooks/useCargosPage.ts");
  const save = hook.slice(hook.indexOf("const handleSave"));
  assert.match(save, /getValidationError\(\)/);
  assert.match(save, /criarCargoComExames/);
  assert.match(save, /atualizarCargoComExames/);
  assert.match(save, /toast\.success\(\"Cargo cadastrado!\"\)/);
  assert.match(save, /toast\.success\(\"Cargo atualizado!\"\)/);
  assert.match(save, /closeForm\(\)/);
  assert.match(save, /refresh\(\)/);
  const closeAt = save.indexOf("closeForm()");
  const catchAt = save.indexOf("} catch");
  assert.ok(closeAt > 0 && closeAt < catchAt, "só fecha após sucesso");
});

run("CargoViewModal permanece o modal de visualização", () => {
  const view = read("components/cargos/CargoViewModal.tsx");
  const page = read("components/cargos/CargosPage.tsx");
  assert.match(view, /title=\{`Exames do cargo:/);
  assert.match(page, /<CargoViewModal cargo=\{viewCargo\}/);
});

console.log("test-cargo-form-modal: OK");
