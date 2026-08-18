/**
 * Trava de submissão de agendamento.
 *
 * Impede duas execuções concorrentes de salvamento (duplo clique, modal
 * "Utilizar ASO do contrato" + Salvar, retry). Não aplica regra de negócio
 * do tipo "mesmo CPF + mesma data = bloquear".
 */

export type AgendamentoSaveLock = {
  inFlight: boolean;
  allowReentry: boolean;
};

export function createAgendamentoSaveLock(): AgendamentoSaveLock {
  return { inFlight: false, allowReentry: false };
}

/** Primeira entrada (Salvar) ou reentrada armada (continuar após modal). */
export function tryEnterAgendamentoSave(lock: AgendamentoSaveLock): boolean {
  if (lock.inFlight) {
    if (lock.allowReentry) {
      lock.allowReentry = false;
      return true;
    }
    return false;
  }
  lock.inFlight = true;
  return true;
}

/**
 * Marca o salvamento como em andamento e autoriza exatamente uma reentrada
 * em `executeSave` (ex.: após "Utilizar ASO do contrato").
 */
export function armAgendamentoSaveReentry(lock: AgendamentoSaveLock): boolean {
  if (lock.inFlight) return false;
  lock.inFlight = true;
  lock.allowReentry = true;
  return true;
}

export function exitAgendamentoSave(lock: AgendamentoSaveLock): void {
  lock.inFlight = false;
  lock.allowReentry = false;
}
