/**
 * Limite de 20 MB do PDF final do Laudo AET.
 * Executar: npx tsx scripts/test-aet-laudo-pdf-limite.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateAetElaboracaoPayload } from "../lib/implantacao-aet";
import type { ImplantacaoAetRecord } from "../lib/implantacao-aet";
import {
  LAUDOS_SST_ANEXO_MAX_BYTES,
  LAUDOS_SST_ANEXO_TAMANHO_INVALIDO_MSG,
  validateLaudosSstAnexoFile,
} from "../lib/laudos-sst-anexos";
import {
  AET_LAUDO_PDF_FORMATO_HINT,
  AET_LAUDO_PDF_MAX_BYTES,
  AET_LAUDO_PDF_TAMANHO_MSG,
  ORCAMENTO_ONBOARDING_MAX_BYTES,
  substituirAnexoPreservandoAnterior,
  validateAetDocumentoEmpresaFile,
  validateAetLaudoPdfFile,
  validateOrcamentoContratoPdfFile,
  validateOrcamentoListaFuncionariosFile,
  validateOrcamentoLogoFile,
} from "../lib/orcamento-onboarding-files";

const MB = 1024 * 1024;
const aetPdf = {
  maxBytes: AET_LAUDO_PDF_MAX_BYTES,
  oversizeMessage: AET_LAUDO_PDF_TAMANHO_MSG,
};

function arquivo(name: string, size: number, type = "application/pdf"): File {
  return { name, size, type } as File;
}

assert.equal(AET_LAUDO_PDF_MAX_BYTES, 20 * MB);
assert.equal(ORCAMENTO_ONBOARDING_MAX_BYTES, 10 * MB);
assert.equal(LAUDOS_SST_ANEXO_MAX_BYTES, 10 * MB);
assert.equal(AET_LAUDO_PDF_TAMANHO_MSG, "O Laudo AET deve ter no máximo 20 MB.");
assert.equal(AET_LAUDO_PDF_FORMATO_HINT, "Formato PDF • Tamanho máximo: 20 MB");

validateAetLaudoPdfFile(arquivo("laudo.pdf", 10 * MB + 1), aetPdf);
validateAetLaudoPdfFile(arquivo("laudo.pdf", 15 * MB), aetPdf);
validateAetLaudoPdfFile(arquivo("LAUDO.PDF", 20 * MB), aetPdf);

assert.throws(
  () => validateAetLaudoPdfFile(arquivo("laudo.pdf", 20 * MB + 1), aetPdf),
  (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, "O Laudo AET deve ter no máximo 20 MB.");
    return true;
  }
);

assert.throws(
  () => validateAetLaudoPdfFile(arquivo("laudo.docx", 1024), aetPdf),
  /O Laudo AET final deve ser um arquivo PDF\./
);
assert.throws(
  () => validateAetLaudoPdfFile(arquivo("laudo.pdf", 0), aetPdf),
  /Selecione o PDF do Laudo AET\./
);

assert.throws(
  () => validateAetLaudoPdfFile(arquivo("laudo.pdf", 10 * MB + 1)),
  /O Laudo AET deve ter no máximo 10 MB\./
);

assert.throws(
  () =>
    validateOrcamentoListaFuncionariosFile(
      arquivo("lista.xlsx", 10 * MB + 1, "application/vnd.ms-excel")
    ),
  /A lista de funcionários deve ter no máximo 10 MB\./
);
assert.throws(
  () => validateOrcamentoContratoPdfFile(arquivo("contrato.pdf", 10 * MB + 1)),
  /O contrato deve ter no máximo 10 MB\./
);
assert.throws(
  () =>
    validateOrcamentoLogoFile(
      arquivo("logo.png", 10 * MB + 1, "image/png")
    ),
  /A logomarca deve ter no máximo 10 MB\./
);
assert.throws(
  () =>
    validateAetDocumentoEmpresaFile(
      arquivo("doc.pdf", 10 * MB + 1, "application/pdf")
    ),
  /O documento deve ter no máximo 10 MB\./
);
assert.throws(
  () =>
    validateLaudosSstAnexoFile(
      arquivo("pgr.pdf", 10 * MB + 1, "application/pdf")
    ),
  (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, LAUDOS_SST_ANEXO_TAMANHO_INVALIDO_MSG);
    return true;
  }
);

async function verificarSubstituicao() {
const removidosNaFalhaDeEnvio: string[] = [];
let persistiuNaFalhaDeEnvio = false;
await assert.rejects(
  substituirAnexoPreservandoAnterior({
    caminhoAnterior: "ap1/aet_laudo-anterior.pdf",
    enviarNovo: async () => {
      throw new Error(AET_LAUDO_PDF_TAMANHO_MSG);
    },
    persistir: async () => {
      persistiuNaFalhaDeEnvio = true;
    },
    removerNovoSeFalhar: async (path) => {
      removidosNaFalhaDeEnvio.push(path);
    },
    removerAnteriorAposSucesso: async (path) => {
      removidosNaFalhaDeEnvio.push(`anterior:${path}`);
    },
  }),
  (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, AET_LAUDO_PDF_TAMANHO_MSG);
    return true;
  }
);
assert.equal(persistiuNaFalhaDeEnvio, false);
assert.deepEqual(removidosNaFalhaDeEnvio, []);

const removidosNaFalhaDeGravacao: string[] = [];
await assert.rejects(
  substituirAnexoPreservandoAnterior({
    caminhoAnterior: "ap1/aet_laudo-anterior.pdf",
    enviarNovo: async () => ({ path: "ap1/aet_laudo-novo.pdf", nome: "novo.pdf" }),
    persistir: async () => {
      throw new Error("falha ao gravar");
    },
    removerNovoSeFalhar: async (path) => {
      removidosNaFalhaDeGravacao.push(path);
    },
    removerAnteriorAposSucesso: async (path) => {
      removidosNaFalhaDeGravacao.push(`anterior:${path}`);
    },
  })
);
assert.deepEqual(removidosNaFalhaDeGravacao, ["ap1/aet_laudo-novo.pdf"]);

const ordemSucesso: string[] = [];
const salvo = await substituirAnexoPreservandoAnterior({
  caminhoAnterior: "ap1/aet_laudo-anterior.pdf",
  enviarNovo: async () => ({ path: "ap1/aet_laudo-novo.pdf" }),
  persistir: async () => {
    ordemSucesso.push("persistir");
  },
  removerNovoSeFalhar: async () => {
    ordemSucesso.push("remover-novo");
  },
  removerAnteriorAposSucesso: async (path) => {
    ordemSucesso.push(`remover-anterior:${path}`);
  },
});
assert.equal(salvo.path, "ap1/aet_laudo-novo.pdf");
assert.deepEqual(ordemSucesso, [
  "persistir",
  "remover-anterior:ap1/aet_laudo-anterior.pdf",
]);

const salvoComLimpezaFalhou = await substituirAnexoPreservandoAnterior({
  caminhoAnterior: "ap1/aet_laudo-anterior.pdf",
  enviarNovo: async () => ({ path: "ap1/aet_laudo-novo.pdf" }),
  persistir: async () => {},
  removerNovoSeFalhar: async () => {
    throw new Error("nao deveria remover o novo");
  },
  removerAnteriorAposSucesso: async () => {
    throw new Error("falha ao apagar anterior");
  },
});
assert.equal(salvoComLimpezaFalhou.path, "ap1/aet_laudo-novo.pdf");
}

const aetSemPdf = {
  visita_status: "realizada",
  elaboracao_status: "aguardando",
  laudo_path: null,
} as ImplantacaoAetRecord;
assert.equal(
  validateAetElaboracaoPayload(
    { elaboracao_status: "concluido", elaboracao_observacao: null },
    aetSemPdf,
    "aet"
  ),
  "Anexe o Laudo AET final antes de concluir esta etapa."
);
assert.equal(
  validateAetElaboracaoPayload(
    { elaboracao_status: "concluido", elaboracao_observacao: null },
    {
      ...aetSemPdf,
      laudo_path: "ap1/aet_laudo-1.pdf",
    },
    "aet"
  ),
  null
);

const ui = readFileSync(
  join(process.cwd(), "components/orcamentos/OrcamentoAbasAet.tsx"),
  "utf8"
);
assert.match(ui, /kind === "aet"/);
assert.match(ui, /AET_LAUDO_PDF_FORMATO_HINT/);
assert.doesNotMatch(ui, /Tamanho máximo: 10 MB/);

const hook = readFileSync(
  join(process.cwd(), "hooks/useOrcamentoAetEtapas.ts"),
  "utf8"
);
assert.match(hook, /kind === "aet"/);
assert.match(hook, /substituirAnexoPreservandoAnterior/);
assert.doesNotMatch(
  hook,
  /if \(aet\.laudo_path\) \{\s*await removerArquivoOrcamentoOnboarding\(aet\.laudo_path\);\s*\}/
);
assert.match(hook, /obterUrlOrcamentoOnboarding\(path\)/);
const reload = hook.slice(hook.indexOf("const reload"), hook.indexOf("async function audit"));
assert.doesNotMatch(reload, /obterUrlOrcamentoOnboarding|uploadAetLaudoPdf/);

const salvarLaudo = readFileSync(
  join(process.cwd(), "services/implantacao-aet.service.ts"),
  "utf8"
);
const blocoSalvarLaudo = salvarLaudo.slice(
  salvarLaudo.indexOf("export async function salvarLaudoAet"),
  salvarLaudo.indexOf("export async function removerLaudoAet")
);
assert.match(blocoSalvarLaudo, /laudo_path: params\.fileMeta\.path/);
assert.doesNotMatch(blocoSalvarLaudo, /elaboracao_status/);

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/140_aet_laudo_pdf_20mb.sql"),
  "utf8"
);
const sql = migration.replace(/--.*$/gm, "");
assert.match(sql, /file_size_limit = 20971520/);
assert.match(sql, /id = 'orcamentos-onboarding'/);
assert.doesNotMatch(sql, /laudos-sst-anexos/);
assert.doesNotMatch(sql, /allowed_mime_types/);

verificarSubstituicao()
  .then(() => {
    console.log("test-aet-laudo-pdf-limite: ok");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
