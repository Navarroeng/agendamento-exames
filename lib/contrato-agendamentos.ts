import type { AgendamentoStatus, AgendamentoWithExames } from "@/lib/types";

export type ContratoAgendamentoContagem = {
  /** Alias: quantidade prevista no contrato. */
  contratados: number;
  previstos: number;
  /** Colaboradores únicos que consomem saldo. */
  realizados: number;
  utilizados: number;
  pendentes: number;
  disponiveis: number;
  /** Agendamentos vinculados sem consumir saldo. */
  adicionais: number;
  percentual: number;
  mensagem: string;
  concluido: boolean;
};

type AgendamentoContagemPick = Pick<
  AgendamentoWithExames,
  | "status"
  | "contrato_id"
  | "colaborador"
  | "colaborador_cpf"
  | "consome_saldo_contrato"
>;

function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Chave estável do colaborador para contagem (CPF; sem fallback por nome). */
export function colaboradorContagemKey(
  agendamento: Pick<AgendamentoWithExames, "colaborador" | "colaborador_cpf">
): string | null {
  const cpf = digitsOnly(agendamento.colaborador_cpf);
  if (cpf.length >= 11) return `cpf:${cpf}`;
  return null;
}

export function isAgendamentoVinculadoContrato(
  agendamento: Pick<AgendamentoWithExames, "status" | "contrato_id">,
  contratoId: string
): boolean {
  if (!contratoId) return false;
  if (agendamento.contrato_id !== contratoId) return false;
  if (agendamento.status === "cancelado") return false;
  return true;
}

/** Legado null + contrato_id = consome saldo. */
export function agendamentoConsomeSaldoContrato(
  agendamento: Pick<
    AgendamentoWithExames,
    "status" | "contrato_id" | "consome_saldo_contrato"
  >
): boolean {
  if (!agendamento.contrato_id) return false;
  if (agendamento.status === "cancelado") return false;
  if (agendamento.consome_saldo_contrato === false) return false;
  return true;
}

export function isAgendamentoValidoParaContrato(
  agendamento: Pick<AgendamentoWithExames, "status" | "contrato_id">,
  contratoId: string
): boolean {
  return isAgendamentoVinculadoContrato(agendamento, contratoId);
}

/** Colaboradores únicos que consomem saldo da implantação. */
export function countColaboradoresUnicos(
  agendamentos: AgendamentoContagemPick[],
  contratoId: string
): number {
  const keys = new Set<string>();
  for (const ag of agendamentos) {
    if (!isAgendamentoVinculadoContrato(ag, contratoId)) continue;
    if (!agendamentoConsomeSaldoContrato(ag)) continue;
    const key = colaboradorContagemKey(ag);
    if (!key) continue;
    keys.add(key);
  }
  return keys.size;
}

export function countAgendamentosAdicionais(
  agendamentos: AgendamentoContagemPick[],
  contratoId: string
): number {
  let n = 0;
  for (const ag of agendamentos) {
    if (!isAgendamentoVinculadoContrato(ag, contratoId)) continue;
    if (agendamentoConsomeSaldoContrato(ag)) continue;
    n += 1;
  }
  return n;
}

export function colaboradorJaConsomeSaldoNoContrato(
  agendamentos: Array<AgendamentoContagemPick & { id?: string }>,
  contratoId: string,
  colaboradorCpf: string,
  ignorarAgendamentoId?: string | null
): boolean {
  const key = colaboradorContagemKey({
    colaborador: "",
    colaborador_cpf: colaboradorCpf,
  });
  if (!key) return false;
  for (const ag of agendamentos) {
    if (ignorarAgendamentoId && ag.id === ignorarAgendamentoId) continue;
    if (!isAgendamentoVinculadoContrato(ag, contratoId)) continue;
    if (!agendamentoConsomeSaldoContrato(ag)) continue;
    if (colaboradorContagemKey(ag) === key) return true;
  }
  return false;
}

export function buildContratoAgendamentoContagem(
  quantidadeContratada: number,
  realizados: number,
  adicionais = 0
): ContratoAgendamentoContagem {
  const previstos = Math.max(0, quantidadeContratada || 0);
  const utilizados = Math.max(0, realizados);
  const disponiveis = Math.max(0, previstos - utilizados);
  const extras = Math.max(0, adicionais);
  const percentual =
    previstos > 0
      ? Math.min(100, Math.round((utilizados / previstos) * 100))
      : utilizados > 0
        ? 100
        : 0;
  const concluido = previstos > 0 ? utilizados >= previstos : false;

  let mensagem = "";
  if (previstos <= 0) {
    mensagem =
      "Quantidade de colaboradores não informada nas condições aprovadas.";
  } else if (disponiveis === 1) {
    mensagem =
      "Falta 1 agendamento para atingir a quantidade inicial prevista no contrato.";
  } else if (disponiveis > 1) {
    mensagem = `Faltam ${disponiveis} agendamentos para atingir a quantidade inicial prevista no contrato.`;
  } else if (extras > 0) {
    mensagem =
      extras === 1
        ? "A quantidade inicial foi atingida e existe 1 agendamento adicional."
        : `A quantidade inicial foi atingida e existem ${extras} agendamentos adicionais.`;
  } else {
    mensagem =
      "A quantidade inicial de agendamentos prevista no contrato foi atingida.";
  }

  return {
    contratados: previstos,
    previstos,
    realizados: utilizados,
    utilizados,
    pendentes: disponiveis,
    disponiveis,
    adicionais: extras,
    percentual,
    mensagem,
    concluido,
  };
}

export function statusContratoPodeReceberVinculo(
  status: string | null | undefined
): boolean {
  const s = (status ?? "").toLowerCase();
  return s !== "cancelado" && s !== "encerrado";
}

export type VinculoContratoDecision = "pendente" | "sim" | "nao";

export type AgendamentoStatusVinculo = AgendamentoStatus;
