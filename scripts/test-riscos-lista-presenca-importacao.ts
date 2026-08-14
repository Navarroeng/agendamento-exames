/**
 * Importação automática ao receber Lista de Presença em Excel.
 * Executar: npx tsx scripts/test-riscos-lista-presenca-importacao.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isArquivoExcelListaPresenca } from "../lib/riscos-lista-presenca";
import {
  MSG_IMPORTACAO_LISTA_FALHOU,
  mensagemErroImportacaoLista,
  mensagemSucessoRecebimentoComImportacao,
  podeConcluirRecebimentoComExcel,
  resumirAvaliacaoImportacaoLista,
} from "../lib/riscos-lista-presenca-importacao";
import {
  avaliarLinhasImportacaoParticipantes,
  parseParticipantesExcelDetalhado,
  RISCOS_IMPORT_HEADERS,
} from "../lib/riscos-participantes-excel";
import * as XLSX from "xlsx";
import { isValidCPF } from "../lib/cpf";

const CPF_A = "52998224725";
const CPF_B = "39053344705";
assert.ok(isValidCPF(CPF_A));
assert.ok(isValidCPF(CPF_B));

function buildWorkbook(rows: unknown[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Participantes");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  if (out instanceof ArrayBuffer) return out;
  if (out instanceof Uint8Array) {
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
  }
  return new Uint8Array(out as ArrayLike<number>).buffer;
}

assert.equal(isArquivoExcelListaPresenca("lista.xlsx"), true);
assert.equal(isArquivoExcelListaPresenca("lista.xls"), true);
assert.equal(isArquivoExcelListaPresenca("lista.XLSX"), true);
assert.equal(isArquivoExcelListaPresenca("lista.pdf"), false);
assert.equal(isArquivoExcelListaPresenca("foto.png"), false);
assert.equal(isArquivoExcelListaPresenca("foto.jpg"), false);
assert.equal(isArquivoExcelListaPresenca("foto.jpeg"), false);
assert.equal(
  isArquivoExcelListaPresenca(
    "x.bin",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ),
  true
);

const excelOk = parseParticipantesExcelDetalhado(
  buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["Ana", CPF_A, "15/03/1990"],
    ["Bruno", CPF_B, "01/01/1985"],
  ])
);
assert.equal(excelOk.ok, true);
if (excelOk.ok) {
  const av = avaliarLinhasImportacaoParticipantes({ linhas: excelOk.linhas });
  assert.equal(podeConcluirRecebimentoComExcel({ parseOk: true, avaliadas: av.avaliadas }), true);
  assert.equal(resumirAvaliacaoImportacaoLista(av.avaliadas).prontos, 2);
}

const excelInvalido = parseParticipantesExcelDetalhado(
  buildWorkbook([
    ["Nome", "Documento", "Nasc"],
    ["Ana", CPF_A, "15/03/1990"],
  ])
);
assert.equal(excelInvalido.ok, false);
assert.equal(
  podeConcluirRecebimentoComExcel({ parseOk: false, avaliadas: [] }),
  false
);
if (!excelInvalido.ok) {
  const msg = mensagemErroImportacaoLista({ parseError: excelInvalido.error });
  assert.match(msg, new RegExp(MSG_IMPORTACAO_LISTA_FALHOU));
  assert.match(msg, /Faltando|Cabeçalho/i);
}

const cpfRuim = parseParticipantesExcelDetalhado(
  buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["Gina", "123.456.789-00", "01/01/1990"],
  ])
);
assert.equal(cpfRuim.ok, true);
if (cpfRuim.ok) {
  const av = avaliarLinhasImportacaoParticipantes({ linhas: cpfRuim.linhas });
  assert.equal(podeConcluirRecebimentoComExcel({ parseOk: true, avaliadas: av.avaliadas }), false);
  const msg = mensagemErroImportacaoLista({ avaliadas: av.avaliadas });
  assert.match(msg, /CPF/i);
}

const duplicadoCampanha = avaliarLinhasImportacaoParticipantes({
  linhas: [
    { linha: 2, nomeCompleto: "Ana", cpf: CPF_A, dataNascimento: "01/01/1990" },
  ],
  cpfsNaCampanha: [CPF_A],
});
assert.equal(duplicadoCampanha.avaliadas[0].situacao, "cpf_ja_na_campanha");
assert.equal(
  podeConcluirRecebimentoComExcel({
    parseOk: true,
    avaliadas: duplicadoCampanha.avaliadas,
  }),
  true
);
assert.equal(resumirAvaliacaoImportacaoLista(duplicadoCampanha.avaliadas).jaExistentes, 1);

const toastTodosNovos = mensagemSucessoRecebimentoComImportacao({
  importados: 4,
  jaExistentes: 0,
  erros: 0,
});
assert.match(toastTodosNovos.titulo, /4 participantes importados/);

const toastMisto = mensagemSucessoRecebimentoComImportacao({
  importados: 3,
  jaExistentes: 1,
  erros: 0,
});
assert.match(toastMisto.titulo, /Lista recebida e participantes importados/);
assert.match(String(toastMisto.descricao), /3 participantes importados/);
assert.match(String(toastMisto.descricao), /1 já existente/);

const root = process.cwd();
const tab = readFileSync(
  join(root, "components/riscos-psicossociais/RiscosListaPresencaTab.tsx"),
  "utf8"
);
const participantes = readFileSync(
  join(root, "components/riscos-psicossociais/RiscosCampanhaParticipantesSection.tsx"),
  "utf8"
);
const hook = readFileSync(join(root, "hooks/useRiscosPsicossociaisPage.ts"), "utf8");

assert.match(tab, /downloadModeloImportacaoParticipantesExcel/);
assert.match(tab, /Baixar modelo/);
assert.match(tab, /Ao salvar, os participantes serão importados automaticamente/);
assert.match(participantes, /Importar Excel/);
assert.match(participantes, /downloadModeloImportacaoParticipantesExcel/);
assert.match(hook, /handlePrepararImportacaoParticipantesExcel\(file\)/);
assert.match(hook, /confirmarImportacaoParticipantesCampanha/);
assert.match(hook, /isArquivoExcelListaPresenca/);
assert.doesNotMatch(hook, /from\("esocial"/);

console.log("test-riscos-lista-presenca-importacao: OK");
