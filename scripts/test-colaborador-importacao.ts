import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { isValidCPF } from "../lib/cpf";
import { isUuid } from "../lib/colaborador-movimentacoes";
import {
  COLABORADOR_IMPORT_ABA,
  COLABORADOR_IMPORT_ABA_INSTRUCOES,
  MENSAGEM_IMPORT_CPF,
  MENSAGEM_IMPORT_CPF_REPETIDO,
  MENSAGEM_IMPORT_DATA,
  MENSAGEM_IMPORT_NOME,
  avaliarImportacaoColaboradores,
  dataAdmissaoDaCelula,
  gerarModeloColaboradoresXlsx,
  lerMotivoLoteImportacao,
  lerPlanilhaColaboradores,
  motivoLoteImportacao,
} from "../lib/colaborador-importacao";
import { idLinhaImportacao } from "../lib/colaborador-importacao-id";
import { consolidarPortalColaboradores } from "../lib/portal-colaboradores";

function cpfComNove(nove: string): string {
  const nums = nove.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += nums[i] * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  sum = 0;
  for (let i = 0; i < 9; i += 1) sum += nums[i] * (11 - i);
  sum += d1 * 2;
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return `${nove}${d1}${d2}`;
}

const CPF_ZERO = cpfComNove("012345678");
const CPF_B = "39053344705";
assert.equal(isValidCPF(CPF_ZERO), true);
assert.equal(CPF_ZERO.startsWith("0"), true);

const modelo = gerarModeloColaboradoresXlsx();
const lidoVazio = lerPlanilhaColaboradores(modelo);
assert.equal(lidoVazio.ok, true);
if (lidoVazio.ok) assert.equal(lidoVazio.linhas.length, 0);

const wb = XLSX.read(modelo, { type: "array", cellNF: true });
assert.ok(wb.SheetNames.includes(COLABORADOR_IMPORT_ABA));
assert.ok(wb.SheetNames.includes(COLABORADOR_IMPORT_ABA_INSTRUCOES));
const sheet = wb.Sheets[COLABORADOR_IMPORT_ABA];
assert.equal(sheet.B2?.z, "@");
assert.equal(sheet.D2?.z, "dd/mm/yyyy");
sheet.A2 = { t: "s", v: "MARIA SILVA" };
sheet.B2 = { t: "s", v: CPF_ZERO };
sheet.C2 = { t: "s", v: "ANALISTA" };
sheet.D2 = { t: "s", v: "01/03/2024" };
sheet.A3 = { t: "s", v: "SEM DOCUMENTO" };
sheet.B3 = { t: "s", v: "" };
sheet.C3 = { t: "s", v: "AUXILIAR" };
sheet.A4 = { t: "s", v: "SEM DOCUMENTO" };
sheet.B4 = { t: "s", v: "" };
sheet.C4 = { t: "s", v: "AUXILIAR" };
const preenchido = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
const relido = lerPlanilhaColaboradores(preenchido);
assert.equal(relido.ok, true);
if (!relido.ok) throw new Error("planilha");
assert.equal(relido.linhas[0].cpf, CPF_ZERO);
assert.equal(relido.linhas[0].dataAdmissao, "2024-03-01");
assert.equal(relido.linhas[1].cpf, "");
assert.equal(relido.linhas[2].nome, "SEM DOCUMENTO");

const previa = avaliarImportacaoColaboradores({
  linhas: relido.linhas,
  cpfsDaEmpresa: [],
});
assert.equal(previa.podeConfirmar, true);
assert.equal(previa.novos.length, 3);
assert.equal(previa.novos.filter((linha) => linha.nome === "SEM DOCUMENTO").length, 2);
assert.equal(previa.existentes.length, 0);

const empresaA = avaliarImportacaoColaboradores({
  linhas: relido.linhas,
  cpfsDaEmpresa: [CPF_ZERO],
});
const empresaB = avaliarImportacaoColaboradores({
  linhas: relido.linhas,
  cpfsDaEmpresa: [CPF_B],
});
assert.equal(empresaA.existentes.length, 1);
assert.equal(empresaA.novos.length, 2);
assert.equal(empresaA.existentes[0].cpf, CPF_ZERO);
assert.equal(empresaB.existentes.length, 0);
assert.equal(empresaB.novos.length, 3);

