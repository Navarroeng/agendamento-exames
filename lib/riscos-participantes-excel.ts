/**
 * Importação Excel de participantes (Riscos Psicossociais).
 * Colunas oficiais: NOME COMPLETO | CPF | DATA DE NASCIMENTO
 * Biblioteca: SheetJS (xlsx).
 */

import * as XLSX from "xlsx";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import { parseDataNascimentoBr } from "@/lib/date-br";
import {
  validateRiscosParticipanteInput,
  type RiscosParticipanteInput,
} from "@/lib/riscos-campanha-participantes";
import { campanhaPermiteCadastroParticipantes } from "@/lib/riscos-campanha-ciclo";

export const RISCOS_IMPORT_HEADERS = [
  "NOME COMPLETO",
  "CPF",
  "DATA DE NASCIMENTO",
] as const;

export const RISCOS_IMPORT_MODELO_FILENAME =
  "modelo_importacao_participantes_riscos.xlsx";

export type LinhaImportacaoParticipante = RiscosParticipanteInput & {
  linha: number;
};

export type SituacaoImportacaoParticipante =
  | "pronto"
  | "cabecalho_invalido"
  | "linha_vazia"
  | "nome_obrigatorio"
  | "cpf_invalido"
  | "data_invalida"
  | "email_invalido"
  | "cpf_duplicado_arquivo"
  | "cpf_ja_na_campanha"
  | "cpf_outra_campanha_ativa"
  | "campanha_bloqueada"
  | "erro";

export type LinhaAvaliacaoImportacao = {
  linha: number;
  nomeCompleto: string;
  cpf: string;
  cpfDigits: string;
  dataNascimento: string;
  email: string;
  situacao: SituacaoImportacaoParticipante;
  motivo: string;
  pronto: boolean;
  input?: RiscosParticipanteInput;
};

export type ParseParticipantesExcelResult =
  | {
      ok: true;
      arquivoNome?: string;
      linhas: LinhaImportacaoParticipante[];
      totalLinhasDados: number;
    }
  | {
      ok: false;
      error: string;
      linhas: [];
      totalLinhasDados: number;
    };

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function mapHeaderKey(header: string): keyof RiscosParticipanteInput | null {
  const h = normalizeHeader(header);
  if (
    h === "nomecompleto" ||
    h === "nome" ||
    h === "nomedocolaborador" ||
    h === "nomecolaborador"
  ) {
    return "nomeCompleto";
  }
  if (h === "cpf") return "cpf";
  if (
    h === "datadenascimento" ||
    h === "datanascimento" ||
    h === "nascimento"
  ) {
    return "dataNascimento";
  }
  return null;
}

function excelSerialToBr(serial: number): string {
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed || !parsed.y) return String(serial);
  const d = String(parsed.d).padStart(2, "0");
  const m = String(parsed.m).padStart(2, "0");
  return `${d}/${m}/${parsed.y}`;
}

function cellStr(value: unknown, asDate = false): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    const d = value.getUTCDate().toString().padStart(2, "0");
    const m = (value.getUTCMonth() + 1).toString().padStart(2, "0");
    const y = value.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (asDate) {
      // Serial Excel típico de datas (aprox. 1900–2100).
      if (value > 20000 && value < 80000) {
        return excelSerialToBr(value);
      }
    }
    // CPF como número: preservar dígitos e completar zeros à esquerda.
    const digits = String(Math.trunc(value));
    if (!asDate && digits.length <= 11) {
      return digits.padStart(11, "0");
    }
    return digits;
  }
  return String(value).trim();
}

export function situacaoImportacaoLabel(
  situacao: SituacaoImportacaoParticipante
): string {
  switch (situacao) {
    case "pronto":
      return "✓ Pronto para importar";
    case "cabecalho_invalido":
      return "Cabeçalho incorreto";
    case "linha_vazia":
      return "Linha vazia";
    case "nome_obrigatorio":
      return "Nome obrigatório";
    case "cpf_invalido":
      return "CPF inválido";
    case "data_invalida":
      return "Data inválida";
    case "cpf_duplicado_arquivo":
      return "CPF duplicado no arquivo";
    case "cpf_ja_na_campanha":
      return "CPF já cadastrado nesta campanha";
    case "cpf_outra_campanha_ativa":
      return "CPF já está em outra campanha ativa";
    case "campanha_bloqueada":
      return "Campanha não permite importação";
    default:
      return "Erro";
  }
}

