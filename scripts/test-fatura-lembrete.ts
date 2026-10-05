/**
 * Lembrete manual de fatura de cliente.
 * Executar: npx tsx scripts/test-fatura-lembrete.ts
 */
import assert from "node:assert/strict";

process.env.AVALIACAO_SESSION_SECRET ??= "test-fatura-lembrete-secret";

import { todayIsoSaoPaulo } from "../lib/agendamento-datetime";
import { buildFaturaClienteLembreteEmailHtml } from "../lib/email/templates/fatura-cliente-lembrete-email";
import { buildFaturaClienteEnvioEmailHtml } from "../lib/email/templates/fatura-cliente-envio-email";
import { isFaturasStaffPerfil } from "../lib/faturas-api-auth.server";
import { buildFaturaLembreteIdempotencyKey } from "../lib/fatura-envio-idempotency";
import {
  buildLembreteFaturaTexto,
  faturaEstaVencidaParaLembrete,
  faturaPermiteLembrete,
  motivoBloqueioLembrete,
  textoUltimoLembrete,
  validarConteudoLembrete,
} from "../lib/fatura-lembrete";
import { nomeArquivoPdfFaturaClienteEmail } from "../lib/fatura-pdf";
import type { FaturaComItens, FaturaItemRecord } from "../lib/types";
import { enviarLembreteFaturaClienteResend } from "../services/fatura-lembrete-email.server";

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";

function run(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    await fn();
    console.log(`OK  ${name}`);
  })();
}

function item(): FaturaItemRecord {
  return {
    id: "item-1",
    fatura_id: "fat-1",
    agendamento_id: "ag-1",
    data_agendamento: "2026-08-15",
    colaborador: "Colaborador Teste",
    cliente_nome: "PAVFACIL",
    clinica_nome: "Clínica",
    tipo_aso: "Admissional",
    exame_nome: "ASO",
    valor_unitario: 50,
    quantidade: 1,
    valor_total: 50,
  };
}

function faturaBase(overrides: Partial<FaturaComItens> = {}): FaturaComItens {
  return {
    id: "fat-pavfacil",
    numero: "FAT-CLI-2026-00102",
    tipo: "cliente",
    referencia_id: "cli-pavfacil",
    referencia_nome: "PAVFACIL",
    periodo_inicio: "2026-08-01",
    periodo_fim: "2026-08-31",
    mes_referencia: "2026-08",
    data_emissao: "2026-08-31T12:00:00.000Z",
    data_vencimento: "2026-10-05",
    valor_total: 50,
    total_exames: 1,
    status: "emitida",
    gerado_por: "Staff",
    pago: false,
    data_pagamento: null,
    observacao_pagamento: null,
    comprovante_pagamento_path: null,
    comprovante_pagamento_nome: null,
    conferido_em: null,
    conferido_por: null,
    fatura_clinica_path: null,
    fatura_clinica_nome: null,
    fatura_clinica_tipo: null,
    fatura_clinica_tamanho: null,
    observacao_conferencia: null,
    conferencia_registrada_em: null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
    fatura_enviada_em: "2026-09-02T15:00:00.000Z",
    fatura_enviada_email: "cliente@empresa.com.br",
    fatura_enviada_por: "Staff",
    fatura_enviada_por_user_id: null,
    fatura_envio_resend_id: "envio-original",
    fatura_envio_reenvio_count: 0,
    created_at: "2026-08-31T12:00:00.000Z",
    updated_at: "2026-08-31T12:00:00.000Z",
    fatura_itens: [item()],
    ...overrides,
  };
}

const tests: Promise<void>[] = [];

tests.push(
  run("São Paulo — virada do dia não trata vencimento de hoje como vencido", () => {
    assert.equal(
      todayIsoSaoPaulo(new Date("2026-10-06T02:30:00.000Z")),
      "2026-10-05"
    );
    assert.equal(faturaEstaVencidaParaLembrete("2026-10-05", "2026-10-05"), false);
    assert.equal(faturaEstaVencidaParaLembrete("2026-10-06", "2026-10-05"), false);
    assert.equal(faturaEstaVencidaParaLembrete("2026-10-04", "2026-10-05"), true);
  })
);

