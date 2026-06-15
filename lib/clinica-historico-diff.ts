import type { ClinicaInsert, ClinicaRecord } from "@/lib/types";
import {
  formatDiasAtendimentoLabel,
  normalizeHorario,
  tipoAtendimentoToForm,
} from "@/lib/clinica-regras-atendimento";

export interface ClinicaHistoricoEntryDraft {
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

function statusLabel(status: string): string {
  return status === "inativa" ? "Inativa" : "Ativa";
}

function pushChange(
  changes: ClinicaHistoricoEntryDraft[],
  usuario: string,
  message: string
) {
  changes.push({
    acao: "Alteração",
    detalhes: `${usuario} ${message}`,
  });
}

function compareField(
  changes: ClinicaHistoricoEntryDraft[],
  usuario: string,
  label: string,
  oldValue: string | null | undefined,
  newValue: string | null | undefined
) {
  const oldFormatted = displayValue(oldValue);
  const newFormatted = displayValue(newValue);
  if (oldFormatted === newFormatted) return;

  if (oldFormatted === "—" && newFormatted !== "—") {
    pushChange(changes, usuario, `incluiu ${label}: ${newFormatted}`);
    return;
  }

  if (oldFormatted !== "—" && newFormatted === "—") {
    pushChange(changes, usuario, `removeu ${label} (era ${oldFormatted})`);
    return;
  }

  pushChange(
    changes,
    usuario,
    `alterou ${label} de ${oldFormatted} para ${newFormatted}`
  );
}

function compareBoolField(
  changes: ClinicaHistoricoEntryDraft[],
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

const CONTATO_FIELDS: { key: keyof ClinicaInsert; label: string }[] = [
  { key: "responsavel", label: "responsável" },
  { key: "telefone", label: "telefone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "e-mail" },
  { key: "site", label: "site" },
];

const FINANCEIRO_FIELDS: { key: keyof ClinicaInsert; label: string }[] = [
  { key: "forma_pagamento", label: "forma de pagamento" },
  { key: "prazo_pagamento", label: "prazo de pagamento" },
  { key: "observacoes_financeiras", label: "observações financeiras" },
];

export function buildHistoricoCriacaoClinica(
  usuario: string
): ClinicaHistoricoEntryDraft[] {
  return [
    {
      acao: "Criação",
      detalhes: `${usuario} cadastrou a clínica.`,
    },
  ];
}

export function buildHistoricoStatusClinica(
  usuario: string,
  novoStatus: "ativa" | "inativa"
): ClinicaHistoricoEntryDraft[] {
  const acao = novoStatus === "inativa" ? "Desativação" : "Ativação";
  const detalhes =
    novoStatus === "inativa"
      ? `${usuario} desativou a clínica.`
      : `${usuario} reativou a clínica.`;
  return [{ acao, detalhes }];
}

export function buildHistoricoAlteracoesClinica(
  anterior: ClinicaRecord,
  novo: ClinicaInsert,
  usuario: string
): ClinicaHistoricoEntryDraft[] {
  const changes: ClinicaHistoricoEntryDraft[] = [];

  if (anterior.status !== novo.status) {
    pushChange(
      changes,
      usuario,
      `alterou status de ${statusLabel(anterior.status)} para ${statusLabel(novo.status)}`
    );
  }

  const mainFields: { key: keyof ClinicaInsert; label: string }[] = [
    { key: "razao_social", label: "razão social" },
    { key: "nome_fantasia", label: "nome fantasia" },
    { key: "cnpj", label: "CNPJ" },
    { key: "cidade", label: "cidade" },
    { key: "estado", label: "estado" },
    { key: "cep", label: "CEP" },
    { key: "rua", label: "rua" },
    { key: "numero", label: "número" },
    { key: "bairro", label: "bairro" },
    { key: "horario_atendimento", label: "horário de atendimento" },
    { key: "exames_atendidos", label: "exames atendidos" },
    { key: "observacoes", label: "observações gerais" },
  ];

  mainFields.forEach(({ key, label }) => {
    compareField(
      changes,
      usuario,
      label,
      anterior[key] as string | null,
      novo[key] as string | null
    );
  });

  CONTATO_FIELDS.forEach(({ key, label }) => {
    compareField(
      changes,
      usuario,
      label,
      anterior[key] as string | null,
      novo[key] as string | null
    );
  });

  FINANCEIRO_FIELDS.forEach(({ key, label }) => {
    compareField(
      changes,
      usuario,
      label,
      anterior[key] as string | null,
      novo[key] as string | null
    );
  });

  compareBoolField(
    changes,
    usuario,
    "possui coleta",
    anterior.possui_coleta,
    novo.possui_coleta
  );
  compareBoolField(
    changes,
    usuario,
    "possui sistema online",
    anterior.possui_sistema_online,
    novo.possui_sistema_online
  );

  compareField(
    changes,
    usuario,
    "tipo de atendimento",
    tipoAtendimentoToForm(anterior.tipo_atendimento),
    tipoAtendimentoToForm(novo.tipo_atendimento)
  );
  compareField(
    changes,
    usuario,
    "dias permitidos de atendimento",
    formatDiasAtendimentoLabel(anterior.dias_atendimento),
    formatDiasAtendimentoLabel(novo.dias_atendimento)
  );
  compareField(
    changes,
    usuario,
    "horário padrão",
    `${normalizeHorario(anterior.horario_padrao_inicio) || "—"} às ${normalizeHorario(anterior.horario_padrao_fim) || "—"}`,
    `${normalizeHorario(novo.horario_padrao_inicio) || "—"} às ${normalizeHorario(novo.horario_padrao_fim) || "—"}`
  );
  compareField(
    changes,
    usuario,
    "horário clínico",
    `${normalizeHorario(anterior.horario_clinico_inicio) || "—"} às ${normalizeHorario(anterior.horario_clinico_fim) || "—"}`,
    `${normalizeHorario(novo.horario_clinico_inicio) || "—"} às ${normalizeHorario(novo.horario_clinico_fim) || "—"}`
  );
  compareField(
    changes,
    usuario,
    "horário clínico + complementares",
    `${normalizeHorario(anterior.horario_complementar_inicio) || "—"} às ${normalizeHorario(anterior.horario_complementar_fim) || "—"}`,
    `${normalizeHorario(novo.horario_complementar_inicio) || "—"} às ${normalizeHorario(novo.horario_complementar_fim) || "—"}`
  );
  compareField(
    changes,
    usuario,
    "observação operacional",
    anterior.observacao_operacional,
    novo.observacao_operacional
  );

  return changes;
}
