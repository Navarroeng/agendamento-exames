/**
 * Lembrete manual de fatura de cliente.
 * Executar: npx tsx scripts/test-fatura-lembrete.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.AVALIACAO_SESSION_SECRET ??= "test-fatura-lembrete-secret";

import { formatDateIsoSaoPaulo, todayIsoSaoPaulo } from "../lib/agendamento-datetime";
import { buildFaturaClienteLembreteEmailHtml } from "../lib/email/templates/fatura-cliente-lembrete-email";
import { buildFaturaClienteEnvioEmailHtml } from "../lib/email/templates/fatura-cliente-envio-email";
import { isFaturasStaffPerfil } from "../lib/faturas-api-auth.server";
import { buildFaturaLembreteIdempotencyKey } from "../lib/fatura-envio-idempotency";
import {
  buildLembreteFaturaTexto,
  classificarVencimentoLembrete,
  competenciaLembreteExtenso,
  dataVencimentoCivil,
  decidirReservaLote,
  diasAtrasoCivil,
  explicacaoBotaoLembretesHoje,
  explicacaoBotaoLembretesVencidas,
  faturaElegivelLembreteHoje,
  faturaElegivelLembreteVencida,
  faturaEstaVencidaParaLembrete,
  faturaPermiteLembrete,
  montarConfirmacaoLembretesHoje,
  motivoBloqueioLembrete,
  numeroCurtoFatura,
  textoUltimoLembrete,
  validarConteudoLembrete,
  type FaturaLembreteHojeAlvo,
} from "../lib/fatura-lembrete";
import { nomeArquivoPdfFaturaClienteEmail } from "../lib/fatura-pdf";
import type { FaturaComItens, FaturaItemRecord } from "../lib/types";
import { enviarLembreteFaturaClienteResend, enviarLembreteFaturaClienteComTrava } from "../services/fatura-lembrete-email.server";
import {
  consultarLembretesHoje,
  consultarLembretesVencidas,
  executarLembreteHojeUma,
  executarLembreteVencidaUma,
  executarLembretesHoje,
  executarLembretesVencidas,
  listarPaginas,
  type LembretesHojeDeps,
} from "../services/fatura-lembrete-lote.server";

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
  run("Texto — vencimento hoje descreve os exames do mês de referência", () => {
    const texto = buildLembreteFaturaTexto({
      numero: "FAT-CLI-2026-00102",
      clienteNome: "PAVFACIL",
      valor: 50,
      dataVencimento: "2026-10-05",
      hojeIso: "2026-10-05",
      mesReferencia: "2026-09",
      escopo: "exames_ocupacionais",
    });
    assert.equal(texto.vencida, false);
    assert.equal(
      texto.assunto,
      "Lembrete de vencimento — Exames Ocupacionais — Fatura 00102 (Setembro/2026) | Navarro Engenharia"
    );
    assert.equal(
      texto.mensagem,
      [
        "Olá, PAVFACIL.",
        "",
        "Passando para lembrar que a fatura referente aos exames ocupacionais realizados no mês de setembro/2026, no valor de R$ 50,00, vence na data de hoje.",
        "",
        "Os dados para pagamento estão disponíveis abaixo.",
        "",
        "Caso o pagamento já tenha sido realizado, por favor, desconsidere este lembrete e encaminhe o comprovante para conferência.",
        "",
        "Atenciosamente,",
        "Navarro Engenharia",
      ].join("\n")
    );
    assert.doesNotMatch(texto.mensagem, /FAT-CLI-2026-00102/);
    assert.doesNotMatch(texto.mensagem, /05\/10\/2026|outubro\/2026/i);
    assert.doesNotMatch(texto.mensagem, /juros|multa/i);
  })
);

tests.push(
  run("Texto — vencimento futuro informa a data real e a competência da fatura", () => {
    const texto = buildLembreteFaturaTexto({
      numero: "FAT-CLI-2026-00102",
      clienteNome: "PAVFACIL",
      valor: 50,
      dataVencimento: "2026-10-20",
      hojeIso: "2026-10-05",
      mesReferencia: "2026-09",
      escopo: "exames_ocupacionais",
    });
    assert.equal(texto.vencida, false);
    assert.equal(
      texto.assunto,
      "Lembrete de vencimento — Exames Ocupacionais — Fatura 00102 (Setembro/2026) | Navarro Engenharia"
    );
    assert.match(
      texto.mensagem,
      /Passando para lembrar que a fatura referente aos exames ocupacionais realizados no mês de setembro\/2026, no valor de R\$ 50,00, tem vencimento em 20\/10\/2026/
    );
    assert.doesNotMatch(texto.mensagem, /FAT-CLI-2026-00102/);
    assert.doesNotMatch(texto.assunto, /hoje/i);
    assert.doesNotMatch(texto.mensagem, /\bhoje\b/i);
    assert.doesNotMatch(texto.mensagem, /outubro\/2026/i);
  })
);

tests.push(
  run("Texto — vencida descreve os exames e mantém o pagamento em aberto", () => {
    const texto = buildLembreteFaturaTexto({
      numero: "FAT-CLI-2026-00102",
      clienteNome: "PAVFACIL",
      valor: 1250.5,
      dataVencimento: "2026-10-04",
      hojeIso: "2026-10-05",
      mesReferencia: "2026-09",
      escopo: "exames_ocupacionais",
    });
    assert.equal(texto.vencida, true);
    assert.equal(
      texto.assunto,
      "Fatura vencida — Exames Ocupacionais nº 00102 (Setembro/2026) | Navarro Engenharia"
    );
    assert.match(
      texto.mensagem,
      /Até o momento, não identificamos o pagamento da fatura referente aos exames ocupacionais realizados no mês de setembro\/2026, no valor de R\$ 1\.250,50, com vencimento em 04\/10\/2026/
    );
    assert.match(texto.mensagem, /regularização do pagamento/);
    assert.doesNotMatch(texto.mensagem, /FAT-CLI-2026-00102/);
    assert.doesNotMatch(texto.assunto, /hoje/i);
    assert.doesNotMatch(texto.mensagem, /\bhoje\b/i);
  })
);

tests.push(
  run("Texto — competência ausente ou outro serviço conserva o número da fatura", () => {
    assert.equal(competenciaLembreteExtenso({ mesReferencia: "2026-09" }), "setembro/2026");
    assert.equal(
      competenciaLembreteExtenso({
        mesReferencia: null,
        periodoInicio: "2026-09-01T00:00:00.000Z",
      }),
      "setembro/2026"
    );
    assert.equal(
      competenciaLembreteExtenso({ mesReferencia: "2026-09", periodoInicio: "2026-08-01" }),
      "setembro/2026"
    );
    assert.equal(competenciaLembreteExtenso({}), null);

    assert.equal(numeroCurtoFatura("FAT-CLI-2026-00132"), "00132");
    assert.equal(numeroCurtoFatura("FAT-CLI-00007"), "00007");
    assert.notEqual(numeroCurtoFatura("FAT-CLI-2026-00132"), "132");

    const semCompetencia = buildLembreteFaturaTexto({
      numero: "FAT-CLI-2026-00132",
      clienteNome: "PAVFACIL",
      valor: 50,
      dataVencimento: "2026-10-20",
      hojeIso: "2026-10-05",
      escopo: "exames_ocupacionais",
    });
    assert.equal(
      semCompetencia.assunto,
      "Lembrete de vencimento — Exames Ocupacionais — Fatura 00132 | Navarro Engenharia"
    );
    assert.match(
      semCompetencia.mensagem,
      /fatura referente aos exames ocupacionais realizados, no valor de R\$ 50,00, tem vencimento em 20\/10\/2026/
    );
    assert.doesNotMatch(semCompetencia.assunto, /\(/);
    assert.doesNotMatch(semCompetencia.mensagem, /no mês de|setembro\/2026|outubro\/2026/i);

    const outroServico = buildLembreteFaturaTexto({
      numero: "FAT-SRV-2026-00015",
      clienteNome: "PAVFACIL",
      valor: 50,
      dataVencimento: "2026-10-05",
      hojeIso: "2026-10-05",
      mesReferencia: "2026-09",
      escopo: "outro",
    });
    assert.equal(
      outroServico.assunto,
      "Lembrete de vencimento — Fatura 00015 (Setembro/2026) | Navarro Engenharia"
    );
    assert.match(
      outroServico.mensagem,
      /Lembramos que a fatura FAT-SRV-2026-00015, no valor de R\$ 50,00, vence na data de hoje/
    );
    assert.doesNotMatch(outroServico.assunto, /Exames Ocupacionais/);
    assert.doesNotMatch(outroServico.mensagem, /exames ocupacionais/i);
  })
);

tests.push(
  run("Datas — vencimento civil não desloca meia-noite UTC", () => {
    assert.equal(formatDateIsoSaoPaulo("2026-10-05T00:00:00.000Z"), "2026-10-04");
    assert.equal(dataVencimentoCivil("2026-10-05"), "2026-10-05");
    assert.equal(dataVencimentoCivil("2026-10-05T00:00:00.000Z"), "2026-10-05");
    assert.equal(
      classificarVencimentoLembrete("2026-10-05T00:00:00.000Z", "2026-10-05"),
      "hoje"
    );
    assert.equal(
      classificarVencimentoLembrete("2026-10-06T00:00:00.000Z", "2026-10-05"),
      "futuro"
    );
    const hojeSp = todayIsoSaoPaulo(new Date("2026-10-06T02:30:00.000Z"));
    assert.equal(hojeSp, "2026-10-05");
    const texto = buildLembreteFaturaTexto({
      numero: "FAT-CLI-2026-00102",
      clienteNome: "PAVFACIL",
      valor: 50,
      dataVencimento: "2026-10-05T00:00:00.000Z",
      hojeIso: hojeSp,
    });
    assert.match(texto.assunto, /Lembrete de vencimento — Fatura 00102/);
    assert.doesNotMatch(texto.assunto, /Fatura vencida/);
    assert.match(texto.mensagem, /vence na data de hoje/);
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
      mesReferencia: fatura.mes_referencia,
      periodoInicio: fatura.periodo_inicio,
      escopo: "exames_ocupacionais",
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
    assert.match(html, /agosto\/2026/);
    assert.match(html, /R\$ 50,00/);
    assert.match(html, /05\/10\/2026/);
    assert.doesNotMatch(html, /setembro\/2026/);
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

const HOJE = "2026-10-05";

function alvoHoje(
  overrides: Partial<FaturaLembreteHojeAlvo> = {}
): FaturaLembreteHojeAlvo {
  return {
    id: "fat-a",
    numero: "FAT-CLI-2026-00102",
    tipo: "cliente",
    status: "emitida",
    pago: false,
    referencia_id: "cli-a",
    referencia_nome: "PAVFACIL",
    data_vencimento: HOJE,
    mes_referencia: "2026-09",
    periodo_inicio: "2026-09-01",
    valor_total: 50,
    fatura_enviada_email: "financeiro@pavfacil.com.br",
    fatura_enviada_em: "2026-09-02T15:00:00.000Z",
    ...overrides,
  };
}

function depsLote(state: {
  faturas: FaturaLembreteHojeAlvo[];
  lembretes?: { fatura_id: string; enviado_em: string }[];
  reservar?: LembretesHojeDeps["reservar"];
  buscarFatura?: LembretesHojeDeps["buscarFatura"];
  enviarUm?: LembretesHojeDeps["enviarUm"];
}): {
  deps: LembretesHojeDeps;
  enviados: Parameters<LembretesHojeDeps["enviarUm"]>[0][];
} {
  const enviados: Parameters<LembretesHojeDeps["enviarUm"]>[0][] = [];
  const lembretes = state.lembretes ?? [];
  const deps: LembretesHojeDeps = {
    hojeIso: () => HOJE,
    agoraMs: () => Date.parse("2026-10-05T18:00:00.000Z"),
    listarCandidatas: async () => state.faturas,
    modo: "hoje",
    listarEnviosEmpresa: async (ids) =>
      state.faturas
        .filter(
          (fatura) =>
            fatura.referencia_id &&
            ids.includes(fatura.referencia_id) &&
            fatura.fatura_enviada_em &&
            fatura.fatura_enviada_email
        )
        .map((fatura) => ({
          id: fatura.id,
          referencia_id: fatura.referencia_id,
          fatura_enviada_email: fatura.fatura_enviada_email,
          fatura_enviada_em: fatura.fatura_enviada_em,
        })),
    listarLembretes: async (ids) =>
      lembretes.filter((item) => ids.includes(item.fatura_id)),
    buscarFatura:
      state.buscarFatura ??
      (async (id) => state.faturas.find((fatura) => fatura.id === id) ?? null),
    reservar: state.reservar ?? (async () => "ok"),
    liberar: async () => undefined,
    enviarUm:
      state.enviarUm ??
      (async (params) => {
        enviados.push(params);
        lembretes.push({
          fatura_id: params.faturaId,
          enviado_em: "2026-10-05T18:00:00.000Z",
        });
        return {
          enviadoEm: "2026-10-05T18:00:00.000Z",
          email: params.email,
          resendMessageId: `resend-${params.faturaId}`,
          reutilizado: false,
        };
      }),
  };
  return { deps, enviados };
}

tests.push(
  run("Lote — seleção ignora filtro, página, paga, cancelada e outro dia", async () => {
    const faturas = [
      alvoHoje(),
      alvoHoje({
        id: "fat-b",
        numero: "FAT-CLI-2026-00200",
        referencia_id: "cli-b",
        referencia_nome: "OUTRA LTDA",
      }),
      alvoHoje({ id: "paga", pago: true, numero: "PAGA" }),
      alvoHoje({ id: "cancelada", status: "cancelada", numero: "CANC" }),
      alvoHoje({ id: "vencida-status", status: "vencida", numero: "VENC" }),
      alvoHoje({ id: "amanha", data_vencimento: "2026-10-06", numero: "AMANHA" }),
      alvoHoje({ id: "ontem", data_vencimento: "2026-10-04", numero: "ONTEM" }),
      alvoHoje({ id: "clinica", tipo: "clinica", numero: "CLIN" }),
      alvoHoje({
        id: "timestamp",
        numero: "FAT-CLI-TS",
        data_vencimento: "2026-10-05T00:00:00.000Z",
        referencia_id: "cli-ts",
        referencia_nome: "TIMESTAMP",
        fatura_enviada_email: null,
      }),
      ...Array.from({ length: 100 }, (_, indice) =>
        alvoHoje({
          id: `extra-${indice}`,
          numero: `FAT-EXTRA-${indice}`,
          referencia_id: `cli-extra-${indice}`,
          referencia_nome: `EMPRESA ${indice}`,
          fatura_enviada_email: `financeiro${indice}@empresa.com.br`,
        })
      ),
    ];
    assert.equal(faturaElegivelLembreteHoje(faturas[2], HOJE), false);
    assert.equal(faturaElegivelLembreteHoje(faturas[3], HOJE), false);
    assert.equal(faturaElegivelLembreteHoje(faturas[4], HOJE), false);
    const { deps } = depsLote({ faturas });
    const painel = await consultarLembretesHoje(deps);
    const ids = painel.pendentes.map((item) => item.id);
    assert.equal(painel.elegiveis, 103);
    assert.ok(ids.includes("fat-a"));
    assert.ok(ids.includes("fat-b"));
    assert.ok(ids.includes("timestamp"));
    assert.ok(ids.includes("extra-99"));
    assert.equal(ids.includes("paga"), false);
    assert.equal(ids.includes("cancelada"), false);
    assert.equal(ids.includes("vencida-status"), false);
    assert.equal(ids.includes("amanha"), false);
    assert.equal(ids.includes("ontem"), false);
    assert.equal(ids.includes("clinica"), false);
    assert.equal(
      explicacaoBotaoLembretesHoje(painel.elegiveis, painel.pendentes.length),
      "103 faturas emitidas vencem hoje e ainda não tiveram lembrete aceito pelo Resend."
    );
  })
);

tests.push(
  run("Lote — um e-mail e um PDF por empresa, sem compartilhar destinatário", async () => {
    const faturas = [
      alvoHoje({ valor_total: 50 }),
      alvoHoje({
        id: "fat-b",
        numero: "FAT-CLI-2026-00200",
        referencia_id: "cli-b",
        referencia_nome: "OUTRA LTDA",
        valor_total: 80,
        mes_referencia: "2026-08",
        periodo_inicio: "2026-08-01",
        fatura_enviada_email: "financeiro@outra.com.br",
      }),
      alvoHoje({
        id: "sem-email",
        numero: "FAT-CLI-SEM",
        referencia_id: "cli-sem",
        referencia_nome: "SEM EMAIL",
        valor_total: 10,
        fatura_enviada_email: null,
        fatura_enviada_em: null,
      }),
    ];
    const confirmacao = montarConfirmacaoLembretesHoje([
      {
        id: "fat-a",
        numero: "FAT-CLI-2026-00102",
        empresa: "PAVFACIL",
        empresaChave: "id:cli-a",
        valor: 50,
        email: "financeiro@pavfacil.com.br",
      },
      {
        id: "fat-b",
        numero: "FAT-CLI-2026-00200",
        empresa: "OUTRA LTDA",
        empresaChave: "id:cli-b",
        valor: 80,
        email: "financeiro@outra.com.br",
      },
      {
        id: "sem-email",
        numero: "FAT-CLI-SEM",
        empresa: "SEM EMAIL",
        empresaChave: "id:cli-sem",
        valor: 10,
        email: "",
      },
    ]);
    assert.equal(confirmacao.faturas, 3);
    assert.equal(confirmacao.empresas, 3);
    assert.equal(confirmacao.destinatarios, 2);
    assert.equal(confirmacao.valorTotal, 130);
    assert.deepEqual(
      confirmacao.semEmail.map((item) => item.numero),
      ["FAT-CLI-SEM"]
    );

    const { deps, enviados } = depsLote({ faturas });
    const resultado = await executarLembretesHoje({}, deps);
    assert.equal(resultado.aceitos.length, 2);
    assert.equal(resultado.semEmail.length, 1);
    assert.equal(resultado.semEmail[0]?.numero, "FAT-CLI-SEM");
    assert.equal(resultado.falhas.length, 0);
    assert.equal(enviados.length, 2);
    assert.deepEqual(
      enviados.map((item) => item.email).sort(),
      ["financeiro@outra.com.br", "financeiro@pavfacil.com.br"]
    );
    const pav = enviados.find((item) => item.faturaId === "fat-a");
    const outra = enviados.find((item) => item.faturaId === "fat-b");
    assert.ok(pav);
    assert.ok(outra);
    assert.equal(
      pav.assunto,
      "Lembrete de vencimento — Exames Ocupacionais — Fatura 00102 (Setembro/2026) | Navarro Engenharia"
    );
    assert.match(pav.mensagem, /PAVFACIL/);
    assert.match(
      pav.mensagem,
      /exames ocupacionais realizados no mês de setembro\/2026/
    );
    assert.match(pav.mensagem, /vence na data de hoje/);
    assert.doesNotMatch(pav.mensagem, /FAT-CLI-2026-00102|agosto\/2026|OUTRA LTDA/);
    assert.doesNotMatch(pav.email, /outra/);
    assert.equal(
      outra.assunto,
      "Lembrete de vencimento — Exames Ocupacionais — Fatura 00200 (Agosto/2026) | Navarro Engenharia"
    );
    assert.match(outra.mensagem, /OUTRA LTDA/);
    assert.match(outra.mensagem, /agosto\/2026/);
    assert.doesNotMatch(outra.mensagem, /PAVFACIL|setembro\/2026|FAT-CLI-2026-00200/);
    assert.doesNotMatch(outra.mensagem, /PAVFACIL/);
    assert.equal(outra.email, "financeiro@outra.com.br");
    assert.notEqual(pav.requestId, outra.requestId);
  })
);

tests.push(
  run("Lote — falha parcial segue e a nova tentativa não duplica o aceite", async () => {
    const faturas = [
      alvoHoje(),
      alvoHoje({
        id: "fat-b",
        numero: "FAT-CLI-2026-00200",
        referencia_id: "cli-b",
        referencia_nome: "OUTRA LTDA",
        fatura_enviada_email: "financeiro@outra.com.br",
      }),
    ];
    let tentativasB = 0;
    const { deps, enviados } = depsLote({
      faturas,
      enviarUm: async (params) => {
        if (params.faturaId === "fat-b") {
          tentativasB += 1;
          if (tentativasB === 1) {
            throw new Error("Resend recusou a fatura FAT-CLI-2026-00200.");
          }
        }
        enviados.push(params);
        deps.listarLembretes = async (ids) =>
          enviados
            .filter((item) => ids.includes(item.faturaId))
            .map((item) => ({
              fatura_id: item.faturaId,
              enviado_em: "2026-10-05T18:00:00.000Z",
            }));
        return {
          enviadoEm: "2026-10-05T18:00:00.000Z",
          email: params.email,
          resendMessageId: `resend-${params.faturaId}`,
          reutilizado: false,
        };
      },
    });
    const primeiro = await executarLembretesHoje({}, deps);
    assert.equal(primeiro.aceitos.length, 1);
    assert.equal(primeiro.aceitos[0]?.faturaId, "fat-a");
    assert.equal(primeiro.falhas.length, 1);
    assert.match(primeiro.falhas[0]?.motivo ?? "", /FAT-CLI-2026-00200/);
    assert.equal(
      enviados.filter((item) => item.faturaId === "fat-a").length,
      1
    );

    const segundo = await executarLembretesHoje({}, deps);
    assert.equal(
      segundo.jaLembradas.some((item) => item.faturaId === "fat-a"),
      true
    );
    assert.equal(segundo.aceitos.length, 1);
    assert.equal(segundo.aceitos[0]?.faturaId, "fat-b");
    assert.equal(
      enviados.filter((item) => item.faturaId === "fat-a").length,
      1
    );
    assert.equal(
      enviados.filter((item) => item.faturaId === "fat-b").length,
      1
    );
  })
);

tests.push(
  run("Lote — lembrete individual aceito hoje não entra de novo no lote", async () => {
    const faturas = [alvoHoje()];
    const { deps, enviados } = depsLote({
      faturas,
      lembretes: [
        {
          fatura_id: "fat-a",
          enviado_em: "2026-10-06T01:30:00.000Z",
        },
      ],
    });
    const painel = await consultarLembretesHoje(deps);
    assert.equal(painel.pendentes.length, 0);
    assert.equal(painel.jaLembradas.length, 1);
    assert.equal(
      explicacaoBotaoLembretesHoje(painel.elegiveis, painel.pendentes.length),
      "Todas as faturas que vencem hoje já tiveram lembrete aceito pelo Resend."
    );
    const resultado = await executarLembretesHoje({}, deps);
    assert.equal(enviados.length, 0);
    assert.equal(resultado.aceitos.length, 0);
    assert.equal(resultado.jaLembradas.length, 1);
  })
);

tests.push(
  run("Lote — aceite de ontem em São Paulo não bloqueia o lembrete de hoje", async () => {
    const faturas = [alvoHoje()];
    const { deps, enviados } = depsLote({
      faturas,
      lembretes: [
        {
          fatura_id: "fat-a",
          enviado_em: "2026-10-05T02:30:00.000Z",
        },
      ],
    });
    const resultado = await executarLembretesHoje({}, deps);
    assert.equal(resultado.aceitos.length, 1);
    assert.equal(enviados.length, 1);
  })
);

tests.push(
  run("Lote — execução simultânea não envia a mesma fatura duas vezes", async () => {
    const faturas = [alvoHoje()];
    let ocupada = false;
    let envios = 0;
    const { deps } = depsLote({
      faturas,
      reservar: async () => {
        if (ocupada) return "ocupado";
        ocupada = true;
        return "ok";
      },
      enviarUm: async (params) => {
        envios += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          enviadoEm: "2026-10-05T18:00:00.000Z",
          email: params.email,
          resendMessageId: "resend-fat-a",
          reutilizado: false,
        };
      },
    });
    const [primeiro, segundo] = await Promise.all([
      executarLembreteHojeUma("fat-a", {}, deps),
      executarLembreteHojeUma("fat-a", {}, deps),
    ]);
    const tipos = [primeiro.tipo, segundo.tipo].sort();
    assert.deepEqual(tipos, ["aceito", "falha"]);
    const falha = [primeiro, segundo].find((item) => item.tipo === "falha");
    assert.match(falha?.motivo ?? "", /em andamento/);
    assert.equal(envios, 1);
  })
);

tests.push(
  run("Lote — trava expirada pode ser assumida e pagamento no meio cancela o envio", () => {
    const agora = Date.parse("2026-10-05T18:00:00.000Z");
    assert.equal(decidirReservaLote(null, agora), "livre");
    assert.equal(
      decidirReservaLote(
        { iniciadoEm: new Date(agora - 60_000).toISOString() },
        agora
      ),
      "ocupado"
    );
    assert.equal(
      decidirReservaLote(
        { iniciadoEm: new Date(agora - 4 * 60_000).toISOString() },
        agora
      ),
      "expirada"
    );
  })
);

tests.push(
  run("Lote — pagamento revalidado depois da trava impede o Resend", async () => {
    const aberta = alvoHoje();
    const paga = alvoHoje({ pago: true });
    let leituras = 0;
    let enviou = false;
    const { deps } = depsLote({
      faturas: [aberta],
      buscarFatura: async () => {
        leituras += 1;
        return leituras === 1 ? aberta : paga;
      },
      enviarUm: async () => {
        enviou = true;
        return {
          enviadoEm: "2026-10-05T18:00:00.000Z",
          email: "financeiro@pavfacil.com.br",
          resendMessageId: "nao",
          reutilizado: false,
        };
      },
    });
    const item = await executarLembreteHojeUma("fat-a", {}, deps);
    assert.equal(item.tipo, "falha");
    assert.match(item.motivo ?? "", /paga/);
    assert.equal(enviou, false);
    assert.equal(leituras, 2);
  })
);

tests.push(
  run("Lote — a consulta percorre todas as páginas e não há agendamento", async () => {
    const chamadas: Array<[number, number]> = [];
    const itens = await listarPaginas(async (from, to) => {
      chamadas.push([from, to]);
      if (from === 0) return ["a", "b"];
      if (from === 2) return ["c"];
      return [];
    }, 2);
    assert.deepEqual(itens, ["a", "b", "c"]);
    assert.deepEqual(chamadas, [
      [0, 1],
      [2, 3],
    ]);

    const raizRepo = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      ".."
    );
    const sql = fs.readFileSync(
      path.join(raizRepo, "supabase/migrations/132_fatura_lembrete_lote_execucao.sql"),
      "utf8"
    );
    assert.match(sql, /fatura_lembrete_lote_execucao/);
    assert.match(sql, /primary key \(fatura_id, dia_civil\)/);
    assert.doesNotMatch(sql, /create unique index/i);
    const rota = fs.readFileSync(
      path.join(raizRepo, "app/api/faturas/lembretes-hoje/enviar/route.ts"),
      "utf8"
    );
    assert.doesNotMatch(rota, /cron|schedule/i);
    const barra = fs.readFileSync(
      path.join(raizRepo, "components/faturas/FaturaLembretesHojeBar.tsx"),
      "utf8"
    );
    assert.match(barra, /Confirmar envio/);
    assert.doesNotMatch(barra, /setInterval|cron/i);
  })
);

tests.push(
  run("Lote — e-mail sugerido não vaza de outra empresa", async () => {
    const faturas = [
      alvoHoje({
        id: "sem-proprio",
        numero: "FAT-CLI-SEM-PROPRIO",
        referencia_id: "cli-a",
        fatura_enviada_email: null,
        fatura_enviada_em: null,
      }),
      alvoHoje({
        id: "historico-a",
        referencia_id: "cli-a",
        status: "cancelada",
        data_vencimento: "2026-09-01",
        fatura_enviada_email: "financeiro@pavfacil.com.br",
        fatura_enviada_em: "2026-09-02T15:00:00.000Z",
      }),
      alvoHoje({
        id: "historico-b",
        referencia_id: "cli-b",
        status: "cancelada",
        data_vencimento: "2026-09-01",
        fatura_enviada_email: "financeiro@outra.com.br",
        fatura_enviada_em: "2026-09-03T15:00:00.000Z",
      }),
    ];
    const { deps, enviados } = depsLote({ faturas });
    const resultado = await executarLembretesHoje({}, deps);
    assert.equal(resultado.aceitos.length, 1);
    assert.equal(enviados[0]?.email, "financeiro@pavfacil.com.br");
    assert.doesNotMatch(enviados[0]?.email ?? "", /outra/);
  })
);

tests.push(
  run("Vencidas — seleção usa a data e ignora hoje, futuro, paga e cancelada", async () => {
    assert.equal(diasAtrasoCivil("2026-10-04", "2026-10-05"), 1);
    assert.equal(diasAtrasoCivil("2026-09-05", "2026-10-05"), 30);
    assert.equal(diasAtrasoCivil("2026-10-04T00:00:00.000Z", "2026-10-05"), 1);
    assert.equal(diasAtrasoCivil("2026-10-05", "2026-10-05"), 0);
    assert.equal(faturaElegivelLembreteVencida(alvoHoje(), HOJE), false);
    assert.equal(
      faturaElegivelLembreteVencida(
        alvoHoje({ status: "emitida", data_vencimento: "2026-10-04" }),
        HOJE
      ),
      true
    );
    assert.equal(
      faturaElegivelLembreteVencida(
        alvoHoje({ status: "vencida", data_vencimento: "2026-09-20" }),
        HOJE
      ),
      true
    );

    const faturas = [
      alvoHoje({ id: "emitida-atraso", data_vencimento: "2026-10-04" }),
      alvoHoje({
        id: "status-vencida",
        numero: "FAT-VENC",
        status: "vencida",
        data_vencimento: "2026-09-20",
        referencia_id: "cli-b",
        referencia_nome: "OUTRA LTDA",
        fatura_enviada_email: "financeiro@outra.com.br",
      }),
      alvoHoje({ id: "hoje", data_vencimento: HOJE }),
      alvoHoje({ id: "futura", data_vencimento: "2026-10-20" }),
      alvoHoje({ id: "paga", data_vencimento: "2026-10-01", pago: true }),
      alvoHoje({ id: "cancelada", data_vencimento: "2026-10-01", status: "cancelada" }),
      alvoHoje({
        id: "lembrada",
        data_vencimento: "2026-10-02",
        numero: "FAT-JA",
      }),
    ];
    const { deps } = depsLote({
      faturas,
      lembretes: [
        { fatura_id: "lembrada", enviado_em: "2026-10-05T18:00:00.000Z" },
      ],
    });
    const painel = await consultarLembretesVencidas(deps);
    const ids = painel.pendentes.map((item) => item.id);
    assert.deepEqual(ids.sort(), ["emitida-atraso", "status-vencida"]);
    assert.equal(painel.jaLembradas[0]?.id, "lembrada");
    assert.equal(
      painel.pendentes.find((item) => item.id === "emitida-atraso")?.diasAtraso,
      1
    );
    assert.equal(
      painel.pendentes.find((item) => item.id === "status-vencida")?.diasAtraso,
      15
    );
    assert.equal(
      explicacaoBotaoLembretesVencidas(painel.elegiveis, painel.pendentes.length),
      "2 faturas vencidas ainda não tiveram lembrete aceito pelo Resend hoje."
    );
  })
);

tests.push(
  run("Vencidas — texto usa o número, separa empresas e segue após falha", async () => {
    const faturas = [
      alvoHoje({
        id: "fat-a",
        data_vencimento: "2026-10-04",
        valor_total: 50,
        mes_referencia: "2026-09",
      }),
      alvoHoje({
        id: "fat-b",
        numero: "FAT-CLI-2026-00200",
        referencia_id: "cli-b",
        referencia_nome: "OUTRA LTDA",
        data_vencimento: "2026-09-20",
        status: "vencida",
        valor_total: 80,
        fatura_enviada_email: "financeiro@outra.com.br",
      }),
      alvoHoje({
        id: "sem-email",
        numero: "FAT-CLI-SEM",
        referencia_id: "cli-sem",
        referencia_nome: "SEM EMAIL",
        data_vencimento: "2026-10-01",
        fatura_enviada_email: null,
        fatura_enviada_em: null,
      }),
    ];
    let falhou = false;
    const { deps, enviados } = depsLote({
      faturas,
      enviarUm: async (params) => {
        if (params.faturaId === "fat-b" && !falhou) {
          falhou = true;
          throw new Error("Resend recusou FAT-CLI-2026-00200.");
        }
        enviados.push(params);
        return {
          enviadoEm: "2026-10-05T18:00:00.000Z",
          email: params.email,
          resendMessageId: `resend-${params.faturaId}`,
          reutilizado: false,
        };
      },
    });
    deps.listarLembretes = async (ids) =>
      enviados
        .filter((item) => ids.includes(item.faturaId))
        .map((item) => ({
          fatura_id: item.faturaId,
          enviado_em: "2026-10-05T18:00:00.000Z",
        }));

    const primeiro = await executarLembretesVencidas({}, deps);
    assert.equal(primeiro.aceitos.length, 1);
    assert.equal(primeiro.aceitos[0]?.faturaId, "fat-a");
    assert.equal(primeiro.semEmail.length, 1);
    assert.equal(primeiro.falhas.length, 1);
    const pav = enviados[0];
    assert.ok(pav);
    assert.equal(
      pav.assunto,
      "Fatura vencida — Exames Ocupacionais nº 00102 (Setembro/2026) | Navarro Engenharia"
    );
    assert.match(
      pav.mensagem,
      /Até o momento, não identificamos o pagamento da fatura referente aos exames ocupacionais realizados no mês de setembro\/2026, no valor de R\$ 50,00, com vencimento em 04\/10\/2026/
    );
    assert.match(pav.mensagem, /regularização do pagamento/);
    assert.doesNotMatch(pav.assunto, /outubro\/2026/i);
    assert.doesNotMatch(pav.mensagem, /juros|multa|no mês de outubro|hoje/i);
    assert.equal(pav.email, "financeiro@pavfacil.com.br");

    const segundo = await executarLembretesVencidas({}, deps);
    assert.equal(segundo.aceitos[0]?.faturaId, "fat-b");
    assert.equal(enviados.filter((item) => item.faturaId === "fat-a").length, 1);
    const outra = enviados.find((item) => item.faturaId === "fat-b");
    assert.equal(outra?.email, "financeiro@outra.com.br");
    assert.match(outra?.mensagem ?? "", /OUTRA LTDA/);
    assert.doesNotMatch(outra?.mensagem ?? "", /PAVFACIL/);
    assert.match(outra?.mensagem ?? "", /vencimento em 20\/09\/2026/);
  })
);

tests.push(
  run("Vencidas — execução simultânea não envia a mesma fatura duas vezes", async () => {
    const faturas = [
      alvoHoje({ id: "fat-a", data_vencimento: "2026-10-04" }),
    ];
    let ocupada = false;
    let envios = 0;
    const { deps } = depsLote({
      faturas,
      reservar: async () => {
        if (ocupada) return "ocupado";
        ocupada = true;
        return "ok";
      },
      enviarUm: async (params) => {
        envios += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          enviadoEm: "2026-10-05T18:00:00.000Z",
          email: params.email,
          resendMessageId: "resend-fat-a",
          reutilizado: false,
        };
      },
    });
    const [primeiro, segundo] = await Promise.all([
      executarLembreteVencidaUma("fat-a", {}, deps),
      executarLembreteVencidaUma("fat-a", {}, deps),
    ]);
    const tipos = [primeiro.tipo, segundo.tipo].sort();
    assert.deepEqual(tipos, ["aceito", "falha"]);
    assert.match(
      [primeiro, segundo].find((item) => item.tipo === "falha")?.motivo ?? "",
      /em andamento/
    );
    assert.equal(envios, 1);
  })
);

tests.push(
  run("Individual — trava compartilhada impede envio simultâneo", async () => {
    let enviou = false;
    let liberou = false;
    await assert.rejects(
      () =>
        enviarLembreteFaturaClienteComTrava(
          {
            faturaId: "fat-a",
            email: "cliente@empresa.com.br",
            assunto: "Assunto",
            mensagem: "Mensagem",
            requestId: REQUEST_ID,
          },
          {
            hojeIso: () => HOJE,
            reservar: async () => "ocupado",
            liberar: async () => {
              liberou = true;
            },
            envio: {
              enviarEmailResend: async () => {
                enviou = true;
                return { id: "nao" };
              },
            },
          }
        ),
      /em andamento/
    );
    assert.equal(enviou, false);
    assert.equal(liberou, false);

    let reservou = false;
    const ok = await enviarLembreteFaturaClienteComTrava(
      {
        faturaId: "fat-pavfacil",
        email: "cliente@empresa.com.br",
        assunto: "Assunto válido",
        mensagem: "Mensagem válida",
        requestId: REQUEST_ID,
      },
      {
        hojeIso: () => HOJE,
        reservar: async () => {
          reservou = true;
          return "ok";
        },
        liberar: async () => {
          liberou = true;
        },
        envio: {
          buscarFatura: async () => faturaBase(),
          gerarPdfBuffer: async () => ({
            buffer: Buffer.from("%PDF"),
            filename: "x.pdf",
          }),
          buscarLembretePorIdempotency: async () => null,
          enviarEmailResend: async () => {
            enviou = true;
            return { id: "resend-individual" };
          },
          registrarLembreteAceito: async (params) => ({
            id: "lem-trava",
            fatura_id: params.faturaId,
            enviado_em: params.enviadoEm,
            destinatario: params.email,
            usuario_id: null,
            usuario_nome: "Staff",
            assunto: params.assunto,
            mensagem: params.mensagem,
            resend_message_id: params.resendMessageId,
            situacao: "aceito_resend" as const,
          }),
          atualizarUltimoLembrete: async () => undefined,
          registrarAuditoriaSucesso: async () => undefined,
        },
      }
    );
    assert.equal(reservou, true);
    assert.equal(enviou, true);
    assert.equal(liberou, true);
    assert.equal(ok.resendMessageId, "resend-individual");
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
