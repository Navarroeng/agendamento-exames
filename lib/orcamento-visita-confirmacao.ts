import {
  formatDateIsoToBR,
  isValidHorario24,
  normalizeHorarioForCompare,
} from "@/lib/agendamento-datetime";
import { formatHorarioVisitaDisplay } from "@/lib/orcamento-visita-mensagem";
import type {
  ImplantacaoAetRecord,
  ImplantacaoAetVisitaStatus,
} from "@/lib/implantacao-aet";

export const MENSAGEM_CONFIRMACAO_VISITA_COPIADA = "Mensagem copiada!";

export const MENSAGEM_CONFIRMACAO_VISITA_SALVAR_ANTES =
  "Salve as alterações da visita antes de copiar a confirmação.";

export type VisitaConfirmacaoForm = {
  visita_status: ImplantacaoAetVisitaStatus;
  visita_data: string;
  visita_horario: string;
  visita_responsavel: string;
  visita_endereco: string;
  visita_observacao: string;
};

export type VisitaConfirmacaoSalva = Pick<
  ImplantacaoAetRecord,
  | "visita_status"
  | "visita_data"
  | "visita_horario"
  | "visita_responsavel"
  | "visita_endereco"
  | "visita_observacao"
>;

/**
 * Endereço inicial do formulário.
 * Visita ainda não agendada recebe o endereço da empresa, só na tela.
 * Visita já salva sem endereço permanece vazia: observação antiga não vira endereço.
 */
export function enderecoVisitaInicial(params: {
  enderecoSalvo: string | null | undefined;
  enderecoEmpresa: string | null | undefined;
  visitaStatus: ImplantacaoAetVisitaStatus | null | undefined;
}): string {
  const salvo = params.enderecoSalvo?.trim() ?? "";
  if (salvo) return salvo;
  if (params.visitaStatus !== "aguardando_agendamento") return "";
  return params.enderecoEmpresa?.trim() ?? "";
}

function normTexto(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Prefixo AAAA-MM-DD, sem converter fuso. */
export function dataVisitaIsoLocal(value: string | null | undefined): string {
  const base = normTexto(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(base) ? base : "";
}

export function visitaSalvaDoOrcamento<T extends { orcamento_id: string }>(
  salvo: T | null | undefined,
  orcamentoId: string
): T | null {
  if (!salvo || salvo.orcamento_id !== orcamentoId) return null;
  return salvo;
}

export function visitaSalvaPermiteCopiarConfirmacao(
  salvo: VisitaConfirmacaoSalva | null | undefined
): boolean {
  if (!salvo || salvo.visita_status !== "agendada") return false;
  if (!dataVisitaIsoLocal(salvo.visita_data)) return false;
  return isValidHorario24(normalizeHorarioForCompare(salvo.visita_horario));
}

export function visitaFormTemAlteracoesNaoSalvas(
  form: VisitaConfirmacaoForm,
  salvo: VisitaConfirmacaoSalva | null | undefined
): boolean {
  if (!salvo) return true;
  return (
    form.visita_status !== salvo.visita_status ||
    dataVisitaIsoLocal(form.visita_data) !== dataVisitaIsoLocal(salvo.visita_data) ||
    normalizeHorarioForCompare(form.visita_horario) !==
      normalizeHorarioForCompare(salvo.visita_horario) ||
    normTexto(form.visita_responsavel) !== normTexto(salvo.visita_responsavel) ||
    normTexto(form.visita_endereco) !== normTexto(salvo.visita_endereco) ||
    normTexto(form.visita_observacao) !== normTexto(salvo.visita_observacao)
  );
}

export function buildMensagemConfirmacaoVisitaAgendada(params: {
  empresa: string;
  data: string;
  horario: string;
  responsavel: string;
  endereco: string;
}): string {
  const dataIso = dataVisitaIsoLocal(params.data);
  const linhas = [
    "Olá! Tudo bem? 😊",
    "",
    "Confirmamos a visita técnica da *Navarro Engenharia* à sua empresa:",
    "",
    `🏢 *Empresa:* ${normTexto(params.empresa)}`,
    `📅 *Data:* ${dataIso ? formatDateIsoToBR(dataIso) : ""}`,
    `🕒 *Horário:* ${formatHorarioVisitaDisplay(params.horario)}`,
  ];
  const responsavel = normTexto(params.responsavel);
  if (responsavel) {
    linhas.push(`👤 *Responsável pela visita:* ${responsavel}`);
  }
  const endereco = normTexto(params.endereco);
  if (endereco) {
    linhas.push(`📍 *Endereço:* ${endereco}`);
  }
  linhas.push(
    "",
    "Pedimos que uma pessoa responsável esteja disponível para acompanhar a visita e apresentar as atividades e os ambientes de trabalho.",
    "",
    "Podemos confirmar? Caso precisem ajustar alguma informação, é só nos avisar!"
  );
  return linhas.join("\n");
}

export type PreparoConfirmacaoVisita =
  | { ok: true; mensagem: string }
  | { ok: false; motivo: "indisponivel" | "alteracoes_nao_salvas" };

/**
 * Monta a mensagem só com a visita salva e a empresa do orçamento aberto.
 * Observação fica de fora, mesmo quando já está gravada.
 */
export function prepararCopiaConfirmacaoVisita(params: {
  form: VisitaConfirmacaoForm;
  salvo: VisitaConfirmacaoSalva | null | undefined;
  empresa: string;
}): PreparoConfirmacaoVisita {
  if (!params.salvo || !visitaSalvaPermiteCopiarConfirmacao(params.salvo)) {
    return { ok: false, motivo: "indisponivel" };
  }
  if (visitaFormTemAlteracoesNaoSalvas(params.form, params.salvo)) {
    return { ok: false, motivo: "alteracoes_nao_salvas" };
  }
  return {
    ok: true,
    mensagem: buildMensagemConfirmacaoVisitaAgendada({
      empresa: params.empresa,
      data: params.salvo.visita_data ?? "",
      horario: params.salvo.visita_horario ?? "",
      responsavel: params.salvo.visita_responsavel ?? "",
      endereco: params.salvo.visita_endereco ?? "",
    }),
  };
}

export async function copiarTextoAreaTransferencia(
  texto: string
): Promise<boolean> {
  try {
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard?.writeText
    ) {
      return false;
    }
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}
