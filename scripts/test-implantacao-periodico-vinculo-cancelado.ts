import assert from "node:assert/strict";
import {
  agendamentoEVinculadoAoContrato,
  agendamentoVisivelNaAbaContrato,
  agruparAgendamentosVigenciaParaExibicao,
  buildContagemContratoComVagas,
  buildContratoAgendamentoContagem,
  isAgendamentoCancelado,
  isAgendamentoSelecionavel,
  resolveClassificacaoAgendamento,
  type ContratoAgendamentoContagem,
} from "../lib/contrato-agendamentos";
import {
  determinarStatusProgramacaoFutura,
  formatMesAnoPrevisto,
  statusExameFuturoImplantacaoClass,
} from "../lib/contrato-programacao-futura";
import {
  computePeriodicoDisplayStatus,
  periodicoDisplayStatusLabel,
} from "../lib/periodicos-futuro";
import type { ContratoVagaRecord } from "../lib/contrato-vagas";
import type { PeriodicoFuturoRecord } from "../lib/types";

console.log("Iniciando testes: Implantação x Periódicos Futuros x Agendamentos Cancelados...");

// ============================================================================
// BLOCO 1 — CASO REAL: NEPPER CONSTRUTORA & Marcos Antônio da Silva
// ============================================================================

const CLIENTE_NEPPER = {
  id: "cli-nepper",
  nome: "NEPPER CONSTRUTORA",
};
const CONTRATO_ID = "ctr-nepper-001";
const CPF_MARCOS = "12345678901";

// 1. Periódico Futuro existente criado na Implantação Inicial
const periodicoInicialMarcos: PeriodicoFuturoRecord = {
  id: "pf-marcos-1",
  agendamento_id: null,
  agendamento_vinculado_id: null,
  cliente_nome: CLIENTE_NEPPER.nome,
  colaborador: "Marcos Antônio da Silva",
  colaborador_cpf: CPF_MARCOS,
  cargo_id: "cargo-pedreiro",
  cargo_nome: "Pedreiro",
  exame_id: null,
  tipo_exame: "Periódico",
  exame_nome: "Exame Clínico",
  data_realizada: null,
  proxima_data: "2026-09-01",
  status: "ativo",
  origem: "implantacao_inicial",
  contrato_id: CONTRATO_ID,
  consome_previsao_contrato: true,
};

// 1.1 Status na Implantação deve ser "Programado"
const statusInicialImplantacao = determinarStatusProgramacaoFutura({
  status: periodicoInicialMarcos.status,
  agendamentoVinculadoId: periodicoInicialMarcos.agendamento_vinculado_id,
  agendamentoStatus: null,
});
assert.equal(statusInicialImplantacao, "Programado", "1. Periódico futuro inicial deve ser Programado na Implantação");

// 1.2 Status na página Periódicos Futuros (com referência em Agosto/2026)
const displayStatusPF1 = computePeriodicoDisplayStatus(periodicoInicialMarcos, "2026-08-01");
assert.equal(displayStatusPF1, "em_dia", "1. Periódico futuro inicial está em dia nos Periódicos Futuros");

// 2. Primeiro agendamento criado sem vínculo ao periódico futuro
const agendamento1SemVinculo = {
  id: "ag-marcos-1",
  contrato_id: null,
  cliente_id: CLIENTE_NEPPER.id,
  cliente_nome: CLIENTE_NEPPER.nome,
  colaborador: "Marcos Antônio da Silva",
  colaborador_cpf: CPF_MARCOS,
  data_agendamento: "2026-09-08",
  status: "agendado",
  aso: "Periódico",
};

// 3. Classificado temporariamente como "Adicional" porque não estava selecionado nem vinculado
const classifAg1Antes = resolveClassificacaoAgendamento({
  status: agendamento1SemVinculo.status,
  selecionado: false,
});
assert.equal(classifAg1Antes, "adicional", "3. Agendamento sem vínculo é inicialmente classificado como Adicional");

// 4. Cancelar esse primeiro agendamento
const agendamento1Cancelado = {
  ...agendamento1SemVinculo,
  status: "cancelado",
};
assert.equal(isAgendamentoCancelado(agendamento1Cancelado.status), true, "4. Cancelamento é detectado");
assert.equal(isAgendamentoSelecionavel(agendamento1Cancelado.status), false, "4. Cancelado não é selecionável");

