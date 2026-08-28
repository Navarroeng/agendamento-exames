/** Smoke: vagas contratuais — estados, CPF e drafts. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  agendamentoOcupaVagaPrevista,
  buildVagaDraftsIniciais,
  contarCardsPorVagasContrato,
  contarVagasComprometidas,
  cpfVagaIguais,
  deveUsarVagasComoFonteDosCards,
  draftAposRemoverFuncionario,
  emptyVagaDraft,
  escolherAgendamentoValidoParaVaga,
  isClassificacaoVagasContratoCompleta,
  isNomeFuncionarioReal,
  labelColaboradorOuVaga,
  resolverDadosExibicaoVagaContrato,
  resolveStatusVagaRascunho,
  vagaPrecisaReconciliarAgendamento,
  validarDraftsListaVagas,
  vagaPermiteRemoverFuncionario,
  vagaStatusBloqueiaEdicao,
  type ContratoVagaDraft,
  type ContratoVagaRecord,
} from "../lib/contrato-vagas";
import {
  buildContagemContratoComVagas,
  buildContratoAgendamentoContagem,
} from "../lib/contrato-agendamentos";
import {
  aplicarImportacaoNasVagas,
  parsePlanilhaListaFuncionarios,
} from "../lib/contrato-vagas-import";
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
  ["Nome", "CPF", "Cargo"],
  ["Natália Porfírio", "529.982.247-25", "Cozinheira"],
  ["", "", ""],
  ["João Silva", "39053344705", "Auxiliar"],
  ["Excedente", "11144477735", "Garçom"],
]);
assert.equal(parsed.ok, true);
assert.equal(parsed.rows.length, 3);

const aplicados = aplicarImportacaoNasVagas({
  atuais: [emptyVagaDraft(1), emptyVagaDraft(2)],
  importados: parsed.rows,
  quantidadePrevista: 2,
  sobrescreverPreenchidas: true,
});
assert.equal(aplicados.aplicados, 2);
assert.equal(aplicados.excedentes.length, 1);
assert.equal(aplicados.drafts[0].colaborador, "Natália Porfírio");

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
      agendamentosRealizados: 2,
      pendentesDefinicao: 0,
      vagasComprometidas: 1,
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
assert.doesNotMatch(abaFuncionariosSrc, /Baixar modelo/);
assert.doesNotMatch(abaFuncionariosSrc, /gerarModeloListaFuncionariosXlsx/);
assert.doesNotMatch(abaFuncionariosSrc, /handleBaixarModelo/);

const importLibSrc = readFileSync(
  join(process.cwd(), "lib/contrato-vagas-import.ts"),
  "utf8"
);
assert.doesNotMatch(importLibSrc, /gerarModeloListaFuncionariosXlsx/);
assert.doesNotMatch(importLibSrc, /CONTRATO_VAGAS_IMPORT_MODELO_FILENAME/);
assert.match(importLibSrc, /export function parsePlanilhaListaFuncionarios/);
assert.match(importLibSrc, /export async function lerArquivoListaFuncionarios/);
assert.match(importLibSrc, /export function aplicarImportacaoNasVagas/);

console.log("test-contrato-vagas: OK");
