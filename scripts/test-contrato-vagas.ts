/** Smoke: vagas contratuais — estados, CPF e drafts. */

import assert from "node:assert/strict";
import {
  buildVagaDraftsIniciais,
  contarVagasComprometidas,
  emptyVagaDraft,
  isNomeFuncionarioReal,
  labelColaboradorOuVaga,
  resolveStatusVagaRascunho,
  validarDraftsListaVagas,
  vagaStatusBloqueiaEdicao,
  type ContratoVagaDraft,
  type ContratoVagaRecord,
} from "../lib/contrato-vagas";
import { buildContratoAgendamentoContagem } from "../lib/contrato-agendamentos";
import {
  aplicarImportacaoNasVagas,
  parsePlanilhaListaFuncionarios,
} from "../lib/contrato-vagas-import";
import { resolverProximoAvisoBeneficio } from "../lib/agendamento-beneficios-contratuais";
import { isFuncionariosEtapaConcluida } from "../lib/orcamento-etapas";
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

console.log("test-contrato-vagas: OK");
