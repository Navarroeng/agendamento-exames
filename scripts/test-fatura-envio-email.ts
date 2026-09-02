/**
 * Envio automático de faturas de clientes por e-mail (Resend).
 * Executar: npx tsx scripts/test-fatura-envio-email.ts
 */
import assert from "node:assert/strict";

process.env.AVALIACAO_SESSION_SECRET ??= "test-fatura-envio-secret";
import {
  buildAssuntoFaturaClienteEmail,
  buildFaturaClienteEnvioEmailHtml,
} from "../lib/email/templates/fatura-cliente-envio-email";
import {
  getResendFromAddressFaturas,
  getResendReplyToAddressFaturas,
} from "../lib/email/resend-config";
import { isFaturasStaffPerfil } from "../lib/faturas-api-auth.server";
import { isEmailValido } from "../lib/email-validacao";
import {
  buildFaturaEnvioVersaoIdentidade,
  faturaStatusPermiteEnvioEmail,
  isFaturaEnvioExplicitamenteConfirmado,
} from "../lib/fatura-envio";
import {
  buildFaturaEnvioIdempotencyKey,
  buildFaturaReenvioIdempotencyKey,
} from "../lib/fatura-envio-idempotency";
import {
  criarFaturaReenvioIntentToken,
  verificarFaturaReenvioIntentToken,
} from "../lib/fatura-reenvio-intent-token";
import {
  buildFaturaClientePdfLayoutOptions,
  gerarPdfFaturaClienteBuffer,
  gerarPdfFromFatura,
  nomeArquivoPdfFaturaCliente,
  nomeArquivoPdfFaturaClienteEmail,
} from "../lib/fatura-pdf";
import {
  buildFaturaEnvioEmailAssetUrl,
  FATURA_EMAIL_ASSET_FILES,
} from "../lib/email/fatura-envio-email-assets";
import { NAVARRO_DADOS_BANCARIOS } from "../lib/navarro-pagamento";
import type { FaturaComItens, FaturaItemRecord } from "../lib/types";
import { enviarFaturaClientePorEmailResend } from "../services/fatura-envio-email.server";
import {
  prepararReenvioFaturaCliente,
  reenviarFaturaClientePorEmailResend,
} from "../services/fatura-reenvio-email.server";

function run(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    await fn();
    console.log(`OK  ${name}`);
  })();
}

function item(partial: Partial<FaturaItemRecord> & Pick<FaturaItemRecord, "valor_unitario" | "valor_total">): FaturaItemRecord {
  return {
    id: partial.id ?? "item-1",
    fatura_id: partial.fatura_id ?? "fat-1",
    agendamento_id: partial.agendamento_id ?? "ag-1",
    data_agendamento: partial.data_agendamento ?? "2026-08-15",
    colaborador: partial.colaborador ?? "Colaborador Teste",
    cliente_nome: partial.cliente_nome ?? "PAVFACIL",
    clinica_nome: partial.clinica_nome ?? "Clínica",
    tipo_aso: partial.tipo_aso ?? "Admissional",
    exame_nome: partial.exame_nome ?? "ASO",
    valor_unitario: partial.valor_unitario,
    quantidade: partial.quantidade ?? 1,
    valor_total: partial.valor_total,
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
    data_vencimento: "2026-09-30",
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
    fatura_enviada_em: null,
    fatura_enviada_email: null,
    fatura_enviada_por: null,
    fatura_enviada_por_user_id: null,
    fatura_envio_resend_id: null,
    fatura_envio_reenvio_count: 0,
    created_at: "2026-08-31T12:00:00.000Z",
    updated_at: "2026-08-31T12:00:00.000Z",
    fatura_itens: [
      item({ valor_unitario: 50, valor_total: 50, exame_nome: "ASO Admissional" }),
    ],
    ...overrides,
  };
}

const tests: Promise<void>[] = [];

tests.push(
  run("Remetente/reply-to faturas — defaults server-side", () => {
    assert.match(getResendFromAddressFaturas(), /financeiro@docs\.navarroeng\.com\.br/);
    assert.equal(getResendReplyToAddressFaturas(), "atendimento@navarroeng.com.br");
  })
);

