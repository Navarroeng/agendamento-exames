import assert from "node:assert/strict";
import type { OrcamentoLaudosSstRecord } from "../lib/laudos-sst";
import {
  calcPortalLaudosSstResumo,
  extrairDocumentosPortalLaudosSst,
  laudosSstLiberadoAoPortal,
} from "../lib/portal-laudos-sst";

function base(partial: Partial<OrcamentoLaudosSstRecord>): OrcamentoLaudosSstRecord {
  return {
    orcamento_id: "11111111-1111-1111-1111-111111111111",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 6,
    ...partial,
  };
}

const comAnexoInterno = base({
  enviado_cliente: false,
  enviado_cliente_email: null,
  enviado_cliente_data: null,
  pgr_anexo_path: "11111111-1111-1111-1111-111111111111/pgr-1.pdf",
  pgr_anexo_nome: "PGR.pdf",
  pgr_anexo_tipo: "application/pdf",
  pgr_anexo_tamanho: 100,
});
assert.equal(laudosSstLiberadoAoPortal(comAnexoInterno), false);
assert.equal(extrairDocumentosPortalLaudosSst(comAnexoInterno).length, 0);

const liberadoSemAnexo = base({
  enviado_cliente: true,
  enviado_cliente_email: "cliente@empresa.com",
  enviado_cliente_data: "2026-08-19",
});
assert.equal(laudosSstLiberadoAoPortal(liberadoSemAnexo), true);
assert.equal(extrairDocumentosPortalLaudosSst(liberadoSemAnexo).length, 0);

const liberadoComDocs = base({
  enviado_cliente: true,
  enviado_cliente_email: "cliente@empresa.com",
  enviado_cliente_data: "2026-08-19",
  pgr_anexo_path: "11111111-1111-1111-1111-111111111111/pgr-1.pdf",
  pgr_anexo_nome: "PGR.pdf",
  pcmso_anexo_path: "11111111-1111-1111-1111-111111111111/pcmso-1.pdf",
  pcmso_anexo_nome: "PCMSO.pdf",
  ltcat_anexo_path: "11111111-1111-1111-1111-111111111111/ltcat-1.pdf",
  ltcat_anexo_nome: "LTCAT.pdf",
});
const docs = extrairDocumentosPortalLaudosSst(liberadoComDocs);
assert.equal(docs.length, 3);
assert.deepEqual(
  docs.map((d) => d.tipoLabel),
  ["PGR", "PCMSO", "LTCAT"]
);
assert.equal(docs[0].dataLabel, "19/08/2026");
assert.ok(!("path" in docs[0]));

const resumo = calcPortalLaudosSstResumo(docs);
assert.equal(resumo.temDocumentos, true);
assert.equal(resumo.totalDocumentos, 3);
assert.match(resumo.linhaResumo, /3 documentos/);

console.log("test-portal-laudos-sst: ok");
