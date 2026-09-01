/** Validação genérica de e-mail (formato simples, sem acoplamento de domínio). */
export function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
