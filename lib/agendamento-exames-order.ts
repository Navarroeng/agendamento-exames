import { isExameClinicoManual } from "@/lib/exame-pricing";

/** Exibe o exame Clínico sempre primeiro no formulário de agendamento. */
export function ordenarExamesAgendamentoComClinicoPrimeiro<
  T extends { tipo_exame: string },
>(exames: T[]): T[] {
  if (exames.length <= 1) return exames;

  if (!exames.some((exame) => isExameClinicoManual(exame.tipo_exame))) {
    return exames;
  }

  return [...exames].sort((a, b) => {
    const aClinico = isExameClinicoManual(a.tipo_exame);
    const bClinico = isExameClinicoManual(b.tipo_exame);
    if (aClinico && !bClinico) return -1;
    if (!aClinico && bClinico) return 1;
    return 0;
  });
}
