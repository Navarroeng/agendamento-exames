/**
 * Testes do módulo Portal Agendamentos (lib/portal-agendamentos.ts).
 * Execução: npx tsx scripts/test-portal-agendamentos.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  agendamentoPertenceAoClientePortal,
  agendamentoToPortalDetalhe,
  agendamentoToPortalLinha,
  calcPortalAgendamentosResumo,
  filtrarPortalAgendamentos,
  isAgendamentoPortalVisivel,
  linhasResumoAgendamentosHome,
  splitPortalAgendamentos,
} from "../lib/portal-agendamentos";
import type { AgendamentoWithExames } from "../lib/types";

let passed = 0;
let failed = 0;

function run(label: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${label}`);
    console.error(
      "   ",
      err instanceof Error ? err.message : String(err)
    );
  }
}

const HOJE = "2026-09-12";

function mockAg(partial: Partial<AgendamentoWithExames> & { id: string }): AgendamentoWithExames {
  return {
    id: partial.id,
    data_agendamento: partial.data_agendamento ?? "2026-09-15",
    horario: partial.horario ?? "08:30",
    cliente_nome: partial.cliente_nome ?? "Empresa A",
    colaborador: partial.colaborador ?? "João da Silva",
    colaborador_cpf: partial.colaborador_cpf ?? "12345678901",
    aso: partial.aso ?? "Periódico",
    clinica_nome: partial.clinica_nome ?? "Clínica XPTO",
    aso_assinado: false,
    aso_enviado_cliente: false,
    esocial_enviado: false,
    status: partial.status ?? "agendado",
    cliente_id: partial.cliente_id ?? "cliente-a",
    agendamento_exames: partial.agendamento_exames ?? [
      {
        id: "ex-1",
        agendamento_id: partial.id,
        tipo_exame: "Exame clínico",
        valor_cliente: 100,
        custo_clinica: 50,
      },
    ],
  } as unknown as AgendamentoWithExames;
}

console.log("\nPortal Agendamentos");

run("1. cliente A não vê agendamento do cliente B", () => {
  const ag = mockAg({ id: "1", cliente_id: "cliente-b", cliente_nome: "Empresa B" });
  assert.equal(
    agendamentoPertenceAoClientePortal(ag, "cliente-a", "Empresa A"),
    false
  );
});

run("2. cancelado não é visível", () => {
  assert.equal(isAgendamentoPortalVisivel("cancelado"), false);
  assert.equal(
    agendamentoToPortalLinha(mockAg({ id: "c", status: "cancelado" }), HOJE),
    null
  );
});

run("3. cancelado não entra no contador", () => {
  const linhas = [
    agendamentoToPortalLinha(mockAg({ id: "1", status: "agendado" }), HOJE),
    agendamentoToPortalLinha(mockAg({ id: "2", status: "cancelado" }), HOJE),
  ].filter(Boolean);
  const resumo = calcPortalAgendamentosResumo(
    linhas as NonNullable<(typeof linhas)[number]>[]
  );
  assert.equal(resumo.total, 1);
});

run("4. cancelado não aparece em próximos", () => {
  const linhas = [
    agendamentoToPortalLinha(
      mockAg({ id: "1", data_agendamento: "2026-09-20", status: "agendado" }),
      HOJE
    ),
  ].filter(Boolean) as NonNullable<ReturnType<typeof agendamentoToPortalLinha>>[];
  const { proximos } = splitPortalAgendamentos(linhas);
  assert.equal(proximos.length, 1);
  assert.equal(
    agendamentoToPortalLinha(
      mockAg({ id: "2", data_agendamento: "2026-09-20", status: "cancelado" }),
      HOJE
    ),
    null
  );
});

run("5. cancelado não aparece no histórico", () => {
  assert.equal(
    agendamentoToPortalLinha(
      mockAg({ id: "2", data_agendamento: "2026-08-01", status: "cancelado" }),
      HOJE
    ),
    null
  );
});

run("6. empresa sem agendamentos", () => {
  const resumo = calcPortalAgendamentosResumo([]);
  assert.equal(resumo.temAgendamentos, false);
  assert.deepEqual(linhasResumoAgendamentosHome(resumo), [
    "Nenhum agendamento disponível no momento",
  ]);
});

run("7. próximo agendamento correto", () => {
  const linhas = [
    agendamentoToPortalLinha(
      mockAg({ id: "1", data_agendamento: "2026-09-20", horario: "10:00" }),
      HOJE
    ),
    agendamentoToPortalLinha(
      mockAg({ id: "2", data_agendamento: "2026-09-15", horario: "08:30" }),
      HOJE
    ),
  ].filter(Boolean) as NonNullable<ReturnType<typeof agendamentoToPortalLinha>>[];
  const resumo = calcPortalAgendamentosResumo(linhas);
  assert.equal(resumo.proximoDataLabel, "15/09/2026");
  assert.equal(resumo.proximoHorarioLabel, "08:30");
  assert.match(resumo.proximoLabel ?? "", /15\/09\/2026 às 08:30/);
});

run("8. ordenação dos futuros (mais próximo primeiro)", () => {
  const linhas = [
    agendamentoToPortalLinha(
      mockAg({ id: "1", data_agendamento: "2026-09-20", horario: "10:00" }),
      HOJE
    ),
    agendamentoToPortalLinha(
      mockAg({ id: "2", data_agendamento: "2026-09-15", horario: "08:30" }),
      HOJE
    ),
  ].filter(Boolean) as NonNullable<ReturnType<typeof agendamentoToPortalLinha>>[];
  const { proximos } = splitPortalAgendamentos(linhas);
  assert.equal(proximos[0]?.id, "2");
  assert.equal(proximos[1]?.id, "1");
});

run("9. ordenação do histórico (mais recente primeiro)", () => {
  const linhas = [
    agendamentoToPortalLinha(
      mockAg({ id: "1", data_agendamento: "2026-08-01" }),
      HOJE
    ),
    agendamentoToPortalLinha(
      mockAg({ id: "2", data_agendamento: "2026-09-01" }),
      HOJE
    ),
  ].filter(Boolean) as NonNullable<ReturnType<typeof agendamentoToPortalLinha>>[];
  const { historico } = splitPortalAgendamentos(linhas);
  assert.equal(historico[0]?.id, "2");
  assert.equal(historico[1]?.id, "1");
});

run("10. detalhe pertence ao cliente e traz exames sem custos", () => {
  const ag = mockAg({
    id: "det",
    cliente_id: "cliente-a",
    cliente_nome: "Empresa A",
  });
  assert.equal(
    agendamentoPertenceAoClientePortal(ag, "cliente-a", "Empresa A"),
    true
  );
  const detalhe = agendamentoToPortalDetalhe(ag, { hojeIso: HOJE });
  assert.ok(detalhe);
  assert.equal(detalhe!.exames.length, 1);
  assert.equal(detalhe!.exames[0]?.nome, "Exame clínico");
  const json = JSON.stringify(detalhe);
  assert.equal(json.includes("valor_cliente"), false);
  assert.equal(json.includes("custo_clinica"), false);
  assert.equal(json.includes("colaborador_cpf"), false);
});

run("11. acesso direto de outro cliente é bloqueado pela regra de pertencimento", () => {
  const ag = mockAg({ id: "x", cliente_id: "cliente-b", cliente_nome: "Empresa B" });
  assert.equal(
    agendamentoPertenceAoClientePortal(ag, "cliente-a", "Empresa A"),
    false
  );
});

run("12. exames corretos no detalhe", () => {
  const ag = mockAg({
    id: "ex",
    agendamento_exames: [
      {
        id: "e1",
        agendamento_id: "ex",
        tipo_exame: "Audiometria",
        valor_cliente: 1,
        custo_clinica: 1,
      },
      {
        id: "e2",
        agendamento_id: "ex",
        tipo_exame: "Acuidade visual",
        valor_cliente: 1,
        custo_clinica: 1,
      },
    ],
  });
  const detalhe = agendamentoToPortalDetalhe(ag, { hojeIso: HOJE });
  assert.deepEqual(
    detalhe?.exames.map((e) => e.nome),
    ["Audiometria", "Acuidade visual"]
  );
});

run("13. filtro próximos/histórico e busca por colaborador", () => {
  const linhas = [
    agendamentoToPortalLinha(
      mockAg({
        id: "1",
        colaborador: "Ana",
        data_agendamento: "2026-09-20",
      }),
      HOJE
    ),
    agendamentoToPortalLinha(
      mockAg({
        id: "2",
        colaborador: "Bruno",
        data_agendamento: "2026-08-01",
      }),
      HOJE
    ),
  ].filter(Boolean) as NonNullable<ReturnType<typeof agendamentoToPortalLinha>>[];
  assert.equal(
    filtrarPortalAgendamentos(linhas, { filtro: "proximos" }).length,
    1
  );
  assert.equal(
    filtrarPortalAgendamentos(linhas, { filtro: "historico" }).length,
    1
  );
  assert.equal(
    filtrarPortalAgendamentos(linhas, {
      filtro: "todos",
      buscaColaborador: "bru",
    })[0]?.id,
    "2"
  );
});

run("14. rascunho também não aparece no portal", () => {
  assert.equal(isAgendamentoPortalVisivel("rascunho"), false);
});

run("15. sem futuros mas com histórico", () => {
  const linhas = [
    agendamentoToPortalLinha(
      mockAg({ id: "1", data_agendamento: "2026-08-01" }),
      HOJE
    ),
  ].filter(Boolean) as NonNullable<ReturnType<typeof agendamentoToPortalLinha>>[];
  const resumo = calcPortalAgendamentosResumo(linhas);
  assert.equal(resumo.proximoLabel, "Nenhum agendamento futuro");
  assert.equal(resumo.totalHistorico, 1);
});

run("16. APIs portal exigem staff e isolamento", () => {
  const listRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/portal/agendamentos/route.ts"),
    "utf8"
  );
  const detailRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/portal/agendamentos/[id]/route.ts"),
    "utf8"
  );
  const server = fs.readFileSync(
    path.join(process.cwd(), "services/portal-agendamentos.server.ts"),
    "utf8"
  );
  assert.match(listRoute, /requirePortalStaffUser/);
  assert.match(detailRoute, /requirePortalStaffUser/);
  assert.match(detailRoute, /404/);
  assert.match(server, /\.in\("status", PORTAL_AGENDAMENTO_STATUS_INCLUIDOS\)/);
  assert.match(server, /agendamentoPertenceAoClientePortal/);
  assert.doesNotMatch(server, /valor_cliente/);
  assert.doesNotMatch(server, /custo_clinica/);
});

if (failed > 0) {
  console.error(`\n${failed} teste(s) falharam.`);
  process.exit(1);
}

console.log(`\ntest-portal-agendamentos: OK (${passed})`);
