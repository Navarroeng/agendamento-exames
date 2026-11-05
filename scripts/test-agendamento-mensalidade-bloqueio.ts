/**
 * Bloqueio de novo agendamento por mensalidade vencida há mais de 10 dias.
 * Não grava parcela, baixa nem agendamento.
 */
import fs from "node:fs";
import path from "node:path";
import { todayIsoSaoPaulo } from "../lib/agendamento-datetime";
import {
  avaliarBloqueioMensalidadesContrato,
  escolherContratoIdAtendimento,
  MENSALIDADE_ATRASO_BLOQUEIO_MSG,
  MENSALIDADE_ATRASO_BLOQUEIO_TITULO,
  MENSALIDADE_ATRASO_CONSULTA_MSG,
  MENSALIDADE_ATRASO_PORTAL_MSG,
  hrefCobrancasPendenciasEmpresa,
  type ParcelaMensalidadeParaBloqueio,
} from "../lib/agendamento-mensalidade-bloqueio";
import { parcelaEntraEmCobrancas } from "../lib/cobrancas-mensalidades";

let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(err);
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const HOJE = "2026-11-15";

function parcela(
  partial: Partial<ParcelaMensalidadeParaBloqueio> &
    Pick<ParcelaMensalidadeParaBloqueio, "id" | "orcamentoId" | "vencimentoIso">
): ParcelaMensalidadeParaBloqueio {
  return {
    numero: 3,
    valor: 1200,
    pagoEmIso: null,
    statusOrcamento: "aprovado",
    ...partial,
  };
}

test("10 dias de atraso não bloqueia e 11 dias bloqueia", () => {
  const dez = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: HOJE,
    parcelas: [
      parcela({
        id: "p10",
        orcamentoId: "orc-a",
        vencimentoIso: "2026-11-05",
      }),
    ],
  });
  assert(dez.bloqueado === false, "exatamente 10 dias deve liberar");

  const onze = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: HOJE,
    parcelas: [
      parcela({
        id: "p11",
        orcamentoId: "orc-a",
        vencimentoIso: "2026-11-04",
      }),
    ],
  });
  assert(onze.bloqueado === true, "11 dias deve bloquear");
  if (!onze.bloqueado) return;
  assert(onze.mensagem === MENSALIDADE_ATRASO_BLOQUEIO_MSG, "mensagem oficial");
  assert(onze.parcelas[0]?.diasAtraso === 11, "dias de atraso");
  assert(
    onze.linhas[0]?.includes("Parcela 3/12") === true,
    "mostra a parcela"
  );
  assert(onze.linhas[0]?.includes("04/11/2026") === true, "mostra o vencimento");
  assert(onze.linhas[0]?.includes("R$") === true, "mostra o valor");
  assert(onze.linhas[0]?.includes("11 dias de atraso") === true, "mostra o atraso");
});

test("virada de mês conta dias civis", () => {
  const dez = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: "2026-02-10",
    parcelas: [
      parcela({
        id: "jan",
        orcamentoId: "orc-a",
        vencimentoIso: "2026-01-31",
      }),
    ],
  });
  assert(dez.bloqueado === false, "31/01 até 10/02 são 10 dias");

  const onze = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: "2026-02-11",
    parcelas: [
      parcela({
        id: "jan",
        orcamentoId: "orc-a",
        vencimentoIso: "2026-01-31",
      }),
    ],
  });
  assert(onze.bloqueado === true, "31/01 até 11/02 são 11 dias");
});

test("virada de data no fuso America/Sao_Paulo", () => {
  const instante = new Date("2026-11-05T02:30:00.000Z");
  const hoje = todayIsoSaoPaulo(instante);
  assert(hoje === "2026-11-04", `esperado 2026-11-04, veio ${hoje}`);

  const noFuso = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: hoje,
    parcelas: [
      parcela({
        id: "tz",
        orcamentoId: "orc-a",
        vencimentoIso: "2026-10-25",
      }),
    ],
  });
  assert(noFuso.bloqueado === false, "no fuso brasileiro ainda são 10 dias");

  const comoUtc = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: "2026-11-05",
    parcelas: [
      parcela({
        id: "tz",
        orcamentoId: "orc-a",
        vencimentoIso: "2026-10-25",
      }),
    ],
  });
  assert(
    comoUtc.bloqueado === true,
    "a data UTC do mesmo instante seria 11 dias e bloquearia"
  );
});

