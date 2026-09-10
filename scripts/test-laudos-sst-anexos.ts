import assert from "node:assert/strict";
import {
  anexoMetaFromColumns,
  buildLaudosSstAnexoStoragePath,
  getLaudosSstAnexoExtension,
  isLaudosSstAnexoTipo,
  LaudosSstAnexoValidationError,
  validateLaudosSstAnexoFile,
} from "../lib/laudos-sst-anexos";
import { isLaudosEtapaConcluida } from "../lib/laudos-sst-etapas";
import { EMPTY_LAUDOS_WORKFLOW } from "../lib/laudos-sst-etapas";

assert.equal(isLaudosSstAnexoTipo("pgr"), true);
assert.equal(isLaudosSstAnexoTipo("pcmso"), true);
assert.equal(isLaudosSstAnexoTipo("ltcat"), true);
assert.equal(isLaudosSstAnexoTipo("outro"), false);

assert.equal(getLaudosSstAnexoExtension("PGR_Nepper_2026.pdf"), "pdf");
assert.equal(getLaudosSstAnexoExtension("doc.DOCX"), "docx");
assert.equal(getLaudosSstAnexoExtension("x.exe"), null);

const pathPgr = buildLaudosSstAnexoStoragePath(
  "11111111-1111-1111-1111-111111111111",
  "pgr",
  "PGR.pdf"
);
assert.match(pathPgr, /^11111111-1111-1111-1111-111111111111\/pgr-\d+\.pdf$/);

const pathPcmso = buildLaudosSstAnexoStoragePath(
  "11111111-1111-1111-1111-111111111111",
  "pcmso",
  "a.docx"
);
assert.match(pathPcmso, /\/pcmso-\d+\.docx$/);
assert.notEqual(pathPgr.includes("/pcmso-"), true);

const meta = anexoMetaFromColumns(
  "oid/pgr-1.pdf",
  "PGR.pdf",
  "application/pdf",
  1234
);
assert.equal(meta?.nome, "PGR.pdf");
assert.equal(anexoMetaFromColumns(null, "x", "y", 1), null);

// Regra de conclusão NÃO exige anexo
const semAnexo = {
  ...EMPTY_LAUDOS_WORKFLOW,
  pgrRealizado: true as const,
  pgrData: "2026-09-01",
  pcmsoRealizado: true as const,
  pcmsoData: "2026-09-01",
  ltcatRealizado: true as const,
  ltcatData: "2026-09-01",
  enviadoPedro: true as const,
};
assert.equal(isLaudosEtapaConcluida("pgr_pcmso_ltcat", semAnexo), true);

const bad = new File([new Uint8Array([1, 2, 3])], "x.exe", {
  type: "application/octet-stream",
});
assert.throws(
  () => validateLaudosSstAnexoFile(bad),
  (err: unknown) => err instanceof LaudosSstAnexoValidationError
);

console.log("test-laudos-sst-anexos: ok");
