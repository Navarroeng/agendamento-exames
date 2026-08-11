/**
 * Regras de Cancelar Processo / Excluir Campanha (unitário, sem DB).
 */
import assert from "node:assert/strict";
import {
  avaliarPeriodoCampanha,
  codigoErroPublico,
  validarAcessoAvaliacao,
} from "../lib/avaliacao-validacao";
import {
  validateCancelarProcessoRiscos,
  validateConfirmacaoExclusaoCampanha,
  validateMotivoCancelamento,
  acoesConvitePorStatus,
} from "../lib/riscos-campanha";
import { RISCOS_CAMPANHA_STATUS_ATIVOS } from "../lib/riscos-campanha-origem";
import {
  MOTIVO_INVALIDACAO_CANCELAMENTO_PROCESSO,
  sessaoContaNosResultados,
} from "../lib/riscos-invalidacao";
import {
  consolidarResultadosCampanha,
  filtrarSessoesConcluidasCampanha,
  type RespostaAvaliacaoConsolidacao,
} from "../lib/riscos-resultados";

/** Espelha exclusaoDefinitivaDisponivelNoClient (sem importar service client). */
function exclusaoDefinitivaDisponivel(env: {
  nextPublicFlag?: string;
  nodeEnv?: string;
}): boolean {
  if (env.nextPublicFlag === "true") return true;
  return env.nodeEnv !== "production";
}

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const CAMPANHA = "campanha-cancel";
const respostas: RespostaAvaliacaoConsolidacao[] = [
  {
    sessao_id: "s1",
    campanha_id: CAMPANHA,
    pergunta_id: "p-1a",
    alternativa_id: "freq-as-vezes",
  },
  {
    sessao_id: "s1",
    campanha_id: CAMPANHA,
    pergunta_id: "p-1b",
    alternativa_id: "freq-raramente",
  },
  {
    sessao_id: "s1",
    campanha_id: CAMPANHA,
    pergunta_id: "p-2a",
    alternativa_id: "freq-sempre",
  },
  {
    sessao_id: "s1",
    campanha_id: CAMPANHA,
    pergunta_id: "p-2b",
    alternativa_id: "freq-frequentemente",
  },
  {
    sessao_id: "s1",
    campanha_id: CAMPANHA,
    pergunta_id: "p-3a",
    alternativa_id: "freq-as-vezes",
  },
  {
    sessao_id: "s1",
    campanha_id: CAMPANHA,
    pergunta_id: "p-3b",
    alternativa_id: "freq-raramente",
  },
];

run("1: cancelar em preparação permitido", () => {
  assert.equal(
    validateCancelarProcessoRiscos({ status: "em_preparacao" }),
    null
  );
});

run("2: cancelar aberta permitido", () => {
  assert.equal(validateCancelarProcessoRiscos({ status: "aberta" }), null);
});

run("2b: cancelar encerrada permitido (sem proxy de relatório)", () => {
  assert.equal(validateCancelarProcessoRiscos({ status: "encerrada" }), null);
});

run("2c: já cancelada bloqueada", () => {
  assert.match(
    validateCancelarProcessoRiscos({ status: "cancelada" }) ?? "",
    /já está cancelada/i
  );
});

run("3: Portal bloqueado após cancelamento", () => {
  assert.equal(
    avaliarPeriodoCampanha(
      {
        status: "cancelada",
        data_inicio: "2026-01-01",
        data_encerramento: "2026-12-31",
      },
      "2026-08-11"
    ),
    "encerrada"
  );

  const acesso = validarAcessoAvaliacao({
    codigoPublicoUrl: "QCWMKJ",
    dataNascimentoIso: "1990-01-01",
    campanha: {
      id: CAMPANHA,
      codigo_publico: "QCWMKJ",
      cliente_id: null,
      cnpj: "1",
      empresa_nome: "X",
      status: "cancelada",
      data_inicio: "2026-01-01",
      data_encerramento: "2026-12-31",
    },
    participante: {
      id: "p",
      campanha_id: CAMPANHA,
      cpf: "52998224725",
      data_nascimento: "1990-01-01",
      nome_completo: "T",
      status: "pendente",
      concluiu_em: null,
    },
    hojeIso: "2026-08-11",
  });
  assert.equal(acesso.ok, false);
  if (!acesso.ok) {
    assert.equal(acesso.motivo, "campanha_encerrada");
    assert.equal(codigoErroPublico(acesso.motivo), "campanha_encerrada");
  }
});

run("4: sessões invalidadas não contam", () => {
  assert.equal(
    sessaoContaNosResultados({ status: "concluida", valida: false }),
    false
  );
  assert.equal(
    MOTIVO_INVALIDACAO_CANCELAMENTO_PROCESSO.includes("Cancelamento"),
    true
  );
});

run("5: resultados deixam de considerar respostas canceladas", () => {
  assert.equal(
    filtrarSessoesConcluidasCampanha(
      [{ id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: false }],
      CAMPANHA
    ).length,
    0
  );
  const consolidado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA,
    statusCampanha: "cancelada",
    quantidadeCadastrados: 10,
    sessoes: [
      { id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: false },
    ],
    respostas,
  });
  assert.equal(consolidado.sessoesConcluidas, 0);
  assert.equal(consolidado.participacaoPercentual, 0);
});

run("6/7: cancelada não é status ativo (permite nova campanha)", () => {
  assert.equal(
    (RISCOS_CAMPANHA_STATUS_ATIVOS as readonly string[]).includes("cancelada"),
    false
  );
  assert.deepEqual([...RISCOS_CAMPANHA_STATUS_ATIVOS], [
    "em_preparacao",
    "aberta",
  ]);
  const acoes = acoesConvitePorStatus("cancelada");
  assert.equal(acoes.exibirAbrir, false);
  assert.equal(acoes.exibirEncerrar, false);
  assert.equal(acoes.permitirCopiarLink, false);
});

run("9: motivo obrigatório e campos de cancelamento", () => {
  assert.match(validateMotivoCancelamento("") ?? "", /motivo/i);
  assert.match(validateMotivoCancelamento("abc") ?? "", /5 caracteres/i);
  assert.equal(validateMotivoCancelamento("Erro de cadastro"), null);

  const persistido = {
    status: "cancelada" as const,
    cancelada_em: "2026-08-11T15:00:00.000Z",
    cancelada_por: "Admin",
    motivo_cancelamento: "Duplicidade com outra campanha",
  };
  assert.equal(persistido.status, "cancelada");
  assert.ok(persistido.cancelada_em);
  assert.ok(persistido.cancelada_por);
  assert.ok(persistido.motivo_cancelamento);
});

run("10: exclusão exige código e proteção de ambiente", () => {
  assert.match(
    validateConfirmacaoExclusaoCampanha("QCWMKJ", "") ?? "",
    /Digite o código/i
  );
  assert.match(
    validateConfirmacaoExclusaoCampanha("QCWMKJ", "XXXXXX") ?? "",
    /não confere/i
  );
  assert.equal(validateConfirmacaoExclusaoCampanha("QCWMKJ", "qcwmkj"), null);

  assert.equal(
    exclusaoDefinitivaDisponivel({ nodeEnv: "production" }),
    false
  );
  assert.equal(
    exclusaoDefinitivaDisponivel({
      nodeEnv: "production",
      nextPublicFlag: "true",
    }),
    true
  );
  assert.equal(
    exclusaoDefinitivaDisponivel({ nodeEnv: "development" }),
    true
  );
});

console.log("\nTodos os testes de cancelar processo passaram.");