test("parcela paga não bloqueia e a baixa removida volta a bloquear", () => {
  const base = parcela({
    id: "paga",
    orcamentoId: "orc-a",
    vencimentoIso: "2026-10-01",
  });
  const paga = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: HOJE,
    parcelas: [{ ...base, pagoEmIso: "2026-11-01" }],
  });
  assert(paga.bloqueado === false, "baixa registrada libera");

  const semBaixa = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: HOJE,
    parcelas: [{ ...base, pagoEmIso: null }],
  });
  assert(semBaixa.bloqueado === true, "baixa removida bloqueia de novo");
});

test("várias parcelas: só as com mais de 10 dias entram no bloqueio", () => {
  const avaliacao = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: HOJE,
    parcelas: [
      parcela({
        id: "recente",
        orcamentoId: "orc-a",
        numero: 5,
        vencimentoIso: "2026-11-10",
      }),
      parcela({
        id: "antiga",
        orcamentoId: "orc-a",
        numero: 2,
        vencimentoIso: "2026-10-01",
      }),
      parcela({
        id: "paga-antiga",
        orcamentoId: "orc-a",
        numero: 1,
        vencimentoIso: "2026-09-01",
        pagoEmIso: "2026-09-10",
      }),
      parcela({
        id: "limite",
        orcamentoId: "orc-a",
        numero: 4,
        vencimentoIso: "2026-11-05",
      }),
    ],
  });
  assert(avaliacao.bloqueado === true, "a parcela antiga bloqueia");
  if (!avaliacao.bloqueado) return;
  assert(avaliacao.parcelas.length === 1, "paga, 5 dias e 10 dias ficam de fora");
  assert(avaliacao.parcelas[0]?.id === "antiga", "mostra a parcela motivadora");
});

test("outro contrato da mesma empresa não bloqueia este atendimento", () => {
  const avaliacao = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-atendido",
    hojeIso: HOJE,
    parcelas: [
      parcela({
        id: "irmao",
        orcamentoId: "orc-irmao",
        vencimentoIso: "2026-09-01",
      }),
      parcela({
        id: "deste",
        orcamentoId: "orc-atendido",
        vencimentoIso: "2026-11-10",
      }),
    ],
  });
  assert(avaliacao.bloqueado === false, "dívida de outro orçamento não conta");

  assert(
    escolherContratoIdAtendimento({
      vagaContratoId: "contrato-vaga",
      contratoVigenteId: "contrato-irmao",
    }) === "contrato-vaga",
    "a vaga do atendimento vence o contrato vigente genérico"
  );
  assert(
    escolherContratoIdAtendimento({
      periodicoContratoId: "contrato-periodico",
      creditoContratoId: "contrato-credito",
      contratoVigenteId: "contrato-irmao",
    }) === "contrato-periodico",
    "o periódico atendido vence o crédito e o vigente"
  );
});

test("cancelado e à vista ou pontual não são mensalidade inadimplente", () => {
  const cancelado = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: HOJE,
    parcelas: [
      parcela({
        id: "cancelada",
        orcamentoId: "orc-a",
        vencimentoIso: "2026-09-01",
        statusOrcamento: "cancelado",
      }),
    ],
  });
  assert(cancelado.bloqueado === false, "orçamento cancelado não bloqueia");

  assert(
    parcelaEntraEmCobrancas({
      modalidade: "pontual",
      mensalidadePagamento: "parcelado",
      semVigencia: false,
    }) === false,
    "contratação pontual não entra nas cobranças de mensalidade"
  );
  assert(
    parcelaEntraEmCobrancas({
      modalidade: "mensalidade",
      mensalidadePagamento: "avista",
      semVigencia: false,
    }) === false,
    "plano pago à vista não entra nas cobranças de mensalidade"
  );
});

