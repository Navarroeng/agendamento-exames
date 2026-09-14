import { isAsoPontual } from "@/lib/agendamento-aso-pontual";
import { formatDateBR } from "@/lib/format";
import { isPeriodicoCanceladoManualmente } from "@/lib/periodico-cancelamento";
import {
  isAsoDemissional,
  TIPOS_ASO_PODEM_ORIGINAR_PERIODICO,
} from "@/lib/periodico-geracao";

/** Motivos disponíveis no modal “Informar exame futuro”. */
export const MOTIVOS_EXAME_FUTURO = [
  "ASO ainda vigente",
  "Exame periódico de 6 meses",
  "Solicitação do cliente",
  "Outro",
] as const;

export type MotivoExameFuturo = (typeof MOTIVOS_EXAME_FUTURO)[number];

export const ORIGEM_PERIODICO_IMPLANTACAO = "implantacao_inicial" as const;
export const ORIGEM_PERIODICO_AGENDAMENTO = "agendamento" as const;

export type OrigemPeriodicoFuturo =
  | typeof ORIGEM_PERIODICO_IMPLANTACAO
  | typeof ORIGEM_PERIODICO_AGENDAMENTO
  | string;

export const TIPOS_ASO_EXAME_FUTURO = TIPOS_ASO_PODEM_ORIGINAR_PERIODICO;

export function isMotivoExameFuturo(value: string): value is MotivoExameFuturo {
  return (MOTIVOS_EXAME_FUTURO as readonly string[]).includes(value);
}

export function labelOrigemPeriodico(origem: string | null | undefined): string {
  const key = (origem ?? "").trim().toLowerCase();
  if (key === ORIGEM_PERIODICO_IMPLANTACAO || key === "implantação inicial") {
    return "Implantação Inicial";
  }
  if (key === ORIGEM_PERIODICO_AGENDAMENTO || !key) {
    return "Agendamento";
  }
  return origem!.trim();
}

