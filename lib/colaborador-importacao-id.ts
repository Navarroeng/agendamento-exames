import { createHash } from "node:crypto";

/** Id estável da linha nesta confirmação. O reenvio encontra o mesmo registro. */
export function idLinhaImportacao(confirmacaoId: string, linha: number): string {
  const hex = createHash("sha256")
    .update(`${confirmacaoId}:${linha}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
