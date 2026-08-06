import assert from "node:assert/strict";
import {
  EMPTY_IMPLANTACAO_FILTERS,
  filterImplantacaoProcessos,
  type ImplantacaoProcesso,
} from "../lib/implantacao-clientes";
import type { OrcamentoRecord } from "../lib/orcamento-types";

function processo(
  overrides: Partial<ImplantacaoProcesso> & {
    status?: OrcamentoRecord["status"];
    etapa?: ImplantacaoProcesso["etapaAtual"];
  }
): ImplantacaoProcesso {
  const status = overrides.status ?? "aprovado";
  const etapaAtual = overrides.etapa ?? "contrato";
  return {
    orcamento: {
      id: "1",
      numero: "ORC-1",
      status,
      cliente_nome: "ACME",
      cliente_cnpj: "00",
      responsavel: "Admin",
      origem_cliente: null,
    } as OrcamentoRecord,
    aprovacao: null,
    contrato: null,
    etapaAtual,
    etapasConcluidas: 0,
    totalEtapas: 7,
    progressoLabel: "0 de 7",
    agendamentoLiberado: false,
    agendamentoLabel: "Bloqueado",
    dataAprovacao: "2026-01-01",
    numeroContrato: null,
    ativo: true,
    quantidadeContratada: 0,
    agendamentosRealizados: 0,
    examesProgramadosFuturos: 0,
    asosContratuaisEmAberto: 0,
    agendamentosIniciaisDispensados: false,
    concluidoComExamesFuturos: false,
    fluxoImplantacao: "padrao",
    treinamento: null,
    etapasOperacionais: [
      { id: "contrato", label: "Contrato" },
      { id: "financeiro", label: "Aguardando pagamento" },
      { id: "procuracao", label: "Aguardando procuração" },
      { id: "funcionarios", label: "Lista de funcionários" },
      { id: "logo", label: "Logo da empresa" },
      { id: "visita", label: "Visita técnica" },
      { id: "agendamentos", label: "Agendamentos" },
    ],
    ...overrides,
  };
}

const ativos = [
  processo({ status: "aprovado", etapa: "financeiro" }),
  processo({
    status: "contrato_encerrado",
    etapa: "contrato_encerrado",
  }),
];

// Entrada padrão (Status = Aprovado): ocultar encerrados
assert.equal(EMPTY_IMPLANTACAO_FILTERS.status, "aprovado");
assert.equal(
  filterImplantacaoProcessos(ativos, EMPTY_IMPLANTACAO_FILTERS).length,
  1
);

// Status = Todos → encerrados aparecem
assert.equal(
  filterImplantacaoProcessos(ativos, {
    ...EMPTY_IMPLANTACAO_FILTERS,
    status: "",
  }).length,
  2
);

// Status = Contrato encerrado → só encerrados
const soEncerrado = filterImplantacaoProcessos(ativos, {
  ...EMPTY_IMPLANTACAO_FILTERS,
  status: "contrato_encerrado",
});
assert.equal(soEncerrado.length, 1);
assert.equal(soEncerrado[0].orcamento.status, "contrato_encerrado");

console.log("ok: implantacao-filtro-encerrado");