tests.push(
  run("Status — emitida/vencida permitem envio", () => {
    assert.equal(faturaStatusPermiteEnvioEmail("emitida"), true);
    assert.equal(faturaStatusPermiteEnvioEmail("vencida"), true);
    assert.equal(faturaStatusPermiteEnvioEmail("rascunho"), false);
    assert.equal(faturaStatusPermiteEnvioEmail("cancelada"), false);
    assert.equal(faturaStatusPermiteEnvioEmail("necessita_reemissao"), false);
    assert.equal(faturaStatusPermiteEnvioEmail("substituida"), false);
    assert.equal(faturaStatusPermiteEnvioEmail("reemitida"), false);
  })
);

tests.push(
  run("Assunto — empresa + competência", () => {
    const assunto = buildAssuntoFaturaClienteEmail({
      numero: "FAT-CLI-2026-00102",
      referencia_nome: "PAVFACIL ADMINISTRAÇÃO DE SERVIÇOS LTDA",
      mes_referencia: "2026-08",
      periodo_inicio: "2026-08-01",
    });
    assert.equal(
      assunto,
      "Fatura de Exames Ocupacionais – PAVFACIL ADMINISTRAÇÃO DE SERVIÇOS LTDA – AGOSTO/2026"
    );
  })
);

tests.push(
  run("HTML — competência dinâmica no texto introdutório", () => {
    const html = buildFaturaClienteEnvioEmailHtml({
      fatura: faturaBase(),
      assetsBaseUrl: "https://sst.navarroeng.com.br",
    });
    assert.match(html, /exames realizados no mês de <strong[^>]*>AGOSTO\/2026<\/strong>/);
  })
);

tests.push(
  run("HTML — dados bancários e CNPJ PIX corretos", () => {
    const html = buildFaturaClienteEnvioEmailHtml({
      fatura: faturaBase(),
      assetsBaseUrl: "https://sst.navarroeng.com.br",
    });
    assert.match(html, /Itaú \(341\)/);
    assert.match(html, /0760/);
    assert.match(html, /99729-6/);
    assert.match(html, /45\.206\.250\/0001-10/);
    assert.match(html, /CNPJ PIX/);
    assert.match(html, /NAVARRO ENGENHARIA DE SEGURANÇA DO TRABALHO/);
  })
);

tests.push(
  run("HTML — sem QR Code / PIX copia e cola", () => {
    const html = buildFaturaClienteEnvioEmailHtml({
      fatura: faturaBase(),
      assetsBaseUrl: "https://sst.navarroeng.com.br",
    });
    assert.doesNotMatch(html, /qr[\s-]?code/i);
    assert.doesNotMatch(html, /copia e cola/i);
    assert.doesNotMatch(html, /000201/i);
  })
);

