/** Cobranças lê as parcelas do Financeiro e não cria outro controle. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BAIXA_JA_PAGA_MSG,
  BAIXA_VALOR_DIVERGENTE_MSG,
  auditarParcelasMensalidadeAusentes,
  completarCobrancasComGradeFinanceiro,
  consultarCobrancas,
  decidirPersistenciaParcelaCalculada,
  escolherVigenciaFinanceiro,
  referenciaFinanceiroDaCobranca,
  parcelaEntraEmCobrancas,
  resumirCobrancas,
  validarBaixaParcela,
  valorRecebidoEfetivo,
  type CobrancaParcela,
  type FonteGradeCobranca,
} from "../lib/cobrancas-mensalidades";
import {
  parcelasParaInserirDaGrade,
  payloadAtualizacaoPagoEm,
  resolverGradeMensalidades,
} from "../lib/mensalidade-parcelas";

function parcela(
  partial: Partial<CobrancaParcela> & Pick<CobrancaParcela, "id" | "vencimentoIso">
): CobrancaParcela {
  return {
    aprovacaoId: "aprovacao",
    orcamentoId: "orcamento",
    numeroOrcamento: "ORC-2026-0001",
    numeroContrato: "CT-1",
    empresa: "Alfa Ltda",
    cnpj: "12.345.678/0001-90",
    numero: 1,
    valor: 350,
    pagoEmIso: null,
    valorRecebido: null,
    comprovantePath: null,
    comprovanteNome: null,
    situacao: "em_aberto",
    statusOrcamento: "aprovado",
    ...partial,
  };
}

assert.equal(
  parcelaEntraEmCobrancas({
    modalidade: "mensalidade",
    mensalidadePagamento: "mensal",
    semVigencia: false,
  }),
  true
);
assert.equal(
  parcelaEntraEmCobrancas({
    modalidade: "mensalidade",
    mensalidadePagamento: null,
    semVigencia: false,
  }),
  true
);
assert.equal(
  parcelaEntraEmCobrancas({
    modalidade: "mensalidade",
    mensalidadePagamento: "avista",
    semVigencia: false,
  }),
  false
);
assert.equal(
  parcelaEntraEmCobrancas({
    modalidade: "pontual",
    mensalidadePagamento: "mensal",
    semVigencia: false,
  }),
  false
);
assert.equal(
  parcelaEntraEmCobrancas({
    modalidade: "mensalidade",
    mensalidadePagamento: "mensal",
    semVigencia: true,
  }),
  false
);

const base = [
  parcela({
    id: "aberta",
    vencimentoIso: "2026-10-31",
    numero: 2,
    empresa: "Beta",
    cnpj: "98.765.432/0001-10",
  }),
  parcela({
    id: "vencida-setembro",
    vencimentoIso: "2026-09-10",
    numero: 1,
    valor: 200,
    empresa: "Alfa Ltda",
    statusOrcamento: "contrato_encerrado",
  }),
  parcela({
    id: "paga-outubro",
    vencimentoIso: "2026-10-10",
    numero: 1,
    pagoEmIso: "2026-11-02",
    valorRecebido: null,
    empresa: "Alfa Ltda",
  }),
  parcela({
    id: "vence-hoje",
    vencimentoIso: "2026-10-29",
    numero: 3,
    valor: 100,
    empresa: "Gama",
  }),
  parcela({
    id: "vencida-outubro",
    vencimentoIso: "2026-10-05",
    numero: 4,
    valor: 80,
    empresa: "Delta",
    statusOrcamento: "cancelado",
  }),
];

const outubro = consultarCobrancas({
  parcelas: base,
  hojeIso: "2026-10-29",
  competencia: { year: 2026, month: 10 },
  busca: "",
  situacao: "todas",
  todosVencidos: false,
  page: 1,
});

assert.deepEqual(
  outubro.linhas.map((item) => item.id),
  ["vencida-outubro", "paga-outubro", "vence-hoje", "aberta"]
);
assert.equal(
  outubro.linhas.find((item) => item.id === "paga-outubro")?.situacao,
  "paga"
);
assert.equal(
  outubro.linhas.some((item) => item.id === "vencida-setembro"),
  false
);

const soPagas = consultarCobrancas({
  parcelas: base,
  hojeIso: "2026-10-29",
  competencia: { year: 2026, month: 10 },
  busca: "",
  situacao: "pagas",
  todosVencidos: false,
  page: 1,
});
assert.deepEqual(
  soPagas.linhas.map((item) => item.id),
  ["paga-outubro"]
);
assert.deepEqual(soPagas.resumo, outubro.resumo);

const emAberto = consultarCobrancas({
  parcelas: base,
  hojeIso: "2026-10-29",
  competencia: { year: 2026, month: 10 },
  busca: "",
  situacao: "em_aberto",
  todosVencidos: false,
  page: 1,
});
assert.deepEqual(
  emAberto.linhas.map((item) => item.id),
  ["vence-hoje", "aberta"]
);

assert.equal(outubro.resumo.previstoCentavos, (350 + 350 + 100 + 80) * 100);
assert.equal(outubro.resumo.recebidoCentavos, 350 * 100);
assert.equal(outubro.resumo.emAbertoCentavos, (350 + 100 + 80) * 100);
assert.equal(outubro.resumo.vencidoCentavos, 80 * 100);
assert.equal(
  outubro.resumo.recebidoCentavos + outubro.resumo.emAbertoCentavos,
  outubro.resumo.previstoCentavos
);
assert.ok(outubro.resumo.vencidoCentavos < outubro.resumo.emAbertoCentavos);
assert.ok(
  outubro.resumo.vencidoCentavos +
    outubro.resumo.emAbertoCentavos +
    outubro.resumo.recebidoCentavos >
    outubro.resumo.previstoCentavos
);

const buscaNome = consultarCobrancas({
  parcelas: base,
  hojeIso: "2026-10-29",
  competencia: { year: 2026, month: 10 },
  busca: "alfa",
  situacao: "todas",
  todosVencidos: false,
  page: 1,
});
assert.ok(buscaNome.linhas.every((item) => item.empresa === "Alfa Ltda"));
assert.equal(buscaNome.resumo.previstoCentavos, 350 * 100);

const buscaCnpj = consultarCobrancas({
  parcelas: base,
  hojeIso: "2026-10-29",
  competencia: { year: 2026, month: 10 },
  busca: "98765432000110",
  situacao: "todas",
  todosVencidos: false,
  page: 1,
});
assert.deepEqual(
  buscaCnpj.linhas.map((item) => item.id),
  ["aberta"]
);

const todosVencidos = consultarCobrancas({
  parcelas: base,
  hojeIso: "2026-10-29",
  competencia: { year: 2026, month: 10 },
  busca: "",
  situacao: "todas",
  todosVencidos: true,
  page: 1,
});
assert.deepEqual(
  todosVencidos.linhas.map((item) => item.id),
  ["vencida-setembro", "vencida-outubro"]
);
assert.equal(todosVencidos.resumo.previstoCentavos, (200 + 80) * 100);
assert.equal(todosVencidos.resumo.recebidoCentavos, 0);
assert.equal(todosVencidos.resumo.emAbertoCentavos, (200 + 80) * 100);
assert.equal(todosVencidos.resumo.vencidoCentavos, (200 + 80) * 100);
assert.ok(
  todosVencidos.linhas.some((item) => item.statusOrcamento === "contrato_encerrado")
);
assert.ok(
  todosVencidos.linhas.some((item) => item.statusOrcamento === "cancelado")
);

const muitas = Array.from({ length: 30 }, (_, index) =>
  parcela({
    id: `p${index}`,
    numero: (index % 12) + 1,
    vencimentoIso: `2026-10-${String((index % 27) + 1).padStart(2, "0")}`,
    empresa: index % 2 === 0 ? "A" : "B",
  })
);
const pagina1 = consultarCobrancas({
  parcelas: muitas,
  hojeIso: "2026-10-29",
  competencia: { year: 2026, month: 10 },
  busca: "",
  situacao: "todas",
  todosVencidos: false,
  page: 1,
});
const pagina2 = consultarCobrancas({
  parcelas: muitas,
  hojeIso: "2026-10-29",
  competencia: { year: 2026, month: 10 },
  busca: "",
  situacao: "todas",
  todosVencidos: false,
  page: 2,
});
assert.equal(pagina1.linhas.length, 25);
assert.equal(pagina2.linhas.length, 5);
assert.equal(pagina1.total, 30);
assert.ok(
  pagina1.linhas[0].vencimentoIso <=
    pagina1.linhas[pagina1.linhas.length - 1].vencimentoIso
);

assert.equal(
  validarBaixaParcela({
    pagoEmAtual: null,
    valorPrevisto: 350,
    valorRecebido: 350,
    pagoEmIso: "2026-10-29",
  }).ok,
  true
);
assert.equal(
  validarBaixaParcela({
    pagoEmAtual: "2026-10-01",
    valorPrevisto: 350,
    valorRecebido: 350,
    pagoEmIso: "2026-10-29",
  }).ok,
  false
);
const divergente = validarBaixaParcela({
  pagoEmAtual: null,
  valorPrevisto: 350,
  valorRecebido: 300,
  pagoEmIso: "2026-10-29",
});
assert.equal(divergente.ok, false);
if (!divergente.ok) assert.equal(divergente.mensagem, BAIXA_VALOR_DIVERGENTE_MSG);
const jaPaga = validarBaixaParcela({
  pagoEmAtual: "2026-10-01",
  valorPrevisto: 350,
  valorRecebido: 350,
  pagoEmIso: "2026-10-29",
});
assert.equal(jaPaga.ok, false);
if (!jaPaga.ok) assert.equal(jaPaga.mensagem, BAIXA_JA_PAGA_MSG);

const pagaSemValor = parcela({
  id: "legado",
  vencimentoIso: "2026-10-10",
  pagoEmIso: "2026-10-10",
  valorRecebido: null,
  situacao: "paga",
});
assert.equal(valorRecebidoEfetivo({ ...pagaSemValor, situacao: "paga" }), 350);
assert.equal(
  resumirCobrancas([{ ...pagaSemValor, situacao: "paga" }]).recebidoCentavos,
  35000
);

const grade = resolverGradeMensalidades({
  vigenciaInicio: "2026-10-14",
  dia: 10,
  valorMensal: 350,
  hojeIso: "2026-10-15",
  registradas: [
    {
      vigenciaInicio: "2026-10-14",
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 350,
      pagoEmIso: "2026-11-12",
      valorRecebido: 350,
      comprovantePath: "aprovacao/comprovante.pdf",
      comprovanteNome: "comprovante.pdf",
    },
  ],
});
assert.equal(grade.ok, true);
if (grade.ok) {
  assert.equal(grade.parcelas[0]?.valorRecebido, 350);
  assert.equal(grade.parcelas[0]?.comprovanteNome, "comprovante.pdf");
  assert.equal(grade.parcelas[0]?.situacao, "paga");
  assert.equal(grade.parcelas[1]?.valorRecebido, null);
  assert.equal(grade.parcelas[1]?.pagoEmIso, null);
}

assert.deepEqual(payloadAtualizacaoPagoEm("2026-10-29"), {
  pago_em: "2026-10-29",
});
assert.deepEqual(payloadAtualizacaoPagoEm(null), {
  pago_em: null,
  valor_recebido: null,
  comprovante_path: null,
  comprovante_nome: null,
  comprovante_tipo: null,
  comprovante_tamanho: null,
});

const root = process.cwd();
const lista = readFileSync(join(root, "services/cobrancas.service.ts"), "utf8");
assert.doesNotMatch(lista, /\.insert\(/);
assert.doesNotMatch(lista, /\.update\(/);
assert.match(lista, /Não insere nem altera/);

const service = readFileSync(
  join(root, "services/mensalidade-parcelas.service.ts"),
  "utf8"
);
const baixa = service.slice(
  service.indexOf("export async function registrarBaixaParcelaMensalidade")
);
assert.match(baixa, /\.is\("pago_em", null\)/);
assert.match(baixa, /pago_em: params\.pagoEmIso/);
assert.match(baixa, /valor_recebido: params\.valorRecebido/);
assert.doesNotMatch(baixa, /payloadLegado/);
assert.doesNotMatch(baixa, /financeiro_salvo_em/);
assert.doesNotMatch(baixa, /boleto_pago/);
assert.doesNotMatch(baixa, /vencimento:/);
assert.match(service, /payloadAtualizacaoPagoEm/);

const pagina = readFileSync(
  join(root, "components/cobrancas/CobrancasPage.tsx"),
  "utf8"
);
assert.doesNotMatch(pagina, /salvarControleMensalidades/);
assert.doesNotMatch(pagina, /location\.reload/);
assert.doesNotMatch(pagina, /boleto_pago/);
assert.match(pagina, /registrarBaixaParcelaMensalidade/);
assert.match(pagina, />Orçamento</);
assert.doesNotMatch(pagina, /Orçamento\/contrato/i);
assert.doesNotMatch(pagina, /rotuloContratoCobranca/);
assert.match(pagina, /referenciaFinanceiroDaCobranca\(parcela\)/);
assert.match(pagina, /openProcesso\(\s*alvo\.orcamentoId,\s*"financeiro"\s*\)/);
assert.match(pagina, /ancorarAba="financeiro"/);
assert.match(pagina, /carregar\(\{ silent: true \}\)/);

const mesmoClienteA = parcela({
  id: "a",
  vencimentoIso: "2026-10-31",
  empresa: "Alfa Ltda",
  orcamentoId: "orc-a",
  numeroOrcamento: "ORC-A",
});
const mesmoClienteB = parcela({
  id: "b",
  vencimentoIso: "2026-10-31",
  empresa: "Alfa Ltda",
  orcamentoId: "orc-b",
  numeroOrcamento: "ORC-B",
});
assert.deepEqual(referenciaFinanceiroDaCobranca(mesmoClienteA), {
  orcamentoId: "orc-a",
  numeroOrcamento: "ORC-A",
  empresa: "Alfa Ltda",
});
assert.notEqual(
  referenciaFinanceiroDaCobranca(mesmoClienteA).orcamentoId,
  referenciaFinanceiroDaCobranca(mesmoClienteB).orcamentoId
);
assert.equal(
  referenciaFinanceiroDaCobranca(mesmoClienteB).numeroOrcamento,
  "ORC-B"
);

const migration = readFileSync(
  join(root, "supabase/migrations/150_mensalidade_parcela_recebimento.sql"),
  "utf8"
);
assert.match(migration, /add column if not exists valor_recebido/);
assert.doesNotMatch(migration, /\bupdate\b/i);
assert.doesNotMatch(migration, /\binsert\b/i);

function fonteGrade(
  partial: Partial<FonteGradeCobranca> &
    Pick<FonteGradeCobranca, "aprovacaoId" | "numeroOrcamento" | "empresa">
): FonteGradeCobranca {
  return {
    orcamentoId: partial.aprovacaoId,
    numeroContrato: "CT",
    cnpj: null,
    statusOrcamento: "aprovado",
    modalidade: "mensalidade",
    mensalidadePagamento: "mensal",
    vigenciaInicio: "2026-10-15",
    vigenciaFim: "2027-10-15",
    dia: 10,
    vencimentoRegra: null,
    valorMensal: 130,
    valorFinal: null,
    registradas: [],
    ...partial,
  };
}

const jet = parcela({
  id: "jet",
  aprovacaoId: "ap-jet",
  orcamentoId: "orc-jet",
  numeroOrcamento: "ORC-2026-0075",
  empresa: "JET SERVICE BOMBAS",
  valor: 170,
  vencimentoIso: "2026-11-10",
  numero: 1,
});
const trackers = parcela({
  id: "trackers",
  aprovacaoId: "ap-trackers",
  orcamentoId: "orc-trackers",
  numeroOrcamento: "ORC-2026-0077",
  empresa: "TRACKERS COMERCIO EXTERIOR LTDA",
  valor: 150,
  vencimentoIso: "2026-11-10",
  numero: 1,
});
const fonteGo = fonteGrade({
  aprovacaoId: "ap-0080",
  orcamentoId: "orc-0080",
  numeroOrcamento: "ORC-2026-0080",
  empresa: "GO GLOBAL CHINA ASSESSORIA EMPRESARIAL & COMERCIO LTDA.",
  valorMensal: 130,
});
const fonteOutra = fonteGrade({
  aprovacaoId: "ap-outra",
  orcamentoId: "orc-outra",
  numeroOrcamento: "ORC-2026-0091",
  empresa: "OFICINA LESTE LTDA",
  vigenciaInicio: "2026-11-03",
  vigenciaFim: "2027-11-03",
  valorMensal: 80,
});
const fonteAvista = fonteGrade({
  aprovacaoId: "ap-avista",
  numeroOrcamento: "ORC-2026-0092",
  empresa: "PAGAMENTO A VISTA LTDA",
  mensalidadePagamento: "avista",
  valorMensal: 999,
});
const fontePontual = fonteGrade({
  aprovacaoId: "ap-pontual",
  numeroOrcamento: "ORC-2026-0093",
  empresa: "PONTUAL LTDA",
  modalidade: "pontual",
  valorMensal: 999,
});

const semGradeSalva = completarCobrancasComGradeFinanceiro(
  [jet, trackers],
  [fonteGo, fonteOutra, fonteAvista, fontePontual]
);
const consultaNovembro = {
  parcelas: semGradeSalva,
  hojeIso: "2026-11-05",
  competencia: { year: 2026, month: 11 },
  busca: "",
  situacao: "todas" as const,
  todosVencidos: false,
  page: 1,
};
const novembro = consultarCobrancas(consultaNovembro);
assert.equal(novembro.resumo.previstoCentavos, 45000);
assert.equal(novembro.total, 3);
assert.deepEqual(
  novembro.linhas.map((linha) => linha.numeroOrcamento).sort(),
  ["ORC-2026-0075", "ORC-2026-0077", "ORC-2026-0080"]
);
const parcelaGo = novembro.linhas.find(
  (linha) => linha.numeroOrcamento === "ORC-2026-0080"
);
assert.equal(parcelaGo?.valor, 130);
assert.equal(parcelaGo?.vencimentoIso, "2026-11-10");
assert.equal(parcelaGo?.pagoEmIso, null);
assert.equal(parcelaGo?.numero, 1);

for (let indice = 0; indice < 12; indice += 1) {
  const monthIndex = 10 + indice;
  const year = 2026 + Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  const consulta = consultarCobrancas({
    ...consultaNovembro,
    competencia: { year, month },
  });
  const daGo = consulta.linhas.filter(
    (linha) => linha.numeroOrcamento === "ORC-2026-0080"
  );
  assert.equal(daGo.length, 1, `${year}-${month}`);
  assert.equal(daGo[0]?.valor, 130);
  assert.equal(daGo[0]?.pagoEmIso, null);
  assert.equal(
    consulta.linhas.some((linha) => linha.numeroOrcamento === "ORC-2026-0092"),
    false
  );
  assert.equal(
    consulta.linhas.some((linha) => linha.numeroOrcamento === "ORC-2026-0093"),
    false
  );
}

const dezembro = consultarCobrancas({
  ...consultaNovembro,
  competencia: { year: 2026, month: 12 },
});
assert.equal(
  dezembro.linhas.some((linha) => linha.numeroOrcamento === "ORC-2026-0080"),
  true
);
assert.equal(
  dezembro.linhas.find((linha) => linha.numeroOrcamento === "ORC-2026-0091")
    ?.valor,
  80
);
assert.equal(
  dezembro.linhas.find((linha) => linha.numeroOrcamento === "ORC-2026-0091")
    ?.vencimentoIso,
  "2026-12-10"
);

const salvaParcial = parcela({
  id: "real-parcial",
  aprovacaoId: "ap-parcial",
  orcamentoId: "orc-parcial",
  numeroOrcamento: "ORC-2026-0100",
  empresa: "PARCIAL LTDA",
  numero: 1,
  valor: 99,
  vencimentoIso: "2026-11-18",
  pagoEmIso: "2026-11-02",
  valorRecebido: 99,
  situacao: "paga",
});
const comParcial = completarCobrancasComGradeFinanceiro(
  [salvaParcial],
  [
    fonteGrade({
      aprovacaoId: "ap-parcial",
      orcamentoId: "orc-parcial",
      numeroOrcamento: "ORC-2026-0100",
      empresa: "PARCIAL LTDA",
      vigenciaInicio: "2026-10-01",
      vigenciaFim: "2027-10-01",
      valorMensal: 210,
      registradas: [
        {
          vigenciaInicio: "2026-10-01",
          numero: 1,
          vencimentoIso: "2026-11-18",
          valor: 99,
          pagoEmIso: "2026-11-02",
          valorRecebido: 99,
        },
      ],
    }),
  ]
);
const novembroParcial = comParcial.filter(
  (item) => item.aprovacaoId === "ap-parcial" && item.vencimentoIso.startsWith("2026-11")
);
assert.equal(novembroParcial.length, 1);
assert.equal(novembroParcial[0]?.id, "real-parcial");
assert.equal(novembroParcial[0]?.valor, 99);
assert.equal(novembroParcial[0]?.vencimentoIso, "2026-11-18");
assert.equal(novembroParcial[0]?.pagoEmIso, "2026-11-02");
const segundaParcial = comParcial.find(
  (item) => item.aprovacaoId === "ap-parcial" && item.numero === 2
);
assert.equal(segundaParcial?.vencimentoIso, "2026-12-10");
assert.equal(segundaParcial?.valor, 210);
assert.equal(segundaParcial?.pagoEmIso, null);

const inserirParcial = parcelasParaInserirDaGrade({
  vigenciaInicio: "2026-10-01",
  vigenciaFim: "2027-10-01",
  dia: 10,
  valorMensal: 210,
  registradas: [
    {
      vigenciaInicio: "2026-10-01",
      numero: 1,
      vencimentoIso: "2026-11-18",
      valor: 99,
      pagoEmIso: "2026-11-02",
    },
  ],
});
assert.equal(inserirParcial.some((item) => item.numero === 1), false);
assert.equal(inserirParcial.length, 11);
assert.ok(inserirParcial.every((item) => item.pagoEmIso == null));
assert.equal(inserirParcial[0]?.vencimentoIso, "2026-12-10");
assert.equal(inserirParcial[0]?.valor, 210);

const ausentes = auditarParcelasMensalidadeAusentes([
  fonteGo,
  fonteOutra,
  fonteAvista,
  fontePontual,
]);
assert.deepEqual(
  ausentes.map((item) => item.numeroOrcamento).sort(),
  ["ORC-2026-0080", "ORC-2026-0091"]
);
assert.equal(ausentes.find((item) => item.numeroOrcamento === "ORC-2026-0080")?.numeros.length, 12);

assert.equal(
  escolherVigenciaFinanceiro([
    {
      status: "ativo",
      data_inicio: "2026-10-01",
      data_fim: "2027-10-01",
      created_at: "2026-09-01T00:00:00Z",
      numero: "CT-VELHO",
    },
    {
      status: "encerrado",
      data_inicio: "2026-01-01",
      data_fim: "2026-12-01",
      created_at: "2026-10-01T00:00:00Z",
      numero: "CT-NOVO",
    },
  ])?.numero,
  "CT-VELHO"
);
assert.equal(
  escolherVigenciaFinanceiro([
    {
      status: "ativo",
      data_inicio: "2026-10-01",
      data_fim: "2026-10-01",
      created_at: "2026-10-02T00:00:00Z",
      numero: "CT-RUIM",
    },
    {
      status: "ativo",
      data_inicio: "2026-09-01",
      data_fim: "2027-09-01",
      created_at: "2026-09-01T00:00:00Z",
      numero: "CT-BOM",
    },
  ]),
  null
);

const gradePaginada = Array.from({ length: 24 }, (_, indice) =>
  parcela({
    id: `pg-${indice}`,
    aprovacaoId: `ap-pg-${indice}`,
    orcamentoId: `orc-pg-${indice}`,
    numeroOrcamento: `ORC-PG-${indice}`,
    empresa: `Empresa ${String(indice).padStart(2, "0")}`,
    valor: 10,
    vencimentoIso: "2026-11-10",
    numero: 1,
  })
);
const listaPaginada = completarCobrancasComGradeFinanceiro(gradePaginada, [
  fonteGrade({
    aprovacaoId: "ap-g1",
    numeroOrcamento: "ORC-G1",
    empresa: "Grade Um",
    valorMensal: 11,
  }),
  fonteGrade({
    aprovacaoId: "ap-g2",
    numeroOrcamento: "ORC-G2",
    empresa: "Grade Dois",
    valorMensal: 12,
  }),
]);
const gradePagina1 = consultarCobrancas({
  parcelas: listaPaginada,
  hojeIso: "2026-11-05",
  competencia: { year: 2026, month: 11 },
  busca: "",
  situacao: "todas",
  todosVencidos: false,
  page: 1,
  pageSize: 25,
});
const gradePagina2 = consultarCobrancas({
  parcelas: listaPaginada,
  hojeIso: "2026-11-05",
  competencia: { year: 2026, month: 11 },
  busca: "",
  situacao: "todas",
  todosVencidos: false,
  page: 2,
  pageSize: 25,
});
assert.equal(gradePagina1.total, 26);
assert.equal(gradePagina1.linhas.length, 25);
assert.equal(gradePagina1.totalPages, 2);
assert.equal(gradePagina2.linhas.length, 1);
assert.equal(gradePagina1.resumo.previstoCentavos, 24000 + 1100 + 1200);

assert.match(lista, /completarCobrancasComGradeFinanceiro/);
assert.doesNotMatch(pagina, /inserirParcelasMensalidadeAusentes/);
assert.match(pagina, /parcelaOrigemId/);
assert.match(pagina, /id: salva\.id/);
assert.match(
  service.slice(0, service.indexOf("export async function registrarBaixaParcelaMensalidade")),
  /vencimento: decisao\.vencimentoIso/
);
assert.match(baixa, /idPersistidoParaBaixa\(params\.parcelaId\)/);
assert.match(baixa, /\.eq\("id", parcelaId\)/);

const idGo = "grade:ap-0080:2026-10-15:1";
const inserirGo = decidirPersistenciaParcelaCalculada({ id: idGo, fonte: fonteGo });
assert.equal(inserirGo.acao, "inserir");
if (inserirGo.acao === "inserir") {
  assert.equal(inserirGo.vencimentoIso, "2026-11-10");
  assert.equal(inserirGo.valor, 130);
  assert.equal(inserirGo.numero, 1);
}
const inserirSegunda = decidirPersistenciaParcelaCalculada({
  id: "grade:ap-0080:2026-10-15:2",
  fonte: fonteGo,
});
assert.equal(inserirSegunda.acao, "inserir");
if (inserirSegunda.acao === "inserir") {
  assert.equal(inserirSegunda.vencimentoIso, "2026-12-10");
  assert.equal(inserirSegunda.valor, 130);
}
const jaGravada = decidirPersistenciaParcelaCalculada({
  id: "grade:ap-parcial:2026-10-01:1",
  fonte: fonteGrade({
    aprovacaoId: "ap-parcial",
    numeroOrcamento: "ORC-2026-0100",
    empresa: "PARCIAL LTDA",
    vigenciaInicio: "2026-10-01",
    vigenciaFim: "2027-10-01",
    valorMensal: 210,
    registradas: [
      {
        vigenciaInicio: "2026-10-01",
        numero: 1,
        vencimentoIso: "2026-11-18",
        valor: 99,
        pagoEmIso: "2026-11-02",
        valorRecebido: 99,
      },
    ],
  }),
});
assert.equal(jaGravada.acao, "ja_gravada");
assert.equal(
  decidirPersistenciaParcelaCalculada({
    id: "grade:ap-avista:2026-10-15:1",
    fonte: fonteAvista,
  }).acao,
  "recusar"
);
assert.equal(
  decidirPersistenciaParcelaCalculada({
    id: "grade:ap-0080:2026-09-01:1",
    fonte: fonteGo,
  }).acao,
  "recusar"
);
assert.equal(
  decidirPersistenciaParcelaCalculada({
    id: "uuid-real",
    fonte: fonteGo,
  }).acao,
  "recusar"
);
const aprovacaoService = readFileSync(
  join(root, "services/orcamento-aprovacao.service.ts"),
  "utf8"
);
assert.match(aprovacaoService, /inserirParcelasMensalidadeAusentes/);
const parcelasService = readFileSync(
  join(root, "services/mensalidade-parcelas.service.ts"),
  "utf8"
);
assert.match(parcelasService, /pago_em: null/);

console.log("test-cobrancas-mensalidades: OK");
