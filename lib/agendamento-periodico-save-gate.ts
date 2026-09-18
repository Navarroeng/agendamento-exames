/**
 * Gate de Periódico Futuro no salvamento de novo agendamento.
 *
 * `periodicoDecision === "none"` significa “ainda não consultou/decidiu”.
 * Isso não pode abortar o save em silêncio: ou o modal abre (há pendência),
 * ou a decisão passa a `skip` e o salvamento segue.
 */

import type {
  PeriodicoBeneficioDecisao,
  VagaBeneficioDecisao,
} from "@/lib/agendamento-beneficios-contratuais";

export type PeriodicoSaveGateAcao =
  | "seguir"
  | "consultar"
  | "abrir_modal"
  | "aguardar_modal";

export type PeriodicoSaveGate = {
  acao: PeriodicoSaveGateAcao;
  periodicoDecision: PeriodicoBeneficioDecisao;
};

export type DecisaoModalPeriodico =
  | "cancelou"
  | "continuou_sem_vinculo"
  | "antecipou_e_vinculou";

export function aplicarPrefillPeriodicoDecision(
  periodicoIds?: string[] | null
): PeriodicoBeneficioDecisao {
  return (periodicoIds ?? []).length > 0 ? "link" : "none";
}

/** Troca de ASO reabre a consulta; não reaproveita skip/link do tipo anterior. */
export function decisaoPeriodicoAposAlterarAso(): PeriodicoBeneficioDecisao {
  return "none";
}

/** Consultou e não há Periódico Futuro elegível — não ficar preso em `none`. */
export function decisaoPeriodicoAposConsultaSemPendencia(
  atual: PeriodicoBeneficioDecisao
): PeriodicoBeneficioDecisao {
  if (atual === "link") return "link";
  return "skip";
}

/**
 * No prefill da Implantação (vaga lock) ou com periodico_ids, a seleção do
 * cliente não pode apagar a decisão já aplicada.
 */
export function devePreservarDecisaoPeriodicoNoPrefill(input: {
  vagaLock: boolean;
  periodicoIds?: string[] | null;
}): boolean {
  return input.vagaLock || (input.periodicoIds ?? []).length > 0;
}

export function resolverPeriodicoSaveGate(input: {
  isNovoAgendamento: boolean;
  periodicoDecision: PeriodicoBeneficioDecisao;
  modalJaAberto: boolean;
  consulta?: { encontrouElegivel: boolean } | null;
}): PeriodicoSaveGate {
  const atual = input.periodicoDecision;

  if (!input.isNovoAgendamento) {
    return { acao: "seguir", periodicoDecision: atual };
  }

  if (atual === "link" || atual === "skip") {
    return { acao: "seguir", periodicoDecision: atual };
  }

  if (input.modalJaAberto) {
    return { acao: "aguardar_modal", periodicoDecision: "none" };
  }

  if (!input.consulta) {
    return { acao: "consultar", periodicoDecision: "none" };
  }

  if (input.consulta.encontrouElegivel) {
    return { acao: "abrir_modal", periodicoDecision: "none" };
  }

  return { acao: "seguir", periodicoDecision: "skip" };
}

export function continuarSaveAposDecisaoModalPeriodico(
  decisao: DecisaoModalPeriodico
): {
  periodicoDecision: PeriodicoBeneficioDecisao;
  continuarSavePendente: boolean;
} {
  if (decisao === "antecipou_e_vinculou") {
    return { periodicoDecision: "link", continuarSavePendente: true };
  }
  if (decisao === "continuou_sem_vinculo") {
    return { periodicoDecision: "skip", continuarSavePendente: true };
  }
  return { periodicoDecision: "none", continuarSavePendente: false };
}

/** Mesmo vínculo oficial do botão Agendar da Implantação. */
export function deveVincularAgendamentoAVagaDoPrefill(input: {
  vagaId: string | null | undefined;
  vagaDecision: VagaBeneficioDecisao;
  vagaLock: boolean;
}): boolean {
  const id = (input.vagaId ?? "").trim();
  if (!id) return false;
  return input.vagaDecision === "link" || input.vagaLock;
}
