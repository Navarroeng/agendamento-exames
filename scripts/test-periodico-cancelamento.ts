/** Cancelamento manual do Periódico Futuro vs cancelamento de ASO. */

import assert from "node:assert/strict";
import {
  agruparPeriodicosPorColaboradorCiclo,
  countPeriodicoGruposByDisplayStatus,
  filterPeriodicoGrupos,
} from "../lib/periodico-agrupamento";
import {
  PERIODICO_CANCELAR_AVISO_AGENDAMENTO_ATIVO,
  PERIODICO_CANCELAR_MOTIVO_MSG,
  PERIODICO_CANCELAR_SEM_PERMISSAO_MSG,
  efeitoCancelamentoAsoSobrePeriodico,
  idsUnicosPeriodico,
  isPeriodicoCanceladoManualmente,
  podeExecutarCancelarPeriodico,
  podeExibirCancelarPeriodicoGrupo,
  validarMotivoCancelamentoPeriodico,
} from "../lib/periodico-cancelamento";
import {
  computePeriodicoDisplayStatus,
  toPeriodicoFuturoRow,
} from "../lib/periodicos-futuro";
import { isPerfilAdmin } from "../lib/permissions";
import type { PeriodicoFuturoRecord } from "../lib/types";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function record(
  partial: Partial<PeriodicoFuturoRecord> & { id: string }
): PeriodicoFuturoRecord {
  return {
    agendamento_id: null,
    cliente_nome: "PORTAL DO CRESCER",
    colaborador: "ISABEL TELES",
    cargo_id: "cargo-aux",
    cargo_nome: "Auxiliar de Cozinha",
    exame_id: partial.exame_id ?? partial.id,
    tipo_exame: partial.exame_nome ?? "Clínico",
    exame_nome: "Clínico",
    data_realizada: "2026-06-01",
    proxima_data: "2026-12-01",
    status: "ativo",
    colaborador_cpf: "25161618833",
    ...partial,
  };
}

const cicloIsabel = [
  record({ id: "1", exame_nome: "Coprocultura", tipo_exame: "Coprocultura" }),
  record({ id: "2", exame_nome: "Clínico", tipo_exame: "Clínico" }),
  record({ id: "3", exame_nome: "PPF", tipo_exame: "PPF" }),
  record({
    id: "4",
    exame_nome: "Hemograma completo",
    tipo_exame: "Hemograma completo",
  }),
];

run("1. administrador visualiza Cancelar periódico", () => {
  const grupo = agruparPeriodicosPorColaboradorCiclo(
    cicloIsabel.map(toPeriodicoFuturoRow)
  )[0];
  assert.equal(
    podeExibirCancelarPeriodicoGrupo({
      isAdmin: true,
      temPeriodicoCancelavel: grupo.temPeriodicoCancelavel,
      displayStatus: grupo.displayStatus,
    }),
    true
  );
});

run("2. usuário comum não visualiza", () => {
  const grupo = agruparPeriodicosPorColaboradorCiclo(
    cicloIsabel.map(toPeriodicoFuturoRow)
  )[0];
  assert.equal(
    podeExibirCancelarPeriodicoGrupo({
      isAdmin: false,
      temPeriodicoCancelavel: grupo.temPeriodicoCancelavel,
      displayStatus: grupo.displayStatus,
    }),
    false
  );
  assert.equal(isPerfilAdmin("operacional"), false);
});

run("3. usuário comum não executa a operação", () => {
  assert.equal(podeExecutarCancelarPeriodico("operacional"), false);
  assert.equal(podeExecutarCancelarPeriodico("admin"), true);
  assert.equal(podeExecutarCancelarPeriodico(null), false);
  assert.match(PERIODICO_CANCELAR_SEM_PERMISSAO_MSG, /administradores/i);
});

run("4. tentativa sem motivo", () => {
  assert.equal(validarMotivoCancelamentoPeriodico(""), PERIODICO_CANCELAR_MOTIVO_MSG);
  assert.equal(validarMotivoCancelamentoPeriodico(null), PERIODICO_CANCELAR_MOTIVO_MSG);
});

run("5. motivo somente com espaços", () => {
  assert.equal(
    validarMotivoCancelamentoPeriodico("   \n\t  "),
    PERIODICO_CANCELAR_MOTIVO_MSG
  );
});

run("6-9. cancelamento válido persiste status, motivo e auditoria", () => {
  const motivo = "Colaboradora desligada da empresa";
  assert.equal(validarMotivoCancelamentoPeriodico(motivo), null);

  const cancelados = cicloIsabel.map((item) =>
    toPeriodicoFuturoRow({
      ...item,
      status: "cancelado",
      motivo_cancelamento: motivo,
      cancelado_em: "2026-08-21T12:00:00.000Z",
      cancelado_por: "AGATHA",
      cancelado_por_id: "user-admin-1",
    })
  );
  const grupo = agruparPeriodicosPorColaboradorCiclo(cancelados)[0];
  assert.equal(grupo.displayStatus, "cancelado");
  assert.equal(grupo.motivo_cancelamento, motivo);
  assert.equal(grupo.cancelado_em, "2026-08-21T12:00:00.000Z");
  assert.equal(grupo.cancelado_por, "AGATHA");
  assert.equal(grupo.cancelado_por_id, "user-admin-1");
  assert.equal(
    podeExibirCancelarPeriodicoGrupo({
      isAdmin: true,
      temPeriodicoCancelavel: grupo.temPeriodicoCancelavel,
      displayStatus: grupo.displayStatus,
    }),
    false
  );
});

