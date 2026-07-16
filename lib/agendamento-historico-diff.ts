import { normalizeHorarioForCompare } from "@/lib/agendamento-datetime";
import { formatCPF, normalizeCpfDigits } from "@/lib/cpf";
import { normalizeUppercaseField } from "@/lib/text-normalize";
import { formatDateBR } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import type { AgendamentoDocumentacaoInsert } from "@/lib/agendamento-documentacao";
import type {
  AgendamentoInsert,
  AgendamentoWithExames,
} from "@/lib/types";
import type { ExamePayload } from "@/services/agendamento.service";

export interface HistoricoEntryDraft {
  acao: string;
  detalhes: string;
}

function boolLabel(value: boolean): string {
  return value ? "Sim" : "Não";
}

function displayValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

function normalizeIsoDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const trimmed = value.trim();
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }
  return trimmed.split("T")[0];
}

function formatCpfField(value: string | null | undefined): string {
  const digits = normalizeCpfDigits(value);
  if (!digits) return "—";
  return formatCPF(digits);
}

function normalizeMoneyAmount(value: number): number {
  return Math.round(Number(value) * 100) / 100;
}

function formatDateField(value: string | null | undefined): string {
  const iso = normalizeIsoDate(value);
  if (!iso) return "—";
  return formatDateBR(iso);
}

function pushChange(
  changes: HistoricoEntryDraft[],
  usuario: string,
  message: string
) {
  changes.push({
    acao: "Alteração",
    detalhes: `${usuario} ${message}`,
  });
}

function compareUppercaseField(
  changes: HistoricoEntryDraft[],
  usuario: string,
  label: string,
  oldValue: string,
  newValue: string
) {
  const oldNorm = normalizeUppercaseField(oldValue);
  const newNorm = normalizeUppercaseField(newValue);
  if (oldNorm === newNorm) return;
  compareField(changes, usuario, label, oldNorm, newNorm);
}

function compareHorarioField(
  changes: HistoricoEntryDraft[],
  usuario: string,
  oldValue: string | null | undefined,
  newValue: string | null | undefined
) {
  const oldNorm = normalizeHorarioForCompare(oldValue);
  const newNorm = normalizeHorarioForCompare(newValue);
  if (oldNorm === newNorm) return;

  compareField(
    changes,
    usuario,
    "o horário",
    oldNorm,
    newNorm,
    (value) => (value ? value : "—")
  );
}

function compareField(
  changes: HistoricoEntryDraft[],
  usuario: string,
  label: string,
  oldValue: string,
  newValue: string,
  format: (v: string) => string = displayValue
) {
  const oldFormatted = format(oldValue);
  const newFormatted = format(newValue);
  if (oldFormatted === newFormatted) return;

  if (oldFormatted === "—" && newFormatted !== "—") {
    pushChange(changes, usuario, `incluiu ${label} ${newFormatted}`);
    return;
  }

  if (oldFormatted !== "—" && newFormatted === "—") {
    pushChange(
      changes,
      usuario,
      `removeu ${label} (era ${oldFormatted})`
    );
    return;
  }

  pushChange(
    changes,
    usuario,
    `alterou ${label} de ${oldFormatted} para ${newFormatted}`
  );
}

function compareObservacaoAgendamento(
  changes: HistoricoEntryDraft[],
  usuario: string,
  oldValue: string | null | undefined,
  newValue: string | null | undefined
) {
  const oldNorm = (oldValue ?? "").trim();
  const newNorm = (newValue ?? "").trim();
  if (oldNorm === newNorm) return;

  if (!oldNorm && newNorm) {
    pushChange(changes, usuario, "incluiu a observação do agendamento.");
    return;
  }

  pushChange(changes, usuario, "alterou a observação do agendamento.");
}

function compareBoolField(
  changes: HistoricoEntryDraft[],
  usuario: string,
  label: string,
  oldValue: boolean,
  newValue: boolean
) {
  if (oldValue === newValue) return;
  pushChange(
    changes,
    usuario,
    `alterou ${label} de ${boolLabel(oldValue)} para ${boolLabel(newValue)}`
  );
}

