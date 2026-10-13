import { isPerfilAdmin, type PerfilUsuarioTipo } from "@/lib/permissions";
import {
  ORCAMENTO_STATUS_LABELS,
  type OrcamentoStatus,
} from "@/lib/orcamento-types";

/**
 * Status existente que volta a permitir editar e aprovar pelo fluxo normal.
 * "Em elaboração" não exibe Aprovar no menu; a aprovação parte de "Enviado".
 */
export const ORCAMENTO_STATUS_APOS_REVERTER_APROVACAO = "enviado" as const;

export const ORCAMENTO_STATUS_APOS_REVERTER_APROVACAO_LABEL =
  ORCAMENTO_STATUS_LABELS[ORCAMENTO_STATUS_APOS_REVERTER_APROVACAO];

export const REVERSAO_SEM_PERMISSAO_MSG =
  "Você não possui permissão para reverter a aprovação. Esta ação é exclusiva para administradores.";

export const REVERSAO_MOTIVO_OBRIGATORIO_MSG = "Informe o motivo da reversão.";

export const REVERSAO_STATUS_MSG =
  "Só é possível reverter a aprovação de um orçamento que esteja aprovado.";

export const REVERSAO_NAO_ENCONTRADO_MSG = "Orçamento não encontrado.";

export const REVERSAO_CONTRATO_GERADO_MSG =
  "Não é possível reverter a aprovação porque já existe um contrato gerado para este orçamento.";

export const REVERSAO_VENCIMENTOS_MSG =
  "Não é possível reverter a aprovação porque já existem vencimentos de contrato registrados para este orçamento.";

export const REVERSAO_CONTRATO_VINCULADO_MSG =
  "Não é possível reverter a aprovação porque já existe um contrato vinculado a este orçamento.";

export const REVERSAO_CONTRATO_ACOMPANHADO_MSG =
  "Não é possível reverter a aprovação porque o contrato deste orçamento já foi acompanhado na implantação.";

export const REVERSAO_FINANCEIRO_MSG =
  "Não é possível reverter a aprovação porque já existe movimentação financeira vinculada a este orçamento.";

export const REVERSAO_AGENDAMENTO_MSG =
  "Não é possível reverter a aprovação porque já existem agendamentos vinculados a este orçamento.";

export const REVERSAO_VAGAS_MSG =
  "Não é possível reverter a aprovação porque já existem vagas ou funcionários vinculados a este orçamento.";

export const REVERSAO_ASO_MSG =
  "Não é possível reverter a aprovação porque já existem ASOs contratuais registrados para este orçamento.";

export const REVERSAO_FUTUROS_MSG =
  "Não é possível reverter a aprovação porque já existem exames futuros programados para este orçamento.";

export const REVERSAO_VISITA_MSG =
  "Não é possível reverter a aprovação porque já existe visita técnica registrada para este orçamento.";

export const REVERSAO_AET_MSG =
  "Não é possível reverter a aprovação porque a implantação do laudo já foi iniciada.";

export const REVERSAO_TREINAMENTO_MSG =
  "Não é possível reverter a aprovação porque já existe treinamento vinculado a este orçamento.";

export const REVERSAO_LAUDOS_MSG =
  "Não é possível reverter a aprovação porque já existe trabalho registrado em laudos para este orçamento.";

export const REVERSAO_RISCOS_MSG =
  "Não é possível reverter a aprovação porque já existe atividade de riscos psicossociais vinculada a este orçamento.";

export const REVERSAO_ETAPAS_MSG =
  "Não é possível reverter a aprovação porque já existem etapas da implantação preenchidas para este orçamento.";

export const REVERSAO_CONDICOES_MSG =
  "Não é possível reverter a aprovação porque as condições aprovadas já foram alteradas.";

export function podeReverterAprovacaoOrcamento(
  perfil: PerfilUsuarioTipo | null | undefined
): boolean {
  return isPerfilAdmin(perfil);
}

export function textoConfirmacaoReverterAprovacao(): string {
  return `O orçamento voltará para o status ‘${ORCAMENTO_STATUS_APOS_REVERTER_APROVACAO_LABEL}’ e poderá ser editado e aprovado novamente.`;
}

export function motivoReversaoInvalido(
  motivo: string | null | undefined
): string | null {
  if (!String(motivo ?? "").trim()) return REVERSAO_MOTIVO_OBRIGATORIO_MSG;
  return null;
}

