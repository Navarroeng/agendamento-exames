/** Garante match exato de empresa na fatura (sem includes/substring). */

import assert from "node:assert/strict";
import {
  isAgendamentoDaClinica,
  isAgendamentoDaEmpresa,
  normalizeNomeEmpresaFatura,
} from "../lib/fatura-empresa-match";
import { filterAgendamentosDaReferenciaFatura } from "../lib/fatura-filters";
import { buildResumoClientesMes } from "../lib/fatura-mes-resumo";
import type { AgendamentoWithExames, FaturaRecord } from "../lib/types";

const catalog = [
  { id: "c1", nome: "CAMPEÃO APOIO", cnpj: "61515013000198" },
  { id: "c2", nome: "FSA CAMPEÃO APOIO", cnpj: "61503381000116" },
  { id: "c3", nome: "CLÍNICA VIDA", cnpj: "11111111000111" },
  { id: "c4", nome: "CLÍNICA VIDA OCUPACIONAL", cnpj: "22222222000122" },
  { id: "c5", nome: "ALFA", cnpj: "33333333000133" },
  { id: "c6", nome: "ALFA SERVIÇOS", cnpj: "44444444000144" },
];

assert.equal(
  isAgendamentoDaEmpresa(
    { cliente_nome: "FSA CAMPEÃO APOIO", cliente_id: "c2" },
    { nome: "CAMPEÃO APOIO", id: "c1" },
    catalog
  ),
  false
);

assert.equal(
  isAgendamentoDaEmpresa(
    { cliente_nome: "FSA CAMPEÃO APOIO", cliente_id: "c2" },
    { nome: "FSA CAMPEÃO APOIO", id: "c2" },
    catalog
  ),
  true
);

// Sem id: nomes semelhantes NÃO casam por substring
assert.equal(
  isAgendamentoDaEmpresa(
    { cliente_nome: "FSA CAMPEÃO APOIO" },
    { nome: "CAMPEÃO APOIO" },
    catalog
  ),
  false
);

assert.equal(
  isAgendamentoDaEmpresa(
    { cliente_nome: "CLÍNICA VIDA OCUPACIONAL" },
    { nome: "CLÍNICA VIDA" },
    catalog
  ),
  false
);

assert.equal(
  isAgendamentoDaEmpresa(
    { cliente_nome: "ALFA SERVIÇOS" },
    { nome: "ALFA" },
    catalog
  ),
  false
);

assert.equal(
  isAgendamentoDaEmpresa(
    { cliente_nome: "  Alfa  Serviços " },
    { nome: "ALFA SERVIÇOS" },
    catalog
  ),
  true
);

assert.equal(
  isAgendamentoDaClinica("Clinimed Saúde", "Clinimed"),
  false
);
assert.equal(
  isAgendamentoDaClinica("Clinimed", "Clinimed"),
  true
);

assert.equal(
  normalizeNomeEmpresaFatura("  FSA   CAMPEÃO  "),
  "fsa campeão"
);

function ag(
  id: string,
  cliente: string,
  clienteId: string | null,
  colaborador: string,
  data: string,
  valor = 150
): AgendamentoWithExames {
  return {
    id,
    cliente_nome: cliente,
    cliente_id: clienteId,
    colaborador,
    data_agendamento: data,
    status: "agendado",
    clinica_nome: "Clinimed",
    responsavel: "Bruna",
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

const LIVIA = "LÍVIA POLLIANNY DE SOUZA BARBOSA";
const CAMPEAO = "CAMPEÃO APOIO";
const FSA = "FSA CAMPEÃO APOIO";

const ags = [ag("ag-1", FSA, "c2", LIVIA, "2026-08-10", 150)];

const filtradosCampeao = filterAgendamentosDaReferenciaFatura(ags, {
  mesReferencia: "08/2026",
  tipo: "cliente",
  referenciaNome: CAMPEAO,
  referenciaId: "c1",
  clientesCatalog: catalog,
});
assert.equal(filtradosCampeao.length, 0, "Livia não deve entrar na CAMPEÃO");

const filtradosFsa = filterAgendamentosDaReferenciaFatura(ags, {
  mesReferencia: "08/2026",
  tipo: "cliente",
  referenciaNome: FSA,
  referenciaId: "c2",
  clientesCatalog: catalog,
});
assert.equal(filtradosFsa.length, 1);
assert.equal(filtradosFsa[0].colaborador, LIVIA);

const faturaCampeao: FaturaRecord = {
  id: "fat-campeao",
  numero: "FAT-1",
  tipo: "cliente",
  referencia_id: "c1",
  referencia_nome: CAMPEAO,
  periodo_inicio: "2026-08-01",
  periodo_fim: "2026-08-31",
  mes_referencia: "2026-08",
  data_emissao: null,
  data_vencimento: "2026-08-15",
  valor_total: 150,
  total_exames: 1,
  status: "rascunho",
  gerado_por: "Teste",
  pago: false,
  data_pagamento: null,
  observacao_pagamento: null,
  comprovante_pagamento_path: null,
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
  created_at: "",
  updated_at: "",
};

const resumo = buildResumoClientesMes(
  ags,
  [faturaCampeao],
  "08/2026",
  "",
  catalog
);
assert.ok(resumo);
assert.equal(
  resumo.rows.some((r) => r.referenciaNome === CAMPEAO),
  false,
  "fatura CAMPEÃO sem itens válidos some da listagem"
);
assert.equal(resumo.rows.length, 1);
assert.equal(resumo.rows[0].referenciaNome, FSA);
assert.equal(resumo.rows[0].valorTotal, 150);

console.log("ok: fatura-cliente-match-exato");
