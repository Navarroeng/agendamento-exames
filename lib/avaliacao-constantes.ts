export const MENSAGEM_VALIDACAO_GENERICA =
  "Não foi possível localizar um participante apto para responder esta pesquisa.\n\nVerifique as informações informadas ou entre em contato com o responsável pela campanha.";

export const MENSAGEM_JA_RESPONDIDA_TITULO = "Tudo certo!";

export const MENSAGEM_JA_RESPONDIDA_CORPO =
  "Identificamos que esta pesquisa já foi respondida anteriormente.\n\nAgradecemos sua participação.\n\nCaso acredite que isso seja um equívoco, entre em contato com o responsável pela campanha.";

export const MENSAGEM_CAMPANHA_ENCERRADA_TITULO = "Esta campanha foi encerrada.";

export const MENSAGEM_CAMPANHA_ENCERRADA_CORPO =
  "Esta pesquisa foi encerrada e não está mais recebendo respostas.\n\nCaso necessário, entre em contato com sua empresa ou com a Navarro Engenharia.";

export const MENSAGEM_PRAZO_ENCERRADO_TITULO =
  "O prazo desta pesquisa foi encerrado.";

export const MENSAGEM_PRAZO_ENCERRADO_CORPO =
  "O período para participação nesta pesquisa foi finalizado.\n\nCaso necessário, entre em contato com sua empresa ou com a Navarro Engenharia.";

export const AVALIACAO_SESSION_COOKIE = "avaliacao_sessao";

/** Códigos públicos seguros para o frontend (sem detalhar a falha). */
export type AvaliacaoErroCodigo =
  | "ja_respondida"
  | "campanha_encerrada"
  | "prazo_encerrado"
  | "nao_apto";

export function mensagemPorCodigoErro(
  codigo: AvaliacaoErroCodigo | string | undefined
): string {
  if (codigo === "ja_respondida") return MENSAGEM_JA_RESPONDIDA_CORPO;
  if (codigo === "prazo_encerrado") return MENSAGEM_PRAZO_ENCERRADO_CORPO;
  if (codigo === "campanha_encerrada") return MENSAGEM_CAMPANHA_ENCERRADA_CORPO;
  return MENSAGEM_VALIDACAO_GENERICA;
}
