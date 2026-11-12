/**
 * Planilha de inclusão em lote na lista de Clientes → Colaboradores.
 * Usa as mesmas regras do cadastro manual: nome obrigatório, CPF opcional
 * e data de admissão opcional. Não cria agendamento nem vaga.
 */

import * as XLSX from "xlsx";
import { isNomeFuncionarioReal, normalizeNomeOcupante } from "@/lib/contrato-vagas";
import {
  isDataCalendarioIso,
  toDataEventoIso,
} from "@/lib/colaborador-movimentacoes";
import {
  isValidCPF,
  normalizarCpfDeCelulaExcel,
  normalizeCpfDigits,
} from "@/lib/cpf";

export const COLABORADOR_IMPORT_HEADERS = [
  "Nome",
  "CPF",
  "Cargo",
  "Data de admissão",
] as const;

export const COLABORADOR_IMPORT_ABA = "Colaboradores";
export const COLABORADOR_IMPORT_ABA_INSTRUCOES = "Instruções";
export const COLABORADOR_IMPORT_ARQUIVO = "modelo_colaboradores.xlsx";

export const MENSAGEM_IMPORT_NOME = "Informe o nome do colaborador.";
export const MENSAGEM_IMPORT_CPF = "CPF inválido.";
export const MENSAGEM_IMPORT_DATA = "Data de admissão inválida.";
export const MENSAGEM_IMPORT_CPF_REPETIDO = "CPF repetido na planilha.";
export const MENSAGEM_IMPORT_COLUNAS =
  "A planilha precisa das colunas Nome, CPF, Cargo e Data de admissão.";
export const MENSAGEM_IMPORT_CORRIGIR =
  "Corrija a planilha antes de confirmar.";

const LINHAS_MODELO = 200;

export type LinhaImportacaoColaborador = {
  linha: number;
  nome: string;
  cpf: string;
  cargo: string;
  dataAdmissao: string;
};

export type ErroImportacaoColaborador = {
  linha: number;
  motivo: string;
};

export type PreviaImportacaoColaborador = {
  novos: LinhaImportacaoColaborador[];
  existentes: LinhaImportacaoColaborador[];
  erros: ErroImportacaoColaborador[];
  podeConfirmar: boolean;
};

export function nomeArquivoModeloColaboradores(): string {
  return COLABORADOR_IMPORT_ARQUIVO;
}

function bufferDoWorkbook(wb: XLSX.WorkBook): ArrayBuffer {
  const out = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellStyles: true,
  });
  if (out instanceof ArrayBuffer) return out;
  if (out instanceof Uint8Array) {
    return out.buffer.slice(
      out.byteOffset,
      out.byteOffset + out.byteLength
    ) as ArrayBuffer;
  }
  return new Uint8Array(out as ArrayLike<number>).buffer;
}

export function gerarModeloColaboradoresXlsx(): ArrayBuffer {
  const aoa: string[][] = [[...COLABORADOR_IMPORT_HEADERS]];
  for (let i = 0; i < LINHAS_MODELO; i += 1) aoa.push(["", "", "", ""]);

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 36 }, { wch: 18 }, { wch: 28 }, { wch: 20 }];
  for (let i = 0; i < LINHAS_MODELO; i += 1) {
    const cpf = XLSX.utils.encode_cell({ r: i + 1, c: 1 });
    const data = XLSX.utils.encode_cell({ r: i + 1, c: 3 });
    sheet[cpf] = { t: "s", v: "", z: "@" };
    sheet[data] = { t: "s", v: "", z: "dd/mm/yyyy" };
  }

  const instrucoes = XLSX.utils.aoa_to_sheet([
    ["Instruções para importar colaboradores"],
    [""],
    ["1. Preencha somente a aba Colaboradores."],
    ["2. Não altere o nome das colunas: Nome, CPF, Cargo e Data de admissão."],
    ["3. Nome é obrigatório."],
    ["4. CPF pode ficar em branco. Se for informado, precisa ser válido."],
    ["5. A coluna CPF está como texto para preservar zeros à esquerda."],
    ["6. Pessoas sem CPF permanecem cadastros distintos, mesmo com o mesmo nome."],
    ["7. Cargo é opcional."],
    ["8. Data de admissão é opcional e deve estar em dd/mm/aaaa."],
    ["9. Linhas totalmente vazias são ignoradas."],
    ["10. CPF já cadastrado nesta empresa não é alterado."],
    ["11. A importação só cadastra o colaborador. Não cria agendamento nem ocupa vaga."],
  ]);
  instrucoes["!cols"] = [{ wch: 96 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, COLABORADOR_IMPORT_ABA);
  XLSX.utils.book_append_sheet(
    wb,
    instrucoes,
    COLABORADOR_IMPORT_ABA_INSTRUCOES
  );
  return bufferDoWorkbook(wb);
}

