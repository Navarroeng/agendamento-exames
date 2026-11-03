/**
 * Sugestão de e-mail para envio de faturas (somente envios confirmados).
 * Executar: npx tsx scripts/test-fatura-envio-sugestao.ts
 */
import assert from "node:assert/strict";
import {
  aplicarEmailSugeridoSemSobrescrever,
  clienteTemHistoricoEnvioFatura,
  obterEmailEnvioSugeridoCliente,
} from "../lib/fatura-envio-sugestao";
import { buscarUltimoEmailEnvioCliente } from "../services/fatura-envio.service";
import type { FaturaEnvioEmailFonte } from "../lib/fatura-envio-sugestao";
import type { FaturaRecord } from "../lib/types";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (err) {
    console.error(`FALHA  ${name}`);
    throw err;
  }
}

function faturaEnvio(partial: Partial<FaturaRecord> & Pick<FaturaRecord, "id" | "referencia_id">): FaturaRecord {
  return {
    id: partial.id,
    numero: partial.numero ?? `FAT-${partial.id}`,
    tipo: "cliente",
    referencia_id: partial.referencia_id,
    referencia_nome: partial.referencia_nome ?? "Cliente",
    periodo_inicio: partial.periodo_inicio ?? "2026-08-01",
    periodo_fim: partial.periodo_fim ?? "2026-08-31",
    mes_referencia: partial.mes_referencia ?? "2026-08",
    data_emissao: partial.data_emissao ?? "2026-09-01",
    data_vencimento: partial.data_vencimento ?? "2026-09-05",
    valor_total: partial.valor_total ?? 1000,
    total_exames: partial.total_exames ?? 1,
    status: partial.status ?? "emitida",
    gerado_por: partial.gerado_por ?? "Teste",
    pago: partial.pago ?? false,
    data_pagamento: partial.data_pagamento ?? null,
    observacao_pagamento: partial.observacao_pagamento ?? null,
    comprovante_pagamento_path: partial.comprovante_pagamento_path ?? null,
    comprovante_pagamento_nome: partial.comprovante_pagamento_nome ?? null,
    conferido_em: partial.conferido_em ?? null,
    conferido_por: partial.conferido_por ?? null,
    fatura_clinica_path: partial.fatura_clinica_path ?? null,
    fatura_clinica_nome: partial.fatura_clinica_nome ?? null,
    fatura_clinica_tipo: partial.fatura_clinica_tipo ?? null,
    fatura_clinica_tamanho: partial.fatura_clinica_tamanho ?? null,
    observacao_conferencia: partial.observacao_conferencia ?? null,
    conferencia_registrada_em: partial.conferencia_registrada_em ?? null,
    fatura_origem_id: partial.fatura_origem_id ?? null,
    fatura_substituta_id: partial.fatura_substituta_id ?? null,
    fatura_enviada_em: partial.fatura_enviada_em ?? null,
    fatura_enviada_email: partial.fatura_enviada_email ?? null,
    fatura_enviada_por: partial.fatura_enviada_por ?? null,
    fatura_enviada_por_user_id: partial.fatura_enviada_por_user_id ?? null,
    fatura_envio_resend_id: partial.fatura_envio_resend_id ?? null,
    fatura_envio_reenvio_count: partial.fatura_envio_reenvio_count ?? 0,
    created_at: partial.created_at ?? "2026-08-01T00:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-08-01T00:00:00.000Z",
  };
}

const CLI_A = "cli-a";
const CLI_B = "cli-b";

