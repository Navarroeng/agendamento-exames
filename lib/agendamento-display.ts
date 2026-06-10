import { formatDateBR } from "@/lib/format";

export function formatAsoCell(
  enviado: boolean,
  data: string | null | undefined
): string {
  if (!enviado) return "Não";
  if (!data) return "—";
  return formatDateBR(data);
}