function compareBoolWithDate(
  changes: HistoricoEntryDraft[],
  usuario: string,
  boolLabelText: string,
  oldBool: boolean,
  newBool: boolean,
  oldDate: string | null,
  newDate: string | null,
  dateLabel: string
) {
  compareBoolField(changes, usuario, boolLabelText, oldBool, newBool);

  if (oldBool && newBool) {
    compareField(
      changes,
      usuario,
      dateLabel,
      oldDate ?? "",
      newDate ?? "",
      formatDateField
    );
  } else if (!oldBool && newBool && newDate) {
    compareField(
      changes,
      usuario,
      dateLabel,
      "",
      newDate,
      formatDateField
    );
  }
}

function examMap(exames: { tipo_exame: string; valor_cliente: number; custo_clinica: number }[]) {
  const map = new Map<string, { valor: number; custo: number }>();
  exames.forEach((e) => {
    map.set(e.tipo_exame, {
      valor: Number(e.valor_cliente),
      custo: Number(e.custo_clinica),
    });
  });
  return map;
}

function compareExames(
  changes: HistoricoEntryDraft[],
  usuario: string,
  oldExames: AgendamentoWithExames["agendamento_exames"],
  newExames: ExamePayload[]
) {
  const oldMap = examMap(oldExames ?? []);
  const newMap = examMap(newExames);

  Array.from(newMap.entries()).forEach(([tipo, novo]) => {
    const antigo = oldMap.get(tipo);
    if (!antigo) {
      pushChange(
        changes,
        usuario,
        `incluiu o exame ${tipo} (valor cliente ${formatCurrency(novo.valor)}, custo clínica ${formatCurrency(novo.custo)})`
      );
      return;
    }

    if (normalizeMoneyAmount(antigo.valor) !== normalizeMoneyAmount(novo.valor)) {
      pushChange(
        changes,
        usuario,
        `alterou o valor do exame ${tipo} de ${formatCurrency(antigo.valor)} para ${formatCurrency(novo.valor)}`
      );
    }
  });

  Array.from(oldMap.entries()).forEach(([tipo, antigo]) => {
    if (!newMap.has(tipo)) {
      pushChange(
        changes,
        usuario,
        `removeu o exame ${tipo} (valor cliente ${formatCurrency(antigo.valor)})`
      );
    }
  });
}

export function buildHistoricoCriacao(
  usuario: string
): HistoricoEntryDraft[] {
  return [
    {
      acao: "Criação",
      detalhes: `${usuario} criou o agendamento`,
    },
  ];
}

export function buildHistoricoCancelamento(
  usuario: string,
  motivo?: string
): HistoricoEntryDraft[] {
  const motivoTexto = motivo?.trim()
    ? ` Motivo: ${motivo.trim()}`
    : "";
  return [
    {
      acao: "Cancelamento",
      detalhes: `${usuario} cancelou o agendamento.${motivoTexto}`,
    },
  ];
}

