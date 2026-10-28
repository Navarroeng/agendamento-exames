/**
 * PGR pontual: seleção, quantidade, cálculo, contrato e etapas.
 * Executar: npx tsx scripts/test-servico-pgr.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import {
  buildContratoNavarroDocumento,
  motivoBloqueioGeracaoContrato,
  podeGerarContratoNavarro,
} from "../lib/contrato-modelo";
import {
  drawContratoPdfDocument,
  nomeArquivoContratoNavarro,
  rotuloServicoContratoArquivo,
} from "../lib/contrato-pdf";
import { contratoUsaCronogramaVencimentos } from "../lib/contrato-vencimentos";
import {
  resolveItemValorServico,
  servicoOcultaQuantidadeColaboradores,
  validateOrcamentoItensValores,
} from "../lib/orcamento-calculo";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import {
  isOrcamentoMensalidade,
  isServicoOferecidoNoOrcamento,
  labelItensInclusosServico,
} from "../lib/orcamento-modalidade";
import { buildOrcamentoEtapas } from "../lib/orcamento-etapas";
import type { OrcamentoComItens } from "../lib/orcamento-types";
import {
  orcamentoPermitePagamentoAVista,
  resolveTipoDocumentoContrato,
} from "../lib/servico-aet";
import { SERVICO_LTCAT_NOME } from "../lib/servico-ltcat";
import {
  bloqueioLaudoPontualExclusivo,
  copyLaudoPontual,
  isFluxoLaudoPontual,
  isServicoLaudoPontualNome,
  resolveLaudoPontualKind,
} from "../lib/servico-laudo-pontual";
import {
  PGR_INCLUSOS_ITENS,
  PGR_INCLUSOS_OBSERVACOES,
  PROPOSTA_DESCRICAO_PARAGRAFOS_PGR,
  SERVICO_PGR_NOME,
  isServicoPgrNome,
  orcamentoEhExclusivoPgr,
  resolveValorTotalPgr,
} from "../lib/servico-pgr";
import { resolveItensInclusosServico } from "../lib/servico-sst-pacote";
import { classifyOrcamentoFluxoImplantacao } from "../lib/servico-treinamentos";

const item = {
  servico_id: "pgr-1",
  servico_nome: SERVICO_PGR_NOME,
};

assert.equal(isServicoPgrNome(SERVICO_PGR_NOME), true);
assert.equal(isServicoPgrNome("PGR"), false);
assert.equal(isServicoPgrNome("PGR - Programa de gerenciamento de riscos."), false);
assert.equal(isServicoLaudoPontualNome(SERVICO_PGR_NOME), false);
assert.equal(isServicoOferecidoNoOrcamento(SERVICO_PGR_NOME), true);
assert.equal(classifyOrcamentoFluxoImplantacao([item]), "pgr");
assert.equal(
  classifyOrcamentoFluxoImplantacao([
    item,
    { servico_nome: SERVICO_LTCAT_NOME },
  ]),
  "padrao"
);
assert.equal(classifyOrcamentoFluxoImplantacao([{ servico_nome: "PGR" }]), "padrao");
assert.equal(isFluxoLaudoPontual("pgr"), true);
assert.equal(resolveLaudoPontualKind([item]), "pgr");
assert.equal(orcamentoEhExclusivoPgr([item, { servico_nome: "PGR" }]), false);
assert.equal(orcamentoPermitePagamentoAVista([item]), true);
assert.equal(resolveTipoDocumentoContrato({ itens: [item] }), "pgr");
assert.notEqual(resolveTipoDocumentoContrato({ itens: [item] }), "pontual_sst");
assert.notEqual(resolveTipoDocumentoContrato({ itens: [item] }), "mensalidade");
assert.equal(contratoUsaCronogramaVencimentos("pgr"), true);
assert.equal(servicoOcultaQuantidadeColaboradores(SERVICO_PGR_NOME), true);
assert.equal(servicoOcultaQuantidadeColaboradores("PGR"), false);
assert.equal(
  validateOrcamentoItensValores([
    { servico_nome: SERVICO_PGR_NOME, quantidade: 0, valor_unitario: 1000 },
  ]),
  "Informe a quantidade do serviço (mínimo 1)."
);
assert.equal(
  validateOrcamentoItensValores([
    { servico_nome: "PGR", quantidade: 0, valor_unitario: 1000 },
  ]),
  "Informe quantidade de colaboradores válida (mínimo 1) para todos os serviços."
);
assert.equal(
  bloqueioLaudoPontualExclusivo({
    itens: [{ id: "1", servico_nome: SERVICO_LTCAT_NOME }],
    itemIdAlterado: null,
    novoNome: SERVICO_PGR_NOME,
  }),
  null
);
assert.equal(
  resolveValorTotalPgr({ quantidade: 4, valor_unitario: 3200, valor_total: 3200 }),
  3200
);
assert.equal(
  resolveValorTotalPgr({ quantidade: 4, valor_unitario: 800, valor_total: 3200 }),
  800
);
assert.deepEqual(resolveItensInclusosServico(null, SERVICO_PGR_NOME), [
  ...PGR_INCLUSOS_ITENS,
]);
assert.equal(labelItensInclusosServico(SERVICO_PGR_NOME), "O que está incluso?");
assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_PGR.length, 2);
assert.equal(PGR_INCLUSOS_OBSERVACOES.length, 2);
for (const texto of [
  ...PROPOSTA_DESCRICAO_PARAGRAFOS_PGR,
  ...PGR_INCLUSOS_ITENS,
  ...PGR_INCLUSOS_OBSERVACOES,
]) {
  assert.equal(/LTCAT|aposentadoria|eSocial|NR-15|NR-16|agentes nocivos/i.test(texto), false);
}

const copy = copyLaudoPontual("pgr");
assert.equal(copy.etapaElaboracao, "Elaboração do PGR");
assert.match(copy.textoElaboracao, /inventário de riscos ocupacionais/);
assert.match(copy.textoElaboracao, /plano de ação/);
for (const value of Object.values(copy)) {
  const texto = typeof value === "function" ? value("Ana") : value;
  assert.equal(/LTCAT|Insalubridade|AET|eSocial/i.test(texto), false, texto);
}
assert.deepEqual(buildOrcamentoEtapas("pgr").map((etapa) => etapa.id), [
  "resumo",
  "aprovado",
  "contrato",
  "financeiro",
  "visita_aet",
]);

const orcamento: OrcamentoComItens = {
  id: "o-pgr",
  numero: "ORC-2026-0180",
  data_proposta: "2026-10-01",
  cliente_id: "cli-1",
  cliente_nome: "METAL NORTE",
  cliente_cnpj: "12345678000195",
  cliente_endereco: "Rua da Produção, 80, São Paulo/SP",
  cliente_setor: null,
  contato: null,
  email: null,
  telefone: null,
  responsavel: "AGATHA",
  origem_cliente: "indicacao",
  observacoes: null,
  motivo_cancelamento: null,
  observacao_cancelamento: null,
  cancelado_em: null,
  cancelado_por: null,
  desconto_percentual: 0,
  forma_pagamento: "2 parcelas",
  quantidade_parcelas: 2,
  validade_proposta: null,
  subtotal: 3200,
  modalidade: "pontual",
  valor_total: 3200,
  status: "aprovado",
  assinatura_status: "nao_aplicavel",
  assinatura_token: null,
  aceite_em: null,
  aceite_ip: null,
  aceite_usuario_nome: null,
  link_aceite_expira_em: null,
  created_at: "",
  updated_at: "",
  orcamento_itens: [
    {
      id: "i-pgr",
      orcamento_id: "o-pgr",
      servico_id: "pgr-1",
      servico_nome: SERVICO_PGR_NOME,
      quantidade: 4,
      valor_unitario: 3200,
      valor_total: 3200,
      ordem: 0,
    },
  ],
};

const aprovacao: OrcamentoAprovacaoRecord = {
  id: "ap-pgr",
  orcamento_id: "o-pgr",
  quantidade_colaboradores: 4,
  valor_final: 3200,
  condicao_pagamento: "2 parcelas de R$ 1.600,00",
  quantidade_parcelas: 2,
  valor_parcela: 1600,
  desconto_percentual: 0,
  valor_avista: null,
  observacoes: null,
  aprovado_por: "AGATHA",
  aprovado_em: "2026-10-02T12:00:00.000Z",
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
  orcamento_aprovacao_itens: [
    {
      id: "ai-pgr",
      aprovacao_id: "ap-pgr",
      servico_id: "pgr-1",
      servico_nome: SERVICO_PGR_NOME,
      quantidade: 4,
      valor_unitario: 3200,
      valor_total: 3200,
      ordem: 0,
    },
  ],
};

assert.equal(resolveItemValorServico(orcamento.orcamento_itens![0]), 3200);

const tipoSelecionadoPeloBotao = resolveTipoDocumentoContrato({
  itens: aprovacao.orcamento_aprovacao_itens,
  isMensalidade: isOrcamentoMensalidade(orcamento.modalidade),
});
assert.equal(tipoSelecionadoPeloBotao, "pgr");
assert.equal(podeGerarContratoNavarro(orcamento, aprovacao), true);
assert.equal(motivoBloqueioGeracaoContrato(orcamento, aprovacao), null);
assert.equal(
  nomeArquivoContratoNavarro("METAL NORTE", "pgr"),
  "Contrato - PGR - Programa de Gerenciamento de Riscos - METAL NORTE.pdf"
);

const doc = buildContratoNavarroDocumento({
  orcamento,
  aprovacao,
  dataContrato: "2026-10-05",
  vencimentosIso: ["2026-10-10", "2026-11-10"],
});
assert.equal(doc.tipoDocumento, "pgr");
assert.equal(doc.colaboradores, 0);
assert.equal(doc.valor, 3200);
assert.equal(
  rotuloServicoContratoArquivo(doc.tipoDocumento),
  SERVICO_PGR_NOME
);
assert.notEqual(rotuloServicoContratoArquivo(doc.tipoDocumento), "Gestão SST");
assert.match(doc.tituloLinhas?.join(" ") ?? "", /PGR – PROGRAMA DE GERENCIAMENTO DE RISCOS/);
assert.match(doc.texto, /inventário de riscos ocupacionais/);
assert.match(doc.texto, /plano de ação/);
assert.match(doc.texto, /NR-01/);
assert.match(doc.texto, /Proposta Comercial nº ORC-2026-0180/);
assert.match(doc.texto, /2 \(duas\) parcelas/);
assert.match(
  doc.texto,
  /implementação das medidas indicadas no plano de ação é de responsabilidade da CONTRATANTE/
);
for (const incluso of PGR_INCLUSOS_ITENS) {
  assert.ok(doc.texto.includes(incluso), incluso);
}
const proibidos = [
  "LTCAT",
  "aposentadoria",
  "eSocial",
  "agentes nocivos",
  "PCMSO",
  "Gestão SST",
  "Gestão Completa",
  "mensalidade",
  "renovação automática",
  "exame ocupacional",
  "quantidade de colaboradores",
  "DE SAÚDE E SEGURANÇA DO TRABALHO",
];
for (const termo of proibidos) {
  assert.equal(
    doc.texto.toLowerCase().includes(termo.toLowerCase()),
    false,
    `contrato não pode citar ${termo}`
  );
}

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/148_servico_pgr.sql"),
  "utf8"
);
assert.match(sql, /PGR - Programa de Gerenciamento de Riscos/);
assert.match(sql, /is_servico_pgr_nome/);
assert.match(sql, /orcamento_eh_exclusivo_pgr/);
assert.match(sql, /v_is_pgr/);
assert.match(sql, /if v_is_laudo_pontual or v_is_parecer then\s+v_qtd := 0/);
assert.doesNotMatch(sql, /includes\(/);

const pdf = new jsPDF({ unit: "mm", format: "a4" });
drawContratoPdfDocument(pdf, doc, null);
const pdfTexto = Buffer.from(pdf.output("arraybuffer"))
  .toString("latin1")
  .replace(/\\([()\\])/g, "$1");
assert.match(pdfTexto, /Programa de Gerenciamento de Riscos/);
assert.match(pdfTexto, /invent[aá]rio de riscos ocupacionais/);
assert.match(pdfTexto, /plano de a[cç][aã]o/);
assert.match(pdfTexto, /Servi[cç]o: PGR/);
assert.match(pdfTexto, /responsabilidade da CONTRATANTE/);
assert.doesNotMatch(pdfTexto, /Modalidade: Pontual/);
assert.doesNotMatch(pdfTexto, /Modalidade: Mensalidade/);
assert.doesNotMatch(pdfTexto, /Gest[aã]o SST/);
assert.doesNotMatch(pdfTexto, /LTCAT/);
assert.doesNotMatch(pdfTexto, /eSocial/);
assert.doesNotMatch(pdfTexto, /DE SA[UÚ]DE E SEGURAN[CÇ]A DO TRABALHO/);

console.log("ok: servico-pgr");
