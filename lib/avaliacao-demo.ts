/**
 * Modo DEMO exclusivo para validação de UI/UX. Não utilizar para campanhas reais.
 *
 * Bypass permitido SOMENTE para o código público AVALIACAO_DEMO_CODE.
 * Campanhas reais continuam com validação segura (CPF + campanha + código + sessão).
 */

export const AVALIACAO_DEMO_CODE = "DEMO01";

export const AVALIACAO_DEMO_EMPRESA = "Empresa Demonstração Ltda";

export const AVALIACAO_DEMO_CAMPANHA_NOME =
  "Pesquisa de Riscos Psicossociais — Demonstração";

export const AVALIACAO_DEMO_PARTICIPANTE_NOME = "Participante Demonstração";

export function isAvaliacaoDemoCodigo(
  codigo: string | null | undefined
): boolean {
  return (
    String(codigo ?? "")
      .trim()
      .toUpperCase() === AVALIACAO_DEMO_CODE
  );
}

export function getAvaliacaoDemoInfo() {
  return {
    ok: true as const,
    codigoPublico: AVALIACAO_DEMO_CODE,
    empresaNome: AVALIACAO_DEMO_EMPRESA,
    campanhaNome: AVALIACAO_DEMO_CAMPANHA_NOME,
    status: "aberta" as const,
    disponivel: true as const,
  };
}
