const Module = require("module");
const path = require("path");

const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = path.join(process.cwd(), request.slice(2));
  }
  return orig.call(this, request, parent, isMain, options);
};

require("jiti/register");

const scripts = process.argv.slice(2);
if (scripts.length === 0) {
  console.error("Usage: node scripts/run-ts-test.js <script.ts> [...]");
  process.exit(1);
}

for (const script of scripts) {
  require(path.resolve(script));
}
