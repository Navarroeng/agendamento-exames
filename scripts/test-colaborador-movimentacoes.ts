import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isUuid,
  podeDemitirColaborador,
  podeDesfazerDesligamentoAdmin,
  validarPayloadDesfazerDesligamento,
  validarPayloadDesligamentoAdmin,
} from "../lib/colaborador-movimentacoes";
import {
  consolidarPortalColaboradores,
  paraLinhaPortalCliente,
  type ClienteColaboradorLinha,
} from "../lib/portal-colaboradores";
import { resolveAuditoriaActorIgnoringClientClaims } from "../lib/auditoria";

const CPF_A = "52998224725";
const root = process.cwd();

assert.equal(isUuid("not-a-uuid"), false);
assert.equal(isUuid("79369d60-7205-4e0a-baad-70d3e5f4ea9b"), true);

{
  const bad = validarPayloadDesligamentoAdmin({
    clienteId: "x",
    cpf: "123",
    dataEvento: "2026-09-15",
  });
  assert.equal(bad.ok, false);
}

{
  const badCpf = validarPayloadDesligamentoAdmin({
    clienteId: "79369d60-7205-4e0a-baad-70d3e5f4ea9b",
    cpf: "11111111111",
    dataEvento: "2026-09-15",
  });
  assert.equal(badCpf.ok, false);
  if (!badCpf.ok) assert.match(badCpf.error, /CPF/);
}

{
  const ok = validarPayloadDesligamentoAdmin({
    clienteId: "79369d60-7205-4e0a-baad-70d3e5f4ea9b",
    cpf: "529.982.247-25",
    dataEvento: "2026-09-15",
    motivo: "  dispensado  ",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.cpfDigits, CPF_A);
    assert.equal(ok.dataEvento, "2026-09-15");
    assert.equal(ok.motivo, "dispensado");
  }
}

{
  const bad = validarPayloadDesfazerDesligamento({
    clienteId: "79369d60-7205-4e0a-baad-70d3e5f4ea9b",
    movimentacaoId: "abc",
  });
  assert.equal(bad.ok, false);
}

{
  const ativo: ClienteColaboradorLinha = {
    id: CPF_A,
    cpfDigits: CPF_A,
    cpfMascarado: "***.***.***-25",
    nome: "MARIA",
    cargo: "Aux",
    situacao: "ativo",
    situacaoLabel: "Ativo",
    dataAdmissaoIso: "2026-03-01",
    dataAdmissaoLabel: "01/03/2026",
    dataDesligamentoIso: null,
    dataDesligamentoLabel: null,
    desligamentoOrigem: null,
    desligamentoMovimentacaoId: null,
  };
  assert.equal(podeDemitirColaborador(ativo), true);
  assert.equal(podeDesfazerDesligamentoAdmin(ativo), false);

  const demitidoAdmin: ClienteColaboradorLinha = {
    ...ativo,
    situacao: "demitido",
    situacaoLabel: "Demitido",
    dataDesligamentoIso: "2026-09-15",
    dataDesligamentoLabel: "15/09/2026",
    desligamentoOrigem: "admin",
    desligamentoMovimentacaoId: "mov-1",
  };
  assert.equal(podeDemitirColaborador(demitidoAdmin), false);
  assert.equal(podeDesfazerDesligamentoAdmin(demitidoAdmin), true);

  const demitidoAso: ClienteColaboradorLinha = {
    ...demitidoAdmin,
    desligamentoOrigem: "demissional",
    desligamentoMovimentacaoId: null,
  };
  assert.equal(podeDesfazerDesligamentoAdmin(demitidoAso), false);
}

{
  const actor = resolveAuditoriaActorIgnoringClientClaims({
    auth: {
      user: { id: "user-1" },
      usuarioNome: "Operador Real",
      usuarioEmail: "op@navarro.test",
    },
    body: {
      usuarioNome: "Atacante",
      usuarioEmail: "spoof@x.test",
      usuarioId: "outro",
    },
  });
  assert.equal(actor.usuarioNome, "Operador Real");
  assert.notEqual(actor.usuarioNome, "Atacante");
}

