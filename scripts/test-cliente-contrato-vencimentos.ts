/**
 * Vencimentos de contratos SST pela data de Fim previsto.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  VENCIMENTOS_ENCERRADOS_VAZIO,
  VENCIMENTOS_VAZIO,
  anosDoSeletor,
  colunasVencimentos,
  contratoCanceladoOuEncerradoAntecipadamente,
  eixoQuantidadeVencimentos,
  fimPrevistoNoMes,
  limitesDoMes,
  montarVencimentosDoMes,
  periodoInicialVencimentos,
  quantidadesVencimentosPorMes,
  resumoVencimentos,
  rotuloColunaVencimento,
} from "../lib/cliente-contrato-vencimentos";
import type { ClienteContratoConsulta } from "../lib/cliente-contrato-atual";

function run(name: string, fn: () => void) {
  fn();
  console.log("OK ", name);
}

function contrato(
  partial: Partial<ClienteContratoConsulta> &
    Pick<ClienteContratoConsulta, "id" | "status" | "data_fim">
): ClienteContratoConsulta {
  return {
    cliente_id: "c1",
    data_inicio: "2026-02-19",
    quantidade_colaboradores: 8,
    valor_contrato: 1200,
    condicao_pagamento: "12 mensalidades",
    tipo_contrato: "anual",
    reajuste_percentual: null,
    observacoes: null,
    numero: "CTR-1",
    boleto_pago: false,
    aprovado_em: "2025-01-01",
    ...partial,
  };
}

const HOJE = "2026-10-23";

run("dezembro não invade janeiro", () => {
  assert.deepEqual(limitesDoMes(2026, 12), {
    inicio: "2026-12-01",
    fim: "2026-12-31",
  });
  assert.deepEqual(limitesDoMes(2027, 1), {
    inicio: "2027-01-01",
    fim: "2027-01-31",
  });
  assert.equal(limitesDoMes(2024, 2).fim, "2024-02-29");
  assert.equal(limitesDoMes(2025, 2).fim, "2025-02-28");
  assert.equal(fimPrevistoNoMes("2026-12-01", 2026, 12), true);
  assert.equal(fimPrevistoNoMes("2026-12-31", 2026, 12), true);
  assert.equal(fimPrevistoNoMes("2027-01-01", 2026, 12), false);
  assert.equal(fimPrevistoNoMes("2026-11-30", 2026, 12), false);
  assert.equal(fimPrevistoNoMes("2027-01-01", 2027, 1), true);
  assert.equal(fimPrevistoNoMes("2027-01-31", 2027, 1), true);
  assert.equal(fimPrevistoNoMes("2026-12-31", 2027, 1), false);
  assert.equal(fimPrevistoNoMes("2024-02-29", 2024, 2), true);
  assert.equal(fimPrevistoNoMes("2024-03-01", 2024, 2), false);
});

run("período inicial segue o mês de São Paulo, inclusive a virada do ano", () => {
  assert.deepEqual(periodoInicialVencimentos("2026-10-23"), {
    ano: 2026,
    mes: 10,
  });
  assert.deepEqual(periodoInicialVencimentos("2026-12-31"), {
    ano: 2026,
    mes: 12,
  });
  assert.deepEqual(periodoInicialVencimentos("2027-01-01"), {
    ano: 2027,
    mes: 1,
  });
  assert.ok(anosDoSeletor(2026, 2026).includes(2027));
});

run("AL-DA aparece em fevereiro de 2027 pelo fim previsto", () => {
  const alda = contrato({
    id: "alda",
    cliente_id: "alda",
    status: "ativo",
    numero: "CTR-ALDA",
    data_inicio: "2026-02-19",
    data_fim: "2027-02-19",
    boleto_pago: false,
    aprovado_em: "2026-02-01T15:00:00.000Z",
  });
  const fevereiro = montarVencimentosDoMes({
    ano: 2027,
    mes: 2,
    contratos: [alda],
    hojeIso: HOJE,
  });
  assert.equal(fevereiro.length, 1);
  assert.equal(fevereiro[0].fimPrevisto, "2027-02-19");
  assert.equal(fevereiro[0].situacao, "Ativo");
  assert.equal(
    montarVencimentosDoMes({
      ano: 2027,
      mes: 1,
      contratos: [alda],
      hojeIso: HOJE,
    }).length,
    0
  );
  assert.equal(
    montarVencimentosDoMes({
      ano: 2027,
      mes: 3,
      contratos: [alda],
      hojeIso: HOJE,
    }).length,
    0
  );
});

run("ativo e expirado do mês entram, sem filtrar só status ativo", () => {
  const linhas = montarVencimentosDoMes({
    ano: 2026,
    mes: 10,
    hojeIso: HOJE,
    contratos: [
      contrato({
        id: "vence",
        status: "ativo",
        data_fim: "2026-10-31",
        numero: "CTR-VENCE",
      }),
      contrato({
        id: "expirou",
        status: "ativo",
        data_inicio: "2025-10-02",
        data_fim: "2026-10-02",
        numero: "CTR-EXP",
      }),
      contrato({
        id: "renovando",
        status: "em_renovacao",
        data_fim: "2026-10-20",
        numero: "CTR-REN",
      }),
      contrato({
        id: "assinado",
        status: "assinado",
        data_fim: "2026-10-15",
        numero: "CTR-ASS",
        boleto_pago: false,
      }),
    ],
  });
  assert.deepEqual(
    linhas.map((linha) => linha.contrato.id),
    ["expirou", "assinado", "renovando", "vence"]
  );
  assert.equal(linhas[0].situacao, "Expirado");
  assert.equal(linhas.find((linha) => linha.contrato.id === "vence")?.situacao, "Próximo do vencimento");
});

run("manual e orçamento contam uma vez por contratação", () => {
  const manual = contrato({
    id: "manual",
    status: "ativo",
    orcamento_id: null,
    numero_orcamento: null,
    numero: "CTR-MANUAL",
    data_fim: "2027-02-10",
    tipo_contrato: "mensal",
    condicao_pagamento: "mensalidade",
    boleto_pago: false,
  });
  const duplicadoA = contrato({
    id: "dup-a",
    status: "aguardando_envio",
    orcamento_id: "orc-1",
    numero: "CTR-A",
    data_inicio: "",
    data_fim: "2027-02-19",
  });
  const duplicadoB = contrato({
    id: "dup-b",
    status: "ativo",
    orcamento_id: "orc-1",
    numero: "CTR-B",
    data_inicio: "2026-02-19",
    data_fim: "2027-02-19",
    modalidadeOrcamento: "pontual",
    boleto_pago: true,
  });
  const outro = contrato({
    id: "outro",
    status: "ativo",
    orcamento_id: "orc-2",
    numero: "CTR-C",
    data_fim: "2027-02-05",
    modalidadeOrcamento: "mensalidade",
    mensalidadePagamento: "avista",
    boleto_pago: false,
  });
  const linhas = montarVencimentosDoMes({
    ano: 2027,
    mes: 2,
    hojeIso: HOJE,
    contratos: [manual, duplicadoA, duplicadoB, outro],
  });
  assert.deepEqual(
    linhas.map((linha) => linha.contrato.id),
    ["outro", "manual", "dup-b"]
  );
});

run("não presume fim e ignora serviço sem vigência SST", () => {
  const linhas = montarVencimentosDoMes({
    ano: 2026,
    mes: 10,
    hojeIso: HOJE,
    contratos: [
      contrato({
        id: "sem-fim",
        status: "ativo",
        data_fim: null,
        aprovado_em: "2026-10-10",
      }),
      contrato({
        id: "sem-contrato",
        status: "ativo",
        tipo_contrato: "sem_contrato",
        data_fim: "2026-10-10",
      }),
      contrato({
        id: "prefixo",
        status: "ativo",
        data_fim: "2026-10-19T00:00:00.000Z",
        numero: "CTR-PREFIXO",
      }),
    ],
  });
  assert.deepEqual(
    linhas.map((linha) => linha.contrato.id),
    ["prefixo"]
  );
  assert.equal(linhas[0].fimPrevisto, "2026-10-19");
});

run("mensal não ganha vigência nova além da data gravada", () => {
  const mensal = contrato({
    id: "mensal",
    status: "ativo",
    tipo_contrato: "mensal",
    modalidadeOrcamento: "mensalidade",
    mensalidadePagamento: "mensal",
    data_inicio: "2025-10-31",
    data_fim: "2026-10-31",
    boleto_pago: false,
    contrato_assinado_em: "2025-10-31",
  });
  assert.equal(
    montarVencimentosDoMes({
      ano: 2026,
      mes: 10,
      contratos: [mensal],
      hojeIso: HOJE,
    }).length,
    1
  );
  assert.equal(
    montarVencimentosDoMes({
      ano: 2027,
      mes: 10,
      contratos: [mensal],
      hojeIso: HOJE,
    }).length,
    0
  );
});

run("cancelado e encerrado antecipado ficam no filtro separado", () => {
  const cancelado = contrato({
    id: "cancelado",
    status: "cancelado",
    data_fim: "2026-10-08",
    numero: "CTR-CAN",
  });
  const antecipado = contrato({
    id: "antecipado",
    status: "encerrado",
    data_fim: "2026-10-30",
    encerrado_em: "2026-10-19T02:00:00.000Z",
    numero: "CTR-ANT",
  });
  const noPrazo = contrato({
    id: "no-prazo",
    status: "encerrado",
    data_fim: "2026-10-19",
    encerrado_em: "2026-10-19T15:00:00.000Z",
    numero: "CTR-PRAZO",
  });
  const expiradoStatus = contrato({
    id: "status-encerrado",
    status: "encerrado",
    data_fim: "2026-10-04",
    encerrado_em: null,
    numero: "CTR-EXP-STATUS",
  });
  assert.equal(contratoCanceladoOuEncerradoAntecipadamente(cancelado), true);
  assert.equal(contratoCanceladoOuEncerradoAntecipadamente(antecipado), true);
  assert.equal(contratoCanceladoOuEncerradoAntecipadamente(noPrazo), false);
  assert.equal(
    contratoCanceladoOuEncerradoAntecipadamente(expiradoStatus),
    false
  );

  const base = {
    ano: 2026,
    mes: 10,
    hojeIso: HOJE,
    contratos: [cancelado, antecipado, noPrazo, expiradoStatus],
  };
  assert.deepEqual(
    montarVencimentosDoMes(base).map((linha) => linha.contrato.id),
    ["status-encerrado", "no-prazo"]
  );
  assert.deepEqual(
    montarVencimentosDoMes({ ...base, consulta: "encerrados" }).map(
      (linha) => linha.contrato.id
    ),
    ["cancelado", "antecipado"]
  );
});

run("renovação vinculada só com origem confiável", () => {
  const anterior = contrato({
    id: "anterior",
    cliente_id: "c-jet",
    status: "ativo",
    orcamento_id: "orc-antigo",
    numero: "CTR-ANTIGO",
    data_inicio: "2025-10-14",
    data_fim: "2026-10-14",
  });
  const renovado = contrato({
    id: "novo",
    cliente_id: "c-jet",
    status: "assinado",
    orcamento_id: "orc-novo",
    numero: "CTR-NOVO",
    data_inicio: "2026-10-14",
    data_fim: "2027-10-14",
  });
  const origem = new Map<string, string | null>([
    ["orc-antigo", "indicacao"],
    ["orc-novo", "renovacao"],
  ]);
  const linhas = montarVencimentosDoMes({
    ano: 2026,
    mes: 10,
    hojeIso: HOJE,
    contratos: [anterior, renovado],
    origemPorOrcamentoId: origem,
  });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].renovacao?.contratoId, "novo");
  assert.equal(linhas[0].renovacao?.numero, "CTR-NOVO");

  const semVinculo = montarVencimentosDoMes({
    ano: 2026,
    mes: 10,
    hojeIso: HOJE,
    contratos: [anterior, renovado],
    origemPorOrcamentoId: new Map([["orc-novo", "cliente_base"]]),
  });
  assert.equal(semVinculo[0].renovacao, null);

  const ambiguoA = contrato({
    id: "amb-a",
    cliente_id: "c-amb",
    status: "ativo",
    numero: "CTR-A",
    data_fim: "2026-10-14",
  });
  const ambiguoB = contrato({
    id: "amb-b",
    cliente_id: "c-amb",
    status: "ativo",
    numero: "CTR-B",
    data_fim: "2026-10-14",
  });
  const sucessor = contrato({
    id: "amb-novo",
    cliente_id: "c-amb",
    status: "ativo",
    orcamento_id: "orc-amb",
    numero: "CTR-AMB",
    data_inicio: "2026-10-14",
    data_fim: "2027-10-14",
  });
  const ambiguos = montarVencimentosDoMes({
    ano: 2026,
    mes: 10,
    hojeIso: HOJE,
    contratos: [ambiguoA, ambiguoB, sucessor],
    origemPorOrcamentoId: new Map([["orc-amb", "renovacao"]]),
  });
  assert.equal(
    ambiguos.filter((linha) => linha.renovacao).length,
    0
  );
});

run("a contagem usa a lista inteira do mês", () => {
  const contratos = Array.from({ length: 25 }, (_, index) =>
    contrato({
      id: `c-${index}`,
      status: "ativo",
      numero: `CTR-${String(index).padStart(2, "0")}`,
      data_fim: `2026-12-${String((index % 31) + 1).padStart(2, "0")}`,
    })
  );
  const linhas = montarVencimentosDoMes({
    ano: 2026,
    mes: 12,
    hojeIso: HOJE,
    contratos,
  });
  assert.equal(linhas.length, 25);
  const fins = linhas.map((linha) => linha.fimPrevisto);
  assert.deepEqual(fins, [...fins].sort());
});

run("resumo e vazio", () => {
  assert.equal(
    resumoVencimentos({ ano: 2026, mes: 10, total: 5 }),
    "Outubro/2026 — 5 contratos com término previsto"
  );
  assert.equal(
    resumoVencimentos({ ano: 2026, mes: 10, total: 1 }),
    "Outubro/2026 — 1 contrato com término previsto"
  );
  assert.equal(VENCIMENTOS_VAZIO, "Nenhum contrato com término previsto neste mês");
  assert.match(VENCIMENTOS_ENCERRADOS_VAZIO, /cancelado ou encerrado/);
});

function linhasDoAno(
  contratos: ClienteContratoConsulta[],
  ano: number,
  consulta: "principal" | "encerrados" = "principal"
) {
  return Array.from({ length: 12 }, (_, index) =>
    montarVencimentosDoMes({
      ano,
      mes: index + 1,
      contratos,
      consulta,
      hojeIso: HOJE,
    })
  ).flat();
}

run("gráfico do ano corresponde à listagem de cada mês", () => {
  const contratos = [
    contrato({
      id: "fev",
      status: "ativo",
      numero: "CTR-FEV",
      data_fim: "2026-02-19",
    }),
    contrato({
      id: "out-a",
      status: "ativo",
      numero: "CTR-OUT-A",
      data_fim: "2026-10-02",
    }),
    contrato({
      id: "out-b",
      status: "ativo",
      numero: "CTR-OUT-B",
      data_inicio: "2025-10-20",
      data_fim: "2026-10-20",
    }),
    contrato({
      id: "jun-dup-a",
      status: "aguardando_envio",
      orcamento_id: "orc-jun",
      numero: "CTR-JUN-A",
      data_inicio: "",
      data_fim: "2026-06-10",
    }),
    contrato({
      id: "jun-dup-b",
      status: "ativo",
      orcamento_id: "orc-jun",
      numero: "CTR-JUN-B",
      data_inicio: "2025-06-10",
      data_fim: "2026-06-10",
    }),
    contrato({
      id: "mar-cancelado",
      status: "cancelado",
      numero: "CTR-MAR",
      data_fim: "2026-03-15",
    }),
    contrato({
      id: "outro-ano",
      status: "ativo",
      numero: "CTR-2027",
      data_fim: "2027-02-19",
    }),
  ];

  const linhas = linhasDoAno(contratos, 2026);
  const quantidades = quantidadesVencimentosPorMes(linhas, 2026);
  assert.equal(quantidades.length, 12);
  assert.equal(quantidades[0], 0);
  assert.equal(quantidades[11], 0);
  for (let mes = 1; mes <= 12; mes += 1) {
    const lista = linhas.filter((linha) =>
      fimPrevistoNoMes(linha.fimPrevisto, 2026, mes)
    );
    const colunas = colunasVencimentos(quantidades, mes);
    assert.equal(colunas[mes - 1].quantidade, lista.length);
    assert.equal(colunas[mes - 1].selecionado, true);
    assert.equal(
      colunas.filter((coluna) => coluna.selecionado).length,
      1
    );
  }
  assert.equal(quantidades[1], 1);
  assert.equal(quantidades[5], 1);
  assert.equal(quantidades[9], 2);
  assert.equal(quantidades[2], 0);
  assert.deepEqual(
    quantidadesVencimentosPorMes(linhasDoAno(contratos, 2027), 2027),
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  );

  const encerrados = quantidadesVencimentosPorMes(
    linhasDoAno(contratos, 2026, "encerrados"),
    2026
  );
  assert.equal(encerrados[2], 1);
  assert.equal(encerrados[9], 0);

  const colunas = colunasVencimentos(quantidades, 10);
  assert.equal(colunas[5].maior, false);
  assert.equal(colunas[9].maior, true);
  const empate = colunasVencimentos(
    [2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    1
  );
  assert.equal(empate[0].maior, true);
  assert.equal(empate[2].maior, true);
  assert.equal(empate[1].maior, false);
  const vazio = colunasVencimentos(Array.from({ length: 12 }, () => 0), 4);
  assert.ok(vazio.every((coluna) => !coluna.maior));
  assert.equal(vazio[3].selecionado, true);

  for (const maximo of [0, 1, 4, 5, 17]) {
    const eixo = eixoQuantidadeVencimentos(maximo);
    assert.ok(eixo.every((valor) => Number.isInteger(valor)));
    assert.equal(eixo[0], maximo);
    assert.equal(eixo[eixo.length - 1], 0);
  }
  assert.equal(
    rotuloColunaVencimento(2027, 2, 1),
    "Fevereiro/2027 — 1 contrato"
  );
  assert.equal(
    rotuloColunaVencimento(2026, 1, 0),
    "Janeiro/2026 — 0 contratos"
  );
});

run("a tela preserva o mês e abre o contrato SST", () => {
  const pagina = readFileSync(
    "components/clientes/ClientesPage.tsx",
    "utf8"
  );
  const fechar = pagina.slice(
    pagina.indexOf("const fecharCliente"),
    pagina.indexOf("const resetForm")
  );
  assert.match(fechar, /closeView\(\)/);
  assert.doesNotMatch(fechar, /setVencimentoAno|setVencimentoMes/);
  assert.match(pagina, /Vencimentos de contratos/);
  assert.match(pagina, /abrirCliente\(id, true\)/);
  assert.match(pagina, /scrollToContratoSst=\{scrollToContratoSst\}/);

  const modal = readFileSync("components/modals/ClienteViewModal.tsx", "utf8");
  assert.match(modal, /id="cliente-contrato-sst"/);
  assert.match(modal, /scrollIntoView/);

  const servico = readFileSync(
    "services/cliente-contrato-vencimentos.service.ts",
    "utf8"
  );
  assert.match(servico, /\.gte\("data_fim", inicio\)/);
  assert.match(servico, /\.lte\("data_fim", fim\)/);
  assert.match(servico, /limitesDoMes\(params\.ano, 1\)/);
  assert.match(servico, /limitesDoMes\(params\.ano, 12\)/);
  assert.match(servico, /while \(true\)/);
  assert.doesNotMatch(servico, /\.eq\("status", "ativo"\)/);
  assert.doesNotMatch(servico, /aprovado_em/);

  const grafico = readFileSync(
    "components/clientes/ClienteContratoVencimentosChart.tsx",
    "utf8"
  );
  assert.match(grafico, /Vencimentos por mês — \{ano\}/);
  assert.match(grafico, /onSelecionarMes\(coluna\.mes\)/);
  assert.match(grafico, /title=\{descricao\}/);

  const painel = readFileSync(
    "components/clientes/ClienteContratoVencimentosPanel.tsx",
    "utf8"
  );
  assert.match(painel, /onSelecionarMes=\{onMesChange\}/);

  const hook = readFileSync(
    "hooks/useClienteContratoVencimentos.ts",
    "utf8"
  );
  assert.match(hook, /listarVencimentosDoAno/);
  assert.match(hook, /\}, \[ano, consulta\]\);/);
  assert.doesNotMatch(hook, /\}, \[ano, mes, consulta\]\);/);
});

console.log("test-cliente-contrato-vencimentos: ok");
