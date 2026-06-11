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

const SEPARATOR = "────────────────────";

function preparoToBulletLines(preparo: string): string[] {
  return preparo
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\*\s*/, "").trim())
    .map((line) => `• ${line}`);
}

function formatExamePreparoBlock(item: ExameComPreparo): string {
  const titulo = item.nome.trim().toUpperCase();
  const bullets = preparoToBulletLines(item.preparo);
  return [`📋 ${titulo}`, ...bullets].join("\n");
}

export function formatPreparoMensagemClinica(items: ExameComPreparo[]): string {
  if (items.length === 0) return "";

  const blocks = items.map(formatExamePreparoBlock);

  return [
    "",
    "⚠️ ATENÇÃO",
    "Este agendamento possui exames que exigem preparo prévio.",
    "Leia atentamente as orientações abaixo.",
    "",
    "🧪 PREPARO DOS EXAMES",
    SEPARATOR,
    "",
    blocks.join("\n\n"),
  ].join("\n");
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

