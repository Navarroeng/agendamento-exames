/** Início do contrato SST: assinatura só no fluxo de orçamento; manual usa a data da coluna Aprovação. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildClienteContratoSyncFromAprovacao } from "../lib/cliente-contrato-orcamento-sync";
import {
  aplicarAssinaturaAbaContrato,
  escolherAprovacaoVigente,
  classificarAssinaturaAba,
  INICIO_CONTRATO_AGUARDANDO_ASSINATURA,
  INICIO_CONTRATO_NAO_INFORMADO,
  isoAprovacaoCadastroContrato,
  labelInicioContratoSst,
} from "../lib/cliente-contrato-inicio";
import { contratoVigenciaCobreData } from "../lib/cliente-contrato-atual";

assert.equal(
  INICIO_CONTRATO_AGUARDANDO_ASSINATURA,
  "Aguardando assinatura"
);

const referenciaCjc = aplicarAssinaturaAbaContrato(
  {
    numero: "CTR-2026-0048",
    numero_orcamento: "ORC-2026-0044",
    orcamento_id: "orc-2026-0044",
    status: "enviado" as const,
    data_inicio: "2026-10-27",
    data_fim: null,
    aprovado_em: "2026-10-27T14:32:00.000Z",
    contrato_enviado_em: "2026-10-27",
    created_at: "2026-10-27T14:32:00.000Z",
    contrato_assinado_em: "2026-10-27",
  },
  { consultaConcluida: true, aprovacao: { contrato_assinado_em: null } }
);

assert.equal(classificarAssinaturaAba(referenciaCjc), "vazia");
assert.equal(
  labelInicioContratoSst(referenciaCjc),
  "Aguardando assinatura",
  "contrato enviado sem data de assinatura não pode exibir a data de aprovação nem a cópia"
);

const assinada = aplicarAssinaturaAbaContrato(
  {
    ...referenciaCjc,
    data_inicio: "2026-10-27",
    contrato_assinado_em: null,
  },
  { consultaConcluida: true, aprovacao: { contrato_assinado_em: "2026-11-03" } }
);
assert.equal(classificarAssinaturaAba(assinada), "informada");
assert.equal(labelInicioContratoSst(assinada), "03/11/2026");

const meiaNoiteUtc = aplicarAssinaturaAbaContrato(referenciaCjc, {
  consultaConcluida: true,
  aprovacao: { contrato_assinado_em: "2026-10-28T00:00:00.000Z" },
});
assert.equal(
  labelInicioContratoSst(meiaNoiteUtc),
  "28/10/2026",
  "o dia civil gravado não recua por causa do fuso"
);

const instanteNoite = aplicarAssinaturaAbaContrato(referenciaCjc, {
  consultaConcluida: true,
  aprovacao: { contrato_assinado_em: "2026-11-03T02:30:00.000Z" },
});
assert.equal(labelInicioContratoSst(instanteNoite), "03/11/2026");

const dataRemovida = aplicarAssinaturaAbaContrato(
  {
    ...referenciaCjc,
    contrato_assinado_em: "2026-11-03",
    data_inicio: "2026-11-03",
  },
  { consultaConcluida: true, aprovacao: { contrato_assinado_em: null } }
);
assert.equal(classificarAssinaturaAba(dataRemovida), "vazia");
assert.equal(labelInicioContratoSst(dataRemovida), "Aguardando assinatura");

const consultaPendente = aplicarAssinaturaAbaContrato(
  {
    ...referenciaCjc,
    contrato_assinado_em: "2026-10-27",
    data_inicio: "2026-10-27",
  },
  { consultaConcluida: false, aprovacao: null }
);
assert.equal(classificarAssinaturaAba(consultaPendente), "nao_carregada");
assert.equal(
  labelInicioContratoSst(consultaPendente),
  INICIO_CONTRATO_NAO_INFORMADO,
  "falha ou consulta pendente do vínculo não vira aguardando assinatura nem usa a data manual"
);
assert.notEqual(labelInicioContratoSst(consultaPendente), "27/10/2026");
assert.notEqual(classificarAssinaturaAba(consultaPendente), "sem_orcamento");
assert.notEqual(
  classificarAssinaturaAba(consultaPendente),
  classificarAssinaturaAba(dataRemovida)
);

const aprovacaoRevertida = escolherAprovacaoVigente([
  {
    contrato_assinado_em: "2026-10-27",
    revertida_em: "2026-10-28T12:00:00.000Z",
    created_at: "2026-10-27T12:00:00.000Z",
  },
  {
    contrato_assinado_em: null,
    revertida_em: null,
    created_at: "2026-10-29T12:00:00.000Z",
  },
]);
assert.equal(aprovacaoRevertida?.contrato_assinado_em ?? null, null);
const semDataVigente = aplicarAssinaturaAbaContrato(referenciaCjc, {
  consultaConcluida: true,
  aprovacao: aprovacaoRevertida,
});
assert.equal(classificarAssinaturaAba(semDataVigente), "vazia");
assert.equal(labelInicioContratoSst(semDataVigente), "Aguardando assinatura");

const dataSalvaNaAba = aplicarAssinaturaAbaContrato(
  {
    ...referenciaCjc,
    contrato_assinado_em: null,
    data_inicio: "2026-10-27",
  },
  {
    consultaConcluida: true,
    aprovacao: { contrato_assinado_em: " 2026-01-09 " },
  }
);
assert.equal(labelInicioContratoSst(dataSalvaNaAba), "09/01/2026");

const milBolhas = {
  orcamento_id: null,
  numero_orcamento: null,
  contrato_assinado_em: null,
  data_inicio: "2026-01-10",
  data_fim: "2026-11-25",
  aprovado_em: "2025-11-25T15:00:00.000Z",
};
assert.equal(classificarAssinaturaAba(milBolhas), "sem_orcamento");
assert.equal(isoAprovacaoCadastroContrato(milBolhas), "2025-11-25");
assert.equal(labelInicioContratoSst(milBolhas), "25/11/2025");

const manualAntigoSoInicio = {
  orcamento_id: null,
  contrato_assinado_em: "2026-04-01",
  data_inicio: "2024-03-01",
  aprovado_em: null,
};
assert.equal(classificarAssinaturaAba(manualAntigoSoInicio), "sem_orcamento");
assert.equal(labelInicioContratoSst(manualAntigoSoInicio), "01/03/2024");
assert.notEqual(labelInicioContratoSst(manualAntigoSoInicio), "01/04/2026");
assert.notEqual(
  labelInicioContratoSst(manualAntigoSoInicio),
  INICIO_CONTRATO_AGUARDANDO_ASSINATURA
);

const manualVinculoVazio = {
  orcamento_id: "   ",
  contrato_assinado_em: "2026-04-01",
  data_inicio: "2024-03-01",
  aprovado_em: "2025-11-25",
};
assert.equal(labelInicioContratoSst(manualVinculoVazio), "25/11/2025");

const manualAprovacaoIlegivel = {
  orcamento_id: null,
  aprovado_em: "25/11/2025",
  data_inicio: "2024-03-01",
};
assert.equal(labelInicioContratoSst(manualAprovacaoIlegivel), "01/03/2024");

const manualSemDatas = {
  orcamento_id: null,
  contrato_assinado_em: null,
  data_inicio: null,
  aprovado_em: null,
  created_at: "2026-10-27T12:00:00.000Z",
};
assert.equal(
  labelInicioContratoSst(manualSemDatas),
  INICIO_CONTRATO_NAO_INFORMADO
);
assert.notEqual(
  labelInicioContratoSst(manualSemDatas),
  INICIO_CONTRATO_AGUARDANDO_ASSINATURA
);
assert.equal(labelInicioContratoSst({}), INICIO_CONTRATO_NAO_INFORMADO);
assert.equal(
  labelInicioContratoSst({ data_inicio: "   ", aprovado_em: "   " }),
  INICIO_CONTRATO_NAO_INFORMADO
);

assert.notEqual(labelInicioContratoSst(assinada), "27/10/2026");
assert.equal(labelInicioContratoSst(referenciaCjc), "Aguardando assinatura");

assert.equal(
  contratoVigenciaCobreData(
    { data_inicio: "2026-10-27", data_fim: "2027-10-27" },
    "2026-11-03"
  ),
  true
);
assert.equal(
  contratoVigenciaCobreData(
    { data_inicio: "2026-10-27", data_fim: null },
    "2026-11-03"
  ),
  false
);

const syncSemAssinatura = buildClienteContratoSyncFromAprovacao({
  aprovacao: {
    contrato_enviado: true,
    contrato_assinado: false,
    contrato_assinado_em: null,
    contrato_enviado_em: "2026-10-27",
    boleto_pago: false,
    boleto_vencimento: null,
  },
});
assert.equal(syncSemAssinatura.status, "enviado");
assert.equal(syncSemAssinatura.contrato_assinado_em, null);
assert.equal(syncSemAssinatura.data_inicio, undefined);
assert.equal(syncSemAssinatura.data_fim, undefined);
assert.equal(syncSemAssinatura.liberado_para_agendamento, false);

const syncAssinaturaRemovida = buildClienteContratoSyncFromAprovacao({
  aprovacao: {
    contrato_enviado: true,
    contrato_assinado: false,
    contrato_assinado_em: null,
    boleto_pago: false,
    boleto_vencimento: null,
  },
});
assert.equal(syncAssinaturaRemovida.contrato_assinado_em, null);
assert.equal(syncAssinaturaRemovida.data_inicio, undefined);

const syncAssinaturaSalva = buildClienteContratoSyncFromAprovacao({
  aprovacao: {
    contrato_enviado: true,
    contrato_assinado: true,
    contrato_assinado_em: "2026-11-03",
    boleto_pago: false,
    boleto_vencimento: null,
  },
});
assert.equal(syncAssinaturaSalva.contrato_assinado_em, "2026-11-03");
assert.equal(syncAssinaturaSalva.data_inicio, "2026-11-03");

const card = readFileSync(
  "components/clientes/ClienteContratoAtualCard.tsx",
  "utf8"
);
const inicio = card.slice(
  card.indexOf('label="Início"'),
  card.indexOf('label="Fim previsto"')
);
assert.match(inicio, /labelInicioContratoSst\(contrato\)/);
assert.doesNotMatch(inicio, /data_inicio/);
assert.doesNotMatch(inicio, /aprovado_em/);
assert.doesNotMatch(inicio, /contrato_enviado_em/);
assert.doesNotMatch(inicio, /created_at/);
assert.match(card, /formatDateBR\(contrato\.data_fim\)/);

const cobranca = readFileSync("services/cliente-contrato.service.ts", "utf8");
assert.match(
  cobranca,
  /contrato_assinado, contrato_assinado_em, revertida_em, created_at, mensalidade_pagamento/
);
assert.match(cobranca, /aplicarAssinaturaAbaContrato/);
assert.match(cobranca, /escolherAprovacaoVigente/);
assert.doesNotMatch(cobranca, /assinaturaAbaContratoEm: aprovacao\.contrato_assinado_em/);
const inicioLib = readFileSync("lib/cliente-contrato-inicio.ts", "utf8");
const aprovacaoFn = inicioLib.slice(
  inicioLib.indexOf("export function isoAprovacaoCadastroContrato"),
  inicioLib.indexOf("export function labelInicioContratoSst")
);
assert.match(aprovacaoFn, /aprovado_em/);
assert.match(aprovacaoFn, /data_inicio/);
const labelFn = inicioLib.slice(
  inicioLib.indexOf("export function labelInicioContratoSst")
);
assert.match(labelFn, /isoAprovacaoCadastroContrato\(contrato\)/);
const ramoOrcamento = labelFn.slice(labelFn.indexOf('origem === "informada"'));
assert.doesNotMatch(ramoOrcamento, /aprovado_em/);
assert.doesNotMatch(ramoOrcamento, /data_inicio/);
assert.doesNotMatch(ramoOrcamento, /isoAprovacaoCadastroContrato/);
assert.doesNotMatch(ramoOrcamento, /contrato_enviado_em/);
assert.doesNotMatch(ramoOrcamento, /contrato_assinado_em/);
const historico = readFileSync(
  "components/clientes/ClienteContratosHistoricoTable.tsx",
  "utf8"
);
assert.match(historico, /isoAprovacaoCadastroContrato\(contrato\)/);
const hook = readFileSync("hooks/useClienteContratos.ts", "utf8");
assert.match(hook, /anexarAssinaturaAbaContrato/);
assert.match(hook, /consultaConcluida: false/);
assert.doesNotMatch(hook, /setContratos\(data\)/);

const syncSvc = readFileSync("services/orcamento-aprovacao.service.ts", "utf8");
assert.match(syncSvc, /contrato_assinado_em: syncPayload\.contrato_assinado_em/);
assert.match(syncSvc, /Preserva vigência já definida/);
assert.match(syncSvc, /if \(!preservarDocumental && !temVigencia\)/);
assert.match(
  syncSvc,
  /atualizarAcompanhamentoDocumentalContrato[\s\S]*syncClienteContratoFromAprovacao/
);

console.log("test-cliente-contrato-inicio-exibicao: OK");
