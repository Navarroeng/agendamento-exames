/** Reverter aprovação de orçamento: elegibilidade, menu, RPC e concorrência. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deduplicarContratos,
  selecionarContratoAtual,
  type ClienteContratoConsulta,
} from "../lib/cliente-contrato-atual";
import { resolveOrcamentoAcoesMenu } from "../lib/orcamento-acoes";
import { AUDITORIA_ACAO_LABELS, AUDITORIA_ACOES } from "../lib/auditoria";
import {
  ORCAMENTO_STATUS_APOS_REVERTER_APROVACAO,
  REVERSAO_AET_MSG,
  REVERSAO_AGENDAMENTO_MSG,
  REVERSAO_CONDICOES_MSG,
  REVERSAO_CONTRATO_ASSINADO_MSG,
  REVERSAO_CONTRATO_GERADO_MSG,
  REVERSAO_CONTRATO_VINCULADO_MSG,
  REVERSAO_CONFIRMACAO_MSG,
  REVERSAO_RECEBIMENTO_MENSALIDADE_MSG,
  REVERSAO_ETAPAS_MSG,
  REVERSAO_FINANCEIRO_MSG,
  REVERSAO_LAUDOS_MSG,
  REVERSAO_MOTIVO_OBRIGATORIO_MSG,
  REVERSAO_RISCOS_MSG,
  REVERSAO_SEM_PERMISSAO_MSG,
  REVERSAO_STATUS_MSG,
  REVERSAO_TREINAMENTO_MSG,
  REVERSAO_VISITA_MSG,
  avaliarReversaoAprovacao,
  mensagemErroReverterAprovacao,
  motivoReversaoInvalido,
  podeReverterAprovacaoOrcamento,
  textoConfirmacaoReverterAprovacao,
  type ReversaoAprovacaoContexto,
} from "../lib/orcamento-reverter-aprovacao";

const root = join(__dirname, "..");

function base(
  patch: Partial<ReversaoAprovacaoContexto> = {}
): ReversaoAprovacaoContexto {
  return {
    isAdmin: true,
    encontrado: true,
    status: "aprovado",
    documentosContrato: 0,
    vencimentosContrato: 0,
    contratos: [],
    aprovacao: {
      procuracaoStatus: "pendente",
      possuiLogo: null,
      condicoesHistorico: 0,
    },
    implantacaoAet: "ausente",
    treinamentos: 0,
    laudos: "ausente",
    riscosTracking: "ausente",
    riscosCampanhas: 0,
    ...patch,
  };
}

const shell = {
  status: "aguardando_envio",
  enviadoEm: null,
  assinadoEm: null,
  boletoVencimento: null,
  boletoPago: false,
  boletoPagoEm: null,
  liberadoParaAgendamento: false,
  encerradoEm: null,
  agendamentosIniciaisDispensados: false,
  agendamentos: 0,
  vinculosAgendamento: 0,
  vagas: 0,
  creditosAso: 0,
  periodicosFuturos: 0,
};

const livre = avaliarReversaoAprovacao(base());
assert.equal(livre.permitido, true);
assert.equal(livre.mensagem, null);
assert.equal(livre.statusNovo, "enviado");
assert.equal(livre.statusNovo, ORCAMENTO_STATUS_APOS_REVERTER_APROVACAO);
assert.equal(livre.desfazerContratosAutomaticos, false);
assert.equal(livre.arquivarAprovacaoAtual, true);
assert.equal(livre.desfazerImplantacaoAetVazia, false);

const aetVazia = avaliarReversaoAprovacao(
  base({ implantacaoAet: "vazia", aprovacao: null })
);
assert.equal(aetVazia.permitido, true);
assert.equal(aetVazia.desfazerImplantacaoAetVazia, true);
assert.equal(aetVazia.arquivarAprovacaoAtual, false);

const contratoShell = avaliarReversaoAprovacao(
  base({ contratos: [shell], implantacaoAet: "vazia" })
);
assert.equal(contratoShell.permitido, true);
assert.equal(contratoShell.desfazerContratosAutomaticos, true);
assert.equal(contratoShell.desfazerImplantacaoAetVazia, true);

const shells = avaliarReversaoAprovacao(
  base({ laudos: "vazio", riscosTracking: "vazio" })
);
assert.equal(shells.permitido, true);
assert.equal(shells.desfazerLaudosShellVazio, true);
assert.equal(shells.desfazerRiscosShellVazio, true);

const pdfGerado = avaliarReversaoAprovacao(base({ documentosContrato: 1 }));
assert.equal(pdfGerado.permitido, true);
assert.equal(pdfGerado.statusNovo, "enviado");

const pdfEnviado = avaliarReversaoAprovacao(
  base({
    documentosContrato: 2,
    vencimentosContrato: 3,
    contratos: [{ ...shell, status: "enviado", enviadoEm: "2026-10-20" }],
    aprovacao: {
      procuracaoStatus: "pendente",
      contratoEnviado: true,
      contratoEnviadoEm: "2026-10-20",
      contratoSalvoEm: "2026-10-20T12:00:00Z",
      contratoAssinado: false,
    },
  })
);
assert.equal(pdfEnviado.permitido, true);
assert.equal(pdfEnviado.desfazerContratosAutomaticos, true);

assert.equal(
  avaliarReversaoAprovacao(base({ parcelasRecebidas: 1 })).mensagem,
  REVERSAO_RECEBIMENTO_MENSALIDADE_MSG
);

assert.equal(
  avaliarReversaoAprovacao(
    base({ contratos: [{ ...shell, status: "enviado", enviadoEm: "2026-10-01" }] })
  ).permitido,
  true
);
assert.equal(
  avaliarReversaoAprovacao(
    base({ contratos: [{ ...shell, status: "assinado" }] })
  ).mensagem,
  REVERSAO_CONTRATO_ASSINADO_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({ contratos: [{ ...shell, assinadoEm: "2026-10-01" }] })
  ).mensagem,
  REVERSAO_CONTRATO_ASSINADO_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({ contratos: [{ ...shell, agendamentos: 1 }] })
  ).mensagem,
  REVERSAO_AGENDAMENTO_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({
      aprovacao: {
        procuracaoStatus: "pendente",
        boletoPago: true,
      },
    })
  ).mensagem,
  REVERSAO_FINANCEIRO_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({
      aprovacao: {
        procuracaoStatus: "pendente",
        contratoAssinado: true,
      },
    })
  ).mensagem,
  REVERSAO_CONTRATO_ASSINADO_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({
      aprovacao: {
        procuracaoStatus: "pendente",
        contratoAssinado: false,
        contratoAssinadoEm: "2026-10-02",
      },
    })
  ).mensagem,
  REVERSAO_CONTRATO_ASSINADO_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({
      aprovacao: {
        procuracaoStatus: "pendente",
        visitaTecnicaSalvaEm: "2026-10-01T12:00:00Z",
      },
    })
  ).mensagem,
  REVERSAO_VISITA_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({
      aprovacao: {
        procuracaoStatus: "ativa",
        procuracaoSalvaEm: "2026-10-01T12:00:00Z",
      },
    })
  ).mensagem,
  REVERSAO_ETAPAS_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({
      aprovacao: { procuracaoStatus: "pendente", condicoesHistorico: 1 },
    })
  ).mensagem,
  REVERSAO_CONDICOES_MSG
);
assert.equal(
  avaliarReversaoAprovacao(base({ implantacaoAet: "iniciada" })).mensagem,
  REVERSAO_AET_MSG
);
assert.equal(
  avaliarReversaoAprovacao(base({ treinamentos: 1 })).mensagem,
  REVERSAO_TREINAMENTO_MSG
);
assert.equal(
  avaliarReversaoAprovacao(base({ laudos: "iniciado" })).mensagem,
  REVERSAO_LAUDOS_MSG
);
assert.equal(
  avaliarReversaoAprovacao(base({ riscosCampanhas: 1 })).mensagem,
  REVERSAO_RISCOS_MSG
);
assert.equal(
  avaliarReversaoAprovacao(base({ riscosTracking: "iniciado" })).mensagem,
  REVERSAO_RISCOS_MSG
);

assert.equal(
  avaliarReversaoAprovacao(base({ isAdmin: false })).mensagem,
  REVERSAO_SEM_PERMISSAO_MSG
);
assert.equal(podeReverterAprovacaoOrcamento("admin"), true);
assert.equal(podeReverterAprovacaoOrcamento("operacional"), false);
assert.equal(podeReverterAprovacaoOrcamento(null), false);

assert.equal(motivoReversaoInvalido(""), REVERSAO_MOTIVO_OBRIGATORIO_MSG);
assert.equal(motivoReversaoInvalido("   "), REVERSAO_MOTIVO_OBRIGATORIO_MSG);
assert.equal(motivoReversaoInvalido(" aprovado por engano "), null);

const repetida = avaliarReversaoAprovacao(base({ status: "enviado" }));
assert.equal(repetida.permitido, false);
assert.equal(repetida.mensagem, REVERSAO_STATUS_MSG);
assert.equal(repetida.desfazerContratosAutomaticos, false);
assert.equal(repetida.arquivarAprovacaoAtual, false);

assert.equal(
  mensagemErroReverterAprovacao(
    new Error(`REVERSAO_BLOQUEADA: ${REVERSAO_CONTRATO_GERADO_MSG}`)
  ),
  `${REVERSAO_CONTRATO_GERADO_MSG} Execute a migration 146_reverter_aprovacao_contrato_nao_assinado.sql para permitir a reversão de contrato ainda não assinado.`
);
assert.equal(
  mensagemErroReverterAprovacao({
    message: `REVERSAO_SEM_PERMISSAO: ${REVERSAO_SEM_PERMISSAO_MSG}`,
  }),
  REVERSAO_SEM_PERMISSAO_MSG
);

assert.equal(textoConfirmacaoReverterAprovacao(), REVERSAO_CONFIRMACAO_MSG);

assert.deepEqual(
  resolveOrcamentoAcoesMenu("aprovado", { podeReverterAprovacao: true }),
  ["gerar_pdf", "reverter_aprovacao"]
);
assert.deepEqual(
  resolveOrcamentoAcoesMenu("aprovado", {
    podeReverterAprovacao: true,
    podeEncerrarContrato: true,
  }),
  ["gerar_pdf", "reverter_aprovacao", "cancelar"]
);
assert.deepEqual(resolveOrcamentoAcoesMenu("aprovado", { podeReverterAprovacao: false }), [
  "gerar_pdf",
]);
assert.equal(
  resolveOrcamentoAcoesMenu("enviado", { podeReverterAprovacao: true }).includes(
    "reverter_aprovacao"
  ),
  false
);
assert.equal(
  resolveOrcamentoAcoesMenu("enviado", { podeReverterAprovacao: true }).includes(
    "aprovar"
  ),
  true
);
assert.equal(
  resolveOrcamentoAcoesMenu("enviado", { podeReverterAprovacao: true }).includes(
    "editar"
  ),
  true
);

assert.equal(
  AUDITORIA_ACOES.orcamento_aprovacao_revertida,
  "orcamento_aprovacao_revertida"
);
assert.equal(
  AUDITORIA_ACAO_LABELS.orcamento_aprovacao_revertida,
  "Aprovação revertida"
);

const sql = readFileSync(
  join(root, "supabase/migrations/133_reverter_aprovacao_orcamento.sql"),
  "utf8"
);
const aprovacaoSql = readFileSync(
  join(root, "supabase/migrations/129_servico_ltcat.sql"),
  "utf8"
);

for (const trecho of [
  REVERSAO_CONTRATO_GERADO_MSG,
  REVERSAO_CONTRATO_VINCULADO_MSG,
  REVERSAO_SEM_PERMISSAO_MSG,
  REVERSAO_MOTIVO_OBRIGATORIO_MSG,
  REVERSAO_STATUS_MSG,
  REVERSAO_FINANCEIRO_MSG,
  REVERSAO_AGENDAMENTO_MSG,
  REVERSAO_VISITA_MSG,
  REVERSAO_AET_MSG,
  REVERSAO_LAUDOS_MSG,
  "is_admin_user()",
  "for update",
  "status = 'enviado'",
  "orcamento_aprovacao_revertida",
  "Aprovação revertida",
  "Status anterior: Aprovado",
  "Novo status: Enviado",
  "delete from public.cliente_contratos",
  "delete from public.implantacao_aet",
  "delete from public.orcamento_aprovacoes",
  "trg_orcamento_contrato_documentos_exige_aprovado",
  "trg_lock_contrato_pai",
]) {
  assert.ok(sql.includes(trecho), `migration sem: ${trecho}`);
}

const revertFn = sql.slice(
  sql.indexOf("function public.reverter_aprovacao_orcamento(")
);
const checkAt = revertFn.indexOf("reverter_aprovacao_orcamento_impedimento");
const deleteAt = revertFn.indexOf("delete from public.orcamento_aprovacoes");
assert.ok(checkAt > 0 && deleteAt > checkAt, "impedimento precisa vir antes do delete");
assert.ok(
  revertFn.indexOf("for update") < checkAt,
  "lock do orçamento precisa vir antes do impedimento"
);

assert.match(
  aprovacaoSql,
  /from public\.orcamento_aprovacoes[\s\S]*where orcamento_id = p_orcamento_id/
);
assert.match(
  aprovacaoSql,
  /insert into public\.orcamento_aprovacoes/
);
assert.match(aprovacaoSql, /insert into public\.cliente_contratos/);

const menuSrc = readFileSync(
  join(root, "components/orcamentos/OrcamentoRowActionsMenu.tsx"),
  "utf8"
);
const modalSrc = readFileSync(
  join(root, "components/orcamentos/OrcamentoReverterAprovacaoModal.tsx"),
  "utf8"
);
const hookSrc = readFileSync(join(root, "hooks/useOrcamentosPage.ts"), "utf8");
const serviceSrc = readFileSync(
  join(root, "services/orcamento-reverter-aprovacao.service.ts"),
  "utf8"
);

assert.match(menuSrc, /Reverter aprovação/);
assert.match(menuSrc, /podeReverterAprovacao/);
assert.match(modalSrc, /Reverter aprovação\?/);
assert.match(modalSrc, /Motivo da reversão/);
assert.match(modalSrc, /disabled=\{saving\}/);
assert.match(hookSrc, /consultarBloqueioReverterAprovacao/);
assert.match(hookSrc, /reverterAprovacaoOrcamento/);
assert.match(serviceSrc, /reverter_aprovacao_orcamento/);
assert.match(serviceSrc, /motivo_bloqueio_reverter_aprovacao_orcamento/);
assert.doesNotMatch(serviceSrc, /\.from\("orcamentos"\)\s*\.update/);

const sql146 = readFileSync(
  join(root, "supabase/migrations/146_reverter_aprovacao_contrato_nao_assinado.sql"),
  "utf8"
);
const inicioReverter146 = sql146.search(
  /function public\.reverter_aprovacao_orcamento\(\s*p_orcamento_id uuid,\s*p_motivo text/
);
assert.ok(inicioReverter146 > 0, "funcao de reversao nao encontrada na migration 146");
const impedimento146 = sql146.slice(
  sql146.indexOf("function public.reverter_aprovacao_orcamento_impedimento("),
  inicioReverter146
);
assert.doesNotMatch(impedimento146, /já existe um contrato gerado/);
assert.match(impedimento146, /já foi assinado/);
assert.match(impedimento146, /recebimento registrado nas mensalidades/);
assert.doesNotMatch(impedimento146, /contrato_enviado/);
assert.doesNotMatch(impedimento146, /orcamento_contrato_documentos/);

const reverter146 = sql146.slice(
  inicioReverter146,
  sql146.indexOf("function public.trg_parcela_exige_aprovacao_vigente(")
);
assert.doesNotMatch(reverter146, /delete from public\.orcamento_aprovacoes/);
assert.doesNotMatch(reverter146, /delete from public\.orcamento_contrato_documentos/);
assert.doesNotMatch(reverter146, /delete from public\.cliente_contratos/);
assert.match(reverter146, /sem_validade_em = now\(\)/);
assert.match(reverter146, /status = 'cancelado'/);
assert.match(reverter146, /aprovacao_revertida_em = now\(\)/);
assert.match(reverter146, /revertida_em = now\(\)/);
assert.match(reverter146, /status = 'enviado'/);
assert.match(reverter146, /orcamento_aprovacao_revertida/);
assert.ok(
  reverter146.indexOf("reverter_aprovacao_orcamento_impedimento") <
    reverter146.indexOf("sem_validade_em = now()")
);

assert.match(sql146, /aprovacao_revertida_em is null/);
assert.match(sql146, /when revertida_em is not null then false else contrato_assinado end/);
assert.match(sql146, /and oa\.revertida_em is null/);
assert.match(
  sql146,
  /idx_cliente_contratos_orcamento_vigente/
);

function contratoConsulta(
  patch: Partial<ClienteContratoConsulta>
): ClienteContratoConsulta {
  return {
    id: "c1",
    cliente_id: "cli",
    data_inicio: "2026-01-01",
    data_fim: "2026-12-31",
    quantidade_colaboradores: 10,
    valor_contrato: 1000,
    condicao_pagamento: "Mensalidade",
    tipo_contrato: "mensal",
    reajuste_percentual: null,
    observacoes: "",
    status: "aguardando_envio",
    orcamento_id: "orc-1",
    numero: "CT-1",
    ...patch,
  };
}

const revertido = contratoConsulta({
  id: "antigo",
  numero: "CT-79",
  status: "cancelado",
  encerrado_em: "2026-10-27T12:00:00Z",
  aprovacao_revertida_em: "2026-10-27T12:00:00Z",
  data_inicio: "2026-02-01",
  data_fim: "2027-01-31",
});
const novo = contratoConsulta({
  id: "novo",
  numero: "CT-80",
  status: "aguardando_envio",
  data_inicio: "2026-10-27",
  data_fim: null,
  aprovado_em: "2026-10-27T15:00:00Z",
});
const anteriorValido = contratoConsulta({
  id: "anterior",
  orcamento_id: "orc-antigo",
  numero: "CT-10",
  status: "ativo",
  data_inicio: "2026-01-01",
  data_fim: "2026-12-31",
});
const dedupe = deduplicarContratos([revertido, novo]);
assert.equal(dedupe.length, 1);
assert.equal(dedupe[0]?.id, "novo");
assert.equal(dedupe[0]?.numero, "CT-80");

const atual = selecionarContratoAtual(
  [anteriorValido, revertido],
  "2026-10-27"
);
assert.equal(atual?.id, "anterior");
assert.equal(atual?.status, "ativo");
assert.equal(
  selecionarContratoAtual([revertido], "2026-10-27"),
  null
);

const expirado = contratoConsulta({
  id: "expirado",
  orcamento_id: "orc-exp",
  numero: "CT-01",
  status: "ativo",
  data_inicio: "2024-01-01",
  data_fim: "2024-12-31",
});
const aposReversao = selecionarContratoAtual([expirado, revertido], "2026-10-27");
assert.equal(aposReversao?.id, "expirado");
assert.equal(aposReversao?.status, "ativo");
assert.equal(aposReversao?.data_fim, "2024-12-31");

console.log("test-orcamento-reverter-aprovacao: OK");
