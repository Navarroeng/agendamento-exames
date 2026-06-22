import {
  EXAME_CLINICO_NOME,
  isExameClinicoManual,
} from "@/lib/exame-pricing";
import type { ExameFormItem } from "@/lib/types";

export const ASO_RETORNO_AO_TRABALHO = "Retorno ao Trabalho";

export const EXAME_CLINICO_NAO_ENCONTRADO_RETORNO_MSG =
  "Exame Clínico não encontrado no catálogo. Cadastre o exame Clínico antes de criar agendamentos de Retorno ao Trabalho.";

export const CLINICO_NAO_REMOVIVEL_RETORNO_TOAST =
  "O exame Clínico é obrigatório para ASO Retorno ao Trabalho.";

export function isAsoRetornoAoTrabalho(
  aso: string | null | undefined
): boolean {
  return (aso ?? "").trim() === ASO_RETORNO_AO_TRABALHO;
}

/** Filtra nomes de exames do cargo conforme o tipo de ASO. */
export function filtrarNomesExamesParaAso(
  exameNomes: string[],
  aso: string
): string[] {
  const nomes = exameNomes.map((nome) => nome.trim()).filter(Boolean);
  if (!isAsoRetornoAoTrabalho(aso)) return nomes;

  const clinico =
    nomes.find((nome) => isExameClinicoManual(nome)) ?? EXAME_CLINICO_NOME;
  return [clinico];
}

export function agendamentoPossuiExamesComplementares(
  exams: Pick<ExameFormItem, "tipo_exame">[]
): boolean {
  return exams.some(
    (exam) => exam.tipo_exame.trim() && !isExameClinicoManual(exam.tipo_exame)
  );
}

export function filtrarExamesFormParaAso(
  exams: ExameFormItem[],
  aso: string
): ExameFormItem[] {
  if (!isAsoRetornoAoTrabalho(aso)) return exams;
  const clinico = exams.find((exam) => isExameClinicoManual(exam.tipo_exame));
  return clinico ? [clinico] : [];
}

export function podeRemoverExameAgendamento(
  aso: string,
  tipoExame: string
): boolean {
  if (!isAsoRetornoAoTrabalho(aso)) return true;
  return !isExameClinicoManual(tipoExame);
}
