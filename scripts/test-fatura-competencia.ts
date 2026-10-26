/**
 * Competência da listagem de Faturas Clientes e consistência dos indicadores.
 * Executar: npx tsx scripts/test-fatura-competencia.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildResumoClientesMes } from "../lib/fatura-mes-resumo";
import { faturaMatchesMesReferencia } from "../lib/fatura-filters";
import {
  coletarPaginas,
  competenciaIsoDaFatura,
  encontrarFaturaQueImpedeEmissao,
  filtroOrFaturasDaCompetencia,
  faturaPertenceACompetencia,
} from "../lib/fatura-competencia";
import type { AgendamentoWithExames, FaturaRecord } from "../lib/types";

function ag(
  id: string,
  cliente: string,
  data: string,
  valor: number
): AgendamentoWithExames {
  return {
    id,
    cliente_nome: cliente,
    data_agendamento: data,
    status: "agendado",
    colaborador: "Colab",
    clinica_nome: "Clínica A",
    responsavel: "Resp",
    aso: "Admissional",
    agendamento_exames: [
      {
        id: `${id}-e1`,
        agendamento_id: id,
        tipo_exame: "Clínico",
        valor_cliente: valor,
        custo_clinica: 0,
      },
    ],
  } as AgendamentoWithExames;
}

function fatura(
  partial: Partial<FaturaRecord> & Pick<FaturaRecord, "id" | "referencia_nome">
): FaturaRecord {
  const mes = partial.mes_referencia ?? "2026-08";
  return {
    numero: partial.numero ?? `FAT-${partial.id}`,
    tipo: "cliente",
    referencia_id: partial.referencia_id ?? null,
    periodo_inicio: partial.periodo_inicio ?? `${mes}-01`,
    periodo_fim: partial.periodo_fim ?? `${mes}-31`,
    mes_referencia: mes,
    data_emissao: partial.data_emissao ?? null,
    data_vencimento: partial.data_vencimento ?? `${mes}-20`,
    valor_total: partial.valor_total ?? 100,
    total_exames: 1,
    status: partial.status ?? "emitida",
    gerado_por: "Teste",
    pago: partial.pago ?? false,
    data_pagamento: partial.data_pagamento ?? null,
    observacao_pagamento: null,
    comprovante_pagamento_path: partial.comprovante_pagamento_path ?? null,
    comprovante_pagamento_nome: null,
    conferido_em: null,
    conferido_por: null,
    fatura_clinica_path: null,
    fatura_clinica_nome: null,
    fatura_clinica_tipo: null,
    fatura_clinica_tamanho: null,
    observacao_conferencia: null,
    conferencia_registrada_em: null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: partial.created_at ?? "2026-08-01T00:00:00.000Z",
    updated_at: partial.created_at ?? "2026-08-01T00:00:00.000Z",
    ...partial,
  };
}

assert.equal(competenciaIsoDaFatura({
  mes_referencia: "2026-08",
  periodo_inicio: "2026-09-01",
}), "2026-08");
assert.equal(competenciaIsoDaFatura({
  mes_referencia: null,
  periodo_inicio: "2026-07-15T12:00:00.000Z",
}), "2026-07");
assert.equal(competenciaIsoDaFatura({
  mes_referencia: "2026-08-01",
  periodo_inicio: "2026-09-01",
}), "2026-08");
assert.equal(competenciaIsoDaFatura({
  mes_referencia: "08/2026",
  periodo_inicio: null,
}), "2026-08");

assert.equal(
  faturaMatchesMesReferencia(
    { mes_referencia: "2026-08", periodo_inicio: "2026-09-01" },
    "08/2026"
  ),
  faturaPertenceACompetencia(
    { mes_referencia: "2026-08", periodo_inicio: "2026-09-01" },
    "2026-08"
  )
);
assert.equal(
  faturaPertenceACompetencia(
    { mes_referencia: null, periodo_inicio: "2026-07-01" },
    "07/2026"
  ),
  true
);
assert.equal(
  faturaPertenceACompetencia(
    { mes_referencia: "2026-08", periodo_inicio: "2026-09-01" },
    "09/2026"
  ),
  false,
  "periodo_inicio não troca a competência quando mes_referencia existe"
);

const filtro = filtroOrFaturasDaCompetencia("08/2026");
assert.ok(filtro);
assert.match(filtro, /mes_referencia\.eq\.2026-08/);
assert.match(filtro, /mes_referencia\.like\.2026-08%/);
assert.match(filtro, /periodo_inicio\.gte\.2026-08-01/);
assert.match(filtro, /periodo_inicio\.lt\.2026-09-01/);
assert.equal(filtroOrFaturasDaCompetencia("13/2026"), null);

async function assertPaginacao() {
  const paginas: number[] = [];
  const coletadas = await coletarPaginas(async (from, pageSize) => {
    paginas.push(from);
    assert.equal(pageSize, 1000);
    const fim = Math.min(2500, from + pageSize);
    return Array.from({ length: fim - from }, (_, i) => from + i);
  }, 1000);
  assert.equal(coletadas.length, 2500);
  assert.deepEqual(paginas, [0, 1000, 2000]);

  const paginasCurtas: number[] = [];
  const curtas = await coletarPaginas(async (from, pageSize) => {
    paginasCurtas.push(from);
    assert.equal(pageSize, 100);
    const fim = Math.min(250, from + pageSize);
    return Array.from({ length: fim - from }, (_, i) => from + i);
  }, 100);
  assert.equal(curtas.length, 250);
  assert.equal(paginasCurtas.length, 3, "não para na primeira página de 100");
}

const recentes = Array.from({ length: 120 }, (_, i) =>
  fatura({
    id: `nova-${i}`,
    referencia_nome: `Cliente Novo ${i}`,
    mes_referencia: "2026-10",
    periodo_inicio: "2026-10-01",
    status: "emitida",
    pago: true,
    valor_total: 10,
    created_at: `2026-10-${String((i % 27) + 1).padStart(2, "0")}T00:00:00.000Z`,
    numero: `FAT-CLI-2026-${String(200 + i).padStart(5, "0")}`,
  })
);

const julho = Array.from({ length: 40 }, (_, i) =>
  fatura({
    id: `jul-${i}`,
    referencia_nome: `Cliente Julho ${i}`,
    referencia_id: `cli-jul-${i}`,
    mes_referencia: "2026-07",
    periodo_inicio: "2026-07-01",
    status: "emitida",
    pago: true,
    valor_total: 100,
    data_emissao: "2026-08-02",
    data_pagamento: "2026-08-10",
    comprovante_pagamento_path: `jul-${i}/comprovante.pdf`,
    created_at: "2026-08-02T10:00:00.000Z",
    numero: `FAT-CLI-2026-${String(i + 1).padStart(5, "0")}`,
  })
);

const firenze = fatura({
  id: "firenze",
  numero: "FAT-CLI-2026-00084",
  referencia_nome: "ALUMINIO FIRENZE",
  referencia_id: "cli-firenze",
  mes_referencia: "2026-08",
  periodo_inicio: "2026-08-01",
  status: "emitida",
  pago: true,
  valor_total: 1895,
  data_emissao: "2026-09-01",
  data_pagamento: "2026-09-15",
  comprovante_pagamento_path: "firenze/comprovante.pdf",
  created_at: "2026-09-01T12:00:00.000Z",
});

const todas = [...julho, firenze, ...recentes];
const janela100 = [...todas]
  .sort((a, b) => b.created_at.localeCompare(a.created_at))
  .slice(0, 100);
assert.equal(
  janela100.some((f) => f.id === "firenze" || f.mes_referencia === "2026-07"),
  false,
  "as 100 mais novas não incluem julho nem a Firenze"
);

const agsJulho = julho.map((f, i) =>
  ag(`ag-jul-${i}`, f.referencia_nome, "2026-07-10", 80)
);
const resumoJulho = buildResumoClientesMes(agsJulho, todas, "07/2026");
assert.ok(resumoJulho);
assert.equal(resumoJulho.rows.length, 40);
assert.equal(resumoJulho.rows.every((row) => row.status === "paga"), true);
assert.equal(resumoJulho.resumo.valorEmitido, 4000);
assert.equal(resumoJulho.resumo.valorPago, 4000);
assert.equal(resumoJulho.resumo.valorEmAberto, 0);
assert.equal(resumoJulho.resumo.valorPrevisto, 3200);

const resumoJulhoCapado = buildResumoClientesMes(agsJulho, janela100, "07/2026");
assert.ok(resumoJulhoCapado);
assert.equal(resumoJulhoCapado.rows.every((row) => row.status === "aberta_emissao"), true);
assert.equal(resumoJulhoCapado.resumo.valorEmitido, 0);

const agsAgosto = [
  ag("ag-firenze", "ALUMINIO FIRENZE", "2026-08-12", 2000),
  ag("ag-aberta", "Sem Fatura", "2026-08-12", 300),
  ag("ag-rascunho", "Rascunho LTDA", "2026-08-12", 150),
  ag("ag-aberta-fin", "Emitida Aberta", "2026-08-12", 400),
  ag("ag-vencida", "Vencida LTDA", "2026-08-04", 250),
  ag("ag-vencida-paga", "Vencida Paga", "2026-08-04", 90),
];
const faturasAgosto = [
  firenze,
  fatura({
    id: "rascunho",
    referencia_nome: "Rascunho LTDA",
    status: "rascunho",
    pago: false,
    valor_total: 999,
    mes_referencia: "2026-08",
  }),
  fatura({
    id: "em-aberto",
    referencia_nome: "Emitida Aberta",
    status: "emitida",
    pago: false,
    valor_total: 410,
    mes_referencia: "2026-08",
    data_emissao: "2026-08-20",
    data_vencimento: "2026-09-20",
  }),
  fatura({
    id: "vencida",
    referencia_nome: "Vencida LTDA",
    status: "vencida",
    pago: false,
    valor_total: 260,
    mes_referencia: "2026-08",
    data_emissao: "2026-08-05",
    data_vencimento: "2026-08-10",
  }),
  fatura({
    id: "vencida-paga",
    referencia_nome: "Vencida Paga",
    status: "vencida",
    pago: true,
    valor_total: 95,
    mes_referencia: "2026-08",
    data_pagamento: "2026-09-01",
  }),
  fatura({
    id: "so-periodo",
    referencia_nome: "So Periodo",
    mes_referencia: null,
    periodo_inicio: "2026-08-01",
    status: "emitida",
    pago: true,
    valor_total: 70,
    data_emissao: "2026-09-03",
  }),
];
agsAgosto.push(ag("ag-periodo", "So Periodo", "2026-08-18", 70));

const resumoAgosto = buildResumoClientesMes(agsAgosto, faturasAgosto, "08/2026");
assert.ok(resumoAgosto);

function linha(nome: string) {
  const row = resumoAgosto!.rows.find((item) => item.referenciaNome === nome);
  assert.ok(row, nome);
  return row;
}

assert.equal(linha("ALUMINIO FIRENZE").status, "paga");
assert.equal(linha("ALUMINIO FIRENZE").fatura?.numero, "FAT-CLI-2026-00084");
assert.equal(linha("ALUMINIO FIRENZE").valorTotal, 2000);
assert.equal(linha("Sem Fatura").status, "aberta_emissao");
assert.equal(linha("Sem Fatura").fatura, null);
assert.equal(linha("Rascunho LTDA").status, "aberta_emissao");
assert.equal(linha("Rascunho LTDA").fatura?.status, "rascunho");
assert.equal(linha("Emitida Aberta").status, "emitida");
assert.equal(linha("Vencida LTDA").status, "vencida");
assert.equal(linha("Vencida Paga").status, "paga");
assert.equal(linha("So Periodo").status, "paga");

assert.equal(resumoAgosto.resumo.valorPrevisto, 2000 + 300 + 150 + 400 + 250 + 90 + 70);
assert.equal(resumoAgosto.resumo.valorEmitido, 1895 + 410 + 260 + 95 + 70);
assert.equal(resumoAgosto.resumo.valorPago, 1895 + 95 + 70);
assert.equal(resumoAgosto.resumo.valorEmAberto, 410 + 260);
assert.equal(
  resumoAgosto.resumo.valorEmitido,
  resumoAgosto.resumo.valorPago + resumoAgosto.resumo.valorEmAberto
);

const mesmoClienteJulho = buildResumoClientesMes(
  [ag("ag-firenze-jul", "ALUMINIO FIRENZE", "2026-07-08", 500)],
  [
    fatura({
      id: "firenze-jul",
      referencia_nome: "ALUMINIO FIRENZE",
      mes_referencia: "2026-07",
      periodo_inicio: "2026-07-01",
      status: "emitida",
      pago: true,
      valor_total: 500,
      numero: "FAT-CLI-2026-00010",
    }),
    firenze,
  ],
  "07/2026"
);
assert.ok(mesmoClienteJulho);
assert.equal(mesmoClienteJulho.rows.length, 1);
assert.equal(mesmoClienteJulho.rows[0].fatura?.numero, "FAT-CLI-2026-00010");
assert.equal(mesmoClienteJulho.rows[0].status, "paga");

const bloqueio = encontrarFaturaQueImpedeEmissao(
  [...todas, ...faturasAgosto],
  { referenciaNome: "aluminio firenze", mesReferencia: "08/2026" }
);
assert.equal(bloqueio?.numero, "FAT-CLI-2026-00084");
assert.equal(
  encontrarFaturaQueImpedeEmissao([...todas, ...faturasAgosto], {
    referenciaNome: "ALUMINIO FIRENZE",
    mesReferencia: "08/2026",
    ignorarFaturaId: "firenze",
  }),
  null
);
assert.equal(
  encontrarFaturaQueImpedeEmissao(
    [
      fatura({
        id: "cancelada",
        referencia_nome: "ALUMINIO FIRENZE",
        status: "cancelada",
        mes_referencia: "2026-08",
      }),
    ],
    { referenciaNome: "ALUMINIO FIRENZE", mesReferencia: "08/2026" }
  ),
  null
);
assert.equal(
  encontrarFaturaQueImpedeEmissao([firenze], {
    referenciaNome: "ALUMINIO FIRENZE",
    mesReferencia: "07/2026",
  }),
  null
);
const porId = encontrarFaturaQueImpedeEmissao(
  [
    fatura({
      id: "id-a",
      referencia_nome: "Outro Nome",
      referencia_id: "cli-firenze",
      mes_referencia: "2026-08",
      status: "emitida",
      numero: "FAT-ID",
    }),
  ],
  {
    referenciaNome: "ALUMINIO FIRENZE",
    referenciaId: "cli-firenze",
    mesReferencia: "2026-08",
  }
);
assert.equal(porId?.numero, "FAT-ID");
assert.equal(
  encontrarFaturaQueImpedeEmissao(
    [
      fatura({
        id: "id-b",
        referencia_nome: "ALUMINIO FIRENZE",
        referencia_id: "outro-id",
        mes_referencia: "2026-08",
        status: "emitida",
      }),
    ],
    {
      referenciaNome: "ALUMINIO FIRENZE",
      referenciaId: "cli-firenze",
      mesReferencia: "2026-08",
    }
  ),
  null,
  "ids diferentes não são a mesma empresa"
);

const root = process.cwd();
const duplicidade = fs.readFileSync(
  path.join(root, "services/duplicidade.service.ts"),
  "utf8"
);
assert.match(duplicidade, /listarFaturasDaCompetencia/);
assert.match(duplicidade, /encontrarFaturaQueImpedeEmissao/);
assert.doesNotMatch(duplicidade, /function faturaMatchesMesReferencia/);
assert.doesNotMatch(duplicidade, /\.limit\(/);

const hook = fs.readFileSync(path.join(root, "hooks/useFaturasPage.ts"), "utf8");
assert.match(hook, /listarFaturasDaCompetencia/);
assert.doesNotMatch(hook, /listarFaturas\(/);

const servico = fs.readFileSync(
  path.join(root, "services/fatura-competencia.service.ts"),
  "utf8"
);
assert.match(servico, /coletarPaginas/);
assert.doesNotMatch(servico, /created_at/);
assert.doesNotMatch(servico, /limit\(100\)/);

assertPaginacao()
  .then(() => {
    console.log("ok: fatura-competencia");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
