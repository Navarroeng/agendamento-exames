/**
 * Visão geral da Home do Portal — composição de apresentação.
 * Não cria fonte de dados nem altera regras dos módulos.
 */

import type { PortalAgendamentosResumo } from "@/lib/portal-agendamentos";
import type { PortalColaboradoresResumo } from "@/lib/portal-colaboradores";
import type { PortalContratoResumo } from "@/lib/portal-contrato";
import type { PortalFaturasResumo } from "@/lib/portal-faturas";
import type { PortalLaudosSstResumo } from "@/lib/portal-laudos-sst";

export type PortalVisaoGeralTone = "ok" | "atencao" | "bloqueio" | "neutro";

export type PortalVisaoGeralPendencia = {
  id: string;
  label: string;
  tone: PortalVisaoGeralTone;
};

export type PortalVisaoGeralIndicador = {
  id: string;
  label: string;
};

export type PortalVisaoGeral = {
  temPendencias: boolean;
  titulo: string;
  descricao: string;
  pendencias: PortalVisaoGeralPendencia[];
  indicadores: PortalVisaoGeralIndicador[];
};

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

/**
 * Pendências reais já representadas no Portal.
 * Ausência de fatura/agendamento/laudo NÃO é pendência.
 */
export function montarPortalVisaoGeral(input: {
  contrato: PortalContratoResumo;
  faturas: PortalFaturasResumo | null;
  agendamentos: PortalAgendamentosResumo | null;
  laudos: PortalLaudosSstResumo | null;
  colaboradores: PortalColaboradoresResumo | null;
}): PortalVisaoGeral {
  const pendencias: PortalVisaoGeralPendencia[] = [];

  const vencidas = input.faturas?.totalVencidas ?? 0;
  if (vencidas > 0) {
    pendencias.push({
      id: "fatura-vencida",
      label: `${vencidas} ${plural(vencidas, "fatura vencida", "faturas vencidas")}`,
      tone: "bloqueio",
    });
  }

  if (input.contrato.procuracaoTone === "pendente") {
    pendencias.push({
      id: "procuracao",
      label: "Procuração pendente",
      tone: "atencao",
    });
  }

  if (input.contrato.agendamentoLabel === "Não liberado") {
    pendencias.push({
      id: "agendamento",
      label: "Agendamento não liberado",
      tone:
        input.contrato.agendamentoTone === "bloqueio" ? "bloqueio" : "atencao",
    });
  }

  const indicadores: PortalVisaoGeralIndicador[] = [];

  if (!input.faturas || (vencidas === 0 && input.faturas.totalEmAberto === 0)) {
    indicadores.push({
      id: "faturas",
      label: "Nenhuma fatura pendente",
    });
  } else if (vencidas === 0 && input.faturas.totalEmAberto > 0) {
    indicadores.push({
      id: "faturas",
      label: `${input.faturas.totalEmAberto} ${plural(
        input.faturas.totalEmAberto,
        "fatura em aberto",
        "faturas em aberto"
      )}`,
    });
  }

  if (!input.agendamentos || input.agendamentos.totalProximos === 0) {
    indicadores.push({
      id: "agendamentos",
      label: "Nenhum agendamento futuro",
    });
  } else {
    indicadores.push({
      id: "agendamentos",
      label: `${input.agendamentos.totalProximos} ${plural(
        input.agendamentos.totalProximos,
        "agendamento futuro",
        "agendamentos futuros"
      )}`,
    });
  }

  if (!input.laudos || !input.laudos.temDocumentos) {
    indicadores.push({
      id: "laudos",
      label: "Nenhum documento disponível",
    });
  } else {
    indicadores.push({
      id: "laudos",
      label: input.laudos.linhaResumo,
    });
  }

  if (!input.colaboradores || input.colaboradores.totalAtivos === 0) {
    indicadores.push({
      id: "colaboradores",
      label: "Nenhum colaborador ativo",
    });
  } else {
    indicadores.push({
      id: "colaboradores",
      label: input.colaboradores.linhaResumo,
    });
  }

  const n = pendencias.length;
  if (n === 0) {
    return {
      temPendencias: false,
      titulo: "Tudo certo com sua empresa",
      descricao:
        "No momento, não há pendências. Continue acompanhando seus serviços de SST.",
      pendencias,
      indicadores,
    };
  }

  return {
    temPendencias: true,
    titulo:
      n === 1
        ? "1 item precisa da sua atenção"
        : `${n} itens precisam da sua atenção`,
    descricao: "",
    pendencias,
    indicadores,
  };
}
