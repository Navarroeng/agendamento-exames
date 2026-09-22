/**
 * Lista de funcionários: ordem visual, maiúsculas e exportação Excel.
 * Executar: node scripts/run-ts-test.js scripts/test-lista-funcionarios-ux.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import {
  emptyVagaDraft,
  normalizeNomeOcupante,
  type ContratoVagaDraft,
} from "../lib/contrato-vagas";
import {
  aplicarImportacaoNasVagas,
  gerarListaFuncionariosXlsx,
  parsePlanilhaListaFuncionarios,
} from "../lib/contrato-vagas-import";
import {
  buildLinhasVisuaisListaFuncionarios,
  buildListaFuncionariosExportRows,
  cycleListaFuncionariosNomeSort,
  nomeArquivoListaFuncionariosExport,
} from "../lib/contrato-vagas-lista";
import { formatUppercaseInput, normalizeUppercaseField } from "../lib/text-normalize";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function draft(
  indice: number,
  colaborador: string,
  extra?: Partial<ContratoVagaDraft>
): ContratoVagaDraft {
  return {
    ...emptyVagaDraft(indice),
    id: `vaga-${indice}`,
    colaborador,
    colaboradorCpf: extra?.colaboradorCpf ?? "",
    cargoNome: extra?.cargoNome ?? "",
    cargoId: extra?.cargoId ?? null,
    manterAsoAberto: extra?.manterAsoAberto ?? false,
  };
}

run("nomes A–Z por padrão, vagas vazias no fim", () => {
  const linhas = buildLinhasVisuaisListaFuncionarios(
    [
      draft(1, "Carlos Souza", { colaboradorCpf: "52998224725" }),
      draft(2, ""),
      draft(3, "Ana Lima", { colaboradorCpf: "39053344705" }),
    ],
    "asc"
  );
  assert.deepEqual(
    linhas.map((l) => l.draft.colaborador),
    ["Ana Lima", "Carlos Souza", ""]
  );
  assert.deepEqual(
    linhas.map((l) => l.numeroVisual),
    [1, 2, 3]
  );
  assert.equal(linhas[0].draft.indice, 3);
  assert.equal(linhas[0].draft.id, "vaga-3");
  assert.equal(linhas[1].draft.id, "vaga-1");
  assert.equal(linhas[2].draft.indice, 2);
});

run("alternância para Z–A e numeração visual acompanha", () => {
  assert.equal(cycleListaFuncionariosNomeSort("asc"), "desc");
  assert.equal(cycleListaFuncionariosNomeSort("desc"), "asc");
  const linhas = buildLinhasVisuaisListaFuncionarios(
    [
      draft(8, "Bruno"),
      draft(2, "Ana"),
      draft(5, "Carla"),
    ],
    "desc"
  );
  assert.deepEqual(
    linhas.map((l) => l.draft.colaborador),
    ["Carla", "Bruno", "Ana"]
  );
  assert.deepEqual(
    linhas.map((l) => [l.numeroVisual, l.draft.indice, l.draft.id]),
    [
      [1, 5, "vaga-5"],
      [2, 8, "vaga-8"],
      [3, 2, "vaga-2"],
    ]
  );
});

run("UUID/vaga continua o mesmo depois de ordenar", () => {
  const originais = [
    draft(10, "Zeca"),
    draft(11, "Bia"),
  ];
  const linhas = buildLinhasVisuaisListaFuncionarios(originais, "asc");
  assert.equal(linhas[0].draft.id, "vaga-11");
  assert.equal(linhas[0].draft.indice, 11);
  assert.equal(originais[0].id, "vaga-10");
  assert.equal(originais[0].indice, 10);
});

run("digitação em minúsculas persiste em maiúsculas, com acento", () => {
  assert.equal(
    formatUppercaseInput("Boanergis Alves Viana"),
    "BOANERGIS ALVES VIANA"
  );
  assert.equal(
    normalizeUppercaseField("  José   da Conceição  "),
    "JOSÉ DA CONCEIÇÃO"
  );
  assert.equal(
    normalizeNomeOcupante("Ajudante Geral"),
    "AJUDANTE GERAL"
  );
  assert.equal(normalizeNomeOcupante("josé da conceição"), "JOSÉ DA CONCEIÇÃO");
});

run("importação Excel normaliza nome e cargo para maiúsculas", () => {
  const parsed = parsePlanilhaListaFuncionarios([
    ["Nome do funcionário", "CPF", "Cargo"],
    ["Boanergis Alves Viana", "529.982.247-25", "Ajudante Geral"],
    ["josé da conceição", "39053344705", "assistente de export"],
  ]);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.rows[0].nome, "BOANERGIS ALVES VIANA");
  assert.equal(parsed.rows[0].cargo, "AJUDANTE GERAL");
  assert.equal(parsed.rows[1].nome, "JOSÉ DA CONCEIÇÃO");
  assert.equal(parsed.rows[1].cargo, "ASSISTENTE DE EXPORT");

  const aplicados = aplicarImportacaoNasVagas({
    atuais: [emptyVagaDraft(1), emptyVagaDraft(2)],
    importados: parsed.rows,
    quantidadePrevista: 2,
    sobrescreverPreenchidas: true,
    cargos: [{ id: "cargo-aux", nome: "Ajudante Geral" }],
  });
  assert.equal(aplicados.drafts[0].colaborador, "BOANERGIS ALVES VIANA");
  assert.equal(aplicados.drafts[0].cargoNome, "AJUDANTE GERAL");
  assert.equal(aplicados.drafts[0].cargoId, "cargo-aux");
  assert.equal(aplicados.drafts[1].cargoNome, "ASSISTENTE DE EXPORT");
  assert.equal(aplicados.drafts[1].cargoId, null);
});

run("cargo livre em maiúsculas não cria cargo no catálogo", () => {
  const src = read("lib/contrato-vagas-import.ts");
  assert.doesNotMatch(src, /criarCargoComExames/);
  const ui = read("components/orcamentos/OrcamentoAbaFuncionarios.tsx");
  assert.doesNotMatch(ui, /criarCargoComExames/);
  const aplicados = aplicarImportacaoNasVagas({
    atuais: [emptyVagaDraft(1)],
    importados: [
      {
        linha: 2,
        nome: "GABRIEL CONCEIÇÃO DOS SANTOS",
        cpf: "413.832.128-48",
        cpfDigits: "41383212848",
        cargo: "ASSISTENTE DE EXPORT",
      },
    ],
    quantidadePrevista: 1,
    sobrescreverPreenchidas: true,
    cargos: [{ id: "cargo-exp", nome: "Assistente de Exportação" }],
  });
  assert.equal(aplicados.drafts[0].cargoId, null);
  assert.equal(aplicados.drafts[0].cargoNome, "ASSISTENTE DE EXPORT");
});

run("exportação contém colaboradores corretos na ordem atual", () => {
  const drafts = [
    {
      ...draft(4, "Zeca", {
        colaboradorCpf: "52998224725",
        cargoNome: "Motorista",
      }),
    },
    {
      ...draft(1, "Ana", {
        colaboradorCpf: "39053344705",
        cargoNome: "Auxiliar",
      }),
    },
  ];
  const vagaByIndice = new Map([
    [4, { id: "uuid-zeca", status: "comprometida" as const }],
    [1, { id: "uuid-ana", status: "agendada" as const }],
  ]);
  const linhasAsc = buildLinhasVisuaisListaFuncionarios(drafts, "asc");
  const exportAsc = buildListaFuncionariosExportRows({
    linhas: linhasAsc,
    vagaByIndice,
  });
  assert.equal(exportAsc[0].nome, "ANA");
  assert.equal(exportAsc[0].numeroVisual, 1);
  assert.equal(exportAsc[0].vagaId, "uuid-ana");
  assert.equal(exportAsc[0].indice, 1);
  assert.equal(exportAsc[0].situacao, "Agendado");
  assert.equal(exportAsc[1].nome, "ZECA");
  assert.equal(exportAsc[1].situacao, "Comprometido");
  assert.equal(exportAsc[1].vagaId, "uuid-zeca");

  const linhasDesc = buildLinhasVisuaisListaFuncionarios(drafts, "desc");
  const exportDesc = buildListaFuncionariosExportRows({
    linhas: linhasDesc,
    vagaByIndice,
  });
  assert.equal(exportDesc[0].nome, "ZECA");
  assert.equal(exportDesc[0].numeroVisual, 1);
  assert.equal(exportDesc[0].vagaId, "uuid-zeca");
  assert.equal(exportDesc[1].nome, "ANA");
  assert.equal(exportDesc[1].situacao, "Agendado");

  const buf = gerarListaFuncionariosXlsx(exportAsc);
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets["Funcionários"];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  assert.deepEqual(rows[0], [
    "#",
    "Nome do funcionário",
    "CPF",
    "Cargo",
    "Situação",
  ]);
  assert.equal(String(rows[1][1]), "ANA");
  assert.equal(String(rows[1][4]), "Agendado");
  assert.equal(String(rows[2][1]), "ZECA");
  assert.equal(String(rows[2][4]), "Comprometido");
});

run("situação exportada usa os labels da interface", () => {
  const programada = buildListaFuncionariosExportRows({
    linhas: buildLinhasVisuaisListaFuncionarios(
      [draft(1, "Ana", { colaboradorCpf: "39053344705" })],
      "asc"
    ),
    vagaByIndice: new Map([
      [1, { id: "v1", status: "programada" }],
    ]),
  });
  assert.equal(programada[0].situacao, "Programado");

  const aberto = buildListaFuncionariosExportRows({
    linhas: buildLinhasVisuaisListaFuncionarios(
      [{ ...emptyVagaDraft(2), id: "v2", manterAsoAberto: true }],
      "asc"
    ),
    vagaByIndice: new Map(),
  });
  assert.equal(aberto[0].situacao, "ASO em aberto");
});

run("nome do arquivo de exportação", () => {
  assert.equal(
    nomeArquivoListaFuncionariosExport({
      clienteNome: "FESHI SERVICOS ADUANEIROS E TRANSPORTES LTDA",
      data: new Date(2026, 8, 22),
    }),
    "Lista_Funcionarios_FESHI_SERVICOS_ADUANEIROS_E_TRANSPORTES_LTDA_2026-09-22.xlsx"
  );
});

run("salvar lista normaliza cargo_nome e a UI não reordena o estado", () => {
  const svc = read("services/contrato-vagas.service.ts");
  assert.match(svc, /cargoNome = normalizeNomeOcupante\(draft\.cargoNome\)/);
  const ui = read("components/orcamentos/OrcamentoAbaFuncionarios.tsx");
  assert.match(ui, /buildLinhasVisuaisListaFuncionarios\(/);
  assert.match(ui, /drafts\.slice\(0, quantidadePrevista\)/);
  assert.match(ui, /patchDraft\(row\.indice/);
  assert.doesNotMatch(ui, /setDrafts\(.*orderDraftsListaFuncionarios/);
});

console.log("test-lista-funcionarios-ux: OK");