tests.push(
  run("Texto — a vencer, inclusive no dia do vencimento", () => {
    const texto = buildLembreteFaturaTexto({
      numero: "FAT-CLI-2026-00102",
      clienteNome: "PAVFACIL",
      valor: 50,
      dataVencimento: "2026-10-05",
      hojeIso: "2026-10-05",
    });
    assert.equal(texto.vencida, false);
    assert.equal(
      texto.assunto,
      "Lembrete de vencimento — Fatura FAT-CLI-2026-00102 | Navarro Engenharia"
    );
    assert.match(texto.mensagem, /^Olá, PAVFACIL\./);
    assert.match(
      texto.mensagem,
      /fatura FAT-CLI-2026-00102, no valor de R\$ 50,00, tem vencimento em 05\/10\/2026/
    );
    assert.match(texto.mensagem, /Os dados para pagamento estão disponíveis abaixo/);
    assert.match(texto.mensagem, /desconsidere este lembrete/);
    assert.match(texto.mensagem, /Atenciosamente,\nNavarro Engenharia$/);
    assert.doesNotMatch(texto.mensagem, /juros|multa/i);
  })
);

tests.push(
  run("Texto — vencida usa o aviso de pagamento em aberto", () => {
    const texto = buildLembreteFaturaTexto({
      numero: "FAT-CLI-2026-00102",
      clienteNome: "PAVFACIL",
      valor: 1250.5,
      dataVencimento: "2026-10-04",
      hojeIso: "2026-10-05",
    });
    assert.equal(texto.vencida, true);
    assert.equal(
      texto.assunto,
      "Lembrete de pagamento — Fatura FAT-CLI-2026-00102 em aberto | Navarro Engenharia"
    );
    assert.match(texto.mensagem, /não identificamos o pagamento/);
    assert.match(texto.mensagem, /R\$ 1\.250,50/);
    assert.match(texto.mensagem, /vencimento em 04\/10\/2026/);
    assert.match(texto.mensagem, /regularização do pagamento/);
  })
);

tests.push(
  run("Elegibilidade — aberta e vencida sim; paga, cancelada e demais não", () => {
    assert.equal(faturaPermiteLembrete(faturaBase()), true);
    assert.equal(
      faturaPermiteLembrete(faturaBase({ status: "vencida" })),
      true
    );
    assert.equal(faturaPermiteLembrete(faturaBase({ pago: true })), false);
    assert.match(
      motivoBloqueioLembrete(faturaBase({ pago: true })) ?? "",
      /paga/
    );
    assert.match(
      motivoBloqueioLembrete(faturaBase({ status: "cancelada" })) ?? "",
      /cancelada/
    );
    for (const status of [
      "rascunho",
      "necessita_reemissao",
      "substituida",
      "reemitida",
    ] as const) {
      assert.equal(faturaPermiteLembrete(faturaBase({ status })), false);
    }
    assert.equal(
      faturaPermiteLembrete(faturaBase({ tipo: "clinica", status: "emitida" })),
      false
    );
  })
);

tests.push(
  run("HTML — reutiliza dados bancários e o PDF não vira nova fatura", () => {
    const fatura = faturaBase();
    const texto = buildLembreteFaturaTexto({
      numero: fatura.numero,
      clienteNome: fatura.referencia_nome,
      valor: fatura.valor_total,
      dataVencimento: fatura.data_vencimento,
      hojeIso: "2026-10-05",
    });
    const html = buildFaturaClienteLembreteEmailHtml({
      fatura,
      assunto: texto.assunto,
      mensagem: `${texto.mensagem}\n\n<script>alert(1)</script>`,
      assetsBaseUrl: "https://sst.navarroeng.com.br",
    });
    assert.match(html, /Itaú \(341\)/);
    assert.match(html, /0760/);
    assert.match(html, /99729-6/);
    assert.match(html, /45\.206\.250\/0001-10/);
    assert.match(html, /email\/faturas\/cabecalho\.jpg/);
    assert.match(html, /email\/faturas\/rodape\.jpg/);
    assert.match(html, /FAT-CLI-2026-00102/);
    assert.match(html, /R\$ 50,00/);
    assert.match(html, /05\/10\/2026/);
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /juros|multa/i);
    assert.match(
      nomeArquivoPdfFaturaClienteEmail(fatura.numero, fatura.referencia_nome),
      /^Fatura_FAT_CLI_2026_00102_PAVFACIL.*\.pdf$/
    );
  })
);

