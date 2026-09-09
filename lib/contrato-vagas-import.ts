/**
 * Importação / modelo Excel da lista de funcionários do contrato (XLSX/XLS/CSV).
 * Reutiliza SheetJS (`xlsx`) já presente no projeto.
 */

import * as XLSX from "xlsx";
import { isValidCPF, maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import {
  isNomeFuncionarioReal,
  normalizeNomeOcupante,
  type ContratoVagaDraft,
} from "@/lib/contrato-vagas";

export const CONTRATO_VAGAS_IMPORT_HEADERS = [
  "Nome do funcionário",
  "CPF",
  "Cargo",
] as const;

export const CONTRATO_VAGAS_SHEET_FUNCIONARIOS = "Funcionários";
export const CONTRATO_VAGAS_SHEET_INSTRUCOES = "Instruções";

export type ContratoVagaImportRow = {
  linha: number;
  nome: string;
  cpf: string;
  cpfDigits: string;
  cargo: string;
};

export type ContratoVagaImportResult = {
  ok: boolean;
  error: string | null;
  rows: ContratoVagaImportRow[];
  excedentes: ContratoVagaImportRow[];
  duplicados: string[];
  incompletos: number;
  errosLinha: string[];
};

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

type MappedField = "nome" | "cpf" | "cargo";

function mapHeaderKey(header: string): MappedField | null {
  const h = normalizeHeader(header);
  if (
    h === "nome" ||
    h === "nomedofuncionario" ||
    h === "nomefuncionario" ||
    h === "funcionario" ||
    h === "colaborador" ||
    h === "nomecompleto"
  ) {
    return "nome";
  }
  if (h === "cpf") return "cpf";
  if (
    h === "cargo" ||
    h === "funcao" ||
    h === "ocupacao" ||
    h === "funcaocargo"
  ) {
    return "cargo";
  }
  return null;
}

function cellStr(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    const asInt = Math.trunc(value);
    if (asInt === value) return String(asInt);
    return String(value);
  }
  return String(value).trim();
}

function isRowVazia(row: ContratoVagaImportRow): boolean {
  return !row.nome && !row.cpf && !row.cargo;
}

function failResult(error: string): ContratoVagaImportResult {
  return {
    ok: false,
    error,
    rows: [],
    excedentes: [],
    duplicados: [],
    incompletos: 0,
    errosLinha: [],
  };
}

export function mensagemColunasEsperadasListaFuncionarios(): string {
  return (
    "O arquivo não contém as colunas esperadas:\n" +
    "Nome do funcionário, CPF e Cargo."
  );
}

export function mensagemExcessoVagasListaFuncionarios(
  quantidadePrevista: number,
  quantidadeArquivo: number
): string {
  return (
    `O contrato possui ${quantidadePrevista} vagas, mas o arquivo contém ${quantidadeArquivo} funcionários.\n` +
    "Revise a planilha antes de continuar."
  );
}

export function sanitizeNumeroOrcamentoParaArquivo(
  numero: string | null | undefined
): string {
  const raw = String(numero ?? "")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return raw || "orcamento";
}

export function nomeArquivoModeloListaFuncionarios(
  numeroOrcamento?: string | null
): string {
  return `modelo_lista_funcionarios_${sanitizeNumeroOrcamentoParaArquivo(numeroOrcamento)}.xlsx`;
}

