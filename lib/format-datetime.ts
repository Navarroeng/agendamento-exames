export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCreatedAtBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const data = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${data} às ${hora}`;
}

export function formatHorarioDisplay(horario: string | null | undefined): string {
  if (!horario) return "—";
  if (horario.length === 5) return `${horario}:00`;
  return horario;
}

export function formatAgendamentoId(
  id: string,
  createdAt?: string | null
): string {
  const year = createdAt
    ? new Date(createdAt).getFullYear()
    : new Date().getFullYear();
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `#AGD-${year}-${short}`;
}
