import assert from "node:assert/strict";

/**
 * Espelha o critério do backfill 063 (somente leitura / documentação do filtro).
 * Não acessa banco — garante que a intenção da regularização permanece clara.
 */
type OrcamentoLike = {
  status: string;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
};

type ContratoLike = {
  status: string;
  encerrado_em: string | null;
  orcamento_id: string;
};

function precisaRegularizar(
  orcamento: OrcamentoLike,
  contrato: ContratoLike | null
): boolean {
  if (!contrato) return false;
  if (orcamento.status !== "cancelado") return false;
  if (contrato.status === "encerrado") return false;
  if (contrato.encerrado_em) return false;
  return true;
}

function motivoEncerramento(
  contrato: ContratoLike & { motivo_encerramento?: string | null },
  orcamento: OrcamentoLike & { observacao_cancelamento?: string | null }
): string {
  return (
    (contrato.motivo_encerramento ?? "").trim() ||
    (orcamento.motivo_cancelamento ?? "").trim() ||
    (orcamento.observacao_cancelamento ?? "").trim() ||
    "Regularização: orçamento cancelado antes do fluxo de encerramento de contrato."
  );
}

// ORC-2026-0002 (caso típico legado)
assert.equal(
  precisaRegularizar(
    {
      status: "cancelado",
      cancelado_em: "2026-07-20T10:00:00Z",
      motivo_cancelamento: "Cliente desistiu",
    },
    { status: "ativo", encerrado_em: null, orcamento_id: "x" }
  ),
  true
);

// Já encerrado: não mexer
assert.equal(
  precisaRegularizar(
    {
      status: "cancelado",
      cancelado_em: "2026-07-20T10:00:00Z",
      motivo_cancelamento: "x",
    },
    { status: "encerrado", encerrado_em: "2026-07-20T10:00:00Z", orcamento_id: "x" }
  ),
  false
);

// Fluxo novo (já contrato_encerrado): não é alvo do backfill de cancelado
assert.equal(
  precisaRegularizar(
    {
      status: "contrato_encerrado",
      cancelado_em: "2026-07-29T16:00:00Z",
      motivo_cancelamento: "x",
    },
    { status: "ativo", encerrado_em: null, orcamento_id: "x" }
  ),
  false
);

assert.equal(
  motivoEncerramento(
    { status: "ativo", encerrado_em: null, orcamento_id: "x", motivo_encerramento: null },
    {
      status: "cancelado",
      cancelado_em: null,
      motivo_cancelamento: "Cliente desistiu dos serviços.",
    }
  ),
  "Cliente desistiu dos serviços."
);

console.log("ok: backfill-contrato-encerrado-legado");
