/**
 * Importação da lista de funcionários do contrato (XLSX/XLS/CSV).
 * Reutiliza SheetJS já presente no projeto.
 */

import * as XLSX from "xlsx";
import { isValidCPF, maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import {
  isNomeFuncionarioReal,
  normalizeNomeOcupante,
  type ContratoVagaDraft,
} from "@/lib/contrato-vagas";

export const CONTRATO_VAGAS_IMPORT_HEADERS = ["Nome", "CPF", "Cargo"] as const;
export const CONTRATO_VAGAS_IMPORT_MODELO_FILENAME =
  "modelo_lista_funcionarios_contrato.xlsx";

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

export function parsePlanilhaListaFuncionarios(
  rows: string[][]
): ContratoVagaImportResult {
  if (!rows.length) {
    return {
      ok: false,
      error: "Arquivo vazio ou sem dados.",
      rows: [],
      excedentes: [],
      duplicados: [],
      incompletos: 0,
    };
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
    if (candidate.nome != null && candidate.cpf != null) {
      mapped = candidate;
      headerIndex = i;
      foundHeader = true;
      break;
    }
  }

  if (!foundHeader) {
    mapped = { nome: 0, cpf: 1, cargo: 2 };
    headerIndex = -1;
  }

  const dataStart = foundHeader ? headerIndex + 1 : 0;
  const parsed: ContratoVagaImportRow[] = [];
  const cpfLinha = new Map<string, number>();
  const duplicados: string[] = [];
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
    const cpfOk = isValidCPF(cpfDigits);
    if (!nomeOk || !cpfOk) incompletos += 1;

    if (cpfOk) {
      const prev = cpfLinha.get(cpfDigits);
      if (prev) {
        duplicados.push(maskCPFInput(cpfDigits));
      } else {
        cpfLinha.set(cpfDigits, row.linha);
      }
    }

    parsed.push(row);
  }

  if (parsed.length === 0) {
    return {
      ok: false,
      error: "Não foi possível encontrar funcionários na planilha.",
      rows: [],
      excedentes: [],
      duplicados: [],
      incompletos: 0,
    };
  }

  return {
    ok: true,
    error: null,
    rows: parsed,
    excedentes: [],
    duplicados: Array.from(new Set(duplicados)),
    incompletos,
  };
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
    return {
      ok: false,
      error: "Use um arquivo XLS, XLSX ou CSV para importar a lista.",
      rows: [],
      excedentes: [],
      duplicados: [],
      incompletos: 0,
    };
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
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return {
          ok: false,
          error: "A planilha não possui abas.",
          rows: [],
          excedentes: [],
          duplicados: [],
          incompletos: 0,
        };
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
    return {
      ok: false,
      error: "Não foi possível ler o arquivo. Verifique se está em XLS, XLSX ou CSV.",
      rows: [],
      excedentes: [],
      duplicados: [],
      incompletos: 0,
    };
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

export function gerarModeloListaFuncionariosXlsx(): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [...CONTRATO_VAGAS_IMPORT_HEADERS],
    ["Natália Porfírio", "000.000.000-00", "Cozinheira"],
  ]);
  ws["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, "Funcionários");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
