import assert from "node:assert/strict";
import {
  AVALIACAO_DEMO_CODE,
  getAvaliacaoDemoInfo,
  isAvaliacaoDemoCodigo,
} from "../lib/avaliacao-demo";

assert.equal(isAvaliacaoDemoCodigo("DEMO01"), true);
assert.equal(isAvaliacaoDemoCodigo("demo01"), true);
assert.equal(isAvaliacaoDemoCodigo(" DEMO01 "), true);
assert.equal(isAvaliacaoDemoCodigo("5UA22W"), false);
assert.equal(isAvaliacaoDemoCodigo(""), false);
assert.equal(AVALIACAO_DEMO_CODE, "DEMO01");

const info = getAvaliacaoDemoInfo();
assert.equal(info.ok, true);
assert.equal(info.disponivel, true);
assert.equal(info.codigoPublico, "DEMO01");
assert.ok(info.empresaNome.includes("Demonstração"));

console.log("OK  modo DEMO isolado apenas para DEMO01");
