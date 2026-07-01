import assert from "node:assert/strict";
import {
  COMPROVANTE_MAX_BYTES,
  COMPROVANTE_OBRIGATORIO_MSG,
  COMPROVANTE_TAMANHO_INVALIDO_MSG,
  COMPROVANTE_TIPO_INVALIDO_MSG,
  ComprovanteValidationError,
  buildComprovanteStoragePath,
  getComprovanteExtension,
  validateComprovanteFile,
} from "../lib/fatura-comprovante";

function mockFile(
  name: string,
  size: number,
  type: string
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

assert.equal(getComprovanteExtension("recibo.PDF"), "pdf");
assert.equal(getComprovanteExtension("foto.jpeg"), "jpeg");
assert.equal(getComprovanteExtension("doc.txt"), null);

const validPdf = mockFile("comprovante.pdf", 1024, "application/pdf");
assert.doesNotThrow(() => validateComprovanteFile(validPdf));

const validJpg = mockFile("foto.jpg", 2048, "image/jpeg");
assert.doesNotThrow(() => validateComprovanteFile(validJpg));

const tooLarge = mockFile(
  "grande.pdf",
  COMPROVANTE_MAX_BYTES + 1,
  "application/pdf"
);
assert.throws(
  () => validateComprovanteFile(tooLarge),
  (err: unknown) =>
    err instanceof ComprovanteValidationError &&
    err.message === COMPROVANTE_TAMANHO_INVALIDO_MSG
);

const invalidType = mockFile("arquivo.exe", 512, "application/octet-stream");
assert.throws(
  () => validateComprovanteFile(invalidType),
  (err: unknown) =>
    err instanceof ComprovanteValidationError &&
    err.message === COMPROVANTE_TIPO_INVALIDO_MSG
);

const emptyFile = mockFile("vazio.pdf", 0, "application/pdf");
assert.throws(
  () => validateComprovanteFile(emptyFile),
  (err: unknown) =>
    err instanceof ComprovanteValidationError &&
    err.message === COMPROVANTE_OBRIGATORIO_MSG
);

const path = buildComprovanteStoragePath(
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "recibo.pdf"
);
assert.match(path, /^aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\/comprovante-\d+\.pdf$/);

console.log("test-fatura-comprovante: ok");
