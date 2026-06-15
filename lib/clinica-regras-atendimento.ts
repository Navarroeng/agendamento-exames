import { parseDateBRToIso } from "@/lib/agendamento-datetime";
import { isExameClinicoManual } from "@/lib/exame-pricing";
import type { ClinicaJanelaHorario, ClinicaRecord, ClinicaTipoAtendimento, ExameFormItem } from "@/lib/types";

export type { ClinicaTipoAtendimento };

export interface JanelaHorario {
  inicio: string;
  fim: string;
}

export const CLINICA_DIAS_SEMANA = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
] as const;

export const CLINICA_DIA_FORA_MSG =
  "Esta clínica não atende neste dia da semana.";
export const CLINICA_HORARIO_FORA_MSG =
  "Horário fora da janela de atendimento desta clínica.";

export function normalizeHorario(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const parts = value.trim().split(":");
  if (parts.length < 2) return value.trim();
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

export function parseDiasAtendimentoForm(value: string): number[] {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

export function formatDiasAtendimentoForm(days: number[] | null | undefined): string {
  if (!days?.length) return "";
  return [...days].sort((a, b) => a - b).join(",");
}

export function formatDiasAtendimentoLabel(days: number[] | null | undefined): string {
  if (!days?.length) return "Todos os dias";
  const labels = CLINICA_DIAS_SEMANA.filter((item) => days.includes(item.value)).map(
    (item) => item.label
  );
  return labels.join(", ");
}

export function tipoAtendimentoToForm(value: ClinicaTipoAtendimento | null | undefined): string {
  return value === "ordem_chegada" ? "Ordem de chegada" : "Horário agendado";
}

export function tipoAtendimentoFromForm(value: string): ClinicaTipoAtendimento {
  return value === "Ordem de chegada" ? "ordem_chegada" : "horario_agendado";
}

export function isOrdemChegada(
  clinica: Pick<ClinicaRecord, "tipo_atendimento"> | null | undefined
): boolean {
  return clinica?.tipo_atendimento === "ordem_chegada";
}

export function parseJanelasAdicionais(
  value: ClinicaRecord["janelas_adicionais"]
): JanelaHorario[] {
  if (!value) return [];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as ClinicaJanelaHorario;
      const inicio = normalizeHorario(row.inicio);
      const fim = normalizeHorario(row.fim);
      if (!inicio || !fim) return null;
      return { inicio, fim };
    })
    .filter((item): item is JanelaHorario => item !== null);
}

export function janelasAdicionaisToJson(
  inicio: string,
  fim: string
): ClinicaJanelaHorario[] | null {
  const start = normalizeHorario(inicio);
  const end = normalizeHorario(fim);
  if (!start || !end) return null;
  return [{ inicio: start, fim: end }];
}

