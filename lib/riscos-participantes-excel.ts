/**
 * Parser de planilha de participantes (Nome | CPF | Data de nascimento | E-mail).
 */

import * as XLSX from "xlsx";
import type { RiscosParticipanteInput } from "@/lib/riscos-campanha-participantes";

export type LinhaImportacaoParticipante = RiscosParticipanteInput & {
  linha: number;
};

function cellStr(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel pode guardar CPF como número — preservar dígitos.
    return String(Math.trunc(value));
  }
  if (value instanceof Date) {
    const d = value.getUTCDate().toString().padStart(2, "0");
    const m = (value.getUTCMonth() + 1).toString().padStart(2, "0");
    const y = value.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(value).trim();
}

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function mapHeaderKey(header: string): keyof RiscosParticipanteInput | null {
  const h = normalizeHeader(header);
  if (h === "nome" || h === "nomecompleto" || h.includes("nome")) {
    return "nomeCompleto";
  }
  if (h === "cpf") return "cpf";
  if (
    h === "datanascimento" ||
    h === "nascimento" ||
    h === "datadenascimento" ||
    h.includes("nascimento")
  ) {
    return "dataNascimento";
  }
  if (h === "email" || h === "e-mail" || h.includes("email")) return "email";
  return null;
}

export function parseParticipantesExcel(
  buffer: ArrayBuffer | Buffer
): LinhaImportacaoParticipante[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  if (rows.length === 0) return [];

  const first = rows[0];
  const headerMap = new Map<string, keyof RiscosParticipanteInput>();
  for (const key of Object.keys(first)) {
    const mapped = mapHeaderKey(key);
    if (mapped) headerMap.set(key, mapped);
  }

  const usePositional = !Array.from(headerMap.values()).includes("cpf");
  const keys = Object.keys(first);

  const out: LinhaImportacaoParticipante[] = [];
  rows.forEach((row, idx) => {
    let nomeCompleto = "";
    let cpf = "";
    let dataNascimento = "";
    let email = "";

    if (usePositional) {
      nomeCompleto = cellStr(row[keys[0]]);
      cpf = cellStr(row[keys[1]]);
      dataNascimento = cellStr(row[keys[2]]);
      email = cellStr(row[keys[3]]);
    } else {
      for (const [col, field] of Array.from(headerMap.entries())) {
        const v = cellStr(row[col]);
        if (field === "nomeCompleto") nomeCompleto = v;
        if (field === "cpf") cpf = v;
        if (field === "dataNascimento") dataNascimento = v;
        if (field === "email") email = v;
      }
    }

    if (!nomeCompleto && !cpf && !dataNascimento) return;

    out.push({
      linha: idx + 2,
      nomeCompleto,
      cpf,
      dataNascimento,
      email: email || undefined,
    });
  });

  return out;
}
