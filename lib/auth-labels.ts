export const PERFIL_LABELS: Record<string, string> = {
  admin: "Administrador",
  operacional: "Operacional",
};

export function labelPerfil(perfil: string): string {
  return PERFIL_LABELS[perfil] ?? perfil;
}

export function iniciaisNome(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
