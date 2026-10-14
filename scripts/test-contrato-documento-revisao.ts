/** Revisão das condições gravada no PDF do contrato. */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  pdfContratoEstaDesatualizado,
  revisaoCondicoesAprovacao,
  revisaoCondicoesDocumento,
} from "../lib/contrato-documento-revisao";

assert.equal(revisaoCondicoesAprovacao({ condicoes_revisao: 2 }), 2);
assert.equal(revisaoCondicoesAprovacao({ condicoes_revisao: "3" }), 3);
assert.equal(revisaoCondicoesAprovacao({}), null);
assert.equal(revisaoCondicoesAprovacao({ condicoes_revisao: 0 }), null);
assert.equal(revisaoCondicoesDocumento({ condicoes_revisao: 0 }), 0);
assert.equal(revisaoCondicoesDocumento({ condicoes_revisao: null }), null);

assert.equal(
  pdfContratoEstaDesatualizado(
    { condicoes_revisao: 4, desatualizado_em: "2026-10-14T00:00:00.000Z" },
    { condicoes_revisao: 4 }
  ),
  false
);
assert.equal(
  pdfContratoEstaDesatualizado(
    { condicoes_revisao: 4, desatualizado_em: null },
    { condicoes_revisao: 5 }
  ),
  true
);
assert.equal(
  pdfContratoEstaDesatualizado(
    { condicoes_revisao: 4 },
    { condicoes_revisao: 5, contrato_assinado: true }
  ),
  false
);
assert.equal(
  pdfContratoEstaDesatualizado(
    { condicoes_revisao: null, desatualizado_em: "2026-10-14T00:00:00.000Z" },
    { condicoes_revisao: 2 }
  ),
  true
);
assert.equal(
  pdfContratoEstaDesatualizado(
    { desatualizado_em: null },
    {}
  ),
  false
);
assert.equal(
  pdfContratoEstaDesatualizado(
    { condicoes_revisao: 0 },
    { condicoes_revisao: 1 }
  ),
  true
);

const sql = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/136_contrato_condicoes_revisao.sql"
  ),
  "utf8"
);
const divergencia = sql.indexOf("v_rev is distinct from p_condicoes_revisao");
const insert = sql.indexOf("insert into public.orcamento_contrato_documentos");
assert.ok(divergencia > 0 && insert > divergencia);
assert.match(sql, /desatualizado_em\s*\n\s*\) values \(/);
assert.match(sql, /p_condicoes_revisao,\s*\n\s*null/);
assert.match(
  sql,
  /new\.condicoes_revisao := coalesce\(old\.condicoes_revisao, 1\) \+ 1/
);
assert.match(
  sql,
  /else\s+new\.condicoes_revisao := coalesce\(old\.condicoes_revisao, 1\);/
);
assert.match(sql, /for update of a/);
assert.match(sql, /d\.condicoes_revisao is null/);
assert.doesNotMatch(sql, /1\.400,00|1400|160,00/);

const panel = fs.readFileSync(
  path.join(
    process.cwd(),
    "components/orcamentos/OrcamentoContratoGerarPanel.tsx"
  ),
  "utf8"
);
assert.match(panel, /pdfContratoEstaDesatualizado/);
assert.match(panel, /condicoesRevisaoCapturada/);
assert.match(panel, /aplicarDocumentoSalvo/);
assert.doesNotMatch(panel, /desatualizado_em/);

const service = fs.readFileSync(
  path.join(
    process.cwd(),
    "services/orcamento-contrato-documento.service.ts"
  ),
  "utf8"
);
assert.match(service, /registrar_contrato_documento_gerado/);
assert.match(service, /removerArquivoOrcamentoOnboarding/);
assert.doesNotMatch(service, /\.insert\(insert\)/);

console.log("OK  revisão do contrato");
