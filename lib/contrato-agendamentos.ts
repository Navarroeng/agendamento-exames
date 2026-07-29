import type { AgendamentoWithExames } from "@/lib/types";

export type ContratoAgendamentoContagem = {
  contratados: number;
  realizados: number;
  pendentes: number;
  adicionais: number;
  percentual: number;
  mensagem: string;
  concluido: boolean;
};

function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Chave estável do colaborador para contagem (CPF; fallback nome). */
export function colaboradorContagemKey(
  agendamento: Pick<AgendamentoWithExames, "colaborador" | "colaborador_cpf">
): string {
  const cpf = digitsOnly(agendamento.colaborador_cpf);
  if (cpf.length >= 11) return `cpf:${cpf}`;
  return `nome:${(agendamento.colaborador ?? "").trim().toLowerCase()}`;
}

export function isAgendamentoValidoParaContrato(
  agendamento: Pick<AgendamentoWithExames, "status" | "contrato_id">,
  contratoId: string
): boolean {
  if (!contratoId) return false;
  if (agendamento.contrato_id !== contratoId) return false;
  if (agendamento.status === "cancelado") return false;
  return true;
}

export function countColaboradoresUnicos(
  agendamentos: Array<
    Pick<
      AgendamentoWithExames,
      "status" | "contrato_id" | "colaborador" | "colaborador_cpf"
    >
  >,
  contratoId: string
): number {
  const keys = new Set<string>();
  for (const ag of agendamentos) {
    if (!isAgendamentoValidoParaContrato(ag, contratoId)) continue;
    const key = colaboradorContagemKey(ag);
    if (!key || key === "nome:") continue;
    keys.add(key);
  }
  return keys.size;
}

export function buildContratoAgendamentoContagem(
  quantidadeContratada: number,
  realizados: number
): ContratoAgendamentoContagem {
  const contratados = Math.max(0, quantidadeContratada || 0);
  const feitos = Math.max(0, realizados);
  const pendentes = Math.max(0, contratados - feitos);
  const adicionais = Math.max(0, feitos - contratados);
  const percentual =
    contratados > 0
      ? Math.min(100, Math.round((feitos / contratados) * 100))
      : feitos > 0
        ? 100
        : 0;
  const concluido = contratados > 0 ? feitos >= contratados : feitos > 0;

  let mensagem = "";
  if (contratados <= 0) {
    mensagem =
      "Quantidade de colaboradores não informada nas condições aprovadas.";
  } else if (pendentes === 1) {
    mensagem =
      "Falta 1 agendamento para atingir a quantidade inicial prevista no contrato.";
  } else if (pendentes > 1) {
    mensagem = `Faltam ${pendentes} agendamentos para atingir a quantidade inicial prevista no contrato.`;
  } else if (adicionais === 1) {
    mensagem =
      "A quantidade inicial foi atingida e existe 1 agendamento adicional.";
  } else if (adicionais > 1) {
    mensagem = `A quantidade inicial foi atingida e existem ${adicionais} agendamentos adicionais.`;
  } else {
    mensagem =
      "A quantidade inicial de agendamentos prevista no contrato foi atingida.";
  }

  return {
    contratados,
    realizados: feitos,
    pendentes,
    adicionais,
    percentual,
    mensagem,
    concluido,
  };
}
