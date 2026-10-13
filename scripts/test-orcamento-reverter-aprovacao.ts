/** Reverter aprovação de orçamento: elegibilidade, menu, RPC e concorrência. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveOrcamentoAcoesMenu } from "../lib/orcamento-acoes";
import { AUDITORIA_ACAO_LABELS, AUDITORIA_ACOES } from "../lib/auditoria";
import {
  ORCAMENTO_STATUS_APOS_REVERTER_APROVACAO,
  REVERSAO_AET_MSG,
  REVERSAO_AGENDAMENTO_MSG,
  REVERSAO_CONDICOES_MSG,
  REVERSAO_CONTRATO_ACOMPANHADO_MSG,
  REVERSAO_CONTRATO_GERADO_MSG,
  REVERSAO_CONTRATO_VINCULADO_MSG,
  REVERSAO_ETAPAS_MSG,
  REVERSAO_FINANCEIRO_MSG,
  REVERSAO_LAUDOS_MSG,
  REVERSAO_MOTIVO_OBRIGATORIO_MSG,
  REVERSAO_RISCOS_MSG,
  REVERSAO_SEM_PERMISSAO_MSG,
  REVERSAO_STATUS_MSG,
  REVERSAO_TREINAMENTO_MSG,
  REVERSAO_VENCIMENTOS_MSG,
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

assert.equal(
  avaliarReversaoAprovacao(base({ documentosContrato: 1 })).mensagem,
  REVERSAO_CONTRATO_GERADO_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({
      documentosContrato: 1,
      contratos: [{ ...shell, assinadoEm: null }],
    })
  ).mensagem,
  REVERSAO_CONTRATO_GERADO_MSG
);

assert.equal(
  avaliarReversaoAprovacao(base({ vencimentosContrato: 2 })).mensagem,
  REVERSAO_VENCIMENTOS_MSG
);

assert.equal(
  avaliarReversaoAprovacao(
    base({ contratos: [{ ...shell, status: "enviado" }] })
  ).mensagem,
  REVERSAO_CONTRATO_VINCULADO_MSG
);
assert.equal(
  avaliarReversaoAprovacao(
    base({ contratos: [{ ...shell, status: "assinado" }] })
  ).mensagem,
  REVERSAO_CONTRATO_VINCULADO_MSG
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
  REVERSAO_CONTRATO_ACOMPANHADO_MSG
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
  REVERSAO_CONTRATO_GERADO_MSG
);
assert.equal(
  mensagemErroReverterAprovacao({
    message: `REVERSAO_SEM_PERMISSAO: ${REVERSAO_SEM_PERMISSAO_MSG}`,
  }),
  REVERSAO_SEM_PERMISSAO_MSG
);

assert.equal(
  textoConfirmacaoReverterAprovacao(),
  "O orçamento voltará para o status ‘Enviado’ e poderá ser editado e aprovado novamente."
);

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

console.log("test-orcamento-reverter-aprovacao: OK");
