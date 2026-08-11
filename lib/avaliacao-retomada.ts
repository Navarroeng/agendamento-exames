/**
 * Política de retomada do Portal do Colaborador.
 * Nova abertura do link nunca reutiliza cookie para auto-identificar.
 * Retomada só após CPF + data de nascimento.
 */

export type SituacaoParticipantePortal =
  | "novo"
  | "em_andamento"
  | "ja_respondida";

export type PassoAposIdentificacao =
  | "termos"
  | "retomada"
  | "ja_respondida";

/**
 * Decide o próximo passo da UI após identificação válida no servidor.
 */
export function passoAposIdentificacao(
  situacao: SituacaoParticipantePortal
): PassoAposIdentificacao {
  if (situacao === "ja_respondida") return "ja_respondida";
  if (situacao === "em_andamento") return "retomada";
  return "termos";
}

/**
 * Classifica a situação do participante para retomada segura.
 * - ja_respondida: status respondido ou concluiu_em
 * - em_andamento: já iniciou questionário e sessão não concluída
 * - novo: ainda não iniciou
 */
export function classificarSituacaoParticipante(input: {
  statusParticipante: string;
  concluiuEm: string | null | undefined;
  iniciouEm: string | null | undefined;
  statusSessao: "em_andamento" | "concluida" | null;
  removidoEm?: string | null;
}): SituacaoParticipantePortal {
  // Removidos/invalidados não deveriam chegar aqui (API rejeita antes).
  // Se chegarem, tratar como já respondida só por segurança de UI — a API usa nao_apto.
  if (
    input.statusParticipante === "respondido" ||
    Boolean(input.concluiuEm) ||
    input.statusSessao === "concluida"
  ) {
    return "ja_respondida";
  }
  if (
    input.statusParticipante === "iniciado" ||
    input.iniciouEm ||
    input.statusSessao === "em_andamento"
  ) {
    return "em_andamento";
  }
  return "novo";
}
