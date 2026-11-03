/** Início do contrato SST no modal do cliente: só a data de assinatura da aba Contrato. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildClienteContratoSyncFromAprovacao } from "../lib/cliente-contrato-orcamento-sync";
import {
  INICIO_CONTRATO_AGUARDANDO_ASSINATURA,
  labelInicioContratoSst,
} from "../lib/cliente-contrato-mappers";
import { contratoVigenciaCobreData } from "../lib/cliente-contrato-atual";

assert.equal(
  INICIO_CONTRATO_AGUARDANDO_ASSINATURA,
  "Aguardando assinatura"
);

const referenciaCjc = {
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
  assinaturaAbaContratoEm: null as string | null,
};

assert.equal(
  labelInicioContratoSst(referenciaCjc),
  "Aguardando assinatura",
  "contrato enviado sem data de assinatura não pode exibir a data de aprovação"
);

const assinada = {
  ...referenciaCjc,
  assinaturaAbaContratoEm: "2026-11-03",
  data_inicio: "2026-10-27",
  contrato_assinado_em: null,
};
assert.equal(labelInicioContratoSst(assinada), "03/11/2026");

const meiaNoiteUtc = {
  ...referenciaCjc,
  assinaturaAbaContratoEm: "2026-10-28T00:00:00.000Z",
};
assert.equal(
  labelInicioContratoSst(meiaNoiteUtc),
  "28/10/2026",
  "o dia civil gravado não recua por causa do fuso"
);

const instanteNoite = {
  ...referenciaCjc,
  assinaturaAbaContratoEm: "2026-11-03T02:30:00.000Z",
};
assert.equal(labelInicioContratoSst(instanteNoite), "03/11/2026");

const dataRemovida = {
  ...referenciaCjc,
  assinaturaAbaContratoEm: null,
  contrato_assinado_em: "2026-11-03",
  data_inicio: "2026-11-03",
};
assert.equal(labelInicioContratoSst(dataRemovida), "Aguardando assinatura");

const dataSalvaNaAba = {
  ...referenciaCjc,
  assinaturaAbaContratoEm: " 2026-01-09 ",
  contrato_assinado_em: null,
  data_inicio: "2026-10-27",
};
assert.equal(labelInicioContratoSst(dataSalvaNaAba), "09/01/2026");

const manualAssinado = {
  contrato_assinado_em: "2026-04-01",
  data_inicio: "2026-01-15",
  aprovado_em: "2026-01-15",
};
assert.equal(labelInicioContratoSst(manualAssinado), "01/04/2026");

const manualSemAssinatura = {
  contrato_assinado_em: null,
  data_inicio: "2026-10-27",
  created_at: "2026-10-27T12:00:00.000Z",
};
assert.equal(
  labelInicioContratoSst(manualSemAssinatura),
  "Aguardando assinatura"
);
assert.equal(
  labelInicioContratoSst({ contrato_assinado_em: "   " }),
  "Aguardando assinatura"
);
assert.equal(
  labelInicioContratoSst({ contrato_assinado_em: "27/10/2026" }),
  "Aguardando assinatura"
);

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
  /contrato_assinado, contrato_assinado_em, mensalidade_pagamento/
);
assert.match(
  cobranca,
  /assinaturaAbaContratoEm: aprovacao\.contrato_assinado_em \?\? null/
);

const syncSvc = readFileSync("services/orcamento-aprovacao.service.ts", "utf8");
assert.match(syncSvc, /contrato_assinado_em: syncPayload\.contrato_assinado_em/);
assert.match(syncSvc, /Preserva vigência já definida/);
assert.match(syncSvc, /if \(!temVigencia\)/);
assert.match(
  syncSvc,
  /atualizarAcompanhamentoDocumentalContrato[\s\S]*syncClienteContratoFromAprovacao/
);

console.log("test-cliente-contrato-inicio-exibicao: OK");
