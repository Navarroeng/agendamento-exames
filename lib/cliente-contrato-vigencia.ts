import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  buscarContratoAtivo,
  complementarContratosComCobranca,
  listarContratosPorCliente,
} from "@/services/cliente-contrato.service";
import {
  buscarClientePorCnpjDigits,
  listarClientesParaSelect,
} from "@/services/cliente.service";
import {
  CLIENTE_CADASTRO_AMBIGUO_MSG,
  escolherUnicoPorNome,
  planClienteLookup,
  selecionarContratoVigenteParaAgendamento,
} from "@/lib/agendamento-cliente-lookup";
import {
  contratoCobrancaMensal,
  type ClienteContratoConsulta,
} from "@/lib/cliente-contrato-atual";
import { resolveDisponibilidadeAgendamentoCliente } from "@/lib/cliente-disponibilidade-agendamento";
import type { ClienteContratoRecord, ClienteContratoStatus } from "@/lib/types";

export const CONTRATO_VIGENTE_ERROR_MESSAGE =
  "Cliente sem contrato vigente. Não é possível agendar exames até renovar o contrato.";

export const CONTRATO_ENCERRADO_ERROR_MESSAGE =
  "O contrato desta empresa está encerrado. Não é possível criar novos agendamentos.";

/** Mesma regra de vigência, aplicada a inclusão manual em Riscos Psicossociais. */
export const CONTRATO_VIGENTE_RISCOS_ERROR_MESSAGE =
  "Cliente sem contrato vigente. Não é possível iniciar a Pesquisa Psicossocial.";

export type ContratoVigenciaResult = {
  vigente: boolean;
  dataInicio?: string;
  dataFim?: string;
  clienteId?: string;
  contratoId?: string;
  /** Motivo quando não está vigente. */
  motivo?: string | null;
};

function isDateWithinVigencia(
  dataAgendamento: string,
  dataInicio: string,
  dataFim: string
): boolean {
  return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
}

