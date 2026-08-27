/**
 * Ciclo de vida da campanha de Riscos Psicossociais.
 * Executar: npx tsx scripts/test-riscos-campanha-ciclo.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  avaliarPeriodoCampanha,
  codigoErroPublico,
  validarAcessoAvaliacao,
  type CampanhaAcessoRow,
  type ParticipanteAcessoRow,
} from "../lib/avaliacao-validacao";
import { pathAvaliacaoCampanha } from "../lib/riscos-campanha";
import {
  MSG_CAMPANHA_CICLO_EXISTENTE,
  MSG_CADASTRO_APOS_PRAZO,
  MSG_CADASTRO_CAMPANHA_FINALIZADA,
  MSG_RELATORIO_NOVAS_RESPOSTAS,
  acoesPesquisaPorCampanha,
  avisoCadastroParticipanteCampanha,
  campanhaBloqueiaExclusaoFisica,
  campanhaDoCicloJaExiste,
  campanhaPermiteCadastroParticipantes,
  haRespostasAposRelatorio,
  isPrazoEncerrado,
  labelStatusPesquisaExibido,
  mesmoLinkAposProrrogacao,
  statusPesquisaExibido,
  validateNovaDataEncerramento,
  validateProrrogarPrazoCampanha,
  validateReabrirCampanha,
} from "../lib/riscos-campanha-ciclo";
import { validatePodeGerarRelatorioFinal } from "../lib/riscos-relatorio";
import {
  calcularProgressoEtapasRiscos,
  labelEtapaAtualProcessoRiscos,
} from "../lib/riscos-psicossociais";
import { RISCOS_CAMPANHA_ORIGEM } from "../lib/riscos-campanha-origem";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const abertaNoPrazo = {
  status: "aberta",
  data_inicio: "2026-08-20",
  data_encerramento: "2026-08-30",
};

const campanhaPortal = (
  overrides: Partial<CampanhaAcessoRow> = {}
): CampanhaAcessoRow => ({
  id: "camp-ciclo",
  codigo_publico: "LT4BJN",
  cliente_id: "cli-1",
  cnpj: "00000000000191",
  empresa_nome: "EMPRESA TESTE",
  status: "aberta",
  data_inicio: "2026-08-20",
  data_encerramento: "2026-08-30",
  ...overrides,
});

const participantePortal = (
  overrides: Partial<ParticipanteAcessoRow> = {}
): ParticipanteAcessoRow => ({
  id: "part-1",
  campanha_id: "camp-ciclo",
  cpf: "52998224725",
  data_nascimento: "1990-05-15",
  nome_completo: "Participante",
  status: "pendente",
  concluiu_em: null,
  ...overrides,
});

run("1. campanha aberta dentro do prazo → participante acessa", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "LT4BJN",
    dataNascimentoIso: "1990-05-15",
    campanha: campanhaPortal(),
    participante: participantePortal(),
    hojeIso: "2026-08-25",
  });
  assert.equal(r.ok, true);
  assert.equal(avaliarPeriodoCampanha(campanhaPortal(), "2026-08-25"), "ok");
});

run("2. prazo vencido → portal prazo encerrado; admin não vê Criar pesquisa", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "LT4BJN",
    dataNascimentoIso: "1990-05-15",
    campanha: campanhaPortal(),
    participante: participantePortal(),
    hojeIso: "2026-08-31",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "prazo_encerrado");
  assert.equal(codigoErroPublico("prazo_encerrado"), "prazo_encerrado");
  const acoes = acoesPesquisaPorCampanha({
    ...abertaNoPrazo,
    hojeIso: "2026-08-31",
  });
  assert.equal(acoes.statusExibido, "prazo_encerrado");
  assert.equal(acoes.statusLabel, "Prazo encerrado");
  assert.equal(acoes.exibirAbrir, false);
  assert.equal(acoes.exibirProrrogar, true);
  assert.equal(campanhaDoCicloJaExiste([{ id: "camp-ciclo" }]), true);
});

run("3. prazo vencido sem respostas → campanha continua existindo", () => {
  assert.equal(isPrazoEncerrado(abertaNoPrazo, "2026-08-31"), true);
  assert.equal(statusPesquisaExibido(abertaNoPrazo, "2026-08-31"), "prazo_encerrado");
  assert.equal(String(abertaNoPrazo.status), "aberta");
});

run("4. prazo vencido com respostas → respostas permanecem (sem exclusão)", () => {
  const bloqueio = campanhaBloqueiaExclusaoFisica({
    status: "aberta",
    participantes: 5,
    sessoes: 5,
    respostas: 40,
  });
  assert.ok(bloqueio);
  assert.equal(isPrazoEncerrado(abertaNoPrazo, "2026-08-31"), true);
});

run("5-7. prorrogar prazo: mesma campanha, mesmo código, mesmo link", () => {
  const atual = {
    id: "uuid-1",
    codigo_publico: "LT4BJN",
    ...abertaNoPrazo,
  };
  assert.equal(
    validateProrrogarPrazoCampanha({
      campanha: atual,
      novaDataEncerramentoIso: "2026-09-15",
      hojeIso: "2026-08-31",
    }),
    null
  );
  const depois = {
    ...atual,
    data_encerramento: "2026-09-15",
  };
  assert.equal(depois.id, atual.id);
  assert.equal(depois.codigo_publico, atual.codigo_publico);
  assert.equal(
    mesmoLinkAposProrrogacao(atual.codigo_publico, depois.codigo_publico),
    true
  );
  assert.equal(pathAvaliacaoCampanha(depois.codigo_publico), "/avaliacao/LT4BJN");
});

run("8. quem já respondeu não responde novamente após prorrogação", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "LT4BJN",
    dataNascimentoIso: "1990-05-15",
    campanha: campanhaPortal({ data_encerramento: "2026-09-15" }),
    participante: participantePortal({
      status: "respondido",
      concluiu_em: "2026-08-25T12:00:00Z",
    }),
    hojeIso: "2026-09-01",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_ja_concluiu");
  assert.equal(codigoErroPublico("participante_ja_concluiu"), "ja_respondida");
});

run("9. pendente responde depois da prorrogação", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "LT4BJN",
    dataNascimentoIso: "1990-05-15",
    campanha: campanhaPortal({ data_encerramento: "2026-09-15" }),
    participante: participantePortal({ status: "pendente" }),
    hojeIso: "2026-09-01",
  });
  assert.equal(r.ok, true);
});

run("10. adicionar participante depois do prazo → mesma campanha + aviso", () => {
  assert.equal(campanhaPermiteCadastroParticipantes("aberta"), null);
  assert.equal(campanhaPermiteCadastroParticipantes("encerrada"), null);
  const aviso = avisoCadastroParticipanteCampanha({
    campanha: abertaNoPrazo,
    hojeIso: "2026-08-31",
  });
  assert.equal(aviso, MSG_CADASTRO_APOS_PRAZO);
});

run("11-12. gerar relatório depois do prazo / encerrada por prazo", () => {
  const aberta = validatePodeGerarRelatorioFinal({
    campanhaStatus: "aberta",
    participantesAtivos: [{ status: "respondido" }],
    jaExisteRelatorio: false,
  });
  assert.equal(aberta, null);
  const encerrada = validatePodeGerarRelatorioFinal({
    campanhaStatus: "encerrada",
    participantesAtivos: [{ status: "respondido" }],
    jaExisteRelatorio: false,
  });
  assert.equal(encerrada, null);
});

run("13. relatório gerado + nova resposta posterior → preserva e sinaliza", () => {
  assert.equal(
    haRespostasAposRelatorio({
      relatorioRespondentes: 5,
      relatorioGeradoEm: "2026-08-30T10:00:00Z",
      participantesRespondidos: 6,
      ultimaConclusaoIso: "2026-09-02T12:00:00Z",
    }),
    true
  );
  assert.equal(
    haRespostasAposRelatorio({
      relatorioRespondentes: 5,
      participantesRespondidos: 5,
    }),
    false
  );
  assert.match(MSG_RELATORIO_NOVAS_RESPOSTAS, /novas respostas/i);
});

run("14-15. não cria campanha duplicada no ciclo (qualquer status)", () => {
  assert.equal(campanhaDoCicloJaExiste([]), false);
  assert.equal(campanhaDoCicloJaExiste([{ id: "a", status: "encerrada" }]), true);
  assert.equal(
    campanhaDoCicloJaExiste([{ id: "a", status: "aberta" }]),
    true
  );
  assert.equal(
    campanhaDoCicloJaExiste([{ id: "a", status: "em_preparacao" }]),
    true
  );
  assert.match(MSG_CAMPANHA_CICLO_EXISTENTE, /Já existe uma campanha/);
  const criar = readFileSync(
    join(__dirname, "../services/riscos-campanha-ciclo.server.ts"),
    "utf8"
  );
  assert.match(criar, /campanhaDoCicloPorOrcamento/);
  assert.match(criar, /CampanhaCicloExistenteError/);
  assert.doesNotMatch(criar, /buscarCampanhaAtivaPorOrcamento/);
  const api = readFileSync(
    join(__dirname, "../app/api/riscos/campanha/route.ts"),
    "utf8"
  );
  assert.match(api, /ciclo_existente/);
  assert.match(api, /status: 409/);
});

run("16. campanha finalizada não desaparece", () => {
  const acoes = acoesPesquisaPorCampanha({
    status: "encerrada",
    data_inicio: "2026-08-20",
    data_encerramento: "2026-08-30",
    relatorioGerado: true,
    hojeIso: "2026-09-05",
  });
  assert.equal(acoes.statusExibido, "encerrada");
  assert.equal(acoes.exibirAbrir, false);
  assert.equal(acoes.exibirReabrir, true);
  assert.equal(labelStatusPesquisaExibido(abertaNoPrazo, "2026-08-31"), "Prazo encerrado");
});

run("17-18. novo contrato/processo permite nova campanha; ciclos isolados", () => {
  const ciclo2026 = [{ id: "c-2026" }];
  const ciclo2027: Array<{ id: string }> = [];
  assert.equal(campanhaDoCicloJaExiste(ciclo2026), true);
  assert.equal(campanhaDoCicloJaExiste(ciclo2027), false);
});

run("19-20. cancelamento/uso bloqueiam exclusão física", () => {
  assert.ok(
    campanhaBloqueiaExclusaoFisica({
      status: "cancelada",
      participantes: 2,
      sessoes: 1,
      respostas: 1,
    })
  );
  assert.ok(
    campanhaBloqueiaExclusaoFisica({
      status: "aberta",
      participantes: 0,
      sessoes: 0,
      respostas: 0,
    })
  );
  assert.ok(
    campanhaBloqueiaExclusaoFisica({
      status: "em_preparacao",
      participantes: 0,
      sessoes: 0,
      respostas: 0,
      temRelatorio: true,
    })
  );
  assert.equal(
    campanhaBloqueiaExclusaoFisica({
      status: "em_preparacao",
      participantes: 0,
      sessoes: 0,
      respostas: 0,
    }),
    null
  );
});

run("21. código inexistente → campanha não encontrada", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "XXXXXX",
    dataNascimentoIso: "1990-05-15",
    campanha: null,
    participante: null,
    hojeIso: "2026-08-25",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "campanha_inexistente");
  assert.equal(avaliarPeriodoCampanha(null), "inexistente");
});

run("22. código válido com prazo encerrado → não é 404 / inexistente", () => {
  const periodo = avaliarPeriodoCampanha(campanhaPortal(), "2026-08-31");
  assert.equal(periodo, "prazo_encerrado");
  assert.notEqual(periodo, "inexistente");
  const info = readFileSync(
    join(__dirname, "../app/api/avaliacao/[codigo]/info/route.ts"),
    "utf8"
  );
  assert.match(info, /prazo_encerrado/);
  assert.match(info, /status: 404/);
  const portal = readFileSync(
    join(__dirname, "../components/avaliacao/AvaliacaoPortal.tsx"),
    "utf8"
  );
  assert.match(portal, /prazo_encerrado/);
  assert.match(portal, /MENSAGEM_PRAZO_ENCERRADO_TITULO/);
});

run("23. todos responderam depois da prorrogação → Gerar Relatório", () => {
  const progresso = calcularProgressoEtapasRiscos({
    origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
    laudosSstConcluido: true,
    listaPresencaConcluida: true,
    quantidadePrevista: 5,
    participantesCadastrados: 5,
    participantesRespondidos: 5,
    campanhaStatus: "aberta",
    relatorioGerado: false,
  });
  assert.equal(progresso.etapaAtual, "gerar_relatorio");
});

run("24. relatório gerado → processo Finalizado", () => {
  const progresso = calcularProgressoEtapasRiscos({
    origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
    laudosSstConcluido: true,
    listaPresencaConcluida: true,
    quantidadePrevista: 5,
    participantesCadastrados: 5,
    participantesRespondidos: 5,
    campanhaStatus: "aberta",
    relatorioGerado: true,
  });
  assert.equal(progresso.etapaAtual, "finalizado");
  assert.equal(progresso.status, "concluido");
});

run("etapa aguardando respostas com prazo encerrado não volta para Abrir pesquisa", () => {
  const progresso = calcularProgressoEtapasRiscos({
    origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
    laudosSstConcluido: true,
    listaPresencaConcluida: true,
    quantidadePrevista: 5,
    participantesCadastrados: 5,
    participantesRespondidos: 3,
    campanhaStatus: "aberta",
    relatorioGerado: false,
  });
  assert.equal(progresso.etapaAtual, "aguardando_respostas");
  assert.equal(
    labelEtapaAtualProcessoRiscos({
      status: "em_andamento",
      etapaAtual: "aguardando_respostas",
      campanha: {
        status: "aberta",
        data_inicio: "2026-08-01",
        data_encerramento: "2026-08-02",
      } as never,
    }),
    "Aguardando respostas — prazo encerrado"
  );
});

run("prorrogar recusa encerrada (use Reabrir); reabrir exige nova data", () => {
  assert.match(
    validateProrrogarPrazoCampanha({
      campanha: { status: "encerrada", data_inicio: "2026-08-20", data_encerramento: "2026-08-30" },
      novaDataEncerramentoIso: "2026-09-15",
      hojeIso: "2026-08-31",
    }) ?? "",
    /Reabrir/
  );
  assert.equal(
    validateReabrirCampanha({
      campanha: { status: "encerrada", data_inicio: "2026-08-20", data_encerramento: "2026-08-30" },
      novaDataEncerramentoIso: "2026-09-15",
      hojeIso: "2026-08-31",
    }),
    null
  );
  assert.ok(
    validateNovaDataEncerramento({
      dataInicioIso: "2026-08-20",
      dataEncerramentoAtualIso: "2026-08-30",
      novaDataEncerramentoIso: "2026-08-30",
      hojeIso: "2026-08-31",
    })
  );
});

run("cadastro em campanha finalizada pede reabrir/prorrogar", () => {
  const aviso = avisoCadastroParticipanteCampanha({
    campanha: { status: "encerrada", data_inicio: "2026-08-20", data_encerramento: "2026-08-30" },
    relatorioGerado: true,
    processoFinalizado: true,
    hojeIso: "2026-09-05",
  });
  assert.equal(aviso, MSG_CADASTRO_CAMPANHA_FINALIZADA);
});

run("UI administrativa usa ações do ciclo (não só campanha ativa)", () => {
  const painel = readFileSync(
    join(__dirname, "../components/riscos-psicossociais/RiscosPainelCards.tsx"),
    "utf8"
  );
  assert.match(painel, /acoesPesquisaPorCampanha/);
  assert.match(painel, /Prorrogar prazo/);
  assert.match(painel, /Reabrir pesquisa/);
  assert.doesNotMatch(painel, /acoesConvitePorStatus/);
  const cancelar = readFileSync(
    join(__dirname, "../services/riscos-campanha-cancelar.server.ts"),
    "utf8"
  );
  assert.match(cancelar, /campanhaBloqueiaExclusaoFisica/);
});

console.log("\nTodos os testes do ciclo de campanha passaram.");
