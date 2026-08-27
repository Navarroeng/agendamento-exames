/**
 * Ciclo de vida da campanha de Riscos Psicossociais.
 *
 * Uma campanha por processo (`orcamento_id`). O vencimento do prazo NÃO
 * encerra o ciclo, NÃO apaga dados e NÃO autoriza criar outra campanha.
 * Novo ciclo = novo orçamento/contrato.
 *
 * "Prazo encerrado" é derivado: status persistido `aberta` + hoje > data_encerramento.
 * Não há coluna/enum novo — evita migration e preserva campanhas históricas.
 */

import { hojeCivilIso } from "@/lib/date-br";
import {
  pathAvaliacaoCampanha,
  type RiscosCampanhaRecord,
} from "@/lib/riscos-campanha";

export const MSG_CAMPANHA_CICLO_EXISTENTE =
  "Já existe uma campanha vinculada a este processo.";

export const MSG_PRAZO_ENCERRADO_PORTAL_TITULO =
  "O prazo desta pesquisa foi encerrado.";

export const MSG_PRAZO_ENCERRADO_PORTAL_CORPO =
  "O período para participação nesta pesquisa foi finalizado.\n\nCaso necessário, entre em contato com sua empresa ou com a Navarro Engenharia.";

export const MSG_CADASTRO_APOS_PRAZO =
  "O prazo desta pesquisa está encerrado. O participante será incluído, mas será necessário prorrogar o prazo para permitir a resposta.";

export const MSG_CADASTRO_CAMPANHA_FINALIZADA =
  "Esta pesquisa está finalizada. Para permitir a resposta do novo participante, será necessário reabrir/prorrogar a campanha.";

export const MSG_RELATORIO_NOVAS_RESPOSTAS =
  "Há novas respostas após a geração do relatório atual. Gere uma nova versão para atualizar os resultados.";

export const MSG_EXCLUSAO_FISICA_BLOQUEADA_USO =
  "Não é possível excluir esta campanha: já houve abertura, participantes, sessões, respostas ou relatório. Use Cancelar processo para preservar o histórico.";

export const MSG_EXCLUSAO_FISICA_BLOQUEADA_ABERTA =
  "Não é possível excluir uma campanha que já foi aberta. Use Cancelar processo.";

export const MSG_EDITAR_PERIODO_PRAZO_PASSADO =
  "A nova data de encerramento já passou. Ao salvar, a pesquisa ficará com status efetivo “Prazo encerrado” e novos acessos serão bloqueados até nova prorrogação.";

export const MSG_EDITAR_PERIODO_INICIO_BLOQUEADO =
  "A data inicial não pode ser alterada porque já existem respostas ou sessões nesta pesquisa.";

export type StatusPesquisaExibido =
  | "em_preparacao"
  | "aberta"
  | "prazo_encerrado"
  | "encerrada"
  | "cancelada";

export const STATUS_PESQUISA_EXIBIDO_LABELS: Record<
  StatusPesquisaExibido,
  string
> = {
  em_preparacao: "Em preparação",
  aberta: "Aberta",
  prazo_encerrado: "Prazo encerrado",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export type CampanhaCicloDatas = {
  status: string | null | undefined;
  data_inicio?: string | null;
  data_encerramento?: string | null;
};

export function dataCivilIso(value: string | null | undefined): string {
  return String(value ?? "").trim().slice(0, 10);
}

export function isDataCivilIso(value: string | null | undefined): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dataCivilIso(value));
}

/** Prazo vencido com a campanha ainda aberta (ciclo válido). */
export function isPrazoEncerrado(
  campanha: CampanhaCicloDatas | null | undefined,
  hojeIso?: string
): boolean {
  if (!campanha) return false;
  if (String(campanha.status ?? "") !== "aberta") return false;
  const fim = dataCivilIso(campanha.data_encerramento);
  if (!isDataCivilIso(fim)) return false;
  const hoje = (hojeIso ?? hojeCivilIso()).slice(0, 10);
  return hoje > fim;
}

