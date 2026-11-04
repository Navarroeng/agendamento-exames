/**
 * O PDF e o modelo contratual são informações diferentes.
 *
 * Versão do PDF: `orcamento_contrato_documentos.versao`.
 * É o número sequencial de gerações daquele documento (1, 2, 3…),
 * calculado pelo maior valor já gravado na aprovação, mais um.
 * Não identifica as condições da Gestão SST.
 *
 * Modelo contratual: `orcamentos.proposta_modelo_versao` e
 * `orcamento_aprovacoes.contrato_modelo_versao`.
 * 1 = condições anteriores. 2 = condições novas, copiadas da proposta
 * na inserção da aprovação. Proposta gravada como 1 não sobe para 2
 * quando o PDF é gerado de novo.
 * `condicoes_revisao` também não é o modelo: ela só marca se o PDF
 * ainda reflete as condições comerciais vigentes.
 */

export type ModeloContratualGestaoSst = 1 | 2;

export function resolverModeloContratualGestaoSst(params: {
  propostaModeloVersao?: number | null;
  contratoModeloVersao?: number | null;
}): ModeloContratualGestaoSst {
  if (params.propostaModeloVersao === 1) return 1;
  return params.contratoModeloVersao === 2 ? 2 : 1;
}

export function rotuloModeloContratualGestaoSst(
  modelo: ModeloContratualGestaoSst
): string {
  return modelo === 2
    ? "Novas condições da Gestão SST"
    : "Condições anteriores";
}