export function buildHistoricoAlteracoes(
  anterior: AgendamentoWithExames,
  novo: AgendamentoInsert,
  novosExames: ExamePayload[],
  usuarioLogado: string
): HistoricoEntryDraft[] {
  const usuario = usuarioLogado;
  const changes: HistoricoEntryDraft[] = [];

  compareField(
    changes,
    usuario,
    "a data",
    anterior.data_agendamento,
    novo.data_agendamento,
    formatDateField
  );
  compareHorarioField(changes, usuario, anterior.horario, novo.horario);
  compareUppercaseField(
    changes,
    usuario,
    "o cliente",
    anterior.cliente_nome,
    novo.cliente_nome
  );
  compareUppercaseField(
    changes,
    usuario,
    "o colaborador",
    anterior.colaborador,
    novo.colaborador
  );
  compareField(
    changes,
    usuario,
    "o CPF do colaborador",
    anterior.colaborador_cpf ?? "",
    novo.colaborador_cpf ?? "",
    formatCpfField
  );

  const oldCargoId = anterior.cargo_id ?? "";
  const newCargoId = novo.cargo_id ?? "";
  if (oldCargoId !== newCargoId) {
    pushChange(
      changes,
      usuario,
      "Cargo alterado e exames recalculados conforme exames obrigatórios do novo cargo."
    );
  } else {
    compareUppercaseField(
      changes,
      usuario,
      "o cargo",
      anterior.cargo_nome ?? "",
      novo.cargo_nome ?? ""
    );
  }

  compareField(changes, usuario, "o ASO", anterior.aso, novo.aso);
  compareUppercaseField(
    changes,
    usuario,
    "a clínica",
    anterior.clinica_nome,
    novo.clinica_nome
  );
  compareField(
    changes,
    usuario,
    "o responsável",
    anterior.responsavel,
    novo.responsavel
  );
  compareObservacaoAgendamento(
    changes,
    usuario,
    anterior.observacoes,
    novo.observacoes
  );
  compareField(
    changes,
    usuario,
    "o status",
    anterior.status,
    novo.status
  );
  compareField(
    changes,
    usuario,
    "o número da matrícula",
    anterior.numero_matricula ?? "",
    novo.numero_matricula ?? ""
  );

  compareBoolWithDate(
    changes,
    usuario,
    "ASO enviado para clínica",
    anterior.aso_enviado_clinica,
    novo.aso_enviado_clinica,
    anterior.data_aso_enviado_clinica,
    novo.data_aso_enviado_clinica,
    "a data do envio do ASO para a clínica"
  );
  compareBoolWithDate(
    changes,
    usuario,
    "ASO assinado",
    anterior.aso_assinado,
    novo.aso_assinado,
    anterior.data_aso_assinado,
    novo.data_aso_assinado,
    "a data do ASO assinado"
  );
  compareBoolWithDate(
    changes,
    usuario,
    "ASO enviado p/ cliente",
    anterior.aso_enviado_cliente,
    novo.aso_enviado_cliente,
    anterior.data_aso_enviado_cliente,
    novo.data_aso_enviado_cliente,
    "a data do envio do ASO para o cliente"
  );
  compareBoolWithDate(
    changes,
    usuario,
    "envio ao e-Social",
    anterior.envio_esocial,
    novo.envio_esocial,
    anterior.data_envio_esocial,
    novo.data_envio_esocial,
    "a data de envio ao e-Social"
  );

  compareExames(
    changes,
    usuario,
    anterior.agendamento_exames,
    novosExames
  );

  return changes;
}

export function buildHistoricoAlteracoesDocumentacao(
  anterior: AgendamentoWithExames,
  novo: AgendamentoDocumentacaoInsert,
  usuarioLogado: string
): HistoricoEntryDraft[] {
  const usuario = usuarioLogado;
  const changes: HistoricoEntryDraft[] = [];

  compareField(
    changes,
    usuario,
    "o número da matrícula",
    anterior.numero_matricula ?? "",
    novo.numero_matricula ?? ""
  );

  compareBoolWithDate(
    changes,
    usuario,
    "ASO enviado para clínica",
    anterior.aso_enviado_clinica,
    novo.aso_enviado_clinica,
    anterior.data_aso_enviado_clinica,
    novo.data_aso_enviado_clinica,
    "a data do envio do ASO para a clínica"
  );
  compareBoolWithDate(
    changes,
    usuario,
    "ASO assinado",
    anterior.aso_assinado,
    novo.aso_assinado,
    anterior.data_aso_assinado,
    novo.data_aso_assinado,
    "a data do ASO assinado"
  );
  compareBoolWithDate(
    changes,
    usuario,
    "ASO enviado p/ cliente",
    anterior.aso_enviado_cliente,
    novo.aso_enviado_cliente,
    anterior.data_aso_enviado_cliente,
    novo.data_aso_enviado_cliente,
    "a data do envio do ASO para o cliente"
  );
  compareBoolWithDate(
    changes,
    usuario,
    "envio ao e-Social",
    anterior.envio_esocial,
    novo.envio_esocial,
    anterior.data_envio_esocial,
    novo.data_envio_esocial,
    "a data de envio ao e-Social"
  );

  compareField(
    changes,
    usuario,
    "o Nº Recibo do e-Social",
    anterior.esocial_recibo ?? "",
    novo.esocial_recibo ?? ""
  );

  compareObservacaoAgendamento(
    changes,
    usuario,
    anterior.observacoes,
    novo.observacoes
  );

  return changes;
}