export function statusPesquisaExibido(
  campanha: CampanhaCicloDatas | null | undefined,
  hojeIso?: string
): StatusPesquisaExibido | null {
  if (!campanha) return null;
  const status = String(campanha.status ?? "");
  if (status === "cancelada") return "cancelada";
  if (status === "encerrada") return "encerrada";
  if (status === "em_preparacao") return "em_preparacao";
  if (status === "aberta") {
    return isPrazoEncerrado(campanha, hojeIso) ? "prazo_encerrado" : "aberta";
  }
  return null;
}

export function labelStatusPesquisaExibido(
  campanha: CampanhaCicloDatas | null | undefined,
  hojeIso?: string
): string {
  const exibido = statusPesquisaExibido(campanha, hojeIso);
  if (!exibido) return "Sincronizando…";
  return STATUS_PESQUISA_EXIBIDO_LABELS[exibido];
}

/** Qualquer campanha do orçamento (qualquer status) pertence ao ciclo. */
export function campanhaDoCicloJaExiste<
  T extends { id?: string | null } | null | undefined,
>(existentes: ReadonlyArray<T>): boolean {
  return existentes.some((c) => Boolean(c?.id));
}

export class CampanhaCicloExistenteError extends Error {
  readonly campanha: RiscosCampanhaRecord;
  readonly httpStatus = 409 as const;

  constructor(campanha: RiscosCampanhaRecord) {
    super(MSG_CAMPANHA_CICLO_EXISTENTE);
    this.name = "CampanhaCicloExistenteError";
    this.campanha = campanha;
  }
}

export function validateProrrogarPrazoCampanha(input: {
  campanha: CampanhaCicloDatas;
  novaDataEncerramentoIso: string;
  hojeIso?: string;
}): string | null {
  const status = String(input.campanha.status ?? "");
  if (status === "cancelada") {
    return "Não é possível prorrogar o prazo de uma pesquisa cancelada.";
  }
  if (status === "em_preparacao") {
    return "Abra a pesquisa antes de prorrogar o prazo.";
  }
  if (status === "encerrada") {
    return "Para voltar a receber respostas, use Reabrir pesquisa.";
  }
  if (status !== "aberta") {
    return "Não é possível prorrogar o prazo desta pesquisa.";
  }

  return validateNovaDataEncerramento({
    dataInicioIso: input.campanha.data_inicio,
    dataEncerramentoAtualIso: input.campanha.data_encerramento,
    novaDataEncerramentoIso: input.novaDataEncerramentoIso,
    hojeIso: input.hojeIso,
  });
}

export function validateNovaDataEncerramento(input: {
  dataInicioIso?: string | null;
  dataEncerramentoAtualIso?: string | null;
  novaDataEncerramentoIso: string;
  hojeIso?: string;
}): string | null {
  const nova = dataCivilIso(input.novaDataEncerramentoIso);
  if (!isDataCivilIso(nova)) {
    return "Informe a nova data de encerramento.";
  }
  const inicio = dataCivilIso(input.dataInicioIso);
  if (isDataCivilIso(inicio) && nova < inicio) {
    return "A nova data de encerramento deve ser igual ou posterior ao início.";
  }
  const atual = dataCivilIso(input.dataEncerramentoAtualIso);
  if (isDataCivilIso(atual) && nova <= atual) {
    return "A nova data de encerramento deve ser posterior à data atual de encerramento.";
  }
  const hoje = (input.hojeIso ?? hojeCivilIso()).slice(0, 10);
  if (nova < hoje) {
    return "A nova data de encerramento não pode ser anterior a hoje.";
  }
  return null;
}

export function validateReabrirCampanha(input: {
  campanha: CampanhaCicloDatas;
  novaDataEncerramentoIso?: string | null;
  hojeIso?: string;
}): string | null {
  const status = String(input.campanha.status ?? "");
  if (status === "cancelada") {
    return "Não é possível reabrir uma pesquisa cancelada.";
  }
  if (status === "em_preparacao") {
    return "Esta pesquisa ainda não foi aberta.";
  }
  if (status === "aberta" && !isPrazoEncerrado(input.campanha, input.hojeIso)) {
    return "Esta pesquisa já está aberta e dentro do prazo.";
  }

  const precisaNovaData =
    status === "encerrada" || isPrazoEncerrado(input.campanha, input.hojeIso);
  if (precisaNovaData) {
    const nova = dataCivilIso(input.novaDataEncerramentoIso);
    if (!isDataCivilIso(nova)) {
      return "Informe a nova data de encerramento para reabrir a pesquisa.";
    }
    return validateNovaDataEncerramento({
      dataInicioIso: input.campanha.data_inicio,
      dataEncerramentoAtualIso: input.campanha.data_encerramento,
      novaDataEncerramentoIso: nova,
      hojeIso: input.hojeIso,
    });
  }
  return null;
}

