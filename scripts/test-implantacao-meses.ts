/** Smoke: abas mensais da implantação (jul–dez/2026 + extensível). */

import assert from "node:assert/strict";
import {
  filterImplantacaoProcessos,
  filterImplantacaoProcessosPorMes,
  sortImplantacaoProcessosPorDataAprovacao,
  EMPTY_IMPLANTACAO_FILTERS,
  type ImplantacaoProcesso,
} from "../lib/implantacao-clientes";
import {
  formatImplantacaoMesLabel,
  isImplantacaoMesDisponivel,
  listImplantacaoMesAbas,
  processoBelongsToMesAprovacao,
  resolveInitialImplantacaoMes,
  yearMonthFromDataAprovacao,
  yearMonthKey,
} from "../lib/implantacao-meses";
import type { OrcamentoRecord } from "../lib/orcamento-types";

function processo(partial: {
  id: string;
  numero: string;
  dataAprovacao: string | null;
  responsavel?: string;
  etapa?: ImplantacaoProcesso["etapaAtual"];
}): ImplantacaoProcesso {
  return {
    orcamento: {
      id: partial.id,
      numero: partial.numero,
      status: "aprovado",
      cliente_nome: "ACME",
      cliente_cnpj: "00",
      responsavel: partial.responsavel ?? "Admin",
      origem_cliente: null,
    } as OrcamentoRecord,
    aprovacao: null,
    contrato: null,
    etapaAtual: partial.etapa ?? "contrato",
    etapasConcluidas: 0,
    totalEtapas: 7,
    progressoLabel: "0 de 7",
    agendamentoLiberado: false,
    agendamentoLabel: "Bloqueado",
    dataAprovacao: partial.dataAprovacao,
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
  };
}

const abas = listImplantacaoMesAbas();
assert.equal(abas.length, 6);
assert.deepEqual(abas[0], { year: 2026, month: 7 });
assert.deepEqual(abas[5], { year: 2026, month: 12 });
assert.equal(formatImplantacaoMesLabel(abas[0]), "Julho");
assert.equal(formatImplantacaoMesLabel(abas[1]), "Agosto");
assert.equal(yearMonthKey(abas[1]), "2026-08");

// Mês atual em agosto/2026
const agoraAgosto = new Date(2026, 7, 15); // monthIndex 7 = agosto
assert.deepEqual(resolveInitialImplantacaoMes(agoraAgosto), {
  year: 2026,
  month: 8,
});
assert.equal(
  isImplantacaoMesDisponivel({ year: 2026, month: 7 }, agoraAgosto),
  true
);
assert.equal(
  isImplantacaoMesDisponivel({ year: 2026, month: 8 }, agoraAgosto),
  true
);
assert.equal(
  isImplantacaoMesDisponivel({ year: 2026, month: 9 }, agoraAgosto),
  false
);

assert.deepEqual(yearMonthFromDataAprovacao("2026-08-04T18:00:00.000Z"), {
  year: 2026,
  month: 8,
});
assert.equal(
  processoBelongsToMesAprovacao("2026-07-31T12:00:00Z", {
    year: 2026,
    month: 7,
  }),
  true
);
assert.equal(
  processoBelongsToMesAprovacao("2026-08-01T00:00:00Z", {
    year: 2026,
    month: 7,
  }),
  false
);

const base = [
  processo({
    id: "1",
    numero: "ORC-2026-0003",
    dataAprovacao: "2026-08-10T10:00:00Z",
    responsavel: "Bruna",
    etapa: "financeiro",
  }),
  processo({
    id: "2",
    numero: "ORC-2026-0001",
    dataAprovacao: "2026-07-05T10:00:00Z",
    responsavel: "Bruna",
    etapa: "contrato",
  }),
  processo({
    id: "3",
    numero: "ORC-2026-0002",
    dataAprovacao: "2026-08-02T10:00:00Z",
    responsavel: "Ana",
    etapa: "financeiro",
  }),
  processo({
    id: "4",
    numero: "ORC-2026-0004",
    dataAprovacao: "2026-08-02T18:00:00Z",
    responsavel: "Bruna",
    etapa: "financeiro",
  }),
];

const julho = filterImplantacaoProcessosPorMes(base, {
  year: 2026,
  month: 7,
});
assert.equal(julho.length, 1);
assert.equal(julho[0].orcamento.numero, "ORC-2026-0001");

const agosto = sortImplantacaoProcessosPorDataAprovacao(
  filterImplantacaoProcessosPorMes(base, { year: 2026, month: 8 })
);
assert.equal(agosto.length, 3);
assert.deepEqual(
  agosto.map((p) => p.orcamento.numero),
  ["ORC-2026-0002", "ORC-2026-0004", "ORC-2026-0003"]
);

// Combina mês + responsável + etapa
const combinado = sortImplantacaoProcessosPorDataAprovacao(
  filterImplantacaoProcessosPorMes(
    filterImplantacaoProcessos(base, {
      ...EMPTY_IMPLANTACAO_FILTERS,
      responsavel: "Bruna",
      etapa: "financeiro",
    }),
    { year: 2026, month: 8 }
  )
);
assert.equal(combinado.length, 2);
assert.deepEqual(
  combinado.map((p) => p.orcamento.numero),
  ["ORC-2026-0004", "ORC-2026-0003"]
);

const setembroVazio = filterImplantacaoProcessosPorMes(base, {
  year: 2026,
  month: 9,
});
assert.equal(setembroVazio.length, 0);

console.log("ok: implantacao-meses");