tests.push(
  run("Envio original — o lembrete não entra no template da emissão", () => {
    const html = buildFaturaClienteEnvioEmailHtml({
      fatura: faturaBase(),
      assetsBaseUrl: "https://sst.navarroeng.com.br",
    });
    assert.doesNotMatch(html, /Lembrete de vencimento/);
    assert.doesNotMatch(html, /Lembrete de pagamento/);
    assert.match(html, /Encaminhamos em anexo a fatura/);
  })
);

tests.push(
  run("Conteúdo — rejeita assunto vazio e quebra de linha", () => {
    assert.throws(
      () => validarConteudoLembrete({ assunto: "  ", mensagem: "Oi" }),
      /assunto/
    );
    assert.throws(
      () => validarConteudoLembrete({ assunto: "Linha\n2", mensagem: "Oi" }),
      /quebras de linha/
    );
  })
);

tests.push(
  run("Rótulo — último lembrete no fuso de São Paulo", () => {
    const texto = textoUltimoLembrete("2026-10-05T17:46:00.000Z");
    assert.equal(texto, "Último lembrete enviado em 05/10/2026 às 14:46");
  })
);

tests.push(
  run("Permissão — mesmo staff do envio de faturas", () => {
    assert.equal(isFaturasStaffPerfil("admin"), true);
    assert.equal(isFaturasStaffPerfil("operacional"), true);
    assert.equal(isFaturasStaffPerfil("cliente"), false);
  })
);

function depsDe(
  fatura: FaturaComItens,
  extra: Partial<Parameters<typeof enviarLembreteFaturaClienteResend>[1]> = {}
) {
  const enviado: { chamado: boolean } = { chamado: false };
  const registrado: { chamado: boolean } = { chamado: false };
  const financeiro = {
    valor: fatura.valor_total,
    vencimento: fatura.data_vencimento,
    status: fatura.status,
    envio: fatura.fatura_enviada_em,
  };
  return {
    flags: { enviado, registrado, financeiro },
    deps: {
      buscarFatura: async () => ({ ...fatura, fatura_itens: [...fatura.fatura_itens] }),
      gerarPdfBuffer: async () => ({
        buffer: Buffer.from("%PDF-lembrete"),
        filename: "ignorado.pdf",
      }),
      buscarLembretePorIdempotency: async () => null,
      enviarEmailResend: async (params: {
        subject: string;
        html: string;
        attachmentFilename: string;
        attachmentContent: Buffer;
        idempotencyKey: string;
      }) => {
        enviado.chamado = true;
        assert.equal(params.subject, "Assunto revisado");
        assert.match(params.html, /Mensagem revisada/);
        assert.match(params.html, /Itaú \(341\)/);
        assert.match(params.attachmentFilename, /\.pdf$/);
        assert.ok(params.attachmentContent.length > 0);
        assert.equal(
          params.idempotencyKey,
          buildFaturaLembreteIdempotencyKey({
            faturaId: fatura.id,
            requestId: REQUEST_ID,
          })
        );
        return { id: "resend-lembrete-1" };
      },
      registrarLembreteAceito: async (params: {
        email: string;
        assunto: string;
        mensagem: string;
        resendMessageId: string | null;
      }) => {
        registrado.chamado = true;
        assert.equal(params.email, "cliente@empresa.com.br");
        assert.equal(params.assunto, "Assunto revisado");
        assert.equal(params.mensagem, "Mensagem revisada");
        assert.equal(params.resendMessageId, "resend-lembrete-1");
        assert.equal(fatura.valor_total, financeiro.valor);
        assert.equal(fatura.data_vencimento, financeiro.vencimento);
        assert.equal(fatura.status, financeiro.status);
        assert.equal(fatura.fatura_enviada_em, financeiro.envio);
        return {
          id: "lem-1",
          fatura_id: fatura.id,
          enviado_em: "2026-10-05T17:46:00.000Z",
          destinatario: params.email,
          usuario_id: null,
          usuario_nome: "Staff",
          assunto: params.assunto,
          mensagem: params.mensagem,
          resend_message_id: params.resendMessageId,
          situacao: "aceito_resend" as const,
        };
      },
      atualizarUltimoLembrete: async (params: {
        faturaId: string;
        email: string;
        enviadoEm: string;
      }) => {
        assert.equal(params.faturaId, fatura.id);
        assert.equal(params.email, "cliente@empresa.com.br");
        assert.equal(Object.keys(params).length, 3);
      },
      registrarAuditoriaFalha: async () => {
        throw new Error("falha não deveria ser auditada no sucesso");
      },
      registrarAuditoriaSucesso: async () => undefined,
      ...extra,
    },
  };
}