export function downloadModeloColaboradoresXlsx(): void {
  const buffer = gerarModeloColaboradoresXlsx();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivoModeloColaboradores();
  a.click();
  URL.revokeObjectURL(url);
}

function textoCelula(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function excelSerialParaIso(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  const dias = Math.round(serial);
  if (dias < 1 || dias > 80000) return null;
  const utc = new Date(Date.UTC(1899, 11, 30) + dias * 86400000);
  const iso = utc.toISOString().slice(0, 10);
  return isDataCalendarioIso(iso) ? iso : null;
}

/** Converte a célula para a data ISO do cadastro manual, ou nulo se vazia. */
export function dataAdmissaoDaCelula(value: unknown): {
  iso: string | null;
  invalida: boolean;
} {
  if (value == null || value === "") return { iso: null, invalida: false };
  if (typeof value === "number") {
    const iso = excelSerialParaIso(value);
    return iso ? { iso, invalida: false } : { iso: null, invalida: true };
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { iso: null, invalida: true };
    const iso = value.toISOString().slice(0, 10);
    return isDataCalendarioIso(iso)
      ? { iso, invalida: false }
      : { iso: null, invalida: true };
  }
  const text = String(value).trim().replace(/\s+\d{1,2}:\d{2}(?::\d{2})?$/, "");
  if (!text) return { iso: null, invalida: false };
  const iso = toDataEventoIso(text);
  if (!iso || !isDataCalendarioIso(iso)) return { iso: null, invalida: true };
  return { iso, invalida: false };
}

function normalizarCabecalho(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function indiceDasColunas(
  header: unknown[]
): { nome: number; cpf: number; cargo: number; data: number } | null {
  const mapa = new Map<string, number>();
  header.forEach((cell, index) => {
    const key = normalizarCabecalho(textoCelula(cell));
    if (key) mapa.set(key, index);
  });
  const nome = mapa.get("nome");
  const cpf = mapa.get("cpf");
  const cargo = mapa.get("cargo");
  const data = mapa.get("data de admissao");
  if (
    nome == null ||
    cpf == null ||
    cargo == null ||
    data == null
  ) {
    return null;
  }
  return { nome, cpf, cargo, data };
}

export function lerPlanilhaColaboradores(buffer: ArrayBuffer):
  | { ok: true; linhas: LinhaImportacaoColaborador[] }
  | { ok: false; error: string } {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  } catch {
    return { ok: false, error: "Não foi possível ler a planilha." };
  }
  const nomeAba =
    workbook.SheetNames.find((nome) => nome === COLABORADOR_IMPORT_ABA) ??
    workbook.SheetNames.find(
      (nome) => nome !== COLABORADOR_IMPORT_ABA_INSTRUCOES
    );
  const sheet = nomeAba ? workbook.Sheets[nomeAba] : undefined;
  if (!sheet) return { ok: false, error: "A planilha não possui abas." };

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: true,
  });
  if (rows.length === 0) return { ok: false, error: MENSAGEM_IMPORT_COLUNAS };
  const colunas = indiceDasColunas(rows[0] ?? []);
  if (!colunas) return { ok: false, error: MENSAGEM_IMPORT_COLUNAS };

  const linhas: LinhaImportacaoColaborador[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const nome = textoCelula(row[colunas.nome]);
    const cpfBruto = row[colunas.cpf];
    const cpf =
      cpfBruto == null || cpfBruto === ""
        ? ""
        : normalizarCpfDeCelulaExcel(cpfBruto);
    const cargo = textoCelula(row[colunas.cargo]);
    const dataBruta = row[colunas.data];
    const dataVazia =
      dataBruta == null ||
      dataBruta === "" ||
      (typeof dataBruta === "string" && !dataBruta.trim());
    const data = dataAdmissaoDaCelula(dataBruta);
    if (!nome && !cpf && !cargo && dataVazia) continue;
    linhas.push({
      linha: index + 1,
      nome,
      cpf,
      cargo,
      dataAdmissao: data.invalida ? String(dataBruta).trim() : data.iso ?? "",
    });
    if (data.invalida) {
      linhas[linhas.length - 1].dataAdmissao = `__invalida__:${textoCelula(dataBruta) || String(dataBruta)}`;
    }
  }
  return { ok: true, linhas };
}

