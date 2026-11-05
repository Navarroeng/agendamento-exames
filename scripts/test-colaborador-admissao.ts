/** Admissão editável na relação consolidada: vínculo oficial, sem mexer no exame. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isDataCalendarioIso,
  validarPayloadAdmissao,
} from "../lib/colaborador-movimentacoes";
import { consolidarPortalColaboradores } from "../lib/portal-colaboradores";

const CLIENTE = "79369d60-7205-4e0a-baad-70d3e5f4ea9b";
const CPF = "52998224725";
const OUTRO = "39053344705";

assert.equal(isDataCalendarioIso("2026-03-01"), true);
assert.equal(isDataCalendarioIso("2026-03-01T00:00:00.000Z"), true);
assert.equal(isDataCalendarioIso("01/03/2026"), true);
assert.equal(isDataCalendarioIso("2026-02-31"), false);
assert.equal(isDataCalendarioIso(""), false);
assert.equal(isDataCalendarioIso("2026-3-1"), false);

{
  const ok = validarPayloadAdmissao({
    clienteId: CLIENTE,
    cpf: "529.982.247-25",
    dataAdmissao: "2026-03-01T00:00:00.000Z",
    movimentacaoId: "79369d60-7205-4e0a-baad-70d3e5f4ea9c",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.dataAdmissao, "2026-03-01");
    assert.equal(ok.cpfDigits, CPF);
    assert.equal(ok.movimentacaoId, "79369d60-7205-4e0a-baad-70d3e5f4ea9c");
  }
}

{
  const invalida = validarPayloadAdmissao({
    clienteId: CLIENTE,
    cpf: CPF,
    dataAdmissao: "2026-02-31",
  });
  assert.equal(invalida.ok, false);
}

{
  const semExame = consolidarPortalColaboradores({
    vagas: [
      { colaborador: "MARIA SILVA", colaborador_cpf: CPF, cargo_nome: "Auxiliar" },
    ],
    agendamentos: [],
  });
  assert.equal(semExame[0].dataAdmissaoIso, null);
  assert.equal(semExame[0].dataAdmissaoLabel, null);
  assert.equal(semExame[0].admissaoMovimentacaoId, null);
}

{
  const peloExame = consolidarPortalColaboradores({
    vagas: [
      { colaborador: "MARIA SILVA", colaborador_cpf: CPF, cargo_nome: "Auxiliar" },
    ],
    agendamentos: [
      {
        id: "ag-1",
        colaborador: "MARIA SILVA",
        colaborador_cpf: CPF,
        cargo_nome: "Auxiliar",
        aso: "Admissional",
        status: "agendado",
        data_agendamento: "2026-03-01",
      },
    ],
  });
  assert.equal(peloExame[0].dataAdmissaoLabel, "01/03/2026");
  assert.equal(peloExame[0].admissaoMovimentacaoId, null);
  assert.equal(peloExame[0].situacao, "ativo");
}

{
  const corrigida = consolidarPortalColaboradores({
    vagas: [
      { colaborador: "MARIA SILVA", colaborador_cpf: CPF, cargo_nome: "Auxiliar" },
    ],
    agendamentos: [
      {
        id: "ag-1",
        colaborador: "MARIA SILVA",
        colaborador_cpf: CPF,
        cargo_nome: "Auxiliar",
        aso: "Admissional",
        status: "agendado",
        data_agendamento: "2026-03-01",
      },
      {
        id: "ag-2",
        colaborador: "MARIA SILVA",
        colaborador_cpf: CPF,
        cargo_nome: "Auxiliar",
        aso: "Demissional",
        status: "aso_retido",
        data_agendamento: "2026-06-01",
      },
    ],
    movimentacoes: [
      {
        id: "adm-1",
        cpf_digits: CPF,
        tipo: "admissao",
        data_evento: "2026-01-15",
        criado_em: "2026-01-15T12:00:00.000Z",
      },
      {
        id: "adm-outro",
        cpf_digits: OUTRO,
        tipo: "admissao",
        data_evento: "2024-01-01",
      },
    ],
  });
  assert.equal(corrigida[0].dataAdmissaoIso, "2026-01-15");
  assert.equal(corrigida[0].dataAdmissaoLabel, "15/01/2026");
  assert.equal(corrigida[0].admissaoMovimentacaoId, "adm-1");
  assert.equal(corrigida[0].situacao, "demitido");
  assert.equal(corrigida[0].dataDesligamentoLabel, "01/06/2026");
  assert.equal(corrigida[0].nome, "MARIA SILVA");
  assert.equal(corrigida[0].cargo, "Auxiliar");
}

{
  const cancelada = consolidarPortalColaboradores({
    vagas: [
      { colaborador: "MARIA SILVA", colaborador_cpf: CPF, cargo_nome: "Auxiliar" },
    ],
    agendamentos: [
      {
        colaborador: "MARIA SILVA",
        colaborador_cpf: CPF,
        aso: "Admissional",
        status: "agendado",
        data_agendamento: "2026-03-01",
      },
    ],
    movimentacoes: [
      {
        id: "adm-cancelada",
        cpf_digits: CPF,
        tipo: "admissao",
        data_evento: "2020-01-01",
        cancelado_em: "2026-02-01T00:00:00.000Z",
      },
    ],
  });
  assert.equal(cancelada[0].dataAdmissaoIso, "2026-03-01");
  assert.equal(cancelada[0].admissaoMovimentacaoId, null);
}

const root = process.cwd();
const ui = readFileSync(
  join(root, "components/clientes/ClienteColaboradoresSection.tsx"),
  "utf8"
);
const portalUi = readFileSync(
  join(root, "components/portal-cliente/PortalColaboradores.tsx"),
  "utf8"
);
const servico = readFileSync(
  join(root, "services/colaborador-movimentacoes.server.ts"),
  "utf8"
);

assert.match(ui, /Incluir data/);
assert.match(ui, /Data de admissão/);
assert.match(ui, /Salvando\.\.\./);
assert.match(ui, /Editar data de admissão/);
assert.match(ui, /Demitir/);
assert.match(ui, /movimentacao_id: row\.admissaoMovimentacaoId/);
assert.match(ui, /cpf: row\.cpfDigits/);
assert.doesNotMatch(ui, /setBusca\(""\)/);
assert.doesNotMatch(ui, /setFiltro\("ativos"\)/);
assert.doesNotMatch(portalUi, /Incluir data/);
assert.doesNotMatch(servico, /\.from\("agendamentos"\)/);
assert.doesNotMatch(servico, /\.from\("contrato_vagas"\)/);
assert.match(servico, /\.eq\("cliente_id", payload\.clienteId\)/);
assert.match(servico, /\.eq\("cpf_digits", payload\.cpfDigits\)/);
assert.match(servico, /\.eq\("tipo", TIPO_ADMISSAO\)/);
assert.match(servico, /data_evento: payload\.dataAdmissao/);

console.log("test-colaborador-admissao: OK");
