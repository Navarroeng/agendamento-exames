import { listarAgendamentosComExames } from "@/services/agendamento.service";
import { listarTodosContratos } from "@/services/cliente-contrato.service";
import { listarClientesParaSelect } from "@/services/cliente.service";
import { listarFaturas } from "@/services/fatura-historico.service";
import { listarAgendamentosParaFatura } from "@/services/fatura.service";
import type {
  AgendamentoWithExames,
  ClienteContratoRecord,
  ClienteRecord,
  FaturaRecord,
} from "@/lib/types";

export interface RelatoriosData {
  agendamentos: AgendamentoWithExames[];
  /** Mesma base da página Custos Clínicas (`listarAgendamentosParaFatura`). */
  agendamentosCustosClinicas: AgendamentoWithExames[];
  faturas: FaturaRecord[];
  contratos: ClienteContratoRecord[];
  clientes: ClienteRecord[];
}

export async function carregarDadosRelatorios(): Promise<RelatoriosData> {
  const [agendamentos, agendamentosCustosClinicas, faturas, contratos, clientes] =
    await Promise.all([
      listarAgendamentosComExames(1000),
      listarAgendamentosParaFatura(),
      listarFaturas(500),
      listarTodosContratos(1000),
      listarClientesParaSelect(),
    ]);

  return {
    agendamentos,
    agendamentosCustosClinicas,
    faturas,
    contratos,
    clientes,
  };
}
