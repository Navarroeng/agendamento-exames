/**
 * Exportação PDF do Relatório de Riscos Psicossociais.
 * Abordagem: CSS @media print + window.print() — fiel ao layout web,
 * sem recalcular COPSOQ e sem segunda geração programática do relatório.
 */

/** Sanitiza trecho para nome de arquivo (ASCII-ish). */
export function sanitizarNomeArquivoEmpresa(empresa: string): string {
  const base = String(empresa ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return base.slice(0, 60) || "Empresa";
}

export function formatDataArquivoPdf(data: Date = new Date()): string {
  const dd = String(data.getDate()).padStart(2, "0");
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const yyyy = data.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Relatorio_Riscos_Psicossociais_[EMPRESA]_[DATA].pdf
 */
export function nomeArquivoPdfRelatorioRiscos(
  empresaNome: string,
  dataRef: Date | string = new Date()
): string {
  const data =
    typeof dataRef === "string" ? new Date(dataRef) : dataRef;
  const safeDate = Number.isNaN(data.getTime()) ? new Date() : data;
  const emp = sanitizarNomeArquivoEmpresa(empresaNome);
  return `Relatorio_Riscos_Psicossociais_${emp}_${formatDataArquivoPdf(safeDate)}.pdf`;
}

export const RISCOS_RELATORIO_PRINT_ROOT_ID = "riscos-relatorio-print-root";
export const RISCOS_RELATORIO_PRINTING_CLASS = "riscos-relatorio-printing";

/**
 * Abre o diálogo nativo de impressão / “Salvar como PDF”.
 * Define o título do documento para sugerir o nome do arquivo.
 */
export async function exportarRelatorioRiscosPdf(options: {
  empresaNome: string;
  /** ISO ou Date — data de geração do relatório. */
  geradoEm?: string | Date | null;
}): Promise<void> {
  if (typeof window === "undefined") return;

  const filename = nomeArquivoPdfRelatorioRiscos(
    options.empresaNome,
    options.geradoEm ?? new Date()
  );
  const titleSemExt = filename.replace(/\.pdf$/i, "");
  const prevTitle = document.title;

  document.title = titleSemExt;
  document.body.classList.add(RISCOS_RELATORIO_PRINTING_CLASS);

  // Dá tempo ao layout/print CSS e ao Recharts reagir ao resize.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
  window.dispatchEvent(new Event("resize"));
  await new Promise((r) => setTimeout(r, 120));

  const cleanup = () => {
    document.body.classList.remove(RISCOS_RELATORIO_PRINTING_CLASS);
    document.title = prevTitle;
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);

  try {
    window.print();
  } catch {
    cleanup();
    throw new Error("Não foi possível abrir a impressão / salvar PDF.");
  }

  // Fallback se afterprint não disparar (alguns browsers).
  window.setTimeout(cleanup, 2000);
}
