/**
 * Filiais homônimas no save de agendamento (FESHI 0004-05 vs 0002-35).
 * Executar: node scripts/run-ts-test.js scripts/test-agendamento-cliente-identidade.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AGENDAMENTO_SAVE_ERRO_INESPERADO_MSG,
  CLIENTE_CADASTRO_AMBIGUO_MSG,
  escolherUnicoPorNome,
  filtrarPeriodicosDoCliente,
  mensagemErroSalvarAgendamento,
  planClienteLookup,
  selecionarContratoVigenteParaAgendamento,
} from "../lib/agendamento-cliente-lookup";
import { contratoEstaVigenteNaData } from "../lib/cliente-contrato-vigencia";

const FESHI_NOME = "FESHI SERVICOS ADUANEIROS E TRANSPORTES LTDA";
const FILIAL_0004 = {
  id: "d6c18ba3-a459-4023-a142-06b1e67a3e3b",
  nome: FESHI_NOME,
  cnpj: "47.190.517/0004-05",
};
const FILIAL_0002 = {
  id: "687b141d-9d70-482f-8875-ee9dfcbb2a42",
  nome: FESHI_NOME,
  cnpj: "47.190.517/0002-35",
};
const CONTRATO_0004 = "59ca635f-bfdc-4187-9c50-ce1a4aa82f81";
const CONTRATO_0002 = "729ff975-fca2-4d0c-8b20-c749bccc2686";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

run("planClienteLookup prioriza UUID, depois CNPJ, nome só no legado", () => {
  assert.deepEqual(
    planClienteLookup({
      clienteId: FILIAL_0004.id,
      clienteCnpj: FILIAL_0002.cnpj,
      clienteNome: FESHI_NOME,
    }),
    { by: "id", value: FILIAL_0004.id }
  );
  assert.deepEqual(
    planClienteLookup({
      clienteCnpj: FILIAL_0004.cnpj,
      clienteNome: FESHI_NOME,
    }),
    { by: "cnpj", value: "47190517000405" }
  );
  assert.deepEqual(planClienteLookup({ clienteNome: FESHI_NOME }), {
    by: "nome",
    value: FESHI_NOME,
  });
});

run("dois clientes com o mesmo nome não escolhem a filial errada", () => {
  const chosen = escolherUnicoPorNome(
    [FILIAL_0002, FILIAL_0004],
    FESHI_NOME
  );
  assert.equal(chosen.status, "ambiguous");
  assert.equal(chosen.item, undefined);

  const unico = escolherUnicoPorNome([FILIAL_0004], FESHI_NOME);
  assert.equal(unico.status, "unique");
  assert.equal(unico.item?.id, FILIAL_0004.id);
});

run("Periódico Futuro da outra filial não entra pelo nome", () => {
  const rows = [
    {
      id: "pf-outra",
      contrato_id: CONTRATO_0002,
      cliente_nome: FESHI_NOME,
    },
    {
      id: "pf-desta",
      contrato_id: CONTRATO_0004,
      cliente_nome: FESHI_NOME,
    },
  ];
  const filtrados = filtrarPeriodicosDoCliente({
    rows,
    contratoIdsDoCliente: [CONTRATO_0004],
  });
  assert.deepEqual(
    filtrados.map((row) => row.id),
    ["pf-desta"]
  );
});

run("vigência com contrato_id conhecido não rediscobre o contrato da outra FESHI", () => {
  const contratos = [
    {
      id: CONTRATO_0004,
      status: "ativo" as const,
      data_inicio: "2026-08-21",
      data_fim: "2027-08-21",
      orcamento_id: "orc-28",
      boleto_pago: true,
      liberado_para_agendamento: true,
    },
    {
      id: CONTRATO_0002,
      status: "ativo" as const,
      data_inicio: "2026-08-21",
      data_fim: "2027-08-21",
      orcamento_id: "orc-31",
      boleto_pago: true,
      liberado_para_agendamento: true,
    },
  ];
  const soFilial0004 = [contratos[0]];
  const escolhido = selecionarContratoVigenteParaAgendamento(
    soFilial0004,
    (contrato) => contratoEstaVigenteNaData(contrato, "2026-09-22"),
    CONTRATO_0004
  );
  assert.equal(escolhido?.id, CONTRATO_0004);

  const naoMistura = selecionarContratoVigenteParaAgendamento(
    soFilial0004,
    (contrato) => contratoEstaVigenteNaData(contrato, "2026-09-22"),
    CONTRATO_0002
  );
  assert.equal(naoMistura, undefined);
});

run("erro inesperado do save vira mensagem, não silêncio", () => {
  assert.equal(
    mensagemErroSalvarAgendamento({
      code: "PGRST116",
      message: "JSON object requested, multiple (or no) rows returned",
    }),
    CLIENTE_CADASTRO_AMBIGUO_MSG
  );
  assert.equal(
    mensagemErroSalvarAgendamento({}),
    AGENDAMENTO_SAVE_ERRO_INESPERADO_MSG
  );
  assert.equal(
    mensagemErroSalvarAgendamento(new Error("falha de rede")),
    "falha de rede"
  );
});

run("disponibilidade consulta o UUID quando clienteId existe", () => {
  const src = read("services/cliente.service.ts");
  const fn = src.slice(
    src.indexOf("export async function assertClienteDisponivelParaAgendamento")
  );
  const body = fn.slice(0, fn.indexOf("export class ClienteIndisponivelAgendamentoError"));
  assert.match(body, /planClienteLookup/);
  assert.match(body, /\.eq\("id", plan\.value\)/);
  assert.match(body, /\.eq\("cnpj_digits", plan\.value\)/);
  assert.doesNotMatch(body, /\.eq\("nome", trimmed\)\.maybeSingle\(\)/);
  assert.match(body, /CLIENTE_CADASTRO_AMBIGUO_MSG/);
});

run("vigência do save e do banner usam clienteId, não o primeiro nome", () => {
  const hook = read("hooks/useAgendamentosPage.ts");
  const vigencia = read("lib/cliente-contrato-vigencia.ts");
  const banner = read("hooks/useContratoVigenciaCheck.ts");
  assert.match(hook, /verificarContratoVigenteDoAgendamento/);
  assert.match(hook, /contratoId: vagaContratoIdRef\.current/);
  assert.doesNotMatch(hook, /verificarContratoVigentePorNome\(/);
  assert.match(banner, /verificarContratoVigenteDoAgendamento/);
  assert.match(banner, /clienteId/);
  assert.match(vigencia, /planClienteLookup/);
  assert.match(vigencia, /selecionarContratoVigenteParaAgendamento/);
});

run("inadimplência com clienteId filtra referencia_id, não a outra FESHI", () => {
  const src = read("services/fatura-inadimplencia.service.ts");
  const assertFn = src.slice(
    src.indexOf("export async function assertClienteSemInadimplencia")
  );
  assert.match(assertFn, /options\?: \{ clienteId\?/);
  assert.match(src, /\.eq\("referencia_id", clienteId\)/);
  const hook = read("hooks/useAgendamentosPage.ts");
  assert.match(
    hook,
    /assertClienteSemInadimplencia\(clienteNome, \{\s*clienteId: clienteId \|\| null,/
  );
});

run("Periódico Futuro no save recebe clienteId", () => {
  const hook = read("hooks/useAgendamentosPage.ts");
  const svc = read("services/contrato-programacao-futura.service.ts");
  assert.match(hook, /clienteId: clienteId \|\| null/);
  assert.match(svc, /filtrarPeriodicosDoCliente/);
  assert.match(svc, /listarContratosPorCliente\(clienteId\)/);
});

run("insert do save usa cliente_id e segue para vincular a vaga correta", () => {
  const hook = read("hooks/useAgendamentosPage.ts");
  const svc = read("services/agendamento.service.ts");
  assert.match(svc, /assertContratoVigenteDoAgendamento/);
  assert.match(svc, /clienteId: agendamento\.cliente_id/);
  assert.match(hook, /salvarAgendamentoComExames\(payload, examesPayload\)/);
  assert.match(hook, /vincularAgendamentoAVaga/);
  assert.match(hook, /vagaEmUsoIdRef\.current/);
  assert.match(hook, /vagaContratoIdRef\.current/);
  assert.doesNotMatch(hook, /resolveClienteIdByNome\(clientes, payload\.cliente_nome\)/);
});

run("catch do save sempre apresenta feedback", () => {
  const hook = read("hooks/useAgendamentosPage.ts");
  assert.match(hook, /mensagemErroSalvarAgendamento\(err\)/);
  assert.match(hook, /toast\.error\(mensagemErroSalvarAgendamento/);
});

run("instrumentação temporária [AG-DIAG] foi removida", () => {
  const files = [
    "hooks/useAgendamentosPage.ts",
    "hooks/useContratoVigenciaCheck.ts",
    "lib/cliente-contrato-vigencia.ts",
    "services/contrato-vagas.service.ts",
    "components/agendamentos/FormActions.tsx",
    "components/agendamentos/AgendamentoPage.tsx",
    "components/agendamentos/VagaComprometidaModal.tsx",
  ];
  for (const file of files) {
    const src = read(file);
    assert.doesNotMatch(src, /agendamento-diag/);
    assert.doesNotMatch(src, /AgendamentoDiagOverlay/);
    assert.doesNotMatch(src, /\[AG-DIAG\]/);
    assert.doesNotMatch(src, /agDiagCheckpoint/);
  }
});

console.log("test-agendamento-cliente-identidade: OK");
