import type { ExameFormItem } from "@/lib/types";

export const CARGO_OBRIGATORIO_TOAST =
  "Selecione um cargo para carregar os exames obrigatórios.";

export const CARGO_SEM_EXAMES_TOAST =
  "Este cargo não possui exames cadastrados. Cadastre os exames no módulo Cargos antes de salvar o agendamento.";

export function getExamesValidosAgendamento(
  exams: ExameFormItem[]
): ExameFormItem[] {
  return exams.filter((exam) => exam.tipo_exame.trim() && !exam.aviso);
}

export function hasCargoSelecionado(cargoId: string): boolean {
  return cargoId.trim() !== "";
}

export function hasExamesObrigatoriosCarregados(
  exams: ExameFormItem[]
): boolean {
  return getExamesValidosAgendamento(exams).length > 0;
}

export function cargoSemExamesVinculados(
  cargoId: string,
  exams: ExameFormItem[],
  loading = false
): boolean {
  if (!hasCargoSelecionado(cargoId) || loading) return false;
  return !hasExamesObrigatoriosCarregados(exams);
}