// 5. Confirmar que cancelado deixa de contar/aparecer como adicional ativo
const classifAg1DepoisCancelado = resolveClassificacaoAgendamento({
  status: agendamento1Cancelado.status,
  selecionado: false,
});
assert.equal(classifAg1DepoisCancelado, "cancelado", "5. Classificação de cancelado é sempre 'cancelado'");

// Não entra na listagem ativa (doContrato nem demais)
const agrupadoComCancelado = agruparAgendamentosVigenciaParaExibicao(
  [{ agendamento: agendamento1Cancelado }],
  { selectedIds: [], dispensado: false }
);
assert.equal(agrupadoComCancelado.doContrato.length, 0, "5. Cancelado não aparece em agendamentos do contrato");
assert.equal(agrupadoComCancelado.demais.length, 0, "5. Cancelado não aparece em Demais agendamentos da vigência (adicionais ativos)");

// 6. Criar novo agendamento (segundo agendamento)
const agendamento2Ativo = {
  id: "ag-marcos-2",
  contrato_id: null,
  cliente_id: CLIENTE_NEPPER.id,
  cliente_nome: CLIENTE_NEPPER.nome,
  colaborador: "Marcos Antônio da Silva",
  colaborador_cpf: CPF_MARCOS,
  data_agendamento: "2026-09-08",
  status: "agendado",
  aso: "Periódico",
};

// 7. Vincular ao periódico futuro existente
const periodicoVinculadoMarcos: PeriodicoFuturoRecord = {
  ...periodicoInicialMarcos,
  status: "reagendado",
  agendamento_vinculado_id: agendamento2Ativo.id,
  data_prevista_original: "2026-09-01",
};

// 8. Periódicos Futuros → "Agendamento criado"
const displayStatusPF2 = computePeriodicoDisplayStatus(periodicoVinculadoMarcos, "2026-08-01");
assert.equal(displayStatusPF2, "reagendado", "8. Periódicos Futuros reconhece status reagendado");
assert.equal(periodicoDisplayStatusLabel(displayStatusPF2), "Agendamento criado", "8. Label nos Periódicos Futuros é 'Agendamento criado'");

// 9. Implantação → periódico passa para "Agendado"
const statusImplantacaoPF2 = determinarStatusProgramacaoFutura({
  status: periodicoVinculadoMarcos.status,
  agendamentoVinculadoId: periodicoVinculadoMarcos.agendamento_vinculado_id,
  agendamentoStatus: agendamento2Ativo.status,
});
assert.equal(statusImplantacaoPF2, "Agendado", "9. Implantação reconhece status Agendado");
assert.equal(statusExameFuturoImplantacaoClass(statusImplantacaoPF2), "text-brand-blue font-semibold");

// 10. Agendamento vinculado é reconhecido como "Contrato" e vai para "Agendamentos do contrato"
const idsPeriodicosDoContrato = new Set([agendamento2Ativo.id]);
const ehVinculadoContrato = agendamentoEVinculadoAoContrato({
  agendamento: agendamento2Ativo,
  contratoId: CONTRATO_ID,
  idsAgendamentoDasVagas: [],
  idsAgendamentoDosPeriodicos: idsPeriodicosDoContrato,
});
assert.equal(ehVinculadoContrato, true, "10. Agendamento ativo vinculado ao periódico do contrato é do contrato");

const visivelAba = agendamentoVisivelNaAbaContrato({
  agendamento: agendamento2Ativo,
  contratoId: CONTRATO_ID,
  idsAgendamentoDasVagas: [],
  idsAgendamentoDosPeriodicos: idsPeriodicosDoContrato,
  cliente: CLIENTE_NEPPER,
});
assert.equal(visivelAba, true, "10. Agendamento permanece visível na aba Agendamentos do contrato");

const classifNovoAgendamento = resolveClassificacaoAgendamento({
  status: agendamento2Ativo.status,
  selecionado: true,
  vinculadoAPeriodicoContrato: true,
});
assert.equal(classifNovoAgendamento, "contrato", "10. Classificação do agendamento vinculado é 'contrato'");

