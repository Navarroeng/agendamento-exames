export const EXAME_DUPLICADO_TOAST =
  "Este exame já foi incluído neste agendamento.";

export const FATURA_DUPLICADA_MSG =
  "Já existe uma fatura emitida ou em rascunho para este cliente neste mês de referência.";

export const FATURA_CLINICA_DUPLICADA_MSG =
  "Já existe uma fatura emitida ou em rascunho para esta clínica neste mês de referência.";

export function normalizarNomeExame(nome: string): string {
  return nome
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function chaveExameDuplicidade(exame: {
  exame_id?: string | null;
  tipo_exame: string;
}): string | null {
  const id = exame.exame_id?.trim();
  if (id) return `id:${id}`;

  const nome = exame.tipo_exame.trim();
  if (!nome) return null;

  return `nome:${normalizarNomeExame(nome)}`;
}

export function verificarDuplicidadeExamesNoFormulario(
  exames: Array<{ exame_id?: string | null; tipo_exame: string }>
): { duplicado: boolean; mensagem?: string } {
  const seen = new Set<string>();

  for (const exame of exames) {
    const key = chaveExameDuplicidade(exame);
    if (!key) continue;
    if (seen.has(key)) {
      return { duplicado: true, mensagem: EXAME_DUPLICADO_TOAST };
    }
    seen.add(key);
  }

  return { duplicado: false };
}

export function assertExamesSemDuplicidade(
  exames: Array<{ exame_id?: string | null; tipo_exame: string }>
): void {
  const result = verificarDuplicidadeExamesNoFormulario(exames);
  if (result.duplicado) {
    throw new Error(result.mensagem ?? EXAME_DUPLICADO_TOAST);
  }
}

export function mesReferenciaIsoFromBR(mesReferencia: string): string | null {
  const trimmed = mesReferencia.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{2})\/(\d{4})$/);
  if (!match) return null;

  return `${match[2]}-${match[1]}`;
}

export function mesReferenciaIsoFromPeriodoInicio(
  periodoInicio: string | null | undefined
): string | null {
  if (!periodoInicio?.trim()) return null;
  const base = periodoInicio.split("T")[0];
  const match = base.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
}
