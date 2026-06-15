import { listarAgendamentosComExames } from "@/services/agendamento.service";
import { listarTodosContratos } from "@/services/cliente-contrato.service";
import { listarClientesParaSelect } from "@/services/cliente.service";
import { listarFaturas } from "@/services/fatura-historico.service";
import type {
  AgendamentoWithExames,
  ClienteContratoRecord,
  ClienteRecord,
  FaturaRecord,
} from "@/lib/types";

export interface RelatoriosData {
  agendamentos: AgendamentoWithExames[];
  faturas: FaturaRecord[];
  contratos: ClienteContratoRecord[];
  clientes: ClienteRecord[];
}

export async function carregarDadosRelatorios(): Promise<RelatoriosData> {
  const [agendamentos, faturas, contratos, clientes] = await Promise.all([
    listarAgendamentosComExames(1000),
    listarFaturas(500),
    listarTodosContratos(1000),
    listarClientesParaSelect(),
  ]);

  return { agendamentos, faturas, contratos, clientes };
}
