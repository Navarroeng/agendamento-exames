import {
  chaveExameDuplicidade,
  normalizarNomeExame,
} from "@/lib/duplicidade-validations";
import type { ExameFormItem, ExameRecord } from "@/lib/types";

export function mensagemExameJaNoAgendamento(nomeExame: string): string {
  return `O exame ${nomeExame} já faz parte deste agendamento.`;
}

export function exameJaNoAgendamento(
  examsAtuais: Array<Pick<ExameFormItem, "exame_id" | "tipo_exame">>,
  catalogExame: Pick<ExameRecord, "id" | "nome">
): boolean {
  const keyId = `id:${catalogExame.id}`;
  const keyNome = `nome:${normalizarNomeExame(catalogExame.nome)}`;

  return examsAtuais.some((exam) => {
    if (!exam.tipo_exame.trim()) return false;
    const key = chaveExameDuplicidade(exam);
    return key === keyId || key === keyNome;
  });
}

export function separarExamesCatalogoParaAdicionar(
  selecionados: ExameRecord[],
  examsAtuais: Array<Pick<ExameFormItem, "exame_id" | "tipo_exame">>
): { novos: ExameRecord[]; duplicados: ExameRecord[] } {
  const novos: ExameRecord[] = [];
  const duplicados: ExameRecord[] = [];
  const batchKeys = new Set(
    examsAtuais
      .filter((exam) => exam.tipo_exame.trim())
      .map((exam) => chaveExameDuplicidade(exam))
      .filter((key): key is string => Boolean(key))
  );

  for (const exame of selecionados) {
    const keyId = `id:${exame.id}`;
    const keyNome = `nome:${normalizarNomeExame(exame.nome)}`;

    if (batchKeys.has(keyId) || batchKeys.has(keyNome)) {
      duplicados.push(exame);
      continue;
    }

    batchKeys.add(keyId);
    batchKeys.add(keyNome);
    novos.push(exame);
  }

  return { novos, duplicados };
}

function normalizeSearchTerm(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filtrarExamesCatalogoPorBusca(
  exames: ExameRecord[],
  busca: string
): ExameRecord[] {
  const term = normalizeSearchTerm(busca);
  if (!term) return exames;

  return exames.filter((exame) => {
    const nome = normalizeSearchTerm(exame.nome);
    const categoria = normalizeSearchTerm(exame.categoria ?? "");
    return nome.includes(term) || categoria.includes(term);
  });
}

export function listarExamesDisponiveisParaAdicionar(
  catalog: ExameRecord[],
  examsAtuais: Array<Pick<ExameFormItem, "exame_id" | "tipo_exame">>
): ExameRecord[] {
  return catalog.filter((exame) => !exameJaNoAgendamento(examsAtuais, exame));
}
