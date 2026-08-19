/**
 * Home do Portal do Cliente — mapeamento, privacidade e DTO.
 * Executar: npx tsx scripts/test-portal-home.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PORTAL_DEV_CLIENTE_ID_ENV,
  dtoContemCampoProibido,
  escolherCampanhaAtualPortal,
  estadoTimelinePortal,
  mapParticipacaoPortal,
  montarPortalResumo,
  participanteAtivoNoPortal,
  portalResumoVazio,
  resolvePortalDevClienteId,
  type PortalCampanhaFonte,
  type PortalParticipanteFonte,
  type PortalSnapshotFonte,
} from "../lib/portal-cliente";
import type { RiscosRelatorioResultadoJson } from "../lib/riscos-relatorio";
import { NAV_SECTIONS } from "../lib/constants";

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
  assert.equal(estadoTimelinePortal(resumo.statusPortal, "participantes"), "atual");
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
  assert.equal(estadoTimelinePortal(resumo.statusPortal, "pesquisa"), "atual");
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
  assert.equal(estadoTimelinePortal(resumo.statusPortal, "resultados"), "atual");
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
  assert.equal(resumo.categoriasAtencao.length, 1);
  assert.equal(resumo.categoriasDesfavoraveis.length, 1);
  assert.equal(resumo.pontosAtencao.length, 2);
  assert.equal(resumo.pontosAtencao[0]?.nome, "Exigências quantitativas");
  assert.equal(estadoTimelinePortal(resumo.statusPortal, "plano_acao"), "atual");
  assert.equal(estadoTimelinePortal(resumo.statusPortal, "resultados"), "concluida");
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

run("API não aceita cliente_id na query", () => {
  const api = readFileSync(
    join(root, "app/api/portal/home/route.ts"),
    "utf8"
  );
  assert.doesNotMatch(api, /searchParams/);
  assert.doesNotMatch(api, /cliente_id/);
  assert.match(api, /carregarPortalHome/);
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
  assert.match(svc, /id, empresa_nome, status, data_inicio/);
  assert.doesNotMatch(svc, /codigo_publico/);
  assert.doesNotMatch(svc, /codigo_acesso/);
  assert.doesNotMatch(svc, /cpf/);
  assert.doesNotMatch(svc, /data_nascimento/);
});

run("menu admin tem atalho para /portal em Gestão Comercial", () => {
  const comercial = NAV_SECTIONS.find((s) => s.title === "Gestão Comercial");
  assert.ok(comercial);
  const atalho = comercial!.items.find((i) => i.href === "/portal");
  assert.equal(atalho?.label, "Portal do Cliente");
});

console.log("test-portal-home: OK");
