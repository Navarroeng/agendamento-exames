import assert from "node:assert/strict";
import {
  resolveContratoStatusVisual,
  labelContratoStatusVisual,
} from "../lib/contrato-status-visual";
import { resolveImplantacaoEtapaAtual } from "../lib/implantacao-clientes";

assert.equal(
  resolveContratoStatusVisual({
    status: "encerrado",
    data_inicio: "2026-01-01",
    data_fim: "2026-12-31",
    encerrado_em: "2026-07-29T12:00:00Z",
  }),
  "encerrado"
);

assert.equal(
  resolveContratoStatusVisual(
    {
      status: "ativo",
      data_inicio: "2026-01-01",
      data_fim: "2026-12-31",
      encerrado_em: null,
    },
    "2026-12-20"
  ),
  "proximo_vencimento"
);

assert.equal(
  resolveContratoStatusVisual(
    {
      status: "ativo",
      data_inicio: "2025-01-01",
      data_fim: "2025-12-31",
      encerrado_em: null,
    },
    "2026-07-29"
  ),
  "expirado"
);

assert.equal(
  resolveContratoStatusVisual(
    {
      status: "ativo",
      data_inicio: "2026-01-01",
      data_fim: "2026-12-31",
      encerrado_em: null,
    },
    "2026-06-01"
  ),
  "ativo"
);

assert.equal(labelContratoStatusVisual("encerrado"), "Encerrado");
assert.equal(
  labelContratoStatusVisual("proximo_vencimento"),
  "Próximo do vencimento"
);

assert.equal(
  resolveImplantacaoEtapaAtual(null, {
    orcamentoStatus: "contrato_encerrado",
  }),
  "contrato_encerrado"
);

console.log("ok: contrato-encerrado");
