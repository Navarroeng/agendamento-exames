/** Contrato documental do Laudo de Parecer Técnico. */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import { buildResumoComercialOrcamento } from "../lib/orcamento-aprovacao";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoComItens } from "../lib/orcamento-types";
import { ORCAMENTO_MODALIDADE_PONTUAL } from "../lib/orcamento-modalidade";
import {
  buildContratoNavarroDocumento,
  motivoBloqueioGeracaoContrato,
  podeGerarContratoNavarro,
} from "../lib/contrato-modelo";
import {
  drawContratoPdfDocument,
  nomeArquivoContratoNavarro,
} from "../lib/contrato-pdf";
import {
  CONTRATO_PARECER_TITULO,
  PARECER_PAGAMENTO_ESCOLHA_PENDENTE_MSG,
  condicaoAprovadaParecer,
} from "../lib/contrato-parecer-tecnico";
import { contratoUsaCronogramaVencimentos } from "../lib/contrato-vencimentos";
import { SERVICO_AET_NOME, resolveTipoDocumentoContrato } from "../lib/servico-aet";
import {
  SERVICO_INSALUBRIDADE_CONTRATO_NAO_CONFIGURADO_MSG,
  SERVICO_INSALUBRIDADE_NOME,
} from "../lib/servico-insalubridade";
import {
  PARECER_TECNICO_INCLUSOS_ITENS,
  SERVICO_PARECER_TECNICO_NOME,
} from "../lib/servico-parecer-tecnico";
import { classifyOrcamentoFluxoImplantacao } from "../lib/servico-treinamentos";

function makeOrcamento(
  over: Partial<OrcamentoComItens> &
    Pick<OrcamentoComItens, "valor_total" | "orcamento_itens">
): OrcamentoComItens {
  return {
    id: "o-parecer",
    numero: "ORC-2026-0142",
    data_proposta: "2026-10-01",
    cliente_id: "cli-1",
    cliente_nome: "METALURGICA AURORA LTDA",
    cliente_cnpj: "12345678000195",
    cliente_endereco: "Rua das Industrias, 40, São Paulo/SP",
    cliente_setor: null,
    contato: null,
    email: "financeiro@aurora.example",
    telefone: "(11) 3333-4444",
    responsavel: "AGATHA",
    origem_cliente: "cliente_base",
    observacoes: null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: null,
    quantidade_parcelas: 3,
    validade_proposta: null,
    subtotal: over.valor_total,
    status: "aprovado",
    assinatura_status: "nao_aplicavel",
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: "",
    updated_at: "",
    modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
    ...over,
  };
}

function itemParecer(valor = 1000.01) {
  return {
    id: "i-parecer",
    orcamento_id: "o-parecer",
    servico_id: "parecer-1",
    servico_nome: SERVICO_PARECER_TECNICO_NOME,
    quantidade: 1,
    valor_unitario: valor,
    valor_total: valor,
    ordem: 0,
  };
}

function makeAprovacao(
  nome: string,
  valor: number
): OrcamentoAprovacaoRecord {
  return {
    id: "ap-parecer",
    orcamento_id: "o-parecer",
    quantidade_colaboradores: 0,
    valor_final: valor,
    condicao_pagamento: "3 parcelas",
    quantidade_parcelas: 3,
    valor_parcela: 333.34,
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
        id: "ai-parecer",
        aprovacao_id: "ap-parecer",
        servico_id: "parecer-1",
        servico_nome: nome,
        quantidade: 1,
        valor_unitario: valor,
        valor_total: valor,
        ordem: 0,
      },
    ],
  };
}

function pdfVisibleText(doc: InstanceType<typeof jsPDF>): string {
  const raw = Buffer.from(doc.output("arraybuffer")).toString("latin1");
  const chunks: string[] = [];
  const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    chunks.push(match[1].replace(/\\([()\\])/g, "$1"));
  }
  return chunks.join(" ").replace(/\s+/g, " ");
}

const itens = [itemParecer()];
assert.equal(
  resolveTipoDocumentoContrato({ itens }),
  "parecer_tecnico"
);
assert.equal(
  classifyOrcamentoFluxoImplantacao(itens, null, "aet-1", "insal-1", "ltcat-1"),
  "padrao"
);
assert.equal(contratoUsaCronogramaVencimentos("parecer_tecnico"), true);
assert.equal(contratoUsaCronogramaVencimentos("aet"), true);
assert.equal(contratoUsaCronogramaVencimentos("pontual_sst"), false);
assert.equal(contratoUsaCronogramaVencimentos("insalubridade"), false);

