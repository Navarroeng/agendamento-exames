/**
 * Ordem de avisos de benefícios contratuais no Novo Agendamento.
 * Periódico Futuro (CPF) tem prioridade sobre ASO genérico em aberto.
 */

export type PeriodicoBeneficioDecisao = "none" | "skip" | "link";
export type CreditoBeneficioDecisao = "none" | "skip" | "use";

export type ProximoAvisoBeneficio =
  | "periodico_futuro"
  | "aso_aberto"
  | "aso_apos_recusa_periodico"
  | "nenhum";

export function resolverProximoAvisoBeneficio(input: {
  temPeriodicoFuturo: boolean;
  periodicoDecisao: PeriodicoBeneficioDecisao;
  temAsoAberto: boolean;
  creditoDecisao: CreditoBeneficioDecisao;
}): ProximoAvisoBeneficio {
  // Antecipou/vinculou periódico: nunca oferece ASO genérico.
  if (input.periodicoDecisao === "link") return "nenhum";

  // Ainda não decidiu e há periódico → avisar primeiro.
  if (input.periodicoDecisao === "none" && input.temPeriodicoFuturo) {
    return "periodico_futuro";
  }

  // Crédito já decidido (usar ou não).
  if (input.creditoDecisao !== "none") return "nenhum";
  if (!input.temAsoAberto) return "nenhum";

  // Recusou antecipar periódico e ainda há ASO genérico → confirmação explícita.
  if (input.periodicoDecisao === "skip") {
    return "aso_apos_recusa_periodico";
  }

  // Sem periódico (ou ainda não consultado / nenhum encontrado).
  return "aso_aberto";
}
