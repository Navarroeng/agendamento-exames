/**
 * Cronograma de vencimentos do contrato documental pontual.
 * Reutilizável; ativo hoje para AET via tipo documental — não usa cliente_contratos.
 */

import {
  addCalendarMonths,
  type ContratoParcela,
} from "@/lib/contrato-pagamento";
import type { TipoDocumentoContrato } from "@/lib/servico-aet";

export const CONTRATO_VENCIMENTOS_INCOMPLETOS_MSG =
  "Informe a data de vencimento de todas as parcelas antes de gerar o contrato.";

export const CONTRATO_ASSINADO_BLOQUEIA_REGENERACAO_MSG =
  "Contrato assinado. As datas de vencimento e o PDF não podem ser alterados.";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function contratoUsaCronogramaVencimentos(
  tipoDocumento: TipoDocumentoContrato
): boolean {
  return tipoDocumento === "aet";
}

export function isDataIsoValida(value: string | null | undefined): boolean {
  const iso = (value ?? "").trim();
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

export function sugerirDatasVencimento(
  dataBaseIso: string,
  quantidade: number
): string[] {
  if (!isDataIsoValida(dataBaseIso)) {
    throw new Error("Data base inválida para sugerir vencimentos.");
  }
  const n = Math.max(1, Math.floor(quantidade) || 1);
  return Array.from({ length: n }, (_, i) =>
    i === 0 ? dataBaseIso : addCalendarMonths(dataBaseIso, i)
  );
}

export function validarCronogramaVencimentos(
  datas: Array<string | null | undefined>,
  quantidade: number
): string | null {
  const n = Math.max(1, Math.floor(quantidade) || 1);
  if (datas.length !== n) return CONTRATO_VENCIMENTOS_INCOMPLETOS_MSG;
  for (const data of datas) {
    if (!isDataIsoValida(data)) return CONTRATO_VENCIMENTOS_INCOMPLETOS_MSG;
  }
  return null;
}

export function mesclarVencimentosSalvos(params: {
  quantidade: number;
  sugeridas: string[];
  salvas: Array<{ indice: number; data_vencimento: string }>;
}): string[] {
  const n = Math.max(1, Math.floor(params.quantidade) || 1);
  const byIndice = new Map<number, string>();
  for (const row of params.salvas) {
    if (isDataIsoValida(row.data_vencimento)) {
      byIndice.set(row.indice, row.data_vencimento.trim());
    }
  }
  return Array.from({ length: n }, (_, i) => {
    const saved = byIndice.get(i + 1);
    if (saved) return saved;
    return params.sugeridas[i] ?? "";
  });
}

export function aplicarDatasNasParcelas(
  parcelas: ContratoParcela[],
  datas: string[]
): ContratoParcela[] {
  const erro = validarCronogramaVencimentos(datas, parcelas.length);
  if (erro) throw new Error(erro);
  return parcelas.map((parcela, i) => ({
    ...parcela,
    dataIso: (datas[i] ?? "").trim(),
  }));
}
