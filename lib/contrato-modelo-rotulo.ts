/**
 * Versão do PDF e modelo contratual são dados diferentes.
 *
 * Versão do PDF: `orcamento_contrato_documentos.versao`, o número da
 * geração daquele arquivo. Não diz qual texto foi usado.
 *
 * Modelo da geração: todo contrato de Gestão SST em mensalidade gerado
 * a partir desta regra usa as condições novas, qualquer que seja a data
 * ou a versão gravada na proposta e na aprovação.
 *
 * Modelo do arquivo já salvo: o nome gravado em `arquivo_nome` (ou
 * `modelo_contratual`, se a coluna existir) marca só os PDFs criados
 * com as condições novas. Arquivo sem essa marca permanece nas
 * condições anteriores e não é reapresentado como modelo novo.
 * Visualizar e baixar abrem o arquivo salvo. Só gerar cria outro PDF.
 */

export type ModeloContratualGestaoSst = 1 | 2;

export const MODELO_CONTRATUAL_ATUAL_GESTAO_SST = 2;

/** Marca persistida no nome do arquivo novo. Não altera o PDF anterior. */
export const MARCADOR_PDF_MODELO_GESTAO_SST_2 = "modelo-gestao-sst-2";

export function resolverModeloContratualParaGeracao(
  modalidade: string | null | undefined
): ModeloContratualGestaoSst {
  return modalidade === "mensalidade" ? MODELO_CONTRATUAL_ATUAL_GESTAO_SST : 1;
}

export function nomeArquivoComModeloContrato(
  nome: string,
  modelo: ModeloContratualGestaoSst
): string {
  if (modelo !== 2 || nome.includes(MARCADOR_PDF_MODELO_GESTAO_SST_2)) {
    return nome;
  }
  return nome.replace(/\.pdf$/i, ` ${MARCADOR_PDF_MODELO_GESTAO_SST_2}.pdf`);
}

export function modeloContratualDoPdfSalvo(documento: {
  modelo_contratual?: number | null;
  arquivo_nome?: string | null;
  storage_path?: string | null;
}): ModeloContratualGestaoSst {
  if (documento.modelo_contratual === 2 || documento.modelo_contratual === 1) {
    return documento.modelo_contratual;
  }
  const gravado = `${documento.arquivo_nome ?? ""} ${documento.storage_path ?? ""}`;
  return gravado.includes(MARCADOR_PDF_MODELO_GESTAO_SST_2) ? 2 : 1;
}

export function rotuloModeloContratualGestaoSst(
  modelo: ModeloContratualGestaoSst
): string {
  return modelo === 2
    ? "Novas condições da Gestão SST"
    : "Condições anteriores";
}
