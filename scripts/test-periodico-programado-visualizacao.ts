/**
 * Consulta somente leitura do periódico programado na vaga do contrato.
 * Executar: node scripts/run-ts-test.js scripts/test-periodico-programado-visualizacao.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { montarVisualizacaoPeriodicoProgramado } from "../lib/periodico-programado-visualizacao";
import type { RegistroVisualizacaoPeriodico } from "../lib/periodico-programado-visualizacao";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function registro(
  partial: Partial<RegistroVisualizacaoPeriodico> & { id: string }
): RegistroVisualizacaoPeriodico {
  return {
    colaborador: "JOÃO DA SILVA",
    colaborador_cpf: null,
    cliente_nome: "NIGHT SHIFT OPERAÇÕES",
    cargo_id: "cargo-op",
    cargo_nome: "Operador",
    tipo_aso: "Periódico",
    tipo_exame: "Periódico",
    exame_nome: "Periódico",
    exame_id: null,
    proxima_data: "2027-04-10",
    data_prevista_original: "2027-04-10",
    status: "ativo",
    motivo: "ASO ainda vigente",
    motivo_detalhe: null,
    observacoes: "Aguardando documentação",
    origem: "implantacao_inicial",
    cancelado_em: null,
    motivo_cancelamento: null,
    ...partial,
  };
}

run("programação de implantação mostra dados salvos e omite clínica e horário vazios", () => {
  const view = montarVisualizacaoPeriodicoProgramado({
    registroId: "pf-joao",
    registros: [registro({ id: "pf-joao" })],
    clinica: "  ",
    horario: "",
  });
  assert.ok(view);
  assert.equal(view.colaborador, "JOÃO DA SILVA");
  assert.equal(view.cpf, null);
  assert.equal(view.tipoAso, "Periódico");
  assert.equal(view.dataPrevistaIso, "2027-04-10");
  assert.equal(view.situacao, "Programado");
  assert.deepEqual(view.examesPrevistos, []);
  assert.equal(view.cargo, "Operador");
  assert.equal(view.observacoes, "Aguardando documentação");
  assert.equal(view.motivo, "ASO ainda vigente");
  assert.equal(view.origem, "Implantação Inicial");
  assert.equal(view.clinica, null);
  assert.equal(view.horario, null);
});

run("ciclo sem CPF reúne os exames previstos e só exibe clínica e horário preenchidos", () => {
  const view = montarVisualizacaoPeriodicoProgramado({
    registroId: "pf-clinico",
    registros: [
      registro({
        id: "pf-clinico",
        exame_id: "ex-clinico",
        exame_nome: "Clínico",
        tipo_exame: "Clínico",
        tipo_aso: "Periódico",
      }),
      registro({
        id: "pf-audio",
        exame_id: "ex-audio",
        exame_nome: "Audiometria",
        tipo_exame: "Audiometria",
        tipo_aso: "Periódico",
        observacoes: null,
      }),
      registro({
        id: "pf-outra-data",
        exame_nome: "Acuidade",
        proxima_data: "2028-01-01",
        data_prevista_original: "2028-01-01",
      }),
    ],
    clinica: "Clínica Centro",
    horario: "08:30",
  });
  assert.ok(view);
  assert.deepEqual(view.examesPrevistos, ["Clínico", "Audiometria"]);
  assert.equal(view.clinica, "Clínica Centro");
  assert.equal(view.horario, "08:30");
  assert.equal(view.dataPrevistaIso, "2027-04-10");
  assert.equal(view.situacao, "Programado");
});

run("registro ausente não monta visualização", () => {
  assert.equal(
    montarVisualizacaoPeriodicoProgramado({
      registroId: "pf-sumiu",
      registros: [registro({ id: "pf-joao" })],
    }),
    null
  );
});

run("a aba consulta o periódico e preserva o olho do agendamento", () => {
  const aba = readFileSync(
    join(process.cwd(), "components/orcamentos/OrcamentoAbaAgendamentos.tsx"),
    "utf8"
  );
  const modal = readFileSync(
    join(
      process.cwd(),
      "components/periodicos-futuros/PeriodicoProgramadoViewModal.tsx"
    ),
    "utf8"
  );
  assert.match(modal, /Periódico programado/);
  assert.match(aba, /Visualizar periódico programado/);
  assert.match(aba, /carregarVisualizacaoPeriodicoProgramado/);
  assert.match(aba, /Visualizar agendamento/);
  assert.match(aba, /statusClassificacao === "programada"/);
  assert.match(aba, />\s*Editar\s*</);
  assert.doesNotMatch(modal, /<input|<select|<textarea|onSave/);

  const service = readFileSync(
    join(process.cwd(), "services/contrato-programacao-futura.service.ts"),
    "utf8"
  );
  const inicio = service.indexOf(
    "export async function carregarVisualizacaoPeriodicoProgramado"
  );
  assert.ok(inicio > 0);
  const fim = service.indexOf("\nexport async function ", inicio + 10);
  const corpo = service.slice(inicio, fim);
  assert.doesNotMatch(corpo, /\.update\(|\.insert\(|\.delete\(|\.upsert\(/);
});

console.log("ok: periodico-programado-visualizacao");
