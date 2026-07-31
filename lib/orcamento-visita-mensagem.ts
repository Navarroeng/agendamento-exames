import { formatDateIsoToBR, isValidHorario24 } from "@/lib/agendamento-datetime";

const DIAS_SEMANA_PT: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

/** Dia da semana em português a partir de AAAA-MM-DD (meio-dia SP). */
export function diaSemanaVisitaPt(dataIso: string): string {
  const dia = dataIso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return "[DIA DA SEMANA]";
  // Meio-dia evita edge de fuso ao montar Date local.
  const d = new Date(`${dia}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "[DIA DA SEMANA]";
  return DIAS_SEMANA_PT[d.getDay()] ?? "[DIA DA SEMANA]";
}

export function formatHorarioVisitaDisplay(horario: string): string {
  const h = horario.trim();
  if (!h) return "[HORÁRIO]";
  if (isValidHorario24(h)) return h;
  const match = h.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return h;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function buildMensagemVisitaTecnica(params: {
  data: string;
  horario: string;
  endereco: string;
}): string {
  const dataIso = params.data.trim().slice(0, 10);
  const data = dataIso ? formatDateIsoToBR(dataIso) : "[DATA]";
  const diaSemana = dataIso ? diaSemanaVisitaPt(dataIso) : "[DIA DA SEMANA]";
  const horario = formatHorarioVisitaDisplay(params.horario);
  const endereco = params.endereco.trim() || "[ENDEREÇO]";

  return [
    "Confirmação Visita Técnica 👷‍♂️💼✅",
    "",
    `Data - ${data} - ${diaSemana} às ${horario}`,
    "",
    "📍 Endereço:",
    endereco,
    "",
    "Eng. Responsável: Pedro Navarro.",
    "CREA 5069206790.",
    "",
    "Em caso de qualquer alteração, por favor nos avise.",
    "",
    "Navarro Engenharia de Segurança e Medicina Ocupacional 👷‍♂️👩🏻‍⚕️",
    "",
    "navarroeng.com.br",
  ].join("\n");
}
