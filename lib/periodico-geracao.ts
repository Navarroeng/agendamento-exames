import { cargoGeraAlertaPeriodico } from "@/lib/cargo-periodico";
import { isAsoPontual } from "@/lib/agendamento-aso-pontual";

export type PeriodicoGeracaoBloqueio =
  | "aso_demissional"
  | "aso_pontual"
  | "cumprindo_existente"
  | "sem_periodicidade_alerta"
  | "obrigacao_equivalente"
  | "fora_vigencia_contratual";

export function isAsoDemissional(tipoAso: string | null | undefined): boolean {
  return (tipoAso ?? "").trim().toLocaleLowerCase("pt-BR") === "demissional";
}

/**
 * Tipos de ASO que podem *originar* obrigação periódica (não cumprir).
 * Demissional é bloqueio absoluto. Os demais seguem cargo/contrato.
 */
export const TIPOS_ASO_PODEM_ORIGINAR_PERIODICO = [
  "Admissional",
  "Periódico",
  "Retorno ao Trabalho",
  "Mudança de Função",
] as const;

export function decidirOrigemPeriodicoFuturo(input: {
  tipoAso?: string | null;
  cumprindoPeriodicoExistente: boolean;
  cargoGeraAlerta: boolean;
  proximaDataIso: string;
  contratoDataFim?: string | null;
  jaExisteObrigacaoEquivalente?: boolean;
}): { gerar: boolean; motivo: PeriodicoGeracaoBloqueio | null } {
  if (isAsoDemissional(input.tipoAso)) {
    return { gerar: false, motivo: "aso_demissional" };
  }
  if (isAsoPontual(input.tipoAso)) {
    return { gerar: false, motivo: "aso_pontual" };
  }
  if (input.cumprindoPeriodicoExistente) {
    return { gerar: false, motivo: "cumprindo_existente" };
  }
  if (!input.cargoGeraAlerta) {
    return { gerar: false, motivo: "sem_periodicidade_alerta" };
  }
  if (input.jaExisteObrigacaoEquivalente) {
    return { gerar: false, motivo: "obrigacao_equivalente" };
  }

  const proxima = (input.proximaDataIso ?? "").slice(0, 10);
  const fim = (input.contratoDataFim ?? "").slice(0, 10);
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(proxima) &&
    /^\d{4}-\d{2}-\d{2}$/.test(fim) &&
    proxima > fim
  ) {
    return { gerar: false, motivo: "fora_vigencia_contratual" };
  }

  return { gerar: true, motivo: null };
}

export function cargoPermiteOriginarPeriodico(
  validade: number | null | undefined
): boolean {
  return cargoGeraAlertaPeriodico(validade);
}

export type PeriodicoCascataSuspeito = {
  origemId: string;
  cascataId: string;
  cpf: string;
  dataRealizadaOrigem: string;
  proximaDataOrigem: string;
  dataRealizadaCascata: string;
  proximaDataCascata: string;
};

/**
 * Diagnóstico: ciclo B cuja data_realizada coincide com a próxima data de A
 * (mesmo CPF) — padrão típico de geração em cadeia a partir do cumprimento.
 * Não exclui nem cancela; só lista suspeitos.
 */
export function identificarPeriodicosCascataSuspeitos(
  rows: Array<{
    id: string;
    colaborador_cpf?: string | null;
    data_realizada?: string | null;
    proxima_data?: string | null;
    data_prevista_original?: string | null;
    origem?: string | null;
  }>
): PeriodicoCascataSuspeito[] {
  const byCpf = new Map<string, typeof rows>();
  for (const row of rows) {
    const cpf = (row.colaborador_cpf ?? "").replace(/\D/g, "");
    if (cpf.length !== 11) continue;
    const list = byCpf.get(cpf) ?? [];
    list.push(row);
    byCpf.set(cpf, list);
  }

  const suspeitos: PeriodicoCascataSuspeito[] = [];
  Array.from(byCpf.entries()).forEach(([cpf, list]) => {
    for (const origem of list) {
      const proximaOrigem = String(
        origem.data_prevista_original || origem.proxima_data || ""
      ).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(proximaOrigem)) continue;
      for (const cascata of list) {
        if (cascata.id === origem.id) continue;
        const realizadaCascata = String(cascata.data_realizada ?? "").slice(0, 10);
        if (realizadaCascata !== proximaOrigem) continue;
        const origemImplantacao =
          (cascata.origem ?? "").trim().toLowerCase() === "implantacao_inicial";
        if (origemImplantacao) continue;
        suspeitos.push({
          origemId: origem.id,
          cascataId: cascata.id,
          cpf,
          dataRealizadaOrigem: String(origem.data_realizada ?? "").slice(0, 10),
          proximaDataOrigem: proximaOrigem,
          dataRealizadaCascata: realizadaCascata,
          proximaDataCascata: String(
            cascata.data_prevista_original || cascata.proxima_data || ""
          ).slice(0, 10),
        });
      }
    }
  });
  return suspeitos;
}
