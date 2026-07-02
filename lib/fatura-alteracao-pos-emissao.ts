import type { AgendamentoWithExames, FaturaRecord } from "@/lib/types";

export const FATURA_ALTERACAO_POS_EMISSAO_MSG =
  "Esta fatura possui alteração após emissão. Reemita a fatura para atualizar o PDF.";

export function agendamentoCanceladoPosEmissao(
  agendamento: Pick<AgendamentoWithExames, "status"> | null | undefined
): boolean {
  return agendamento?.status === "cancelado";
}

export function faturaClienteEmitidaPossuiAlteracaoPosEmissao(
  fatura: Pick<FaturaRecord, "tipo" | "status">,
  agendamentosVinculados: Array<
    Pick<AgendamentoWithExames, "status"> | null | undefined
  >
): boolean {
  if (fatura.tipo !== "cliente" || fatura.status !== "emitida") {
    return false;
  }

  return agendamentosVinculados.some((ag) => agendamentoCanceladoPosEmissao(ag));
}