export interface ReversaoContratoVinculo {
  status: string;
  enviadoEm?: string | null;
  assinadoEm?: string | null;
  boletoVencimento?: string | null;
  boletoPago?: boolean | null;
  boletoPagoEm?: string | null;
  liberadoParaAgendamento?: boolean | null;
  encerradoEm?: string | null;
  agendamentosIniciaisDispensados?: boolean | null;
  agendamentos?: number;
  vinculosAgendamento?: number;
  vagas?: number;
  creditosAso?: number;
  periodicosFuturos?: number;
}

export interface ReversaoAprovacaoEtapas {
  contratoEnviado?: boolean | null;
  contratoEnviadoEm?: string | null;
  contratoAssinado?: boolean | null;
  contratoAssinadoEm?: string | null;
  contratoSalvoEm?: string | null;
  observacaoContrato?: string | null;
  boletoVencimento?: string | null;
  boletoPago?: boolean | null;
  boletoPagoEm?: string | null;
  comprovantePath?: string | null;
  observacaoPagamento?: string | null;
  financeiroSalvoEm?: string | null;
  pagamentoConfirmadoEm?: string | null;
  procuracaoStatus?: string | null;
  procuracaoSalvaEm?: string | null;
  observacaoProcuracao?: string | null;
  funcionariosListaPath?: string | null;
  funcionariosListaSalvaEm?: string | null;
  funcionariosVagasSalvasEm?: string | null;
  logoPath?: string | null;
  logoSalvaEm?: string | null;
  possuiLogo?: boolean | null;
  visitaTecnicaNecessaria?: boolean | null;
  visitaTecnicaData?: string | null;
  visitaTecnicaHorario?: string | null;
  visitaTecnicaEndereco?: string | null;
  visitaTecnicaObservacoes?: string | null;
  visitaTecnicaSalvaEm?: string | null;
  condicoesHistorico?: number;
}

/** Estado lido dos registros persistidos. A RPC repete estas regras sob lock. */
export interface ReversaoAprovacaoContexto {
  isAdmin: boolean;
  encontrado: boolean;
  status: OrcamentoStatus | null;
  documentosContrato?: number;
  vencimentosContrato?: number;
  contratos?: ReversaoContratoVinculo[];
  aprovacao?: ReversaoAprovacaoEtapas | null;
  /** ausente | vazia (criada na aprovação, sem preenchimento) | iniciada */
  implantacaoAet?: "ausente" | "vazia" | "iniciada";
  treinamentos?: number;
  laudos?: "ausente" | "vazio" | "iniciado";
  riscosTracking?: "ausente" | "vazio" | "iniciado";
  riscosCampanhas?: number;
}

export interface PlanoReversaoAprovacao {
  permitido: boolean;
  mensagem: string | null;
  statusNovo: typeof ORCAMENTO_STATUS_APOS_REVERTER_APROVACAO | null;
  /** Contrato SST criado na aprovação e ainda em aguardando_envio, sem uso. */
  desfazerContratosAutomaticos: boolean;
  desfazerImplantacaoAetVazia: boolean;
  /** Remove o snapshot vivo. O histórico da aprovação permanece na auditoria. */
  arquivarAprovacaoAtual: boolean;
  desfazerLaudosShellVazio: boolean;
  desfazerRiscosShellVazio: boolean;
}

function preenchido(value: string | null | undefined): boolean {
  return Boolean(String(value ?? "").trim());
}

function count(value: number | null | undefined): number {
  return Math.max(0, Number(value) || 0);
}

/**
 * Contrato criado pela aprovação e ainda sem envio, assinatura, cobrança ou uso.
 * PDF gerado é outra verificação (orcamento_contrato_documentos).
 */
export function contratoAutomaticoAindaNaoIniciado(
  contrato: ReversaoContratoVinculo
): boolean {
  return (
    contrato.status === "aguardando_envio" &&
    !preenchido(contrato.enviadoEm) &&
    !preenchido(contrato.assinadoEm) &&
    !preenchido(contrato.boletoVencimento) &&
    contrato.boletoPago !== true &&
    !preenchido(contrato.boletoPagoEm) &&
    contrato.liberadoParaAgendamento !== true &&
    !preenchido(contrato.encerradoEm) &&
    contrato.agendamentosIniciaisDispensados !== true &&
    count(contrato.agendamentos) === 0 &&
    count(contrato.vinculosAgendamento) === 0 &&
    count(contrato.vagas) === 0 &&
    count(contrato.creditosAso) === 0 &&
    count(contrato.periodicosFuturos) === 0
  );
}

