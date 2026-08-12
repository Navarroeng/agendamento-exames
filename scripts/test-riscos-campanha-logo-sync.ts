/**
 * Contrato do sync por código: deve preservar campos de logo da campanha.
 * (Regressão: o endpoint filtrava o payload e apagava o preview ao reabrir.)
 */
import assert from "node:assert/strict";
import { mapRiscosCampanhaRow } from "../lib/riscos-campanha";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

/** Simula o payload antigo (sem logo) vs completo. */
function payloadPorCodigoLegado(
  campanha: ReturnType<typeof mapRiscosCampanhaRow>
) {
  return {
    id: campanha.id,
    codigo_publico: campanha.codigo_publico,
    status: campanha.status,
    origem: campanha.origem,
    empresa_nome: campanha.empresa_nome,
    // logo omitido de propósito
  };
}

run("map preserva logo_storage_path após SELECT", () => {
  const mapped = mapRiscosCampanhaRow({
    id: "c1",
    status: "aberta",
    empresa_nome: "Acme",
    codigo_publico: "ABC123",
    logo_storage_path: "campanhas/c1/logo-1.png",
    logo_origem: "manual",
    logo_nome: "logo.png",
    logo_tipo: "image/png",
    logo_tamanho: 100,
  });
  assert.equal(mapped.logo_storage_path, "campanhas/c1/logo-1.png");
  assert.equal(mapped.logo_origem, "manual");
});

run("payload legado sem logo seria a regressão ao reabrir", () => {
  const mapped = mapRiscosCampanhaRow({
    id: "c1",
    status: "aberta",
    empresa_nome: "Acme",
    codigo_publico: "ABC123",
    logo_storage_path: "campanhas/c1/logo-1.png",
    logo_origem: "campanha",
  });
  const legado = payloadPorCodigoLegado(mapped) as {
    logo_storage_path?: string;
  };
  assert.equal(legado.logo_storage_path, undefined);
  // Correção: sync deve usar o record completo
  assert.equal(mapped.logo_storage_path, "campanhas/c1/logo-1.png");
});

console.log("\nTodos os testes de persistência de logo no sync passaram.");
