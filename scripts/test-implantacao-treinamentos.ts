import assert from "node:assert/strict";
import {
  buildOrcamentoEtapas,
  isOrcamentoEtapaLiberada,
} from "../lib/orcamento-etapas";
import {
  buildImplantacaoEtapasOperacionais,
  buildImplantacaoProcesso,
  countImplantacaoEtapasConcluidas,
  resolveImplantacaoEtapaAtual,
} from "../lib/implantacao-clientes";
import {
  buildMensagemConfirmacaoTreinamento,
  validateTreinamentoPayload,
  type ImplantacaoTreinamentoRecord,
} from "../lib/implantacao-treinamento";
import {
  classifyOrcamentoFluxoImplantacao,
  isServicoTreinamentos,
} from "../lib/servico-treinamentos";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoRecord } from "../lib/orcamento-types";

const TREINO_ID = "srv-treinamentos";

assert.equal(
  isServicoTreinamentos(
    { servico_id: TREINO_ID, servico_nome: "Outro" },
    TREINO_ID
  ),
  true
);
assert.equal(
  isServicoTreinamentos(
    { servico_id: "x", servico_nome: "Treinamentos extras" },
    TREINO_ID
  ),
  false,
  "não usar includes / busca parcial"
);
assert.equal(
  isServicoTreinamentos({ servico_nome: "Treinamentos" }, null),
  true
);

assert.equal(
  classifyOrcamentoFluxoImplantacao(
    [{ servico_id: TREINO_ID, servico_nome: "Treinamentos" }],
    TREINO_ID
  ),
  "somente_treinamentos"
);
assert.equal(
  classifyOrcamentoFluxoImplantacao(
    [
      { servico_id: TREINO_ID, servico_nome: "Treinamentos" },
      { servico_id: "pgr", servico_nome: "PGR" },
    ],
    TREINO_ID
  ),
  "combinado"
);
assert.equal(
  classifyOrcamentoFluxoImplantacao(
    [{ servico_id: "pgr", servico_nome: "PGR" }],
    TREINO_ID
  ),
  "padrao"
);

const abasSomente = buildOrcamentoEtapas("somente_treinamentos");
assert.equal(abasSomente.length, 5);
assert.deepEqual(
  abasSomente.map((a) => a.id),
  ["resumo", "aprovado", "contrato", "financeiro", "treinamento"]
);
assert.ok(!abasSomente.some((a) => a.id === "procuracao"));
assert.ok(!abasSomente.some((a) => a.id === "funcionarios"));
assert.ok(!abasSomente.some((a) => a.id === "logo"));
assert.ok(!abasSomente.some((a) => a.id === "visita"));
assert.ok(!abasSomente.some((a) => a.id === "agendamentos"));

const abasCombinado = buildOrcamentoEtapas("combinado");
assert.ok(abasCombinado.some((a) => a.id === "procuracao"));
assert.ok(abasCombinado.some((a) => a.id === "visita"));
assert.ok(abasCombinado.some((a) => a.id === "treinamento"));
assert.ok(abasCombinado.length > 5);

const opsSomente = buildImplantacaoEtapasOperacionais("somente_treinamentos");
assert.equal(opsSomente.length, 3);
assert.deepEqual(
  opsSomente.map((e) => e.id),
  ["contrato", "financeiro", "treinamento"]
);

assert.equal(
  validateTreinamentoPayload({
    data_treinamento: "2026-09-01",
    horario_inicio: "09:00",
    horario_termino: null,
    modalidade: "presencial",
    local_treinamento: null,
    endereco: null,
    link_reuniao: null,
    tipo_nome: "NR-35",
    quantidade_participantes: 10,
    instrutor_responsavel: "Ana",
    contato_empresa: null,
    observacoes: null,
    status: "agendado",
  }),
  "Informe o local ou endereço do treinamento."
);

assert.equal(
  validateTreinamentoPayload({
    data_treinamento: "2026-09-01",
    horario_inicio: "09:00",
    horario_termino: null,
    modalidade: "online",
    local_treinamento: null,
    endereco: null,
    link_reuniao: null,
    tipo_nome: "NR-35",
    quantidade_participantes: null,
    instrutor_responsavel: null,
    contato_empresa: null,
    observacoes: null,
    status: "agendado",
  }),
  "Informe o link da reunião."
);

assert.equal(
  validateTreinamentoPayload({
    data_treinamento: "2026-09-01",
    horario_inicio: "09:00",
    horario_termino: "12:00",
    modalidade: "online",
    local_treinamento: null,
    endereco: null,
    link_reuniao: "https://meet.example",
    tipo_nome: "NR-35",
    quantidade_participantes: null,
    instrutor_responsavel: "Ana",
    contato_empresa: null,
    observacoes: "Levar documento",
    status: "agendado",
  }),
  null
);