function mensagemContratos(
  contratos: ReversaoContratoVinculo[]
): string | null {
  for (const contrato of contratos) {
    if (
      count(contrato.agendamentos) > 0 ||
      count(contrato.vinculosAgendamento) > 0
    ) {
      return REVERSAO_AGENDAMENTO_MSG;
    }
  }
  for (const contrato of contratos) {
    if (count(contrato.vagas) > 0) return REVERSAO_VAGAS_MSG;
  }
  for (const contrato of contratos) {
    if (count(contrato.creditosAso) > 0) return REVERSAO_ASO_MSG;
  }
  for (const contrato of contratos) {
    if (count(contrato.periodicosFuturos) > 0) return REVERSAO_FUTUROS_MSG;
  }
  for (const contrato of contratos) {
    if (
      contrato.boletoPago === true ||
      preenchido(contrato.boletoPagoEm) ||
      preenchido(contrato.boletoVencimento)
    ) {
      return REVERSAO_FINANCEIRO_MSG;
    }
  }
  for (const contrato of contratos) {
    if (!contratoAutomaticoAindaNaoIniciado(contrato)) {
      return REVERSAO_CONTRATO_VINCULADO_MSG;
    }
  }
  return null;
}

function aprovacaoTemFinanceiro(aprovacao: ReversaoAprovacaoEtapas): boolean {
  return (
    aprovacao.boletoPago === true ||
    preenchido(aprovacao.boletoPagoEm) ||
    preenchido(aprovacao.boletoVencimento) ||
    preenchido(aprovacao.comprovantePath) ||
    preenchido(aprovacao.observacaoPagamento) ||
    preenchido(aprovacao.financeiroSalvoEm) ||
    preenchido(aprovacao.pagamentoConfirmadoEm)
  );
}

function aprovacaoTemContratoAcompanhado(
  aprovacao: ReversaoAprovacaoEtapas
): boolean {
  return (
    aprovacao.contratoEnviado === true ||
    preenchido(aprovacao.contratoEnviadoEm) ||
    aprovacao.contratoAssinado === true ||
    preenchido(aprovacao.contratoAssinadoEm) ||
    preenchido(aprovacao.contratoSalvoEm) ||
    preenchido(aprovacao.observacaoContrato)
  );
}

function aprovacaoTemVisita(aprovacao: ReversaoAprovacaoEtapas): boolean {
  return (
    preenchido(aprovacao.visitaTecnicaSalvaEm) ||
    aprovacao.visitaTecnicaNecessaria != null ||
    preenchido(aprovacao.visitaTecnicaData) ||
    preenchido(aprovacao.visitaTecnicaHorario) ||
    preenchido(aprovacao.visitaTecnicaEndereco) ||
    preenchido(aprovacao.visitaTecnicaObservacoes)
  );
}

function aprovacaoTemEtapas(aprovacao: ReversaoAprovacaoEtapas): boolean {
  const procuracao = (aprovacao.procuracaoStatus ?? "pendente").trim();
  return (
    preenchido(aprovacao.procuracaoSalvaEm) ||
    preenchido(aprovacao.observacaoProcuracao) ||
    (procuracao !== "pendente" && procuracao !== "") ||
    preenchido(aprovacao.funcionariosListaPath) ||
    preenchido(aprovacao.funcionariosListaSalvaEm) ||
    preenchido(aprovacao.funcionariosVagasSalvasEm) ||
    preenchido(aprovacao.logoPath) ||
    preenchido(aprovacao.logoSalvaEm) ||
    aprovacao.possuiLogo != null
  );
}

function planoBloqueado(mensagem: string): PlanoReversaoAprovacao {
  return {
    permitido: false,
    mensagem,
    statusNovo: null,
    desfazerContratosAutomaticos: false,
    desfazerImplantacaoAetVazia: false,
    arquivarAprovacaoAtual: false,
    desfazerLaudosShellVazio: false,
    desfazerRiscosShellVazio: false,
  };
}

/**
 * Decide se a reversão simples é segura.
 * Contrato gerado (PDF) bloqueia mesmo sem assinatura.
 * Contrato SST automático ainda em aguardando_envio, sem uso, pode ser desfeito.
 */