tests.push(
  run("Envio — sucesso grava histórico e não mexe na fatura", async () => {
    const fatura = faturaBase();
    const { flags, deps } = depsDe(fatura);
    const result = await enviarLembreteFaturaClienteResend(
      {
        faturaId: fatura.id,
        email: "cliente@empresa.com.br",
        assunto: "Assunto revisado",
        mensagem: "Mensagem revisada",
        requestId: REQUEST_ID,
      },
      deps
    );
    assert.equal(flags.enviado.chamado, true);
    assert.equal(flags.registrado.chamado, true);
    assert.equal(result.resendMessageId, "resend-lembrete-1");
    assert.equal(result.lembrete.situacao, "aceito_resend");
    assert.equal(result.reutilizado, false);
    assert.equal(fatura.valor_total, 50);
    assert.equal(fatura.data_vencimento, "2026-10-05");
    assert.equal(fatura.fatura_envio_resend_id, "envio-original");
  })
);

tests.push(
  run("Envio — vencida também pode receber lembrete", async () => {
    const fatura = faturaBase({
      status: "vencida",
      data_vencimento: "2026-09-01",
    });
    const { deps } = depsDe(fatura);
    const result = await enviarLembreteFaturaClienteResend(
      {
        faturaId: fatura.id,
        email: "cliente@empresa.com.br",
        assunto: "Assunto revisado",
        mensagem: "Mensagem revisada",
        requestId: REQUEST_ID,
      },
      deps
    );
    assert.equal(result.lembrete.fatura_id, fatura.id);
  })
);

tests.push(
  run("Envio — paga, cancelada e sem e-mail são bloqueados antes do Resend", async () => {
    for (const fatura of [
      faturaBase({ pago: true }),
      faturaBase({ status: "cancelada", pago: false }),
    ]) {
      let enviou = false;
      let registrou = false;
      await assert.rejects(
        () =>
          enviarLembreteFaturaClienteResend(
            {
              faturaId: fatura.id,
              email: "cliente@empresa.com.br",
              assunto: "Assunto",
              mensagem: "Mensagem",
              requestId: REQUEST_ID,
            },
            {
              buscarFatura: async () => fatura,
              buscarLembretePorIdempotency: async () => null,
              enviarEmailResend: async () => {
                enviou = true;
                return { id: "nao" };
              },
              registrarLembreteAceito: async () => {
                registrou = true;
                throw new Error("não registrar");
              },
            }
          )
      );
      assert.equal(enviou, false);
      assert.equal(registrou, false);
    }

    let enviou = false;
    await assert.rejects(
      () =>
        enviarLembreteFaturaClienteResend(
          {
            faturaId: "fat-pavfacil",
            email: "sem-arroba",
            assunto: "Assunto",
            mensagem: "Mensagem",
            requestId: REQUEST_ID,
          },
          {
            buscarFatura: async () => faturaBase(),
            enviarEmailResend: async () => {
              enviou = true;
              return { id: "nao" };
            },
          }
        ),
      /e-mail válido/
    );
    assert.equal(enviou, false);
  })
);

