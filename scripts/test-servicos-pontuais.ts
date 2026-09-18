/** Isolamento AET vs contrato SST e seção Serviços pontuais. */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { ImplantacaoAetRecord } from "../lib/implantacao-aet";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import {
  isAprovacaoIntegracaoCompleta,
  parseAprovacaoIntegracaoError,
} from "../lib/orcamento-aprovacao-integracao";
import { GESTAO_COMPLETA_SST_NOME } from "../lib/orcamento-modalidade";
import { PACOTE_COMPLETO_SST_NOME } from "../lib/servico-sst-pacote";
import { SERVICO_AET_NOME } from "../lib/servico-aet";
import { SERVICO_SST_NOME_TREINAMENTOS } from "../lib/servico-treinamentos";
import {
  hrefAcompanhamentoServicoPontual,
  isContratacaoServicoPontual,
  labelFinanceiroServicoPontual,
  labelStatusServicoPontual,
  listServicosPontuaisContratados,
  readImplantacaoOrcamentoIdFromSearch,
  resolveServicoPontualKind,
} from "../lib/servicos-pontuais";

function aprovacao(
  partial: Partial<OrcamentoAprovacaoRecord> &
    Pick<OrcamentoAprovacaoRecord, "id" | "orcamento_id">,
  servicoNome: string,
  valor = 3200
): OrcamentoAprovacaoRecord {
  return {
    quantidade_colaboradores: servicoNome === SERVICO_AET_NOME ? 0 : 57,
    valor_final: valor,
    condicao_pagamento: "Parcelado",
    quantidade_parcelas: 1,
    valor_parcela: valor,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "AGATHA",
    aprovado_em: "2026-09-17T12:00:00Z",
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
        id: `${partial.id}-i`,
        aprovacao_id: partial.id,
        servico_id: "snap-1",
        servico_nome: servicoNome,
        quantidade: 1,
        valor_unitario: valor,
        valor_total: valor,
        ordem: 0,
      },
    ],
    ...partial,
  };
}

function aetRow(
  partial: Partial<ImplantacaoAetRecord> = {}
): ImplantacaoAetRecord {
  return {
    id: "aet1",
    orcamento_id: "o-aet-1",
    aprovacao_id: "ap-aet-1",
    documentos_conferidos: false,
    documentos_conferidos_em: null,
    documentos_conferidos_por: null,
    visita_status: "aguardando_agendamento",
    visita_data: null,
    visita_horario: null,
    visita_responsavel: null,
    visita_observacao: null,
    visita_realizada_em: null,
    elaboracao_status: "aguardando",
    elaboracao_observacao: null,
    elaboracao_concluida_em: null,
    laudo_path: null,
    laudo_nome: null,
    laudo_tipo: null,
    laudo_tamanho: null,
    enviado_cliente: false,
    enviado_em: null,
    envio_observacao: null,
    ...partial,
  };
}

const aetItem = { servico_id: "aet-1", servico_nome: SERVICO_AET_NOME };
const pacoteItem = {
  servico_id: "sst-1",
  servico_nome: PACOTE_COMPLETO_SST_NOME,
};
const mensalidadeItem = {
  servico_id: "men-1",
  servico_nome: GESTAO_COMPLETA_SST_NOME,
};
const treinoItem = {
  servico_id: "tr-1",
  servico_nome: SERVICO_SST_NOME_TREINAMENTOS,
};

assert.equal(isContratacaoServicoPontual([aetItem]), true);
assert.equal(resolveServicoPontualKind([aetItem]), "aet");
assert.equal(isContratacaoServicoPontual([pacoteItem]), false);
assert.equal(isContratacaoServicoPontual([mensalidadeItem]), false);
assert.equal(isContratacaoServicoPontual([treinoItem]), false);
assert.equal(isContratacaoServicoPontual([aetItem, pacoteItem]), false);

assert.equal(
  isAprovacaoIntegracaoCompleta({
    result: {
      aprovacao_id: "ap1",
      cliente_id: "cli-firenze",
      contrato_id: null,
    },
    itens: [aetItem],
  }),
  true
);
assert.equal(
  isAprovacaoIntegracaoCompleta({
    result: {
      aprovacao_id: "ap1",
      cliente_id: "cli-firenze",
      contrato_id: null,
    },
    itens: [pacoteItem],
  }),
  false
);
assert.equal(
  isAprovacaoIntegracaoCompleta({
    result: {
      aprovacao_id: "ap1",
      cliente_id: "cli-firenze",
      contrato_id: "ctr-19",
    },
    itens: [pacoteItem],
  }),
  true
);
assert.equal(
  isAprovacaoIntegracaoCompleta({
    result: { aprovacao_id: "ap1", cliente_id: "", contrato_id: null },
    itens: [aetItem],
  }),
  false
);

const rawIncompleta =
  "APROVACAO_INCOMPLETA: o orçamento só pode ficar Aprovado após criar/vincular cliente e contrato. Use a RPC aprovar_orcamento_integrar_cliente.";
