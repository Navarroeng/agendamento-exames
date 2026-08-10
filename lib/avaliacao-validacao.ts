export type CampanhaAcessoRow = {
  id: string;
  codigo_publico: string;
  cliente_id: string | null;
  cnpj: string;
  empresa_nome: string;
  status: string;
  data_inicio: string;
  data_encerramento: string;
};

export type ParticipanteAcessoRow = {
  id: string;
  campanha_id: string;
  cpf: string;
  /** YYYY-MM-DD cadastrado. */
  data_nascimento: string | null;
  nome_completo: string;
  status: string;
  concluiu_em: string | null;
};

export type AvaliacaoValidacaoOk = {
  ok: true;
  campanhaId: string;
  participanteId: string;
  codigoPublico: string;
  empresaNome: string;
  participanteNome: string;
};

export type AvaliacaoValidacaoFail = {
  ok: false;
  /** Motivo interno para testes — nunca expor ao cliente. */
  motivo:
    | "campanha_inexistente"
    | "codigo_publico_divergente"
    | "campanha_indisponivel"
    | "participante_nao_encontrado"
    | "participante_campanha_divergente"
    | "data_nascimento_invalida"
    | "data_nascimento_divergente"
    | "participante_nao_autorizado"
    | "participante_ja_concluiu";
};

export type AvaliacaoValidacaoResult =
  | AvaliacaoValidacaoOk
  | AvaliacaoValidacaoFail;

function campanhaDisponivel(
  campanha: CampanhaAcessoRow,
  hojeIso: string
): boolean {
  if (campanha.status !== "aberta") return false;
  const inicio = campanha.data_inicio.slice(0, 10);
  const fim = campanha.data_encerramento.slice(0, 10);
  if (hojeIso < inicio) return false;
  if (hojeIso > fim) return false;
  return true;
}

/**
 * Validação: campanha da URL + CPF do participante da mesma campanha + data de nascimento.
 * Nunca consulta participante só por CPF: o caller deve buscar por campanha_id + CPF.
 */
export function validarAcessoAvaliacao(input: {
  codigoPublicoUrl: string;
  /** YYYY-MM-DD já parseado. */
  dataNascimentoIso: string | null;
  campanha: CampanhaAcessoRow | null;
  /** Já filtrado por campanha_id + cpf. */
  participante: ParticipanteAcessoRow | null;
  hojeIso?: string;
}): AvaliacaoValidacaoResult {
  const hoje = input.hojeIso ?? new Date().toISOString().slice(0, 10);
  const codigoUrl = input.codigoPublicoUrl.trim().toUpperCase();

  if (!input.campanha) {
    return { ok: false, motivo: "campanha_inexistente" };
  }

  if (input.campanha.codigo_publico.trim().toUpperCase() !== codigoUrl) {
    return { ok: false, motivo: "codigo_publico_divergente" };
  }

  if (!campanhaDisponivel(input.campanha, hoje)) {
    return { ok: false, motivo: "campanha_indisponivel" };
  }

  if (!input.dataNascimentoIso) {
    return { ok: false, motivo: "data_nascimento_invalida" };
  }

  if (!input.participante) {
    return { ok: false, motivo: "participante_nao_encontrado" };
  }

  if (input.participante.campanha_id !== input.campanha.id) {
    return { ok: false, motivo: "participante_campanha_divergente" };
  }

  const nascCadastro = String(input.participante.data_nascimento ?? "").slice(
    0,
    10
  );
  if (
    !nascCadastro ||
    nascCadastro !== input.dataNascimentoIso.slice(0, 10)
  ) {
    return { ok: false, motivo: "data_nascimento_divergente" };
  }

  if (
    input.participante.status === "respondido" ||
    input.participante.concluiu_em
  ) {
    return { ok: false, motivo: "participante_ja_concluiu" };
  }

  if (input.participante.status !== "pendente") {
    return { ok: false, motivo: "participante_nao_autorizado" };
  }

  return {
    ok: true,
    campanhaId: input.campanha.id,
    participanteId: input.participante.id,
    codigoPublico: input.campanha.codigo_publico.trim().toUpperCase(),
    empresaNome: input.campanha.empresa_nome,
    participanteNome: input.participante.nome_completo,
  };
}

export function assertCodigoPublicoSessao(
  sessaoCodigoPublico: string,
  urlCodigoPublico: string
): boolean {
  return (
    sessaoCodigoPublico.trim().toUpperCase() ===
    urlCodigoPublico.trim().toUpperCase()
  );
}
