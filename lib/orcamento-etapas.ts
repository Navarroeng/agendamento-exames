import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import { isProcuracaoStatusConcluida } from "@/lib/cliente-procuracao";
import { isClassificacaoVagasContratoCompleta } from "@/lib/contrato-vagas";
import {
  isTreinamentoEtapaConcluida,
  type ImplantacaoTreinamentoRecord,
} from "@/lib/implantacao-treinamento";
import type { OrcamentoFluxoImplantacao } from "@/lib/servico-treinamentos";

export type OrcamentoEtapaId =
  | "resumo"
  | "aprovado"
  | "contrato"
  | "financeiro"
  | "procuracao"
  | "funcionarios"
  | "logo"
  | "visita"
  | "agendamentos"
  | "treinamento";

export type OrcamentoEtapaEstado =
  | "concluida"
  | "atual"
  | "bloqueada"
  | "disponivel";

export const ORCAMENTO_ETAPAS_PADRAO: Array<{
  id: OrcamentoEtapaId;
  label: string;
}> = [
  { id: "resumo", label: "Resumo" },
  { id: "aprovado", label: "Orçamento aprovado" },
  { id: "contrato", label: "Contrato" },
  { id: "financeiro", label: "Financeiro" },
  { id: "procuracao", label: "Procuração" },
  { id: "funcionarios", label: "Lista de funcionários" },
  { id: "logo", label: "Logo da empresa" },
  { id: "visita", label: "Visita técnica" },
  { id: "agendamentos", label: "Agendamentos" },
];

/** @deprecated Prefer buildOrcamentoEtapas(fluxo) */
export const ORCAMENTO_ETAPAS = ORCAMENTO_ETAPAS_PADRAO;

/**
 * Montagem dinâmica das abas:
 * - somente_treinamentos: 5 abas (sem docs SST / exames)
 * - combinado: fluxo SST completo + Agendamento do Treinamento (após Financeiro)
 * - padrao: fluxo atual
 */
export function buildOrcamentoEtapas(
  fluxo: OrcamentoFluxoImplantacao = "padrao"
): Array<{ id: OrcamentoEtapaId; label: string }> {
  if (fluxo === "somente_treinamentos") {
    return [
      { id: "resumo", label: "Resumo" },
      { id: "aprovado", label: "Orçamento aprovado" },
      { id: "contrato", label: "Contrato" },
      { id: "financeiro", label: "Financeiro" },
      { id: "treinamento", label: "Agendamento do Treinamento" },
    ];
  }

  if (fluxo === "combinado") {
    const etapas: Array<{ id: OrcamentoEtapaId; label: string }> = [];
    for (const etapa of ORCAMENTO_ETAPAS_PADRAO) {
      etapas.push(etapa);
      if (etapa.id === "financeiro") {
        etapas.push({
          id: "treinamento",
          label: "Agendamento do Treinamento",
        });
      }
    }
    return etapas;
  }

  return [...ORCAMENTO_ETAPAS_PADRAO];
}

export type OrcamentoEtapasContagemAgendamentos = {
  quantidadeContratada: number;
  agendamentosRealizados: number;
  agendamentosDispensados?: boolean;
  pendentesDefinicao?: number;
  vagasComprometidas?: number;
};

export type OrcamentoEtapasContexto = {
  fluxo?: OrcamentoFluxoImplantacao;
  treinamento?: ImplantacaoTreinamentoRecord | null;
  contagem?: OrcamentoEtapasContagemAgendamentos | null;
};

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
  if (!isProcuracaoStatusConcluida(aprovacao.procuracao_status)) {
    return false;
  }
  if (!aprovacao.procuracao_salva_em) return false;
  if (aprovacao.procuracao_status === "nao_necessaria") {
    return Boolean(aprovacao.observacao_procuracao?.trim());
  }
  return true;
}

export function isFuncionariosEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null
): boolean {
  return Boolean(
    aprovacao?.funcionarios_lista_path ||
      aprovacao?.funcionarios_vagas_salvas_em
  );
}

export function isLogoEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null
): boolean {
  if (!aprovacao) return false;
  if (aprovacao.possui_logo === false) {
    return Boolean(aprovacao.logo_salva_em);
  }
  if (aprovacao.logo_path) return true;
  return false;
}

export function isVisitaEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null
): boolean {
  return (
    aprovacao?.visita_tecnica_necessaria != null &&
    Boolean(aprovacao.visita_tecnica_salva_em)
  );
}

