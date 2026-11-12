/**
 * Contrato de Gestão SST + Plataformas do ORC-2026-0087
 * e preservação do modelo padrão da Gestão SST.
 * Rode: npx --yes tsx scripts/test-contrato-gestao-sst-plataformas.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import { drawContratoPdfDocument } from "../lib/contrato-pdf";
import {
  CONTRATO_GESTAO_SST_PLATAFORMAS_IDENTIFICADOR,
  CONTRATO_GESTAO_SST_PLATAFORMAS_TITULO,
  ORCAMENTO_GESTAO_SST_PLATAFORMAS_NUMERO,
  PROPOSTA_APROVADA_ORC_2026_0087_OBSERVACAO,
  orcamentoUsaContratoGestaoSstPlataformas,
  propostaIncluiJanelaOperacionalUmaSemana,
  propostaIncluiPostagemRhAdministrativoFinanceiro,
} from "../lib/contrato-gestao-sst-plataformas";
import { buildContratoNavarroDocumento } from "../lib/contrato-modelo";
import { GESTAO_SST_MENSAL_NOME, ORCAMENTO_MODALIDADE_MENSALIDADE } from "../lib/orcamento-modalidade";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoComItens } from "../lib/orcamento-types";

function orcamento(
  over: Partial<OrcamentoComItens> & {
    servico_id?: string;
    servico_nome?: string;
  } = {}
): OrcamentoComItens {
  const servicoId = over.servico_id ?? "s-gestao";
  const servicoNome = over.servico_nome ?? GESTAO_SST_MENSAL_NOME;
  const { servico_id: _id, servico_nome: _nome, orcamento_itens, ...rest } = over;
  return {
    id: "o-agro",
    numero: ORCAMENTO_GESTAO_SST_PLATAFORMAS_NUMERO,
    data_proposta: "2026-11-10",
    cliente_id: "c-agro",
    cliente_nome: "AGROVIAS MEIO AMBIENTE E PAISAGEM LTDA",
    cliente_cnpj: "07803876000115",
    cliente_endereco: "R DIMAS FERREIRA DE CARVALHO, 20, VILA NOVA, ARAÇARIGUAMA/SP",
    cliente_setor: "COMÉRCIO VAREJISTA DE PLANTAS",
    contato: "JAQUELINE GRANDE",
    email: "contato@agrovias.com.br",
    telefone: "(11) 99999-0000",
    responsavel: "BRUNA",
    origem_cliente: "indicacao",
    observacoes: null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: null,
    quantidade_parcelas: null,
    validade_proposta: "2026-11-25",
    subtotal: 2520,
    status: "aprovado",
    assinatura_status: "nao_aplicavel",
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: "",
    updated_at: "",
    modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
    valor_total: 2520,
    orcamento_itens: orcamento_itens ?? [
      {
        id: "i1",
        orcamento_id: "o-agro",
        servico_id: servicoId,
        servico_nome: servicoNome,
        quantidade: 58,
        valor_unitario: 2520,
        valor_total: 2520,
        ordem: 0,
      },
    ],
    ...rest,
  };
}

function aprovacao(
  over: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "ap-agro",
    orcamento_id: "o-agro",
    quantidade_colaboradores: 58,
    valor_final: 2520,
    condicao_pagamento: "12 mensalidades",
    quantidade_parcelas: 12,
    valor_parcela: 2520,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "BRUNA",
    aprovado_em: "2026-11-12T12:00:00.000Z",
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
    mensalidade_pagamento: "mensal",
    mensalidade_valor_mensal: 2520,
    mensalidade_meses: 12,
    mensalidade_renovacao_automatica: true,
    mensalidade_dia_vencimento: 10,
    ...over,
  };
}

function gerar(
  params: {
    orcamento?: OrcamentoComItens;
    aprovacao?: OrcamentoAprovacaoRecord;
    dia?: number | null;
    regra?: "quinto_dia_util" | null;
  } = {}
) {
  return buildContratoNavarroDocumento({
    orcamento: params.orcamento ?? orcamento(),
    aprovacao: params.aprovacao ?? aprovacao(),
    dataContrato: "2026-11-12",
    vigenciaInicio: "2026-11-12",
    vigenciaFim: "2027-11-12",
    diaVencimentoMensalidade: params.dia === undefined ? 10 : params.dia,
    vencimentoRegraMensalidade: params.regra === undefined ? null : params.regra,
  });
}

assert.equal(
  propostaIncluiPostagemRhAdministrativoFinanceiro([
    PROPOSTA_APROVADA_ORC_2026_0087_OBSERVACAO,
  ]),
  false
);
assert.equal(
  propostaIncluiJanelaOperacionalUmaSemana([
    PROPOSTA_APROVADA_ORC_2026_0087_OBSERVACAO,
  ]),
  false
);
assert.equal(
  orcamentoUsaContratoGestaoSstPlataformas({
    numero: "ORC-2026-0100",
    itens: [{ servico_id: "s1", servico_nome: GESTAO_SST_MENSAL_NOME }],
  }),
  false
);
assert.equal(
  orcamentoUsaContratoGestaoSstPlataformas({
    numero: "ORC-2026-0200",
    itens: [
      {
        servico_id: CONTRATO_GESTAO_SST_PLATAFORMAS_IDENTIFICADOR,
        servico_nome: "Outro nome gravado",
      },
    ],
  }),
  true
);

const agro = gerar();
const texto = agro.texto;
assert.equal(agro.tipoDocumento, "mensalidade");
assert.equal(agro.contratante.razaoSocial, "AGROVIAS MEIO AMBIENTE E PAISAGEM LTDA");
assert.equal(agro.colaboradores, 58);
assert.equal(agro.valor, 2520);
assert.equal(agro.numeroOrcamento, "ORC-2026-0087");
assert.equal(
  agro.tituloLinhas.join(" "),
  "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO SST E ADMINISTRAÇÃO DE PLATAFORMAS"
);
assert.match(texto, new RegExp(CONTRATO_GESTAO_SST_PLATAFORMAS_TITULO));
assert.match(texto, /ANEXO I — DOS SERVIÇOS CONTRATADOS/);
assert.match(texto, /Proposta Comercial nº ORC-2026-0087/);
assert.match(texto, /58 \(cinquenta e oito\) colaboradores/);
assert.match(texto, /R\$ 2\.520,00/);
assert.match(texto, /Administração de até 10 plataformas/);
assert.match(texto, /A quantidade de plataformas e a relação de obras são informações distintas/);
assert.match(texto, /adequação dos laudos sob responsabilidade da CONTRATADA/);
assert.match(texto, /controle de vencimentos de exames ocupacionais, treinamentos e documentos de SST/);
assert.match(texto, /Cadastro, atualização, substituição e retirada de colaboradores por obra/);
assert.match(texto, /postagens recorrentes/);
assert.match(texto, /reapresentação de documentos corrigidos/);
assert.match(texto, /Mobilização das equipes/);
assert.match(texto, /A validação documental e a liberação final cabem à plataforma/);
assert.match(texto, /acima do limite de 10 depende de aprovação prévia/);
assert.match(texto, /é única e remunera, em conjunto/);
assert.match(texto, /Não há segunda mensalidade/);
assert.match(texto, /inclusive nas renovações automáticas/);
assert.match(texto, /no dia 10 de cada mês/);
assert.doesNotMatch(texto, /Documentos de RH, administrativos e financeiros/);
assert.doesNotMatch(texto, /arquivos prontos/);
assert.doesNotMatch(texto, /uma semana/);
assert.doesNotMatch(texto, /5\.040,00/);
assert.ok(agro.parcelas.every((parcela) => parcela.valor === 2520));
assert.equal(agro.parcelas.length, 12);

const semRenovacao = gerar({
  aprovacao: aprovacao({ mensalidade_renovacao_automatica: false }),
});
assert.match(semRenovacao.texto, /Não há renovação automática desta cobertura/);
assert.doesNotMatch(semRenovacao.texto, /inclusive nas renovações automáticas/);

const dia20 = gerar({
  dia: 20,
  aprovacao: aprovacao({ mensalidade_dia_vencimento: 20 }),
});
assert.match(dia20.texto, /As mensalidades vencerão no dia 20 de cada mês/);
assert.doesNotMatch(dia20.texto, /As mensalidades vencem no quinto dia útil/);

const quinto = gerar({
  dia: null,
  regra: "quinto_dia_util",
  aprovacao: aprovacao({
    mensalidade_dia_vencimento: null,
    mensalidade_vencimento_regra: "quinto_dia_util",
  }),
});
assert.match(quinto.texto, /As mensalidades vencem no quinto dia útil do respectivo mês/);
assert.equal(quinto.valor, 2520);

const porServico = gerar({
  orcamento: orcamento({
    numero: "ORC-2026-0999",
    cliente_nome: "CLIENTE PLATAFORMAS LTDA",
    servico_nome: "Gestão SST + Plataformas",
    observacoes: null,
  }),
});
assert.match(porServico.tituloLinhas.join(" "), /ADMINISTRAÇÃO DE PLATAFORMAS/);
assert.match(porServico.texto, /Administração de até 10 plataformas/);
assert.doesNotMatch(porServico.texto, /Documentos de RH/);

const comRh = gerar({
  orcamento: orcamento({
    observacoes:
      "Inclui a postagem de documentos de SST, RH, administrativos e financeiros. O cliente fornece os documentos de RH, administrativos e financeiros para postagem.",
  }),
});
assert.match(
  comRh.texto,
  /A CONTRATANTE fornece os arquivos prontos e as correções desses documentos/
);
assert.match(comRh.texto, /A CONTRATADA confere, posta e acompanha as pendências nas plataformas/);

const comSemana = gerar({
  orcamento: orcamento({
    observacoes: "A janela operacional de uma semana está prevista na proposta.",
  }),
});
assert.match(comSemana.texto, /no prazo de uma semana/);

const comum = gerar({
  orcamento: orcamento({
    id: "o-comum",
    numero: "ORC-2026-0100",
    cliente_nome: "EMPRESA EXEMPLO LTDA",
    valor_total: 200,
    subtotal: 200,
    observacoes: "A empresa usa uma plataforma interna de ponto.",
    orcamento_itens: [
      {
        id: "i-comum",
        orcamento_id: "o-comum",
        servico_id: "s-gestao",
        servico_nome: GESTAO_SST_MENSAL_NOME,
        quantidade: 8,
        valor_unitario: 200,
        valor_total: 200,
        ordem: 0,
      },
    ],
  }),
  aprovacao: aprovacao({
    orcamento_id: "o-comum",
    quantidade_colaboradores: 8,
    valor_final: 200,
    valor_parcela: 200,
    mensalidade_valor_mensal: 200,
  }),
});
assert.deepEqual(comum.tituloLinhas, [
  "INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS",
  "DE SAÚDE E SEGURANÇA DO TRABALHO",
]);
assert.match(comum.texto, /ANEXO I — DOS SERVIÇOS CONTRATADOS/);
assert.match(comum.texto, /Proposta Comercial nº ORC-2026-0100/);
assert.doesNotMatch(comum.texto, /Administração de até 10 plataformas/);
assert.doesNotMatch(comum.texto, /ADMINISTRAÇÃO DE PLATAFORMAS/);
assert.doesNotMatch(comum.texto, /Não há segunda mensalidade/);
assert.equal(comum.valor, 200);
assert.equal(comum.colaboradores, 8);

const doc = new jsPDF({ unit: "mm", format: "a4" });
drawContratoPdfDocument(doc, agro, null);
const bruto = Buffer.from(doc.output("arraybuffer"));
const pasta = path.join(process.cwd(), "tmp", "gestao-sst-plataformas");
fs.mkdirSync(pasta, { recursive: true });
const arquivo = path.join(pasta, "contrato-validacao.pdf");
fs.writeFileSync(arquivo, Buffer.from(bruto));
const pdf = bruto.toString("latin1");
assert.ok(doc.getNumberOfPages() >= 2);
assert.match(pdf, /ADMINISTRA/);
assert.match(pdf, /PLATAFORMAS/);
assert.match(pdf, /ORC-2026-0087/);
assert.match(pdf, /2\.520,00/);
assert.match(pdf, /cinquenta e oito/);
assert.match(pdf, /at. 10 plataformas/);
assert.doesNotMatch(pdf, /Documentos de RH/);
assert.doesNotMatch(pdf, /uma semana/);

console.log("ok contrato gestao sst plataformas");
console.log("pdf", arquivo, "paginas", doc.getNumberOfPages());