tests.push(
  run("Envio — falha do Resend não registra sucesso", async () => {
    const fatura = faturaBase();
    let registrou = false;
    let falha = "";
    await assert.rejects(
      () =>
        enviarLembreteFaturaClienteResend(
          {
            faturaId: fatura.id,
            email: "cliente@empresa.com.br",
            assunto: "Assunto revisado",
            mensagem: "Mensagem revisada",
            requestId: REQUEST_ID,
          },
          {
            buscarFatura: async () => fatura,
            gerarPdfBuffer: async () => ({
              buffer: Buffer.from("%PDF"),
              filename: "x.pdf",
            }),
            buscarLembretePorIdempotency: async () => null,
            enviarEmailResend: async () => {
              throw new Error("Resend indisponível");
            },
            registrarLembreteAceito: async () => {
              registrou = true;
              throw new Error("não registrar");
            },
            registrarAuditoriaFalha: async ({ erro }) => {
              falha = erro;
            },
          }
        ),
      /não foi registrado/
    );
    assert.equal(registrou, false);
    assert.match(falha, /Resend indisponível/);
  })
);

tests.push(
  run("Envio — Resend sem identificador não conta como sucesso", async () => {
    let registrou = false;
    await assert.rejects(
      () =>
        enviarLembreteFaturaClienteResend(
          {
            faturaId: "fat-pavfacil",
            email: "cliente@empresa.com.br",
            assunto: "Assunto",
            mensagem: "Mensagem",
            requestId: REQUEST_ID,
          },
          {
            buscarFatura: async () => faturaBase(),
            gerarPdfBuffer: async () => ({
              buffer: Buffer.from("%PDF"),
              filename: "x.pdf",
            }),
            buscarLembretePorIdempotency: async () => null,
            enviarEmailResend: async () => ({ id: null }),
            registrarLembreteAceito: async () => {
              registrou = true;
              throw new Error("não registrar");
            },
            registrarAuditoriaFalha: async () => undefined,
          }
        ),
      /não foi registrado/
    );
    assert.equal(registrou, false);
  })
);

tests.push(
  run("Envio — pedido já aceito não dispara outro e-mail", async () => {
    let enviou = false;
    const result = await enviarLembreteFaturaClienteResend(
      {
        faturaId: "fat-pavfacil",
        email: "cliente@empresa.com.br",
        assunto: "Assunto",
        mensagem: "Mensagem",
        requestId: REQUEST_ID,
      },
      {
        buscarLembretePorIdempotency: async () => ({
          id: "lem-1",
          fatura_id: "fat-pavfacil",
          enviado_em: "2026-10-05T17:46:00.000Z",
          destinatario: "cliente@empresa.com.br",
          usuario_id: null,
          usuario_nome: "Staff",
          assunto: "Assunto",
          mensagem: "Mensagem",
          resend_message_id: "resend-lembrete-1",
          situacao: "aceito_resend",
        }),
        enviarEmailResend: async () => {
          enviou = true;
          return { id: "novo" };
        },
        atualizarUltimoLembrete: async () => undefined,
      }
    );
    assert.equal(enviou, false);
    assert.equal(result.reutilizado, true);
    assert.equal(result.resendMessageId, "resend-lembrete-1");
  })
);

tests.push(
  run("Envio — status pago na releitura impede o Resend", async () => {
    const aberta = faturaBase();
    const paga = faturaBase({ pago: true });
    let leituras = 0;
    let enviou = false;
    await assert.rejects(
      () =>
        enviarLembreteFaturaClienteResend(
          {
            faturaId: aberta.id,
            email: "cliente@empresa.com.br",
            assunto: "Assunto",
            mensagem: "Mensagem",
            requestId: REQUEST_ID,
          },
          {
            buscarFatura: async () => {
              leituras += 1;
              return leituras === 1 ? aberta : paga;
            },
            gerarPdfBuffer: async () => ({
              buffer: Buffer.from("%PDF"),
              filename: "x.pdf",
            }),
            buscarLembretePorIdempotency: async () => null,
            enviarEmailResend: async () => {
              enviou = true;
              return { id: "nao" };
            },
          }
        ),
      /paga/
    );
    assert.equal(enviou, false);
    assert.equal(leituras, 2);
  })
);

Promise.all(tests)
  .then(() => {
    console.log(`\n${tests.length} testes de lembrete de fatura passaram.`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
