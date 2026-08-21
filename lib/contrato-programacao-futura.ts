import { TIPOS_ASO_PODEM_ORIGINAR_PERIODICO } from "@/lib/periodico-geracao";

/** Motivos disponíveis no modal “Informar exame futuro”. */
export const MOTIVOS_EXAME_FUTURO = [
  "ASO ainda vigente",
  "Exame periódico de 6 meses",
  "Solicitação do cliente",
  "Outro",
] as const;

export type MotivoExameFuturo = (typeof MOTIVOS_EXAME_FUTURO)[number];

export const ORIGEM_PERIODICO_IMPLANTACAO = "implantacao_inicial" as const;
export const ORIGEM_PERIODICO_AGENDAMENTO = "agendamento" as const;

export type OrigemPeriodicoFuturo =
  | typeof ORIGEM_PERIODICO_IMPLANTACAO
  | typeof ORIGEM_PERIODICO_AGENDAMENTO
  | string;

export const TIPOS_ASO_EXAME_FUTURO = TIPOS_ASO_PODEM_ORIGINAR_PERIODICO;

export function isMotivoExameFuturo(value: string): value is MotivoExameFuturo {
  return (MOTIVOS_EXAME_FUTURO as readonly string[]).includes(value);
}

export function labelOrigemPeriodico(origem: string | null | undefined): string {
  const key = (origem ?? "").trim().toLowerCase();
  if (key === ORIGEM_PERIODICO_IMPLANTACAO || key === "implantação inicial") {
    return "Implantação Inicial";
  }
  if (key === ORIGEM_PERIODICO_AGENDAMENTO || !key) {
    return "Agendamento";
  }
  return origem!.trim();
}

export function labelMotivoExameFuturo(
  motivo: string | null | undefined,
  motivoDetalhe?: string | null
): string {
  const base = (motivo ?? "").trim();
  if (!base) return "—";
  if (base === "Outro") {
    const detalhe = (motivoDetalhe ?? "").trim();
    return detalhe ? `Outro — ${detalhe}` : "Outro";
  }
  return base;
}

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/** Ex.: 2027-01-15 → "Janeiro/2027" */
export function formatMesAnoPrevisto(isoDate: string | null | undefined): string {
  const raw = (isoDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "—";
  const [y, m] = raw.split("-").map(Number);
  const mes = MESES_PT[m - 1];
  if (!mes || !y) return "—";
  return `${mes}/${y}`;
}

export type CriarExameFuturoInput = {
  contratoId: string;
  clienteNome: string;
  colaborador: string;
  colaboradorCpf: string | null;
  tipoAso: string;
  dataPrevistaIso: string;
  motivo: MotivoExameFuturo;
  motivoDetalhe: string | null;
  observacoes: string | null;
  criadoPor: string;
};

export type ColaboradorSugestao = {
  colaborador: string;
  colaborador_cpf: string | null;
};