export function labelMotivoExameFuturo(
  motivo: string | null | undefined,
  motivoDetalhe?: string | null
): string {
  const base = (motivo ?? "").trim();
  if (!base) return "—";
  if (base === "Outro") {
    const detalhe = (motivoDetalhe ?? "").trim();
    return detalhe ? `Outro — ${detalhe}` : "Outro";
  }
  return base;
}

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/** Ex.: 2027-01-15 → "Janeiro/2027" */
export function formatMesAnoPrevisto(isoDate: string | null | undefined): string {
  const raw = (isoDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "—";
  const [y, m] = raw.split("-").map(Number);
  const mes = MESES_PT[m - 1];
  if (!mes || !y) return "—";
  return `${mes}/${y}`;
}

export const EXAME_FUTURO_FORA_VIGENCIA_MSG =
  "A data informada está fora da vigência deste contrato.";

/** Data prevista (YYYY-MM-DD) deve estar entre data_inicio e data_fim do contrato. */
export function dataPrevistaDentroDaVigenciaContrato(params: {
  dataPrevistaIso: string;
  dataInicio?: string | null;
  dataFim?: string | null;
}): boolean {
  const data = (params.dataPrevistaIso ?? "").trim().slice(0, 10);
  const inicio = (params.dataInicio ?? "").trim().slice(0, 10);
  const fim = (params.dataFim ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    return false;
  }
  return data >= inicio && data <= fim;
}

/**
 * Vaga programada cujo periódico foi cancelado deve voltar a Comprometido
 * (obrigação contratual ainda sem definição operacional).
 */
export function deveReverterVagaAposCancelamentoPeriodico(params: {
  vagaStatus?: string | null;
  periodicoFuturoId?: string | null;
  periodicoCancelado?: boolean;
}): boolean {
  if (!params.periodicoCancelado) return false;
  if ((params.vagaStatus ?? "").trim() !== "programada") return false;
  return Boolean((params.periodicoFuturoId ?? "").trim());
}

export type CriarExameFuturoInput = {
  contratoId: string;
  clienteNome: string;
  colaborador: string;
  colaboradorCpf: string | null;
  tipoAso: string;
  dataPrevistaIso: string;
  motivo: MotivoExameFuturo;
  motivoDetalhe: string | null;
  observacoes: string | null;
  criadoPor: string;
  /** Quando informado, ocupa esta vaga comprometida (não a primeira aberta). */
  vagaId?: string | null;
  cargoId?: string | null;
  cargoNome?: string | null;
};

export type ColaboradorSugestao = {
  colaborador: string;
  colaborador_cpf: string | null;
};

export type StatusExameFuturoImplantacao =
  | "Programado"
  | "Agendado"
  | "Atendido"
  | "Cancelado";

/**
 * Determina o status operacional da programação futura na Implantação.
 *
 * Regra:
 * - Periódico cancelado manualmente ou com status cancelado → Cancelado
 * - Periódico efetivamente cumprido (exame realizado / ASO concluído) → Atendido
 * - Periódico com agendamento ativo vinculado → Agendado
 * - Agendamento vinculado cancelado (ou sem vínculo ativo) → Programado
 */
export function determinarStatusProgramacaoFutura(params: {
  status?: string | null;
  canceladoManualmente?: boolean;
  agendamentoVinculadoId?: string | null;
  agendamentoStatus?: string | null;
  agendamentoCumprido?: boolean;
  dataRealizada?: string | null;
}): StatusExameFuturoImplantacao {
  if (params.canceladoManualmente || params.status === "cancelado") {
    return "Cancelado";
  }

  const rawAgStatus = String(params.agendamentoStatus ?? "").trim().toLowerCase();
  const agCancelado = rawAgStatus === "cancelado";
  const temVinculoAtivo = Boolean(
    params.agendamentoVinculadoId &&
      rawAgStatus &&
      !agCancelado
  );

  if (
    params.dataRealizada ||
    params.agendamentoCumprido ||
    rawAgStatus === "atendido" ||
    rawAgStatus === "concluido"
  ) {
    return "Atendido";
  }

  if (temVinculoAtivo || (params.status === "reagendado" && !agCancelado && params.agendamentoVinculadoId)) {
    return "Agendado";
  }

  return "Programado";
}

export function statusExameFuturoImplantacaoClass(
  status: StatusExameFuturoImplantacao
): string {
  switch (status) {
    case "Agendado":
      return "text-brand-blue font-semibold";
    case "Atendido":
      return "text-brand-green font-semibold";
    case "Cancelado":
      return "text-[#64748b]";
    case "Programado":
    default:
      return "text-navy font-semibold";
  }
}

export const PROGRAMACAO_FUTURA_ATUALIZADA_MSG =
  "Programação futura atualizada com sucesso.";

export const PROGRAMACAO_FUTURA_NAO_EDITAVEL_ORIGEM_MSG =
  "Só é possível editar programações futuras originadas na Implantação.";

export const PROGRAMACAO_FUTURA_NAO_EDITAVEL_STATUS_MSG =
  "Só é possível editar programações futuras ainda ativas e não realizadas.";

export const PROGRAMACAO_FUTURA_NAO_EDITAVEL_AGENDADA_MSG =
  "Não é possível editar uma programação que já possui agendamento.";

export const PROGRAMACAO_FUTURA_TIPO_ASO_INVALIDO_MSG =
  "Selecione um tipo de ASO válido para a programação futura.";

/** Campos gravados no UPDATE da programação. Nada além disto é alterado. */
export const CAMPOS_UPDATE_PROGRAMACAO_FUTURA = [
  "proxima_data",
  "data_prevista_original",
  "tipo_aso",
  "tipo_exame",
  "exame_nome",
  "antecipado",
] as const;

export type PatchProgramacaoFutura = {
  proxima_data: string;
  data_prevista_original: string;
  tipo_aso: string;
  tipo_exame: string;
  exame_nome: string;
  antecipado: false;
};

export type RegistroEdicaoProgramacaoFutura = {
  origem?: string | null;
  status?: string | null;
  data_realizada?: string | null;
  agendamento_vinculado_id?: string | null;
  agendamento_id?: string | null;
  agendamento_status?: string | null;
  cancelado_em?: string | null;
  motivo_cancelamento?: string | null;
};

export function isOrigemImplantacaoInicial(
  origem: string | null | undefined
): boolean {
  const key = (origem ?? "").trim().toLowerCase();
  return key === ORIGEM_PERIODICO_IMPLANTACAO || key === "implantação inicial";
}

export function isTipoAsoExameFuturo(value: string): boolean {
  return (TIPOS_ASO_EXAME_FUTURO as readonly string[]).includes(value);
}

function temVinculoAgendamentoAtivo(
  record: RegistroEdicaoProgramacaoFutura
): boolean {
  if ((record.status ?? "").trim() === "reagendado") return true;
  const vinculo = (record.agendamento_vinculado_id ?? "").trim();
  if (vinculo) {
    const st = String(record.agendamento_status ?? "")
      .trim()
      .toLowerCase();
    return st !== "cancelado";
  }
  return false;
}

export function motivoBloqueioEdicaoProgramacaoFutura(
  record: RegistroEdicaoProgramacaoFutura | null | undefined
): string | null {
  if (!record) {
    return "Programação futura não encontrada.";
  }
  if (!isOrigemImplantacaoInicial(record.origem)) {
    return PROGRAMACAO_FUTURA_NAO_EDITAVEL_ORIGEM_MSG;
  }
  if (
    isPeriodicoCanceladoManualmente({
      status: (record.status ?? "ativo") as "ativo" | "reagendado" | "cancelado",
      cancelado_em: record.cancelado_em ?? null,
      motivo_cancelamento: record.motivo_cancelamento ?? null,
    }) ||
    record.status === "cancelado"
  ) {
    return PROGRAMACAO_FUTURA_NAO_EDITAVEL_STATUS_MSG;
  }
  if (record.status !== "ativo") {
    return PROGRAMACAO_FUTURA_NAO_EDITAVEL_AGENDADA_MSG;
  }
  if ((record.data_realizada ?? "").toString().trim()) {
    return PROGRAMACAO_FUTURA_NAO_EDITAVEL_STATUS_MSG;
  }
  if (temVinculoAgendamentoAtivo(record)) {
    return PROGRAMACAO_FUTURA_NAO_EDITAVEL_AGENDADA_MSG;
  }
  return null;
}

export function podeEditarProgramacaoFutura(
  record: RegistroEdicaoProgramacaoFutura | null | undefined
): boolean {
  return motivoBloqueioEdicaoProgramacaoFutura(record) == null;
}

export function validarEdicaoProgramacaoFutura(input: {
  tipoAso: string;
  dataPrevistaIso: string;
  dataInicioContrato?: string | null;
  dataFimContrato?: string | null;
}): { ok: true; patch: PatchProgramacaoFutura } | { ok: false; message: string } {
  const tipoAso = input.tipoAso.trim();
  const dataPrevista = input.dataPrevistaIso.trim().slice(0, 10);

  if (!tipoAso) {
    return { ok: false, message: "Informe o tipo de ASO." };
  }
  if (isAsoDemissional(tipoAso) || isAsoPontual(tipoAso) || !isTipoAsoExameFuturo(tipoAso)) {
    return { ok: false, message: PROGRAMACAO_FUTURA_TIPO_ASO_INVALIDO_MSG };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPrevista)) {
    return { ok: false, message: "Informe a data programada." };
  }

  const inicio = (input.dataInicioContrato ?? "").trim().slice(0, 10);
  const fim = (input.dataFimContrato ?? "").trim().slice(0, 10);
  if (inicio || fim) {
    if (!inicio || !fim) {
      return { ok: false, message: "Contrato sem vigência definida." };
    }
    if (
      !dataPrevistaDentroDaVigenciaContrato({
        dataPrevistaIso: dataPrevista,
        dataInicio: inicio,
        dataFim: fim,
      })
    ) {
      return { ok: false, message: EXAME_FUTURO_FORA_VIGENCIA_MSG };
    }
  }

  return {
    ok: true,
    patch: {
      proxima_data: dataPrevista,
      data_prevista_original: dataPrevista,
      tipo_aso: tipoAso,
      tipo_exame: tipoAso,
      exame_nome: tipoAso,
      antecipado: false,
    },
  };
}

/** Aplica o patch no mesmo objeto. Não cria registro novo. */
export function aplicarPatchProgramacaoFutura<T extends object>(
  record: T,
  patch: PatchProgramacaoFutura
): T {
  return {
    ...record,
    ...patch,
  };
}

export function descreverAlteracaoProgramacaoFutura(params: {
  tipoAsoAntes: string;
  tipoAsoDepois: string;
  dataAntes: string;
  dataDepois: string;
}): string {
  const partes: string[] = [];
  if (params.tipoAsoAntes !== params.tipoAsoDepois) {
    partes.push(`Tipo de ASO: ${params.tipoAsoAntes} → ${params.tipoAsoDepois}`);
  }
  if (params.dataAntes !== params.dataDepois) {
    partes.push(
      `Data programada: ${formatDateBR(params.dataAntes)} → ${formatDateBR(params.dataDepois)}`
    );
  }
  return partes.join("; ");
}

