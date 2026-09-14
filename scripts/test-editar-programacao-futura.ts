/** Edição compartilhada da programação futura (Implantação + Periódicos Futuros). */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  aplicarPatchProgramacaoFutura,
  CAMPOS_UPDATE_PROGRAMACAO_FUTURA,
  descreverAlteracaoProgramacaoFutura,
  determinarStatusProgramacaoFutura,
  EXAME_FUTURO_FORA_VIGENCIA_MSG,
  isOrigemImplantacaoInicial,
  labelOrigemPeriodico,
  motivoBloqueioEdicaoProgramacaoFutura,
  ORIGEM_PERIODICO_AGENDAMENTO,
  ORIGEM_PERIODICO_IMPLANTACAO,
  podeEditarProgramacaoFutura,
  PROGRAMACAO_FUTURA_NAO_EDITAVEL_AGENDADA_MSG,
  PROGRAMACAO_FUTURA_NAO_EDITAVEL_ORIGEM_MSG,
  PROGRAMACAO_FUTURA_NAO_EDITAVEL_STATUS_MSG,
  PROGRAMACAO_FUTURA_TIPO_ASO_INVALIDO_MSG,
  TIPOS_ASO_EXAME_FUTURO,
  validarEdicaoProgramacaoFutura,
} from "../lib/contrato-programacao-futura";
import {
  resolverDadosExibicaoVagaContrato as resolverVaga,
  type ContratoVagaRecord,
} from "../lib/contrato-vagas";
import {
  agruparPeriodicosPorColaboradorCiclo,
} from "../lib/periodico-agrupamento";
import {
  canEditarProximaDataPeriodico,
  filterPeriodicosFuturosPorMes,
  toPeriodicoFuturoRow,
} from "../lib/periodicos-futuro";
import type { PeriodicoFuturoRecord } from "../lib/types";

const root = process.cwd();

function programacaoErick(
  extra: Partial<PeriodicoFuturoRecord> = {}
): PeriodicoFuturoRecord {
  return {
    id: "pf-erick",
    agendamento_id: null,
    cliente_nome: "COCONUT ICE",
    colaborador: "Erick Murilo Lourenço Honorato",
    cargo_id: "cargo-1",
    cargo_nome: "Operador",
    exame_id: null,
    tipo_exame: "Admissional",
    exame_nome: "Admissional",
    data_realizada: null,
    proxima_data: "2027-04-22",
    data_prevista_original: "2027-04-22",
    antecipado: false,
    status: "ativo",
    origem: ORIGEM_PERIODICO_IMPLANTACAO,
    contrato_id: "contrato-coconut",
    colaborador_cpf: "52998224725",
    tipo_aso: "Admissional",
    consome_previsao_contrato: true,
    agendamento_vinculado_id: null,
    ...extra,
  };
}

function programacaoColega(): PeriodicoFuturoRecord {
  return programacaoErick({
    id: "pf-colega",
    colaborador: "Maria Silva",
    colaborador_cpf: "39053344705",
    tipo_aso: "Periódico",
    tipo_exame: "Periódico",
    exame_nome: "Periódico",
    proxima_data: "2027-05-10",
    data_prevista_original: "2027-05-10",
  });
}

function periodicoAutomaticoAso(): PeriodicoFuturoRecord {
  return {
    id: "pf-auto",
    agendamento_id: "ag-origem",
    cliente_nome: "COCONUT ICE",
    colaborador: "Erick Murilo Lourenço Honorato",
    cargo_id: "cargo-1",
    cargo_nome: "Operador",
    exame_id: "ex-clinico",
    tipo_exame: "Clínico",
    exame_nome: "Clínico",
    data_realizada: "2026-04-22",
    proxima_data: "2026-10-22",
    data_prevista_original: "2026-10-22",
    antecipado: false,
    status: "ativo",
    origem: ORIGEM_PERIODICO_AGENDAMENTO,
    colaborador_cpf: "52998224725",
    tipo_aso: null,
    consome_previsao_contrato: false,
    agendamento_vinculado_id: null,
  };
}

