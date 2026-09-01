/**
 * Confirmação manual de envio do relatório de Riscos Psicossociais.
 *
 * Grandfather rule: relatórios gerados antes de
 * `RISCOS_RELATORIO_ENVIO_CONFIRMACAO_OBRIGATORIA_DESDE` permanecem
 * concluídos sem confirmação explícita. Regeneração após a ativação exige
 * nova confirmação (gerado_em novo → fora do grandfather).
 *
 * Corte operacional: 01/09/2026 00:00 em São Paulo (UTC-3) =
 * 2026-09-01T03:00:00.000Z.
 */
export const RISCOS_RELATORIO_ENVIO_CONFIRMACAO_OBRIGATORIA_DESDE =
  "2026-09-01T03:00:00.000Z";

export type RiscosRelatorioEnvioInput = {
  relatorioGerado?: boolean;
  relatorioGeradoEm?: string | null;
  relatorioEnviadoEm?: string | null;
};

export function isRelatorioEnvioExplicitamenteConfirmado(
  input: Pick<RiscosRelatorioEnvioInput, "relatorioEnviadoEm">
): boolean {
  return Boolean(String(input.relatorioEnviadoEm ?? "").trim());
}

export function isRelatorioEnvioGrandfatherConcluido(
  input: Pick<RiscosRelatorioEnvioInput, "relatorioGerado" | "relatorioGeradoEm">
): boolean {
  if (!input.relatorioGerado) return false;
  const geradoEm = String(input.relatorioGeradoEm ?? "").trim();
  if (!geradoEm) return false;
  const ts = Date.parse(geradoEm);
  const cutoff = Date.parse(
    RISCOS_RELATORIO_ENVIO_CONFIRMACAO_OBRIGATORIA_DESDE
  );
  return Number.isFinite(ts) && Number.isFinite(cutoff) && ts < cutoff;
}

/** Envio confirmado explicitamente ou via grandfather histórico. */
export function isRelatorioEnvioEfetivamenteConfirmado(
  input: RiscosRelatorioEnvioInput
): boolean {
  if (!input.relatorioGerado) return false;
  if (isRelatorioEnvioExplicitamenteConfirmado(input)) return true;
  return isRelatorioEnvioGrandfatherConcluido(input);
}

/** Relatório liberado ao cliente no Portal (snapshot + envio efetivo). */
export function relatorioLiberadoAoClientePortal(input: {
  temSnapshot: boolean;
  relatorioGeradoEm?: string | null;
  relatorioEnviadoEm?: string | null;
}): boolean {
  if (!input.temSnapshot) return false;
  return isRelatorioEnvioEfetivamenteConfirmado({
    relatorioGerado: true,
    relatorioGeradoEm: input.relatorioGeradoEm,
    relatorioEnviadoEm: input.relatorioEnviadoEm,
  });
}