function assinaturaEfetiva(
  contrato: Pick<ContratoMensalAgendamento, "contrato_assinado_em" | "contrato_assinado">
): boolean {
  const assinadaEm = (contrato.contrato_assinado_em ?? "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(assinadaEm)) return true;
  return contrato.contrato_assinado === true;
}

const STATUS_MENSAL_OPERACIONAL: ClienteContratoStatus[] = [
  "ativo",
  "em_renovacao",
  "assinado",
  "aguardando_pagamento",
];

export type ContratoMensalAgendamento = Pick<
  ClienteContratoRecord,
  "status" | "orcamento_id"
> &
  Partial<
    Pick<
      ClienteContratoRecord,
      | "data_inicio"
      | "data_fim"
      | "encerrado_em"
      | "tipo_contrato"
      | "condicao_pagamento"
      | "contrato_assinado_em"
    >
  > &
  Partial<
    Pick<ClienteContratoConsulta, "modalidadeOrcamento" | "mensalidadePagamento">
  > & {
    /** Flag da aprovação. Status do contrato não comprova assinatura. */
    contrato_assinado?: boolean | null;
  };

/**
 * Gestão SST mês a mês, vinculada a orçamento, assinada e com vigência na data.
 * A primeira parcela em aberto não segura o agendamento. À vista continua exigindo pagamento.
 */
export function contratoMensalOperacionalNaData(
  contrato: ContratoMensalAgendamento,
  dataReferenciaIso?: string
): boolean {
  if (!contrato.orcamento_id) return false;
  if (contrato.status === "cancelado" || contrato.status === "encerrado") {
    return false;
  }
  if (contrato.encerrado_em) return false;
  if (!STATUS_MENSAL_OPERACIONAL.includes(contrato.status)) return false;
  if (
    !contratoCobrancaMensal({
      tipo_contrato: contrato.tipo_contrato ?? null,
      condicao_pagamento: contrato.condicao_pagamento ?? null,
      modalidadeOrcamento: contrato.modalidadeOrcamento,
      mensalidadePagamento: contrato.mensalidadePagamento,
    })
  ) {
    return false;
  }
  if (!assinaturaEfetiva(contrato)) return false;
  const inicio = contrato.data_inicio?.trim() ?? "";
  const fim = contrato.data_fim?.trim() ?? "";
  if (!inicio || !fim) return false;
  const data = (dataReferenciaIso ?? todayIsoSaoPaulo()).slice(0, 10);
  return isDateWithinVigencia(data, inicio, fim);
}

/**
 * Regra única: contrato vigente para agendar na data.
 * - status ativo (ou em renovação);
 * - não cancelado/encerrado;
 * - data_inicio/data_fim preenchidas e contendo a data;
 * - liberado para agendamento (boleto pago nos de orçamento).
 */
export function contratoEstaVigenteNaData(
  contrato: Pick<
    ClienteContratoRecord,
    "status" | "orcamento_id" | "boleto_pago" | "liberado_para_agendamento"
  > &
    Partial<
      Pick<
        ClienteContratoRecord,
        | "id"
        | "data_inicio"
        | "data_fim"
        | "encerrado_em"
        | "tipo_contrato"
        | "condicao_pagamento"
        | "contrato_assinado_em"
      >
    > &
    Partial<
      Pick<ClienteContratoConsulta, "modalidadeOrcamento" | "mensalidadePagamento">
    >,
  dataAgendamento: string
): boolean {
  if (contrato.status === "cancelado" || contrato.status === "encerrado") {
    return false;
  }
  if (contrato.encerrado_em) return false;
  const inicio = contrato.data_inicio?.trim() ?? "";
  const fim = contrato.data_fim?.trim() ?? "";
  if (!inicio || !fim) return false;
  if (!isDateWithinVigencia(dataAgendamento, inicio, fim)) return false;
  if (contratoMensalOperacionalNaData(contrato, dataAgendamento)) return true;
  if (contrato.status !== "ativo" && contrato.status !== "em_renovacao") {
    return false;
  }
  // Liberação financeira / manual (mesmo critério de contratoLiberaAgendamento)
  if (contrato.orcamento_id) {
    if (contrato.boleto_pago !== true) return false;
  } else if (contrato.liberado_para_agendamento !== true) {
    return false;
  }
  return true;
}

/**
 * Indica se o cliente possui ao menos um contrato vigente na data (padrão: hoje).
 * Reutiliza `contratoEstaVigenteNaData` — não criar regra paralela.
 */
export function clienteTemContratoVigente(
  contratos: Array<
    Pick<
      ClienteContratoRecord,
      | "id"
      | "status"
      | "data_inicio"
      | "data_fim"
      | "orcamento_id"
      | "boleto_pago"
      | "liberado_para_agendamento"
    >
  >,
  dataReferenciaIso?: string
): boolean {
  const data = (dataReferenciaIso ?? new Date().toISOString().slice(0, 10)).slice(
    0,
    10
  );
  return contratos.some((c) => contratoEstaVigenteNaData(c, data));
}

async function motivoSemContratoVigente(
  clienteId: string,
  contratos: ClienteContratoRecord[],
  dataAgendamento: string,
  contratoIdPreferido: string | null
): Promise<string> {
  const clientes = await listarClientesParaSelect();
  const cliente = clientes.find((item) => item.id === clienteId);
  const alvo = contratoIdPreferido
    ? contratos.filter((contrato) => contrato.id === contratoIdPreferido)
    : contratos;
  const disponibilidade = resolveDisponibilidadeAgendamentoCliente({
    cliente: {
      agendamento_bloqueio_manual: cliente?.agendamento_bloqueio_manual,
      agendamento_bloqueio_motivo: cliente?.agendamento_bloqueio_motivo,
    },
    contratos: alvo,
    dataReferenciaIso: dataAgendamento,
  });
  return disponibilidade.motivo ?? CONTRATO_VIGENTE_ERROR_MESSAGE;
}

export async function verificarContratoVigente(
  clienteId: string,
  dataAgendamento: string,
  options?: { contratoId?: string | null }
): Promise<ContratoVigenciaResult> {
  const contratos = await complementarContratosComCobranca(
    await listarContratosPorCliente(clienteId)
  );
  const contratoIdPreferido = options?.contratoId?.trim() || null;

  const vigente = selecionarContratoVigenteParaAgendamento(
    contratos,
    (contrato) => contratoEstaVigenteNaData(contrato, dataAgendamento),
    contratoIdPreferido
  );
  if (vigente) {
    return {
      vigente: true,
      dataInicio: vigente.data_inicio,
      dataFim: vigente.data_fim ?? undefined,
      clienteId,
      contratoId: vigente.id,
      motivo: null,
    };
  }

  const motivo = await motivoSemContratoVigente(
    clienteId,
    contratos,
    dataAgendamento,
    contratoIdPreferido
  );

  if (contratoIdPreferido) {
    return {
      vigente: false,
      clienteId,
      contratoId: contratoIdPreferido,
      motivo,
    };
  }

  // Fallback: único ativo com datas (compatível com busca antiga)
  const contratoAtivo = await buscarContratoAtivo(clienteId);
  const ativoCompleto = contratoAtivo
    ? (
        await complementarContratosComCobranca([contratoAtivo])
      )[0]
    : null;
  if (
    ativoCompleto &&
    contratoEstaVigenteNaData(ativoCompleto, dataAgendamento)
  ) {
    return {
      vigente: true,
      dataInicio: ativoCompleto.data_inicio,
      dataFim: ativoCompleto.data_fim ?? undefined,
      clienteId,
      contratoId: ativoCompleto.id,
      motivo: null,
    };
  }

  return { vigente: false, clienteId, motivo };
}

export async function verificarContratoVigentePorNome(
  clienteNome: string,
  dataAgendamento: string
): Promise<ContratoVigenciaResult> {
  return verificarContratoVigenteDoAgendamento({
    clienteNome,
    dataAgendamento,
  });
}

export async function verificarContratoVigenteDoAgendamento(input: {
  clienteId?: string | null;
  clienteNome?: string | null;
  clienteCnpj?: string | null;
  dataAgendamento: string;
  contratoId?: string | null;
}): Promise<ContratoVigenciaResult> {
  const plan = planClienteLookup(input);
  if (plan.by === "none") {
    return { vigente: false };
  }

  let clienteId = "";
  if (plan.by === "id") {
    clienteId = plan.value;
  } else if (plan.by === "cnpj") {
    const cliente = await buscarClientePorCnpjDigits(plan.value);
    if (!cliente) return { vigente: false };
    clienteId = cliente.id;
  } else {
    const clientes = await listarClientesParaSelect();
    const chosen = escolherUnicoPorNome(clientes, plan.value);
    if (chosen.status === "ambiguous") {
      throw new Error(CLIENTE_CADASTRO_AMBIGUO_MSG);
    }
    if (chosen.status !== "unique" || !chosen.item) {
      return { vigente: false };
    }
    clienteId = chosen.item.id;
  }

  return verificarContratoVigente(clienteId, input.dataAgendamento, {
    contratoId: input.contratoId,
  });
}

export async function assertContratoVigentePorNome(
  clienteNome: string,
  dataAgendamento: string
): Promise<void> {
  await assertContratoVigenteDoAgendamento({
    clienteNome,
    dataAgendamento,
  });
}

export async function assertContratoVigenteDoAgendamento(input: {
  clienteId?: string | null;
  clienteNome?: string | null;
  clienteCnpj?: string | null;
  dataAgendamento: string;
  contratoId?: string | null;
}): Promise<void> {
  const plan = planClienteLookup(input);
  if (plan.by === "none") return;

  let cliente: {
    id: string;
    nome: string;
    disponivel_agendamento?: boolean | null;
    agendamento_bloqueio_manual?: boolean | null;
    agendamento_bloqueio_motivo?: string | null;
  } | null = null;

  if (plan.by === "id") {
    const clientes = await listarClientesParaSelect();
    cliente = clientes.find((item) => item.id === plan.value) ?? null;
  } else if (plan.by === "cnpj") {
    cliente = await buscarClientePorCnpjDigits(plan.value);
  } else {
    const clientes = await listarClientesParaSelect();
    const chosen = escolherUnicoPorNome(clientes, plan.value);
    if (chosen.status === "ambiguous") {
      throw new Error(CLIENTE_CADASTRO_AMBIGUO_MSG);
    }
    cliente = chosen.item ?? null;
  }

  if (!cliente) {
    throw new Error(CONTRATO_VIGENTE_ERROR_MESSAGE);
  }

  const contratos = await complementarContratosComCobranca(
    await listarContratosPorCliente(cliente.id)
  );
  const contratoId = input.contratoId?.trim() || "";
  const contratosAlvo = contratoId
    ? contratos.filter((contrato) => contrato.id === contratoId)
    : contratos;

  if (contratoId && contratosAlvo.length === 0) {
    throw new Error(CONTRATO_VIGENTE_ERROR_MESSAGE);
  }

  const disponibilidade = resolveDisponibilidadeAgendamentoCliente({
    cliente: {
      disponivel_agendamento: cliente.disponivel_agendamento,
      agendamento_bloqueio_manual: cliente.agendamento_bloqueio_manual,
      agendamento_bloqueio_motivo: cliente.agendamento_bloqueio_motivo,
    },
    contratos: contratosAlvo,
    dataReferenciaIso: input.dataAgendamento,
  });

  if (disponibilidade.disponivel) return;
  throw new Error(
    disponibilidade.motivo ?? CONTRATO_VIGENTE_ERROR_MESSAGE
  );
}