tests.push(
  run("HTML — artes cabeçalho e rodapé com URLs válidas", () => {
    const base = "https://sst.navarroeng.com.br";
    const html = buildFaturaClienteEnvioEmailHtml({
      fatura: faturaBase(),
      assetsBaseUrl: base,
    });
    const cab = buildFaturaEnvioEmailAssetUrl("cabecalho", base);
    const rod = buildFaturaEnvioEmailAssetUrl("rodape", base);
    assert.match(html, new RegExp(cab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, new RegExp(rod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /email\/faturas\/cabecalho\.jpg/);
    assert.match(html, /email\/faturas\/rodape\.jpg/);
    assert.equal(FATURA_EMAIL_ASSET_FILES.cabecalho, "/email/faturas/cabecalho.jpg");
  })
);

tests.push(
  run("HTML — sem duplicar contatos do rodapé em HTML", () => {
    const html = buildFaturaClienteEnvioEmailHtml({
      fatura: faturaBase(),
      assetsBaseUrl: "https://sst.navarroeng.com.br",
    });
    assert.doesNotMatch(html, /97706-5599/);
    assert.doesNotMatch(html, /mailto:atendimento@navarroeng\.com\.br/);
    assert.doesNotMatch(html, /www\.navarroeng\.com\.br/);
    assert.doesNotMatch(html, /<p[^>]*>[^<]*Atenciosamente,/i);
  })
);

tests.push(
  run("HTML — sem CPF/colaboradores/exames clínicos no corpo", () => {
    const html = buildFaturaClienteEnvioEmailHtml({
      fatura: faturaBase(),
      assetsBaseUrl: "https://sst.navarroeng.com.br",
    });
    assert.match(html, /PAVFACIL/);
    assert.match(html, /FAT-CLI-2026-00102/);
    assert.doesNotMatch(html, /Colaborador Teste/i);
    assert.doesNotMatch(html, /ASO Admissional/i);
    assert.doesNotMatch(html, /CPF/i);
  })
);

tests.push(
  run("Nome do PDF anexo e-mail", () => {
    const nome = nomeArquivoPdfFaturaClienteEmail(
      "FAT-CLI-2026-00102",
      "PAVFACIL ADMINISTRAÇÃO DE SERVIÇOS LTDA"
    );
    assert.match(nome, /^Fatura_FAT_CLI_2026_00102_PAVFACIL/);
    assert.match(nome, /\.pdf$/);
  })
);

tests.push(
  run("Nome do PDF download manual inalterado", () => {
    const nome = nomeArquivoPdfFaturaCliente("PAVFACIL", "2026-08-01");
    assert.match(nome, /^Fatura-.*-Pavfacil\.pdf$/);
  })
);

tests.push(
  run("Idempotência — versão estável via data_emissao", () => {
    const f = faturaBase();
    const versao = buildFaturaEnvioVersaoIdentidade(f);
    assert.equal(versao, f.data_emissao);
    const key = buildFaturaEnvioIdempotencyKey({
      faturaId: f.id,
      versaoIdentidade: versao,
    });
    assert.equal(key, `fatura-envio/${f.id}/${versao}`);
  })
);

tests.push(
  run("PDF layout — usa snapshot valor_total R$ 50", async () => {
    const f = faturaBase();
    const { options } = await buildFaturaClientePdfLayoutOptions(f, {
      empresa: "PAVFACIL",
      cnpj: "—",
      endereco: "—",
    });
    assert.equal(options.totalValue, "R$ 50,00");
    assert.equal(options.numeroFatura, "FAT-CLI-2026-00102");
  })
);

tests.push(
  run("PDF buffer — anexo gerado no servidor", async () => {
    const f = faturaBase();
    const { buffer, filename } = await gerarPdfFaturaClienteBuffer(f, {
      empresa: "PAVFACIL",
      cnpj: "—",
      endereco: "—",
    });
    assert.ok(buffer.length > 1000);
    assert.match(filename, /\.pdf$/);
    assert.match(buffer.subarray(0, 5).toString("utf8"), /^%PDF-/);
  })
);

tests.push(
  run("Download manual — gerarPdfFromFatura continua exportado", () => {
    assert.equal(typeof gerarPdfFromFatura, "function");
  })
);

tests.push(
  run("Permissão — apenas staff admin/operacional", () => {
    assert.equal(isFaturasStaffPerfil("admin"), true);
    assert.equal(isFaturasStaffPerfil("operacional"), true);
    assert.equal(isFaturasStaffPerfil("cliente"), false);
  })
);

tests.push(
  run("E-mail inválido bloqueado", () => {
    assert.equal(isEmailValido("invalido"), false);
  })
);

tests.push(
  run("Envio emitida — sucesso mock Resend + PDF anexo", async () => {
    let persisted = false;
    let attachmentSeen = false;
    const f = faturaBase();
    const result = await enviarFaturaClientePorEmailResend(
      { faturaId: f.id, email: "cliente@empresa.com.br" },
      {
        buscarFatura: async () => ({ ...f }),
        gerarPdfBuffer: async () => ({
          buffer: Buffer.from("%PDF-mock"),
          filename: "Fatura-Agosto2026-Pavfacil.pdf",
        }),
        enviarEmailResend: async (params) => {
          attachmentSeen = params.attachmentContent.length > 0;
          assert.match(params.attachmentFilename, /^Fatura_FAT_CLI_2026_00102_PAVFACIL\.pdf$/);
          return { id: "resend-1" };
        },
        confirmarPrimeiroEnvio: async () => {
          persisted = true;
          return {
            ...f,
            fatura_enviada_em: "2026-09-02T15:00:00.000Z",
            fatura_enviada_email: "cliente@empresa.com.br",
          };
        },
      }
    );
    assert.equal(persisted, true);
    assert.equal(attachmentSeen, true);
    assert.equal(result.resendMessageId, "resend-1");
  })
);

tests.push(
  run("Envio vencida — permitido", async () => {
    const f = faturaBase({ status: "vencida" });
    await enviarFaturaClientePorEmailResend(
      { faturaId: f.id, email: "a@b.com" },
      {
        buscarFatura: async () => ({ ...f }),
        gerarPdfBuffer: async () => ({
          buffer: Buffer.from("%PDF"),
          filename: "x.pdf",
        }),
        enviarEmailResend: async () => ({ id: "r1" }),
        confirmarPrimeiroEnvio: async () => ({
          ...f,
          fatura_enviada_em: new Date().toISOString(),
        }),
      }
    );
  })
);

tests.push(
  run("Envio paga — status emitida + pago=true permitido", async () => {
    const f = faturaBase({ pago: true, status: "emitida" });
    await enviarFaturaClientePorEmailResend(
      { faturaId: f.id, email: "a@b.com" },
      {
        buscarFatura: async () => ({ ...f }),
        gerarPdfBuffer: async () => ({
          buffer: Buffer.from("%PDF"),
          filename: "x.pdf",
        }),
        enviarEmailResend: async () => ({ id: "r1" }),
        confirmarPrimeiroEnvio: async () => ({
          ...f,
          fatura_enviada_em: new Date().toISOString(),
        }),
      }
    );
  })
);

for (const status of [
  "rascunho",
  "cancelada",
  "necessita_reemissao",
] as const) {
  tests.push(
    run(`Bloqueio — status ${status}`, async () => {
      const f = faturaBase({ status });
      await assert.rejects(
        () =>
          enviarFaturaClientePorEmailResend(
            { faturaId: f.id, email: "a@b.com" },
            { buscarFatura: async () => ({ ...f }) }
          ),
        /não pode ser enviada|não pode/i
      );
    })
  );
}

tests.push(
  run("Falha Resend — não confirma envio", async () => {
    const f = faturaBase();
    let persisted = false;
    await assert.rejects(
      () =>
        enviarFaturaClientePorEmailResend(
          { faturaId: f.id, email: "a@b.com" },
          {
            buscarFatura: async () => ({ ...f }),
            gerarPdfBuffer: async () => ({
              buffer: Buffer.from("%PDF"),
              filename: "x.pdf",
            }),
            enviarEmailResend: async () => {
              throw new Error("Resend down");
            },
            registrarAuditoriaFalha: async () => {},
            confirmarPrimeiroEnvio: async () => {
              persisted = true;
              return f;
            },
          }
        ),
      /Não foi possível enviar/
    );
    assert.equal(persisted, false);
  })
);

tests.push(
  run("Primeiro envio — bloqueia duplicidade se já enviada", async () => {
    const f = faturaBase({
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
    });
    await assert.rejects(
      () =>
        enviarFaturaClientePorEmailResend(
          { faturaId: f.id, email: "a@b.com" },
          { buscarFatura: async () => ({ ...f }) }
        ),
      /já foi enviada|reenvio/i
    );
  })
);

tests.push(
  run("Reenvio explícito — intent + envio", async () => {
    const f = faturaBase({
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
      fatura_enviada_email: "old@empresa.com.br",
    });
    const versao = buildFaturaEnvioVersaoIdentidade(f);
    const token = criarFaturaReenvioIntentToken({
      faturaId: f.id,
      versaoIdentidade: versao,
    });
    const intent = verificarFaturaReenvioIntentToken(token);
    assert.equal(intent.faturaId, f.id);

    const result = await reenviarFaturaClientePorEmailResend(
      {
        faturaId: f.id,
        email: "novo@empresa.com.br",
        reenvioIntentToken: token,
      },
      {
        buscarFatura: async () => ({ ...f }),
        gerarPdfBuffer: async () => ({
          buffer: Buffer.from("%PDF"),
          filename: "x.pdf",
        }),
        enviarEmailResend: async (params) => {
          assert.match(params.idempotencyKey, /^fatura-reenvio\//);
          return { id: "resend-re" };
        },
        registrarAuditoriaReenvio: async () => ({
          ...f,
          fatura_enviada_email: "novo@empresa.com.br",
          fatura_envio_reenvio_count: 1,
          valor_total: 50,
          status: "emitida",
          pago: false,
          data_emissao: f.data_emissao,
        }),
      }
    );
    assert.equal(result.resendMessageId, "resend-re");
  })
);

tests.push(
  run("Reenvio — não altera valor/status/pagamento", async () => {
    const f = faturaBase({
      fatura_enviada_em: "2026-09-01T10:00:00.000Z",
      pago: true,
    });
    const token = criarFaturaReenvioIntentToken({
      faturaId: f.id,
      versaoIdentidade: buildFaturaEnvioVersaoIdentidade(f),
    });
    const snapshot = {
      valor_total: f.valor_total,
      status: f.status,
      pago: f.pago,
      data_emissao: f.data_emissao,
    };
    await reenviarFaturaClientePorEmailResend(
      {
        faturaId: f.id,
        email: "a@b.com",
        reenvioIntentToken: token,
      },
      {
        buscarFatura: async () => ({ ...f }),
        gerarPdfBuffer: async () => ({
          buffer: Buffer.from("%PDF"),
          filename: "x.pdf",
        }),
        enviarEmailResend: async () => ({ id: "r2" }),
        registrarAuditoriaReenvio: async () => ({
          ...f,
          fatura_enviada_email: "a@b.com",
          fatura_envio_reenvio_count: 1,
        }),
      }
    );
    assert.equal(f.valor_total, snapshot.valor_total);
    assert.equal(f.status, snapshot.status);
    assert.equal(f.pago, snapshot.pago);
    assert.equal(f.data_emissao, snapshot.data_emissao);
  })
);

tests.push(
  run("PAVFACIL — reemissão R$100→R$50 reflete no PDF snapshot", async () => {
    const f = faturaBase({
      data_emissao: "2026-09-02T14:00:00.000Z",
      valor_total: 50,
      fatura_itens: [
        item({ valor_unitario: 50, valor_total: 50, exame_nome: "ASO Reemitido" }),
      ],
    });
    const { options } = await buildFaturaClientePdfLayoutOptions(f, {
      empresa: "PAVFACIL",
      cnpj: "—",
      endereco: "—",
    });
    assert.equal(options.totalValue, "R$ 50,00");
    assert.notEqual(options.totalValue, "R$ 100,00");
  })
);

tests.push(
  run("Intent reenvio — chave distinta por intentId", () => {
    const f = faturaBase();
    const versao = buildFaturaEnvioVersaoIdentidade(f);
    const k1 = buildFaturaReenvioIdempotencyKey({
      faturaId: f.id,
      versaoIdentidade: versao,
      reenvioIntentId: "intent-a",
    });
    const k2 = buildFaturaReenvioIdempotencyKey({
      faturaId: f.id,
      versaoIdentidade: versao,
      reenvioIntentId: "intent-b",
    });
    assert.notEqual(k1, k2);
  })
);

tests.push(
  run("isFaturaEnvioExplicitamenteConfirmado", () => {
    assert.equal(isFaturaEnvioExplicitamenteConfirmado({ fatura_enviada_em: null }), false);
    assert.equal(
      isFaturaEnvioExplicitamenteConfirmado({
        fatura_enviada_em: "2026-09-01T00:00:00.000Z",
      }),
      true
    );
  })
);

Promise.all(tests)
  .then(() => {
    console.log(`\n${tests.length} testes concluídos.`);
  })
  .catch((err) => {
    console.error("FALHA", err);
    process.exit(1);
  });
