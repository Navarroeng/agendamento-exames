import type { AgendamentoStatus, AgendamentoWithExames } from "@/lib/types";

export type ContratoAgendamentoContagem = {
  contratados: number;
  previstos: number;
  realizados: number;
  utilizados: number;
  pendentes: number;
  disponiveis: number;
  adicionais: number;
  percentual: number;
  mensagem: string;
  concluido: boolean;
};

export type AgendamentoClassificacao = "contrato" | "adicional" | "cancelado";

export function isAgendamentoSelecionavel(
  status: AgendamentoStatus | string
): boolean {
  return status !== "cancelado";
}

export function buildContratoAgendamentoContagem(
  quantidadeContratada: number,
  utilizados: number,
  adicionais = 0
): ContratoAgendamentoContagem {
  const previstos = Math.max(0, quantidadeContratada || 0);
  const usados = Math.max(0, utilizados);
  const disponiveis = Math.max(0, previstos - usados);
  const extras = Math.max(0, adicionais);
  const percentual =
    previstos > 0
      ? Math.min(100, Math.round((usados / previstos) * 100))
      : usados > 0
        ? 100
        : 0;
  const concluido = previstos > 0 ? usados >= previstos : false;

  let mensagem = "";
  if (previstos <= 0) {
    mensagem =
      "Quantidade de colaboradores não informada nas condições aprovadas.";
  } else if (disponiveis === 1) {
    mensagem =
      "Falta selecionar 1 agendamento para atingir a quantidade prevista no contrato.";
  } else if (disponiveis > 1) {
    mensagem = `Faltam selecionar ${disponiveis} agendamentos para atingir a quantidade prevista no contrato.`;
  } else if (extras > 0) {
    mensagem =
      extras === 1
        ? "A quantidade prevista foi atingida e existe 1 agendamento adicional."
        : `A quantidade prevista foi atingida e existem ${extras} agendamentos adicionais.`;
  } else {
    mensagem = "A quantidade prevista de agendamentos do contrato foi atingida.";
  }

  return {
    contratados: previstos,
    previstos,
    realizados: usados,
    utilizados: usados,
    pendentes: disponiveis,
    disponiveis,
    adicionais: extras,
    percentual,
    mensagem,
    concluido,
  };
}

export function resolveClassificacaoAgendamento(params: {
  status: AgendamentoStatus | string;
  selecionado: boolean;
}): AgendamentoClassificacao {
  if (params.status === "cancelado") return "cancelado";
  if (params.selecionado) return "contrato";
  return "adicional";
}

export function isDataNaVigencia(
  dataExame: string,
  dataInicio: string | null | undefined,
  dataFim: string | null | undefined
): boolean {
  const dia = dataExame.slice(0, 10);
  const inicio = (dataInicio ?? "").slice(0, 10);
  const fim = (dataFim ?? "").slice(0, 10);
  if (!dia || !inicio || !fim) return false;
  return dia >= inicio && dia <= fim;
}

/** Compat: legado consome_saldo em agendamentos. */
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
