/**
 * Confirmação de envio do relatório de Riscos — progresso, grandfather e portal.
 * Executar: npx tsx scripts/test-riscos-relatorio-envio.ts
 */
import assert from "node:assert/strict";
import { RISCOS_CAMPANHA_ORIGEM } from "../lib/riscos-campanha-origem";
import {
  RISCOS_RELATORIO_ENVIO_CONFIRMACAO_OBRIGATORIA_DESDE,
  isRelatorioEnvioEfetivamenteConfirmado,
  isRelatorioEnvioExplicitamenteConfirmado,
  isRelatorioEnvioGrandfatherConcluido,
  relatorioLiberadoAoClientePortal,
} from "../lib/riscos-relatorio-envio";
import {
  calcularProgressoEtapasRiscos,
  classificarStatusListagemRiscos,
  filterRiscosPsicossociaisProcessosPorStatus,
  type RiscosPsicossociaisProcesso,
} from "../lib/riscos-psicossociais";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const baseOrcamento = {
  origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
  laudosSstConcluido: true,
  listaPresencaConcluida: true,
  quantidadePrevista: 5,
  participantesCadastrados: 5,
  participantesRespondidos: 5,
  campanhaStatus: "aberta" as const,
};

run("constante de corte = 01/09/2026 00:00 São Paulo (UTC)", () => {
  assert.equal(
    RISCOS_RELATORIO_ENVIO_CONFIRMACAO_OBRIGATORIA_DESDE,
    "2026-09-01T03:00:00.000Z"
  );
});

/** 31/08/2026 23:59 em São Paulo (UTC-3). */
const GERADO_31_AGO_2359_SP = "2026-09-01T02:59:00.000Z";
/** 01/09/2026 00:00 em São Paulo (UTC-3) — início da regra nova. */
const GERADO_01_SET_0000_SP = "2026-09-01T03:00:00.000Z";

run("grandfather: 31/08/2026 23:59 São Paulo permanece concluído", () => {
  assert.equal(
    isRelatorioEnvioGrandfatherConcluido({
      relatorioGerado: true,
      relatorioGeradoEm: GERADO_31_AGO_2359_SP,
    }),
    true
  );
  assert.equal(
    isRelatorioEnvioEfetivamenteConfirmado({
      relatorioGerado: true,
      relatorioGeradoEm: GERADO_31_AGO_2359_SP,
      relatorioEnviadoEm: null,
    }),
    true
  );
  const prog = calcularProgressoEtapasRiscos({
    ...baseOrcamento,
    relatorioGerado: true,
    relatorioGeradoEm: GERADO_31_AGO_2359_SP,
    relatorioEnviadoEm: null,
  });
  assert.equal(prog.status, "concluido");
  assert.equal(prog.etapaAtual, "finalizado");
  assert.equal(
    relatorioLiberadoAoClientePortal({
      temSnapshot: true,
      relatorioGeradoEm: GERADO_31_AGO_2359_SP,
      relatorioEnviadoEm: null,
    }),
    true
  );
});

run("pós-corte: 01/09/2026 00:00 São Paulo exige confirmação de envio", () => {
  assert.equal(
    isRelatorioEnvioGrandfatherConcluido({
      relatorioGerado: true,
      relatorioGeradoEm: GERADO_01_SET_0000_SP,
    }),
    false
  );
  assert.equal(
    isRelatorioEnvioEfetivamenteConfirmado({
      relatorioGerado: true,
      relatorioGeradoEm: GERADO_01_SET_0000_SP,
      relatorioEnviadoEm: null,
    }),
    false
  );
  const prog = calcularProgressoEtapasRiscos({
    ...baseOrcamento,
    relatorioGerado: true,
    relatorioGeradoEm: GERADO_01_SET_0000_SP,
    relatorioEnviadoEm: null,
  });
  assert.equal(prog.etapaAtual, "relatorio_gerado");
  assert.equal(prog.status, "em_andamento");
  assert.equal(
    relatorioLiberadoAoClientePortal({
      temSnapshot: true,
      relatorioGeradoEm: GERADO_01_SET_0000_SP,
      relatorioEnviadoEm: null,
    }),
    false
  );
});

run("Cenário A — orçamento: gerar → 6/7; confirmar → 7/7", () => {
  const antes = calcularProgressoEtapasRiscos({
    ...baseOrcamento,
    relatorioGerado: false,
  });
  assert.equal(antes.etapaAtual, "gerar_relatorio");
  assert.equal(antes.etapasConcluidas, 5);
  assert.equal(antes.totalEtapas, 7);

  const gerado = calcularProgressoEtapasRiscos({
    ...baseOrcamento,
    relatorioGerado: true,
    relatorioGeradoEm: "2026-09-02T10:00:00.000Z",
    relatorioEnviadoEm: null,
  });
  assert.equal(gerado.etapaAtual, "relatorio_gerado");
  assert.equal(gerado.etapasConcluidas, 6);
  assert.equal(gerado.status, "em_andamento");

  const confirmado = calcularProgressoEtapasRiscos({
    ...baseOrcamento,
    relatorioGerado: true,
    relatorioGeradoEm: "2026-09-02T10:00:00.000Z",
    relatorioEnviadoEm: "2026-09-02T11:00:00.000Z",
  });
  assert.equal(confirmado.etapaAtual, "finalizado");
  assert.equal(confirmado.etapasConcluidas, 7);
  assert.equal(confirmado.progressoPercentual, 100);
  assert.equal(confirmado.status, "concluido");
});