{
  const linhas = consolidarPortalColaboradores({
    vagas: [
      { colaborador: "MARIA", colaborador_cpf: CPF_A, cargo_nome: "Aux" },
    ],
    agendamentos: [],
    movimentacoes: [
      {
        id: "mov-1",
        cpf_digits: CPF_A,
        tipo: "desligamento_admin",
        data_evento: "2026-09-15",
      },
    ],
  });
  assert.equal(linhas[0].situacao, "demitido");
  const publico = paraLinhaPortalCliente(linhas[0]);
  assert.equal("desligamentoOrigem" in publico, false);
  assert.equal("desligamentoMovimentacaoId" in publico, false);
  assert.doesNotMatch(JSON.stringify(publico), /"mov-1"/);
}

{
  const svc = readFileSync(
    join(root, "services/colaborador-movimentacoes.server.ts"),
    "utf8"
  );
  const portalSvc = readFileSync(
    join(root, "services/portal-colaboradores.server.ts"),
    "utf8"
  );
  const ui = readFileSync(
    join(root, "components/clientes/ClienteColaboradoresSection.tsx"),
    "utf8"
  );
  const modal = readFileSync(
    join(root, "components/modals/ClienteViewModal.tsx"),
    "utf8"
  );
  const portalUi = readFileSync(
    join(root, "components/portal-cliente/PortalColaboradores.tsx"),
    "utf8"
  );
  const portalApi = readFileSync(
    join(root, "app/api/portal/colaboradores/route.ts"),
    "utf8"
  );
  const adminApi = readFileSync(
    join(root, "app/api/clientes/[clienteId]/colaboradores/route.ts"),
    "utf8"
  );
  const desligarRoute = readFileSync(
    join(root, "app/api/clientes/[clienteId]/colaboradores/desligamento/route.ts"),
    "utf8"
  );
  const migration = readFileSync(
    join(root, "supabase/migrations/128_colaborador_movimentacoes.sql"),
    "utf8"
  );

  assert.doesNotMatch(svc, /\.from\("contrato_vagas"\)/);
  assert.doesNotMatch(svc, /\.from\("agendamentos"\)/);
  assert.doesNotMatch(svc, /\.from\("faturas/);
  assert.doesNotMatch(svc, /from\("esocial/i);
  assert.doesNotMatch(svc, /from\("implantacao/i);
  assert.match(svc, /from\("colaborador_movimentacoes"\)/);
  assert.match(svc, /auditoriaActorFromSessionPerfil/);
  assert.match(portalSvc, /\.is\("cancelado_em", null\)/);
  assert.doesNotMatch(portalSvc, /\.from\("contrato_vagas"\)[\s\S]{0,200}\.(update|insert|delete)\(/);

  assert.match(modal, /ClienteColaboradoresSection/);
  assert.match(ui, /Demitir/);
  assert.match(ui, /Desfazer desligamento/);
  assert.match(ui, /Este desligamento não gera exame demissional nem agendamento/);
  assert.match(ui, /Confirmar desligamento/);
  assert.doesNotMatch(portalUi, />Demitir</);
  assert.doesNotMatch(portalUi, /Desfazer desligamento/);
  assert.doesNotMatch(portalUi, /desligamentoOrigem/);
  assert.doesNotMatch(portalUi, /desligamentoMovimentacaoId/);
  assert.match(portalApi, /paraColaboradoresPortalCliente/);
  assert.doesNotMatch(portalApi, /desligamentoMovimentacaoId/);
  assert.doesNotMatch(adminApi, /paraColaboradoresPortalCliente/);
  assert.match(ui, /desligamentoMovimentacaoId/);

  assert.match(desligarRoute, /void body\.usuarioNome/);
  assert.match(desligarRoute, /actor: staff\.actor/);
  assert.doesNotMatch(desligarRoute, /usuarioNome: body/);

  assert.match(migration, /colaborador_movimentacoes/);
  assert.match(migration, /is_staff_user\(\)/);
  assert.doesNotMatch(migration, /using \(true\)/);
  assert.match(migration, /idx_colaborador_movimentacoes_admin_data_unica/);
  assert.doesNotMatch(migration, /for delete/);
}

console.log("test-colaborador-movimentacoes: ok");
