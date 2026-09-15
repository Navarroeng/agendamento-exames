/**
 * Regras do menu ⋮ de ações do participante (Riscos Psicossociais).
 * Quem vê o menu é definido por `podeGerenciarParticipanteRiscos`.
 * Esta camada define o que aparece por status.
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

export type ColunaAcoesParticipante = RiscosParticipanteAcoesMenu & {
  mostraMenu: boolean;
};

/**
 * Condição real da coluna Ações na tabela Participantes.
 * Usuário autorizado + processo não cancelado + status com alguma ação.
 * Caso contrário a célula renderiza "—".
 */
export function resolveColunaAcoesParticipante(input: {
  usuarioAutorizado: boolean;
  processoCancelado?: boolean;
  status: string | null | undefined;
}): ColunaAcoesParticipante {
  if (!input.usuarioAutorizado || input.processoCancelado) {
    return { mostraMenu: false, exibirEditar: false, exibirRemover: false };
  }
  const acoes = acoesMenuParticipantePorStatus(input.status);
  return {
    ...acoes,
    mostraMenu: acoes.exibirEditar || acoes.exibirRemover,
  };
}