function horarioToMinutes(value: string): number | null {
  const normalized = normalizeHorario(value);
  const match = normalized.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getDayOfWeekFromDateBR(dateBR: string): number | null {
  const iso = parseDateBRToIso(dateBR);
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function clinicaTemRegrasAtendimento(
  clinica: Pick<
    ClinicaRecord,
    | "tipo_atendimento"
    | "dias_atendimento"
    | "horario_padrao_inicio"
    | "horario_clinico_inicio"
    | "horario_complementar_inicio"
    | "janelas_adicionais"
  > | null | undefined
): boolean {
  if (!clinica) return false;
  return Boolean(
    clinica.dias_atendimento?.length ||
      clinica.horario_padrao_inicio ||
      clinica.horario_clinico_inicio ||
      clinica.horario_complementar_inicio ||
      parseJanelasAdicionais(clinica.janelas_adicionais).length > 0 ||
      clinica.tipo_atendimento === "ordem_chegada"
  );
}

export function agendamentoPossuiComplementares(
  exams: Pick<ExameFormItem, "tipo_exame">[]
): boolean {
  const tipos = exams
    .map((exam) => exam.tipo_exame.trim())
    .filter(Boolean);

  if (tipos.length === 0) return false;

  const naoClinicos = tipos.filter((nome) => !isExameClinicoManual(nome));
  if (naoClinicos.length === 0) return false;

  if (tipos.some(isExameClinicoManual) && naoClinicos.length > 0) return true;
  return naoClinicos.length > 0;
}

export function resolveJanelasAtendimento(
  clinica: Pick<
    ClinicaRecord,
    | "horario_padrao_inicio"
    | "horario_padrao_fim"
    | "horario_clinico_inicio"
    | "horario_clinico_fim"
    | "horario_complementar_inicio"
    | "horario_complementar_fim"
    | "janelas_adicionais"
  >,
  hasComplementar: boolean
): JanelaHorario[] {
  const janelas: JanelaHorario[] = [];

  const pushIfValid = (inicio: string | null | undefined, fim: string | null | undefined) => {
    const start = normalizeHorario(inicio ?? "");
    const end = normalizeHorario(fim ?? "");
    if (start && end) janelas.push({ inicio: start, fim: end });
  };

  if (hasComplementar) {
    pushIfValid(clinica.horario_complementar_inicio, clinica.horario_complementar_fim);
  } else {
    pushIfValid(clinica.horario_clinico_inicio, clinica.horario_clinico_fim);
  }

  if (janelas.length === 0) {
    pushIfValid(clinica.horario_padrao_inicio, clinica.horario_padrao_fim);
  }

  janelas.push(...parseJanelasAdicionais(clinica.janelas_adicionais));

  const unique = new Map<string, JanelaHorario>();
  for (const janela of janelas) {
    unique.set(`${janela.inicio}-${janela.fim}`, janela);
  }

  return Array.from(unique.values());
}

export function formatJanelasHorario(janelas: JanelaHorario[]): string {
  if (janelas.length === 0) return "—";
  return janelas.map((janela) => `das ${janela.inicio} às ${janela.fim}`).join(" · ");
}

export function suggestHorarioInicio(
  clinica: ClinicaRecord | null | undefined,
  hasComplementar: boolean
): string | null {
  const janelas = clinica ? resolveJanelasAtendimento(clinica, hasComplementar) : [];
  return janelas[0]?.inicio ?? null;
}

export function isHorarioDentroJanelas(horario: string, janelas: JanelaHorario[]): boolean {
  if (janelas.length === 0) return true;
  const minutes = horarioToMinutes(horario);
  if (minutes === null) return false;

  return janelas.some((janela) => {
    const start = horarioToMinutes(janela.inicio);
    const end = horarioToMinutes(janela.fim);
    if (start === null || end === null) return false;
    return minutes >= start && minutes <= end;
  });
}

export function validateClinicaAtendimento(input: {
  clinica: ClinicaRecord | null | undefined;
  dataAgendamento: string;
  horario: string;
  exams: Pick<ExameFormItem, "tipo_exame">[];
}): string | null {
  const { clinica, dataAgendamento, horario, exams } = input;
  if (!clinica || !clinicaTemRegrasAtendimento(clinica)) return null;

  if (clinica.dias_atendimento?.length) {
    const weekday = getDayOfWeekFromDateBR(dataAgendamento);
    if (weekday === null || !clinica.dias_atendimento.includes(weekday)) {
      return CLINICA_DIA_FORA_MSG;
    }
  }

  const hasComplementar = agendamentoPossuiComplementares(exams);
  const janelas = resolveJanelasAtendimento(clinica, hasComplementar);
  if (janelas.length > 0 && !isHorarioDentroJanelas(horario, janelas)) {
    return CLINICA_HORARIO_FORA_MSG;
  }

  return null;
}

export function buildClinicaRegrasResumo(
  clinica: ClinicaRecord,
  hasComplementar: boolean
): string[] {
  if (!clinicaTemRegrasAtendimento(clinica)) return [];

  const lines: string[] = [];
  lines.push(
    isOrdemChegada(clinica)
      ? "Tipo de atendimento: Ordem de chegada"
      : "Tipo de atendimento: Horário agendado"
  );

  if (clinica.dias_atendimento?.length) {
    lines.push(`Dias permitidos: ${formatDiasAtendimentoLabel(clinica.dias_atendimento)}`);
  }

  const janelas = resolveJanelasAtendimento(clinica, hasComplementar);
  if (janelas.length > 0) {
    const contexto = hasComplementar
      ? "Janela (Clínico + complementares)"
      : clinica.horario_clinico_inicio
        ? "Janela (somente Clínico)"
        : "Horário de atendimento";
    lines.push(`${contexto}: ${formatJanelasHorario(janelas)}`);
  }

  if (clinica.observacao_operacional?.trim()) {
    lines.push(clinica.observacao_operacional.trim());
  }

  return lines;
}

export function formatHorarioMensagemWhatsApp(input: {
  clinica: ClinicaRecord | null | undefined;
  horario: string;
  exams: Pick<ExameFormItem, "tipo_exame">[];
}): string[] {
  const { clinica, horario, exams } = input;
  if (!clinica || !isOrdemChegada(clinica)) {
    return [`🕥 Horário: ${horario.trim()}`];
  }

  const hasComplementar = agendamentoPossuiComplementares(exams);
  const janelas = resolveJanelasAtendimento(clinica, hasComplementar);

  return [
    "🕥 Atendimento: Por ordem de chegada",
    `⏰ Horário de atendimento: ${formatJanelasHorario(janelas)}`,
  ];
}