/** Gera ArrayBuffer do modelo oficial (.xlsx). */
export function gerarModeloListaFuncionariosXlsx(params: {
  quantidadePrevista: number;
}): ArrayBuffer {
  const n = Math.max(0, Math.floor(Number(params.quantidadePrevista) || 0));
  const aoa: string[][] = [[...CONTRATO_VAGAS_IMPORT_HEADERS]];
  for (let i = 0; i < n; i += 1) {
    aoa.push(["", "", ""]);
  }

  const sheetFuncionarios = XLSX.utils.aoa_to_sheet(aoa);
  sheetFuncionarios["!cols"] = [{ wch: 36 }, { wch: 18 }, { wch: 28 }];

  const instrucoes = XLSX.utils.aoa_to_sheet([
    ["Instruções para preenchimento da lista de funcionários"],
    [""],
    ["1. Preencha somente a aba Funcionários."],
    ["2. Não altere o nome das colunas (Nome do funcionário, CPF, Cargo)."],
    ["3. CPF pode ser digitado com ou sem máscara."],
    ["4. Nome do funcionário é obrigatório quando a vaga for preenchida."],
    ["5. CPF é obrigatório para identificar corretamente o colaborador."],
    ["6. Cargo deve corresponder ao cargo informado para aquela pessoa."],
    ["7. Linhas totalmente vazias são ignoradas na importação."],
    ["8. Após importar, revise a tabela e clique em Salvar lista."],
  ]);
  instrucoes["!cols"] = [{ wch: 90 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    sheetFuncionarios,
    CONTRATO_VAGAS_SHEET_FUNCIONARIOS
  );
  XLSX.utils.book_append_sheet(
    wb,
    instrucoes,
    CONTRATO_VAGAS_SHEET_INSTRUCOES
  );

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

export function downloadModeloListaFuncionariosXlsx(params: {
  quantidadePrevista: number;
  numeroOrcamento?: string | null;
}): void {
  const buffer = gerarModeloListaFuncionariosXlsx({
    quantidadePrevista: params.quantidadePrevista,
  });
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivoModeloListaFuncionarios(params.numeroOrcamento);
  a.click();
  URL.revokeObjectURL(url);
}

export function parsePlanilhaListaFuncionarios(
  rows: string[][]
): ContratoVagaImportResult {
  if (!rows.length) {
    return failResult("Arquivo vazio ou sem dados.");
  }

  let headerIndex = 0;
  let mapped: Partial<Record<MappedField, number>> = {};
  let foundHeader = false;

  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const candidate: Partial<Record<MappedField, number>> = {};
    for (let c = 0; c < rows[i].length; c += 1) {
      const key = mapHeaderKey(rows[i][c] ?? "");
      if (key && candidate[key] == null) candidate[key] = c;
    }
    if (
      candidate.nome != null &&
      candidate.cpf != null &&
      candidate.cargo != null
    ) {
      mapped = candidate;
      headerIndex = i;
      foundHeader = true;
      break;
    }
  }

  if (!foundHeader) {
    return failResult(mensagemColunasEsperadasListaFuncionarios());
  }

  const dataStart = headerIndex + 1;
  const parsed: ContratoVagaImportRow[] = [];
  const cpfLinha = new Map<string, number>();
  const duplicados: string[] = [];
  const errosLinha: string[] = [];
  let incompletos = 0;

  for (let i = dataStart; i < rows.length; i += 1) {
    const raw = rows[i] ?? [];
    const nome = normalizeNomeOcupante(cellStr(raw[mapped.nome ?? 0]));
    const cpfRaw = cellStr(raw[mapped.cpf ?? 1]);
    const cargo = normalizeNomeOcupante(cellStr(raw[mapped.cargo ?? 2]));
    const cpfDigits = normalizeCpfDigits(cpfRaw);
    const row: ContratoVagaImportRow = {
      linha: i + 1,
      nome,
      cpf: cpfRaw,
      cpfDigits,
      cargo,
    };
    if (isRowVazia(row)) continue;

    const nomeOk = isNomeFuncionarioReal(nome);
    const cpfOk = cpfDigits.length === 11 && isValidCPF(cpfDigits);
    const cargoOk = cargo.length > 0;

    if (!nomeOk) {
      errosLinha.push(`Linha ${row.linha}: Nome do funcionário é obrigatório.`);
      incompletos += 1;
    }
    if (!cpfDigits) {
      errosLinha.push(`Linha ${row.linha}: CPF é obrigatório.`);
      incompletos += 1;
    } else if (!cpfOk) {
      errosLinha.push(`Linha ${row.linha}: CPF inválido.`);
      incompletos += 1;
    }
    if (!cargoOk) {
      errosLinha.push(`Linha ${row.linha}: Cargo é obrigatório.`);
      incompletos += 1;
    }

    if (cpfOk) {
      const prev = cpfLinha.get(cpfDigits);
      if (prev) {
        const masked = maskCPFInput(cpfDigits);
        duplicados.push(masked);
        errosLinha.push(
          `Linha ${row.linha}: CPF ${masked} duplicado (já informado na linha ${prev}).`
        );
      } else {
        cpfLinha.set(cpfDigits, row.linha);
      }
    }

    parsed.push(row);
  }

  if (parsed.length === 0) {
    return failResult("Não foi possível encontrar funcionários na planilha.");
  }

  if (errosLinha.length > 0 || duplicados.length > 0) {
    const uniqueDup = Array.from(new Set(duplicados));
    return {
      ok: false,
      error: errosLinha.join("\n"),
      rows: parsed,
      excedentes: [],
      duplicados: uniqueDup,
      incompletos,
      errosLinha,
    };
  }

  return {
    ok: true,
    error: null,
    rows: parsed,
    excedentes: [],
    duplicados: [],
    incompletos: 0,
    errosLinha: [],
  };
}

function escolherAbaFuncionarios(sheetNames: string[]): string | null {
  if (!sheetNames.length) return null;
  const preferida = sheetNames.find(
    (n) => normalizeHeader(n) === "funcionarios"
  );
  if (preferida) return preferida;
  const naoInstrucoes = sheetNames.find(
    (n) => normalizeHeader(n) !== "instrucoes"
  );
  return naoInstrucoes ?? sheetNames[0] ?? null;
}

/** Preferência de aba na planilha (testável). */
export function escolherAbaListaFuncionarios(
  sheetNames: string[]
): string | null {
  return escolherAbaFuncionarios(sheetNames);
}

export async function lerArquivoListaFuncionarios(
  file: File
): Promise<ContratoVagaImportResult> {
  const name = file.name.toLowerCase();
  const isCsv = file.type.includes("csv") || name.endsWith(".csv");
  const isExcel =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type.includes("sheet") ||
    file.type.includes("excel");

  if (!isCsv && !isExcel) {
    return failResult(
      "Use um arquivo XLS, XLSX ou CSV para importar a lista."
    );
  }

  try {
    let matrix: string[][] = [];
    if (isCsv) {
      const text = await file.text();
      matrix = text
        .split(/\r?\n/)
        .map((line) => line.split(/[;,]/).map((c) => c.trim()));
    } else {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = escolherAbaFuncionarios(workbook.SheetNames);
      if (!sheetName) {
        return failResult("A planilha não possui abas.");
      }
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      matrix = json.map((r) =>
        (Array.isArray(r) ? r : []).map((c) => cellStr(c))
      );
    }
    return parsePlanilhaListaFuncionarios(matrix);
  } catch {
    return failResult(
      "Não foi possível ler o arquivo. Verifique se está em XLS, XLSX ou CSV."
    );
  }
}

export function aplicarImportacaoNasVagas(params: {
  atuais: ContratoVagaDraft[];
  importados: ContratoVagaImportRow[];
  quantidadePrevista: number;
  sobrescreverPreenchidas: boolean;
  cargos?: Array<{ id: string; nome: string }>;
}): {
  drafts: ContratoVagaDraft[];
  aplicados: number;
  excedentes: ContratoVagaImportRow[];
  ignoradosPreenchidos: number;
} {
  const n = Math.max(0, Math.floor(Number(params.quantidadePrevista) || 0));
  const drafts = params.atuais.slice(0, n).map((row) => ({ ...row }));
  while (drafts.length < n) {
    drafts.push({
      id: null,
      indice: drafts.length + 1,
      colaborador: "",
      colaboradorCpf: "",
      cargoId: null,
      cargoNome: "",
      manterAsoAberto: false,
    });
  }

  const cargoByNome = new Map(
    (params.cargos ?? []).map((c) => [
      normalizeNomeOcupante(c.nome).toLocaleLowerCase("pt-BR"),
      c,
    ])
  );

  const excedentes = params.importados.slice(n);
  const cabem = params.importados.slice(0, n);
  let aplicados = 0;
  let ignoradosPreenchidos = 0;
  let slot = 0;

  for (const item of cabem) {
    while (slot < drafts.length) {
      const atual = drafts[slot];
      const ocupada =
        isNomeFuncionarioReal(atual.colaborador) ||
        normalizeCpfDigits(atual.colaboradorCpf).length === 11 ||
        atual.manterAsoAberto;
      if (ocupada && !params.sobrescreverPreenchidas) {
        ignoradosPreenchidos += 1;
        slot += 1;
        continue;
      }
      const cargoMatch = item.cargo
        ? cargoByNome.get(item.cargo.toLocaleLowerCase("pt-BR"))
        : undefined;
      drafts[slot] = {
        ...atual,
        colaborador: item.nome,
        colaboradorCpf: item.cpfDigits
          ? maskCPFInput(item.cpfDigits)
          : item.cpf,
        cargoNome: item.cargo,
        cargoId: cargoMatch?.id ?? null,
        // Preenche apenas dados da vaga; ASO em aberto deixa de aplicar
        // quando a vaga recebe funcionário nomeado.
        manterAsoAberto: false,
      };
      aplicados += 1;
      slot += 1;
      break;
    }
    if (slot >= drafts.length) {
      break;
    }
  }

  return { drafts, aplicados, excedentes, ignoradosPreenchidos };
}
