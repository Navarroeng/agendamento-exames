/**
 * Testes: importação Excel de participantes (Riscos Psicossociais).
 * Executar: npx tsx scripts/test-riscos-importacao-participantes-excel.ts
 */
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  avaliarLinhasImportacaoParticipantes,
  campanhaPermiteImportacaoParticipantes,
  gerarModeloImportacaoParticipantesExcel,
  parseParticipantesExcelDetalhado,
  RISCOS_IMPORT_HEADERS,
  type LinhaImportacaoParticipante,
} from "../lib/riscos-participantes-excel";
import { formatMotivoIgnoradoImportacao } from "../lib/riscos-cpf-campanha-ativa";
import { isValidCPF, normalizeCpfDigits } from "../lib/cpf";

function run(name: string, fn: () => void) {
  fn();
  console.log("OK ", name);
}

/** CPFs válidos para fixture. */
const CPF_A = "52998224725";
const CPF_B = "39053344705";
const CPF_C = "11144477735";

assert.ok(isValidCPF(CPF_A));
assert.ok(isValidCPF(CPF_B));
assert.ok(isValidCPF(CPF_C));

function buildWorkbook(rows: unknown[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Participantes");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  if (out instanceof ArrayBuffer) return out;
  if (out instanceof Uint8Array) {
    return out.buffer.slice(
      out.byteOffset,
      out.byteOffset + out.byteLength
    ) as ArrayBuffer;
  }
  return new Uint8Array(out as ArrayLike<number>).buffer;
}

function parseOk(buffer: ArrayBuffer): LinhaImportacaoParticipante[] {
  const parsed = parseParticipantesExcelDetalhado(buffer);
  assert.equal(parsed.ok, true, !parsed.ok ? parsed.error : "");
  return parsed.ok ? parsed.linhas : [];
}

run("1. Excel correto", () => {
  const buffer = buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["Ana Silva", CPF_A, "15/03/1990"],
  ]);
  const linhas = parseOk(buffer);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].nomeCompleto, "Ana Silva");
  assert.equal(normalizeCpfDigits(linhas[0].cpf), CPF_A);
  assert.equal(linhas[0].dataNascimento, "15/03/1990");
  assert.equal(linhas[0].email, undefined);

  const av = avaliarLinhasImportacaoParticipantes({ linhas });
  assert.equal(av.validos, 1);
  assert.equal(av.comErro, 0);
  assert.equal(av.avaliadas[0].situacao, "pronto");
});

run("2. Coluna extra de e-mail é ignorada", () => {
  const buffer = buildWorkbook([
    ["NOME COMPLETO", "CPF", "DATA DE NASCIMENTO", "E-MAIL"],
    ["Bruno Costa", CPF_B, "01/01/1985", "bruno@email.com"],
  ]);
  const linhas = parseOk(buffer);
  assert.equal(linhas[0].email, undefined);
  const av = avaliarLinhasImportacaoParticipantes({ linhas });
  assert.equal(av.validos, 1);
});

run("3. CPF formatado", () => {
  const buffer = buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["Carla", "529.982.247-25", "10/10/1992"],
  ]);
  const linhas = parseOk(buffer);
  const av = avaliarLinhasImportacaoParticipantes({ linhas });
  assert.equal(av.validos, 1);
  assert.equal(av.prontas[0].cpf, CPF_A);
});

run("4. CPF sem formatação", () => {
  const buffer = buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["Diego", CPF_A, "10/10/1992"],
  ]);
  const av = avaliarLinhasImportacaoParticipantes({
    linhas: parseOk(buffer),
  });
  assert.equal(av.validos, 1);
  assert.equal(av.prontas[0].cpf, CPF_A);
});

run("5. Data Excel (serial)", () => {
  // 15/03/1990 ≈ serial 32947 (Excel 1900 date system)
  const buffer = buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["Elena", CPF_A, 32947],
  ]);
  const linhas = parseOk(buffer);
  assert.match(linhas[0].dataNascimento, /^\d{2}\/\d{2}\/\d{4}$/);
  const av = avaliarLinhasImportacaoParticipantes({ linhas });
  assert.equal(av.validos, 1, av.avaliadas[0]?.motivo);
});

run("6. Data DD/MM/AAAA", () => {
  const buffer = buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["Fábio", CPF_A, "25/12/1988"],
  ]);
  const av = avaliarLinhasImportacaoParticipantes({
    linhas: parseOk(buffer),
  });
  assert.equal(av.validos, 1);
  assert.equal(av.prontas[0].dataNascimento, "25/12/1988");
});

run("7. CPF inválido", () => {
  const buffer = buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["Gina", "123.456.789-00", "01/01/1990"],
  ]);
  const av = avaliarLinhasImportacaoParticipantes({
    linhas: parseOk(buffer),
  });
  assert.equal(av.validos, 0);
  assert.equal(av.avaliadas[0].situacao, "cpf_invalido");
});

run("8. CPF duplicado no arquivo", () => {
  const buffer = buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["H1", CPF_A, "01/01/1990"],
    ["H2", "529.982.247-25", "02/02/1991"],
  ]);
  const av = avaliarLinhasImportacaoParticipantes({
    linhas: parseOk(buffer),
  });
  assert.equal(av.validos, 1);
  assert.equal(av.comErro, 1);
  assert.equal(av.avaliadas[1].situacao, "cpf_duplicado_arquivo");
});