assert.equal(parseAprovacaoIntegracaoError(new Error(rawIncompleta)), rawIncompleta);

assert.equal(labelStatusServicoPontual("contrato"), "Aguardando contrato");
assert.equal(labelStatusServicoPontual("financeiro"), "Aguardando pagamento");
assert.equal(labelStatusServicoPontual("documentos"), "Aguardando documentos");
assert.equal(labelStatusServicoPontual("visita_aet"), "Visita a agendar");
assert.equal(labelStatusServicoPontual("visita_agendada"), "Visita agendada");
assert.equal(labelStatusServicoPontual("elaboracao"), "AET em elaboração");
assert.equal(labelStatusServicoPontual("envio"), "Aguardando envio");
assert.equal(labelStatusServicoPontual("concluido"), "Concluído");

assert.equal(
  hrefAcompanhamentoServicoPontual("abc-123"),
  "/implantacao?orcamentoId=abc-123"
);
assert.equal(
  readImplantacaoOrcamentoIdFromSearch("?orcamentoId=abc-123"),
  "abc-123"
);

const aet2026 = aprovacao(
  { id: "ap-aet-1", orcamento_id: "o-aet-1", aprovado_em: "2026-09-17T12:00:00Z" },
  SERVICO_AET_NOME,
  3200
);
const aet2027 = aprovacao(
  { id: "ap-aet-2", orcamento_id: "o-aet-2", aprovado_em: "2027-02-01T12:00:00Z" },
  SERVICO_AET_NOME,
  4100
);
const sst = aprovacao(
  { id: "ap-sst", orcamento_id: "o-sst", aprovado_em: "2026-01-10T12:00:00Z" },
  PACOTE_COMPLETO_SST_NOME,
  18000
);

const sstMaisAet = listServicosPontuaisContratados({
  orcamentos: [
    { id: "o-sst", numero: "ORC-2026-0028" },
    { id: "o-aet-1", numero: "ORC-2026-0063" },
  ],
  aprovacoesByOrcamentoId: new Map([
    ["o-sst", sst],
    ["o-aet-1", aet2026],
  ]),
});
assert.equal(sstMaisAet.length, 1);
assert.equal(sstMaisAet[0].numeroOrcamento, "ORC-2026-0063");
assert.equal(sstMaisAet[0].servicoNome, SERVICO_AET_NOME);
assert.equal(sstMaisAet[0].valorFinal, 3200);
assert.equal(sstMaisAet[0].statusLabel, "Aguardando contrato");
assert.equal(sstMaisAet[0].financeiroPendente, false);
assert.equal(sstMaisAet[0].financeiroLabel, "—");
assert.equal(sstMaisAet[0].kind, "aet");
assert.match(sstMaisAet[0].href, /orcamentoId=o-aet-1/);

const soAet = listServicosPontuaisContratados({
  orcamentos: [{ id: "o-aet-1", numero: "ORC-2026-0063" }],
  aprovacoesByOrcamentoId: new Map([["o-aet-1", aet2026]]),
});
assert.equal(soAet.length, 1);
assert.equal(soAet[0].numeroOrcamento, "ORC-2026-0063");

const sstSemPontual = listServicosPontuaisContratados({
  orcamentos: [{ id: "o-sst", numero: "ORC-2026-0028" }],
  aprovacoesByOrcamentoId: new Map([["o-sst", sst]]),
});
assert.equal(sstSemPontual.length, 0);

const doisAets = listServicosPontuaisContratados({
  orcamentos: [
    { id: "o-aet-1", numero: "ORC-2026-0063" },
    { id: "o-aet-2", numero: "ORC-2027-0001" },
  ],
  aprovacoesByOrcamentoId: new Map([
    ["o-aet-1", aet2026],
    ["o-aet-2", aet2027],
  ]),
  aetByOrcamentoId: new Map([
    ["o-aet-1", aetRow({ orcamento_id: "o-aet-1", aprovacao_id: "ap-aet-1" })],
    [
      "o-aet-2",
      aetRow({
        id: "aet2",
        orcamento_id: "o-aet-2",
        aprovacao_id: "ap-aet-2",
        visita_status: "agendada",
        visita_data: "2027-02-10",
        visita_horario: "09:00",
      }),
    ],
  ]),
});
assert.equal(doisAets.length, 2);
assert.equal(doisAets[0].numeroOrcamento, "ORC-2027-0001");
assert.equal(doisAets[1].numeroOrcamento, "ORC-2026-0063");
assert.equal(doisAets[0].statusLabel, "Aguardando contrato");
assert.notEqual(doisAets[0].orcamentoId, doisAets[1].orcamentoId);

