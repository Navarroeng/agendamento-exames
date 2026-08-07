/**
 * Arquitetura de datas de entrada por etapa operacional.
 *
 * Cada página/módulo filtra pelo momento em que o processo ENTROU naquela etapa.
 * Não reutilizar a data do orçamento fora do módulo Orçamentos.
 *
 * | Etapa                    | Campo                              |
 * |--------------------------|------------------------------------|
 * | Orçamentos               | orcamentos.data_proposta           |
 * | Implantação              | orcamento_aprovacoes.aprovado_em   |
 * | Laudos SST               | orcamento_laudos_sst.entrada_em    |
 * | Riscos Psicossociais     | orcamento_riscos_psicossociais.entrada_em |
 * | eSocial                  | agendamentos.esocial_entrada_em    |
 * | Periódicos Futuros       | periodicos_futuros.proxima_data    |
 * | Faturas / Custos         | faturas.mes_referencia             |
 */

import {
  belongsToYearMonth,
  type YearMonth,
} from "@/lib/listagem-meses";

export const ETAPA_ENTRADA_CAMPOS = {
  orcamentos: "data_proposta",
  implantacao: "aprovado_em",
  laudos_sst: "entrada_em",
  riscos_psicossociais: "entrada_em",
  esocial: "esocial_entrada_em",
  periodicos_futuros: "proxima_data",
  faturas: "mes_referencia",
} as const;

export type EtapaOperacionalId = keyof typeof ETAPA_ENTRADA_CAMPOS;

/** Filtra registros cuja data de entrada na etapa pertence ao mês. */
export function filterByEtapaEntradaMes<T>(
  items: T[],
  getEntradaIso: (item: T) => string | null | undefined,
  mes: YearMonth
): T[] {
  return items.filter((item) => belongsToYearMonth(getEntradaIso(item), mes));
}