function dataDaLinha(value: string): { iso: string | null; invalida: boolean } {
  if (value.startsWith("__invalida__:")) return { iso: null, invalida: true };
  return dataAdmissaoDaCelula(value);
}

/**
 * Classifica a planilha com as regras do cadastro manual.
 * CPF já existente na empresa entra como ignorado, sem erro.
 * CPF repetido na própria planilha impede a confirmação.
 */
export function avaliarImportacaoColaboradores(input: {
  linhas: LinhaImportacaoColaborador[];
  cpfsDaEmpresa: Iterable<string>;
}): PreviaImportacaoColaborador {
  const existentesNaEmpresa = new Set<string>();
  for (const cpf of Array.from(input.cpfsDaEmpresa)) {
    const digits = normalizeCpfDigits(cpf);
    if (isValidCPF(digits)) existentesNaEmpresa.add(digits);
  }

  const erros: ErroImportacaoColaborador[] = [];
  const preparados: Array<LinhaImportacaoColaborador & { cpfValido: string | null }> =
    [];

  for (const linha of input.linhas) {
    const nome = normalizeNomeOcupante(linha.nome);
    const cpfInformado = normalizeCpfDigits(linha.cpf);
    const data = dataDaLinha(linha.dataAdmissao);
    const cargo = normalizeNomeOcupante(linha.cargo);
    const vazia =
      !nome &&
      !cpfInformado &&
      !cargo &&
      !linha.dataAdmissao.trim();
    if (vazia) continue;

    let invalida = false;
    if (!isNomeFuncionarioReal(nome)) {
      erros.push({ linha: linha.linha, motivo: MENSAGEM_IMPORT_NOME });
      invalida = true;
    }
    if (cpfInformado && !isValidCPF(cpfInformado)) {
      erros.push({ linha: linha.linha, motivo: MENSAGEM_IMPORT_CPF });
      invalida = true;
    }
    if (data.invalida) {
      erros.push({ linha: linha.linha, motivo: MENSAGEM_IMPORT_DATA });
      invalida = true;
    }
    if (invalida) continue;
    preparados.push({
      linha: linha.linha,
      nome,
      cpf: cpfInformado,
      cargo,
      dataAdmissao: data.iso ?? "",
      cpfValido: isValidCPF(cpfInformado) ? cpfInformado : null,
    });
  }

  const contagem = new Map<string, number>();
  for (const linha of preparados) {
    if (!linha.cpfValido) continue;
    contagem.set(linha.cpfValido, (contagem.get(linha.cpfValido) ?? 0) + 1);
  }
  const repetidos = new Set(
    Array.from(contagem.entries())
      .filter(([, total]) => total > 1)
      .map(([cpf]) => cpf)
  );
  for (const linha of preparados) {
    if (linha.cpfValido && repetidos.has(linha.cpfValido)) {
      erros.push({ linha: linha.linha, motivo: MENSAGEM_IMPORT_CPF_REPETIDO });
    }
  }

  const novos: LinhaImportacaoColaborador[] = [];
  const existentes: LinhaImportacaoColaborador[] = [];
  if (erros.length === 0) {
    for (const linha of preparados) {
      const item = {
        linha: linha.linha,
        nome: linha.nome,
        cpf: linha.cpfValido ?? "",
        cargo: linha.cargo,
        dataAdmissao: linha.dataAdmissao,
      };
      if (linha.cpfValido && existentesNaEmpresa.has(linha.cpfValido)) {
        existentes.push(item);
      } else {
        novos.push(item);
      }
    }
  }

  return {
    novos,
    existentes,
    erros: erros.slice().sort((a, b) => a.linha - b.linha || a.motivo.localeCompare(b.motivo)),
    podeConfirmar: erros.length === 0 && novos.length + existentes.length > 0,
  };
}

export function motivoLoteImportacao(
  adicionados: number,
  jaCadastrados: number
): string {
  return `importacao:ok:${adicionados}:${jaCadastrados}`;
}

export const MOTIVO_LOTE_PENDENTE = "importacao:pendente";

export function lerMotivoLoteImportacao(
  motivo: string | null | undefined
): { adicionados: number; jaCadastrados: number } | null {
  const match = String(motivo ?? "").match(/^importacao:ok:(\d+):(\d+)$/);
  if (!match) return null;
  return {
    adicionados: Number(match[1]),
    jaCadastrados: Number(match[2]),
  };
}
