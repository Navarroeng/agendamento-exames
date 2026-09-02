/**
 * Sugestão de e-mail para envio de faturas (somente envios confirmados).
 * Executar: npx tsx scripts/test-fatura-envio-sugestao.ts
 */
import assert from "node:assert/strict";
import {
  clienteTemHistoricoEnvioFatura,
  obterEmailEnvioSugeridoCliente,
} from "../lib/fatura-envio-sugestao";
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

console.log("\nTodos os testes de sugestão de e-mail passaram.");
