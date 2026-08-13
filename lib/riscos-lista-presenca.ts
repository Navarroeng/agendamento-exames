/** Validação e regras da etapa Lista de Presença (Riscos Psicossociais). */

export const RISCOS_LISTA_PRESENCA_BUCKET = "riscos-psicossociais";
export const RISCOS_LISTA_PRESENCA_MAX_BYTES = 10 * 1024 * 1024;

const LISTA_EXT = ["pdf", "xlsx", "xls", "jpg", "jpeg", "png"] as const;

export type RiscosListaPresencaAnexoMeta = {
  path: string;
  nome: string;
  tipo: string;
  tamanho: number;
};

export type RiscosListaPresencaDados = {
  lista_solicitada: boolean;
  lista_solicitada_em: string | null;
  lista_solicitada_email: string | null;
  lista_solicitada_por: string | null;
  lista_solicitada_registrado_em: string | null;
  lista_recebida: boolean;
  lista_anexo_path: string | null;
  lista_anexo_nome: string | null;
  lista_anexo_tipo: string | null;
  lista_anexo_tamanho: number | null;
  lista_recebida_em: string | null;
  lista_recebida_por: string | null;
};

export const EMPTY_RISCOS_LISTA_PRESENCA: RiscosListaPresencaDados = {
  lista_solicitada: false,
  lista_solicitada_em: null,
  lista_solicitada_email: null,
  lista_solicitada_por: null,
  lista_solicitada_registrado_em: null,
  lista_recebida: false,
  lista_anexo_path: null,
  lista_anexo_nome: null,
  lista_anexo_tipo: null,
  lista_anexo_tamanho: null,
  lista_recebida_em: null,
  lista_recebida_por: null,
};

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function isValidEmailListaPresenca(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function isSolicitacaoListaConcluida(
  dados: Pick<RiscosListaPresencaDados, "lista_solicitada" | "lista_solicitada_em">
): boolean {
  return (
    dados.lista_solicitada === true && Boolean(dados.lista_solicitada_em?.trim())
  );
}

export function isRecebimentoListaConcluido(
  dados: Pick<
    RiscosListaPresencaDados,
    "lista_recebida" | "lista_anexo_path"
  >
): boolean {
  return (
    dados.lista_recebida === true &&
    Boolean(dados.lista_anexo_path?.trim())
  );
}

/** Etapa concluída só com solicitação + recebimento com anexo. */
export function isListaPresencaEtapaConcluida(
  dados: RiscosListaPresencaDados | null | undefined
): boolean {
  if (!dados) return false;
  return (
    isSolicitacaoListaConcluida(dados) && isRecebimentoListaConcluido(dados)
  );
}

export function validateRiscosListaPresencaFile(file: File): void {
  if (!file || file.size <= 0) {
    throw new Error("Selecione o arquivo da lista de presença.");
  }
  if (file.size > RISCOS_LISTA_PRESENCA_MAX_BYTES) {
    throw new Error("A lista de presença deve ter no máximo 10 MB.");
  }
  const ext = extensionOf(file.name);
  if (!LISTA_EXT.includes(ext as (typeof LISTA_EXT)[number])) {
    throw new Error(
      "Formato inválido. Use PDF, XLS, XLSX, JPG, JPEG ou PNG."
    );
  }
}

export function buildRiscosListaPresencaStoragePath(
  orcamentoId: string,
  fileName: string
): string {
  const ext = extensionOf(fileName) || "bin";
  return `${orcamentoId}/lista-presenca-${Date.now()}.${ext}`;
}

export function resolveRiscosListaPresencaContentType(file: File): string {
  if (file.type) return file.type;
  const ext = extensionOf(file.name);
  const map: Record<string, string> = {
    pdf: "application/pdf",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  };
  return map[ext] ?? "application/octet-stream";
}

/** Aceita nulls vindos do banco (boolean | null). */
export type RiscosListaPresencaTrackingRow = {
  lista_solicitada?: boolean | null;
  lista_solicitada_em?: string | null;
  lista_solicitada_email?: string | null;
  lista_solicitada_por?: string | null;
  lista_solicitada_registrado_em?: string | null;
  lista_recebida?: boolean | null;
  lista_anexo_path?: string | null;
  lista_anexo_nome?: string | null;
  lista_anexo_tipo?: string | null;
  lista_anexo_tamanho?: number | null;
  lista_recebida_em?: string | null;
  lista_recebida_por?: string | null;
};

export function mapListaPresencaFromTracking(
  row: RiscosListaPresencaTrackingRow | null | undefined
): RiscosListaPresencaDados {
  if (!row) return { ...EMPTY_RISCOS_LISTA_PRESENCA };
  return {
    lista_solicitada: row.lista_solicitada === true,
    lista_solicitada_em: row.lista_solicitada_em ?? null,
    lista_solicitada_email: row.lista_solicitada_email ?? null,
    lista_solicitada_por: row.lista_solicitada_por ?? null,
    lista_solicitada_registrado_em: row.lista_solicitada_registrado_em ?? null,
    lista_recebida: row.lista_recebida === true,
    lista_anexo_path: row.lista_anexo_path ?? null,
    lista_anexo_nome: row.lista_anexo_nome ?? null,
    lista_anexo_tipo: row.lista_anexo_tipo ?? null,
    lista_anexo_tamanho:
      row.lista_anexo_tamanho != null ? Number(row.lista_anexo_tamanho) : null,
    lista_recebida_em: row.lista_recebida_em ?? null,
    lista_recebida_por: row.lista_recebida_por ?? null,
  };
}
