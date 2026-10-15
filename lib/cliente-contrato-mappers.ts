import {
  CLIENTE_CONTRATO_STATUS_OPTIONS,
  CLIENTE_CONTRATO_TIPO_OPTIONS,
} from "@/lib/cliente-contrato-constants";
import {
  contratoLiberaAgendamento,
  labelAgendamentoLiberacao,
} from "@/lib/cliente-pode-agendar";
import {
  labelContratoStatusVisual,
  resolveContratoStatusVisual,
  contratoStatusVisualBadgeClass,
} from "@/lib/contrato-status-visual";
import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  contratoAssinado,
  contratoCobrancaMensal,
  contratoVigenciaCobreData,
  labelFinanceiroMensalidade,
  ordenarContratosRecentes,
  resumoComercialContrato,
  selecionarContratoAtual,
  type ClienteContratoConsulta,
} from "@/lib/cliente-contrato-atual";
import { formatDateBR } from "@/lib/format";
import { formatCurrency, formatCurrencyBRL } from "@/lib/money";
import type {
  ClienteContratoFormValues,
  ClienteContratoRecord,
  ClienteContratoStatus,
  ClienteContratoTipo,
} from "@/lib/types";

export function labelClienteContratoStatus(status: ClienteContratoStatus): string {
  // Legado: "pago" era status misto financeiro/contratual — exibir como Ativo.
  if (status === "pago") return "Ativo";
  return (
    CLIENTE_CONTRATO_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

/** Rótulo preferencial (visual padronizado: Ativo / Próximo / Expirado / Encerrado). */
export function labelClienteContratoStatusExibicao(
  contrato: Pick<
    ClienteContratoRecord,
    | "status"
    | "data_inicio"
    | "data_fim"
    | "encerrado_em"
    | "tipo_contrato"
    | "condicao_pagamento"
    | "contrato_assinado_em"
  > &
    Partial<ClienteContratoConsulta>,
  hojeIso: string = todayIsoSaoPaulo()
): string {
  if (mensalidadeAssinadaEmAndamento(contrato)) {
    if (contratoVigenciaCobreData(contrato, hojeIso)) {
      return labelContratoStatusVisual(
        resolveContratoStatusVisual({ ...contrato, status: "ativo" }, hojeIso),
        "ativo"
      );
    }
    const visual = resolveContratoStatusVisual(
      { ...contrato, status: "ativo" },
      hojeIso
    );
    if (visual === "expirado") return labelContratoStatusVisual(visual, "ativo");
    return "Assinado";
  }
  const visual = resolveContratoStatusVisual(contrato, hojeIso);
  if (visual === "pipeline") {
    return labelClienteContratoStatus(contrato.status);
  }
  return labelContratoStatusVisual(visual, contrato.status);
}

export function labelClienteContratoTipo(
  tipo: ClienteContratoTipo | null | undefined
): string {
  if (!tipo) return "—";
  return (
    CLIENTE_CONTRATO_TIPO_OPTIONS.find((item) => item.value === tipo)?.label ??
    tipo
  );
}

export function clienteContratoStatusBadgeClass(
  status: ClienteContratoStatus
): string {
  switch (status) {
    case "ativo":
    case "pago":
      return "bg-brand-green-soft text-brand-green";
    case "em_renovacao":
    case "aguardando_pagamento":
      return "bg-[#fef3c7] text-[#b45309]";
    case "aguardando_envio":
      return "bg-[#e0e7ff] text-[#3730a3]";
    case "enviado":
    case "assinado":
      return "bg-[#dbeafe] text-[#1d4ed8]";
    case "encerrado":
      return "bg-brand-red-soft text-brand-red";
    case "cancelado":
      return "bg-brand-red-soft text-brand-red";
    default:
      return "bg-[#f4f6fb] text-[#52617a]";
  }
}

export function clienteContratoBadgeClassExibicao(
  contrato: Pick<
    ClienteContratoRecord,
    | "status"
    | "data_inicio"
    | "data_fim"
    | "encerrado_em"
    | "tipo_contrato"
    | "condicao_pagamento"
    | "contrato_assinado_em"
  > &
    Partial<ClienteContratoConsulta>,
  hojeIso: string = todayIsoSaoPaulo()
): string {
  if (
    mensalidadeAssinadaEmAndamento(contrato) &&
    contratoVigenciaCobreData(contrato, hojeIso)
  ) {
    return contratoStatusVisualBadgeClass(
      resolveContratoStatusVisual({ ...contrato, status: "ativo" }, hojeIso)
    );
  }
  if (mensalidadeAssinadaEmAndamento(contrato)) {
    const visual = resolveContratoStatusVisual(
      { ...contrato, status: "ativo" },
      hojeIso
    );
    if (visual === "expirado") return contratoStatusVisualBadgeClass(visual);
    return clienteContratoStatusBadgeClass("assinado");
  }
  const visual = resolveContratoStatusVisual(contrato, hojeIso);
  if (visual === "pipeline") {
    return clienteContratoStatusBadgeClass(contrato.status);
  }
  return contratoStatusVisualBadgeClass(visual);
}

function mensalidadeAssinadaEmAndamento(
  contrato: Pick<
    ClienteContratoRecord,
    | "status"
    | "encerrado_em"
    | "tipo_contrato"
    | "condicao_pagamento"
    | "contrato_assinado_em"
  > &
    Partial<ClienteContratoConsulta>
): boolean {
  return (
    contratoCobrancaMensal(contrato) &&
    contratoAssinado(contrato) &&
    contrato.status !== "encerrado" &&
    contrato.status !== "cancelado" &&
    !contrato.encerrado_em
  );
}

export function labelPagamentoContrato(
  contrato: Pick<ClienteContratoRecord, "status" | "boleto_pago">
): string {
  if (contrato.boleto_pago || contrato.status === "pago") return "Pago";
  if (
    contrato.status === "assinado" ||
    contrato.status === "aguardando_pagamento" ||
    contrato.status === "enviado" ||
    contrato.status === "aguardando_envio"
  ) {
    return "Pendente";
  }
  return "—";
}

export function labelFinanceiroContrato(
  contrato: Pick<
    ClienteContratoRecord,
    "status" | "boleto_pago" | "boleto_vencimento"
  > &
    Partial<
      Pick<
        ClienteContratoConsulta,
        | "tipo_contrato"
        | "condicao_pagamento"
        | "modalidadeOrcamento"
        | "mensalidadePagamento"
        | "data_inicio"
        | "data_fim"
        | "valor_contrato"
        | "mensalidadeDiaVencimento"
        | "parcelasMensalidade"
      >
    >,
  hojeIso: string = todayIsoSaoPaulo()
): string {
  if (
    contratoCobrancaMensal({
      tipo_contrato: contrato.tipo_contrato ?? null,
      condicao_pagamento: contrato.condicao_pagamento ?? null,
      modalidadeOrcamento: contrato.modalidadeOrcamento,
      mensalidadePagamento: contrato.mensalidadePagamento,
    })
  ) {
    return labelFinanceiroMensalidade(
      {
        data_inicio: contrato.data_inicio ?? "",
        data_fim: contrato.data_fim ?? null,
        valor_contrato: contrato.valor_contrato ?? null,
        mensalidadeDiaVencimento: contrato.mensalidadeDiaVencimento,
        parcelasMensalidade: contrato.parcelasMensalidade,
      },
      hojeIso
    );
  }
  if (contrato.boleto_pago || contrato.status === "pago") return "Pago";
  if (contrato.boleto_vencimento || contrato.status === "aguardando_pagamento") {
    return "Aguardando pagamento";
  }
  if (
    contrato.status === "assinado" ||
    contrato.status === "enviado" ||
    contrato.status === "aguardando_envio"
  ) {
    return "Aguardando vencimento";
  }
  return "—";
}

export function labelAgendamentoContrato(
  contrato: Pick<
    ClienteContratoRecord,
    "orcamento_id" | "boleto_pago" | "liberado_para_agendamento" | "status"
  >
): "Liberado" | "Bloqueado" {
  return labelAgendamentoLiberacao(contratoLiberaAgendamento(contrato));
}

export function labelVencimentoBoletoContrato(
  vencimento: string | null | undefined
): string {
  if (!vencimento?.trim()) return "Não informado";
  return formatDateBR(vencimento);
}

export function formatVigenciaContrato(
  inicio: string,
  fim: string | null | undefined
): string {
  const start = formatDateBR(inicio);
  const end = fim ? formatDateBR(fim) : "Indeterminado";
  return `${start} → ${end}`;
}

export function formatValorContrato(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(Number(valor))) return "—";
  return formatCurrencyBRL(Number(valor));
}

export function formatValorContratoExibicao(
  contrato: Pick<
    ClienteContratoRecord,
    | "valor_contrato"
    | "tipo_contrato"
    | "condicao_pagamento"
    | "quantidade_parcelas"
    | "valor_parcela"
    | "valor_avista"
  > &
    Partial<ClienteContratoConsulta>
): string {
  const total = resumoComercialContrato(contrato).total;
  return formatValorContrato(total);
}

export function condicaoPagamentoExibicao(
  contrato: Pick<
    ClienteContratoRecord,
    | "valor_contrato"
    | "tipo_contrato"
    | "condicao_pagamento"
    | "quantidade_parcelas"
    | "valor_parcela"
    | "valor_avista"
  > &
    Partial<ClienteContratoConsulta>
): string {
  return resumoComercialContrato(contrato).condicao;
}

export function formatReajusteContrato(
  reajuste: number | null | undefined
): string {
  if (reajuste == null || Number.isNaN(Number(reajuste))) return "—";
  return `${Number(reajuste).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function contratoToFormValues(
  contrato: ClienteContratoRecord
): ClienteContratoFormValues {
  return {
    data_inicio: contrato.data_inicio,
    data_fim: contrato.data_fim ?? "",
    quantidade_colaboradores:
      contrato.quantidade_colaboradores != null
        ? String(contrato.quantidade_colaboradores)
        : "",
    valor_contrato:
      contrato.valor_contrato != null
        ? formatCurrency(Number(contrato.valor_contrato))
        : "",
    condicao_pagamento: contrato.condicao_pagamento ?? "",
    tipo_contrato: contrato.tipo_contrato ?? "anual",
    reajuste_percentual:
      contrato.reajuste_percentual != null
        ? String(contrato.reajuste_percentual)
        : "",
    observacoes: contrato.observacoes ?? "",
    status: contrato.status,
  };
}

export function getContratoAtual<T extends ClienteContratoConsulta>(
  contratos: T[],
  hojeIso?: string
): T | null {
  return selecionarContratoAtual(contratos, hojeIso);
}

/** Histórico completo, do mais recente ao mais antigo, inclusive o vigente. */
export function getHistoricoContratos<T extends ClienteContratoConsulta>(
  contratos: T[]
): T[] {
  return ordenarContratosRecentes(contratos);
}
