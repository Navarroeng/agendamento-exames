/**
 * Testes do card Contrato no Portal do Cliente.
 * Executar: npx tsx scripts/test-portal-contrato.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  filtrarContratosDoClientePortal,
  formatVigenciaPortalContrato,
  montarPortalContratoResumo,
  PORTAL_CONTRATO_FALLBACK,
  portalContratoResumoVazio,
  type PortalClienteContratoFonte,
  type PortalContratoFonte,
} from "../lib/portal-contrato";

let passed = 0;
let failed = 0;

function run(label: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${label}`);
    console.error("   ", err instanceof Error ? err.message : String(err));
  }
}

function cliente(
  partial: Partial<PortalClienteContratoFonte> & { id: string }
): PortalClienteContratoFonte {
  return {
    procuracao: "ativa",
    disponivel_agendamento: true,
    agendamento_bloqueio_manual: false,
    ...partial,
  };
}

function contrato(
  partial: Partial<PortalContratoFonte> & { id: string; cliente_id: string }
): PortalContratoFonte {
  return {
    status: "ativo",
    data_inicio: "2026-01-01",
    data_fim: "2026-12-31",
    orcamento_id: "orc-1",
    boleto_pago: true,
    liberado_para_agendamento: true,
    encerrado_em: null,
    aprovado_em: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

console.log("\n== Home — cards visíveis ==");

run("Exames, Laudos e eSocial não aparecem na Home", () => {
  const src = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalModulosSst.tsx"),
    "utf8"
  );
  assert.doesNotMatch(src, /Exames Ocupacionais/);
  assert.doesNotMatch(src, /Laudos SST/);
  assert.doesNotMatch(src, /titulo="eSocial"/);
});

run("Riscos, Faturas e Contrato aparecem na Home", () => {
  const src = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalModulosSst.tsx"),
    "utf8"
  );
  assert.match(src, /Riscos Psicossociais/);
  assert.match(src, /titulo="Faturas"/);
  assert.match(src, /Contrato e acesso aos serviços/);
});

console.log("\n== Vigência ==");

run("vigência dd/mm/aaaa a dd/mm/aaaa a partir das datas do contrato", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a" }),
    contratos: [contrato({ id: "c1", cliente_id: "cli-a" })],
  });
  assert.equal(r.vigenciaLabel, "01/01/2026 a 31/12/2026");
});

run("sem contrato → Não informado", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a" }),
    contratos: [],
  });
  assert.equal(r.vigenciaLabel, PORTAL_CONTRATO_FALLBACK);
  assert.equal(r.temContrato, false);
});

run("sem data início → Não informado", () => {
  assert.equal(formatVigenciaPortalContrato("", "2026-12-31"), PORTAL_CONTRATO_FALLBACK);
});

run("sem data fim → Indeterminado (regra existente)", () => {
  assert.equal(
    formatVigenciaPortalContrato("2026-01-01", null),
    "01/01/2026 a Indeterminado"
  );
});

console.log("\n== Procuração ==");

run("procuração ativa", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a", procuracao: "ativa" }),
    contratos: [],
  });
  assert.equal(r.procuracaoLabel, "Ativa");
  assert.equal(r.procuracaoTone, "ok");
});

run("procuração pendente", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a", procuracao: "pendente" }),
    contratos: [],
  });
  assert.equal(r.procuracaoLabel, "Pendente");
  assert.equal(r.procuracaoTone, "pendente");
});

run("procuração não necessária", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a", procuracao: "nao_necessaria" }),
    contratos: [],
  });
  assert.equal(r.procuracaoLabel, "Não necessária");
});

run("cliente sem procuração → Não informado", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: null,
    contratos: [],
  });
  assert.equal(r.procuracaoLabel, PORTAL_CONTRATO_FALLBACK);
});

console.log("\n== Disponível para agendamento ==");

run("flag true → Disponível", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a", disponivel_agendamento: true }),
    contratos: [],
  });
  assert.equal(r.disponivelAgendamentoLabel, "Disponível");
  assert.equal(r.disponivelAgendamento, true);
});

run("flag false → Indisponível", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({
      id: "cli-a",
      disponivel_agendamento: false,
    }),
    contratos: [],
  });
  assert.equal(r.disponivelAgendamentoLabel, "Indisponível");
});

run("bloqueio manual + indisponível → tom de bloqueio", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({
      id: "cli-a",
      disponivel_agendamento: false,
      agendamento_bloqueio_manual: true,
    }),
    contratos: [],
  });
  assert.equal(r.disponivelAgendamentoTone, "bloqueio");
});

run("disponivel_agendamento ausente → Não informado", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: {
      id: "cli-a",
      procuracao: "ativa",
      disponivel_agendamento: null,
      agendamento_bloqueio_manual: false,
    },
    contratos: [],
  });
  assert.equal(r.disponivelAgendamentoLabel, PORTAL_CONTRATO_FALLBACK);
});

console.log("\n== Agendamento liberado ==");

run("boleto pago em contrato de orçamento → Liberado", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a" }),
    contratos: [
      contrato({
        id: "c1",
        cliente_id: "cli-a",
        orcamento_id: "orc-1",
        boleto_pago: true,
      }),
    ],
  });
  assert.equal(r.agendamentoLiberadoLabel, "Liberado");
  assert.equal(r.agendamentoLiberado, true);
});

run("boleto não pago → Não liberado", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a" }),
    contratos: [
      contrato({
        id: "c1",
        cliente_id: "cli-a",
        orcamento_id: "orc-1",
        boleto_pago: false,
        liberado_para_agendamento: false,
      }),
    ],
  });
  assert.equal(r.agendamentoLiberadoLabel, "Não liberado");
});

run("sem contrato → Não informado", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a" }),
    contratos: [],
  });
  assert.equal(r.agendamentoLiberadoLabel, PORTAL_CONTRATO_FALLBACK);
});

console.log("\n== Isolamento entre empresas ==");

run("contrato do cliente B não entra no resumo do cliente A", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a" }),
    contratos: [
      contrato({
        id: "c-b",
        cliente_id: "cli-b",
        data_inicio: "2025-01-01",
        data_fim: "2025-12-31",
      }),
    ],
  });
  assert.equal(r.temContrato, false);
  assert.equal(r.vigenciaLabel, PORTAL_CONTRATO_FALLBACK);
});

run("filtrarContratosDoClientePortal remove o outro cliente", () => {
  const filtrados = filtrarContratosDoClientePortal(
    [
      contrato({ id: "a", cliente_id: "cli-a" }),
      contrato({ id: "b", cliente_id: "cli-b" }),
    ],
    "cli-a"
  );
  assert.equal(filtrados.length, 1);
  assert.equal(filtrados[0].id, "a");
});

run("cliente de outro id não preenche procuração/disponibilidade", () => {
  const r = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({
      id: "cli-b",
      procuracao: "ativa",
      disponivel_agendamento: true,
    }),
    contratos: [],
  });
  assert.equal(r.procuracaoLabel, PORTAL_CONTRATO_FALLBACK);
  assert.equal(r.disponivelAgendamentoLabel, PORTAL_CONTRATO_FALLBACK);
});

run("troca de empresa troca vigência", () => {
  const a = montarPortalContratoResumo({
    clienteId: "cli-a",
    cliente: cliente({ id: "cli-a" }),
    contratos: [
      contrato({
        id: "c-a",
        cliente_id: "cli-a",
        data_inicio: "2026-01-01",
        data_fim: "2026-12-31",
      }),
      contrato({
        id: "c-b",
        cliente_id: "cli-b",
        data_inicio: "2024-03-01",
        data_fim: "2024-08-31",
      }),
    ],
  });
  const b = montarPortalContratoResumo({
    clienteId: "cli-b",
    cliente: cliente({ id: "cli-b", procuracao: "pendente" }),
    contratos: [
      contrato({
        id: "c-a",
        cliente_id: "cli-a",
        data_inicio: "2026-01-01",
        data_fim: "2026-12-31",
      }),
      contrato({
        id: "c-b",
        cliente_id: "cli-b",
        data_inicio: "2024-03-01",
        data_fim: "2024-08-31",
      }),
    ],
  });
  assert.equal(a.vigenciaLabel, "01/01/2026 a 31/12/2026");
  assert.equal(b.vigenciaLabel, "01/03/2024 a 31/08/2024");
  assert.equal(a.procuracaoLabel, "Ativa");
  assert.equal(b.procuracaoLabel, "Pendente");
});

run("resumo vazio não quebra", () => {
  const v = portalContratoResumoVazio();
  assert.equal(v.vigenciaLabel, PORTAL_CONTRATO_FALLBACK);
  assert.equal(v.temContrato, false);
});

run("consulta de contratos no server filtra por cliente_id", () => {
  const src = readFileSync(
    join(process.cwd(), "services/portal-home.server.ts"),
    "utf8"
  );
  assert.match(src, /from\("cliente_contratos"\)/);
  assert.match(src, /\.eq\("cliente_id", clienteId\)/);
  assert.match(src, /carregarPortalContrato/);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