const aetPago = aprovacao(
  {
    id: "ap-aet-pago",
    orcamento_id: "o-aet-pago",
    contrato_assinado: true,
    contrato_assinado_em: "2026-09-18",
    contrato_salvo_em: "2026-09-18T12:00:00Z",
    boleto_pago: true,
    boleto_pago_em: "2026-09-19",
    financeiro_salvo_em: "2026-09-19T12:00:00Z",
  },
  SERVICO_AET_NOME
);
const aetEmElaboracao = listServicosPontuaisContratados({
  orcamentos: [{ id: "o-aet-pago", numero: "ORC-2026-0099" }],
  aprovacoesByOrcamentoId: new Map([["o-aet-pago", aetPago]]),
  aetByOrcamentoId: new Map([
    [
      "o-aet-pago",
      aetRow({
        orcamento_id: "o-aet-pago",
        aprovacao_id: "ap-aet-pago",
        documentos_conferidos: true,
        visita_status: "realizada",
        visita_data: "2026-09-20",
        elaboracao_status: "em_elaboracao",
      }),
    ],
  ]),
});
assert.equal(aetEmElaboracao[0].statusLabel, "AET em elaboração");
assert.equal(aetEmElaboracao[0].financeiroPendente, false);
assert.equal(aetEmElaboracao[0].financeiroLabel, "Pago");

const aetContratoSemPagamento = aprovacao(
  {
    id: "ap-aet-debito",
    orcamento_id: "o-aet-debito",
    contrato_assinado: true,
    contrato_assinado_em: "2026-09-18",
    contrato_salvo_em: "2026-09-18T12:00:00Z",
    boleto_pago: false,
    boleto_vencimento: "2026-10-08",
  },
  SERVICO_AET_NOME
);
const aetDebito = listServicosPontuaisContratados({
  orcamentos: [{ id: "o-aet-debito", numero: "ORC-2026-0100" }],
  aprovacoesByOrcamentoId: new Map([["o-aet-debito", aetContratoSemPagamento]]),
  aetByOrcamentoId: new Map([
    [
      "o-aet-debito",
      aetRow({
        orcamento_id: "o-aet-debito",
        aprovacao_id: "ap-aet-debito",
      }),
    ],
  ]),
});
assert.equal(aetDebito[0].statusLabel, "Visita a agendar");
assert.equal(aetDebito[0].financeiroPendente, true);
assert.equal(aetDebito[0].financeiroLabel, "Aguardando pagamento");
assert.equal(
  labelFinanceiroServicoPontual(aetContratoSemPagamento),
  "Aguardando pagamento"
);

const aetEnviadoComDebito = listServicosPontuaisContratados({
  orcamentos: [{ id: "o-aet-debito", numero: "ORC-2026-0100" }],
  aprovacoesByOrcamentoId: new Map([["o-aet-debito", aetContratoSemPagamento]]),
  aetByOrcamentoId: new Map([
    [
      "o-aet-debito",
      aetRow({
        orcamento_id: "o-aet-debito",
        aprovacao_id: "ap-aet-debito",
        documentos_conferidos: true,
        visita_status: "realizada",
        visita_data: "2026-09-20",
        elaboracao_status: "concluido",
        laudo_path: "ap-aet-debito/laudo.pdf",
        enviado_cliente: true,
        enviado_em: "2026-09-22",
      }),
    ],
  ]),
});
assert.equal(aetEnviadoComDebito[0].statusLabel, "Concluído");
assert.equal(aetEnviadoComDebito[0].financeiroPendente, true);
assert.equal(aetEnviadoComDebito[0].financeiroLabel, "Aguardando pagamento");

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

function latestDefining(fnName: string): { file: string; sql: string } {
  const mentioning = files.filter((f) => {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    return new RegExp(
      `create or replace function public\\.${fnName}`,
      "i"
    ).test(sql);
  });
  assert.ok(mentioning.length > 0, `Nenhuma migration redefine ${fnName}`);
  const file = mentioning[mentioning.length - 1];
  return {
    file,
    sql: fs.readFileSync(path.join(migrationsDir, file), "utf8"),
  };
}

const rpc = latestDefining("aprovar_orcamento_integrar_cliente");
assert.equal(rpc.file, "124_servico_aet_aprovacao_rpc.sql");
const contratoSkip = rpc.sql.indexOf("v_contrato_id := null");
assert.ok(contratoSkip >= 0, "RPC 124 deve zerar contrato_id no ramo AET");
const skipWindow = rpc.sql.slice(Math.max(0, contratoSkip - 80), contratoSkip + 220);
assert.match(skipWindow, /if v_is_aet then/);
assert.doesNotMatch(skipWindow, /insert into public\.cliente_contratos/i);
assert.match(rpc.sql, /insert into public\.cliente_contratos/i);

const trigger = latestDefining("trg_orcamento_aprovado_exige_contrato");
assert.equal(trigger.file, "125_servico_aet_aprovacao_sem_contrato_sst.sql");
assert.match(trigger.sql, /orcamento_eh_exclusivo_aet/);
assert.match(trigger.sql, /cliente_id is null/);
assert.match(trigger.sql, /from public\.cliente_contratos/);

const helper = latestDefining("orcamento_eh_exclusivo_aet");
assert.equal(helper.file, "125_servico_aet_aprovacao_sem_contrato_sst.sql");
assert.match(helper.sql, /is_servico_aet_nome/);
assert.doesNotMatch(helper.sql, /includes/);

console.log("test-servicos-pontuais: OK");