function mapValidationToSituacao(
  message: string
): SituacaoImportacaoParticipante {
  const m = message.toLowerCase();
  if (m.includes("nome")) return "nome_obrigatorio";
  if (m.includes("cpf")) return "cpf_invalido";
  if (m.includes("nascimento") || m.includes("data")) return "data_invalida";
  return "erro";
}

/**
 * Avalia linhas parseadas (sem gravar).
 * Reutiliza `validateRiscosParticipanteInput` do cadastro manual.
 */
export function avaliarLinhasImportacaoParticipantes(input: {
  linhas: LinhaImportacaoParticipante[];
  /** CPFs já ativos nesta campanha (11 dígitos). */
  cpfsNaCampanha?: ReadonlySet<string> | readonly string[];
  /** Resultado server-side por linha (opcional). */
  conflitosPorLinha?: ReadonlyMap<
    number,
    { situacao: SituacaoImportacaoParticipante; motivo: string }
  >;
  campanhaBloqueadaMotivo?: string | null;
}): {
  avaliadas: LinhaAvaliacaoImportacao[];
  validos: number;
  comErro: number;
  prontas: LinhaImportacaoParticipante[];
} {
  const cpfsCampanha = new Set<string>();
  if (input.cpfsNaCampanha) {
    const lista =
      input.cpfsNaCampanha instanceof Set
        ? Array.from(input.cpfsNaCampanha)
        : Array.from(input.cpfsNaCampanha);
    for (const c of lista) {
      const d = normalizeCpfDigits(c);
      if (d) cpfsCampanha.add(d);
    }
  }

  const cpfNoArquivo = new Map<string, number>();
  const avaliadas: LinhaAvaliacaoImportacao[] = [];
  const prontas: LinhaImportacaoParticipante[] = [];

  for (const linha of input.linhas) {
    const nomeCompleto = linha.nomeCompleto.trim();
    const cpfRaw = String(linha.cpf ?? "").trim();
    const dataNascimento = String(linha.dataNascimento ?? "").trim();
    const cpfDigits = normalizeCpfDigits(cpfRaw);

    const base: LinhaAvaliacaoImportacao = {
      linha: linha.linha,
      nomeCompleto,
      cpf: cpfRaw,
      cpfDigits,
      dataNascimento,
      email: "",
      situacao: "pronto",
      motivo: "✓ Pronto para importar",
      pronto: false,
    };

    if (input.campanhaBloqueadaMotivo) {
      avaliadas.push({
        ...base,
        situacao: "campanha_bloqueada",
        motivo: input.campanhaBloqueadaMotivo,
      });
      continue;
    }

    if (!nomeCompleto && !cpfRaw && !dataNascimento) {
      avaliadas.push({
        ...base,
        situacao: "linha_vazia",
        motivo: "Linha vazia",
      });
      continue;
    }

    const validationError = validateRiscosParticipanteInput({
      nomeCompleto,
      cpf: cpfRaw,
      dataNascimento,
    });
    if (validationError) {
      const situacao = mapValidationToSituacao(validationError);
      avaliadas.push({
        ...base,
        situacao,
        motivo: validationError,
      });
      continue;
    }

    // Garantir CPF válido após normalização (regra do cadastro).
    if (!isValidCPF(cpfDigits) || !parseDataNascimentoBr(dataNascimento)) {
      avaliadas.push({
        ...base,
        situacao: !isValidCPF(cpfDigits) ? "cpf_invalido" : "data_invalida",
        motivo: !isValidCPF(cpfDigits)
          ? "Informe um CPF válido."
          : "Informe a data de nascimento (DD/MM/AAAA).",
      });
      continue;
    }

    const primeiraOcorrencia = cpfNoArquivo.get(cpfDigits);
    if (primeiraOcorrencia != null) {
      avaliadas.push({
        ...base,
        situacao: "cpf_duplicado_arquivo",
        motivo: `CPF duplicado no arquivo (já na linha ${primeiraOcorrencia}).`,
      });
      continue;
    }
    cpfNoArquivo.set(cpfDigits, linha.linha);

    if (cpfsCampanha.has(cpfDigits)) {
      avaliadas.push({
        ...base,
        situacao: "cpf_ja_na_campanha",
        motivo: "CPF já cadastrado nesta campanha.",
      });
      continue;
    }

    const conflitoServer = input.conflitosPorLinha?.get(linha.linha);
    if (conflitoServer) {
      avaliadas.push({
        ...base,
        situacao: conflitoServer.situacao,
        motivo: conflitoServer.motivo,
      });
      continue;
    }

    const prontoInput: RiscosParticipanteInput = {
      nomeCompleto,
      cpf: cpfDigits,
      dataNascimento,
    };
    avaliadas.push({
      ...base,
      situacao: "pronto",
      motivo: situacaoImportacaoLabel("pronto"),
      pronto: true,
      input: prontoInput,
    });
    prontas.push({ ...prontoInput, linha: linha.linha });
  }

  const validos = avaliadas.filter((a) => a.pronto).length;
  const comErro = avaliadas.length - validos;
  return { avaliadas, validos, comErro, prontas };
}

