/**
 * Condições novas da Gestão SST (modelo 2) e preservação do modelo anterior.
 * Rode: npx --yes tsx scripts/test-contrato-gestao-sst-v2.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { jsPDF } from "jspdf";
import { addMonthsToIsoDate } from "../lib/cliente-contrato-dates";
import { exameDemissionalDispensadoPelaNr7 } from "../lib/cobertura-exame-clinico";
import {
  montarDatasMensalidadesPlano,
  montarDatasMensalidadesQuintoDiaUtil,
} from "../lib/contrato-pagamento";
import {
  buildClausulasContrato,
  paragrafosPropostaGestaoMensal,
  textoPlanoContrato,
  type ContratoNavarroContexto,
} from "../lib/contrato-navarro";
import { drawContratoPdfDocument } from "../lib/contrato-pdf";
import { buildContratoNavarroDocumento } from "../lib/contrato-modelo";
import {
  resolverModeloContratualGestaoSst,
  rotuloModeloContratualGestaoSst,
} from "../lib/contrato-modelo-rotulo";
import { isExameFaturavel } from "../lib/fatura-elegibilidade";
import {
  isDiaUtilBancario,
  isDiaUtilSemFeriado,
  quintoDiaUtilIsoDoMes,
} from "../lib/dia-util";
import { resolverGradeMensalidades } from "../lib/mensalidade-parcelas";
import {
  GESTAO_SST_MENSAL_NOME,
  ORCAMENTO_MODALIDADE_MENSALIDADE,
} from "../lib/orcamento-modalidade";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoComItens } from "../lib/orcamento-types";
import type { ContratoNavarroDocumento } from "../lib/contrato-modelo";

function ctx(over: Partial<ContratoNavarroContexto> = {}): ContratoNavarroContexto {
  return {
    modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
    numeroOrcamento: "ORC-2026-0100",
    dataContrato: "2026-11-10",
    contratante: {
      razaoSocial: "EMPRESA EXEMPLO LTDA",
      cnpj: "12345678000199",
      endereco: "Rua das Flores, 100",
      telefone: "(11) 99999-0000",
      email: "contato@empresa.com",
      setor: "Comércio",
    },
    colaboradores: 8,
    valor: 200,
    condicaoPagamento: "12 mensalidades",
    parcelas: [],
    servicos: [GESTAO_SST_MENSAL_NOME],
    pagamentoMensalidade: {
      forma: "mensal",
      meses: 12,
      valorMensal: 200,
    },
    valorExameClinicoAvulso: 50,
    diaVencimentoMensalidade: 10,
    renovacaoAutomatica: true,
    vigenciaInicioIso: "2026-11-10",
    vigenciaFimIso: "2027-11-10",
    ...over,
  };
}

function texto(over: Partial<ContratoNavarroContexto> = {}): string {
  return textoPlanoContrato(buildClausulasContrato(ctx(over)));
}

function orcamento(): OrcamentoComItens {
  return {
    id: "o1",
    numero: "ORC-2026-0100",
    data_proposta: "2026-11-01",
    cliente_id: "c1",
    cliente_nome: "EMPRESA EXEMPLO LTDA",
    cliente_cnpj: "12345678000199",
    cliente_endereco: "Rua das Flores, 100, São Paulo/SP",
    cliente_setor: "Comércio",
    contato: "Maria",
    email: "contato@empresa.com",
    telefone: "(11) 99999-0000",
    responsavel: "AGATHA",
    origem_cliente: "indicacao",
    observacoes: null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: null,
    quantidade_parcelas: null,
    validade_proposta: null,
    subtotal: 200,
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
    valor_total: 200,
    orcamento_itens: [
      {
        id: "i1",
        orcamento_id: "o1",
        servico_id: "s1",
        servico_nome: GESTAO_SST_MENSAL_NOME,
        quantidade: 1,
        valor_unitario: 200,
        valor_total: 200,
        ordem: 0,
      },
    ],
  };
}

function aprovacao(
  over: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "ap1",
    orcamento_id: "o1",
    quantidade_colaboradores: 8,
    valor_final: 200,
    condicao_pagamento: "12 mensalidades",
    quantidade_parcelas: 12,
    valor_parcela: 200,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "Ágatha",
    aprovado_em: "2026-11-10T12:00:00.000Z",
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
    mensalidade_valor_mensal: 200,
    mensalidade_meses: 12,
    contrato_modelo_versao: 2,
    ...over,
  };
}

function pdfDe(documento: ContratoNavarroDocumento): { paginas: number; bruto: string } {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawContratoPdfDocument(doc, documento, null);
  return {
    paginas: doc.getNumberOfPages(),
    bruto: Buffer.from(doc.output("arraybuffer")).toString("latin1"),
  };
}

const legado = texto();
assert.match(legado, /regras de atendimento vigentes/);
assert.match(legado, /periódico ou demissional/);
assert.match(legado, /possibilidade de saneamento/);
assert.doesNotMatch(legado, /ANEXO I/);
assert.doesNotMatch(legado, /valor bruto mensal/);

const novo = texto({ modeloVersao: 2 });
assert.match(novo, /ANEXO I — DOS SERVIÇOS CONTRATADOS/);
assert.match(novo, /Proposta Comercial nº ORC-2026-0100/);
assert.match(novo, /questionário COPSOQ II/);
assert.match(novo, /confidencialidade dos participantes/);
assert.match(novo, /em até 3 \(três\) dias úteis/);
assert.match(novo, /Esse prazo não abrange exames complementares/);
assert.doesNotMatch(novo, /regras de atendimento vigentes/);
assert.doesNotMatch(novo, /periódico ou demissional/);
assert.doesNotMatch(novo, /já tiver sido realizado/);
assert.match(novo, /utilização de um tipo não consome a cobertura de outro tipo/);
assert.match(novo, /menos de 135 dias/);
assert.match(novo, /menos de 90 dias/);
assert.match(novo, /não se confunde com a cobertura financeira/);
assert.match(novo, /DOS VALORES, PAGAMENTOS E VENCIMENTOS/);
assert.match(novo, /valor bruto mensal de R\$ 200,00/);
assert.match(novo, /multa de 2%/);
assert.match(novo, /juros de mora de 1%/);
assert.match(novo, /correção aplicável/);
assert.match(novo, /válidos somente para a vigência paga/);
assert.match(novo, /compromisso anual, inclusive nas renovações automáticas/);
assert.match(novo, /durante uma vigência/);
assert.match(novo, /até o fim da vigência/);
assert.match(novo, /Afastamentos programados/);
assert.match(novo, /até o próximo dia útil/);
assert.match(novo, /previsão de retorno/i);
assert.match(novo, /incidente de segurança/);
assert.match(novo, /rescindir imediatamente/);
assert.doesNotMatch(novo, /possibilidade de saneamento/);
assert.doesNotMatch(novo, /24 meses/);
assert.doesNotMatch(novo, /após o primeiro ano/);
assert.doesNotMatch(novo, /após um ano/);
assert.doesNotMatch(novo, /R\$ 260,00/);
assert.match(novo, /dia 10 de cada mês/);
assert.match(novo, /Esse vencimento refere-se às faturas dos exames/);
assert.match(novo, /10\/11\/2026/);
assert.match(novo, /10\/11\/2027/);

const quinto = texto({
  modeloVersao: 2,
  diaVencimentoMensalidade: null,
  vencimentoRegraMensalidade: "quinto_dia_util",
});
assert.match(quinto, /quinto dia útil do respectivo mês/);
assert.match(quinto, /não corresponde ao dia 05 fixo/);
assert.doesNotMatch(quinto, /Esse vencimento refere-se às faturas dos exames/);
assert.match(quinto, /quinto dia útil do mês seguinte/);

const dia20 = texto({ modeloVersao: 2, diaVencimentoMensalidade: 20 });
assert.match(dia20, /dia 20 de cada mês/);
assert.match(dia20, /Esse vencimento refere-se às faturas dos exames/);

const semRenovacao = texto({ modeloVersao: 2, renovacaoAutomatica: false });
assert.match(semRenovacao, /sem renovação automática/);
assert.match(semRenovacao, /durante uma vigência/);
assert.doesNotMatch(semRenovacao, /24 meses/);

const soPgr = texto({
  modeloVersao: 2,
  servicos: ["PGR - Programa de Gerenciamento de Riscos."],
});
assert.match(soPgr, /PGR - Programa de Gerenciamento de Riscos/);
assert.doesNotMatch(soPgr, /COPSOQ/);
assert.doesNotMatch(soPgr, /PCMSO\. Elaboração/);

const precosDistintos = texto({
  modeloVersao: 2,
  valorExameClinicoAvulso: 50,
  valorExameClinicoDemissional: 80,
});
assert.match(precosDistintos, /R\$ 50,00/);
assert.match(precosDistintos, /R\$ 80,00/);

const avista = texto({
  modeloVersao: 2,
  pagamentoMensalidade: {
    forma: "avista",
    meses: 12,
    valorMensal: 200,
    valorBruto: 2400,
    desconto: 200,
    valorFinal: 2200,
  },
  diaVencimentoMensalidade: null,
});
assert.match(avista, /valor bruto mensal é de R\$ 200,00/);
assert.match(avista, /pagamento antecipado/);
assert.doesNotMatch(avista, /dia 05/);

assert.equal(addMonthsToIsoDate("2026-11-10", 12), "2027-11-10");

const datasQuinto = montarDatasMensalidadesQuintoDiaUtil({
  inicioVigenciaIso: "2026-11-10",
  quantidade: 12,
});
assert.equal(datasQuinto.length, 12);
assert.equal(datasQuinto[0], quintoDiaUtilIsoDoMes(2026, 12));
assert.equal(datasQuinto[0], "2026-12-07");
assert.notEqual(datasQuinto[0]?.slice(8), "05");
assert.equal(isDiaUtilSemFeriado(new Date(2026, 4, 1)), true);
assert.equal(isDiaUtilBancario(new Date(2026, 4, 1)), false);
assert.equal(quintoDiaUtilIsoDoMes(2026, 5), "2026-05-08");
assert.deepEqual(
  montarDatasMensalidadesPlano({
    inicioVigenciaIso: "2026-11-10",
    dia: 10,
    quantidade: 1,
  }),
  ["2026-12-10"]
);
assert.deepEqual(
  montarDatasMensalidadesPlano({
    inicioVigenciaIso: "2026-11-10",
    dia: 20,
    quantidade: 1,
  }),
  ["2026-12-20"]
);

const gradeSalva = resolverGradeMensalidades({
  vigenciaInicio: "2026-11-10",
  vigenciaFim: "2027-11-10",
  vencimentoRegra: "quinto_dia_util",
  valorMensal: 200,
  hojeIso: "2026-11-04",
  registradas: [
    {
      vigenciaInicio: "2026-11-10",
      vigenciaFim: "2027-11-10",
      numero: 1,
      vencimentoIso: "2026-12-15",
      valor: 200,
      pagoEmIso: null,
    },
  ],
});
assert.equal(gradeSalva.ok, true);
if (gradeSalva.ok) {
  assert.equal(gradeSalva.parcelas[0]?.vencimentoIso, "2026-12-15");
  assert.equal(gradeSalva.parcelas[1]?.vencimentoIso, quintoDiaUtilIsoDoMes(2027, 1));
  assert.notEqual(gradeSalva.parcelas[0]?.vencimentoIso, gradeSalva.parcelas[1]?.vencimentoIso);
}

const gradeDia10 = resolverGradeMensalidades({
  vigenciaInicio: "2026-11-10",
  dia: 10,
  valorMensal: 200,
  hojeIso: "2026-11-04",
});
assert.equal(gradeDia10.ok, true);
if (gradeDia10.ok) {
  assert.equal(gradeDia10.parcelas[0]?.vencimentoIso, "2026-12-10");
  assert.equal(gradeDia10.parcelas.length, 12);
}

assert.equal(
  exameDemissionalDispensadoPelaNr7({
    grauRisco: 1,
    diasDesdeUltimoExameClinico: 134,
  }),
  true
);
assert.equal(
  exameDemissionalDispensadoPelaNr7({
    grauRisco: 2,
    diasDesdeUltimoExameClinico: 135,
  }),
  false
);
assert.equal(
  exameDemissionalDispensadoPelaNr7({
    grauRisco: 4,
    diasDesdeUltimoExameClinico: 89,
  }),
  true
);
assert.equal(
  exameDemissionalDispensadoPelaNr7({
    grauRisco: 3,
    diasDesdeUltimoExameClinico: 90,
  }),
  false
);

const documentoNovo = buildContratoNavarroDocumento({
  orcamento: orcamento(),
  aprovacao: aprovacao({
    mensalidade_vencimento_regra: "quinto_dia_util",
    mensalidade_dia_vencimento: null,
  }),
  dataContrato: "2026-11-10",
  vigenciaInicio: "2026-11-10",
  vigenciaFim: "2027-11-10",
});
assert.equal(documentoNovo.parcelas[0]?.dataIso, quintoDiaUtilIsoDoMes(2026, 12));
assert.equal(documentoNovo.parcelas.length, 12);
const pdfNovo = pdfDe(documentoNovo);
assert.ok(pdfNovo.paginas >= 2, `pdf novo ficou com ${pdfNovo.paginas} página(s)`);
assert.match(pdfNovo.bruto, /ANEXO I/);
assert.match(pdfNovo.bruto, /COPSOQ II/);
assert.doesNotMatch(pdfNovo.bruto, /regras de atendimento vigentes/);

const documentoAntigo = buildContratoNavarroDocumento({
  orcamento: orcamento(),
  aprovacao: aprovacao({
    contrato_modelo_versao: 1,
    mensalidade_dia_vencimento: 10,
    mensalidade_vencimento_regra: null,
  }),
  dataContrato: "2026-11-10",
  vigenciaInicio: "2026-11-10",
  vigenciaFim: "2027-11-10",
  diaVencimentoMensalidade: 10,
});
assert.equal(documentoAntigo.parcelas[0]?.dataIso, "2026-12-10");
const pdfAntigo = pdfDe(documentoAntigo);
assert.match(pdfAntigo.bruto, /regras de atendimento vigentes/);
assert.doesNotMatch(pdfAntigo.bruto, /ANEXO I/);

assert.equal(
  resolverModeloContratualGestaoSst({
    propostaModeloVersao: 1,
    contratoModeloVersao: 2,
  }),
  1
);
assert.equal(
  resolverModeloContratualGestaoSst({
    propostaModeloVersao: 2,
    contratoModeloVersao: 2,
  }),
  2
);
assert.equal(
  resolverModeloContratualGestaoSst({
    propostaModeloVersao: null,
    contratoModeloVersao: null,
  }),
  1
);
assert.equal(rotuloModeloContratualGestaoSst(1), "Condições anteriores");
assert.equal(
  rotuloModeloContratualGestaoSst(2),
  "Novas condições da Gestão SST"
);

const regeneradoAntigo = buildContratoNavarroDocumento({
  orcamento: { ...orcamento(), numero: "ORC-2026-0072", proposta_modelo_versao: 1 },
  aprovacao: aprovacao({ contrato_modelo_versao: 2 }),
  dataContrato: "2026-11-10",
  vigenciaInicio: "2026-11-10",
  vigenciaFim: "2027-11-10",
  diaVencimentoMensalidade: 10,
});
const pdfRegenerado = pdfDe(regeneradoAntigo);
assert.doesNotMatch(pdfRegenerado.bruto, /ANEXO I/);
assert.match(pdfRegenerado.bruto, /regras de atendimento vigentes/);

const avistaDoc = buildContratoNavarroDocumento({
  orcamento: orcamento(),
  aprovacao: aprovacao({
    mensalidade_pagamento: "avista",
    valor_avista: 2200,
    mensalidade_valor_bruto: 2400,
    mensalidade_desconto_valor: 200,
    mensalidade_dia_vencimento: null,
  }),
  dataContrato: "2026-11-10",
  vigenciaInicio: "2026-11-10",
  vigenciaFim: "2027-11-10",
});
assert.equal(avistaDoc.parcelas.length, 1);
assert.equal(avistaDoc.parcelas[0]?.dataIso, "2026-11-10");

const propostaAntiga = paragrafosPropostaGestaoMensal({
  exameAdmissional: 50,
  exameDemissional: 50,
}).join("\n");
assert.match(propostaAntiga, /periódico ou demissional|ou demissional quando o desligamento/);
assert.doesNotMatch(propostaAntiga, /um exame clínico de cada tipo/i);

const propostaNova = paragrafosPropostaGestaoMensal({
  exameAdmissional: 50,
  exameDemissional: 50,
  modeloVersao: 2,
}).join("\n");
assert.match(propostaNova, /um exame clínico de cada tipo/i);
assert.match(propostaNova, /admitidos durante a vigência/i);
assert.doesNotMatch(propostaNova, /ou demissional quando o desligamento/);

assert.equal(
  isExameFaturavel({
    status: "agendado",
    valor: 50,
  }),
  true
);
assert.equal(
  isExameFaturavel({ status: "cancelado", valor: 50 }),
  false
);

const sql152 = fs.readFileSync(
  "supabase/migrations/152_contrato_modelo_gestao_sst.sql",
  "utf8"
);
const sql153 = fs.readFileSync(
  "supabase/migrations/153_cobertura_vigencia_proposta_versao.sql",
  "utf8"
);
assert.match(sql152, /contrato_modelo_versao smallint not null default 1/);
assert.match(sql153, /proposta_modelo_versao smallint not null default 1/);
assert.match(sql153, /before insert on public\.orcamentos/);
assert.match(sql153, /new\.proposta_modelo_versao := 2/);
assert.match(
  sql153,
  /new\.contrato_modelo_versao := case when versao_proposta = 2 then 2 else 1 end/
);
assert.doesNotMatch(sql152, /update\s+public\.orcamento/i);
assert.doesNotMatch(sql153, /update\s+public\.orcamento/i);
assert.doesNotMatch(sql153, /contrato_cobertura_vigencia/);

console.log("OK  contrato gestao sst v2");