const msg = buildMensagemConfirmacaoTreinamento({
  empresa: "Empresa X",
  treino: {
    data_treinamento: "2026-09-01",
    horario_inicio: "09:00",
    horario_termino: "12:00",
    modalidade: "online",
    local_treinamento: null,
    endereco: null,
    link_reuniao: "https://meet.example",
    tipo_nome: "NR-35",
    quantidade_participantes: null,
    instrutor_responsavel: "Ana",
    contato_empresa: null,
    observacoes: "Levar documento",
    status: "agendado",
  },
});
assert.ok(msg.includes("Confirmação de Treinamento"));
assert.ok(msg.includes("Empresa X"));
assert.ok(msg.includes("NR-35"));

function aprovacaoBase(
  overrides: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "a1",
    orcamento_id: "o1",
    quantidade_colaboradores: 5,
    valor_final: 1000,
    quantidade_parcelas: 1,
    valor_parcela: 1000,
    desconto_percentual: 0,
    valor_avista: null,
    condicao_pagamento: "avista",
    condicoes_iguais: true,
    aprovado_em: "2026-01-01",
    aprovado_por: "user",
    contrato_assinado: true,
    contrato_assinado_em: "2026-01-02",
    contrato_salvo_em: "2026-01-02",
    boleto_pago: true,
    boleto_pago_em: "2026-01-03",
    financeiro_salvo_em: "2026-01-03",
    orcamento_aprovacao_itens: [],
    ...overrides,
  } as OrcamentoAprovacaoRecord;
}

const treinoAgendado: ImplantacaoTreinamentoRecord = {
  id: "t1",
  orcamento_id: "o1",
  aprovacao_id: "a1",
  data_treinamento: "2026-09-01",
  horario_inicio: "09:00",
  horario_termino: null,
  modalidade: "online",
  local_treinamento: null,
  endereco: null,
  link_reuniao: "https://x",
  tipo_nome: "NR-35",
  quantidade_participantes: 5,
  instrutor_responsavel: "Ana",
  contato_empresa: null,
  observacoes: null,
  status: "agendado",
  motivo_cancelamento: null,
  motivo_reagendamento: null,
  data_anterior: null,
  horario_inicio_anterior: null,
  horario_termino_anterior: null,
};

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase(), {
    fluxo: "somente_treinamentos",
    treinamento: null,
  }),
  "agendamento_treinamento"
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase(), {
    fluxo: "somente_treinamentos",
    treinamento: treinoAgendado,
  }),
  "treinamento_agendado"
);

assert.equal(
  countImplantacaoEtapasConcluidas(aprovacaoBase(), {
    fluxo: "somente_treinamentos",
    treinamento: treinoAgendado,
    orcamentoAprovado: true,
  }),
  5
);

const orcamento = {
  id: "o1",
  numero: "ORC-1",
  status: "aprovado",
  cliente_nome: "Empresa",
  cliente_cnpj: null,
  responsavel: "User",
  origem_cliente: "indicacao",
} as unknown as OrcamentoRecord;

const processo = buildImplantacaoProcesso({
  orcamento,
  aprovacao: aprovacaoBase(),
  contrato: null,
  fluxoImplantacao: "somente_treinamentos",
  treinamento: treinoAgendado,
});
assert.equal(processo.totalEtapas, 5);
assert.equal(processo.etapasConcluidas, 5);
assert.equal(processo.progressoLabel, "5 de 5");
assert.equal(processo.etapaAtual, "treinamento_agendado");

assert.equal(
  isOrcamentoEtapaLiberada("visita", aprovacaoBase(), true, {
    fluxo: "somente_treinamentos",
  }),
  false
);
assert.equal(
  isOrcamentoEtapaLiberada("treinamento", aprovacaoBase(), true, {
    fluxo: "somente_treinamentos",
  }),
  true
);

// Combinado não aplica fluxo reduzido
const processoCombinado = buildImplantacaoProcesso({
  orcamento,
  aprovacao: aprovacaoBase({
    procuracao_status: "ativa",
    procuracao_salva_em: "2026-01-04",
    funcionarios_lista_path: "x",
    logo_path: "y",
    visita_tecnica_necessaria: false,
    visita_tecnica_salva_em: "2026-01-05",
  }),
  contrato: null,
  fluxoImplantacao: "combinado",
  treinamento: null,
  agendamentosRealizados: 0,
});
assert.ok(processoCombinado.totalEtapas > 5);
assert.ok(
  processoCombinado.etapasOperacionais.some((e) => e.id === "treinamento")
);
assert.ok(
  processoCombinado.etapasOperacionais.some((e) => e.id === "procuracao")
);
assert.equal(processoCombinado.etapaAtual, "aguardando_agendamentos");

assert.equal(
  validateTreinamentoPayload({
    data_treinamento: "2026-09-01",
    horario_inicio: "09:00",
    horario_termino: null,
    modalidade: "presencial",
    local_treinamento: "Sala 1",
    endereco: "Rua A",
    link_reuniao: null,
    tipo_nome: "NR-35",
    quantidade_participantes: null,
    instrutor_responsavel: null,
    contato_empresa: null,
    observacoes: null,
    status: "cancelado",
    motivo_cancelamento: null,
  }),
  "Informe o motivo do cancelamento."
);

console.log("test-implantacao-treinamentos: ok");
