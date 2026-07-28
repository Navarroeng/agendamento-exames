import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";

export type OrcamentoEtapaId =
  | "resumo"
  | "aprovado"
  | "contrato"
  | "financeiro"
  | "procuracao"
  | "funcionarios"
  | "logo"
  | "visita";

export type OrcamentoEtapaEstado = "concluida" | "atual" | "bloqueada" | "disponivel";

export const ORCAMENTO_ETAPAS: Array<{ id: OrcamentoEtapaId; label: string }> = [
  { id: "resumo", label: "Resumo" },
  { id: "aprovado", label: "Orçamento aprovado" },
  { id: "contrato", label: "Contrato" },
  { id: "financeiro", label: "Financeiro" },
  { id: "procuracao", label: "Procuração" },
  { id: "funcionarios", label: "Lista de funcionários" },
  { id: "logo", label: "Logo da empresa" },
  { id: "visita", label: "Visita técnica" },
];

export function isContratoEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null
): boolean {
  if (!aprovacao) return false;
  return (
    Boolean(aprovacao.contrato_assinado) &&
    (Boolean(aprovacao.contrato_salvo_em) ||
      Boolean(aprovacao.contrato_assinado_em))
  );
}

export function isFinanceiroEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null
): boolean {
  if (!aprovacao) return false;
  return (
    aprovacao.boleto_pago === true &&
    (Boolean(aprovacao.financeiro_salvo_em) ||
      Boolean(aprovacao.pagamento_confirmado_em) ||
      Boolean(aprovacao.boleto_pago_em))
  );
}

export function isProcuracaoEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null
): boolean {
  if (!aprovacao) return false;
  return (
    aprovacao.procuracao_status === "ativa" &&
    Boolean(aprovacao.procuracao_salva_em)
  );
}

export function isFuncionariosEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null
): boolean {
  return Boolean(aprovacao?.funcionarios_lista_path);
}

export function isLogoEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null
): boolean {
  return Boolean(aprovacao?.logo_path);
}

export function isVisitaEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null
): boolean {
  return (
    aprovacao?.visita_tecnica_necessaria != null &&
    Boolean(aprovacao.visita_tecnica_salva_em)
  );
}

/** Etapa liberada para clique (não necessariamente a atual). */
export function isOrcamentoEtapaLiberada(
  etapa: OrcamentoEtapaId,
  aprovacao: OrcamentoAprovacaoRecord | null,
  orcamentoAprovado: boolean
): boolean {
  switch (etapa) {
    case "resumo":
    case "aprovado":
      return true;
    case "contrato":
      return Boolean(aprovacao) || orcamentoAprovado;
    case "financeiro":
      return isContratoEtapaConcluida(aprovacao);
    case "procuracao":
      return isFinanceiroEtapaConcluida(aprovacao);
    case "funcionarios":
      return isProcuracaoEtapaConcluida(aprovacao);
    case "logo":
      return isFuncionariosEtapaConcluida(aprovacao);
    case "visita":
      return isLogoEtapaConcluida(aprovacao);
    default:
      return false;
  }
}

export function isOrcamentoEtapaConcluida(
  etapa: OrcamentoEtapaId,
  aprovacao: OrcamentoAprovacaoRecord | null,
  orcamentoAprovado: boolean
): boolean {
  switch (etapa) {
    case "resumo":
      return true;
    case "aprovado":
      return Boolean(aprovacao) || orcamentoAprovado;
    case "contrato":
      return isContratoEtapaConcluida(aprovacao);
    case "financeiro":
      return isFinanceiroEtapaConcluida(aprovacao);
    case "procuracao":
      return isProcuracaoEtapaConcluida(aprovacao);
    case "funcionarios":
      return isFuncionariosEtapaConcluida(aprovacao);
    case "logo":
      return isLogoEtapaConcluida(aprovacao);
    case "visita":
      return isVisitaEtapaConcluida(aprovacao);
    default:
      return false;
  }
}

export function resolveOrcamentoEtapaAtual(
  aprovacao: OrcamentoAprovacaoRecord | null,
  orcamentoAprovado: boolean
): OrcamentoEtapaId {
  for (const etapa of ORCAMENTO_ETAPAS) {
    if (
      isOrcamentoEtapaLiberada(etapa.id, aprovacao, orcamentoAprovado) &&
      !isOrcamentoEtapaConcluida(etapa.id, aprovacao, orcamentoAprovado)
    ) {
      return etapa.id;
    }
  }
  return "visita";
}

export function resolveOrcamentoEtapaEstado(
  etapa: OrcamentoEtapaId,
  aprovacao: OrcamentoAprovacaoRecord | null,
  orcamentoAprovado: boolean,
  tabAtiva: OrcamentoEtapaId
): OrcamentoEtapaEstado {
  const liberada = isOrcamentoEtapaLiberada(etapa, aprovacao, orcamentoAprovado);
  if (!liberada) return "bloqueada";
  if (isOrcamentoEtapaConcluida(etapa, aprovacao, orcamentoAprovado)) {
    return tabAtiva === etapa ? "atual" : "concluida";
  }
  if (tabAtiva === etapa) return "atual";
  return "disponivel";
}