test("falha de consulta tem mensagem própria e não acusa inadimplência", () => {
  assert(
    MENSALIDADE_ATRASO_CONSULTA_MSG ===
      "Não foi possível verificar a situação das mensalidades. Tente novamente.",
    "mensagem de falha"
  );
  assert(
    MENSALIDADE_ATRASO_CONSULTA_MSG.includes("inadimpl") === false,
    "falha não chama o cliente de inadimplente"
  );
  assert(
    MENSALIDADE_ATRASO_BLOQUEIO_TITULO ===
      "Agendamento bloqueado por pendência financeira",
    "título do modal"
  );
  assert(
    MENSALIDADE_ATRASO_BLOQUEIO_MSG ===
      "Esta empresa possui mensalidade em aberto há mais de 10 dias. Para realizar um novo agendamento, é necessário regularizar o pagamento com o financeiro da Navarro Engenharia.",
    "texto interno"
  );
  assert(
    MENSALIDADE_ATRASO_PORTAL_MSG.includes("financeiro da Navarro Engenharia"),
    "portal orienta o contato com o financeiro"
  );
  assert(
    MENSALIDADE_ATRASO_PORTAL_MSG.includes("Cobranças") === false,
    "portal não oferece a área interna de cobranças"
  );
});

test("baixa de uma parcela não libera se outra ainda passa de 10 dias", () => {
  const avaliacao = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: "2026-11-21",
    parcelas: [
      parcela({
        id: "paga",
        orcamentoId: "orc-a",
        numero: 1,
        vencimentoIso: "2026-10-10",
        pagoEmIso: "2026-11-21",
      }),
      parcela({
        id: "anterior",
        orcamentoId: "orc-a",
        numero: 2,
        vencimentoIso: "2026-09-10",
        pagoEmIso: null,
      }),
    ],
  });
  assert(avaliacao.bloqueado === true, "mês anterior ainda impede");
  if (!avaliacao.bloqueado) return;
  assert(avaliacao.parcelas.length === 1, "a paga sai do bloqueio");
  assert(avaliacao.parcelas[0]?.id === "anterior", "permanece a pendência antiga");
});

test("o atraso usa o dia de hoje e não a data do exame", () => {
  const hoje = "2026-11-20";
  const noLimite = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-a",
    hojeIso: hoje,
    parcelas: [
      parcela({
        id: "dez",
        orcamentoId: "orc-a",
        vencimentoIso: "2026-11-10",
      }),
    ],
  });
  assert(noLimite.bloqueado === false, "10 dias no fuso de hoje liberam");
  assert(
    hrefCobrancasPendenciasEmpresa("GO GLOBAL").includes("vencidas=1"),
    "o link mostra vencidas de qualquer mês"
  );
  assert(
    hrefCobrancasPendenciasEmpresa("GO GLOBAL").includes("empresa="),
    "o link filtra a empresa"
  );
});

test("parcela só calculada com mais de 10 dias entra no bloqueio", () => {
  const calculada = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-0080",
    hojeIso: "2026-11-21",
    parcelas: [
      parcela({
        id: "grade:ap-0080:2026-10-15:1",
        orcamentoId: "orc-0080",
        numero: 1,
        valor: 130,
        vencimentoIso: "2026-11-10",
        pagoEmIso: null,
      }),
    ],
  });
  assert(calculada.bloqueado === true, "11 dias da parcela calculada bloqueiam");
  if (!calculada.bloqueado) return;
  assert(calculada.parcelas[0]?.id.startsWith("grade:"), "mantém o id calculado");

  const noLimite = avaliarBloqueioMensalidadesContrato({
    orcamentoId: "orc-0080",
    hojeIso: "2026-11-20",
    parcelas: [
      parcela({
        id: "grade:ap-0080:2026-10-15:1",
        orcamentoId: "orc-0080",
        numero: 1,
        valor: 130,
        vencimentoIso: "2026-11-10",
        pagoEmIso: null,
      }),
    ],
  });
  assert(noLimite.bloqueado === false, "10 dias da parcela calculada não bloqueiam");

  const cobrancas = fs.readFileSync(
    path.join(process.cwd(), "services/cobrancas.service.ts"),
    "utf8"
  );
  const leitura = cobrancas.slice(
    cobrancas.indexOf("export async function listarCobrancasMensalidadesDoOrcamento")
  );
  assert(
    leitura.includes("listarCobrancasMensalidades()"),
    "o bloqueio usa a mesma lista da Cobranças, inclusive a grade calculada"
  );
  assert(
    leitura.includes("orcamento_mensalidade_parcelas") === false,
    "a leitura do orçamento não ignora a grade"
  );
});

