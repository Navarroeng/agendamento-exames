/**
 * Home do Portal do Cliente — mapeamento, privacidade e DTO.
 * Executar: npx tsx scripts/test-portal-home.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PORTAL_DEV_CLIENTE_ID_ENV,
  consolidarEmpresasPortalPreview,
  dtoContemCampoProibido,
  escolherCampanhaAtualPortal,
  estadoTimelinePortal,
  isPerfilStaffNavarro,
  mapParticipacaoPortal,
  montarPortalResumo,
  participanteAtivoNoPortal,
  portalResumoVazio,
  resolvePortalDevClienteId,
  resolverClienteIdPortalPreview,
  type PortalCampanhaFonte,
  type PortalParticipanteFonte,
  type PortalSnapshotFonte,
} from "../lib/portal-cliente";
import type { RiscosRelatorioResultadoJson } from "../lib/riscos-relatorio";
import { NAV_SECTIONS } from "../lib/constants";
import { canAccessPath } from "../lib/perfil-access";

const root = process.cwd();

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function campanha(
  partial: Partial<PortalCampanhaFonte> & Pick<PortalCampanhaFonte, "id" | "status">
): PortalCampanhaFonte {
  return {
    empresa_nome: "Empresa Demo LTDA",
    data_inicio: "2026-08-18",
    data_encerramento: "2026-08-30",
    created_at: "2026-08-01T12:00:00.000Z",
    ...partial,
  };
}

function snapshotFonte(): PortalSnapshotFonte {
  const json: RiscosRelatorioResultadoJson = {
    versao: 2,
    capa: {
      empresaNome: "Empresa Demo LTDA",
      codigoPublico: "ABC123",
      dataInicio: "2026-08-18",
      dataEncerramento: "2026-08-30",
      participantes: 3,
      respondentes: 3,
      pendentes: 0,
      taxaParticipacao: 100,
    },
    resumoExecutivo: {
      participacaoPercentual: 100,
      statusGeralMensagem: "ok",
      quantidadeDimensoes: 3,
      dimensoesCriticas: [
        {
          id: "exigencias-quantitativas",
          nome: "Exigências quantitativas",
          classificacaoLabel: "Situação Moderada",
        },
        {
          id: "inseguranca-trabalho",
          nome: "Insegurança no trabalho",
          classificacaoLabel: "Situação Desfavorável",
        },
      ],
    },
    dimensoes: [
      {
        id: "compromisso-local-trabalho",
        nome: "Compromisso com o local de trabalho",
        tipo: "PROTECAO",
        entraNoCalculo: true,
        media: 3.2,
        classificacaoId: "situacao_favoravel",
        classificacaoLabel: "Situação Favorável",
        classificacaoInterpretacao: "",
        cor: "#16a34a",
        respondentesValidos: 3,
        descricao: "",
      },
      {
        id: "exigencias-quantitativas",
        nome: "Exigências quantitativas",
        tipo: "RISCO",
        entraNoCalculo: true,
        media: 2.0,
        classificacaoId: "risco_intermediario",
        classificacaoLabel: "Situação Moderada",
        classificacaoInterpretacao: "",
        cor: "#ca8a04",
        respondentesValidos: 3,
        descricao: "",
      },
      {
        id: "inseguranca-trabalho",
        nome: "Insegurança no trabalho",
        tipo: "RISCO",
        entraNoCalculo: true,
        media: 2.9,
        classificacaoId: "risco_para_saude",
        classificacaoLabel: "Situação Desfavorável",
        classificacaoInterpretacao: "",
        cor: "#dc2626",
        respondentesValidos: 3,
        descricao: "",
      },
    ],
    comportamentosOfensivos: {
      titulo: "Comportamentos Ofensivos",
      respondentesComAlgumaResposta: 0,
      media: null,
      classificacao: null,
      itens: [],
    },
    conclusao: null,
    recomendacoes: null,
  };
  return {
    gerado_em: "2026-08-19T14:00:00.000Z",
    resultado_json: json,
  };
}

const tresAtivos: PortalParticipanteFonte[] = [
  { nome_completo: "Ana Souza", status: "respondido" },
  { nome_completo: "Bruno Lima", status: "pendente" },
  { nome_completo: "Carla Dias", status: "iniciado" },
];

run("1. campanha em preparação → programada", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c1", status: "em_preparacao" }),
    participantes: tresAtivos,
    snapshot: null,
  });
  assert.equal(resumo.statusPortal, "programada");
  assert.equal(resumo.ciclo, 2026);
  assert.equal(resumo.empresaNome, "Empresa Demo LTDA");
  assert.equal(resumo.logoUrl, null);
  assert.equal(resumo.planoAcaoDisponivel, false);
  assert.equal(estadoTimelinePortal(resumo, "participantes"), "atual");
  assert.equal(estadoTimelinePortal(resumo, "pesquisa"), "proxima");
  assert.equal(resumo.relatorioDisponivel, false);
  assert.equal(resumo.categoriasFavoraveis.length, 0);
});

run("2. campanha aberta com 0 respondidos → aberta", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c2", status: "aberta" }),
    participantes: [
      { nome_completo: "Ana Souza", status: "pendente" },
      { nome_completo: "Bruno Lima", status: "pendente" },
    ],
    snapshot: null,
  });
  assert.equal(resumo.statusPortal, "aberta");
  assert.equal(resumo.respondidos, 0);
  assert.equal(resumo.cadastrados, 2);
  assert.equal(resumo.participacaoPercentual, 0);
  assert.equal(estadoTimelinePortal(resumo, "pesquisa"), "atual");
  assert.equal(estadoTimelinePortal(resumo, "participantes"), "concluida");
});

run("3. campanha aberta em andamento", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c3", status: "aberta" }),
    participantes: tresAtivos,
    snapshot: null,
  });
  assert.equal(resumo.statusPortal, "em_andamento");
  assert.equal(resumo.cadastrados, 3);
  assert.equal(resumo.respondidos, 1);
  assert.equal(resumo.pendentes, 2);
  assert.equal(resumo.participacaoPercentual, 33);
});

run("4. campanha encerrada sem snapshot → concluida", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c4", status: "encerrada" }),
    participantes: tresAtivos,
    snapshot: null,
  });
  assert.equal(resumo.statusPortal, "concluida");
  assert.equal(resumo.relatorioDisponivel, false);
  assert.equal(resumo.categoriasAtencao.length, 0);
  assert.equal(estadoTimelinePortal(resumo, "resultados"), "atual");
  assert.equal(estadoTimelinePortal(resumo, "pesquisa"), "concluida");
});

run("5. campanha encerrada com snapshot → resultados_disponiveis", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c5", status: "encerrada" }),
    participantes: [
      { nome_completo: "Ana Souza", status: "respondido" },
      { nome_completo: "Bruno Lima", status: "respondido" },
      { nome_completo: "Carla Dias", status: "respondido" },
    ],
    snapshot: snapshotFonte(),
  });
  assert.equal(resumo.statusPortal, "resultados_disponiveis");
  assert.equal(resumo.relatorioDisponivel, true);
  assert.equal(resumo.relatorioGeradoEm, "2026-08-19T14:00:00.000Z");
  assert.equal(resumo.categoriasFavoraveis.length, 1);
  assert.equal(
    resumo.categoriasFavoraveis[0]?.label,
    "Situação Favorável"
  );
  assert.equal(resumo.categoriasAtencao.length, 1);
  assert.equal(resumo.categoriasDesfavoraveis.length, 1);
  assert.equal(resumo.pontosAtencao.length, 2);
  assert.equal(resumo.pontosAtencao[0]?.nome, "Insegurança no trabalho");
  assert.equal(resumo.pontosAtencao[0]?.label, "Situação Desfavorável");
  assert.equal(resumo.pontosAtencao[1]?.nome, "Exigências quantitativas");
  assert.equal(estadoTimelinePortal(resumo, "resultados"), "atual");
  assert.equal(estadoTimelinePortal(resumo, "pesquisa"), "concluida");
  assert.equal(estadoTimelinePortal(resumo, "plano_acao"), "proxima");
  assert.equal(estadoTimelinePortal(resumo, "concluido"), "futura");
});

run("5b. campanha aberta 100% com relatório → resultados, não pesquisa", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c5b", status: "aberta" }),
    participantes: [
      { nome_completo: "Ana Souza", status: "respondido" },
      { nome_completo: "Bruno Lima", status: "respondido" },
    ],
    snapshot: snapshotFonte(),
  });
  assert.equal(resumo.statusPortal, "resultados_disponiveis");
  assert.equal(resumo.relatorioDisponivel, true);
  assert.equal(resumo.pendentes, 0);
  assert.equal(resumo.participacaoPercentual, 100);
  assert.equal(estadoTimelinePortal(resumo, "pesquisa"), "concluida");
  assert.equal(estadoTimelinePortal(resumo, "resultados"), "atual");
  assert.equal(estadoTimelinePortal(resumo, "plano_acao"), "proxima");
});

run("5c. logo da campanha entra no DTO sem cadastro paralelo", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c5c", status: "aberta" }),
    participantes: [{ nome_completo: "Ana Souza", status: "respondido" }],
    snapshot: null,
    logoUrl: "https://storage.example/logo-campanha.png",
  });
  assert.equal(resumo.logoUrl, "https://storage.example/logo-campanha.png");
});

run("6. participante iniciado = pendente", () => {
  assert.equal(mapParticipacaoPortal("iniciado"), "pendente");
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c6", status: "aberta" }),
    participantes: [{ nome_completo: "Carla Dias", status: "iniciado" }],
    snapshot: null,
  });
  assert.deepEqual(resumo.participantes, [
    { nome: "Carla Dias", participacao: "pendente" },
  ]);
  assert.equal(resumo.pendentes, 1);
  assert.equal(resumo.respondidos, 0);
});

run("7. respondido = concluído", () => {
  assert.equal(mapParticipacaoPortal("respondido"), "concluida");
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c7", status: "aberta" }),
    participantes: [{ nome_completo: "Ana Souza", status: "respondido" }],
    snapshot: null,
  });
  assert.deepEqual(resumo.participantes, [
    { nome: "Ana Souza", participacao: "concluida" },
  ]);
});

run("8. removido / invalidado não aparece", () => {
  assert.equal(
    participanteAtivoNoPortal({ status: "removido", removido_em: null }),
    false
  );
  assert.equal(
    participanteAtivoNoPortal({
      status: "pendente",
      removido_em: "2026-08-10T00:00:00.000Z",
    }),
    false
  );
  assert.equal(
    participanteAtivoNoPortal({ status: "invalidado", removido_em: null }),
    false
  );
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c8", status: "aberta" }),
    participantes: [
      { nome_completo: "Ana Souza", status: "respondido" },
      { nome_completo: "Removido", status: "removido" },
      {
        nome_completo: "Soft Delete",
        status: "pendente",
        removido_em: "2026-08-10T00:00:00.000Z",
      },
      { nome_completo: "Invalidado", status: "invalidado" },
    ],
    snapshot: null,
  });
  assert.equal(resumo.cadastrados, 1);
  assert.deepEqual(
    resumo.participantes.map((p) => p.nome),
    ["Ana Souza"]
  );
});

run("9. DTO sem CPF / nascimento / código / email", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c9", status: "aberta" }),
    participantes: tresAtivos,
    snapshot: null,
  });
  const json = JSON.stringify(resumo);
  assert.equal(dtoContemCampoProibido(resumo), null);
  assert.doesNotMatch(json, /cpf/i);
  assert.doesNotMatch(json, /data_nascimento/);
  assert.doesNotMatch(json, /codigo_acesso/);
  assert.doesNotMatch(json, /"email"/);
  for (const p of resumo.participantes) {
    assert.deepEqual(Object.keys(p).sort(), ["nome", "participacao"]);
  }
});

run("10. resultado_json bruto não sai da API/DTO", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: "c10", status: "encerrada" }),
    participantes: [{ nome_completo: "Ana Souza", status: "respondido" }],
    snapshot: snapshotFonte(),
  });
  assert.equal(dtoContemCampoProibido(resumo), null);
  const json = JSON.stringify(resumo);
  assert.doesNotMatch(json, /resultado_json/);
  assert.doesNotMatch(json, /codigoPublico/);
  assert.doesNotMatch(json, /ABC123/);
  assert.doesNotMatch(json, /alternativa_id/);
});

run("11. sem campanha", () => {
  const resumo = montarPortalResumo({
    campanha: null,
    participantes: tresAtivos,
    snapshot: snapshotFonte(),
  });
  assert.deepEqual(resumo, portalResumoVazio());
  assert.equal(resumo.statusPortal, "sem_avaliacao");
});

run("12. variável DEV ausente / inválida", () => {
  assert.equal(resolvePortalDevClienteId({}), null);
  assert.equal(
    resolvePortalDevClienteId({ [PORTAL_DEV_CLIENTE_ID_ENV]: "" }),
    null
  );
  assert.equal(
    resolvePortalDevClienteId({ [PORTAL_DEV_CLIENTE_ID_ENV]: "nao-e-uuid" }),
    null
  );
  const uuid = "11111111-1111-4111-8111-111111111111";
  assert.equal(
    resolvePortalDevClienteId({ [PORTAL_DEV_CLIENTE_ID_ENV]: uuid }),
    uuid
  );
});

run("campanha atual: exclui cancelada e prefere aberta", () => {
  const escolhida = escolherCampanhaAtualPortal([
    campanha({
      id: "old-encerrada",
      status: "encerrada",
      created_at: "2026-01-01T00:00:00.000Z",
    }),
    campanha({
      id: "cancelada",
      status: "cancelada",
      created_at: "2026-08-01T00:00:00.000Z",
    }),
    campanha({
      id: "aberta-atual",
      status: "aberta",
      created_at: "2026-07-01T00:00:00.000Z",
    }),
  ]);
  assert.equal(escolhida?.id, "aberta-atual");
});

run("API preview exige staff e valida cliente_id", () => {
  const api = readFileSync(
    join(root, "app/api/portal/home/route.ts"),
    "utf8"
  );
  assert.match(api, /requirePortalStaffUser/);
  assert.match(api, /resolverClienteIdPortalPreview/);
  assert.match(api, /cliente_id/);
  assert.match(api, /carregarPortalHome/);
  assert.doesNotMatch(api, /PORTAL_DEV_CLIENTE_ID(?!_ENV)/);
});

run("serviço não consulta respostas/sessão/vínculo", () => {
  const svc = readFileSync(
    join(root, "services/portal-home.server.ts"),
    "utf8"
  );
  assert.doesNotMatch(svc, /riscos_avaliacao_respostas/);
  assert.doesNotMatch(svc, /riscos_avaliacao_sessoes/);
  assert.doesNotMatch(svc, /riscos_avaliacao_vinculos/);
  assert.match(svc, /nome_completo, status, removido_em/);
  assert.match(svc, /id, cliente_id, empresa_nome, status, data_inicio/);
  assert.match(svc, /logo_storage_path/);
  assert.match(svc, /resolverUrlLogoCampanhaAdmin/);
  assert.match(svc, /\.eq\("campanha_id", campanha\.id\)/);
  assert.doesNotMatch(svc, /codigo_publico/);
  assert.doesNotMatch(svc, /codigo_acesso/);
  assert.doesNotMatch(svc, /\bcpf\b/);
  assert.doesNotMatch(svc, /data_nascimento/);
});

run("menu admin tem atalho para /portal em Gestão Comercial", () => {
  const comercial = NAV_SECTIONS.find((s) => s.title === "Gestão Comercial");
  assert.ok(comercial);
  const atalho = comercial!.items.find((i) => i.href === "/portal");
  assert.equal(atalho?.label, "Portal do Cliente");
});

run("staff admin e operacional acessam /portal", () => {
  assert.equal(canAccessPath("admin", "/portal"), true);
  assert.equal(canAccessPath("operacional", "/portal"), true);
});

run("UUID inválido na request não cai no fallback de env", () => {
  const envId = "11111111-1111-4111-8111-111111111111";
  const invalid = resolverClienteIdPortalPreview({
    requestedClienteId: "nao-e-uuid",
    envClienteId: envId,
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.motivo, "uuid_invalido");

  const fromEnv = resolverClienteIdPortalPreview({
    requestedClienteId: "",
    envClienteId: envId,
  });
  assert.equal(fromEnv.ok, true);
  if (fromEnv.ok) {
    assert.equal(fromEnv.clienteId, envId);
    assert.equal(fromEnv.origem, "env");
  }

  const fromRequest = resolverClienteIdPortalPreview({
    requestedClienteId: "22222222-2222-4222-8222-222222222222",
    envClienteId: envId,
  });
  assert.equal(fromRequest.ok, true);
  if (fromRequest.ok) {
    assert.equal(fromRequest.clienteId, "22222222-2222-4222-8222-222222222222");
    assert.equal(fromRequest.origem, "request");
  }

  const none = resolverClienteIdPortalPreview({
    requestedClienteId: "",
    envClienteId: "",
  });
  assert.equal(none.ok, true);
  if (none.ok) {
    assert.equal(none.clienteId, null);
    assert.equal(none.origem, "none");
  }
});

run("consolidar empresas: só campanha elegível, um por cliente", () => {
  const navarro = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const al = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const soCancelada = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const empresas = consolidarEmpresasPortalPreview(
    [
      {
        cliente_id: navarro,
        empresa_nome: "Navarro campanha",
        status: "aberta",
      },
      {
        cliente_id: navarro,
        empresa_nome: "Navarro outra",
        status: "encerrada",
      },
      {
        cliente_id: al,
        empresa_nome: "AL campanha",
        status: "em_preparacao",
      },
      {
        cliente_id: soCancelada,
        empresa_nome: "Só cancelada",
        status: "cancelada",
      },
    ],
    [
      { id: navarro, nome: "NAVARRO ENGENHARIA" },
      { id: al, nome: "AL ASSESSORIA" },
    ]
  );
  assert.deepEqual(
    empresas.map((e) => e.nome),
    ["AL ASSESSORIA", "NAVARRO ENGENHARIA"]
  );
  assert.equal(empresas.length, 2);
});

run("troca de empresa não mistura dados", () => {
  const a = montarPortalResumo({
    campanha: campanha({
      id: "camp-a",
      status: "aberta",
      empresa_nome: "NAVARRO ENGENHARIA",
    }),
    participantes: [{ nome_completo: "Ana Souza", status: "respondido" }],
    snapshot: null,
  });
  const b = montarPortalResumo({
    campanha: campanha({
      id: "camp-b",
      status: "em_preparacao",
      empresa_nome: "ULTRAMED MEDICINA OCUPACIONAL",
    }),
    participantes: [
      { nome_completo: "Bruno Lima", status: "pendente" },
      { nome_completo: "Carla Dias", status: "pendente" },
    ],
    snapshot: null,
  });
  assert.equal(a.empresaNome, "NAVARRO ENGENHARIA");
  assert.equal(a.campanhaId, "camp-a");
  assert.equal(a.respondidos, 1);
  assert.equal(b.empresaNome, "ULTRAMED MEDICINA OCUPACIONAL");
  assert.equal(b.campanhaId, "camp-b");
  assert.equal(b.respondidos, 0);
  assert.equal(b.cadastrados, 2);
  assert.notEqual(a.campanhaId, b.campanhaId);
});

run("somente staff Navarro no preview", () => {
  assert.equal(isPerfilStaffNavarro("admin"), true);
  assert.equal(isPerfilStaffNavarro("operacional"), true);
  assert.equal(isPerfilStaffNavarro("admin", false), false);
  assert.equal(isPerfilStaffNavarro("cliente"), false);
  assert.equal(isPerfilStaffNavarro(null), false);
});

run("middleware não deixa /portal público", () => {
  const mw = readFileSync(join(root, "middleware.ts"), "utf8");
  assert.match(mw, /PUBLIC_PATHS = new Set\(\["\/login", "\/sem-permissao"\]\)/);
  assert.doesNotMatch(mw, /pathname === "\/portal"/);
  assert.doesNotMatch(mw, /pathname.startsWith\("\/api\/portal/);
  assert.doesNotMatch(mw, /pathname.startsWith\("\/portal/);
});

run("APIs do portal exigem sessão staff", () => {
  const home = readFileSync(
    join(root, "app/api/portal/home/route.ts"),
    "utf8"
  );
  const empresas = readFileSync(
    join(root, "app/api/portal/empresas/route.ts"),
    "utf8"
  );
  const staff = readFileSync(
    join(root, "services/portal-staff.server.ts"),
    "utf8"
  );
  const page = readFileSync(join(root, "app/portal/page.tsx"), "utf8");
  const ui = readFileSync(
    join(root, "components/portal-cliente/PortalHome.tsx"),
    "utf8"
  );
  const avaliacao = readFileSync(
    join(root, "components/portal-cliente/PortalAvaliacaoRiscos.tsx"),
    "utf8"
  );
  const identidade = readFileSync(
    join(root, "components/portal-cliente/PortalEmpresaIdentidade.tsx"),
    "utf8"
  );
  const modulos = readFileSync(
    join(root, "components/portal-cliente/PortalModulosSst.tsx"),
    "utf8"
  );
  const logoServer = readFileSync(
    join(root, "services/riscos-campanha-logo.server.ts"),
    "utf8"
  );
  assert.match(staff, /is_staff_user/);
  assert.match(staff, /isPerfilStaffNavarro/);
  assert.match(home, /requirePortalStaffUser/);
  assert.match(empresas, /requirePortalStaffUser/);
  assert.match(page, /PerfilRouteGuard/);
  assert.match(page, /AppShell/);
  assert.match(ui, /Pré-visualização interna|PORTAL_PREVIEW_INTERNO_LABEL/);
  assert.match(ui, /Visualizar portal de/);
  assert.match(modulos, /Ver avaliação/);
  assert.match(modulos, /Em preparação/);
  assert.match(identidade, /object-contain/);
  assert.match(identidade, /iniciaisEmpresa/);
  assert.match(avaliacao, /RiscosRelatorioViewerModal/);
  assert.match(avaliacao, /buscarRelatorioCampanha/);
  assert.match(avaliacao, /campanha_id !== campanhaId/);
  assert.match(avaliacao, /Salvar em PDF/);
  assert.match(avaliacao, /Relatório ainda não disponível/);
  assert.match(logoServer, /RISCOS_LISTA_PRESENCA_BUCKET/);
  assert.match(logoServer, /ORCAMENTO_ONBOARDING_BUCKET/);
});

console.log("test-portal-home: OK");