export function isAgendamentosEtapaConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null,
  contagem?: OrcamentoEtapasContagemAgendamentos | null
): boolean {
  if (!isVisitaEtapaConcluida(aprovacao)) return false;
  if (contagem?.agendamentosDispensados) return true;
  const qtd = Math.max(0, contagem?.quantidadeContratada ?? 0);
  if (qtd <= 0) return false;
  if (
    contagem?.pendentesDefinicao != null &&
    contagem?.vagasComprometidas != null
  ) {
    return isClassificacaoVagasContratoCompleta({
      previstos: qtd,
      pendentesDefinicao: contagem.pendentesDefinicao,
      vagasComprometidas: contagem.vagasComprometidas,
    });
  }
  const feitos = Math.max(0, contagem?.agendamentosRealizados ?? 0);
  return feitos >= qtd;
}

export function isOrcamentoEtapaLiberada(
  etapa: OrcamentoEtapaId,
  aprovacao: OrcamentoAprovacaoRecord | null,
  orcamentoAprovado: boolean,
  ctx?: OrcamentoEtapasContexto
): boolean {
  const fluxo = ctx?.fluxo ?? "padrao";

  switch (etapa) {
    case "resumo":
    case "aprovado":
      return true;
    case "contrato":
      return Boolean(aprovacao) || orcamentoAprovado;
    case "financeiro":
      return isContratoEtapaConcluida(aprovacao);
    case "treinamento":
      return isFinanceiroEtapaConcluida(aprovacao);
    case "procuracao":
      if (fluxo === "somente_treinamentos") return false;
      return isFinanceiroEtapaConcluida(aprovacao);
    case "funcionarios":
      if (fluxo === "somente_treinamentos") return false;
      return isProcuracaoEtapaConcluida(aprovacao);
    case "logo":
      if (fluxo === "somente_treinamentos") return false;
      return isFuncionariosEtapaConcluida(aprovacao);
    case "visita":
      if (fluxo === "somente_treinamentos") return false;
      return isLogoEtapaConcluida(aprovacao);
    case "agendamentos":
      if (fluxo === "somente_treinamentos") return false;
      return isVisitaEtapaConcluida(aprovacao);
    default:
      return false;
  }
}

export function isOrcamentoEtapaConcluida(
  etapa: OrcamentoEtapaId,
  aprovacao: OrcamentoAprovacaoRecord | null,
  orcamentoAprovado: boolean,
  contagem?: OrcamentoEtapasContagemAgendamentos | null,
  ctx?: OrcamentoEtapasContexto
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
    case "treinamento":
      return isTreinamentoEtapaConcluida(ctx?.treinamento);
    case "procuracao":
      return isProcuracaoEtapaConcluida(aprovacao);
    case "funcionarios":
      return isFuncionariosEtapaConcluida(aprovacao);
    case "logo":
      return isLogoEtapaConcluida(aprovacao);
    case "visita":
      return isVisitaEtapaConcluida(aprovacao);
    case "agendamentos":
      return isAgendamentosEtapaConcluida(
        aprovacao,
        contagem ?? ctx?.contagem
      );
    default:
      return false;
  }
}

export function resolveOrcamentoEtapaAtual(
  aprovacao: OrcamentoAprovacaoRecord | null,
  orcamentoAprovado: boolean,
  contagem?: OrcamentoEtapasContagemAgendamentos | null,
  ctx?: OrcamentoEtapasContexto
): OrcamentoEtapaId {
  const fluxo = ctx?.fluxo ?? "padrao";
  const etapas = buildOrcamentoEtapas(fluxo);
  for (const etapa of etapas) {
    if (
      isOrcamentoEtapaLiberada(etapa.id, aprovacao, orcamentoAprovado, ctx) &&
      !isOrcamentoEtapaConcluida(
        etapa.id,
        aprovacao,
        orcamentoAprovado,
        contagem ?? ctx?.contagem,
        ctx
      )
    ) {
      return etapa.id;
    }
  }
  return etapas[etapas.length - 1]?.id ?? "agendamentos";
}

export function resolveOrcamentoEtapaEstado(
  etapa: OrcamentoEtapaId,
  aprovacao: OrcamentoAprovacaoRecord | null,
  orcamentoAprovado: boolean,
  tabAtiva: OrcamentoEtapaId,
  contagem?: OrcamentoEtapasContagemAgendamentos | null,
  ctx?: OrcamentoEtapasContexto
): OrcamentoEtapaEstado {
  const liberada = isOrcamentoEtapaLiberada(
    etapa,
    aprovacao,
    orcamentoAprovado,
    ctx
  );
  if (!liberada) return "bloqueada";
  if (
    isOrcamentoEtapaConcluida(
      etapa,
      aprovacao,
      orcamentoAprovado,
      contagem ?? ctx?.contagem,
      ctx
    )
  ) {
    return tabAtiva === etapa ? "atual" : "concluida";
  }
  if (tabAtiva === etapa) return "atual";
  return "disponivel";
}
