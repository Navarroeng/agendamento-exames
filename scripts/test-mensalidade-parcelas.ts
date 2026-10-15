/** Controle das 12 mensalidades da Gestão SST e o desbloqueio da implantação. */

import assert from "node:assert/strict";
import { formatDateIsoToBR } from "../lib/agendamento-datetime";
import {
  isOrcamentoEtapaLiberada,
  montarContextoAbasOrcamento,
  resolveOrcamentoEtapaAtual,
  resolveOrcamentoEtapaEstado,
} from "../lib/orcamento-etapas";
import { resolveImplantacaoEtapaAtual } from "../lib/implantacao-clientes";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import {
  planejarPersistenciaParcelas,
  resolverGradeMensalidades,
  situacaoParcelaMensalidade,
  usaControleParcelasMensalidade,
  valorMensalContratado,
} from "../lib/mensalidade-parcelas";

function aprovacao(
  partial: Partial<OrcamentoAprovacaoRecord>
): OrcamentoAprovacaoRecord {
  return {
    id: "a1",
    orcamento_id: "o1",
    quantidade_colaboradores: 10,
    valor_final: 350,
    condicao_pagamento: "12 mensalidades",
    quantidade_parcelas: null,
    valor_parcela: null,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "AGATHA",
    aprovado_em: "2026-10-14T00:00:00Z",
    contrato_enviado: true,
    contrato_enviado_em: "2026-10-14",
    contrato_assinado: true,
    contrato_assinado_em: "2026-10-14",
    contrato_salvo_em: "2026-10-14T12:00:00.000Z",
    observacao_contrato: null,
    boleto_vencimento: "2026-10-14",
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

function datas(inicio: string, dia: 10 | 20) {
  const grade = resolverGradeMensalidades({
    vigenciaInicio: inicio,
    vigenciaFim: "2027-10-14",
    dia,
    valorMensal: 350,
    hojeIso: "2026-10-15",
  });
  assert.equal(grade.ok, true);
  if (!grade.ok) return [];
  return grade.parcelas.map((item) => formatDateIsoToBR(item.vencimentoIso));
}

assert.equal(usaControleParcelasMensalidade("mensalidade", "mensal"), true);
assert.equal(usaControleParcelasMensalidade("mensalidade", null), true);
assert.equal(usaControleParcelasMensalidade("mensalidade", "avista"), false);
assert.equal(usaControleParcelasMensalidade("pontual", "mensal"), false);
assert.equal(usaControleParcelasMensalidade(null, null), false);

assert.deepEqual(datas("2026-10-14", 10), [
  "10/11/2026",
  "10/12/2026",
  "10/01/2027",
  "10/02/2027",
  "10/03/2027",
  "10/04/2027",
  "10/05/2027",
  "10/06/2027",
  "10/07/2027",
  "10/08/2027",
  "10/09/2027",
  "10/10/2027",
]);
assert.deepEqual(datas("2026-10-14", 20).slice(0, 3), [
  "20/11/2026",
  "20/12/2026",
  "20/01/2027",
]);
assert.equal(datas("2026-10-14", 20).at(-1), "20/10/2027");
assert.equal(datas("2026-12-14", 10)[0], "10/01/2027");
assert.equal(datas("2026-12-14", 20)[0], "20/01/2027");

const negociada = resolverGradeMensalidades({
  vigenciaInicio: "2026-10-14",
  dia: 10,
  valorMensal: valorMensalContratado({
    mensalidadeValorMensal: 350,
    valorFinal: 350,
  }),
  hojeIso: "2026-10-15",
});
assert.equal(negociada.ok, true);
if (negociada.ok) {
  assert.equal(negociada.parcelas.length, 12);
  assert.ok(negociada.parcelas.every((item) => item.valor === 350));
  assert.ok(negociada.parcelas.every((item) => item.pagoEmIso == null));
  assert.equal(negociada.parcelas[0]?.situacao, "em_aberto");
}

const semDados = resolverGradeMensalidades({
  vigenciaInicio: null,
  dia: null,
  valorMensal: null,
  hojeIso: "2026-10-15",
});
assert.equal(semDados.ok, false);
if (!semDados.ok) {
  assert.deepEqual(semDados.pendencias, [
    "início da vigência",
    "dia de vencimento 10 ou 20",
    "valor mensal contratado",
  ]);
}

assert.equal(
  situacaoParcelaMensalidade({
    vencimentoIso: "2026-11-10",
    pagoEmIso: null,
    hojeIso: "2026-11-10",
  }),
  "vence_hoje"
);
assert.equal(
  situacaoParcelaMensalidade({
    vencimentoIso: "2026-11-10",
    pagoEmIso: null,
    hojeIso: "2026-11-11",
  }),
  "vencida"
);
assert.equal(
  situacaoParcelaMensalidade({
    vencimentoIso: "2026-11-10",
    pagoEmIso: "2026-11-12",
    hojeIso: "2026-11-20",
  }),
  "paga"
);

const primeira = planejarPersistenciaParcelas({
  existentes: [],
  desejadas: [
    {
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 350,
      pagoEmIso: "2026-11-12",
    },
  ],
});
assert.equal(primeira.inserir.length, 1);
assert.equal(primeira.atualizarPagoEm.length, 0);

const reabertura = planejarPersistenciaParcelas({
  existentes: [
    {
      vigenciaInicio: "2026-10-14",
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 350,
      pagoEmIso: "2026-11-12",
    },
  ],
  desejadas: [
    {
      numero: 1,
      vencimentoIso: "2026-12-01",
      valor: 130,
      pagoEmIso: "2026-11-18",
    },
  ],
});
assert.equal(reabertura.inserir.length, 0);
assert.deepEqual(reabertura.atualizarPagoEm, [
  { numero: 1, pagoEmIso: "2026-11-18" },
]);

const semMudanca = planejarPersistenciaParcelas({
  existentes: [
    {
      vigenciaInicio: "2026-10-14",
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 350,
      pagoEmIso: "2026-11-18",
    },
  ],
  desejadas: [
    {
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 350,
      pagoEmIso: "2026-11-18",
    },
  ],
});
assert.equal(semMudanca.inserir.length, 0);
assert.equal(semMudanca.atualizarPagoEm.length, 0);

const reaberta = resolverGradeMensalidades({
  vigenciaInicio: "2026-10-14",
  dia: 20,
  valorMensal: 130,
  hojeIso: "2026-11-20",
  registradas: [
    {
      vigenciaInicio: "2026-10-14",
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 350,
      pagoEmIso: "2026-11-18",
    },
    {
      vigenciaInicio: "2025-10-14",
      numero: 1,
      vencimentoIso: "2025-11-10",
      valor: 200,
      pagoEmIso: "2025-11-10",
    },
  ],
});
assert.equal(reaberta.ok, true);
if (reaberta.ok) {
  assert.equal(reaberta.parcelas[0]?.vencimentoIso, "2026-11-10");
  assert.equal(reaberta.parcelas[0]?.valor, 350);
  assert.equal(reaberta.parcelas[0]?.pagoEmIso, "2026-11-18");
  assert.equal(reaberta.parcelas[0]?.situacao, "paga");
  assert.equal(reaberta.parcelas[1]?.vencimentoIso, "2026-12-20");
  assert.equal(reaberta.parcelas[1]?.valor, 130);
  assert.equal(reaberta.parcelas[1]?.pagoEmIso, null);
  assert.ok(reaberta.parcelas.every((item) => item.vencimentoIso !== "2025-11-10"));
}

const contrato = aprovacao({});
const ctx = { controleMensalidades: true };
assert.equal(
  isOrcamentoEtapaLiberada("procuracao", contrato, true, ctx),
  true
);
assert.equal(
  isOrcamentoEtapaLiberada("procuracao", contrato, true),
  false
);
assert.equal(resolveOrcamentoEtapaAtual(contrato, true, null, ctx), "procuracao");
assert.equal(resolveOrcamentoEtapaAtual(contrato, true), "financeiro");
assert.equal(
  resolveImplantacaoEtapaAtual(contrato, { controleMensalidades: true }),
  "procuracao"
);
assert.equal(
  resolveImplantacaoEtapaAtual(
    aprovacao({ boleto_pago: false, boleto_pago_em: null }),
    { controleMensalidades: true }
  ),
  "procuracao"
);

const vencidaNaoBloqueia = resolverGradeMensalidades({
  vigenciaInicio: "2026-08-14",
  dia: 10,
  valorMensal: 350,
  hojeIso: "2026-11-15",
});
assert.equal(vencidaNaoBloqueia.ok, true);
if (vencidaNaoBloqueia.ok) {
  assert.equal(vencidaNaoBloqueia.parcelas[0]?.situacao, "vencida");
}
assert.equal(
  resolveImplantacaoEtapaAtual(contrato, { controleMensalidades: true }),
  "procuracao"
);

function abaBloqueada(
  etapa: "procuracao" | "funcionarios" | "logo" | "visita" | "agendamentos",
  registro: OrcamentoAprovacaoRecord,
  controleMensalidades: boolean
): boolean {
  const ctx = montarContextoAbasOrcamento({
    fluxo: "padrao",
    controleMensalidades,
  });
  const estado = resolveOrcamentoEtapaEstado(
    etapa,
    registro,
    true,
    "financeiro",
    null,
    ctx
  );
  return estado === "bloqueada";
}

const mensalAberto = aprovacao({
  mensalidade_pagamento: "mensal",
  boleto_pago: false,
  boleto_pago_em: null,
});
assert.equal(abaBloqueada("procuracao", mensalAberto, true), false);
assert.equal(abaBloqueada("funcionarios", mensalAberto, true), true);
assert.equal(abaBloqueada("logo", mensalAberto, true), true);
assert.equal(abaBloqueada("visita", mensalAberto, true), true);
assert.equal(abaBloqueada("agendamentos", mensalAberto, true), true);
assert.equal(abaBloqueada("procuracao", mensalAberto, false), true);

const procuracaoConcluida = aprovacao({
  ...mensalAberto,
  procuracao_status: "ativa",
  procuracao_salva_em: "2026-10-14T15:00:00.000Z",
});
assert.equal(abaBloqueada("funcionarios", procuracaoConcluida, true), false);
assert.equal(abaBloqueada("logo", procuracaoConcluida, true), true);

const avista = aprovacao({ mensalidade_pagamento: "avista", boleto_pago: false });
assert.equal(abaBloqueada("procuracao", avista, false), true);

const pontual = aprovacao({ boleto_pago: false });
assert.equal(
  abaBloqueada("procuracao", pontual, usaControleParcelasMensalidade("pontual", null)),
  true
);

const reaberto = montarContextoAbasOrcamento({
  fluxo: "padrao",
  controleMensalidades: usaControleParcelasMensalidade("mensalidade", "mensal"),
});
assert.equal(
  resolveOrcamentoEtapaEstado(
    "procuracao",
    mensalAberto,
    true,
    "financeiro",
    null,
    reaberto
  ) === "bloqueada",
  false
);

console.log("test-mensalidade-parcelas: OK");