run("10. data/hora e responsável ficam no registro", () => {
  assert.equal(
    isPeriodicoCanceladoManualmente({
      status: "cancelado",
      cancelado_em: "2026-08-21T12:00:00.000Z",
      motivo_cancelamento: "Desligamento",
    }),
    true
  );
});

run("11. periódico cancelado sai dos KPIs ativos", () => {
  const ativos = agruparPeriodicosPorColaboradorCiclo(
    cicloIsabel.map(toPeriodicoFuturoRow)
  );
  const cancelados = agruparPeriodicosPorColaboradorCiclo(
    cicloIsabel.map((item) =>
      toPeriodicoFuturoRow({
        ...item,
        status: "cancelado",
        cancelado_em: "2026-08-21T12:00:00.000Z",
        motivo_cancelamento: "Desligamento",
      })
    )
  );
  const countsAtivos = countPeriodicoGruposByDisplayStatus(ativos);
  const countsCancelados = countPeriodicoGruposByDisplayStatus(cancelados);
  assert.equal(countsAtivos.em_dia, 1);
  assert.equal(countsAtivos.cancelado, 0);
  assert.equal(countsCancelados.cancelado, 1);
  assert.equal(countsCancelados.em_dia, 0);
  assert.equal(countsCancelados.vencido, 0);
  assert.equal(countsCancelados.vence_30_dias, 0);
  assert.equal(countsCancelados.reagendado, 0);
});

run("12. filtro Cancelado", () => {
  const grupos = agruparPeriodicosPorColaboradorCiclo(
    cicloIsabel.map((item) =>
      toPeriodicoFuturoRow({
        ...item,
        status: "cancelado",
        cancelado_em: "2026-08-21T12:00:00.000Z",
        motivo_cancelamento: "Desligamento",
      })
    )
  );
  const filtrados = filterPeriodicoGrupos(grupos, {
    empresa: "",
    colaborador: "",
    cargo: "",
    exame: "",
    status: "cancelado",
    mesReferencia: "",
  });
  assert.equal(filtrados.length, 1);
  assert.equal(filtrados[0].displayStatus, "cancelado");
});

run("13-14. Clínico + N cancela o ciclo inteiro", () => {
  const grupo = agruparPeriodicosPorColaboradorCiclo(
    cicloIsabel.map(toPeriodicoFuturoRow)
  )[0];
  assert.equal(grupo.examesLabel, "Clínico + 3");
  assert.deepEqual(idsUnicosPeriodico(grupo.ids).sort(), ["1", "2", "3", "4"]);
  const depois = agruparPeriodicosPorColaboradorCiclo(
    cicloIsabel.map((item) =>
      toPeriodicoFuturoRow({
        ...item,
        status: "cancelado",
        cancelado_em: "2026-08-21T12:00:00.000Z",
        motivo_cancelamento: "Desligamento",
      })
    )
  )[0];
  assert.equal(depois.ids.length, 4);
  assert.equal(depois.displayStatus, "cancelado");
  assert.equal(depois.temPeriodicoCancelavel, false);
});

run("15. ASO cancelado não cancela periódico ativo", () => {
  assert.equal(efeitoCancelamentoAsoSobrePeriodico("ativo"), "manter_aberto");
  const row = toPeriodicoFuturoRow(
    record({ id: "aso", status: "ativo", proxima_data: "2026-08-25" })
  );
  assert.equal(
    computePeriodicoDisplayStatus(row, "2026-08-21"),
    "vence_30_dias"
  );
});

run("16. periódico cancelado manualmente permanece cancelado", () => {
  const row = toPeriodicoFuturoRow(
    record({
      id: "manual",
      status: "cancelado",
      proxima_data: "2026-12-01",
      cancelado_em: "2026-08-21T12:00:00.000Z",
      motivo_cancelamento: "Pedido da empresa",
    })
  );
  assert.equal(computePeriodicoDisplayStatus(row, "2026-08-21"), "cancelado");
  assert.equal(row.displayStatus, "cancelado");
});

run("17. aviso de agendamento ativo sem cascata", () => {
  assert.match(
    PERIODICO_CANCELAR_AVISO_AGENDAMENTO_ATIVO,
    /não cancela automaticamente o agendamento/i
  );
  assert.equal(efeitoCancelamentoAsoSobrePeriodico("reagendado"), "reativar_cumprimento");
});

run("18. histórico Cancelado herdado do ASO é recalculado pela data", () => {
  const legado = toPeriodicoFuturoRow(
    record({
      id: "legado",
      status: "cancelado",
      proxima_data: "2026-08-25",
      cancelado_em: null,
      motivo_cancelamento: null,
    })
  );
  assert.equal(isPeriodicoCanceladoManualmente(legado), false);
  assert.equal(
    computePeriodicoDisplayStatus(legado, "2026-08-21"),
    "vence_30_dias"
  );
  assert.notEqual(legado.displayStatus, "cancelado");
});

run("19. status do grupo legado volta a obrigação ativa", () => {
  const grupos = agruparPeriodicosPorColaboradorCiclo(
    cicloIsabel.map((item) =>
      toPeriodicoFuturoRow({
        ...item,
        status: "cancelado",
        cancelado_em: null,
        motivo_cancelamento: null,
      })
    )
  );
  assert.equal(grupos[0].displayStatus, "em_dia");
  assert.equal(grupos[0].temPeriodicoCancelavel, true);
  const counts = countPeriodicoGruposByDisplayStatus(grupos);
  assert.equal(counts.cancelado, 0);
  assert.equal(counts.em_dia, 1);
});

console.log("\nTodos os testes de cancelamento de periódico futuro passaram.");