export function parseParticipantesExcel(
  buffer: ArrayBuffer | Buffer
): LinhaImportacaoParticipante[] {
  const parsed = parseParticipantesExcelDetalhado(buffer);
  if (!parsed.ok) return [];
  return parsed.linhas;
}

export function parseParticipantesExcelDetalhado(
  buffer: ArrayBuffer | Buffer
): ParseParticipantesExcelResult {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    raw: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      ok: false,
      error: "A planilha está vazia.",
      linhas: [],
      totalLinhasDados: 0,
    };
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  if (rows.length === 0) {
    return {
      ok: false,
      error:
        "Nenhuma linha de dados encontrada. Use o modelo oficial com cabeçalho na primeira linha.",
      linhas: [],
      totalLinhasDados: 0,
    };
  }

  const first = rows[0];
  const originalKeys = Object.keys(first);
  const headerMap = new Map<string, keyof RiscosParticipanteInput>();
  for (const key of originalKeys) {
    const mapped = mapHeaderKey(key);
    if (mapped) headerMap.set(key, mapped);
  }

  const mappedFields = new Set(Array.from(headerMap.values()));
  const missing: string[] = [];
  if (!mappedFields.has("nomeCompleto")) missing.push("NOME COMPLETO");
  if (!mappedFields.has("cpf")) missing.push("CPF");
  if (!mappedFields.has("dataNascimento")) missing.push("DATA DE NASCIMENTO");

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Cabeçalho incorreto ou incompleto. Colunas obrigatórias: ${RISCOS_IMPORT_HEADERS.join(
        " | "
      )}. Faltando: ${missing.join(", ")}.`,
      linhas: [],
      totalLinhasDados: rows.length,
    };
  }

  const out: LinhaImportacaoParticipante[] = [];
  rows.forEach((row, idx) => {
    let nomeCompleto = "";
    let cpf = "";
    let dataNascimento = "";

    for (const [col, field] of Array.from(headerMap.entries())) {
      const raw = row[col];
      if (field === "nomeCompleto") nomeCompleto = cellStr(raw);
      if (field === "cpf") cpf = cellStr(raw, false);
      if (field === "dataNascimento") dataNascimento = cellStr(raw, true);
    }

    if (!nomeCompleto && !cpf && !dataNascimento) return;

    out.push({
      linha: idx + 2,
      nomeCompleto,
      cpf,
      dataNascimento,
    });
  });

  if (out.length === 0) {
    return {
      ok: false,
      error: "Nenhuma linha de dados preenchida na planilha.",
      linhas: [],
      totalLinhasDados: rows.length,
    };
  }

  return {
    ok: true,
    linhas: out,
    totalLinhasDados: out.length,
  };
}

/** Gera ArrayBuffer do modelo oficial (.xlsx). */
export function gerarModeloImportacaoParticipantesExcel(): ArrayBuffer {
  const aoa = [
    [...RISCOS_IMPORT_HEADERS],
    [
      "Maria da Silva (EXEMPLO — substitua esta linha)",
      "000.000.000-00",
      "15/03/1990",
    ],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 42 }, { wch: 18 }, { wch: 20 }];
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

export function downloadModeloImportacaoParticipantesExcel(): void {
  const buffer = gerarModeloImportacaoParticipantesExcel();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = RISCOS_IMPORT_MODELO_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}

export function campanhaPermiteImportacaoParticipantes(
  status: string | null | undefined
): string | null {
  return campanhaPermiteCadastroParticipantes(status);
}