export function campanhaBloqueiaEdicaoDataInicio(input: {
  sessoes?: number;
  respostas?: number;
  participantes?: ReadonlyArray<{ status: string }>;
}): boolean {
  if ((input.sessoes ?? 0) > 0) return true;
  if ((input.respostas ?? 0) > 0) return true;
  return (input.participantes ?? []).some((p) => {
    const s = String(p.status ?? "");
    return s === "respondido" || s === "iniciado";
  });
}

export function editarPeriodoExigeConfirmacaoPrazoEncerrado(input: {
  novaDataEncerramentoIso: string;
  hojeIso?: string;
}): boolean {
  const nova = dataCivilIso(input.novaDataEncerramentoIso);
  if (!isDataCivilIso(nova)) return false;
  const hoje = (input.hojeIso ?? hojeCivilIso()).slice(0, 10);
  return nova < hoje;
}

export function validateEditarPeriodoCampanha(input: {
  campanha: CampanhaCicloDatas;
  novaDataInicioIso: string;
  novaDataEncerramentoIso: string;
  hojeIso?: string;
  inicioBloqueado?: boolean;
}): string | null {
  const status = String(input.campanha.status ?? "");
  if (status === "cancelada") {
    return "Não é possível editar o período de uma pesquisa cancelada.";
  }
  if (status === "em_preparacao") {
    return "Abra a pesquisa antes de editar o período.";
  }
  if (status === "encerrada") {
    return "Para voltar a receber respostas, use Reabrir pesquisa.";
  }
  if (status !== "aberta") {
    return "Não é possível editar o período desta pesquisa.";
  }
  if (isPrazoEncerrado(input.campanha, input.hojeIso)) {
    return "O prazo já encerrou. Use Prorrogar prazo.";
  }

  const inicio = dataCivilIso(input.novaDataInicioIso);
  const fim = dataCivilIso(input.novaDataEncerramentoIso);
  if (!isDataCivilIso(inicio)) {
    return "Informe a data inicial.";
  }
  if (!isDataCivilIso(fim)) {
    return "Informe a data de encerramento.";
  }
  if (fim < inicio) {
    return "A data de encerramento deve ser igual ou posterior à data inicial.";
  }

  const inicioAtual = dataCivilIso(input.campanha.data_inicio);
  if (
    input.inicioBloqueado &&
    isDataCivilIso(inicioAtual) &&
    inicio !== inicioAtual
  ) {
    return MSG_EDITAR_PERIODO_INICIO_BLOQUEADO;
  }

  const fimAtual = dataCivilIso(input.campanha.data_encerramento);
  if (inicio === inicioAtual && fim === fimAtual) {
    return "Altere ao menos uma das datas do período.";
  }

  return null;
}

export type AcoesPesquisaCiclo = {
  statusExibido: StatusPesquisaExibido | null;
  statusLabel: string;
  exibirAbrir: boolean;
  exibirEncerrar: boolean;
  exibirEditarPeriodo: boolean;
  exibirProrrogar: boolean;
  exibirReabrir: boolean;
  exibirLink: boolean;
  permitirCopiarLink: boolean;
};

