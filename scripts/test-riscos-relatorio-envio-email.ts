/**
 * Envio automático do relatório de Riscos por e-mail (Resend).
 * Executar: npx tsx scripts/test-riscos-relatorio-envio-email.ts
 */
import assert from "node:assert/strict";
import {
  buildAssuntoRelatorioRiscosEmail,
  buildRelatorioRiscosEnvioEmailHtml,
} from "../lib/email/templates/relatorio-riscos-envio-email";
import {
  getResendApiKey,
  getResendFromAddress,
  getResendReplyToAddress,
} from "../lib/email/resend-config";
import { isRiscosStaffPerfil } from "../lib/riscos-api-auth.server";
import { isEmailValido } from "../lib/email-validacao";
import {
  nomeArquivoPdfRelatorioRiscos,
  nomeArquivoPdfRelatorioRiscosEmail,
  sanitizarNomeArquivoEmpresa,
} from "../lib/riscos-relatorio-pdf";
import {
  isTrustedAppHost,
  resolveAppBaseUrl,
  RISCOS_APP_PRODUCTION_HOST,
} from "../lib/riscos-relatorio-app-base-url";
import {
  buildRelatorioEnvioIdempotencyKey,
  buildRelatorioReenvioIdempotencyKey,
} from "../lib/riscos-relatorio-envio-idempotency";
import {
  criarReenvioIntentToken,
  verificarReenvioIntentToken,
} from "../lib/riscos-relatorio-reenvio-intent-token";
import {
  criarRelatorioPrintToken,
  verificarRelatorioPrintToken,
} from "../lib/riscos-relatorio-print-token";
import { enviarRelatorioRiscosPorEmailResend } from "../services/riscos-relatorio-envio-email.server";
import {
  prepararReenvioRelatorioRiscos,
  reenviarRelatorioRiscosPorEmailResend,
} from "../services/riscos-relatorio-reenvio-email.server";
import type { RiscosRelatorioRecord } from "../lib/riscos-relatorio";

function run(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    await fn();
    console.log(`OK  ${name}`);
  })();
}

function mockRequest(host: string, proto = "https"): Request {
  return new Request("https://internal/api", {
    headers: {
      host,
      "x-forwarded-host": host,
      "x-forwarded-proto": proto,
    },
  });
}

type EnvSnapshot = Record<string, string | undefined>;

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

function snapshotEnv(keys: string[]): EnvSnapshot {
  const snap: EnvSnapshot = {};
  for (const k of keys) snap[k] = process.env[k];
  return snap;
}

function restoreEnv(snap: EnvSnapshot) {
  for (const [k, v] of Object.entries(snap)) {
    setEnv(k, v);
  }
}

