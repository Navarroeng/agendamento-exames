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

/**
 * Normaliza nome de exame para comparar cargo × formulário.
 */
function normalizeExameNome(nome: string): string {
  return nome
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Quais exames do formulário fazem parte do ASO contratual (Clínico + cargo).
 * Exames adicionais (fora do cargo) não entram.
 */
export function examesCobertosPeloCreditoContrato(
  exams: Pick<ExameFormItem, "tipo_exame">[],
  nomesExamesCargo: string[]
): Set<string> {
  const cargoSet = new Set(
    nomesExamesCargo.map(normalizeExameNome).filter(Boolean)
  );
  const cobertos = new Set<string>();

  for (const exam of exams) {
    const nome = exam.tipo_exame.trim();
    if (!nome) continue;
    const key = normalizeExameNome(nome);
    if (isExameClinicoManual(nome) || cargoSet.has(key)) {
      cobertos.add(key);
    }
  }

  return cobertos;
}

/**
 * Aplica valor zero + motivo oficial nos exames cobertos pelo crédito.
 * Retorna nova lista; exames fora do cargo permanecem inalterados.
 */
export function applyValoresCreditoContratoNosExames(
  exams: ExameFormItem[],
  nomesExamesCargo: string[]
): ExameFormItem[] {
  const cobertos = examesCobertosPeloCreditoContrato(exams, nomesExamesCargo);

  return exams.map((exam) => {
    const key = normalizeExameNome(exam.tipo_exame);
    if (!cobertos.has(key)) return exam;

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
>(exams: T[], nomesExamesCargo: string[]): T[] {
  const cobertos = examesCobertosPeloCreditoContrato(
    exams.map((e) => ({ tipo_exame: e.tipo_exame })),
    nomesExamesCargo
  );

  return exams.map((exam) => {
    const key = normalizeExameNome(exam.tipo_exame);
    if (!cobertos.has(key)) {
      return { ...exam, incluso_credito_contrato: false };
    }
    return {
      ...exam,
      valor_cliente: 0,
      motivo_valor_zero: MOTIVO_ASO_INCLUSO_CONTRATO,
      incluso_credito_contrato: true,
    };
  });
}

export function exameEhCobertoPeloCredito(
  tipoExame: string,
  nomesExamesCargo: string[]
): boolean {
  return examesCobertosPeloCreditoContrato(
    [{ tipo_exame: tipoExame }],
    nomesExamesCargo
  ).has(normalizeExameNome(tipoExame));
}
