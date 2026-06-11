import type { ExameFormItem, ExameRecord } from "@/lib/types";

export function normalizePreparo(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function hasPreparo(value: string | null | undefined): boolean {
  return normalizePreparo(value).length > 0;
}

export interface ExameComPreparo {
  nome: string;
  preparo: string;
}

export interface PreparoAgrupado {
  nomes: string[];
  preparo: string;
}

function resolveExameNome(
  exam: Pick<ExameFormItem, "exame_id" | "tipo_exame">,
  catalog: ExameRecord[]
): string {
  if (exam.exame_id) {
    const found = catalog.find((item) => item.id === exam.exame_id);
    if (found?.nome) return found.nome;
  }
  return exam.tipo_exame.trim();
}

function resolvePreparo(
  exam: Pick<ExameFormItem, "exame_id" | "tipo_exame">,
  catalog: ExameRecord[]
): string {
  if (exam.exame_id) {
    const found = catalog.find((item) => item.id === exam.exame_id);
    if (found) return normalizePreparo(found.preparo);
  }

  const byName = catalog.find(
    (item) => item.nome.trim().toLowerCase() === exam.tipo_exame.trim().toLowerCase()
  );
  return normalizePreparo(byName?.preparo);
}

export function collectExamesComPreparo(
  exams: Pick<ExameFormItem, "exame_id" | "tipo_exame">[],
  catalog: ExameRecord[]
): ExameComPreparo[] {
  const seen = new Set<string>();
  const result: ExameComPreparo[] = [];

  for (const exam of exams) {
    const nome = resolveExameNome(exam, catalog);
    const preparo = resolvePreparo(exam, catalog);
    if (!nome || !preparo) continue;

    const key = `${exam.exame_id || nome}::${preparo}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({ nome, preparo });
  }

  return result.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function agruparPreparosUnicos(
  items: ExameComPreparo[]
): PreparoAgrupado[] {
  const map = new Map<string, string[]>();

  for (const item of items) {
    const nomes = map.get(item.preparo) ?? [];
    if (!nomes.includes(item.nome)) {
      nomes.push(item.nome);
    }
    map.set(item.preparo, nomes);
  }

  return Array.from(map.entries()).map(([preparo, nomes]) => ({
    preparo,
    nomes: nomes.sort((a, b) => a.localeCompare(b, "pt-BR")),
  }));
}

export function formatPreparoMensagemClinica(items: ExameComPreparo[]): string {
  if (items.length === 0) return "";

  const grupos = agruparPreparosUnicos(items);
  const lines = ["", "PREPARO DOS EXAMES", ""];

  for (const grupo of grupos) {
    lines.push(grupo.nomes.join(" / "));
    lines.push(grupo.preparo);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