export function acoesPesquisaPorCampanha(input: {
  status: string | null | undefined;
  data_inicio?: string | null;
  data_encerramento?: string | null;
  relatorioGerado?: boolean;
  processoCancelado?: boolean;
  hojeIso?: string;
}): AcoesPesquisaCiclo {
  const campanha: CampanhaCicloDatas = {
    status: input.status,
    data_inicio: input.data_inicio,
    data_encerramento: input.data_encerramento,
  };
  const exibido = statusPesquisaExibido(campanha, input.hojeIso);
  const cancelado = input.processoCancelado === true;
  const label = labelStatusPesquisaExibido(campanha, input.hojeIso);

  if (cancelado || !exibido) {
    return {
      statusExibido: exibido,
      statusLabel: cancelado ? "Cancelada" : label,
      exibirAbrir: false,
      exibirEncerrar: false,
      exibirEditarPeriodo: false,
      exibirProrrogar: false,
      exibirReabrir: false,
      exibirLink: exibido === "aberta" || exibido === "prazo_encerrado" || exibido === "encerrada",
      permitirCopiarLink: false,
    };
  }

  return {
    statusExibido: exibido,
    statusLabel: label,
    exibirAbrir: exibido === "em_preparacao",
    exibirEncerrar: exibido === "aberta",
    exibirEditarPeriodo: exibido === "aberta",
    exibirProrrogar: exibido === "prazo_encerrado",
    exibirReabrir: exibido === "encerrada",
    exibirLink:
      exibido === "aberta" ||
      exibido === "prazo_encerrado" ||
      exibido === "encerrada",
    permitirCopiarLink: exibido === "aberta" || exibido === "prazo_encerrado",
  };
}

export function avisoCadastroParticipanteCampanha(input: {
  campanha: CampanhaCicloDatas;
  relatorioGerado?: boolean;
  processoFinalizado?: boolean;
  hojeIso?: string;
}): string | null {
  const status = String(input.campanha.status ?? "");
  if (status === "cancelada") return null;
  if (input.processoFinalizado || input.relatorioGerado) {
    if (
      isPrazoEncerrado(input.campanha, input.hojeIso) ||
      status === "encerrada"
    ) {
      return MSG_CADASTRO_CAMPANHA_FINALIZADA;
    }
  }
  if (isPrazoEncerrado(input.campanha, input.hojeIso) || status === "encerrada") {
    return MSG_CADASTRO_APOS_PRAZO;
  }
  return null;
}

export function campanhaPermiteCadastroParticipantes(
  status: string | null | undefined
): string | null {
  const s = String(status ?? "");
  if (s === "cancelada") {
    return "Não é possível cadastrar participantes em campanha cancelada.";
  }
  if (
    s !== "em_preparacao" &&
    s !== "aberta" &&
    s !== "encerrada"
  ) {
    return "A campanha não está disponível para cadastro de participantes.";
  }
  return null;
}

export function haRespostasAposRelatorio(input: {
  relatorioRespondentes: number | null | undefined;
  relatorioGeradoEm?: string | null;
  participantesRespondidos: number;
  ultimaConclusaoIso?: string | null;
}): boolean {
  if (input.relatorioRespondentes == null) return false;
  if (
    input.participantesRespondidos > Number(input.relatorioRespondentes || 0)
  ) {
    return true;
  }
  const geradoEm = String(input.relatorioGeradoEm ?? "").trim();
  const ultima = String(input.ultimaConclusaoIso ?? "").trim();
  if (geradoEm && ultima && ultima > geradoEm) return true;
  return false;
}

export function campanhaBloqueiaExclusaoFisica(input: {
  status: string | null | undefined;
  participantes: number;
  sessoes: number;
  respostas: number;
  temRelatorio?: boolean;
}): string | null {
  if (input.temRelatorio) return MSG_EXCLUSAO_FISICA_BLOQUEADA_USO;
  if (input.respostas > 0) return MSG_EXCLUSAO_FISICA_BLOQUEADA_USO;
  if (input.sessoes > 0) return MSG_EXCLUSAO_FISICA_BLOQUEADA_USO;
  if (input.participantes > 0) return MSG_EXCLUSAO_FISICA_BLOQUEADA_USO;
  const status = String(input.status ?? "");
  if (status === "aberta" || status === "encerrada") {
    return MSG_EXCLUSAO_FISICA_BLOQUEADA_ABERTA;
  }
  return null;
}

export function mesmoLinkAposProrrogacao(
  codigoPublico: string,
  codigoApos: string
): boolean {
  return (
    pathAvaliacaoCampanha(codigoPublico) === pathAvaliacaoCampanha(codigoApos)
  );
}