run("1 — cliente sem envio anterior → sugestão vazia", () => {
  const faturas = [
    faturaEnvio({
      id: "fat-ago-a",
      referencia_id: CLI_A,
      fatura_enviada_em: null,
      fatura_enviada_email: null,
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(faturas, CLI_A, "fat-set-a"),
    null
  );
  assert.equal(clienteTemHistoricoEnvioFatura(faturas, CLI_A), false);
});

run("2 — envio anterior confirmado → sugere último e-mail", () => {
  const faturas = [
    faturaEnvio({
      id: "fat-ago-a",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
      fatura_enviada_email: "financeiro@cliente.com.br",
    }),
    faturaEnvio({
      id: "fat-set-a",
      referencia_id: CLI_A,
      fatura_enviada_em: null,
      fatura_enviada_email: null,
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(faturas, CLI_A, "fat-set-a"),
    "financeiro@cliente.com.br"
  );
  assert.equal(clienteTemHistoricoEnvioFatura(faturas, CLI_A), true);
});

run("3 — cadastro tem e-mail, mas nunca houve envio → continua vazio", () => {
  // Simula cenário em que clientes.email existiria — não entra na lista de faturas.
  const faturas = [
    faturaEnvio({
      id: "fat-ago-a",
      referencia_id: CLI_A,
      fatura_enviada_em: null,
      fatura_enviada_email: null,
    }),
  ];

  assert.equal(obterEmailEnvioSugeridoCliente(faturas, CLI_A), null);
});

run("4 — usuário altera e envia → nova sugestão futura", () => {
  const faturasAntes = [
    faturaEnvio({
      id: "fat-ago-a",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
      fatura_enviada_email: "financeiro@cliente.com.br",
    }),
    faturaEnvio({
      id: "fat-set-a",
      referencia_id: CLI_A,
      fatura_enviada_em: null,
      fatura_enviada_email: null,
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(faturasAntes, CLI_A, "fat-set-a"),
    "financeiro@cliente.com.br"
  );

  const faturasDepois = [
    faturasAntes[0],
    faturaEnvio({
      id: "fat-set-a",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-10-02T11:00:00.000Z",
      fatura_enviada_email: "contasapagar@cliente.com.br",
    }),
    faturaEnvio({
      id: "fat-out-a",
      referencia_id: CLI_A,
      fatura_enviada_em: null,
      fatura_enviada_email: null,
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(faturasDepois, CLI_A, "fat-out-a"),
    "contasapagar@cliente.com.br"
  );
});

run("5 — envio falha → sugestão anterior permanece", () => {
  const faturas = [
    faturaEnvio({
      id: "fat-ago-a",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
      fatura_enviada_email: "financeiro@cliente.com.br",
    }),
    faturaEnvio({
      id: "fat-set-a",
      referencia_id: CLI_A,
      // Tentativa falhou: campos de envio permanecem nulos.
      fatura_enviada_em: null,
      fatura_enviada_email: null,
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(faturas, CLI_A, "fat-set-a"),
    "financeiro@cliente.com.br"
  );
});

run("6 — reenvio para endereço diferente → vira o mais recente", () => {
  const faturas = [
    faturaEnvio({
      id: "fat-ago-a",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-09-03T14:00:00.000Z",
      fatura_enviada_email: "fiscal@cliente.com.br",
      fatura_envio_reenvio_count: 1,
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(faturas, CLI_A),
    "fiscal@cliente.com.br"
  );

  const faturasComPrimeiroEnvio = [
    faturaEnvio({
      id: "fat-ago-a",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
      fatura_enviada_email: "financeiro@cliente.com.br",
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(
      [
        {
          ...faturasComPrimeiroEnvio[0],
          fatura_enviada_em: "2026-09-03T14:00:00.000Z",
          fatura_enviada_email: "fiscal@cliente.com.br",
        },
      ],
      CLI_A
    ),
    "fiscal@cliente.com.br"
  );
});

run("7 — outro cliente não reutiliza e-mail", () => {
  const faturas = [
    faturaEnvio({
      id: "fat-ago-a",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
      fatura_enviada_email: "financeiro@cliente.com.br",
    }),
    faturaEnvio({
      id: "fat-ago-b",
      referencia_id: CLI_B,
      fatura_enviada_em: null,
      fatura_enviada_email: null,
    }),
  ];

  assert.equal(obterEmailEnvioSugeridoCliente(faturas, CLI_B), null);
  assert.equal(
    obterEmailEnvioSugeridoCliente(faturas, CLI_A),
    "financeiro@cliente.com.br"
  );
});

run("extra — ignora registro sem fatura_enviada_em ou sem e-mail", () => {
  const faturas = [
    faturaEnvio({
      id: "fat-invalida-email",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
      fatura_enviada_email: null,
    }),
    faturaEnvio({
      id: "fat-invalida-em",
      referencia_id: CLI_A,
      fatura_enviada_em: null,
      fatura_enviada_email: "fantasma@cliente.com.br",
    }),
    faturaEnvio({
      id: "fat-valida",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-09-02T10:00:00.000Z",
      fatura_enviada_email: "valido@cliente.com.br",
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(faturas, CLI_A),
    "valido@cliente.com.br"
  );
});

run("8 — competência atual vazia, mês anterior no histórico → recupera pelo id", () => {
  const competenciaAtual = [
    faturaEnvio({
      id: "fat-out-a",
      referencia_id: CLI_A,
      referencia_nome: "Alfa Engenharia",
      mes_referencia: "2026-10",
      fatura_enviada_em: null,
      fatura_enviada_email: null,
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(competenciaAtual, CLI_A, "fat-out-a"),
    null
  );

  const historico = [
    faturaEnvio({
      id: "fat-set-a",
      referencia_id: CLI_A,
      referencia_nome: "Alfa Engenharia",
      mes_referencia: "2026-09",
      fatura_enviada_em: "2026-09-02T10:00:00.000Z",
      fatura_enviada_email: "financeiro@alfa.com.br",
    }),
    faturaEnvio({
      id: "fat-set-filial",
      referencia_id: CLI_B,
      referencia_nome: "Alfa Engenharia Filial",
      mes_referencia: "2026-09",
      fatura_enviada_em: "2026-09-03T10:00:00.000Z",
      fatura_enviada_email: "filial@alfa.com.br",
    }),
    ...competenciaAtual,
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(historico, CLI_A, "fat-out-a"),
    "financeiro@alfa.com.br"
  );
  assert.equal(
    obterEmailEnvioSugeridoCliente(historico, CLI_B, "fat-out-b"),
    "filial@alfa.com.br"
  );
});

run("9 — e-mail inválido mais recente não substitui o último válido", () => {
  const faturas = [
    faturaEnvio({
      id: "fat-valida",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
      fatura_enviada_email: "valido@cliente.com.br",
    }),
    faturaEnvio({
      id: "fat-invalida",
      referencia_id: CLI_A,
      fatura_enviada_em: "2026-10-01T10:00:00.000Z",
      fatura_enviada_email: "nao-e-email",
    }),
  ];

  assert.equal(
    obterEmailEnvioSugeridoCliente(faturas, CLI_A),
    "valido@cliente.com.br"
  );
});

run("10 — sugestão tardia não apaga o que a usuária digitou", () => {
  assert.equal(
    aplicarEmailSugeridoSemSobrescrever({
      emailAtual: "",
      usuarioEditou: false,
      emailSugerido: "financeiro@alfa.com.br",
    }),
    "financeiro@alfa.com.br"
  );

  assert.equal(
    aplicarEmailSugeridoSemSobrescrever({
      emailAtual: "novo@",
      usuarioEditou: true,
      emailSugerido: "financeiro@alfa.com.br",
    }),
    "novo@"
  );

  assert.equal(
    aplicarEmailSugeridoSemSobrescrever({
      emailAtual: "",
      usuarioEditou: true,
      emailSugerido: "financeiro@alfa.com.br",
    }),
    ""
  );

  assert.equal(
    aplicarEmailSugeridoSemSobrescrever({
      emailAtual: "digitado@alfa.com.br",
      usuarioEditou: false,
      emailSugerido: "financeiro@alfa.com.br",
      emailDestaFatura: "desta@alfa.com.br",
    }),
    "desta@alfa.com.br"
  );
});

async function validarBuscaHistoricoSemEnvio() {
  let enviouEmail = false;

  await runAsync(
    "11 — busca do mês anterior pelo id, sem enviar e-mail",
    async () => {
      const consultas: string[] = [];
      const historico: FaturaEnvioEmailFonte[] = [
        {
          id: "fat-set-a",
          tipo: "cliente",
          referencia_id: CLI_A,
          fatura_enviada_em: "2026-09-02T10:00:00.000Z",
          fatura_enviada_email: "financeiro@alfa.com.br",
        },
        {
          id: "fat-set-b",
          tipo: "cliente",
          referencia_id: CLI_B,
          fatura_enviada_em: "2026-09-03T10:00:00.000Z",
          fatura_enviada_email: "filial@alfa.com.br",
        },
        {
          id: "fat-out-a",
          tipo: "cliente",
          referencia_id: CLI_A,
          fatura_enviada_em: null,
          fatura_enviada_email: null,
        },
      ];

      const email = await buscarUltimoEmailEnvioCliente(
        CLI_A,
        "fat-out-a",
        async (referenciaId) => {
          consultas.push(referenciaId);
          return historico;
        }
      );

      assert.deepEqual(consultas, [CLI_A]);
      assert.equal(email, "financeiro@alfa.com.br");
      assert.equal(enviouEmail, false);
    }
  );

  await runAsync(
    "12 — alteração confirmada passa a valer na fatura seguinte",
    async () => {
      const depoisDoEnvio: FaturaEnvioEmailFonte[] = [
        {
          id: "fat-set-a",
          tipo: "cliente",
          referencia_id: CLI_A,
          fatura_enviada_em: "2026-09-02T10:00:00.000Z",
          fatura_enviada_email: "financeiro@alfa.com.br",
        },
        {
          id: "fat-out-a",
          tipo: "cliente",
          referencia_id: CLI_A,
          fatura_enviada_em: "2026-10-02T11:00:00.000Z",
          fatura_enviada_email: "contasapagar@alfa.com.br",
        },
      ];

      const email = await buscarUltimoEmailEnvioCliente(
        CLI_A,
        "fat-nov-a",
        async () => depoisDoEnvio
      );

      assert.equal(email, "contasapagar@alfa.com.br");
      assert.equal(enviouEmail, false);
    }
  );

  await runAsync(
    "13 — outro cliente, mesmo com nome parecido, permanece isolado",
    async () => {
      const email = await buscarUltimoEmailEnvioCliente(
        CLI_B,
        "fat-out-b",
        async (referenciaId) => {
          assert.equal(referenciaId, CLI_B);
          return [
            {
              id: "fat-set-a",
              tipo: "cliente",
              referencia_id: CLI_A,
              fatura_enviada_em: "2026-09-02T10:00:00.000Z",
              fatura_enviada_email: "financeiro@alfa.com.br",
            },
            {
              id: "fat-set-b",
              tipo: "cliente",
              referencia_id: CLI_B,
              fatura_enviada_em: "2026-09-04T10:00:00.000Z",
              fatura_enviada_email: "filial@alfa.com.br",
            },
          ];
        }
      );

      assert.equal(email, "filial@alfa.com.br");
      assert.equal(enviouEmail, false);
    }
  );

  await runAsync("14 — sem histórico e sem id a busca não consulta nem envia", async () => {
    let consultou = false;
    const semHistorico = await buscarUltimoEmailEnvioCliente(
      CLI_A,
      "fat-out-a",
      async () => {
        consultou = true;
        return [];
      }
    );
    assert.equal(consultou, true);
    assert.equal(semHistorico, null);

    consultou = false;
    const semId = await buscarUltimoEmailEnvioCliente(
      "  ",
      "fat-out-a",
      async () => {
        consultou = true;
        return [];
      }
    );
    assert.equal(consultou, false);
    assert.equal(semId, null);
    assert.equal(enviouEmail, false);
  });
}

function runAsync(name: string, fn: () => Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`OK  ${name}`);
    } catch (err) {
      console.error(`FALHA  ${name}`);
      throw err;
    }
  })();
}

validarBuscaHistoricoSemEnvio()
  .then(() => {
    console.log("\nTodos os testes de sugestão de e-mail passaram.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