function vagaProgramada(periodicoId: string): ContratoVagaRecord {
  return {
    id: "vaga-erick",
    contrato_id: "contrato-coconut",
    orcamento_id: "orc-1",
    indice: 1,
    colaborador: "Erick Murilo Lourenço Honorato",
    colaborador_cpf: "52998224725",
    cargo_id: "cargo-1",
    cargo_nome: "Operador",
    status: "programada",
    credito_aso_id: null,
    agendamento_id: null,
    periodico_futuro_id: periodicoId,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function visaoImplantacao(record: PeriodicoFuturoRecord) {
  return {
    colaborador: record.colaborador,
    data: String(record.proxima_data).slice(0, 10),
    tipoAso: record.tipo_aso || record.exame_nome,
    situacao: determinarStatusProgramacaoFutura({
      status: record.status,
      agendamentoVinculadoId: record.agendamento_vinculado_id,
      dataRealizada: record.data_realizada,
    }),
    origem: record.origem,
  };
}

function visaoPeriodicos(record: PeriodicoFuturoRecord) {
  const row = toPeriodicoFuturoRow(record);
  const grupo = agruparPeriodicosPorColaboradorCiclo([row])[0];
  return {
    colaborador: grupo.colaborador,
    data: String(grupo.proxima_data).slice(0, 10),
    exameAso: grupo.examesLabel,
    origem: grupo.origem,
    antecipado: Boolean(grupo.antecipado),
  };
}

function editarMesmoRegistro(
  record: PeriodicoFuturoRecord,
  input: { tipoAso: string; dataPrevistaIso: string }
) {
  const bloqueio = motivoBloqueioEdicaoProgramacaoFutura(record);
  if (bloqueio) throw new Error(bloqueio);
  const validado = validarEdicaoProgramacaoFutura({
    tipoAso: input.tipoAso,
    dataPrevistaIso: input.dataPrevistaIso,
    dataInicioContrato: "2026-08-28",
    dataFimContrato: "2027-08-28",
  });
  if (!validado.ok) throw new Error(validado.message);
  return aplicarPatchProgramacaoFutura(record, validado.patch);
}

let casos = 0;
function run(nome: string, fn: () => void) {
  fn();
  casos += 1;
  console.log(`ok: ${nome}`);
}

run("1. Implantação Admissional → Periódico reflete em Periódicos Futuros", () => {
  const antes = programacaoErick();
  const depois = editarMesmoRegistro(antes, {
    tipoAso: "Periódico",
    dataPrevistaIso: "2027-04-22",
  });
  assert.equal(depois.id, antes.id);
  assert.equal(visaoImplantacao(depois).tipoAso, "Periódico");
  assert.equal(visaoPeriodicos(depois).exameAso, "Periódico");
  assert.equal(visaoPeriodicos(depois).origem, "Implantação Inicial");
});

run("2. Periódicos Futuros Admissional → Periódico reflete na Implantação", () => {
  const depois = editarMesmoRegistro(programacaoErick(), {
    tipoAso: "Periódico",
    dataPrevistaIso: "2027-04-22",
  });
  const implantacao = resolverVaga({
    vaga: vagaProgramada(depois.id),
    agendamentos: [],
    periodicos: [
      {
        id: depois.id,
        proxima_data: depois.proxima_data,
        tipo_aso: depois.tipo_aso,
      },
    ],
  });
  assert.equal(implantacao.tipoAso, "Periódico");
  assert.equal(visaoPeriodicos(depois).exameAso, "Periódico");
});

run("3. Alterar data 22/04/2027 → 30/04/2027 nas duas telas", () => {
  const depois = editarMesmoRegistro(programacaoErick(), {
    tipoAso: "Admissional",
    dataPrevistaIso: "2027-04-30",
  });
  assert.equal(visaoImplantacao(depois).data, "2027-04-30");
  assert.equal(visaoPeriodicos(depois).data, "2027-04-30");
  const implantacao = resolverVaga({
    vaga: vagaProgramada(depois.id),
    agendamentos: [],
    periodicos: [
      {
        id: depois.id,
        proxima_data: depois.proxima_data,
        tipo_aso: depois.tipo_aso,
      },
    ],
  });
  assert.equal(implantacao.dataExameIso, "2027-04-30");
});

run("4. Edição não cria novo registro (mesmo id, operação update)", () => {
  const antes = programacaoErick();
  const depois = editarMesmoRegistro(antes, {
    tipoAso: "Periódico",
    dataPrevistaIso: "2027-04-30",
  });
  assert.equal(depois.id, "pf-erick");
  assert.equal(depois.id, antes.id);
  const patch = validarEdicaoProgramacaoFutura({
    tipoAso: "Periódico",
    dataPrevistaIso: "2027-04-30",
  });
  assert.equal(patch.ok, true);
  if (patch.ok) {
    assert.deepEqual(Object.keys(patch.patch).sort(), [...CAMPOS_UPDATE_PROGRAMACAO_FUTURA].sort());
  }
});

run("5. Contagem antes/depois permanece igual", () => {
  const registros = [programacaoErick(), programacaoColega()];
  const antes = registros.length;
  const atualizados = registros.map((row) =>
    row.id === "pf-erick"
      ? editarMesmoRegistro(row, {
          tipoAso: "Periódico",
          dataPrevistaIso: "2027-04-30",
        })
      : row
  );
  assert.equal(atualizados.length, antes);
  assert.equal(atualizados.length, 2);
});

run("6. Registro com agendamento criado não pode ser editado", () => {
  const reagendado = programacaoErick({
    status: "reagendado",
    agendamento_vinculado_id: "ag-1",
  });
  assert.equal(podeEditarProgramacaoFutura(reagendado), false);
  assert.equal(
    motivoBloqueioEdicaoProgramacaoFutura(reagendado),
    PROGRAMACAO_FUTURA_NAO_EDITAVEL_AGENDADA_MSG
  );
  assert.equal(
    determinarStatusProgramacaoFutura({
      status: "reagendado",
      agendamentoVinculadoId: "ag-1",
      agendamentoStatus: "agendado",
    }),
    "Agendado"
  );
  assert.throws(
    () =>
      editarMesmoRegistro(reagendado, {
        tipoAso: "Periódico",
        dataPrevistaIso: "2027-04-30",
      }),
    (err: unknown) =>
      err instanceof Error &&
      err.message === PROGRAMACAO_FUTURA_NAO_EDITAVEL_AGENDADA_MSG
  );
});

run("7. Outro colaborador permanece intacto", () => {
  const erick = programacaoErick();
  const colega = programacaoColega();
  const snapshotColega = { ...colega };
  const erickNovo = editarMesmoRegistro(erick, {
    tipoAso: "Periódico",
    dataPrevistaIso: "2027-04-30",
  });
  assert.equal(erickNovo.tipo_aso, "Periódico");
  assert.deepEqual(colega, snapshotColega);
  assert.equal(colega.tipo_aso, "Periódico");
  assert.equal(colega.proxima_data, "2027-05-10");
  assert.equal(colega.colaborador, "Maria Silva");
});

run("8. origem implantacao_inicial permanece inalterada", () => {
  const depois = editarMesmoRegistro(programacaoErick(), {
    tipoAso: "Periódico",
    dataPrevistaIso: "2027-04-30",
  });
  assert.equal(depois.origem, ORIGEM_PERIODICO_IMPLANTACAO);
  assert.equal(isOrigemImplantacaoInicial(depois.origem), true);
  assert.equal(labelOrigemPeriodico(depois.origem), "Implantação Inicial");
  assert.equal(depois.consome_previsao_contrato, true);
  assert.equal(depois.contrato_id, "contrato-coconut");
  assert.equal(depois.colaborador, "Erick Murilo Lourenço Honorato");
  assert.equal(depois.colaborador_cpf, "52998224725");
  assert.equal(depois.cargo_id, "cargo-1");
  assert.equal(depois.cargo_nome, "Operador");
  assert.equal(depois.cliente_nome, "COCONUT ICE");
});

run("9. Filtro mês/ano em Periódicos Futuros segue a nova data", () => {
  const abril = toPeriodicoFuturoRow(programacaoErick());
  const maio = toPeriodicoFuturoRow(
    editarMesmoRegistro(programacaoErick(), {
      tipoAso: "Periódico",
      dataPrevistaIso: "2027-05-15",
    })
  );
  const noAbrilAntes = filterPeriodicosFuturosPorMes([abril], {
    year: 2027,
    month: 4,
  });
  const noAbrilDepois = filterPeriodicosFuturosPorMes([maio], {
    year: 2027,
    month: 4,
  });
  const noMaioDepois = filterPeriodicosFuturosPorMes([maio], {
    year: 2027,
    month: 5,
  });
  assert.equal(noAbrilAntes.length, 1);
  assert.equal(noAbrilDepois.length, 0);
  assert.equal(noMaioDepois.length, 1);
  assert.equal(noMaioDepois[0].id, "pf-erick");
});

run("10. Refresh relê o mesmo registro persistido", () => {
  const fonte = [programacaoErick()];
  fonte[0] = editarMesmoRegistro(fonte[0], {
    tipoAso: "Periódico",
    dataPrevistaIso: "2027-04-30",
  });
  const aposRefresh = fonte.find((row) => row.id === "pf-erick");
  assert.ok(aposRefresh);
  assert.equal(aposRefresh?.tipo_aso, "Periódico");
  assert.equal(aposRefresh?.proxima_data, "2027-04-30");
  assert.equal(visaoImplantacao(aposRefresh!).tipoAso, "Periódico");
  assert.equal(visaoPeriodicos(aposRefresh!).exameAso, "Periódico");
});

run("11. Correção da data mantém antecipado = false", () => {
  const depois = editarMesmoRegistro(programacaoErick(), {
    tipoAso: "Admissional",
    dataPrevistaIso: "2027-04-30",
  });
  assert.equal(depois.antecipado, false);
  assert.equal(visaoPeriodicos(depois).antecipado, false);
});

run("12. data_prevista_original acompanha a correção", () => {
  const depois = editarMesmoRegistro(programacaoErick(), {
    tipoAso: "Admissional",
    dataPrevistaIso: "2027-04-30",
  });
  assert.equal(depois.proxima_data, "2027-04-30");
  assert.equal(depois.data_prevista_original, "2027-04-30");
});

run("13. Tipo de ASO atualiza tipo_aso, tipo_exame e exame_nome", () => {
  const depois = editarMesmoRegistro(programacaoErick(), {
    tipoAso: "Periódico",
    dataPrevistaIso: "2027-04-22",
  });
  assert.equal(depois.tipo_aso, "Periódico");
  assert.equal(depois.tipo_exame, "Periódico");
  assert.equal(depois.exame_nome, "Periódico");
  assert.ok(TIPOS_ASO_EXAME_FUTURO.includes("Periódico"));
  assert.ok(!TIPOS_ASO_EXAME_FUTURO.includes("Demissional" as never));
  const invalido = validarEdicaoProgramacaoFutura({
    tipoAso: "Demissional",
    dataPrevistaIso: "2027-04-22",
  });
  assert.equal(invalido.ok, false);
  if (!invalido.ok) {
    assert.equal(invalido.message, PROGRAMACAO_FUTURA_TIPO_ASO_INVALIDO_MSG);
  }
});

run("14. Periódico automático de ASO concluído mantém bloqueio atual", () => {
  const auto = periodicoAutomaticoAso();
  assert.equal(podeEditarProgramacaoFutura(auto), false);
  assert.equal(
    motivoBloqueioEdicaoProgramacaoFutura(auto),
    PROGRAMACAO_FUTURA_NAO_EDITAVEL_ORIGEM_MSG
  );
  assert.equal(canEditarProximaDataPeriodico(auto), false);
  const grupo = agruparPeriodicosPorColaboradorCiclo([toPeriodicoFuturoRow(auto)])[0];
  assert.equal(grupo.podeEditarProgramacao, false);
  assert.equal(grupo.podeEditarProximaData, false);
});

run("bloqueia cumprido, cancelado e data fora da vigência", () => {
  assert.equal(
    motivoBloqueioEdicaoProgramacaoFutura(
      programacaoErick({ data_realizada: "2026-04-22" })
    ),
    PROGRAMACAO_FUTURA_NAO_EDITAVEL_STATUS_MSG
  );
  assert.equal(
    motivoBloqueioEdicaoProgramacaoFutura(
      programacaoErick({ status: "cancelado", cancelado_em: "2026-04-01" })
    ),
    PROGRAMACAO_FUTURA_NAO_EDITAVEL_STATUS_MSG
  );
  const fora = validarEdicaoProgramacaoFutura({
    tipoAso: "Periódico",
    dataPrevistaIso: "2028-01-01",
    dataInicioContrato: "2026-08-28",
    dataFimContrato: "2027-08-28",
  });
  assert.equal(fora.ok, false);
  if (!fora.ok) assert.equal(fora.message, EXAME_FUTURO_FORA_VIGENCIA_MSG);
});

run("auditoria descreve tipo e data alterados", () => {
  assert.equal(
    descreverAlteracaoProgramacaoFutura({
      tipoAsoAntes: "Admissional",
      tipoAsoDepois: "Periódico",
      dataAntes: "2027-04-22",
      dataDepois: "2027-04-22",
    }),
    "Tipo de ASO: Admissional → Periódico"
  );
  assert.equal(
    descreverAlteracaoProgramacaoFutura({
      tipoAsoAntes: "Admissional",
      tipoAsoDepois: "Admissional",
      dataAntes: "2027-04-22",
      dataDepois: "2027-04-30",
    }),
    "Data programada: 22/04/2027 → 30/04/2027"
  );
});

run("serviço compartilhado só faz UPDATE, sem INSERT", () => {
  const service = readFileSync(
    join(root, "services/contrato-programacao-futura.service.ts"),
    "utf8"
  );
  const inicio = service.indexOf("export async function atualizarProgramacaoFutura");
  const fim = service.indexOf(
    "export async function listarPeriodicosPendentesColaborador"
  );
  assert.ok(inicio >= 0);
  assert.ok(fim > inicio);
  const fn = service.slice(inicio, fim);
  assert.match(fn, /\.update\(/);
  assert.doesNotMatch(fn, /\.insert\(/);
  assert.doesNotMatch(fn, /\.upsert\(/);
  assert.match(fn, /antecipado: false/);
  assert.match(fn, /data_prevista_original/);
});

run("UI: Implantação tem Editar na vaga Programado e Periódicos substitui ação isolada", () => {
  const aba = readFileSync(
    join(root, "components/orcamentos/OrcamentoAbaAgendamentos.tsx"),
    "utf8"
  );
  const menu = readFileSync(
    join(root, "components/periodicos-futuros/PeriodicoRowActionsMenu.tsx"),
    "utf8"
  );
  assert.match(aba, /vaga\.status === "programada"/);
  assert.match(aba, />\s*Editar\s*</);
  assert.match(aba, /atualizarProgramacaoFutura/);
  assert.match(aba, /EditarProgramacaoFuturaModal/);
  assert.match(menu, /editar_programacao/);
  assert.match(menu, /label: "Editar"/);
  assert.match(menu, /podeEditarProgramacao/);
});

run("grupo de implantação inicial recebe podeEditarProgramacao", () => {
  const grupo = agruparPeriodicosPorColaboradorCiclo([
    toPeriodicoFuturoRow(programacaoErick()),
  ])[0];
  assert.equal(grupo.podeEditarProgramacao, true);
  assert.equal(grupo.origem, "Implantação Inicial");
});

console.log(`ok: editar-programacao-futura (${casos} casos)`);
