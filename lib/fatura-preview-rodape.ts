import type { FaturaStatus } from "@/lib/types";

/**
 * A visualização de uma fatura ainda não gravada não tem status.
 * Rascunho é o mesmo estado "aberta para emissão" da listagem.
 */
export function faturaPreviewPermiteEmitir(preview: {
  status?: FaturaStatus | null;
}): boolean {
  const status = preview.status ?? null;
  return status === null || status === "rascunho";
}

export function acoesRodapePreviewFatura(preview: {
  readonly: boolean;
  status?: FaturaStatus | null;
}): {
  rotuloFechar: string;
  mostrarSalvarRascunho: boolean;
  mostrarEmitir: boolean;
  mostrarGerarPdf: boolean;
} {
  const status = preview.status ?? null;
  const podeEmitir = faturaPreviewPermiteEmitir({ status });

  if (!preview.readonly) {
    const editavel = status !== "cancelada";
    return {
      rotuloFechar: "Voltar / Editar filtros",
      mostrarSalvarRascunho: editavel,
      mostrarEmitir: editavel && podeEmitir,
      mostrarGerarPdf: editavel,
    };
  }

  const pdfDeFaturaExistente =
    status === "rascunho" ||
    status === "emitida" ||
    status === "reemitida" ||
    status === "substituida" ||
    status === "necessita_reemissao";

  return {
    rotuloFechar: "Fechar",
    mostrarSalvarRascunho: false,
    mostrarEmitir: podeEmitir,
    mostrarGerarPdf: pdfDeFaturaExistente,
  };
}