run("Cenário B — manual: 4/6 → 5/6 → 6/6", () => {
  const manual = {
    origem: RISCOS_CAMPANHA_ORIGEM.manual_cliente,
    laudosSstConcluido: true,
    listaPresencaConcluida: true,
    quantidadePrevista: 5,
    participantesCadastrados: 5,
    participantesRespondidos: 5,
    campanhaStatus: "aberta" as const,
  };
  const antes = calcularProgressoEtapasRiscos({
    ...manual,
    relatorioGerado: false,
  });
  assert.equal(antes.etapasConcluidas, 4);
  assert.equal(antes.totalEtapas, 6);

  const gerado = calcularProgressoEtapasRiscos({
    ...manual,
    relatorioGerado: true,
    relatorioGeradoEm: "2026-09-02T10:00:00.000Z",
  });
  assert.equal(gerado.etapasConcluidas, 5);
  assert.equal(gerado.etapaAtual, "relatorio_gerado");

  const confirmado = calcularProgressoEtapasRiscos({
    ...manual,
    relatorioGerado: true,
    relatorioGeradoEm: "2026-09-02T10:00:00.000Z",
    relatorioEnviadoEm: "2026-09-02T12:00:00.000Z",
  });
  assert.equal(confirmado.etapasConcluidas, 6);
  assert.equal(confirmado.status, "concluido");
});

run("Cenário G — grandfather mantém conclusão histórica", () => {
  assert.equal(
    isRelatorioEnvioGrandfatherConcluido({
      relatorioGerado: true,
      relatorioGeradoEm: "2026-08-30T10:00:00.000Z",
    }),
    true
  );
  const prog = calcularProgressoEtapasRiscos({
    ...baseOrcamento,
    relatorioGerado: true,
    relatorioGeradoEm: "2026-08-30T10:00:00.000Z",
    relatorioEnviadoEm: null,
  });
  assert.equal(prog.status, "concluido");
  assert.equal(prog.etapaAtual, "finalizado");
});

run("Cenário H — regenerado após corte exige confirmação", () => {
  const prog = calcularProgressoEtapasRiscos({
    ...baseOrcamento,
    relatorioGerado: true,
    relatorioGeradoEm: "2026-09-02T15:00:00.000Z",
    relatorioEnviadoEm: null,
  });
  assert.equal(prog.etapaAtual, "relatorio_gerado");
  assert.equal(prog.status, "em_andamento");
});

run("Cenário I — portal só libera com envio confirmado ou grandfather", () => {
  assert.equal(
    relatorioLiberadoAoClientePortal({
      temSnapshot: true,
      relatorioGeradoEm: "2026-09-02T10:00:00.000Z",
      relatorioEnviadoEm: null,
    }),
    false
  );
  assert.equal(
    relatorioLiberadoAoClientePortal({
      temSnapshot: true,
      relatorioGeradoEm: "2026-09-02T10:00:00.000Z",
      relatorioEnviadoEm: "2026-09-02T11:00:00.000Z",
    }),
    true
  );
  assert.equal(
    relatorioLiberadoAoClientePortal({
      temSnapshot: true,
      relatorioGeradoEm: "2026-08-20T10:00:00.000Z",
      relatorioEnviadoEm: null,
    }),
    true
  );
});

run("Cenário J — classificação exclusiva para filtros", () => {
  const processo = (patch: Partial<RiscosPsicossociaisProcesso>) =>
    ({
      status: "em_andamento",
      etapaAtual: "aguardando_respostas",
      etapasConcluidas: 4,
      totalEtapas: 7,
      progressoPercentual: 57,
      relatorioGerado: false,
      ...patch,
    }) as RiscosPsicossociaisProcesso;

  const relGerado = processo({
    etapaAtual: "relatorio_gerado",
    relatorioGerado: true,
    etapasConcluidas: 6,
  });
  assert.equal(classificarStatusListagemRiscos(relGerado), "relatorio_gerado");

  const concluido = processo({
    status: "concluido",
    etapaAtual: "finalizado",
    relatorioGerado: true,
    etapasConcluidas: 7,
    progressoPercentual: 100,
  });
  assert.equal(classificarStatusListagemRiscos(concluido), "concluido");

  const filtrados = filterRiscosPsicossociaisProcessosPorStatus(
    [relGerado, concluido],
    ["relatorio_gerado", "concluido"]
  );
  assert.equal(filtrados.length, 2);
});

run("envio explícito vs efetivo", () => {
  assert.equal(
    isRelatorioEnvioExplicitamenteConfirmado({
      relatorioEnviadoEm: "2026-09-01T12:00:00Z",
    }),
    true
  );
  assert.equal(
    isRelatorioEnvioEfetivamenteConfirmado({
      relatorioGerado: true,
      relatorioGeradoEm: "2026-09-02T10:00:00Z",
      relatorioEnviadoEm: null,
    }),
    false
  );
});

console.log("\nTodos os testes de envio do relatório passaram.");
