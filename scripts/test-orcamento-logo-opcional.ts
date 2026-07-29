import assert from "node:assert/strict";
import { isLogoEtapaConcluida } from "../lib/orcamento-etapas";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";

function base(
  overrides: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "a1",
    orcamento_id: "o1",
    created_at: "",
    updated_at: "",
    ...overrides,
  } as OrcamentoAprovacaoRecord;
}

assert.equal(isLogoEtapaConcluida(null), false);
assert.equal(isLogoEtapaConcluida(base()), false);

assert.equal(
  isLogoEtapaConcluida(
    base({ possui_logo: false, logo_salva_em: "2026-01-01T00:00:00Z" })
  ),
  true
);
assert.equal(
  isLogoEtapaConcluida(base({ possui_logo: false, logo_salva_em: null })),
  false
);

assert.equal(
  isLogoEtapaConcluida(
    base({ possui_logo: true, logo_path: "path/logo.png" })
  ),
  true
);
assert.equal(
  isLogoEtapaConcluida(base({ possui_logo: true, logo_path: null })),
  false
);

// Legado: logo sem possui_logo
assert.equal(
  isLogoEtapaConcluida(base({ possui_logo: null, logo_path: "x.png" })),
  true
);

console.log("ok: orcamento-logo-opcional");