const serial = Math.round(
  (Date.UTC(2024, 2, 1) - Date.UTC(1899, 11, 30)) / 86400000
);
assert.deepEqual(dataAdmissaoDaCelula(serial), {
  iso: "2024-03-01",
  invalida: false,
});
assert.equal(dataAdmissaoDaCelula("31/02/2024").invalida, true);
assert.equal(dataAdmissaoDaCelula("").invalida, false);

const comErros = avaliarImportacaoColaboradores({
  linhas: [
    {
      linha: 2,
      nome: "",
      cpf: CPF_ZERO,
      cargo: "",
      dataAdmissao: "",
    },
    {
      linha: 3,
      nome: "JOAO",
      cpf: "123",
      cargo: "",
      dataAdmissao: "",
    },
    {
      linha: 4,
      nome: "ANA",
      cpf: CPF_B,
      cargo: "",
      dataAdmissao: "__invalida__:31/02/2024",
    },
    {
      linha: 5,
      nome: "PEDRO",
      cpf: CPF_B,
      cargo: "",
      dataAdmissao: "2024-04-01",
    },
    {
      linha: 6,
      nome: "RITA",
      cpf: CPF_B,
      cargo: "",
      dataAdmissao: "",
    },
  ],
  cpfsDaEmpresa: [],
});
assert.equal(comErros.podeConfirmar, false);
assert.ok(comErros.erros.some((erro) => erro.linha === 2 && erro.motivo === MENSAGEM_IMPORT_NOME));
assert.ok(comErros.erros.some((erro) => erro.linha === 3 && erro.motivo === MENSAGEM_IMPORT_CPF));
assert.ok(comErros.erros.some((erro) => erro.linha === 4 && erro.motivo === MENSAGEM_IMPORT_DATA));
assert.ok(
  comErros.erros.filter((erro) => erro.motivo === MENSAGEM_IMPORT_CPF_REPETIDO).length >= 2
);
assert.equal(comErros.novos.length, 0);

const planilhaNumero = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  planilhaNumero,
  XLSX.utils.aoa_to_sheet([
    ["Nome", "CPF", "Cargo", "Data de admissão"],
    ["MARIA", Number(CPF_ZERO.slice(1)), "ANALISTA", ""],
  ]),
  COLABORADOR_IMPORT_ABA
);
const lidoNumero = lerPlanilhaColaboradores(
  XLSX.write(planilhaNumero, { type: "array", bookType: "xlsx" }) as ArrayBuffer
);
assert.equal(lidoNumero.ok, true);
if (!lidoNumero.ok) throw new Error("cpf numerico");
assert.equal(lidoNumero.linhas[0].cpf, CPF_ZERO);

const confirmacao = "11111111-1111-4111-8111-111111111111";
const idA = idLinhaImportacao(confirmacao, 2);
const idB = idLinhaImportacao(confirmacao, 2);
assert.equal(idA, idB);
assert.equal(isUuid(idA), true);
assert.notEqual(idLinhaImportacao(confirmacao, 3), idA);
assert.deepEqual(lerMotivoLoteImportacao(motivoLoteImportacao(3, 2)), {
  adicionados: 3,
  jaCadastrados: 2,
});

const linhas = consolidarPortalColaboradores({
  vagas: [],
  agendamentos: [],
  movimentacoes: [
    {
      id: confirmacao,
      tipo: "cadastro",
      cpf_digits: "",
      colaborador_nome: null,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      tipo: "cadastro",
      cpf_digits: "",
      colaborador_nome: "SEM DOCUMENTO",
      cargo_nome: "AUXILIAR",
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      tipo: "cadastro",
      cpf_digits: "",
      colaborador_nome: "SEM DOCUMENTO",
      cargo_nome: "AUXILIAR",
    },
  ],
});
assert.equal(linhas.length, 2);
assert.equal(linhas.filter((linha) => linha.situacao === "ativo").length, 2);

const rota = readFileSync(
  join(process.cwd(), "app/api/clientes/[clienteId]/colaboradores/importacao/route.ts"),
  "utf8"
);
assert.match(rota, /context\.params\.clienteId/);
assert.doesNotMatch(rota, /body\.clienteId/);

console.log("test-colaborador-importacao: ok");
