import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatProcuracaoEfetivaLabel,
  resolverProcuracaoEfetiva,
} from "../lib/cliente-procuracao-efetiva";
import { montarPortalContratoResumo } from "../lib/portal-contrato";
import type { ClienteContratoConsulta } from "../lib/cliente-contrato-atual";

const HOJE = "2026-11-05";

function contrato(
  partial: Partial<ClienteContratoConsulta> & { id: string }
): ClienteContratoConsulta {
  return {
    cliente_id: "cli",
    data_inicio: "2025-10-25",
    data_fim: "2026-10-24",
    quantidade_colaboradores: 10,
    valor_contrato: 1000,
    condicao_pagamento: "Mensalidade",
    tipo_contrato: "mensal",
    reajuste_percentual: null,
    observacoes: null,
    status: "ativo",
    orcamento_id: "orc-anterior",
    modalidadeOrcamento: "mensalidade",
    contrato_assinado_em: "2025-10-25",
    procuracaoStatus: "ativa",
    ...partial,
  };
}

assert.equal(
  formatProcuracaoEfetivaLabel(
    resolverProcuracaoEfetiva(
      [
        contrato({
          id: "anterior",
          procuracaoStatus: "ativa",
        }),
      ],
      HOJE
    )
  ),
  "Expirada"
);

assert.equal(
  formatProcuracaoEfetivaLabel(
    resolverProcuracaoEfetiva(
      [
        contrato({ id: "anterior", procuracaoStatus: "ativa" }),
        contrato({
          id: "renovacao",
          orcamento_id: "orc-novo",
          numero: "CTR-2026-0053",
          numero_orcamento: "ORC-2026-0078",
          status: "enviado",
          data_inicio: "2026-11-01",
          data_fim: "2027-10-31",
          contrato_assinado_em: null,
          procuracaoStatus: "pendente",
        }),
      ],
      HOJE
    )
  ),
  "Expirada"
);

assert.equal(
  resolverProcuracaoEfetiva(
    [
      contrato({ id: "anterior", procuracaoStatus: "ativa" }),
      contrato({
        id: "novo",
        orcamento_id: "orc-novo",
        status: "ativo",
        data_inicio: "2026-11-01",
        data_fim: "2027-10-31",
        contrato_assinado_em: "2026-11-01",
        procuracaoStatus: "ativa",
      }),
    ],
    HOJE
  ),
  "ativa"
);

assert.equal(
  resolverProcuracaoEfetiva(
    [
      contrato({ id: "anterior", procuracaoStatus: "ativa" }),
      contrato({
        id: "novo",
        orcamento_id: "orc-novo",
        status: "ativo",
        data_inicio: "2026-11-01",
        data_fim: "2027-10-31",
        contrato_assinado_em: "2026-11-01",
        procuracaoStatus: "pendente",
      }),
    ],
    HOJE
  ),
  "pendente"
);

assert.equal(
  resolverProcuracaoEfetiva(
    [
      contrato({
        id: "vigente",
        data_inicio: "2026-01-01",
        data_fim: "2026-12-31",
        contrato_assinado_em: "2026-01-01",
        procuracaoStatus: "ativa",
      }),
      contrato({
        id: "renovacao",
        orcamento_id: "orc-novo",
        status: "aguardando_envio",
        data_inicio: "2027-01-01",
        data_fim: "2027-12-31",
        contrato_assinado_em: null,
        procuracaoStatus: "pendente",
      }),
    ],
    HOJE
  ),
  "ativa"
);

assert.equal(
  resolverProcuracaoEfetiva(
    [
      contrato({
        id: "encerrado",
        status: "encerrado",
        encerrado_em: "2026-10-01",
        data_inicio: "2026-01-01",
        data_fim: "2026-12-31",
        procuracaoStatus: "ativa",
      }),
    ],
    HOJE
  ),
  "expirada"
);

assert.equal(
  resolverProcuracaoEfetiva(
    [
      contrato({
        id: "cancelado",
        status: "cancelado",
        data_inicio: "2026-01-01",
        data_fim: "2026-12-31",
        procuracaoStatus: "ativa",
      }),
    ],
    HOJE
  ),
  "expirada"
);

assert.equal(
  resolverProcuracaoEfetiva(
    [
      contrato({
        id: "vigente",
        data_inicio: "2026-01-01",
        data_fim: "2026-12-31",
        contrato_assinado_em: "2026-01-01",
        procuracaoStatus: "nao_necessaria",
      }),
    ],
    HOJE
  ),
  "nao_necessaria"
);

const portal = montarPortalContratoResumo({
  clienteId: "cli",
  cliente: {
    id: "cli",
    procuracao: "ativa",
    agendamento_bloqueio_manual: false,
  },
  contratos: [
    {
      id: "anterior",
      cliente_id: "cli",
      status: "ativo",
      data_inicio: "2025-10-25",
      data_fim: "2026-10-24",
      orcamento_id: "orc-anterior",
      boleto_pago: true,
      liberado_para_agendamento: true,
      quantidade_colaboradores: 10,
      encerrado_em: null,
      aprovado_em: "2025-10-25",
      created_at: "2025-10-25",
      tipo_contrato: "mensal",
      condicao_pagamento: "Mensalidade",
      contrato_assinado_em: "2025-10-25",
      modalidadeOrcamento: "mensalidade",
      procuracaoStatus: "ativa",
    },
  ],
});
assert.equal(portal.procuracaoLabel, "Expirada");
assert.notEqual(portal.procuracaoLabel, "Ativa");

const onboarding = readFileSync(
  join(process.cwd(), "services/orcamento-onboarding.service.ts"),
  "utf8"
);
const salvar = onboarding.slice(
  onboarding.indexOf("export async function salvarOrcamentoProcuracao"),
  onboarding.indexOf("export async function salvarOrcamentoListaFuncionarios")
);
assert.equal(salvar.includes('.from("clientes")'), false);
assert.match(salvar, /\.eq\("orcamento_id", orcamentoId\)/);

const modal = readFileSync(
  join(process.cwd(), "components/modals/ClienteViewModal.tsx"),
  "utf8"
);
assert.match(modal, /resolverProcuracaoEfetiva/);
assert.doesNotMatch(modal, /formatClienteProcuracaoLabel\(cliente\.procuracao\)/);

console.log("test-procuracao-efetiva: OK");