run("9. CPF duplicado na própria campanha", () => {
  const linhas: LinhaImportacaoParticipante[] = [
    {
      linha: 2,
      nomeCompleto: "Iris",
      cpf: CPF_A,
      dataNascimento: "01/01/1990",
    },
  ];
  const av = avaliarLinhasImportacaoParticipantes({
    linhas,
    cpfsNaCampanha: [CPF_A],
  });
  assert.equal(av.validos, 0);
  assert.equal(av.avaliadas[0].situacao, "cpf_ja_na_campanha");
});

run("10. CPF em outra campanha ativa", () => {
  const linhas: LinhaImportacaoParticipante[] = [
    {
      linha: 2,
      nomeCompleto: "João",
      cpf: CPF_A,
      dataNascimento: "01/01/1990",
    },
  ];
  const motivo = formatMotivoIgnoradoImportacao({
    participanteId: "p1",
    campanhaId: "c1",
    empresaNome: "ACME",
    codigoPublico: "ABC123",
    status: "aberta",
  });
  assert.match(motivo, /CPF já cadastrado em outra campanha ativa/);
  assert.match(motivo, /ACME/);
  assert.match(motivo, /ABC123/);

  const av = avaliarLinhasImportacaoParticipantes({
    linhas,
    conflitosPorLinha: new Map([
      [
        2,
        {
          situacao: "cpf_outra_campanha_ativa",
          motivo,
        },
      ],
    ]),
  });
  assert.equal(av.validos, 0);
  assert.equal(av.avaliadas[0].situacao, "cpf_outra_campanha_ativa");
});

run("11. linha vazia (ignorada no parse)", () => {
  const buffer = buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["", "", ""],
    ["Karen", CPF_A, "01/01/1990"],
  ]);
  const parsed = parseParticipantesExcelDetalhado(buffer);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.linhas.length, 1);
  assert.equal(parsed.linhas[0].nomeCompleto, "Karen");
});

run("12. três colunas oficiais", () => {
  const buffer = buildWorkbook([
    ["NOME COMPLETO", "CPF", "DATA DE NASCIMENTO"],
    ["Lara", CPF_A, "01/01/1990"],
  ]);
  const parsed = parseParticipantesExcelDetalhado(buffer);
  assert.equal(parsed.ok, true, !parsed.ok ? parsed.error : "");
  if (!parsed.ok) return;
  assert.equal(parsed.linhas.length, 1);
  assert.equal(parsed.linhas[0].nomeCompleto, "Lara");
});

run("13. cabeçalho incorreto", () => {
  const buffer = buildWorkbook([
    ["Nome", "Documento", "Nasc"],
    ["Mara", CPF_A, "01/01/1990"],
  ]);
  // "Nome" mapeia para nomeCompleto; "Documento" não mapeia CPF → incompleto
  const parsed = parseParticipantesExcelDetalhado(buffer);
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.match(parsed.error, /Cabeçalho|Faltando/i);
});

run("14. campanha cancelada", () => {
  const msg = campanhaPermiteImportacaoParticipantes("cancelada");
  assert.ok(msg);
  assert.match(String(msg), /cancelada/i);

  const av = avaliarLinhasImportacaoParticipantes({
    linhas: [
      {
        linha: 2,
        nomeCompleto: "Nara",
        cpf: CPF_A,
        dataNascimento: "01/01/1990",
      },
    ],
    campanhaBloqueadaMotivo: msg,
  });
  assert.equal(av.validos, 0);
  assert.equal(av.avaliadas[0].situacao, "campanha_bloqueada");
});

run("15. campanha encerrada permite cadastro no mesmo ciclo", () => {
  assert.equal(campanhaPermiteImportacaoParticipantes("encerrada"), null);
  assert.equal(campanhaPermiteImportacaoParticipantes("em_preparacao"), null);
  assert.equal(campanhaPermiteImportacaoParticipantes("aberta"), null);
  assert.ok(campanhaPermiteImportacaoParticipantes("cancelada"));
});

run("16. importação parcial (válidas + inválidas)", () => {
  const buffer = buildWorkbook([
    [...RISCOS_IMPORT_HEADERS],
    ["Ok 1", CPF_A, "01/01/1990"],
    ["Bad CPF", "00000000000", "01/01/1990"],
    ["Ok 2", CPF_B, "02/02/1991"],
    ["Dup", CPF_A, "03/03/1992"],
  ]);
  const av = avaliarLinhasImportacaoParticipantes({
    linhas: parseOk(buffer),
    cpfsNaCampanha: [],
  });
  assert.equal(av.validos, 2);
  assert.equal(av.comErro, 2);
  assert.equal(av.prontas.length, 2);
  assert.deepEqual(
    av.prontas.map((p) => p.cpf).sort(),
    [CPF_A, CPF_B].sort()
  );
});

run("modelo oficial baixável", () => {
  const buffer = gerarModeloImportacaoParticipantesExcel();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const headers = (rows[0] ?? []).map((h) => String(h));
  assert.deepEqual(headers, ["NOME COMPLETO", "CPF", "DATA DE NASCIMENTO"]);
  assert.equal(headers.length, 3);

  const parsed = parseParticipantesExcelDetalhado(buffer);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.ok(parsed.linhas.length >= 1);
  assert.match(parsed.linhas[0].nomeCompleto, /EXEMPLO/i);
  assert.equal(parsed.linhas[0].email, undefined);
});

console.log("\nTodos os testes de importação Excel passaram.");