const resumo = buildResumoComercialOrcamento(
  makeOrcamento({
    valor_total: 800,
    quantidade_parcelas: 12,
    orcamento_itens: [itemParecer(800)],
  })
);
assert.equal(resumo.parcelas, 12);
assert.equal(resumo.valorAVista, 0);
assert.equal(resumo.quantidadeColaboradores, 0);

const orcBase = makeOrcamento({
  valor_total: 1000.01,
  quantidade_parcelas: 3,
  oferecer_desconto_avista: true,
  valor_avista: 900.5,
  parecer_pagamento_escolhido: null,
  orcamento_itens: itens,
});
const ap = makeAprovacao(SERVICO_PARECER_TECNICO_NOME, 1000.01);
assert.equal(podeGerarContratoNavarro(orcBase, ap), true);
assert.equal(motivoBloqueioGeracaoContrato(orcBase, ap), null);
assert.throws(
  () =>
    buildContratoNavarroDocumento({
      orcamento: orcBase,
      aprovacao: ap,
      dataContrato: "2026-10-14",
    }),
  new RegExp(PARECER_PAGAMENTO_ESCOLHA_PENDENTE_MSG.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
);

const parcelado = buildContratoNavarroDocumento({
  orcamento: { ...orcBase, parecer_pagamento_escolhido: "parcelado" },
  aprovacao: ap,
  dataContrato: "2026-10-14",
  vencimentosIso: ["2026-10-20", "2026-11-20", "2026-12-20"],
});
assert.equal(parcelado.tipoDocumento, "parecer_tecnico");
assert.equal(parcelado.tituloLinhas.join(" "), CONTRATO_PARECER_TITULO);
assert.equal(parcelado.contratante.razaoSocial, "METALURGICA AURORA LTDA");
assert.equal(parcelado.numeroOrcamento, "ORC-2026-0142");
assert.equal(parcelado.valor, 1000.01);
assert.equal(parcelado.parcelas.length, 3);
assert.equal(
  parcelado.parcelas.reduce((sum, p) => sum + p.valorCentavos, 0),
  100001
);
assert.deepEqual(
  parcelado.parcelas.map((p) => p.dataIso),
  ["2026-10-20", "2026-11-20", "2026-12-20"]
);
const textoParcelado = parcelado.texto;
for (const item of PARECER_TECNICO_INCLUSOS_ITENS) {
  assert.ok(textoParcelado.includes(item), item);
}
assert.match(textoParcelado, /assistente técnica da CONTRATANTE/i);
assert.match(textoParcelado, /não equivale ao laudo do perito nomeado pelo juízo/i);
assert.match(textoParcelado, /não assegura resultado favorável/i);
assert.match(textoParcelado, /ORC-2026-0142/);
assert.match(textoParcelado, /Pedro Henrique Navarro/);
assert.match(textoParcelado, /METALURGICA AURORA LTDA/);
assert.doesNotMatch(textoParcelado, /à vista/i);
assert.doesNotMatch(textoParcelado, /visita técnica/i);
assert.doesNotMatch(textoParcelado, /mapeamento/i);
assert.doesNotMatch(textoParcelado, /avaliações quantitativas/i);
assert.doesNotMatch(textoParcelado, /undefined|null/);
assert.equal(parcelado.colaboradores, 0);

const semOferta = buildContratoNavarroDocumento({
  orcamento: {
    ...orcBase,
    oferecer_desconto_avista: false,
    valor_avista: 900.5,
    parecer_pagamento_escolhido: "avista",
  },
  aprovacao: ap,
  dataContrato: "2026-10-14",
  vencimentosIso: ["2026-10-20", "2026-11-20", "2026-12-20"],
});
assert.equal(semOferta.valor, 1000.01);
assert.equal(semOferta.parcelas.length, 3);
assert.doesNotMatch(semOferta.texto, /à vista/i);

const avista = buildContratoNavarroDocumento({
  orcamento: { ...orcBase, parecer_pagamento_escolhido: "avista" },
  aprovacao: { ...ap, valor_final: 1000.01, quantidade_parcelas: 3 },
  dataContrato: "2026-10-14",
  vencimentosIso: ["2026-10-25"],
});
assert.equal(avista.valor, 900.5);
assert.equal(avista.parcelas.length, 1);
assert.equal(avista.parcelas[0]?.valorCentavos, 90050);
assert.equal(avista.parcelas[0]?.dataIso, "2026-10-25");
assert.match(avista.texto, /à vista/i);
assert.doesNotMatch(avista.texto, /3 \(três\) parcelas|1\.000,01/);
assert.match(avista.texto, /900,50/);

const condicao = condicaoAprovadaParecer({
  forma: "avista",
  valorTotal: 1000.01,
  valorAvista: 900.5,
  quantidadeParcelas: 3,
});
assert.equal(condicao.valor_final, 900.5);
assert.equal(condicao.desconto_percentual, 0);
assert.equal(condicao.valor_avista, 900.5);
assert.equal(condicao.quantidade_parcelas, 1);
const condicaoParcelas = condicaoAprovadaParecer({
  forma: "parcelado",
  valorTotal: 1000.01,
  valorAvista: 900.5,
  quantidadeParcelas: 3,
});
assert.equal(condicaoParcelas.valor_final, 1000.01);
assert.equal(condicaoParcelas.valor_avista, null);
assert.equal(condicaoParcelas.desconto_percentual, 0);

const orcInsal = makeOrcamento({
  id: "o-insal",
  numero: "ORC-2026-0501",
  valor_total: 4500,
  orcamento_itens: [
    {
      ...itemParecer(4500),
      servico_nome: SERVICO_INSALUBRIDADE_NOME,
    },
  ],
});
const apInsal = makeAprovacao(SERVICO_INSALUBRIDADE_NOME, 4500);
assert.equal(
  motivoBloqueioGeracaoContrato(orcInsal, apInsal),
  SERVICO_INSALUBRIDADE_CONTRATO_NAO_CONFIGURADO_MSG
);
assert.throws(
  () =>
    buildContratoNavarroDocumento({
      orcamento: orcInsal,
      aprovacao: apInsal,
      dataContrato: "2026-10-14",
    }),
  new RegExp(SERVICO_INSALUBRIDADE_CONTRATO_NAO_CONFIGURADO_MSG)
);

const orcAet = makeOrcamento({
  id: "o-aet",
  numero: "ORC-2026-0063",
  valor_total: 3200,
  quantidade_parcelas: 2,
  orcamento_itens: [
    { ...itemParecer(3200), servico_nome: SERVICO_AET_NOME, servico_id: "aet-1" },
  ],
});
const apAet = makeAprovacao(SERVICO_AET_NOME, 3200);
apAet.quantidade_parcelas = 2;
apAet.valor_parcela = 1600;
const docAet = buildContratoNavarroDocumento({
  orcamento: orcAet,
  aprovacao: apAet,
  dataContrato: "2026-10-14",
  vencimentosIso: ["2026-10-20", "2026-11-20"],
});
assert.equal(docAet.tipoDocumento, "aet");
assert.match(docAet.texto, /Análise Ergonômica do Trabalho/);
assert.doesNotMatch(docAet.texto, /quesitos técnicos/);
assert.doesNotMatch(docAet.texto, /Parecer Técnico/);

assert.equal(
  nomeArquivoContratoNavarro("METALURGICA AURORA LTDA", "parecer_tecnico"),
  "Contrato - Laudo de Parecer Técnico - METALURGICA AURORA LTDA.pdf"
);
assert.equal(
  nomeArquivoContratoNavarro("METALURGICA AURORA LTDA", "aet"),
  "Contrato - AET - METALURGICA AURORA LTDA.pdf"
);

const pdf = new jsPDF({ unit: "mm", format: "a4" });
drawContratoPdfDocument(pdf, parcelado, null);
const pages = pdf.getNumberOfPages();
assert.ok(pages >= 2 && pages <= 6, `paginas=${pages}`);
const visivel = pdfVisibleText(pdf);
assert.match(visivel, /PARECER T[EÉ]CNICO/i);
assert.match(visivel, /METALURGICA AURORA/);
assert.match(visivel, /quesitos t[eé]cnicos/i);
assert.match(visivel, /DO FORO|FORO/i);
assert.match(visivel, /CONTRATANTE/);
assert.match(visivel, /CONTRATADA/);
assert.doesNotMatch(visivel, /undefined/);
assert.doesNotMatch(visivel, /visita t[eé]cnica/i);
assert.doesNotMatch(visivel, /5%/);

const outDir = path.join(process.cwd(), "tmp");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "preview-contrato-parecer.pdf"),
  Buffer.from(pdf.output("arraybuffer"))
);

console.log("test-contrato-parecer-tecnico ok", { pages });
