/** Servido pelo Next a partir de `public/orcamentos/ultima-pagina-orcamento.pdf`. */
export const ULTIMA_PAGINA_ORCAMENTO_PUBLIC_PATH =
  "/orcamentos/ultima-pagina-orcamento.pdf";

const ULTIMA_PAGINA_ORCAMENTO_ARQUIVO =
  "public/orcamentos/ultima-pagina-orcamento.pdf";

let carregamento: Promise<Uint8Array> | null = null;

function validarPdf(bytes: Uint8Array): Uint8Array {
  if (
    bytes.byteLength < 5 ||
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "%PDF"
  ) {
    throw new Error("A página institucional do orçamento não é um PDF válido.");
  }
  return bytes;
}

async function lerUltimaPaginaOrcamentoPdf(): Promise<Uint8Array> {
  if (typeof window === "undefined") {
    const { readFile } = await import(
      /* webpackIgnore: true */ "node:fs/promises"
    );
    const { join } = await import(/* webpackIgnore: true */ "node:path");
    const buf = await readFile(
      join(process.cwd(), ULTIMA_PAGINA_ORCAMENTO_ARQUIVO)
    );
    return validarPdf(new Uint8Array(buf));
  }

  const response = await fetch(ULTIMA_PAGINA_ORCAMENTO_PUBLIC_PATH);
  if (!response.ok) {
    throw new Error(
      "Não foi possível carregar a página institucional do orçamento."
    );
  }
  return validarPdf(new Uint8Array(await response.arrayBuffer()));
}

/** PDF original da última página, lido do arquivo do projeto. */
export function carregarUltimaPaginaOrcamentoPdf(): Promise<Uint8Array> {
  if (!carregamento) {
    carregamento = lerUltimaPaginaOrcamentoPdf().catch((error) => {
      carregamento = null;
      throw error;
    });
  }
  return carregamento;
}

/**
 * Acrescenta o flyer institucional uma única vez, depois das páginas já
 * desenhadas. A página copiada permanece o PDF original, sem cabeçalho,
 * rodapé ou numeração do orçamento.
 */
export async function anexarUltimaPaginaOrcamento(
  pdfOrcamento: Uint8Array
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const institucional = await carregarUltimaPaginaOrcamentoPdf();
  const orcamento = await PDFDocument.load(pdfOrcamento);
  const flyer = await PDFDocument.load(institucional);
  const paginasAntes = orcamento.getPageCount();
  const copiadas = await orcamento.copyPages(flyer, flyer.getPageIndices());
  if (copiadas.length !== 1) {
    throw new Error(
      "A página institucional do orçamento deve conter exatamente uma página."
    );
  }
  orcamento.addPage(copiadas[0]);
  if (orcamento.getPageCount() !== paginasAntes + 1) {
    throw new Error("Falha ao anexar a página institucional do orçamento.");
  }
  return orcamento.save();
}
