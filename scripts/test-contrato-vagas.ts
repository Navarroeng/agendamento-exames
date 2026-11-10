/** Smoke: vagas contratuais — estados, CPF e drafts. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  agendamentoOcupaVagaPrevista,
  buildVagaDraftsIniciais,
  contarCardsPorVagasContrato,
  contarVagasComprometidas,
  CONTRATO_VAGA_STATUS_DESLIGADO_ADMIN,
  CONTRATO_VAGA_STATUS_LABELS_CLASSIFICACAO,
  cpfVagaIguais,
  deveUsarVagasComoFonteDosCards,
  draftAposRemoverFuncionario,
  emptyVagaDraft,
  escolherAgendamentoValidoParaVaga,
  isClassificacaoVagasContratoCompleta,
  isNomeFuncionarioReal,
  isVagaAgendamentoResolvida,
  labelColaboradorOuVaga,
  resolverDadosExibicaoVagaContrato,
  resolveStatusVagaRascunho,
  statusClassificacaoVaga,
  planoCorrecaoCargoVagaOcupada,
  planoCorrecaoNomeVagaProgramada,
  selecionarIdsCopiaCargoOperacional,
  selecionarIdsCopiaNomeProgramacao,
  vagaClassificacaoBloqueiaEdicaoOcupante,
  vagaPermiteCorrigirCargoOcupante,
  vagaPermiteCorrigirNomeOcupante,
  vagaPrecisaReconciliarAgendamento,
  validarDraftsListaVagas,
  vagaPermiteAcoesOperacionaisAgendamento,
  vagaPermiteRemoverFuncionario,
  vagaStatusBloqueiaEdicao,
  type ContratoVagaDraft,
  type ContratoVagaRecord,
} from "../lib/contrato-vagas";
import {
  buildContagemContratoComVagas,
  buildContratoAgendamentoContagem,
} from "../lib/contrato-agendamentos";
import { resolveStatusListaFuncionarioPreview } from "../lib/contrato-vagas-lista";
import {
  aplicarImportacaoNasVagas,
  escolherAbaListaFuncionarios,
  gerarModeloListaFuncionariosXlsx,
  mensagemColunasEsperadasListaFuncionarios,
  mensagemExcessoVagasListaFuncionarios,
  nomeArquivoModeloListaFuncionarios,
  parsePlanilhaListaFuncionarios,
  resumirErrosImportacaoListaFuncionarios,
} from "../lib/contrato-vagas-import";
import { isValidCPF, normalizarCpfDeCelulaExcel } from "../lib/cpf";
import * as XLSX from "xlsx";
import { resolverProximoAvisoBeneficio } from "../lib/agendamento-beneficios-contratuais";
import {
  isAgendamentosEtapaConcluida,
  isFuncionariosEtapaConcluida,
} from "../lib/orcamento-etapas";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";

assert.equal(isNomeFuncionarioReal("Natália Porfírio"), true);
assert.equal(isNomeFuncionarioReal("A DEFINIR"), false);
assert.equal(isNomeFuncionarioReal("a definir"), false);
assert.equal(isNomeFuncionarioReal(""), false);
assert.equal(isNomeFuncionarioReal("  "), false);

assert.equal(
  resolveStatusVagaRascunho({
    colaborador: "Natália Porfírio",
    colaboradorCpf: "529.982.247-25",
    manterAsoAberto: false,
  }),
  "comprometida"
);
assert.equal(
  resolveStatusVagaRascunho({
    colaborador: "",
    colaboradorCpf: "",
    manterAsoAberto: true,
  }),
  "aso_aberto"
);
assert.equal(
  resolveStatusVagaRascunho({
    colaborador: "",
    colaboradorCpf: "",
    manterAsoAberto: false,
  }),
  "aberta"
);
assert.equal(
  resolveStatusVagaRascunho({
    statusAtual: "agendada",
    colaborador: "X",
    colaboradorCpf: "529.982.247-25",
    manterAsoAberto: true,
  }),
  "agendada"
);

assert.equal(vagaStatusBloqueiaEdicao("agendada"), true);
assert.equal(vagaStatusBloqueiaEdicao("comprometida"), false);
assert.equal(vagaStatusBloqueiaEdicao("programada"), true);

assert.equal(
  vagaPermiteRemoverFuncionario({
    status: "comprometida",
    agendamento_id: null,
    periodico_futuro_id: null,
  }),
  true
);
assert.equal(
  vagaPermiteRemoverFuncionario({ status: "agendada", agendamento_id: "ag-1" }),
  false
);
assert.equal(
  vagaPermiteRemoverFuncionario({
    status: "programada",
    periodico_futuro_id: "pf-1",
  }),
  false
);
assert.equal(
  vagaPermiteRemoverFuncionario({
    status: "comprometida",
    agendamento_id: "ag-1",
  }),
  false
);
assert.equal(
  vagaPermiteRemoverFuncionario({ status: "aberta" }),
  false
);
assert.equal(
  vagaPermiteRemoverFuncionario({ status: "aso_aberto" }),
  false
);

const draftLimpo = draftAposRemoverFuncionario({
  id: "vaga-2",
  indice: 2,
});
assert.equal(draftLimpo.id, "vaga-2");
assert.equal(draftLimpo.indice, 2);
assert.equal(draftLimpo.colaborador, "");
assert.equal(draftLimpo.colaboradorCpf, "");
assert.equal(draftLimpo.cargoNome, "");
assert.equal(draftLimpo.cargoId, null);
assert.equal(draftLimpo.manterAsoAberto, false);

const drafts2: ContratoVagaDraft[] = [
  {
    id: null,
    indice: 1,
    colaborador: "Natália Porfírio",
    colaboradorCpf: "529.982.247-25",
    cargoId: null,
    cargoNome: "Cozinheira",
    manterAsoAberto: false,
  },
  {
    id: null,
    indice: 2,
    colaborador: "",
    colaboradorCpf: "",
    cargoId: null,
    cargoNome: "",
    manterAsoAberto: true,
  },
];
assert.equal(validarDraftsListaVagas(drafts2, 2), null);

const dup = [
  drafts2[0],
  { ...drafts2[0], indice: 2, manterAsoAberto: false },
];
assert.match(validarDraftsListaVagas(dup, 2) ?? "", /mais de uma vaga/);

assert.match(
  validarDraftsListaVagas(
    [
      drafts2[0],
      { ...drafts2[0], indice: 2, colaboradorCpf: "111.111.111-11" },
      { ...emptyVagaDraft(3), colaborador: "Terceiro", colaboradorCpf: "390.533.447-05" },
    ],
    2
  ) ?? "",
  /mais funcionários/
);

const existentes: ContratoVagaRecord[] = [
  {
    id: "v1",
    contrato_id: "c1",
    orcamento_id: "o1",
    indice: 1,
    colaborador: "Natália Porfírio",
    colaborador_cpf: "52998224725",
    cargo_id: null,
    cargo_nome: "Cozinheira",
    status: "comprometida",
    credito_aso_id: null,
    agendamento_id: null,
    periodico_futuro_id: null,
    created_at: "",
    updated_at: "",
  },
];
const iniciais = buildVagaDraftsIniciais(2, existentes);
assert.equal(iniciais.length, 2);
assert.equal(iniciais[0].colaborador, "Natália Porfírio");
assert.equal(iniciais[1].colaborador, "");
assert.equal(contarVagasComprometidas(existentes), 1);
assert.equal(labelColaboradorOuVaga({ indice: 2, colaborador: "", status: "aso_aberto" }), "Vaga 2");

function vagaCard(
  status: ContratoVagaRecord["status"],
  extra: Partial<ContratoVagaRecord> = {}
): ContratoVagaRecord {
  return {
    id: extra.id ?? `v-${status}-${extra.indice ?? 1}`,
    contrato_id: "c1",
    orcamento_id: "o1",
    indice: extra.indice ?? 1,
    colaborador: extra.colaborador ?? null,
    colaborador_cpf: extra.colaborador_cpf ?? null,
    cargo_id: null,
    cargo_nome: null,
    status,
    credito_aso_id: extra.credito_aso_id ?? null,
    agendamento_id: extra.agendamento_id ?? null,
    periodico_futuro_id: extra.periodico_futuro_id ?? null,
    created_at: "",
    updated_at: "",
  };
}

assert.equal(
  deveUsarVagasComoFonteDosCards([vagaCard("aberta"), vagaCard("aberta", { indice: 2 })]),
  false
);
assert.equal(
  deveUsarVagasComoFonteDosCards([
    vagaCard("agendada", { agendamento_id: "ag-1" }),
    vagaCard("aso_aberto", { indice: 2 }),
  ]),
  true
);

const casoAtual = contarCardsPorVagasContrato(
  [
    vagaCard("agendada", {
      colaborador: "NATÁLIA PORFÍRIO BATISTA",
      colaborador_cpf: "52998224725",
      agendamento_id: "ag-natalia",
    }),
    vagaCard("aso_aberto", { indice: 2 }),
  ],
  2
);
assert.equal(casoAtual.agendados, 1);
assert.equal(casoAtual.emAberto, 1);
assert.equal(casoAtual.programadosFuturos, 0);
assert.equal(casoAtual.vagasComprometidas, 0);
assert.equal(casoAtual.pendentesDefinicao, 0);

const cardsAtual = buildContagemContratoComVagas({
  quantidadePrevista: 2,
  vagas: [
    vagaCard("agendada", {
      colaborador_cpf: "52998224725",
      agendamento_id: "ag-natalia",
    }),
    vagaCard("aso_aberto", { indice: 2 }),
  ],
  utilizadosAg: 0,
  programadosLegado: 0,
  emAbertoLegado: 1,
  vagasComprometidasLegado: 0,
  adicionaisLegado: 1,
  agendamentosValidos: [
    { id: "ag-natalia", colaborador_cpf: "52998224725" },
  ],
});
assert.equal(cardsAtual.agendados, 1);
assert.equal(cardsAtual.emAberto, 1);
assert.equal(cardsAtual.pendentesDefinicao, 0);
assert.equal(cardsAtual.vagasComprometidas, 0);
assert.equal(cardsAtual.adicionais, 0);
assert.equal(cardsAtual.percentual, 100);
assert.equal(
  cardsAtual.agendados +
    cardsAtual.programadosFuturos +
    cardsAtual.emAberto +
    cardsAtual.vagasComprometidas +
    cardsAtual.pendentesDefinicao,
  2
);

const caso2 = contarCardsPorVagasContrato(
  [vagaCard("comprometida"), vagaCard("aso_aberto", { indice: 2 })],
  2
);
assert.equal(caso2.vagasComprometidas, 1);
assert.equal(caso2.emAberto, 1);
assert.equal(caso2.pendentesDefinicao, 0);
const caso2Contagem = buildContratoAgendamentoContagem(2, 1, 0, caso2);
assert.equal(caso2Contagem.percentual, 50);
assert.equal(caso2Contagem.concluido, false);
assert.match(
  caso2Contagem.mensagemComplemento ?? "",
  /1 vaga comprometida ainda pendente/
);

const jFerreiraCards = contarCardsPorVagasContrato(
  [
    vagaCard("aso_aberto"),
    vagaCard("comprometida", { indice: 2 }),
    vagaCard("programada", { indice: 3 }),
  ],
  3
);
assert.equal(jFerreiraCards.agendados, 0);
assert.equal(jFerreiraCards.programadosFuturos, 1);
assert.equal(jFerreiraCards.emAberto, 1);
assert.equal(jFerreiraCards.vagasComprometidas, 1);
assert.equal(jFerreiraCards.pendentesDefinicao, 0);
const jFerreiraContagem = buildContratoAgendamentoContagem(3, 2, 0, jFerreiraCards);
assert.equal(jFerreiraContagem.percentual, 67);
assert.equal(jFerreiraContagem.concluido, false);
assert.equal(
  jFerreiraContagem.mensagem,
  "A quantidade prevista do contrato foi totalmente classificada."
);
assert.match(
  jFerreiraContagem.mensagemComplemento ?? "",
  /1 vaga comprometida ainda pendente/
);

const caso3 = contarCardsPorVagasContrato(
  [vagaCard("agendada"), vagaCard("aberta", { indice: 2 })],
  2
);
assert.equal(caso3.agendados, 1);
assert.equal(caso3.pendentesDefinicao, 1);

const caso4 = contarCardsPorVagasContrato(
  [
    vagaCard("agendada"),
    vagaCard("programada", { indice: 2 }),
    vagaCard("aso_aberto", { indice: 3 }),
  ],
  3
);
assert.equal(caso4.pendentesDefinicao, 0);
assert.equal(caso4.agendados + caso4.programadosFuturos + caso4.emAberto, 3);

const caso5 = contarCardsPorVagasContrato(
  [vagaCard("comprometida"), vagaCard("aberta", { indice: 2 })],
  2
);
assert.equal(caso5.agendados, 0);
assert.equal(caso5.vagasComprometidas, 1);
assert.equal(caso5.pendentesDefinicao, 1);

assert.equal(
  agendamentoOcupaVagaPrevista(
    { id: "ag-natalia", colaborador_cpf: "529.982.247-25" },
    [vagaCard("agendada", { colaborador_cpf: "52998224725", agendamento_id: "ag-natalia" })]
  ),
  true
);

const caso = buildContratoAgendamentoContagem(2, 1, 0, {
  agendados: 0,
  programadosFuturos: 0,
  emAberto: 1,
  vagasComprometidas: 1,
});
assert.equal(caso.previstos, 2);
assert.equal(caso.agendados, 0);
assert.equal(caso.emAberto, 1);
assert.equal(caso.vagasComprometidas, 1);
assert.equal(caso.pendentesDefinicao, 0);
assert.equal(caso.comprometidos, 2);
assert.equal(caso.percentual, 50);
assert.equal(caso.concluido, false);
assert.match(
  caso.mensagemComplemento ?? "",
  /1 vaga comprometida ainda pendente/
);

const nataliaAgendadaMaisAso = buildContratoAgendamentoContagem(2, 2, 0, {
  agendados: 1,
  programadosFuturos: 0,
  emAberto: 1,
  vagasComprometidas: 0,
});
assert.equal(nataliaAgendadaMaisAso.previstos, 2);
assert.equal(nataliaAgendadaMaisAso.agendados, 1);
assert.equal(nataliaAgendadaMaisAso.emAberto, 1);
assert.equal(nataliaAgendadaMaisAso.vagasComprometidas, 0);
assert.equal(nataliaAgendadaMaisAso.pendentesDefinicao, 0);
assert.equal(nataliaAgendadaMaisAso.concluido, true);
assert.equal(
  isClassificacaoVagasContratoCompleta({
    previstos: 2,
    pendentesDefinicao: 0,
    vagasComprometidas: 0,
  }),
  true
);
assert.equal(
  isClassificacaoVagasContratoCompleta({
    previstos: 2,
    pendentesDefinicao: 0,
    vagasComprometidas: 1,
  }),
  false
);
assert.equal(
  isClassificacaoVagasContratoCompleta({
    previstos: 2,
    pendentesDefinicao: 1,
    vagasComprometidas: 0,
  }),
  false
);

// 4 Comprometidos → classificado, mas NÃO concluído
const quatroComprometidos = buildContratoAgendamentoContagem(4, 0, 0, {
  agendados: 0,
  programadosFuturos: 0,
  emAberto: 0,
  vagasComprometidas: 4,
});
assert.equal(quatroComprometidos.pendentesDefinicao, 0);
assert.equal(quatroComprometidos.vagasComprometidas, 4);
assert.equal(quatroComprometidos.concluido, false);
assert.match(
  quatroComprometidos.mensagemComplemento ?? "",
  /4 vagas comprometidas ainda pendentes/
);

const vagaNatalia = existentes[0];
assert.equal(cpfVagaIguais("529.982.247-25", "52998224725"), true);
assert.equal(
  escolherAgendamentoValidoParaVaga({
    vaga: vagaNatalia,
    agendamentos: [
      {
        id: "ag-cancelado",
        status: "cancelado",
        colaborador_cpf: "52998224725",
        contrato_id: "c1",
        cliente_id: "cli-1",
        data_agendamento: "2026-01-10",
      },
      {
        id: "ag-valido",
        status: "agendado",
        colaborador_cpf: "529.982.247-25",
        contrato_id: null,
        cliente_id: "cli-1",
        data_agendamento: "2026-04-20",
      },
    ],
    contratoClienteId: "cli-1",
    vigenciaInicio: "2026-01-01",
    vigenciaFim: "2026-12-31",
  }),
  "ag-valido"
);
assert.equal(
  escolherAgendamentoValidoParaVaga({
    vaga: vagaNatalia,
    agendamentos: [
      {
        id: "ag-outro-contrato",
        status: "agendado",
        colaborador_cpf: "52998224725",
        contrato_id: "contrato-errado",
        cliente_id: "cli-1",
        data_agendamento: "2026-04-20",
      },
    ],
    contratoClienteId: "cli-1",
  }),
  null
);

const aposRemoverComprometido = buildContratoAgendamentoContagem(2, 1, 0, {
  agendados: 1,
  programadosFuturos: 0,
  emAberto: 0,
  vagasComprometidas: 0,
});
assert.equal(aposRemoverComprometido.previstos, 2);
assert.equal(aposRemoverComprometido.agendados, 1);
assert.equal(aposRemoverComprometido.vagasComprometidas, 0);
assert.equal(aposRemoverComprometido.pendentesDefinicao, 1);
assert.equal(aposRemoverComprometido.emAberto, 0);

assert.equal(
  resolverProximoAvisoBeneficio({
    temVagaComprometida: true,
    vagaDecisao: "none",
    temPeriodicoFuturo: false,
    periodicoDecisao: "none",
    temAsoAberto: true,
    creditoDecisao: "none",
  }),
  "vaga_comprometida"
);
assert.equal(
  resolverProximoAvisoBeneficio({
    temVagaComprometida: true,
    vagaDecisao: "skip",
    temPeriodicoFuturo: false,
    periodicoDecisao: "none",
    temAsoAberto: true,
    creditoDecisao: "none",
  }),
  "nenhum"
);
assert.equal(
  resolverProximoAvisoBeneficio({
    temVagaComprometida: false,
    vagaDecisao: "none",
    temPeriodicoFuturo: false,
    periodicoDecisao: "none",
    temAsoAberto: true,
    creditoDecisao: "none",
  }),
  "aso_aberto"
);

const parsed = parsePlanilhaListaFuncionarios([
  ["Nome do funcionário", "CPF", "Cargo"],
  ["Natália Porfírio", "529.982.247-25", "Cozinheira"],
  ["", "", ""],
  ["João Silva", "39053344705", "Auxiliar"],
]);
assert.equal(parsed.ok, true);
assert.equal(parsed.rows.length, 2);
assert.equal(parsed.rows[0].cpfDigits, "52998224725");
assert.equal(parsed.rows[1].cpfDigits, "39053344705");

// Normalização Excel: máscara, dígitos, number, .0, científica, zero à esquerda
assert.equal(normalizarCpfDeCelulaExcel("529.982.247-25"), "52998224725");
assert.equal(normalizarCpfDeCelulaExcel("52998224725"), "52998224725");
assert.equal(normalizarCpfDeCelulaExcel(52998224725), "52998224725");
assert.equal(normalizarCpfDeCelulaExcel("52998224725.0"), "52998224725");
assert.equal(normalizarCpfDeCelulaExcel("5.2998224725E+10"), "52998224725");
assert.equal(normalizarCpfDeCelulaExcel("  529.982.247-25  "), "52998224725");
assert.equal(isValidCPF("01000000028"), true);
assert.equal(normalizarCpfDeCelulaExcel("01000000028"), "01000000028");
assert.equal(normalizarCpfDeCelulaExcel(1000000028), "01000000028"); // Excel perdeu o zero
assert.equal(normalizarCpfDeCelulaExcel("123.456.789-00"), "12345678900");
assert.equal(isValidCPF(normalizarCpfDeCelulaExcel("123.456.789-00")), false);

const parseNumberCells = parsePlanilhaListaFuncionarios([
  ["Nome do funcionário", "CPF", "Cargo"],
  ["Natalia", 52998224725, "Cozinheira"],
  ["Joao", "39053344705.0", "Auxiliar"],
  ["Zero", 1000000028, "Assistente"],
]);
assert.equal(parseNumberCells.ok, true);
assert.equal(parseNumberCells.rows[0].cpfDigits, "52998224725");
assert.equal(parseNumberCells.rows[1].cpfDigits, "39053344705");
assert.equal(parseNumberCells.rows[2].cpfDigits, "01000000028");

const aplicados = aplicarImportacaoNasVagas({
  atuais: [emptyVagaDraft(1), emptyVagaDraft(2)],
  importados: parsed.rows,
  quantidadePrevista: 2,
  sobrescreverPreenchidas: true,
});
assert.equal(aplicados.aplicados, 2);
assert.equal(aplicados.excedentes.length, 0);
assert.equal(aplicados.drafts[0].colaborador, "NATÁLIA PORFÍRIO");
assert.equal(aplicados.drafts[0].manterAsoAberto, false);

// Cabeçalho sem Cargo
const semCargo = parsePlanilhaListaFuncionarios([
  ["Nome", "CPF"],
  ["João", "529.982.247-25"],
]);
assert.equal(semCargo.ok, false);
assert.match(semCargo.error ?? "", /colunas esperadas/i);
assert.equal(semCargo.error, mensagemColunasEsperadasListaFuncionarios());

// CPF inválido — não importa parcialmente
const cpfInvalido = parsePlanilhaListaFuncionarios([
  ["Nome do funcionário", "CPF", "Cargo"],
  ["Ok", "529.982.247-25", "Cargo A"],
  ["Ruim", "123.456.789-00", "Cargo B"],
]);
assert.equal(cpfInvalido.ok, false);
assert.match(cpfInvalido.errosLinha.join("\n"), /Linha 3: CPF inválido/);

// CPF duplicado no arquivo
const cpfDup = parsePlanilhaListaFuncionarios([
  ["Nome do funcionário", "CPF", "Cargo"],
  ["A", "529.982.247-25", "Cargo"],
  ["B", "52998224725", "Outro"],
]);
assert.equal(cpfDup.ok, false);
assert.match(cpfDup.errosLinha.join("\n"), /duplicado/i);

// Toast resumido para muitos CPFs inválidos
const muitosErros = Array.from({ length: 8 }, (_, i) => `Linha ${i + 2}: CPF inválido.`);
assert.match(
  resumirErrosImportacaoListaFuncionarios(muitosErros),
  /Foram encontrados 8 CPFs inválidos/
);

// Excesso de vagas — mensagem oficial (UI bloqueia antes de aplicar)
assert.match(
  mensagemExcessoVagasListaFuncionarios(10, 12),
  /O contrato possui 10 vagas, mas o arquivo contém 12 funcionários/
);

// Modelo Excel: aba Funcionários + Instruções + N linhas + CPF como texto
const modeloBuf = gerarModeloListaFuncionariosXlsx({ quantidadePrevista: 3 });
const modeloWb = XLSX.read(modeloBuf, { type: "array", cellStyles: true });
assert.ok(modeloWb.SheetNames.includes("Funcionários"));
assert.ok(modeloWb.SheetNames.includes("Instruções"));
const modeloSheet = modeloWb.Sheets["Funcionários"];
assert.equal(modeloSheet["B2"]?.t, "s");
assert.equal(modeloSheet["B2"]?.z, "@");
const modeloRows = XLSX.utils.sheet_to_json<unknown[]>(modeloSheet, {
  header: 1,
  defval: "",
});
assert.equal(modeloRows.length, 4); // header + 3 linhas
assert.deepEqual(modeloRows[0], [
  "Nome do funcionário",
  "CPF",
  "Cargo",
]);
assert.equal(
  nomeArquivoModeloListaFuncionarios("ORC-2026-0037"),
  "modelo_lista_funcionarios_ORC-2026-0037.xlsx"
);

// Round-trip: modelo → preencher (texto + número) → parse
modeloSheet["A2"] = { t: "s", v: "Maria Souza" };
modeloSheet["B2"] = { t: "s", v: "529.982.247-25", z: "@" };
modeloSheet["C2"] = { t: "s", v: "Recepcionista" };
modeloSheet["A3"] = { t: "s", v: "Joao Silva" };
modeloSheet["B3"] = { t: "n", v: 39053344705 };
modeloSheet["C3"] = { t: "s", v: "Motorista" };
const roundTripRows = XLSX.utils.sheet_to_json<unknown[]>(modeloSheet, {
  header: 1,
  defval: "",
  raw: true,
});
const roundTrip = parsePlanilhaListaFuncionarios(roundTripRows);
assert.equal(roundTrip.ok, true);
assert.equal(roundTrip.rows.length, 2);
assert.equal(roundTrip.rows[0].cpfDigits, "52998224725");
assert.equal(roundTrip.rows[1].cpfDigits, "39053344705");

// Importação lê apenas aba Funcionários (Instruções ignorada)
assert.equal(
  escolherAbaListaFuncionarios(["Instruções", "Funcionários"]),
  "Funcionários"
);
assert.equal(
  escolherAbaListaFuncionarios(["funcionarios", "Instruções"]),
  "funcionarios"
);
assert.equal(escolherAbaListaFuncionarios(["Instruções"]), "Instruções");

// Manter ASO em aberto: vaga com ASO não é sobrescrita se sobrescrever=false
const comAso = aplicarImportacaoNasVagas({
  atuais: [
    { ...emptyVagaDraft(1), manterAsoAberto: true },
    emptyVagaDraft(2),
  ],
  importados: parsed.rows,
  quantidadePrevista: 2,
  sobrescreverPreenchidas: false,
});
assert.equal(comAso.drafts[0].manterAsoAberto, true);
assert.equal(comAso.drafts[0].colaborador, "");
assert.equal(comAso.drafts[1].colaborador, "NATÁLIA PORFÍRIO");

function aprovacao(
  partial: Partial<OrcamentoAprovacaoRecord>
): OrcamentoAprovacaoRecord {
  return {
    id: "a1",
    orcamento_id: "o1",
    quantidade_colaboradores: 2,
    valor_final: 100,
    condicao_pagamento: null,
    quantidade_parcelas: null,
    valor_parcela: null,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "AGATHA",
    aprovado_em: "2026-07-28T00:00:00Z",
    contrato_enviado: false,
    contrato_enviado_em: null,
    contrato_assinado: false,
    contrato_assinado_em: null,
    observacao_contrato: null,
    boleto_vencimento: null,
    boleto_pago: false,
    boleto_pago_em: null,
    comprovante_path: null,
    comprovante_nome: null,
    comprovante_tipo: null,
    comprovante_tamanho: null,
    observacao_pagamento: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

assert.equal(isFuncionariosEtapaConcluida(aprovacao({})), false);
assert.equal(
  isFuncionariosEtapaConcluida(
    aprovacao({ funcionarios_lista_path: "path/lista.xlsx" })
  ),
  true
);
assert.equal(
  isFuncionariosEtapaConcluida(
    aprovacao({ funcionarios_vagas_salvas_em: "2026-08-20T12:00:00Z" })
  ),
  true
);

assert.equal(
  isAgendamentosEtapaConcluida(
    aprovacao({
      visita_tecnica_necessaria: false,
      visita_tecnica_salva_em: "2026-01-05",
    }),
    {
      quantidadeContratada: 2,
      agendamentosRealizados: 1,
      pendentesDefinicao: 0,
      vagasComprometidas: 0,
    }
  ),
  true
);
assert.equal(
  isAgendamentosEtapaConcluida(
    aprovacao({
      visita_tecnica_necessaria: false,
      visita_tecnica_salva_em: "2026-01-05",
    }),
    {
      quantidadeContratada: 2,
      agendamentosRealizados: 1,
      pendentesDefinicao: 0,
      vagasComprometidas: 1,
    }
  ),
  false
);
assert.equal(
  isAgendamentosEtapaConcluida(
    aprovacao({
      visita_tecnica_necessaria: false,
      visita_tecnica_salva_em: "2026-01-05",
    }),
    {
      quantidadeContratada: 4,
      agendamentosRealizados: 0,
      pendentesDefinicao: 0,
      vagasComprometidas: 4,
    }
  ),
  false
);

const agNatalia = {
  id: "ag-natalia",
  status: "agendado",
  data_agendamento: "2026-08-24",
  aso: "Admissional",
  colaborador_cpf: "52998224725",
};
const agNataliaCancelado = {
  id: "ag-natalia-cancelado",
  status: "cancelado",
  data_agendamento: "2026-07-01",
  aso: "Periódico",
  colaborador_cpf: "52998224725",
};
const agDiogo = {
  id: "ag-diogo",
  status: "agendado",
  data_agendamento: "2026-08-24",
  aso: "Periódico",
  colaborador_cpf: "39053344705",
};

const linhaAgendada = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("agendada", {
    colaborador_cpf: "52998224725",
    agendamento_id: "ag-natalia",
  }),
  agendamentos: [agNatalia],
});
assert.equal(linhaAgendada.dataExameIso, "2026-08-24");
assert.equal(linhaAgendada.tipoAso, "Admissional");
assert.equal(linhaAgendada.agendamentoIdVisualizar, "ag-natalia");

const linhaAsoAberto = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("aso_aberto", { indice: 2 }),
  agendamentos: [agNatalia],
});
assert.equal(linhaAsoAberto.dataExameIso, null);
assert.equal(linhaAsoAberto.tipoAso, null);
assert.equal(linhaAsoAberto.agendamentoIdVisualizar, null);

const linhaComprometida = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("comprometida", { colaborador_cpf: "52998224725" }),
  agendamentos: [agNatalia],
});
assert.equal(linhaComprometida.agendamentoIdVisualizar, null);
assert.equal(linhaComprometida.dataExameIso, null);

const linhaAberta = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("aberta"),
  agendamentos: [agNatalia],
});
assert.equal(linhaAberta.agendamentoIdVisualizar, null);

const linhaProgramada = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("programada", {
    indice: 2,
    periodico_futuro_id: "pf-1",
  }),
  agendamentos: [],
  periodicos: [
    { id: "pf-1", proxima_data: "2026-11-15", tipo_aso: "Periódico" },
  ],
});
assert.equal(linhaProgramada.dataExameIso, "2026-11-15");
assert.equal(linhaProgramada.tipoAso, "Periódico");
assert.equal(linhaProgramada.agendamentoIdVisualizar, null);
assert.equal(linhaProgramada.periodicoIdVisualizar, "pf-1");
assert.equal(linhaAgendada.periodicoIdVisualizar, null);

const periodicoForaDaLista = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("programada", {
    periodico_futuro_id: "pf-ausente",
    colaborador: "ANA LIMA",
  }),
  agendamentos: [],
  periodicos: [],
});
assert.equal(periodicoForaDaLista.periodicoIdVisualizar, "pf-ausente");
assert.equal(periodicoForaDaLista.dataExameIso, null);
assert.equal(periodicoForaDaLista.agendamentoIdVisualizar, null);

const programadaSemCpf = resolverDadosExibicaoVagaContrato({
  vaga: {
    ...vagaCard("programada", {
      id: "v-sem-cpf",
      colaborador: "João da Silva",
      periodico_futuro_id: null,
    }),
    cargo_id: "cargo-op",
    cargo_nome: "Operador",
  },
  agendamentos: [],
  clienteNome: "NIGHT SHIFT OPERAÇÕES",
  periodicos: [
    {
      id: "pf-joao",
      proxima_data: "2027-04-10",
      tipo_aso: "Periódico",
      colaborador: "JOÃO DA SILVA",
      colaborador_cpf: null,
      cliente_nome: "Night Shift Operações",
      cargo_id: "cargo-op",
      cargo_nome: "Operador",
      status: "ativo",
    },
    {
      id: "pf-maria",
      proxima_data: "2027-04-10",
      tipo_aso: "Periódico",
      colaborador: "MARIA SOUZA",
      colaborador_cpf: null,
      cliente_nome: "Night Shift Operações",
      cargo_id: "cargo-op",
      cargo_nome: "Operador",
      status: "ativo",
    },
  ],
});
assert.equal(programadaSemCpf.periodicoIdVisualizar, "pf-joao");
assert.equal(programadaSemCpf.dataExameIso, "2027-04-10");
assert.equal(programadaSemCpf.agendamentoIdVisualizar, null);

const homonimoOutroCpf = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("programada", {
    id: "v-homonimo",
    colaborador: "João da Silva",
    colaborador_cpf: "52998224725",
    periodico_futuro_id: null,
  }),
  agendamentos: [],
  clienteNome: "NIGHT SHIFT OPERAÇÕES",
  periodicos: [
    {
      id: "pf-outro-cpf",
      proxima_data: "2027-04-10",
      tipo_aso: "Periódico",
      colaborador: "João da Silva",
      colaborador_cpf: "39053344705",
      cliente_nome: "NIGHT SHIFT OPERAÇÕES",
      cargo_nome: "Operador",
      status: "ativo",
    },
  ],
});
assert.equal(homonimoOutroCpf.periodicoIdVisualizar, null);

const doisCiclosSemVinculo = resolverDadosExibicaoVagaContrato({
  vaga: {
    ...vagaCard("programada", {
      id: "v-ambiguo",
      colaborador: "João da Silva",
      periodico_futuro_id: null,
    }),
    cargo_id: "cargo-op",
    cargo_nome: "Operador",
  },
  agendamentos: [],
  clienteNome: "NIGHT SHIFT OPERAÇÕES",
  periodicos: [
    {
      id: "pf-abril",
      proxima_data: "2027-04-10",
      tipo_aso: "Periódico",
      colaborador: "João da Silva",
      cliente_nome: "NIGHT SHIFT OPERAÇÕES",
      cargo_id: "cargo-op",
      status: "ativo",
    },
    {
      id: "pf-agosto",
      proxima_data: "2027-08-10",
      tipo_aso: "Periódico",
      colaborador: "João da Silva",
      cliente_nome: "NIGHT SHIFT OPERAÇÕES",
      cargo_id: "cargo-op",
      status: "ativo",
    },
  ],
});
assert.equal(doisCiclosSemVinculo.periodicoIdVisualizar, null);

const periodicoDeOutraVaga = resolverDadosExibicaoVagaContrato({
  vaga: {
    ...vagaCard("programada", {
      id: "v-sem-id",
      colaborador: "João da Silva",
      periodico_futuro_id: null,
    }),
    cargo_id: "cargo-op",
  },
  demaisVagas: [
    vagaCard("programada", {
      id: "v-dona",
      indice: 2,
      periodico_futuro_id: "pf-joao",
    }),
  ],
  agendamentos: [],
  clienteNome: "NIGHT SHIFT OPERAÇÕES",
  periodicos: [
    {
      id: "pf-joao",
      proxima_data: "2027-04-10",
      tipo_aso: "Periódico",
      colaborador: "João da Silva",
      cliente_nome: "NIGHT SHIFT OPERAÇÕES",
      cargo_id: "cargo-op",
      status: "ativo",
    },
  ],
});
assert.equal(periodicoDeOutraVaga.periodicoIdVisualizar, null);

const linhaProgramadaSemTipo = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("programada", { periodico_futuro_id: "pf-2" }),
  agendamentos: [],
  periodicos: [{ id: "pf-2", proxima_data: "2026-12-01", tipo_aso: null }],
});
assert.equal(linhaProgramadaSemTipo.tipoAso, null);
assert.equal(linhaProgramadaSemTipo.dataExameIso, "2026-12-01");

const linhaSoCancelado = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("agendada", {
    colaborador_cpf: "52998224725",
    agendamento_id: "ag-natalia-cancelado",
  }),
  agendamentos: [agNataliaCancelado],
});
assert.equal(linhaSoCancelado.agendamentoIdVisualizar, null);
assert.equal(linhaSoCancelado.dataExameIso, null);
assert.equal(linhaSoCancelado.tipoAso, null);

const linhaCanceladoMaisValido = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("agendada", {
    id: "v-agendada-1",
    colaborador_cpf: "52998224725",
    agendamento_id: "ag-natalia-cancelado",
  }),
  demaisVagas: [
    vagaCard("agendada", {
      id: "v-agendada-2",
      indice: 2,
      agendamento_id: "ag-diogo",
    }),
  ],
  agendamentos: [agNataliaCancelado, agNatalia, agDiogo],
});
assert.equal(linhaCanceladoMaisValido.agendamentoIdVisualizar, "ag-natalia");
assert.equal(linhaCanceladoMaisValido.dataExameIso, "2026-08-24");
assert.equal(linhaCanceladoMaisValido.tipoAso, "Admissional");

assert.equal(
  vagaPrecisaReconciliarAgendamento(vagaCard("agendada", { agendamento_id: "ag-natalia" })),
  false
);
assert.equal(
  vagaPrecisaReconciliarAgendamento(
    vagaCard("agendada", { agendamento_id: null, colaborador_cpf: "52998224725" })
  ),
  true
);
assert.equal(
  escolherAgendamentoValidoParaVaga({
    vaga: vagaCard("agendada", {
      colaborador_cpf: "52998224725",
      agendamento_id: null,
    }),
    agendamentos: [
      agNataliaCancelado,
      {
        id: "ag-natalia",
        status: "agendado",
        colaborador_cpf: "52998224725",
        contrato_id: "c1",
        cliente_id: "cli-1",
        data_agendamento: "2026-08-24",
      },
    ],
    contratoClienteId: "cli-1",
  }),
  "ag-natalia"
);

const vagaComIdForaDaColecao = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("agendada", {
    colaborador_cpf: "52998224725",
    agendamento_id: "ag-natalia",
  }),
  agendamentos: [],
});
assert.equal(vagaComIdForaDaColecao.dataExameIso, null);
assert.equal(vagaComIdForaDaColecao.tipoAso, null);
assert.equal(vagaComIdForaDaColecao.agendamentoIdVisualizar, null);

const vagaComIdCarregadoAvulso = resolverDadosExibicaoVagaContrato({
  vaga: vagaCard("agendada", {
    colaborador_cpf: "52998224725",
    agendamento_id: "ag-natalia",
  }),
  agendamentos: [agNatalia],
});
assert.equal(vagaComIdCarregadoAvulso.dataExameIso, "2026-08-24");
assert.equal(vagaComIdCarregadoAvulso.tipoAso, "Admissional");
assert.equal(vagaComIdCarregadoAvulso.agendamentoIdVisualizar, "ag-natalia");

const abaFuncionariosSrc = readFileSync(
  join(process.cwd(), "components/orcamentos/OrcamentoAbaFuncionarios.tsx"),
  "utf8"
);
assert.match(abaFuncionariosSrc, /Importar lista/);
assert.match(abaFuncionariosSrc, /Baixar modelo Excel/);
assert.match(abaFuncionariosSrc, /Exportar lista/);
assert.match(abaFuncionariosSrc, /downloadListaFuncionariosXlsx/);
assert.match(abaFuncionariosSrc, /gerarModeloListaFuncionariosXlsx|downloadModeloListaFuncionariosXlsx/);
assert.match(abaFuncionariosSrc, /handleBaixarModelo/);
assert.match(abaFuncionariosSrc, /mensagemExcessoVagasListaFuncionarios/);
assert.match(abaFuncionariosSrc, /Salvar lista/);
assert.doesNotMatch(
  abaFuncionariosSrc.slice(
    abaFuncionariosSrc.indexOf("handleImportar"),
    abaFuncionariosSrc.indexOf("handleReplaceSelected")
  ),
  /salvarListaVagasContrato/
);

const importLibSrc = readFileSync(
  join(process.cwd(), "lib/contrato-vagas-import.ts"),
  "utf8"
);
assert.match(importLibSrc, /gerarModeloListaFuncionariosXlsx/);
assert.match(importLibSrc, /nomeArquivoModeloListaFuncionarios/);
assert.match(importLibSrc, /export function parsePlanilhaListaFuncionarios/);
assert.match(importLibSrc, /export async function lerArquivoListaFuncionarios/);
assert.match(importLibSrc, /export function aplicarImportacaoNasVagas/);
assert.match(importLibSrc, /CONTRATO_VAGAS_SHEET_FUNCIONARIOS/);

const CPF_JIVALDO = "52998224725";
const vagasOrc0033 = [
  vagaCard("agendada", {
    indice: 1,
    colaborador: "DANIEL DOS SANTOS",
    colaborador_cpf: "39053344705",
    agendamento_id: "ag-daniel",
  }),
  vagaCard("agendada", {
    indice: 2,
    colaborador: "NATALIA DA SILVA MAZUR",
    colaborador_cpf: "11144477735",
    agendamento_id: "ag-natalia",
  }),
  vagaCard("comprometida", {
    indice: 3,
    colaborador: "JIVALDO JESUS SANTOS",
    colaborador_cpf: CPF_JIVALDO,
  }),
];

const cardsAntesDesligamento = contarCardsPorVagasContrato(vagasOrc0033, 3);
assert.equal(cardsAntesDesligamento.agendados, 2);
assert.equal(cardsAntesDesligamento.vagasComprometidas, 1);
assert.equal(cardsAntesDesligamento.pendentesDefinicao, 0);
assert.equal(cardsAntesDesligamento.vagasDesligadasAdmin, 0);
assert.equal(
  isClassificacaoVagasContratoCompleta({
    previstos: 3,
    pendentesDefinicao: cardsAntesDesligamento.pendentesDefinicao,
    vagasComprometidas: cardsAntesDesligamento.vagasComprometidas,
  }),
  false
);
assert.equal(
  statusClassificacaoVaga(vagasOrc0033[2]),
  "comprometida"
);
assert.equal(
  vagaPermiteAcoesOperacionaisAgendamento("comprometida"),
  true
);

const ctxJivaldo = {
  cpfsDesligadosAdmin: new Set([CPF_JIVALDO]),
};
assert.equal(
  statusClassificacaoVaga(vagasOrc0033[2], ctxJivaldo),
  CONTRATO_VAGA_STATUS_DESLIGADO_ADMIN
);
assert.equal(
  CONTRATO_VAGA_STATUS_LABELS_CLASSIFICACAO[
    statusClassificacaoVaga(vagasOrc0033[2], ctxJivaldo)
  ],
  "Desligado administrativamente"
);
assert.equal(
  vagaPermiteAcoesOperacionaisAgendamento(
    statusClassificacaoVaga(vagasOrc0033[2], ctxJivaldo)
  ),
  false
);
assert.equal(
  vagaPermiteRemoverFuncionario(vagasOrc0033[2], ctxJivaldo),
  false
);
assert.equal(
  vagaClassificacaoBloqueiaEdicaoOcupante(
    statusClassificacaoVaga(vagasOrc0033[2], ctxJivaldo)
  ),
  true
);
assert.equal(
  isVagaAgendamentoResolvida(
    statusClassificacaoVaga(vagasOrc0033[2], ctxJivaldo)
  ),
  true
);

const cardsDepois = contarCardsPorVagasContrato(vagasOrc0033, 3, ctxJivaldo);
assert.equal(cardsDepois.agendados, 2);
assert.equal(cardsDepois.vagasComprometidas, 0);
assert.equal(cardsDepois.vagasDesligadasAdmin, 1);
assert.equal(cardsDepois.pendentesDefinicao, 0);
assert.equal(cardsDepois.emAberto, 0);
assert.equal(
  isClassificacaoVagasContratoCompleta({
    previstos: 3,
    pendentesDefinicao: cardsDepois.pendentesDefinicao,
    vagasComprometidas: cardsDepois.vagasComprometidas,
  }),
  true
);

const contagem0033 = buildContagemContratoComVagas({
  quantidadePrevista: 3,
  vagas: vagasOrc0033,
  utilizadosAg: 2,
  programadosLegado: 0,
  emAbertoLegado: 0,
  vagasComprometidasLegado: 1,
  adicionaisLegado: 0,
  desligamento: ctxJivaldo,
});
assert.equal(contagem0033.previstos, 3);
assert.equal(contagem0033.agendados, 2);
assert.equal(contagem0033.vagasComprometidas, 0);
assert.equal(contagem0033.vagasDesligadasAdmin, 1);
assert.equal(contagem0033.pendentesDefinicao, 0);
assert.equal(contagem0033.concluido, true);
assert.match(
  contagem0033.mensagemComplemento ?? "",
  /desligamento administrativo/
);

const ctxDesfeito = { cpfsDesligadosAdmin: new Set<string>() };
assert.equal(
  statusClassificacaoVaga(vagasOrc0033[2], ctxDesfeito),
  "comprometida"
);
const cardsDesfeito = contarCardsPorVagasContrato(
  vagasOrc0033,
  3,
  ctxDesfeito
);
assert.equal(cardsDesfeito.vagasComprometidas, 1);
assert.equal(cardsDesfeito.vagasDesligadasAdmin, 0);
assert.equal(
  isClassificacaoVagasContratoCompleta({
    previstos: 3,
    pendentesDefinicao: cardsDesfeito.pendentesDefinicao,
    vagasComprometidas: cardsDesfeito.vagasComprometidas,
  }),
  false
);

const ctxDemissional = {
  cpfsDesligadosAdmin: new Set([CPF_JIVALDO]),
  cpfsComDemissionalAtivo: new Set([CPF_JIVALDO]),
};
assert.equal(
  statusClassificacaoVaga(vagasOrc0033[2], ctxDemissional),
  "comprometida"
);
assert.equal(
  vagaPermiteAcoesOperacionaisAgendamento("comprometida"),
  true
);

assert.equal(
  agendamentoOcupaVagaPrevista(
    { id: "ag-demissional-posterior", colaborador_cpf: CPF_JIVALDO },
    vagasOrc0033
  ),
  true
);

const vagaAgendadaComDesligamento = vagaCard("agendada", {
  indice: 1,
  colaborador: "COM EXAME",
  colaborador_cpf: CPF_JIVALDO,
  agendamento_id: "ag-1",
});
assert.equal(
  statusClassificacaoVaga(vagaAgendadaComDesligamento, ctxJivaldo),
  "agendada"
);

const abaAgSrc = readFileSync(
  join(process.cwd(), "components/orcamentos/OrcamentoAbaAgendamentos.tsx"),
  "utf8"
);
assert.match(abaAgSrc, /statusClassificacaoVaga/);
assert.match(abaAgSrc, /vagaPermiteAcoesOperacionaisAgendamento/);
assert.match(abaAgSrc, /CONTRATO_VAGA_STATUS_LABELS_CLASSIFICACAO/);
assert.match(
  readFileSync(join(process.cwd(), "lib/contrato-vagas.ts"), "utf8"),
  /Desligado administrativamente/
);
assert.doesNotMatch(abaAgSrc, /from\("contrato_vagas"\)[\s\S]{0,80}\.update/);

const NOME_VIRGINIA_COM_VIRGULA = "VIRGINIA AUDINO TOZATI,";
const NOME_VIRGINIA = "VIRGINIA AUDINO TOZATI";
const vagaVirginia = {
  ...vagaCard("programada", {
    id: "vaga-virginia",
    indice: 4,
    colaborador: NOME_VIRGINIA_COM_VIRGULA,
    colaborador_cpf: CPF_JIVALDO,
    periodico_futuro_id: "pf-virginia",
    agendamento_id: null,
    credito_aso_id: null,
  }),
  cargo_id: "cargo-eng",
  cargo_nome: "ENGENHEIRA",
};

assert.equal(
  resolveStatusListaFuncionarioPreview({
    persistida: vagaVirginia,
    draft: {
      colaborador: NOME_VIRGINIA_COM_VIRGULA,
      colaboradorCpf: CPF_JIVALDO,
      manterAsoAberto: false,
    },
  }),
  "programada"
);
assert.equal(vagaClassificacaoBloqueiaEdicaoOcupante("programada"), true);
assert.equal(vagaPermiteCorrigirNomeOcupante("programada"), true);
assert.equal(vagaPermiteCorrigirNomeOcupante("agendada"), false);
assert.equal(
  vagaPermiteCorrigirNomeOcupante(CONTRATO_VAGA_STATUS_DESLIGADO_ADMIN),
  false
);
assert.equal(vagaPermiteCorrigirNomeOcupante("comprometida"), true);

const planoVirginia = planoCorrecaoNomeVagaProgramada({
  vaga: vagaVirginia,
  classificacao: "programada",
  nomeInformado: NOME_VIRGINIA,
});
assert.ok(planoVirginia);
assert.equal(planoVirginia.vagaId, "vaga-virginia");
assert.equal(planoVirginia.colaborador, NOME_VIRGINIA);
assert.equal(planoVirginia.nomeAnterior, NOME_VIRGINIA_COM_VIRGULA);
assert.equal(planoVirginia.preservar.status, "programada");
assert.equal(planoVirginia.preservar.colaboradorCpf, CPF_JIVALDO);
assert.equal(planoVirginia.preservar.cargoId, "cargo-eng");
assert.equal(planoVirginia.preservar.cargoNome, "ENGENHEIRA");
assert.equal(planoVirginia.preservar.agendamentoId, null);
assert.equal(planoVirginia.preservar.periodicoFuturoId, "pf-virginia");
assert.equal(planoVirginia.preservar.creditoAsoId, null);
assert.equal(
  planoCorrecaoNomeVagaProgramada({
    vaga: vagaVirginia,
    classificacao: "programada",
    nomeInformado: NOME_VIRGINIA_COM_VIRGULA,
  }),
  null
);
assert.equal(
  planoCorrecaoNomeVagaProgramada({
    vaga: vagaCard("agendada", {
      id: "vaga-agendada",
      colaborador: NOME_VIRGINIA_COM_VIRGULA,
      colaborador_cpf: CPF_JIVALDO,
      agendamento_id: "ag-1",
    }),
    classificacao: "agendada",
    nomeInformado: NOME_VIRGINIA,
  }),
  null
);
assert.equal(
  planoCorrecaoNomeVagaProgramada({
    vaga: vagaVirginia,
    classificacao: CONTRATO_VAGA_STATUS_DESLIGADO_ADMIN,
    nomeInformado: NOME_VIRGINIA,
  }),
  null
);

const idsProgramacao = selecionarIdsCopiaNomeProgramacao({
  contratoId: "c1",
  periodicoFuturoId: "pf-virginia",
  cpf: CPF_JIVALDO,
  nomeAnterior: NOME_VIRGINIA_COM_VIRGULA,
  registros: [
    {
      id: "pf-virginia",
      contratoId: "c1",
      colaborador: NOME_VIRGINIA_COM_VIRGULA,
      colaboradorCpf: CPF_JIVALDO,
      status: "ativo",
    },
    {
      id: "pf-irmao",
      contratoId: "c1",
      colaborador: NOME_VIRGINIA_COM_VIRGULA,
      colaboradorCpf: "529.982.247-25",
      status: "reagendado",
    },
    {
      id: "pf-outro-cpf",
      contratoId: "c1",
      colaborador: NOME_VIRGINIA_COM_VIRGULA,
      colaboradorCpf: "11144477735",
      status: "ativo",
    },
    {
      id: "pf-cancelado",
      contratoId: "c1",
      colaborador: NOME_VIRGINIA_COM_VIRGULA,
      colaboradorCpf: CPF_JIVALDO,
      status: "cancelado",
    },
    {
      id: "pf-outro-contrato",
      contratoId: "c2",
      colaborador: NOME_VIRGINIA_COM_VIRGULA,
      colaboradorCpf: CPF_JIVALDO,
      status: "ativo",
    },
    {
      id: "pf-ja-corrigido",
      contratoId: "c1",
      colaborador: NOME_VIRGINIA,
      colaboradorCpf: CPF_JIVALDO,
      status: "ativo",
    },
  ],
});
assert.deepEqual(idsProgramacao, ["pf-virginia", "pf-irmao"]);

const registrosAlémDoMil = Array.from({ length: 1000 }, (_, indice) => ({
  id: `pf-outro-${indice}`,
  contratoId: "c1",
  colaborador: "OUTRA PESSOA",
  colaboradorCpf: "11144477735",
  status: "ativo",
}));
registrosAlémDoMil.push({
  id: "pf-depois-do-mil",
  contratoId: "c1",
  colaborador: NOME_VIRGINIA_COM_VIRGULA,
  colaboradorCpf: CPF_JIVALDO,
  status: "ativo",
});
assert.deepEqual(
  selecionarIdsCopiaNomeProgramacao({
    contratoId: "c1",
    cpf: CPF_JIVALDO,
    nomeAnterior: NOME_VIRGINIA_COM_VIRGULA,
    registros: registrosAlémDoMil,
  }),
  ["pf-depois-do-mil"]
);

const vagaReaberta = {
  ...vagaVirginia,
  colaborador: planoVirginia.colaborador,
};
const draftsReabertos = buildVagaDraftsIniciais(4, [vagaReaberta]);
const draftVirginia = draftsReabertos.find((row) => row.indice === 4);
assert.ok(draftVirginia);
assert.equal(draftVirginia.colaborador, NOME_VIRGINIA);
assert.equal(draftVirginia.id, "vaga-virginia");
assert.equal(vagaReaberta.status, "programada");
assert.equal(vagaReaberta.periodico_futuro_id, "pf-virginia");
assert.equal(vagaReaberta.agendamento_id, null);
assert.equal(vagaReaberta.colaborador_cpf, CPF_JIVALDO);
assert.equal(vagaReaberta.cargo_nome, "ENGENHEIRA");
assert.equal(
  resolveStatusListaFuncionarioPreview({
    persistida: vagaReaberta,
    draft: draftVirginia,
  }),
  "programada"
);

const nomeInputSrc = abaFuncionariosSrc.slice(
  abaFuncionariosSrc.indexOf("Nome do funcionário"),
  abaFuncionariosSrc.indexOf("data-vaga-cell={`${rowIdx}-1`}")
);
assert.match(nomeInputSrc, /disabled=\{busy \|\| nomeBloqueado\}/);
assert.match(nomeInputSrc, /vagaPermiteCorrigirNomeOcupante/);
assert.doesNotMatch(nomeInputSrc, /disabled=\{busy \|\| locked\}/);
assert.match(
  abaFuncionariosSrc.slice(
    abaFuncionariosSrc.indexOf("data-vaga-cell={`${rowIdx}-1`}"),
    abaFuncionariosSrc.indexOf("data-vaga-cell={`${rowIdx}-2`}")
  ),
  /disabled=\{busy \|\| locked\}/
);

assert.equal(vagaPermiteCorrigirCargoOcupante("programada"), true);
assert.equal(vagaPermiteCorrigirCargoOcupante("agendada"), true);
assert.equal(vagaPermiteCorrigirCargoOcupante("comprometida"), false);
assert.equal(
  vagaPermiteCorrigirCargoOcupante(CONTRATO_VAGA_STATUS_DESLIGADO_ADMIN),
  false
);

const planoCargoProgramada = planoCorrecaoCargoVagaOcupada({
  vaga: vagaVirginia,
  classificacao: "programada",
  cargoId: "cargo-tec",
  cargoNome: "tecnica de enfermagem",
});
assert.ok(planoCargoProgramada);
assert.equal(planoCargoProgramada.vagaId, "vaga-virginia");
assert.equal(planoCargoProgramada.cargoId, "cargo-tec");
assert.equal(planoCargoProgramada.cargoNome, "TECNICA DE ENFERMAGEM");
assert.equal(planoCargoProgramada.cargoNomeAnterior, "ENGENHEIRA");
assert.equal(planoCargoProgramada.preservar.colaborador, NOME_VIRGINIA_COM_VIRGULA);
assert.equal(planoCargoProgramada.preservar.colaboradorCpf, CPF_JIVALDO);
assert.equal(planoCargoProgramada.preservar.status, "programada");
assert.equal(planoCargoProgramada.preservar.agendamentoId, null);
assert.equal(planoCargoProgramada.preservar.periodicoFuturoId, "pf-virginia");
assert.equal(planoCargoProgramada.preservar.creditoAsoId, null);

const vagaAgendadaCargo = {
  ...vagaCard("agendada", {
    id: "vaga-coconut",
    indice: 2,
    colaborador: "MARIA COCONUT",
    colaborador_cpf: CPF_JIVALDO,
    agendamento_id: "ag-coconut",
    periodico_futuro_id: "pf-coconut",
    credito_aso_id: "cred-coconut",
  }),
  cargo_id: "cargo-aux",
  cargo_nome: "AUXILIAR",
};
const planoCargoAgendada = planoCorrecaoCargoVagaOcupada({
  vaga: vagaAgendadaCargo,
  classificacao: "agendada",
  cargoId: "cargo-tec",
  cargoNome: "TECNICA DE ENFERMAGEM",
});
assert.ok(planoCargoAgendada);
assert.equal(planoCargoAgendada.vagaId, "vaga-coconut");
assert.equal(planoCargoAgendada.preservar.status, "agendada");
assert.equal(planoCargoAgendada.preservar.colaboradorCpf, CPF_JIVALDO);
assert.equal(planoCargoAgendada.preservar.agendamentoId, "ag-coconut");
assert.equal(planoCargoAgendada.preservar.periodicoFuturoId, "pf-coconut");
assert.equal(planoCargoAgendada.preservar.creditoAsoId, "cred-coconut");
assert.equal(
  planoCorrecaoNomeVagaProgramada({
    vaga: vagaAgendadaCargo,
    classificacao: "agendada",
    nomeInformado: "OUTRO NOME",
  }),
  null
);
assert.equal(
  planoCorrecaoCargoVagaOcupada({
    vaga: vagaVirginia,
    classificacao: "programada",
    cargoId: "cargo-eng",
    cargoNome: "ENGENHEIRA",
  }),
  null
);
assert.equal(
  planoCorrecaoCargoVagaOcupada({
    vaga: vagaVirginia,
    classificacao: CONTRATO_VAGA_STATUS_DESLIGADO_ADMIN,
    cargoId: "cargo-tec",
    cargoNome: "TECNICA DE ENFERMAGEM",
  }),
  null
);
assert.equal(
  planoCorrecaoCargoVagaOcupada({
    vaga: vagaCard("comprometida", {
      id: "vaga-aberta-cargo",
      colaborador: NOME_VIRGINIA,
      colaborador_cpf: CPF_JIVALDO,
    }),
    classificacao: "comprometida",
    cargoId: "cargo-tec",
    cargoNome: "TECNICA",
  }),
  null
);

const CPF_OUTRA_PESSOA = "11144477735";
const idsCargoProgramacao = selecionarIdsCopiaCargoOperacional({
  contratoId: "c1",
  clienteId: "cli-coconut",
  cpf: CPF_JIVALDO,
  vinculoId: "pf-virginia",
  modo: "programacao",
  registros: [
    {
      id: "pf-virginia",
      contratoId: "c1",
      colaboradorCpf: CPF_JIVALDO,
      status: "ativo",
    },
    {
      id: "pf-mesmo-cpf-outro-nome",
      contratoId: "c1",
      colaboradorCpf: "529.982.247-25",
      status: "reagendado",
    },
    {
      id: "pf-mesmo-nome-outro-cpf",
      contratoId: "c1",
      colaboradorCpf: CPF_OUTRA_PESSOA,
      status: "ativo",
    },
    {
      id: "pf-cancelado",
      contratoId: "c1",
      colaboradorCpf: CPF_JIVALDO,
      status: "cancelado",
    },
    {
      id: "pf-outro-contrato",
      contratoId: "c2",
      colaboradorCpf: CPF_JIVALDO,
      status: "ativo",
    },
    {
      id: "pf-outro-cliente",
      contratoId: "c1",
      clienteId: "cli-outro",
      colaboradorCpf: CPF_JIVALDO,
      status: "ativo",
    },
  ],
});
assert.deepEqual(idsCargoProgramacao, [
  "pf-virginia",
  "pf-mesmo-cpf-outro-nome",
]);

const depoisDoMil = Array.from({ length: 1000 }, (_, indice) => ({
  id: `pf-lote-${indice}`,
  contratoId: "c1",
  colaboradorCpf: CPF_OUTRA_PESSOA,
  status: "ativo",
}));
depoisDoMil.push({
  id: "pf-depois-do-mil-cargo",
  contratoId: "c1",
  colaboradorCpf: CPF_JIVALDO,
  status: "ativo",
});
assert.deepEqual(
  selecionarIdsCopiaCargoOperacional({
    contratoId: "c1",
    cpf: CPF_JIVALDO,
    modo: "programacao",
    registros: depoisDoMil,
  }),
  ["pf-depois-do-mil-cargo"]
);

const idsCargoAgendamento = selecionarIdsCopiaCargoOperacional({
  contratoId: "c1",
  clienteId: "cli-coconut",
  cpf: CPF_JIVALDO,
  vinculoId: "ag-coconut",
  modo: "agendamento",
  registros: [
    {
      id: "ag-coconut",
      contratoId: "c1",
      clienteId: "cli-coconut",
      colaboradorCpf: CPF_JIVALDO,
      status: "agendado",
    },
    {
      id: "ag-mesmo-cpf",
      contratoId: "c1",
      clienteId: "cli-coconut",
      colaboradorCpf: CPF_JIVALDO,
      status: "rascunho",
    },
    {
      id: "ag-outro-cpf",
      contratoId: "c1",
      clienteId: "cli-coconut",
      colaboradorCpf: CPF_OUTRA_PESSOA,
      status: "agendado",
    },
    {
      id: "ag-cancelado",
      contratoId: "c1",
      clienteId: "cli-coconut",
      colaboradorCpf: CPF_JIVALDO,
      status: "cancelado",
    },
    {
      id: "ag-aso-assinado",
      contratoId: "c1",
      clienteId: "cli-coconut",
      colaboradorCpf: CPF_JIVALDO,
      status: "agendado",
      asoAssinado: true,
    },
    {
      id: "ag-aso-emitido",
      contratoId: "c1",
      clienteId: "cli-coconut",
      colaboradorCpf: CPF_JIVALDO,
      status: "agendado",
      asoEnviadoClinica: true,
    },
    {
      id: "ag-aso-retido",
      contratoId: "c1",
      clienteId: "cli-coconut",
      colaboradorCpf: CPF_JIVALDO,
      status: "aso_retido",
    },
    {
      id: "ag-outro-contrato",
      contratoId: "c2",
      clienteId: "cli-coconut",
      colaboradorCpf: CPF_JIVALDO,
      status: "agendado",
    },
    {
      id: "ag-outro-cliente",
      contratoId: "c1",
      clienteId: "cli-outro",
      colaboradorCpf: CPF_JIVALDO,
      status: "agendado",
    },
  ],
});
assert.deepEqual(idsCargoAgendamento, ["ag-coconut", "ag-mesmo-cpf"]);

const vagaCargoCorrigida = {
  ...vagaAgendadaCargo,
  cargo_id: planoCargoAgendada.cargoId,
  cargo_nome: planoCargoAgendada.cargoNome,
};
const draftCargoReaberto = buildVagaDraftsIniciais(2, [vagaCargoCorrigida]).find(
  (row) => row.id === "vaga-coconut"
);
assert.ok(draftCargoReaberto);
assert.equal(draftCargoReaberto.cargoNome, "TECNICA DE ENFERMAGEM");
assert.equal(draftCargoReaberto.cargoId, "cargo-tec");
assert.equal(draftCargoReaberto.colaboradorCpf.replace(/\D/g, ""), CPF_JIVALDO);
assert.equal(vagaCargoCorrigida.status, "agendada");
assert.equal(vagaCargoCorrigida.agendamento_id, "ag-coconut");
assert.equal(vagaCargoCorrigida.periodico_futuro_id, "pf-coconut");

const cargoInputSrc = abaFuncionariosSrc.slice(
  abaFuncionariosSrc.indexOf("data-vaga-cell={`${rowIdx}-2`}"),
  abaFuncionariosSrc.indexOf("<StatusBadge")
);
assert.match(cargoInputSrc, /disabled=\{busy \|\| cargoBloqueado\}/);
assert.match(cargoInputSrc, /vagaPermiteCorrigirCargoOcupante/);
assert.doesNotMatch(cargoInputSrc, /disabled=\{busy \|\| locked\}/);

const vagasServiceSrc = readFileSync(
  join(process.cwd(), "services/contrato-vagas.service.ts"),
  "utf8"
);
const syncSrc = vagasServiceSrc.slice(
  vagasServiceSrc.indexOf("async function sincronizarCopiaNomeProgramacao"),
  vagasServiceSrc.indexOf("async function atualizarVaga")
);
assert.match(vagasServiceSrc, /planoCorrecaoNomeVagaProgramada/);
assert.match(vagasServiceSrc, /planoCorrecaoCargoVagaOcupada/);
assert.match(
  vagasServiceSrc,
  /atualizarVaga\(plano\.vagaId, \{\s*colaborador: plano\.colaborador,\s*\}\)/
);
assert.match(
  vagasServiceSrc,
  /atualizarVaga\(planoCargo\.vagaId, \{\s*cargo_id: planoCargo\.cargoId,\s*cargo_nome: planoCargo\.cargoNome,\s*\}\)/
);
assert.match(syncSrc, /\.update\(\{ colaborador: nomeNovo \}\)/);
assert.match(syncSrc, /exigirGravacaoUnica\(ids\)/);
assert.match(syncSrc, /\.in\("id", lista\)/);
assert.doesNotMatch(syncSrc, /\.insert\(/);
assert.doesNotMatch(syncSrc, /from\("agendamentos"\)/);
assert.doesNotMatch(syncSrc, /\.update\(\{[^}]*status/);

const cargoSyncSrc = vagasServiceSrc.slice(
  vagasServiceSrc.indexOf("async function sincronizarCopiaCargoOperacional"),
  vagasServiceSrc.indexOf("export async function liberarFuncionarioDaVagaComprometida")
);
assert.match(cargoSyncSrc, /lerTodosOsLotes/);
assert.match(cargoSyncSrc, /exigirGravacaoUnica/);
assert.match(cargoSyncSrc, /cargo_id: params\.cargoId/);
assert.match(cargoSyncSrc, /cargo_nome: params\.cargoNome/);
assert.match(cargoSyncSrc, /\.update\(patch\)/);
assert.doesNotMatch(cargoSyncSrc, /\.insert\(/);
assert.doesNotMatch(cargoSyncSrc, /\.delete\(/);
assert.doesNotMatch(cargoSyncSrc, /listarExamesObrigatoriosPorCargo/);
assert.doesNotMatch(cargoSyncSrc, /agendamento_exames/);
assert.doesNotMatch(cargoSyncSrc, /\.update\(\{[^}]*status/);
assert.doesNotMatch(cargoSyncSrc, /\.update\(\{[^}]*aso_/);

console.log("test-contrato-vagas: OK");
