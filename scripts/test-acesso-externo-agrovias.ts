import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  acessoExternoVigente,
  agendamentosVisiveisExternos,
  arquivoRhLiberado,
  colaboradorNoCadastro,
  cursosVisiveisExternos,
  erroConferenciaDocumento,
  podeEnviarDocumentoRh,
} from "../lib/acesso-externo-agrovias";
import { canAccessPath } from "../lib/permissions";

const cliente = "11111111-1111-4111-8111-111111111111";
const outro = "22222222-2222-4222-8222-222222222222";

assert.equal(
  acessoExternoVigente({
    perfil: "portal_agrovias",
    ativo: true,
    clienteId: cliente,
    clienteEscopo: cliente,
    revogadoEm: null,
  }),
  true
);
assert.equal(
  acessoExternoVigente({
    perfil: "portal_agrovias",
    ativo: true,
    clienteId: cliente,
    clienteEscopo: cliente,
    revogadoEm: "2026-11-13T00:00:00.000Z",
  }),
  false
);
assert.equal(
  acessoExternoVigente({
    perfil: "portal_agrovias",
    ativo: false,
    clienteId: cliente,
    clienteEscopo: cliente,
    revogadoEm: null,
  }),
  false
);
assert.equal(
  acessoExternoVigente({
    perfil: "operacional",
    ativo: true,
    clienteId: cliente,
    clienteEscopo: cliente,
    revogadoEm: null,
  }),
  false
);
assert.equal(
  acessoExternoVigente({
    perfil: "portal_agrovias",
    ativo: true,
    clienteId: outro,
    clienteEscopo: cliente,
    revogadoEm: null,
  }),
  false
);

assert.equal(colaboradorNoCadastro(["a", "b"], "b"), true);
assert.equal(colaboradorNoCadastro(["a"], "trocado"), false);

assert.equal(podeEnviarDocumentoRh("aguardando_envio"), true);
assert.equal(podeEnviarDocumentoRh("reenvio_solicitado"), true);
assert.equal(podeEnviarDocumentoRh("recebido"), false);
assert.equal(podeEnviarDocumentoRh("conferido"), false);
assert.equal(erroConferenciaDocumento({ situacao: "recebido", acao: "conferir" }), null);
assert.equal(
  erroConferenciaDocumento({ situacao: "aguardando_envio", acao: "conferir" }),
  "Só um documento recebido pode ser conferido."
);
assert.ok(erroConferenciaDocumento({ situacao: "recebido", acao: "reenvio", observacao: " " }));
assert.equal(
  erroConferenciaDocumento({
    situacao: "recebido",
    acao: "reenvio",
    observacao: "Enviar a segunda via.",
  }),
  null
);

assert.equal(arquivoRhLiberado({ path: `${cliente}/rh/doc/arquivo.pdf`, clienteId: cliente }), true);
assert.equal(
  arquivoRhLiberado({ path: `${cliente}/certificados/doc/arquivo.pdf`, clienteId: cliente }),
  false
);
assert.equal(arquivoRhLiberado({ path: `${outro}/rh/doc/arquivo.pdf`, clienteId: cliente }), false);

const exames = agendamentosVisiveisExternos({
  hoje: "2026-11-13",
  cpf: "52998224725",
  agendamentos: [
    {
      id: "futuro",
      colaborador: "Homônimo",
      colaborador_cpf: "529.982.247-25",
      aso: "Periódico",
      status: "agendado",
      data_agendamento: "2026-12-01",
      horario: "09:15",
      clinica_nome: "Clínica Norte",
    },
    {
      id: "feito",
      colaborador_cpf: "52998224725",
      aso: "Admissional",
      status: "aso_retido",
      data_agendamento: "2026-10-01",
      horario: "08:00:00",
      clinica_nome: "Clínica Sul",
    },
    {
      id: "cancelado",
      colaborador_cpf: "52998224725",
      aso: "Demissional",
      status: "cancelado",
      data_agendamento: "2026-12-02",
      horario: "10:00",
      clinica_nome: "Clínica Sul",
    },
    {
      id: "outro",
      colaborador: "Homônimo",
      colaborador_cpf: "39053344705",
      aso: "Periódico",
      status: "agendado",
      data_agendamento: "2026-12-03",
      clinica_nome: "Outra",
    },
  ],
});
assert.deepEqual(
  exames.proximos.map((item) => item.tipoExame),
  ["Periódico"]
);
assert.equal(exames.proximos[0]?.horarioLabel, "09:15");
assert.equal(exames.proximos[0]?.localLabel, "Clínica Norte");
assert.equal(exames.realizados[0]?.situacao, "ASO retido");
assert.equal("exames" in (exames.proximos[0] ?? {}), false);
assert.equal(exames.proximos.some((item) => item.id === "outro" || item.id === "cancelado"), false);