const ENV_KEYS = [
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;

const relatorioMock: RiscosRelatorioRecord = {
  id: "rel-1",
  campanha_id: "camp-1",
  cliente_id: "cli-1",
  codigo_publico: "RISC-001",
  empresa_nome: "JA Soluções",
  gerado_em: "2026-09-02T10:00:00.000Z",
  gerado_por: "Admin",
  gerado_por_user_id: "u1",
  participantes: 10,
  respondentes: 10,
  pendentes: 0,
  taxa_participacao: 100,
  resultado_json: {
    capa: {
      empresaNome: "JA Soluções",
      codigoPublico: "RISC-001",
      dataInicio: "2026-08-01",
      dataEncerramento: "2026-08-31",
      participantes: 10,
      respondentes: 10,
      pendentes: 0,
      taxaParticipacao: 100,
    },
  } as RiscosRelatorioRecord["resultado_json"],
  status: "gerado",
  pdf_url: null,
  relatorio_enviado_em: null,
  relatorio_enviado_email: null,
  relatorio_enviado_por: null,
  relatorio_enviado_por_user_id: null,
};

const relatorioEnviadoMock: RiscosRelatorioRecord = {
  ...relatorioMock,
  relatorio_enviado_em: "2026-09-02T11:00:00.000Z",
  relatorio_enviado_email: "cliente@empresa.com.br",
  relatorio_enviado_por: "Staff",
};

const tests: Promise<void>[] = [];

tests.push(
  run("URL — produção via sst.navarroeng.com.br usa host da Request", () => {
    const snap = snapshotEnv([...ENV_KEYS]);
    try {
      setEnv("NODE_ENV", "production");
      setEnv("VERCEL", "1");
      setEnv("VERCEL_ENV", "production");
      setEnv("VERCEL_URL", "agendamento-exames.vercel.app");
      setEnv("NEXT_PUBLIC_APP_URL", undefined);

      const base = resolveAppBaseUrl(
        mockRequest(RISCOS_APP_PRODUCTION_HOST, "https")
      );
      assert.equal(base, `https://${RISCOS_APP_PRODUCTION_HOST}`);
    } finally {
      restoreEnv(snap);
    }
  })
);

tests.push(
  run("URL — preview Vercel sem Request usa VERCEL_URL", () => {
    const snap = snapshotEnv([...ENV_KEYS]);
    try {
      setEnv("NODE_ENV", "production");
      setEnv("VERCEL", "1");
      setEnv("VERCEL_ENV", "preview");
      setEnv("VERCEL_URL", "agendamento-exames-git-feature.vercel.app");
      setEnv("NEXT_PUBLIC_APP_URL", undefined);

      const base = resolveAppBaseUrl();
      assert.equal(base, "https://agendamento-exames-git-feature.vercel.app");
    } finally {
      restoreEnv(snap);
    }
  })
);

tests.push(
  run("URL — desenvolvimento local permite localhost", () => {
    const snap = snapshotEnv([...ENV_KEYS]);
    try {
      setEnv("NODE_ENV", "development");
      setEnv("VERCEL", undefined);
      setEnv("VERCEL_URL", undefined);
      setEnv("NEXT_PUBLIC_APP_URL", undefined);

      assert.equal(resolveAppBaseUrl(), "http://localhost:3000");
      assert.equal(
        resolveAppBaseUrl(mockRequest("localhost:3000", "http")),
        "http://localhost:3000"
      );
    } finally {
      restoreEnv(snap);
    }
  })
);

tests.push(
  run("URL — host não confiável não controla Playwright (SSRF)", () => {
    const snap = snapshotEnv([...ENV_KEYS]);
    try {
      setEnv("NODE_ENV", "production");
      setEnv("VERCEL", "1");
      setEnv("VERCEL_ENV", "production");
      setEnv("VERCEL_URL", "agendamento-exames.vercel.app");
      setEnv("NEXT_PUBLIC_APP_URL", undefined);

      assert.equal(isTrustedAppHost("evil.example.com"), false);
      const base = resolveAppBaseUrl(
        mockRequest("evil.example.com", "https")
      );
      assert.equal(base, "https://agendamento-exames.vercel.app");
    } finally {
      restoreEnv(snap);
    }
  })
);

tests.push(
  run("idempotency — mesma versão gera mesma chave", () => {
    const keyA = buildRelatorioEnvioIdempotencyKey({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: "2026-09-02T10:00:00.000Z",
    });
    const keyB = buildRelatorioEnvioIdempotencyKey({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: "2026-09-02T10:00:00.000Z",
    });
    assert.equal(keyA, keyB);
    assert.equal(
      keyA,
      "riscos-relatorio-envio/camp-1/rel-1/2026-09-02T10:00:00.000Z"
    );
  })
);

tests.push(
  run("idempotency — regeneração (novo gerado_em) gera nova chave", () => {
    const antes = buildRelatorioEnvioIdempotencyKey({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: "2026-09-02T10:00:00.000Z",
    });
    const depois = buildRelatorioEnvioIdempotencyKey({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: "2026-09-02T15:30:00.000Z",
    });
    assert.notEqual(antes, depois);
  })
);

tests.push(
  run("9 — envio bem-sucedido confirma processo após Resend", async () => {
    let confirmou = false;
    let idempotencyKey = "";
    let resendCalls = 0;

    const result = await enviarRelatorioRiscosPorEmailResend(
      { campanhaId: "camp-1", email: "cliente@empresa.com.br" },
      {
        validarCampanhaParaEnvio: async () => {},
        buscarRelatorio: async () => relatorioMock,
        gerarPdfBuffer: async () => Buffer.from("%PDF-mock"),
        enviarEmailResend: async (p) => {
          resendCalls += 1;
          idempotencyKey = p.idempotencyKey;
          return { id: "resend-msg-1" };
        },
        confirmarEnvio: async () => {
          confirmou = true;
          return {
            ...relatorioMock,
            relatorio_enviado_em: "2026-09-02T11:00:00.000Z",
            relatorio_enviado_email: "cliente@empresa.com.br",
          };
        },
      }
    );

    assert.equal(confirmou, true);
    assert.equal(result.resendMessageId, "resend-msg-1");
    assert.equal(resendCalls, 1);
    assert.equal(
      idempotencyKey,
      "riscos-relatorio-envio/camp-1/rel-1/2026-09-02T10:00:00.000Z"
    );
  })
);

tests.push(
  run("8 — falha do Resend não conclui processo", async () => {
    let confirmou = false;
    await assert.rejects(
      () =>
        enviarRelatorioRiscosPorEmailResend(
          { campanhaId: "camp-1", email: "cliente@empresa.com.br" },
          {
            validarCampanhaParaEnvio: async () => {},
            buscarRelatorio: async () => relatorioMock,
            gerarPdfBuffer: async () => Buffer.from("pdf"),
            enviarEmailResend: async () => {
              throw new Error("Resend API error");
            },
            confirmarEnvio: async () => {
              confirmou = true;
              return relatorioMock;
            },
          }
        ),
      /Não foi possível enviar o relatório/
    );
    assert.equal(confirmou, false);
  })
);

tests.push(
  run("7 — relatório já enviado não chama Resend (check inicial)", async () => {
    let resendCalls = 0;
    await assert.rejects(
      () =>
        enviarRelatorioRiscosPorEmailResend(
          { campanhaId: "camp-1", email: "a@b.com" },
          {
            validarCampanhaParaEnvio: async () => {},
            buscarRelatorio: async () => ({
              ...relatorioMock,
              relatorio_enviado_em: "2026-09-02T11:00:00.000Z",
            }),
            gerarPdfBuffer: async () => Buffer.from("pdf"),
            enviarEmailResend: async () => {
              resendCalls += 1;
              return { id: "x" };
            },
            confirmarEnvio: async () => relatorioMock,
          }
        ),
      /já foi confirmado/
    );
    assert.equal(resendCalls, 0);
  })
);

tests.push(
  run("7b — re-check pré-Resend aborta se envio confirmado entre PDF e e-mail", async () => {
    let resendCalls = 0;
    let fetchCount = 0;
    await assert.rejects(
      () =>
        enviarRelatorioRiscosPorEmailResend(
          { campanhaId: "camp-1", email: "a@b.com" },
          {
            validarCampanhaParaEnvio: async () => {},
            buscarRelatorio: async () => {
              fetchCount += 1;
              if (fetchCount <= 1) return relatorioMock;
              return {
                ...relatorioMock,
                relatorio_enviado_em: "2026-09-02T11:00:00.000Z",
              };
            },
            gerarPdfBuffer: async () => Buffer.from("pdf"),
            enviarEmailResend: async () => {
              resendCalls += 1;
              return { id: "x" };
            },
            confirmarEnvio: async () => relatorioMock,
          }
        ),
      /já foi confirmado/
    );
    assert.equal(resendCalls, 0);
    assert.equal(fetchCount, 2);
  })
);

tests.push(
  run("5 — duas tentativas mesma versão usam mesma idempotency key", async () => {
    const keys: string[] = [];
    const deps = {
      validarCampanhaParaEnvio: async () => {},
      buscarRelatorio: async () => relatorioMock,
      gerarPdfBuffer: async () => Buffer.from("pdf"),
      enviarEmailResend: async (p: { idempotencyKey: string }) => {
        keys.push(p.idempotencyKey);
        return { id: "id" };
      },
      confirmarEnvio: async () => relatorioMock,
    };

    await enviarRelatorioRiscosPorEmailResend(
      { campanhaId: "camp-1", email: "a@b.com" },
      deps
    );
    await enviarRelatorioRiscosPorEmailResend(
      { campanhaId: "camp-1", email: "a@b.com" },
      deps
    );

    assert.equal(keys.length, 2);
    assert.equal(keys[0], keys[1]);
  })
);

tests.push(
  run("3 — ausência de RESEND_API_KEY", () => {
    const prev = process.env.RESEND_API_KEY;
    setEnv("RESEND_API_KEY", undefined);
    try {
      assert.throws(
        () => getResendApiKey(),
        /RESEND_API_KEY não configurada/
      );
    } finally {
      setEnv("RESEND_API_KEY", prev);
    }
  })
);

tests.push(
  run("4 — destinatário inválido", async () => {
    await assert.rejects(
      () =>
        enviarRelatorioRiscosPorEmailResend(
          { campanhaId: "camp-1", email: "invalido" },
          {
            validarCampanhaParaEnvio: async () => {},
            buscarRelatorio: async () => relatorioMock,
            gerarPdfBuffer: async () => Buffer.from("pdf"),
            enviarEmailResend: async (p) => ({ id: p.idempotencyKey }),
            confirmarEnvio: async () => relatorioMock,
          }
        ),
      /e-mail válido/
    );
  })
);

tests.push(
  run("PDF anexado com conteúdo", async () => {
    const pdf = Buffer.from("%PDF-1.4 mock content");
    let receivedLen = 0;
    await enviarRelatorioRiscosPorEmailResend(
      { campanhaId: "camp-1", email: "a@b.com" },
      {
        validarCampanhaParaEnvio: async () => {},
        buscarRelatorio: async () => relatorioMock,
        gerarPdfBuffer: async () => pdf,
        enviarEmailResend: async (p) => {
          receivedLen = p.attachmentContent.length;
          return { id: "id" };
        },
        confirmarEnvio: async () => relatorioMock,
      }
    );
    assert.equal(receivedLen, pdf.length);
  })
);

tests.push(
  run("nome do arquivo sanitizado", () => {
    assert.equal(
      nomeArquivoPdfRelatorioRiscosEmail("JA Soluções!!"),
      "Relatorio_Riscos_Psicossociais_JA_Solucoes.pdf"
    );
  })
);

tests.push(
  run("nome da empresa no assunto", () => {
    const assunto = buildAssuntoRelatorioRiscosEmail("Acme Ltda");
    assert.equal(
      assunto,
      "Relatório de Avaliação dos Riscos Psicossociais – Acme Ltda"
    );
  })
);

tests.push(
  run("usuário não staff não passa na validação de perfil", () => {
    assert.equal(isRiscosStaffPerfil("cliente"), false);
    assert.equal(isRiscosStaffPerfil("admin"), true);
  })
);

tests.push(
  run("10 — download manual mantém nome com data", () => {
    const manual = nomeArquivoPdfRelatorioRiscos(
      "Empresa X",
      "2026-08-12T12:00:00.000Z"
    );
    assert.match(
      manual,
      /^Relatorio_Riscos_Psicossociais_Empresa_X_\d{2}-\d{2}-\d{4}\.pdf$/
    );
    const email = nomeArquivoPdfRelatorioRiscosEmail("Empresa X");
    assert.equal(email, "Relatorio_Riscos_Psicossociais_Empresa_X.pdf");
  })
);

tests.push(
  run("Playwright recebe baseUrl da Request SST", async () => {
    const snap = snapshotEnv([...ENV_KEYS]);
    let capturedBase = "";
    try {
      setEnv("NODE_ENV", "production");
      setEnv("VERCEL", "1");
      setEnv("VERCEL_ENV", "production");
      setEnv("VERCEL_URL", "agendamento-exames.vercel.app");

      await enviarRelatorioRiscosPorEmailResend(
        {
          campanhaId: "camp-1",
          email: "a@b.com",
          request: mockRequest(RISCOS_APP_PRODUCTION_HOST),
        },
        {
          validarCampanhaParaEnvio: async () => {},
          buscarRelatorio: async () => relatorioMock,
          gerarPdfBuffer: async (opts) => {
            capturedBase = opts.baseUrl;
            return Buffer.from("pdf");
          },
          enviarEmailResend: async (p) => ({ id: p.idempotencyKey }),
          confirmarEnvio: async () => relatorioMock,
        }
      );

      assert.equal(capturedBase, `https://${RISCOS_APP_PRODUCTION_HOST}`);
    } finally {
      restoreEnv(snap);
    }
  })
);

tests.push(
  run("template HTML — layout definitivo com artes HTTPS", () => {
    const html = buildRelatorioRiscosEnvioEmailHtml({
      empresaNome: "Teste SA",
      assetsBaseUrl: "https://sst.navarroeng.com.br",
    });
    assert.match(
      html,
      /https:\/\/sst\.navarroeng\.com\.br\/email\/riscos-psicossociais\/cabecalho\.jpg/
    );
    assert.match(
      html,
      /https:\/\/sst\.navarroeng\.com\.br\/email\/riscos-psicossociais\/rodape\.jpg/
    );
    assert.match(html, /Teste SA/);
    assert.match(html, /Empresa avaliada/);
    assert.match(html, /Relatório de Avaliação dos Riscos Psicossociais/);
    assert.match(html, /display:block/);
    assert.match(html, /max-width:640px/);
    assert.doesNotMatch(html, /HEADER_ART_SLOT/);
    assert.doesNotMatch(html, /FOOTER_ART_SLOT/);
    assert.doesNotMatch(html, /Atenciosamente/);
    assert.doesNotMatch(html, /97706-5599/);
    assert.doesNotMatch(html, /contato@navarroeng\.com\.br/);
    assert.doesNotMatch(html, /confidencial/);
  })
);

tests.push(
  run("token de impressão assina e expira", () => {
    setEnv("RISCOS_RELATORIO_PRINT_SECRET", "test-secret");
    const token = criarRelatorioPrintToken({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      ttlMs: 60_000,
    });
    const payload = verificarRelatorioPrintToken(token);
    assert.equal(payload.campanhaId, "camp-1");
  })
);

tests.push(
  run("remetente e reply-to padrão Navarro", () => {
    setEnv("RESEND_FROM", undefined);
    setEnv("RESEND_REPLY_TO", undefined);
    assert.match(getResendFromAddress(), /relatorios@docs\.navarroeng\.com\.br/);
    assert.equal(getResendReplyToAddress(), "contato@navarroeng.com.br");
  })
);

tests.push(
  run("reenvio — primeiro envio e reenvio usam idempotency keys diferentes", () => {
    setEnv("RISCOS_RELATORIO_REENVIO_SECRET", "test-reenvio");
    const primeiro = buildRelatorioEnvioIdempotencyKey({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: relatorioMock.gerado_em,
    });
    const token = criarReenvioIntentToken({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: relatorioMock.gerado_em,
    });
    const intent = verificarReenvioIntentToken(token);
    const reenvio = buildRelatorioReenvioIdempotencyKey({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: relatorioMock.gerado_em,
      reenvioIntentId: intent.intentId,
    });
    assert.notEqual(primeiro, reenvio);
    assert.match(reenvio, /^riscos-relatorio-reenvio\//);
  })
);

tests.push(
  run("reenvio — explícito funciona sem alterar gerado_em", async () => {
    setEnv("RISCOS_RELATORIO_REENVIO_SECRET", "test-reenvio");
    let auditRegistrada = false;
    const token = criarReenvioIntentToken({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: relatorioEnviadoMock.gerado_em,
    });

    const result = await reenviarRelatorioRiscosPorEmailResend(
      {
        campanhaId: "camp-1",
        email: "outro@empresa.com.br",
        reenvioIntentToken: token,
      },
      {
        validarCampanhaParaEnvio: async () => {},
        buscarRelatorio: async () => relatorioEnviadoMock,
        gerarPdfBuffer: async () => Buffer.from("pdf"),
        enviarEmailResend: async (p) => {
          assert.match(p.idempotencyKey, /^riscos-relatorio-reenvio\//);
          return { id: "resend-reenvio-1" };
        },
        registrarAuditoriaReenvio: async () => {
          auditRegistrada = true;
        },
      }
    );

    assert.equal(auditRegistrada, true);
    assert.equal(result.relatorio.gerado_em, relatorioEnviadoMock.gerado_em);
    assert.equal(
      result.relatorio.relatorio_enviado_em,
      relatorioEnviadoMock.relatorio_enviado_em
    );
    assert.equal(result.resendMessageId, "resend-reenvio-1");
  })
);

tests.push(
  run("reenvio — duplo clique com mesmo intent usa mesma idempotency key", async () => {
    setEnv("RISCOS_RELATORIO_REENVIO_SECRET", "test-reenvio");
    const token = criarReenvioIntentToken({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: relatorioEnviadoMock.gerado_em,
    });
    const keys: string[] = [];
    const deps = {
      validarCampanhaParaEnvio: async () => {},
      buscarRelatorio: async () => relatorioEnviadoMock,
      gerarPdfBuffer: async () => Buffer.from("pdf"),
      enviarEmailResend: async (p: { idempotencyKey: string }) => {
        keys.push(p.idempotencyKey);
        return { id: "x" };
      },
      registrarAuditoriaReenvio: async () => {},
    };

    await reenviarRelatorioRiscosPorEmailResend(
      { campanhaId: "camp-1", email: "a@b.com", reenvioIntentToken: token },
      deps
    );
    await reenviarRelatorioRiscosPorEmailResend(
      { campanhaId: "camp-1", email: "a@b.com", reenvioIntentToken: token },
      deps
    );

    assert.equal(keys.length, 2);
    assert.equal(keys[0], keys[1]);
  })
);

tests.push(
  run("reenvio — falha Resend mantém registro de envio anterior", async () => {
    setEnv("RISCOS_RELATORIO_REENVIO_SECRET", "test-reenvio");
    const token = criarReenvioIntentToken({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: relatorioEnviadoMock.gerado_em,
    });

    await assert.rejects(
      () =>
        reenviarRelatorioRiscosPorEmailResend(
          {
            campanhaId: "camp-1",
            email: "a@b.com",
            reenvioIntentToken: token,
          },
          {
            validarCampanhaParaEnvio: async () => {},
            buscarRelatorio: async () => relatorioEnviadoMock,
            gerarPdfBuffer: async () => Buffer.from("pdf"),
            enviarEmailResend: async () => {
              throw new Error("Resend fail");
            },
          }
        ),
      /Não foi possível reenviar/
    );
  })
);

tests.push(
  run("reenvio — bloqueado se envio inicial ainda não confirmado", async () => {
    await assert.rejects(
      () =>
        prepararReenvioRelatorioRiscos("camp-1", {
          validarCampanhaParaEnvio: async () => {},
          buscarRelatorio: async () => relatorioMock,
        }),
      /ainda não foi enviado/
    );
  })
);

tests.push(
  run("reenvio — nova versão após regeneração exige novo intent", async () => {
    setEnv("RISCOS_RELATORIO_REENVIO_SECRET", "test-reenvio");
    const token = criarReenvioIntentToken({
      campanhaId: "camp-1",
      relatorioId: "rel-1",
      geradoEm: "2026-09-02T10:00:00.000Z",
    });

    await assert.rejects(
      () =>
        reenviarRelatorioRiscosPorEmailResend(
          {
            campanhaId: "camp-1",
            email: "a@b.com",
            reenvioIntentToken: token,
          },
          {
            validarCampanhaParaEnvio: async () => {},
            buscarRelatorio: async () => ({
              ...relatorioEnviadoMock,
              gerado_em: "2026-09-02T15:00:00.000Z",
            }),
            gerarPdfBuffer: async () => Buffer.from("pdf"),
            enviarEmailResend: async () => ({ id: "x" }),
          }
        ),
      /versão do relatório mudou/
    );
  })
);

tests.push(
  run("primeiro envio — continua bloqueado após enviado", async () => {
    await assert.rejects(
      () =>
        enviarRelatorioRiscosPorEmailResend(
          { campanhaId: "camp-1", email: "a@b.com" },
          {
            validarCampanhaParaEnvio: async () => {},
            buscarRelatorio: async () => relatorioEnviadoMock,
            gerarPdfBuffer: async () => Buffer.from("pdf"),
            enviarEmailResend: async () => ({ id: "x" }),
            confirmarEnvio: async () => relatorioEnviadoMock,
          }
        ),
      /já foi confirmado/
    );
  })
);

Promise.all(tests)
  .then(() => {
    console.log("\nTodos os testes de envio por e-mail passaram.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
