/**
 * Validação do logo da campanha (isolado do cadastro da empresa).
 */
import assert from "node:assert/strict";
import {
  RISCOS_CAMPANHA_LOGO_EXTS,
  RISCOS_CAMPANHA_LOGO_MAX_BYTES,
  buildRiscosCampanhaLogoStoragePath,
  escolherLogoRelatorio,
  isRiscosCampanhaLogoOrigem,
  resolveRiscosCampanhaLogoContentType,
  validateRiscosCampanhaLogoFile,
} from "../lib/riscos-campanha-logo";
import { mapRiscosCampanhaRow } from "../lib/riscos-campanha";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("origens válidas", () => {
  assert.equal(isRiscosCampanhaLogoOrigem("empresa"), true);
  assert.equal(isRiscosCampanhaLogoOrigem("campanha"), true);
  assert.equal(isRiscosCampanhaLogoOrigem("manual"), true);
  assert.equal(isRiscosCampanhaLogoOrigem("oficial"), false);
  assert.equal(isRiscosCampanhaLogoOrigem(null), false);
});

run("fallback relatório: campanha > empresa > null", () => {
  assert.equal(
    escolherLogoRelatorio({
      logoCampanhaUrl: "https://campanha/logo.png",
      logoEmpresaUrl: "https://empresa/logo.png",
    }),
    "https://campanha/logo.png"
  );
  assert.equal(
    escolherLogoRelatorio({
      logoCampanhaUrl: null,
      logoEmpresaUrl: "https://empresa/logo.png",
    }),
    "https://empresa/logo.png"
  );
  assert.equal(
    escolherLogoRelatorio({
      logoCampanhaUrl: "  ",
      logoEmpresaUrl: null,
    }),
    null
  );
  assert.equal(
    escolherLogoRelatorio({
      logoCampanhaUrl: undefined,
      logoEmpresaUrl: undefined,
    }),
    null
  );
});

run("path de storage isolado por campanha", () => {
  const path = buildRiscosCampanhaLogoStoragePath("abc-123", "marca.PNG");
  assert.match(path, /^campanhas\/abc-123\/logo-\d+\.png$/);
});

run("content-type por extensão", () => {
  assert.equal(
    resolveRiscosCampanhaLogoContentType(new File([], "x.jpg")),
    "image/jpeg"
  );
  assert.equal(
    resolveRiscosCampanhaLogoContentType(new File([], "x.svg")),
    "image/svg+xml"
  );
  assert.equal(
    resolveRiscosCampanhaLogoContentType(
      new File([], "x.png", { type: "image/png" })
    ),
    "image/png"
  );
});

run("validação de arquivo", () => {
  assert.doesNotThrow(() =>
    validateRiscosCampanhaLogoFile(
      new File([new Uint8Array(10)], "logo.png", { type: "image/png" })
    )
  );
  assert.throws(
    () =>
      validateRiscosCampanhaLogoFile(
        new File([new Uint8Array(10)], "logo.gif")
      ),
    /PNG, JPG, JPEG ou SVG/
  );
  assert.throws(
    () =>
      validateRiscosCampanhaLogoFile(
        new File(
          [new Uint8Array(RISCOS_CAMPANHA_LOGO_MAX_BYTES + 1)],
          "logo.png"
        )
      ),
    /5 MB/
  );
  assert.ok(RISCOS_CAMPANHA_LOGO_EXTS.includes("svg"));
});

run("mapCampanha preserva logo e tolera ausência (legado)", () => {
  const comLogo = mapRiscosCampanhaRow({
    id: "1",
    status: "aberta",
    empresa_nome: "Acme",
    logo_storage_path: "campanhas/1/logo-1.png",
    logo_origem: "empresa",
    logo_nome: "logo.png",
    logo_tipo: "image/png",
    logo_tamanho: 1200,
  });
  assert.equal(comLogo.logo_storage_path, "campanhas/1/logo-1.png");
  assert.equal(comLogo.logo_origem, "empresa");

  const legado = mapRiscosCampanhaRow({
    id: "2",
    status: "em_preparacao",
    empresa_nome: "Sem logo cols",
  });
  assert.equal(legado.logo_storage_path, null);
  assert.equal(legado.logo_origem, null);
  assert.equal(legado.logo_url, null);
});

console.log("\nTodos os testes de logo da campanha passaram.");
