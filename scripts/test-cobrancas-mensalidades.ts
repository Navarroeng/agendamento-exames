/** Cobranças lê as parcelas do Financeiro e não cria outro controle. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BAIXA_JA_PAGA_MSG,
  BAIXA_VALOR_DIVERGENTE_MSG,
  consultarCobrancas,
  parcelaEntraEmCobrancas,
  resumirCobrancas,
  validarBaixaParcela,
  valorRecebidoEfetivo,
  type CobrancaParcela,
} from "../lib/cobrancas-mensalidades";
import {
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

const migration = readFileSync(
  join(root, "supabase/migrations/150_mensalidade_parcela_recebimento.sql"),
  "utf8"
);
assert.match(migration, /add column if not exists valor_recebido/);
assert.doesNotMatch(migration, /\bupdate\b/i);
assert.doesNotMatch(migration, /\binsert\b/i);

console.log("test-cobrancas-mensalidades: OK");