test("o insert valida a mensalidade e a atualização de agendamento existente não", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "services/agendamento.service.ts"),
    "utf8"
  );
  const salvar = source.slice(
    source.indexOf("export async function salvarAgendamentoComExames"),
    source.indexOf("export async function atualizarAgendamentoComExames")
  );
  const atualizar = source.slice(
    source.indexOf("export async function atualizarAgendamentoComExames"),
    source.indexOf("export async function atualizarDocumentacaoAgendamento")
  );
  assert(
    salvar.includes("assertMensalidadePermiteNovoAgendamento"),
    "criação chama a validação"
  );
  assert(
    atualizar.includes("assertMensalidadePermiteNovoAgendamento") === false,
    "edição de agendamento existente não cancela nem bloqueia"
  );
  assert(
    salvar.includes("resolverValorAdmissionalDoAtendimento"),
    "o preço do exame admissional permanece no insert"
  );

  const page = fs.readFileSync(
    path.join(process.cwd(), "hooks/useAgendamentosPage.ts"),
    "utf8"
  );
  assert(
    page.includes('mensalidadeAgendamento.state.status === "bloqueado"'),
    "a tela só trava quando o bloqueio está confirmado"
  );
  assert(
    page.includes("isMensalidadeAgendamentoConsultaError"),
    "falha de consulta é tratada no salvamento"
  );

  assert(
    page.includes("assertMensalidadePermiteNovoAgendamento"),
    "a tela consulta de novo imediatamente antes de gravar"
  );
  assert(
    page.includes("atualizarDocumentacaoAgendamento"),
    "documentação de exame já realizado continua disponível"
  );

  const modal = fs.readFileSync(
    path.join(
      process.cwd(),
      "components/agendamentos/AgendamentoMensalidadeBloqueioModal.tsx"
    ),
    "utf8"
  );
  assert(
    modal.includes("MENSALIDADE_ATRASO_BLOQUEIO_TITULO"),
    "título do modal"
  );
  assert(
    modal.includes("MENSALIDADE_ATRASO_BLOQUEIO_MSG"),
    "texto interno do modal"
  );
  assert(
    modal.includes("MENSALIDADE_ATRASO_PORTAL_MSG"),
    "texto do portal no modal"
  );
  assert(modal.includes("Abrir Cobranças"), "link interno");
  assert(modal.includes("podeAbrirCobrancas"), "o link depende de permissão");

  const cobrancasPage = fs.readFileSync(
    path.join(process.cwd(), "components/cobrancas/CobrancasPage.tsx"),
    "utf8"
  );
  assert(cobrancasPage.includes('searchParams.get("vencidas")'), "qualquer mês");
  assert(cobrancasPage.includes('searchParams.get("empresa")'), "empresa do link");

  const implantacao = fs.readFileSync(
    path.join(
      process.cwd(),
      "components/orcamentos/OrcamentoAbaAgendamentos.tsx"
    ),
    "utf8"
  );
  assert(implantacao.includes("saveAgendamentoPrefill"), "implantação abre o mesmo formulário");
  assert(implantacao.includes('router.push("/")'), "implantação não grava o agendamento direto");

  const portalLista = fs.readFileSync(
    path.join(process.cwd(), "app/api/portal/agendamentos/route.ts"),
    "utf8"
  );
  const portalDetalhe = fs.readFileSync(
    path.join(process.cwd(), "app/api/portal/agendamentos/[id]/route.ts"),
    "utf8"
  );
  assert(portalLista.includes("GET"), "portal lista agendamentos");
  assert(portalLista.includes("salvarAgendamentoComExames") === false, "portal não cria agendamento");
  assert(portalDetalhe.includes(".insert(") === false, "portal não grava agendamento");
  assert(portalDetalhe.includes("export async function GET"), "portal só consulta o detalhe");
});

if (failed > 0) {
  console.error(`\n${failed} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nBloqueio de mensalidade ok.");