export function avaliarReversaoAprovacao(
  ctx: ReversaoAprovacaoContexto
): PlanoReversaoAprovacao {
  if (!ctx.isAdmin) return planoBloqueado(REVERSAO_SEM_PERMISSAO_MSG);
  if (!ctx.encontrado) return planoBloqueado(REVERSAO_NAO_ENCONTRADO_MSG);
  if (ctx.status !== "aprovado") return planoBloqueado(REVERSAO_STATUS_MSG);

  if (count(ctx.documentosContrato) > 0) {
    return planoBloqueado(REVERSAO_CONTRATO_GERADO_MSG);
  }
  if (count(ctx.vencimentosContrato) > 0) {
    return planoBloqueado(REVERSAO_VENCIMENTOS_MSG);
  }

  const contratos = ctx.contratos ?? [];
  const bloqueioContrato = mensagemContratos(contratos);
  if (bloqueioContrato) return planoBloqueado(bloqueioContrato);

  const aprovacao = ctx.aprovacao ?? null;
  if (aprovacao) {
    if (count(aprovacao.condicoesHistorico) > 0) {
      return planoBloqueado(REVERSAO_CONDICOES_MSG);
    }
    if (aprovacaoTemFinanceiro(aprovacao)) {
      return planoBloqueado(REVERSAO_FINANCEIRO_MSG);
    }
    if (aprovacaoTemContratoAcompanhado(aprovacao)) {
      return planoBloqueado(REVERSAO_CONTRATO_ACOMPANHADO_MSG);
    }
    if (aprovacaoTemVisita(aprovacao)) {
      return planoBloqueado(REVERSAO_VISITA_MSG);
    }
    if (aprovacaoTemEtapas(aprovacao)) {
      return planoBloqueado(REVERSAO_ETAPAS_MSG);
    }
  }

  if (ctx.implantacaoAet === "iniciada") return planoBloqueado(REVERSAO_AET_MSG);
  if (count(ctx.treinamentos) > 0) return planoBloqueado(REVERSAO_TREINAMENTO_MSG);
  if (ctx.laudos === "iniciado") return planoBloqueado(REVERSAO_LAUDOS_MSG);
  if (ctx.riscosTracking === "iniciado" || count(ctx.riscosCampanhas) > 0) {
    return planoBloqueado(REVERSAO_RISCOS_MSG);
  }

  return {
    permitido: true,
    mensagem: null,
    statusNovo: ORCAMENTO_STATUS_APOS_REVERTER_APROVACAO,
    desfazerContratosAutomaticos: contratos.length > 0,
    desfazerImplantacaoAetVazia: ctx.implantacaoAet === "vazia",
    arquivarAprovacaoAtual: aprovacao != null,
    desfazerLaudosShellVazio: ctx.laudos === "vazio",
    desfazerRiscosShellVazio: ctx.riscosTracking === "vazio",
  };
}

export function mensagemErroReverterAprovacao(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

  if (/could not find the function|schema cache|PGRST202/i.test(raw)) {
    return "A reversão ainda não está disponível no banco. Execute o script 133_reverter_aprovacao_orcamento.sql.";
  }

  const match = raw.match(/REVERSAO_[A-Z0-9_]+:\s*([\s\S]+)/);
  if (match?.[1]?.trim()) return match[1].trim();

  const conhecidas = [
    REVERSAO_SEM_PERMISSAO_MSG,
    REVERSAO_MOTIVO_OBRIGATORIO_MSG,
    REVERSAO_STATUS_MSG,
    REVERSAO_NAO_ENCONTRADO_MSG,
    REVERSAO_CONTRATO_GERADO_MSG,
    REVERSAO_VENCIMENTOS_MSG,
    REVERSAO_CONTRATO_VINCULADO_MSG,
    REVERSAO_CONTRATO_ACOMPANHADO_MSG,
    REVERSAO_FINANCEIRO_MSG,
    REVERSAO_AGENDAMENTO_MSG,
    REVERSAO_VAGAS_MSG,
    REVERSAO_ASO_MSG,
    REVERSAO_FUTUROS_MSG,
    REVERSAO_VISITA_MSG,
    REVERSAO_AET_MSG,
    REVERSAO_TREINAMENTO_MSG,
    REVERSAO_LAUDOS_MSG,
    REVERSAO_RISCOS_MSG,
    REVERSAO_ETAPAS_MSG,
    REVERSAO_CONDICOES_MSG,
  ];
  for (const mensagem of conhecidas) {
    if (raw.includes(mensagem)) return mensagem;
  }

  return "Não foi possível reverter a aprovação.";
}
