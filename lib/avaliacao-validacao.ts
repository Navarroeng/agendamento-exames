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

export type AvaliacaoValidacaoMotivo =
  | "campanha_inexistente"
  | "codigo_publico_divergente"
  | "campanha_encerrada"
  | "campanha_indisponivel"
  | "participante_nao_encontrado"
  | "participante_campanha_divergente"
  | "data_nascimento_invalida"
  | "data_nascimento_divergente"
  | "participante_nao_autorizado"
  | "participante_ja_concluiu";

export type AvaliacaoValidacaoFail = {
  ok: false;
  /** Motivo interno — nunca expor texto técnico ao cliente. */
  motivo: AvaliacaoValidacaoMotivo;
};

export type AvaliacaoValidacaoResult =
  | AvaliacaoValidacaoOk
  | AvaliacaoValidacaoFail;

export type CampanhaPeriodoStatus =
  | "ok"
  | "inexistente"
  | "encerrada"
  | "indisponivel";

/** Avalia período/status da campanha (sem dados do participante). */
export function avaliarPeriodoCampanha(
  campanha: Pick<
    CampanhaAcessoRow,
    "status" | "data_inicio" | "data_encerramento"
  > | null,
  hojeIso?: string
): CampanhaPeriodoStatus {
  if (!campanha) return "inexistente";
  const hoje = hojeIso ?? new Date().toISOString().slice(0, 10);
  const inicio = String(campanha.data_inicio ?? "").slice(0, 10);
  const fim = String(campanha.data_encerramento ?? "").slice(0, 10);
  const status = String(campanha.status ?? "");

  if (status === "encerrada" || (fim && hoje > fim)) {
    return "encerrada";
  }
  if (status !== "aberta") return "indisponivel";
  if (!inicio || !fim) return "indisponivel";
  if (hoje < inicio) return "indisponivel";
  return "ok";
}

function campanhaDisponivel(
  campanha: CampanhaAcessoRow,
  hojeIso: string
): boolean {
  return avaliarPeriodoCampanha(campanha, hojeIso) === "ok";
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

  const periodo = avaliarPeriodoCampanha(input.campanha, hoje);
  if (periodo === "encerrada") {
    return { ok: false, motivo: "campanha_encerrada" };
  }
  if (periodo !== "ok" || !campanhaDisponivel(input.campanha, hoje)) {
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

/** Mapeia motivo interno → código público seguro. */
export function codigoErroPublico(
  motivo: AvaliacaoValidacaoMotivo
): "ja_respondida" | "campanha_encerrada" | "nao_apto" {
  if (motivo === "participante_ja_concluiu") return "ja_respondida";
  if (motivo === "campanha_encerrada") return "campanha_encerrada";
  return "nao_apto";
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

export function participanteJaConcluiu(
  participante: Pick<ParticipanteAcessoRow, "status" | "concluiu_em">
): boolean {
  return (
    participante.status === "respondido" || Boolean(participante.concluiu_em)
  );
}
