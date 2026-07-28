import { formatDateIsoToBR } from "@/lib/agendamento-datetime";

export function buildMensagemVisitaTecnica(params: {
  data: string;
  endereco: string;
}): string {
  const data = params.data.trim()
    ? formatDateIsoToBR(params.data.trim())
    : "[DATA]";
  const endereco = params.endereco.trim() || "[ENDEREÇO]";

  return [
    "Olá!",
    "",
    "Confirmamos a visita técnica da Navarro Engenharia.",
    "",
    "📅 Data:",
    data,
    "",
    "📍 Endereço:",
    endereco,
    "",
    "Em caso de qualquer alteração, por favor nos avise.",
    "",
    "Atenciosamente,",
    "",
    "Navarro Engenharia",
  ].join("\n");
}