// Agrupamento na tela com ambos os agendamentos (o cancelado e o novo ativo)
const agrupadoMarcosFinal = agruparAgendamentosVigenciaParaExibicao(
  [
    { agendamento: agendamento1Cancelado },
    { agendamento: agendamento2Ativo },
  ],
  { selectedIds: [agendamento2Ativo.id], dispensado: false }
);
assert.equal(agrupadoMarcosFinal.doContrato.length, 1, "10. Apenas o novo agendamento vai para 'Agendamentos do contrato'");
assert.equal(agrupadoMarcosFinal.doContrato[0].agendamento.id, agendamento2Ativo.id);
assert.equal(agrupadoMarcosFinal.demais.length, 0, "10. Nenhum agendamento adicional ativo na lista");

console.log("OK: Caso Marcos Antônio da Silva / NEPPER CONSTRUTORA validado com sucesso.");

// ============================================================================
// BLOCO 2 — CENÁRIOS COMPLEMENTARES
// ============================================================================

// 11. Periódico Programado sem agendamento
const status11 = determinarStatusProgramacaoFutura({
  status: "ativo",
  agendamentoVinculadoId: null,
  agendamentoStatus: null,
});
assert.equal(status11, "Programado", "11. Periódico sem agendamento ativo é Programado");

// 12. Periódico com agendamento ativo
const status12 = determinarStatusProgramacaoFutura({
  status: "reagendado",
  agendamentoVinculadoId: "ag-ativo-qualquer",
  agendamentoStatus: "agendado",
});
assert.equal(status12, "Agendado", "12. Periódico com agendamento ativo é Agendado");

// 13. Agendamento vinculado cancelado → volta a Programado
const status13 = determinarStatusProgramacaoFutura({
  status: "reagendado",
  agendamentoVinculadoId: "ag-cancelado-qualquer",
  agendamentoStatus: "cancelado",
});
assert.equal(status13, "Programado", "13. Periódico com agendamento cancelado volta a Programado");

// 14. Periódico cumprido → Atendido
const status14a = determinarStatusProgramacaoFutura({
  status: "reagendado",
  agendamentoVinculadoId: "ag-cumprido",
  agendamentoStatus: "atendido",
});
assert.equal(status14a, "Atendido", "14a. Agendamento atendido reflete Atendido no periódico");

const status14b = determinarStatusProgramacaoFutura({
  status: "ativo",
  dataRealizada: "2026-09-08",
});
assert.equal(status14b, "Atendido", "14b. dataRealizada preenchida reflete Atendido");

const status14c = determinarStatusProgramacaoFutura({
  status: "reagendado",
  agendamentoVinculadoId: "ag-assinado",
  agendamentoStatus: "agendado",
  agendamentoCumprido: true,
});
assert.equal(status14c, "Atendido", "14c. ASO assinado reflete Atendido");

// 15. Periódico manualmente cancelado
const status15a = determinarStatusProgramacaoFutura({
  status: "cancelado",
});
assert.equal(status15a, "Cancelado", "15a. Status cancelado vira Cancelado");

const status15b = determinarStatusProgramacaoFutura({
  status: "ativo",
  canceladoManualmente: true,
});
assert.equal(status15b, "Cancelado", "15b. Cancelado manualmente vira Cancelado");

// 16. Dois agendamentos: um cancelado e um ativo
const agCancelado = { id: "ag-c", status: "cancelado" };
const agAtivo = { id: "ag-a", status: "agendado" };
const agrupadoMisto = agruparAgendamentosVigenciaParaExibicao(
  [{ agendamento: agCancelado }, { agendamento: agAtivo }],
  { selectedIds: ["ag-a"], dispensado: false }
);
assert.equal(agrupadoMisto.doContrato.length, 1);
assert.equal(agrupadoMisto.doContrato[0].agendamento.id, "ag-a");
assert.equal(agrupadoMisto.demais.length, 0);

// 17. Agendamento adicional legítimo não vinculado
const agAdicionalLegitimo = { id: "ag-extra", status: "agendado" };
const agrupadoAdicional = agruparAgendamentosVigenciaParaExibicao(
  [{ agendamento: agAdicionalLegitimo }],
  { selectedIds: [], dispensado: false }
);
assert.equal(agrupadoAdicional.doContrato.length, 0);
assert.equal(agrupadoAdicional.demais.length, 1);
assert.equal(
  resolveClassificacaoAgendamento({
    status: agAdicionalLegitimo.status,
    selecionado: false,
  }),
  "adicional",
  "17. Agendamento não selecionado permanece Adicional"
);

