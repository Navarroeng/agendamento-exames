/**
 * Ordem de avisos de benefícios contratuais no Novo Agendamento.
 * Vaga comprometida por CPF > Periódico Futuro > ASO genérico em aberto.
 */

export type PeriodicoBeneficioDecisao = "none" | "skip" | "link";
export type CreditoBeneficioDecisao = "none" | "skip" | "use";
export type VagaBeneficioDecisao = "none" | "skip" | "link";

export type ProximoAvisoBeneficio =
  | "vaga_comprometida"
  | "periodico_futuro"
  | "aso_aberto"
  | "aso_apos_recusa_periodico"
  | "nenhum";

export function resolverProximoAvisoBeneficio(input: {
  temVagaComprometida?: boolean;
  vagaDecisao?: VagaBeneficioDecisao;
  temPeriodicoFuturo: boolean;
  periodicoDecisao: PeriodicoBeneficioDecisao;
  temAsoAberto: boolean;
  creditoDecisao: CreditoBeneficioDecisao;
}): ProximoAvisoBeneficio {
  const vagaDecisao = input.vagaDecisao ?? "none";
  const temVaga = Boolean(input.temVagaComprometida);

  // Vaga nomeada daquele CPF: nunca oferecer ASO genérico no lugar dela.
  if (temVaga) {
    if (vagaDecisao === "none") return "vaga_comprometida";
    if (vagaDecisao === "link") return "nenhum";
    // skip: segue para periódico; ASO genérico permanece bloqueado.
  }

  // Antecipou/vinculou periódico: nunca oferece ASO genérico.
  if (input.periodicoDecisao === "link") return "nenhum";

  // Ainda não decidiu e há periódico → avisar primeiro.
  if (input.periodicoDecisao === "none" && input.temPeriodicoFuturo) {
    return "periodico_futuro";
  }

  // Com vaga comprometida recusada, não oferecer ASO genérico.
  if (temVaga) return "nenhum";

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
