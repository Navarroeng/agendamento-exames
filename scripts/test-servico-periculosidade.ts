/**
 * Laudo de Periculosidade (NR16): catálogo, fluxo pontual e contrato NR-16.
 * Executar: npx tsx scripts/test-servico-periculosidade.ts
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
import { CONTRATO_PERICULOSIDADE_SERVICOS } from "../lib/contrato-periculosidade";
import { contratoUsaCronogramaVencimentos } from "../lib/contrato-vencimentos";
import {
  exibeColunaQuantidadeColaboradores,
  servicoOcultaQuantidadeColaboradores,
  validateOrcamentoItensValores,
} from "../lib/orcamento-calculo";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import {
  isOrcamentoMensalidade,
  isServicoOferecidoNoOrcamento,
} from "../lib/orcamento-modalidade";
import { buildOrcamentoEtapas } from "../lib/orcamento-etapas";
import type { OrcamentoComItens } from "../lib/orcamento-types";
import { orcamentoPermitePagamentoAVista, resolveTipoDocumentoContrato } from "../lib/servico-aet";
import { SERVICO_INSALUBRIDADE_NOME } from "../lib/servico-insalubridade";
import {
  copyLaudoPontual,
  isFluxoLaudoPontual,
  isServicoLaudoPontualNome,
  laudoPontualOcultaColaboradores,
  resolveLaudoPontualKind,
} from "../lib/servico-laudo-pontual";
import {
  PERICULOSIDADE_INCLUSOS_ITENS,
  PROPOSTA_DESCRICAO_PARAGRAFOS_PERICULOSIDADE,
  SERVICO_PERICULOSIDADE_EXCLUSIVIDADE_MSG,
  SERVICO_PERICULOSIDADE_NOME,
  bloqueioPericulosidadeExclusivo,
  isServicoPericulosidadeNome,
  orcamentoEhExclusivoPericulosidade,
} from "../lib/servico-periculosidade";
import { classifyOrcamentoFluxoImplantacao } from "../lib/servico-treinamentos";
import { resolveItensInclusosServico } from "../lib/servico-sst-pacote";

const item = {
  servico_id: "peric-1",
  servico_nome: SERVICO_PERICULOSIDADE_NOME,
};

assert.equal(isServicoPericulosidadeNome(SERVICO_PERICULOSIDADE_NOME), true);
assert.equal(isServicoPericulosidadeNome("Laudo de Periculosidade (NR-16)"), false);
assert.equal(isServicoPericulosidadeNome("Laudo de Insalubridade"), false);
assert.equal(isServicoLaudoPontualNome(SERVICO_PERICULOSIDADE_NOME), true);
assert.equal(isServicoOferecidoNoOrcamento(SERVICO_PERICULOSIDADE_NOME), true);
assert.equal(classifyOrcamentoFluxoImplantacao([item]), "periculosidade");
assert.equal(isFluxoLaudoPontual("periculosidade"), true);
assert.equal(resolveLaudoPontualKind([item]), "periculosidade");
assert.equal(laudoPontualOcultaColaboradores("periculosidade"), true);
assert.equal(orcamentoPermitePagamentoAVista([item]), false);
assert.equal(resolveTipoDocumentoContrato({ itens: [item] }), "periculosidade");
assert.equal(contratoUsaCronogramaVencimentos("periculosidade"), true);
assert.equal(orcamentoEhExclusivoPericulosidade([item, { servico_nome: "PGR" }]), false);
assert.equal(
  bloqueioPericulosidadeExclusivo({
    itens: [{ id: "1", servico_nome: "PGR" }],
    itemIdAlterado: null,
    novoNome: SERVICO_PERICULOSIDADE_NOME,
  }),
  SERVICO_PERICULOSIDADE_EXCLUSIVIDADE_MSG
);
assert.equal(servicoOcultaQuantidadeColaboradores(SERVICO_PERICULOSIDADE_NOME), true);
assert.equal(exibeColunaQuantidadeColaboradores([item]), false);
assert.equal(
  validateOrcamentoItensValores([
    { servico_nome: SERVICO_PERICULOSIDADE_NOME, quantidade: 0, valor_unitario: 1000 },
  ]),
  "Informe a quantidade do serviço (mínimo 1)."
);
assert.equal(
  validateOrcamentoItensValores([
    { servico_nome: SERVICO_PERICULOSIDADE_NOME, quantidade: 2, valor_unitario: 1000 },
  ]),
  null
);
assert.deepEqual(resolveItensInclusosServico(null, SERVICO_PERICULOSIDADE_NOME), [
  ...PERICULOSIDADE_INCLUSOS_ITENS,
]);
assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_PERICULOSIDADE[2]?.startsWith("Ponto 01"), true);
assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_PERICULOSIDADE[5]?.startsWith("Ponto 04"), true);

const copy = copyLaudoPontual("periculosidade");
for (const value of Object.values(copy)) {
  const texto = typeof value === "function" ? value("Ana") : value;
  assert.equal(/AET|Insalubridade|NR-15|NR-17/i.test(texto), false, texto);
}
assert.equal(copy.titulo, "Laudo de Periculosidade");
assert.match(copy.textoElaboracao, /Laudo Técnico de Periculosidade/);
assert.match(copy.upload, /Laudo Técnico de Periculosidade/);

const etapas = buildOrcamentoEtapas("periculosidade").map((etapa) => etapa.id);
assert.deepEqual(etapas, ["resumo", "aprovado", "contrato", "financeiro", "visita_aet"]);

const orcamento: OrcamentoComItens = {
  id: "o-peric",
  numero: "ORC-2026-0160",
  data_proposta: "2026-10-01",
  cliente_id: "cli-1",
  cliente_nome: "INJETORA NORTE",
  cliente_cnpj: "12345678000195",
  cliente_endereco: "Rua das Injetoras, 40, São Paulo/SP",
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
  subtotal: 4800,
  modalidade: "pontual",
  valor_total: 4800,
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
      id: "i-peric",
      orcamento_id: "o-peric",
      servico_id: "peric-1",
      servico_nome: SERVICO_PERICULOSIDADE_NOME,
      quantidade: 2,
      valor_unitario: 4800,
      valor_total: 4800,
      ordem: 0,
    },
  ],
};

const aprovacao: OrcamentoAprovacaoRecord = {
  id: "ap-peric",
  orcamento_id: "o-peric",
  quantidade_colaboradores: 0,
  valor_final: 4800,
  condicao_pagamento: "2 parcelas de R$ 2.400,00",
  quantidade_parcelas: 2,
  valor_parcela: 2400,
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
      id: "ai-peric",
      aprovacao_id: "ap-peric",
      servico_id: "peric-1",
      servico_nome: SERVICO_PERICULOSIDADE_NOME,
      quantidade: 2,
      valor_unitario: 4800,
      valor_total: 4800,
      ordem: 0,
    },
  ],
};

const tipoSelecionadoPeloBotao = resolveTipoDocumentoContrato({
  itens: aprovacao.orcamento_aprovacao_itens,
  isMensalidade: isOrcamentoMensalidade(orcamento.modalidade),
});
assert.equal(tipoSelecionadoPeloBotao, "periculosidade");
assert.notEqual(tipoSelecionadoPeloBotao, "pontual_sst");
assert.notEqual(tipoSelecionadoPeloBotao, "mensalidade");
assert.equal(podeGerarContratoNavarro(orcamento, aprovacao), true);
assert.equal(motivoBloqueioGeracaoContrato(orcamento, aprovacao), null);
assert.equal(
  nomeArquivoContratoNavarro("INJETORA NORTE", "periculosidade"),
  "Contrato - Laudo de Periculosidade (NR16) - INJETORA NORTE.pdf"
);

const doc = buildContratoNavarroDocumento({
  orcamento,
  aprovacao,
  dataContrato: "2026-10-05",
  vencimentosIso: ["2026-10-10", "2026-11-10"],
});
assert.equal(doc.tipoDocumento, tipoSelecionadoPeloBotao);
assert.equal(
  rotuloServicoContratoArquivo(doc.tipoDocumento),
  "Laudo de Periculosidade (NR16)"
);
assert.notEqual(rotuloServicoContratoArquivo(doc.tipoDocumento), "Gestão SST");
assert.equal(
  nomeArquivoContratoNavarro(doc.contratante.razaoSocial, doc.tipoDocumento),
  "Contrato - Laudo de Periculosidade (NR16) - INJETORA NORTE.pdf"
);
assert.equal(doc.colaboradores, 0);
assert.equal(doc.valor, 4800);
assert.equal(doc.parcelas[0]?.dataIso, "2026-10-10");
assert.equal(doc.parcelas[1]?.dataIso, "2026-11-10");
assert.match(doc.tituloLinhas?.join(" ") ?? "", /LAUDO TÉCNICO DE PERICULOSIDADE – NR-16/);
assert.match(doc.texto, /Laudo Técnico de Periculosidade/);
assert.match(doc.texto, /NR-16/);
assert.match(doc.texto, /INJETORA NORTE/);
assert.match(doc.texto, /Proposta Comercial nº ORC-2026-0160/);
assert.match(doc.texto, /R\$ 4\.800,00/);
assert.match(doc.texto, /2 \(duas\) parcelas/);
assert.match(doc.texto, /10\/10\/2026/);
assert.match(doc.texto, /10\/11\/2026/);
for (const incluso of CONTRATO_PERICULOSIDADE_SERVICOS) {
  assert.ok(doc.texto.includes(incluso), incluso);
}
assert.match(
  doc.texto,
  /implementação das medidas corretivas indicadas é de responsabilidade da CONTRATANTE/
);
const proibidos = [
  "AET",
  "Análise Ergonômica",
  "NR-17",
  "Insalubridade",
  "NR-15",
  "PGR",
  "PCMSO",
  "LTCAT",
  "eSocial",
  "Gestão SST",
  "Gestão Completa",
  "mensalidade",
  "renovação automática",
  "exame ocupacional",
  "exames ocupacionais",
  "quantidade de colaboradores",
  "à vista",
  "DE SAÚDE E SEGURANÇA DO TRABALHO",
  SERVICO_INSALUBRIDADE_NOME,
];
for (const termo of proibidos) {
  assert.equal(
    doc.texto.toLowerCase().includes(termo.toLowerCase()),
    false,
    `contrato não pode citar ${termo}`
  );
}

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/147_servico_periculosidade.sql"),
  "utf8"
);
assert.match(sql, /Laudo de Periculosidade \(NR16\)/);
assert.match(sql, /is_servico_periculosidade_nome/);
assert.match(sql, /orcamento_eh_exclusivo_periculosidade/);
assert.match(sql, /v_qtd := 0/);
assert.doesNotMatch(sql, /includes\(/);

const pdf = new jsPDF({ unit: "mm", format: "a4" });
drawContratoPdfDocument(pdf, doc, null);
const pdfTexto = Buffer.from(pdf.output("arraybuffer"))
  .toString("latin1")
  .replace(/\\([()\\])/g, "$1");
assert.match(pdfTexto, /Laudo T[eé]cnico de Periculosidade/);
assert.match(pdfTexto, /NR-16/);
assert.match(pdfTexto, /Servi[cç]o: Periculosidade \(NR16\)/);
assert.match(pdfTexto, /responsabilidade da CONTRATANTE/);
assert.doesNotMatch(pdfTexto, /An[aá]lise Ergon[oô]mica/);
assert.doesNotMatch(pdfTexto, /Laudo de Insalubridade/);
assert.doesNotMatch(pdfTexto, /Servi[cç]o: Laudo AET/);
assert.doesNotMatch(pdfTexto, /Modalidade: Pontual/);
assert.doesNotMatch(pdfTexto, /Modalidade: Mensalidade/);
assert.doesNotMatch(pdfTexto, /PCMSO/);
assert.doesNotMatch(pdfTexto, /eSocial/);
assert.doesNotMatch(pdfTexto, /Gest[aã]o SST/);
assert.doesNotMatch(pdfTexto, /DE SA[UÚ]DE E SEGURAN[CÇ]A DO TRABALHO/);

console.log("ok: servico-periculosidade");