// 18. Agendamento de contrato legítimo
const agContratoLegitimo = { id: "ag-ctr", status: "agendado" };
const agrupadoContrato = agruparAgendamentosVigenciaParaExibicao(
  [{ agendamento: agContratoLegitimo }],
  { selectedIds: ["ag-ctr"], dispensado: false }
);
assert.equal(agrupadoContrato.doContrato.length, 1);
assert.equal(agrupadoContrato.demais.length, 0);
assert.equal(
  resolveClassificacaoAgendamento({
    status: agContratoLegitimo.status,
    selecionado: true,
  }),
  "contrato",
  "18. Agendamento selecionado é Contrato"
);

// 19. Contagem de vagas do contrato
// Cenário A: Contrato de 5 vagas: 4 admissionais agendadas + 1 periódico programado (antes do agendamento do Marcos)
const vagasAntes: Array<Pick<ContratoVagaRecord, "status" | "agendamento_id" | "colaborador_cpf">> = [
  { status: "agendada", agendamento_id: "ag-1", colaborador_cpf: "111" },
  { status: "agendada", agendamento_id: "ag-2", colaborador_cpf: "222" },
  { status: "agendada", agendamento_id: "ag-3", colaborador_cpf: "333" },
  { status: "agendada", agendamento_id: "ag-4", colaborador_cpf: "444" },
  { status: "programada", agendamento_id: null, colaborador_cpf: CPF_MARCOS },
];

const contagemAntes = buildContagemContratoComVagas({
  quantidadePrevista: 5,
  vagas: vagasAntes,
  utilizadosAg: 4,
  programadosLegado: 1,
  emAbertoLegado: 0,
  vagasComprometidasLegado: 0,
  adicionaisLegado: 0,
  agendamentosValidos: [
    { id: "ag-1", colaborador_cpf: "111" },
    { id: "ag-2", colaborador_cpf: "222" },
    { id: "ag-3", colaborador_cpf: "333" },
    { id: "ag-4", colaborador_cpf: "444" },
  ],
});
assert.equal(contagemAntes.agendados, 4);
assert.equal(contagemAntes.programadosFuturos, 1);
assert.equal(contagemAntes.adicionais, 0);
assert.equal(contagemAntes.pendentesDefinicao, 0);
assert.equal(contagemAntes.comprometidos, 5);

// Cenário B: Após vincular o agendamento do Marcos:
// A vaga programada passa para 'agendada' com agendamento_id do Marcos.
// O agendamento cancelado anterior (ag-marcos-1) NÃO é válido e não ocupa vaga.
const vagasDepois: Array<Pick<ContratoVagaRecord, "status" | "agendamento_id" | "colaborador_cpf">> = [
  { status: "agendada", agendamento_id: "ag-1", colaborador_cpf: "111" },
  { status: "agendada", agendamento_id: "ag-2", colaborador_cpf: "222" },
  { status: "agendada", agendamento_id: "ag-3", colaborador_cpf: "333" },
  { status: "agendada", agendamento_id: "ag-4", colaborador_cpf: "444" },
  { status: "agendada", agendamento_id: agendamento2Ativo.id, colaborador_cpf: CPF_MARCOS },
];

const contagemDepois = buildContagemContratoComVagas({
  quantidadePrevista: 5,
  vagas: vagasDepois,
  utilizadosAg: 5,
  programadosLegado: 0,
  emAbertoLegado: 0,
  vagasComprometidasLegado: 0,
  adicionaisLegado: 0,
  agendamentosValidos: [
    { id: "ag-1", colaborador_cpf: "111" },
    { id: "ag-2", colaborador_cpf: "222" },
    { id: "ag-3", colaborador_cpf: "333" },
    { id: "ag-4", colaborador_cpf: "444" },
    { id: agendamento2Ativo.id, colaborador_cpf: CPF_MARCOS },
  ],
});
assert.equal(contagemDepois.agendados, 5, "19. 5 vagas agendadas");
assert.equal(contagemDepois.programadosFuturos, 0, "19. 0 programados futuros");
assert.equal(contagemDepois.adicionais, 0, "19. Nenhum adicional indevido");
assert.equal(contagemDepois.pendentesDefinicao, 0, "19. 0 pendentes");
assert.equal(contagemDepois.comprometidos, 5, "19. 5 comprometidos (100% preenchido)");

console.log("OK: Todos os 24 cenários de teste passaram com sucesso!");
