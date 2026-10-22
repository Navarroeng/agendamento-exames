/**
 * Anexar/substituir comprovante na aba Financeiro não encerra contrato ativo anterior.
 * Caso: ORC-2026-0047 / GGF CLINICA MEDICA LTDA (contrato não mensal).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deveEncerrarAtivoAnteriorNaSincronizacao,
  statusContratoAposSyncComAtivoExistente,
  buildClienteContratoSyncFromAprovacao,
} from "../lib/cliente-contrato-orcamento-sync";
import { isFinanceiroEtapaConcluida } from "../lib/orcamento-etapas";
import { CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG } from "../lib/contrato-permissoes";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function aprovacao(
  partial: Partial<OrcamentoAprovacaoRecord>
): OrcamentoAprovacaoRecord {
  return {
    id: "apr-0047",
    orcamento_id: "orc-0047",
    quantidade_colaboradores: 10,
    valor_final: 1000,
    condicao_pagamento: null,
    quantidade_parcelas: null,
    valor_parcela: null,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "OPERACIONAL",
    aprovado_em: "2026-10-01T00:00:00Z",
    contrato_enviado: true,
    contrato_enviado_em: "2026-10-01",
    contrato_assinado: true,
    contrato_assinado_em: "2026-10-02",
    observacao_contrato: null,
    boleto_vencimento: "2026-10-20",
    boleto_pago: true,
    boleto_pago_em: "2026-10-20",
    comprovante_path: "apr-0047/comprovante-1.pdf",
    comprovante_nome: "comprovante.pdf",
    comprovante_tipo: "application/pdf",
    comprovante_tamanho: 1024,
    observacao_pagamento: null,
    financeiro_salvo_em: "2026-10-20T12:00:00Z",
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

const aprovacaoGgF = {
  contrato_enviado: true,
  contrato_assinado: true,
  contrato_assinado_em: "2026-10-02",
  boleto_pago: true,
  boleto_vencimento: "2026-10-20",
  boleto_pago_em: "2026-10-20",
};

const syncNaoMensal = buildClienteContratoSyncFromAprovacao({
  aprovacao: aprovacaoGgF,
  cobrancaMensal: false,
});
assert.equal(syncNaoMensal.status, "ativo");
assert.equal(syncNaoMensal.boleto_pago, true);
assert.equal(syncNaoMensal.liberado_para_agendamento, true);

assert.equal(
  deveEncerrarAtivoAnteriorNaSincronizacao({
    statusDestino: "ativo",
    statusAtual: "aguardando_pagamento",
    permitirEncerrarAtivoAnterior: false,
    cobrancaMensal: false,
  }),
  false,
  "aba Financeiro / comprovante não encerra contrato anterior"
);

assert.equal(
  deveEncerrarAtivoAnteriorNaSincronizacao({
    statusDestino: "ativo",
    statusAtual: "ativo",
    permitirEncerrarAtivoAnterior: false,
    cobrancaMensal: false,
  }),
  false,
  "substituir comprovante em contrato já ativo não reencera ninguém"
);

assert.equal(
  deveEncerrarAtivoAnteriorNaSincronizacao({
    statusDestino: "ativo",
    statusAtual: "aguardando_pagamento",
    permitirEncerrarAtivoAnterior: true,
    cobrancaMensal: false,
  }),
  false,
  "contrato anual/não mensal não substitui o ativo anterior pelo financeiro"
);

assert.equal(
  deveEncerrarAtivoAnteriorNaSincronizacao({
    statusDestino: "ativo",
    statusAtual: "assinado",
    permitirEncerrarAtivoAnterior: true,
    cobrancaMensal: true,
  }),
  true,
  "mensalidade vigente ainda substitui o ativo anterior na aba Contrato"
);

assert.equal(
  deveEncerrarAtivoAnteriorNaSincronizacao({
    statusDestino: "aguardando_pagamento",
    statusAtual: "enviado",
    permitirEncerrarAtivoAnterior: true,
    cobrancaMensal: true,
  }),
  false
);

assert.equal(
  statusContratoAposSyncComAtivoExistente({
    statusDestino: "ativo",
    statusAtual: "aguardando_pagamento",
    outroAtivoExiste: true,
    encerrarOutroAtivo: false,
  }),
  "aguardando_pagamento",
  "ORC-2026-0047: mantém o status deste vínculo se já existe outro ativo"
);

assert.equal(
  statusContratoAposSyncComAtivoExistente({
    statusDestino: "ativo",
    statusAtual: "aguardando_pagamento",
    outroAtivoExiste: false,
    encerrarOutroAtivo: false,
  }),
  "ativo"
);

assert.equal(
  statusContratoAposSyncComAtivoExistente({
    statusDestino: "ativo",
    statusAtual: "ativo",
    outroAtivoExiste: false,
    encerrarOutroAtivo: false,
  }),
  "ativo"
);

assert.equal(
  statusContratoAposSyncComAtivoExistente({
    statusDestino: "ativo",
    statusAtual: "assinado",
    outroAtivoExiste: true,
    encerrarOutroAtivo: true,
  }),
  "ativo"
);

assert.equal(
  isFinanceiroEtapaConcluida(
    aprovacao({
      boleto_pago: true,
      boleto_pago_em: "2026-10-20",
      financeiro_salvo_em: "2026-10-20T12:00:00Z",
      comprovante_path: "apr-0047/comprovante-2.pdf",
      comprovante_nome: "comprovante-novo.pdf",
    })
  ),
  true,
  "pagamento + comprovante concluem a etapa Financeiro sem encerrar contrato"
);

const svc = src("services/orcamento-aprovacao.service.ts");
const financeiroFn = svc.slice(
  svc.indexOf("export async function atualizarAcompanhamentoFinanceiro")
);
const financeiroBody = financeiroFn.slice(
  0,
  financeiroFn.indexOf("export async function atualizarAcompanhamentoContrato")
);
assert.match(
  financeiroBody,
  /permitirEncerrarAtivoAnterior:\s*false/
);
assert.doesNotMatch(
  financeiroBody,
  /permitirEncerrarAtivoAnterior:\s*true/
);

const encerrarFn = svc.slice(
  svc.indexOf("async function encerrarOutrosContratosAtivos")
);
const encerrarBody = encerrarFn.slice(
  0,
  encerrarFn.indexOf("async function temOutroContratoAtivo")
);
assert.doesNotMatch(encerrarBody, /encerrado_em:/);
assert.match(encerrarBody, /status: "encerrado"/);

const documentalFn = svc.slice(
  svc.indexOf("export async function atualizarAcompanhamentoDocumentalContrato")
);
const documentalBody = documentalFn.slice(
  0,
  documentalFn.indexOf("export async function atualizarAcompanhamentoFinanceiro")
);
assert.match(
  documentalBody,
  /permitirEncerrarAtivoAnterior:\s*true/
);

const encerrarManual = src("services/cliente-contrato.service.ts");
assert.match(encerrarManual, /export async function encerrarContrato/);
assert.match(
  encerrarManual.slice(encerrarManual.indexOf("export async function encerrarContrato")),
  /encerrado_em: agora/
);
assert.ok(CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG.includes("administradores"));

console.log("test-orcamento-financeiro-comprovante-sync: OK");