const semCpf = agendamentosVisiveisExternos({
  hoje: "2026-11-13",
  agendamentoId: "ag-1",
  agendamentos: [
    {
      id: "ag-1",
      colaborador: "Mesmo nome",
      aso: "Admissional",
      status: "agendado",
      data_agendamento: "2026-12-04",
      clinica_nome: "Clínica",
    },
    {
      id: "ag-2",
      colaborador: "Mesmo nome",
      aso: "Periódico",
      status: "agendado",
      data_agendamento: "2026-12-05",
      clinica_nome: "Clínica",
    },
  ],
});
assert.deepEqual(semCpf.proximos.map((item) => item.id), ["ag-1"]);

const cursos = cursosVisiveisExternos({
  cursos: [{ id: "c1", nome: "NR-35" }],
  certificados: [{ id: "cert", cursoId: "c1", realizadoEm: "2026-10-10", validade: "2027-10-10" }],
});
assert.deepEqual(Object.keys(cursos[0] ?? {}).sort(), ["id", "nome", "realizadoEm", "validade"]);
assert.equal("valorCentavos" in (cursos[0] ?? {}), false);
assert.equal("arquivoPath" in (cursos[0] ?? {}), false);

assert.equal(canAccessPath("portal_agrovias", "/portal-agrovias"), true);
assert.equal(canAccessPath("portal_agrovias", "/gestao-plataformas"), false);

const cabecalho = readFileSync(
  join(process.cwd(), "components/portal-agrovias/CabecalhoPortalAgrovias.tsx"),
  "utf8"
);
const portal = readFileSync(
  join(process.cwd(), "components/portal-agrovias/PortalAgroviasPage.tsx"),
  "utf8"
);
const gestao = readFileSync(
  join(process.cwd(), "components/gestao-plataformas/GestaoPlataformasPage.tsx"),
  "utf8"
);
const recuperacao = readFileSync(
  join(process.cwd(), "components/auth/LoginPage.tsx"),
  "utf8"
);

assert.match(cabecalho, /src="\/portal-agrovias\/vegetacao\.jpg"/);
assert.match(cabecalho, /src="\/portal-agrovias\/logo-agrovias\.png"/);
assert.match(cabecalho, /from-white\/80/);
assert.match(cabecalho, /object-left-top/);
assert.doesNotMatch(cabecalho, /faixa-mata/);
assert.doesNotMatch(cabecalho, /shadow|border|bg-white/);
assert.match(cabecalho, /h-\[100px\][\s\S]*sidebar:h-\[140px\]/);
assert.match(cabecalho, /h-\[90px\][\s\S]*sidebar:h-\[116px\]/);
assert.match(portal, /content-type/);
assert.match(portal, /function lerJson/);
const middleware = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
assert.match(middleware, /pathname\.startsWith\("\/api\/"\)/);
assert.match(middleware, /Não autenticado\./);
assert.match(middleware, /status: 401/);
assert.match(portal, /<CabecalhoPortalAgrovias \/>/);
assert.match(portal, /semTitulo/);
assert.doesNotMatch(portal, /function CabecalhoPortalAgrovias/);
assert.match(gestao, /<CabecalhoPortalAgrovias \/>/);
assert.match(gestao, /ocultarTitulo/);
assert.match(gestao, /painel\.escopo\.clienteNome\} · \$\{painel\.escopo\.orcamentoNumero\}/);
assert.match(gestao, /Gerenciar acesso externo/);
assert.match(gestao, /painel\?\.podeConcederAcesso/);
assert.doesNotMatch(gestao, /AcessoExternoCard/);
assert.match(gestao, /Conceder acesso/);
assert.match(gestao, /acao: "conceder_acesso"/);
assert.match(gestao, /acao: "revogar_acesso"/);
assert.match(gestao, /destinoErro === "acesso"/);
assert.match(gestao, /setAcessoAberto\(false\)/);
assert.doesNotMatch(
  gestao.slice(gestao.indexOf("onFechar={() => {"), gestao.indexOf("onFechar={() => {") + 180),
  /setAba\(/
);
assert.match(recuperacao, /Esqueci minha senha/);

console.log("test-acesso-externo-agrovias: OK");
