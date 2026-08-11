/**
 * Regras do menu ⋮ de ações do participante (Riscos Psicossociais).
 * Somente Admin enxerga o menu; esta camada define o que aparece por status.
 */

export type RiscosParticipanteAcoesMenu = {
  exibirEditar: boolean;
  exibirRemover: boolean;
};

/**
 * Pendente → Editar + Remover.
 * Iniciado / Concluído (respondido) → só Remover.
 * Invalidado / removido → sem ações (não devem aparecer na lista ativa).
 */
export function acoesMenuParticipantePorStatus(
  status: string | null | undefined
): RiscosParticipanteAcoesMenu {
  const s = String(status ?? "");
  if (s === "pendente") {
    return { exibirEditar: true, exibirRemover: true };
  }
  if (s === "iniciado" || s === "respondido") {
    return { exibirEditar: false, exibirRemover: true };
  }
  return { exibirEditar: false, exibirRemover: false };
}

/** Edição cadastral só enquanto o questionário não foi iniciado. */
export function podeEditarDadosParticipante(
  status: string | null | undefined
): boolean {
  return String(status ?? "") === "pendente";
}
