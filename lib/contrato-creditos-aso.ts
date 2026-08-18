/**
 * Créditos de ASO contratual em aberto (1 linha = 1 vaga).
 */

import { isExameClinicoManual } from "@/lib/exame-pricing";
import { formatMoney, parseMoney } from "@/lib/money";
import type { ExameFormItem } from "@/lib/types";

export const CONTRATO_CREDITO_ASO_STATUSES = [
  "disponivel",
  "utilizado",
  "expirado",
  "removido",
] as const;

export type ContratoCreditoAsoStatus =
  (typeof CONTRATO_CREDITO_ASO_STATUSES)[number];

export const MOTIVO_ASO_INCLUSO_CONTRATO = "ASO incluso no contrato";

export const CONTRATO_CREDITO_ASO_STATUS_LABELS: Record<
  ContratoCreditoAsoStatus,
  string
> = {
  disponivel: "Disponível",
  utilizado: "Utilizado",
  expirado: "Expirado",
  removido: "Removido",
};

export type ContratoCreditoAsoRecord = {
  id: string;
  contrato_id: string;
  orcamento_id: string | null;
  cliente_id: string | null;
  cliente_cnpj: string | null;
  quantidade: number;
  status: ContratoCreditoAsoStatus;
  valido_ate: string | null;
  observacao: string | null;
  agendamento_id: string | null;
  colaborador: string | null;
  colaborador_cpf: string | null;
  criado_por: string | null;
  criado_em: string;
  utilizado_por: string | null;
  utilizado_em: string | null;
  removido_por: string | null;
  removido_em: string | null;
  expirado_em: string | null;
  created_at: string;
  updated_at: string;
  /** Join opcional */
  contrato_numero?: string | null;
  contrato_data_inicio?: string | null;
  contrato_data_fim?: string | null;
};

export function isContratoCreditoAsoStatus(
  value: string
): value is ContratoCreditoAsoStatus {
  return (CONTRATO_CREDITO_ASO_STATUSES as readonly string[]).includes(value);
}

export function creditoContaNoProgresso(
  status: ContratoCreditoAsoStatus
): boolean {
  return status === "disponivel";
}

export function isCreditoUtilizavel(
  credito: Pick<ContratoCreditoAsoRecord, "status" | "valido_ate">,
  hojeIso: string = new Date().toISOString().slice(0, 10)
): boolean {
  if (credito.status !== "disponivel") return false;
  const fim = (credito.valido_ate ?? "").slice(0, 10);
  if (fim && fim < hojeIso) return false;
  return true;
}

/** Normaliza nome de exame para comparar cobertura do crédito. */
function normalizeExameNome(nome: string): string {
  return nome
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Só o Clínico é coberto pelo crédito/vaga contratual. Complementares não. */
export function exameEhCobertoPeloCredito(tipoExame: string): boolean {
  return isExameClinicoManual(tipoExame);
}

/**
 * Quais exames do formulário são cobertos pelo ASO contratual.
 * Apenas o Clínico: complementares (Audiometria, ECG, etc.) permanecem cobráveis.
 */
export function examesCobertosPeloCreditoContrato(
  exams: Pick<ExameFormItem, "tipo_exame">[]
): Set<string> {
  const cobertos = new Set<string>();

  for (const exam of exams) {
    const nome = exam.tipo_exame.trim();
    if (!nome) continue;
    if (exameEhCobertoPeloCredito(nome)) {
      cobertos.add(normalizeExameNome(nome));
    }
  }

  return cobertos;
}

export function exameTemMotivoCreditoContrato(
  motivo: string | null | undefined
): boolean {
  return (motivo ?? "").trim() === MOTIVO_ASO_INCLUSO_CONTRATO;
}

/**
 * Aplica valor zero + motivo oficial somente no Clínico coberto pelo crédito.
 * Complementares permanecem inalterados (preço de venda do cliente).
 */
export function applyValoresCreditoContratoNosExames(
  exams: ExameFormItem[]
): ExameFormItem[] {
  return exams.map((exam) => {
    if (!exameEhCobertoPeloCredito(exam.tipo_exame)) {
      if (!exameTemMotivoCreditoContrato(exam.motivo_valor_zero)) return exam;
      return { ...exam, motivo_valor_zero: "" };
    }

    const custo = exam.custo_clinica;
    return {
      ...exam,
      valor_cliente: formatMoney(0),
      lucro: formatMoney(0 - parseMoney(custo)),
      motivo_valor_zero: MOTIVO_ASO_INCLUSO_CONTRATO,
      clinicoValorManual: true,
      precoAutomatico: false,
    };
  });
}

/** Mesma regra para payload de persistência. */
export function applyValoresCreditoContratoNosExamesPayload<
  T extends {
    tipo_exame: string;
    valor_cliente: number;
    custo_clinica: number;
    motivo_valor_zero?: string | null;
    incluso_credito_contrato?: boolean;
  },
>(exams: T[]): T[] {
  return exams.map((exam) => {
    if (!exameEhCobertoPeloCredito(exam.tipo_exame)) {
      return {
        ...exam,
        incluso_credito_contrato: false,
        motivo_valor_zero: exameTemMotivoCreditoContrato(exam.motivo_valor_zero)
          ? null
          : exam.motivo_valor_zero,
      };
    }
    return {
      ...exam,
      valor_cliente: 0,
      motivo_valor_zero: MOTIVO_ASO_INCLUSO_CONTRATO,
      incluso_credito_contrato: true,
    };
  });
}

export function examesIndicamUsoDeCreditoContrato(
  exams: Array<{
    tipo_exame: string;
    motivo_valor_zero?: string | null;
    incluso_credito_contrato?: boolean | null;
  }>
): boolean {
  return exams.some(
    (exam) =>
      exameEhCobertoPeloCredito(exam.tipo_exame) &&
      (exam.incluso_credito_contrato === true ||
        exameTemMotivoCreditoContrato(exam.motivo_valor_zero))
  );
}

/** Complementar zerado indevidamente pelo crédito antigo (Clínico + cargo). */
export function complementarZeradoIndevidoPeloCredito(
  exam: Pick<ExameFormItem, "tipo_exame" | "valor_cliente" | "motivo_valor_zero">
): boolean {
  if (exameEhCobertoPeloCredito(exam.tipo_exame)) return false;
  if (!exameTemMotivoCreditoContrato(exam.motivo_valor_zero)) return false;
  return parseMoney(exam.valor_cliente) === 0;
}
