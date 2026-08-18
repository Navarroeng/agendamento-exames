/**
 * Encaminhamento automático Implantação → Laudos SST / Riscos:
 * gatilho exclusivo "Pacote completo - SST".
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";
import {
  isProcessoElegivelLaudosSst,
  isProcessoVisivelLaudosSst,
  laudosTrackingTemTrabalhoReal,
  type OrcamentoLaudosSstRecord,
} from "../lib/laudos-sst";
import {
  isProcessoElegivelRiscosPsicossociais,
  isProcessoVisivelRiscosAutomatico,
  riscosTrackingTemTrabalhoReal,
} from "../lib/riscos-psicossociais";
import { isOrigemManualCliente, RISCOS_CAMPANHA_ORIGEM } from "../lib/riscos-campanha-origem";
import {
  isItemPacoteCompletoSst,
  orcamentoPossuiPacoteCompletoSst,
  PACOTE_COMPLETO_SST_NOME,
  resolvePacoteCompletoSstServicoId,
} from "../lib/servico-sst-pacote";

const PACOTE_ID = "servico-pacote-completo";
const PGR_ID = "servico-pgr";
const TREINO_ID = "servico-treinamentos";
const NR01_ID = "servico-nr01";

const catalogo = [
  { id: PACOTE_ID, nome: PACOTE_COMPLETO_SST_NOME },
  { id: PGR_ID, nome: "PGR" },
  { id: TREINO_ID, nome: "Treinamentos" },
  { id: NR01_ID, nome: "NR01 Psicossocial" },
  { id: "servico-ltcat", nome: "LTCAT" },
  { id: "servico-pcmso", nome: "PCMSO" },
];

assert.equal(resolvePacoteCompletoSstServicoId(catalogo), PACOTE_ID);

assert.equal(
  isItemPacoteCompletoSst(
    { servico_id: PACOTE_ID, servico_nome: "outro rotulo" },
    PACOTE_ID
  ),
  true,
  "ID do catálogo prevalece sobre o nome"
);
assert.equal(
  isItemPacoteCompletoSst(
    { servico_id: PGR_ID, servico_nome: PACOTE_COMPLETO_SST_NOME },
    PACOTE_ID
  ),
  false,
  "ID de PGR não vira pacote pelo nome"
);
assert.equal(
  isItemPacoteCompletoSst(
    { servico_id: null, servico_nome: PACOTE_COMPLETO_SST_NOME },
    PACOTE_ID
  ),
  true,
  "sem ID, fallback pelo nome normalizado"
);
assert.equal(
  orcamentoPossuiPacoteCompletoSst(
    [
      { servico_id: PGR_ID, servico_nome: "PGR" },
      { servico_id: "servico-ltcat", servico_nome: "LTCAT" },
      { servico_id: "servico-pcmso", servico_nome: "PCMSO" },
    ],
    PACOTE_ID
  ),
  false,
  "soma de laudos avulsos não equivale ao pacote"
);

function processo(partial: {
  etapaAtual: ImplantacaoProcesso["etapaAtual"];
  possuiPacoteCompletoSst?: boolean;
  clienteNome?: string;
  status?: ImplantacaoProcesso["orcamento"]["status"];
}): ImplantacaoProcesso {
  return {
    orcamento: {
      id: "orc-1",
      numero: "ORC-2026-0099",
      data_proposta: "2026-01-01",
      cliente_id: null,
      cliente_nome: partial.clienteNome ?? "EMPRESA TESTE",
      cliente_cnpj: null,
      cliente_endereco: null,
      cliente_setor: null,
      contato: null,
      email: null,
      telefone: null,
      responsavel: "AGATHA",
      origem_cliente: "indicacao",
      observacoes: null,
      motivo_cancelamento: null,
      observacao_cancelamento: null,
      cancelado_em: null,
      cancelado_por: null,
      desconto_percentual: 0,
      forma_pagamento: null,
      validade_proposta: null,
      subtotal: 0,
      valor_total: 0,
      status: partial.status ?? "aprovado",
      assinatura_status: "nao_aplicavel",
      assinatura_token: null,
      aceite_em: null,
      aceite_ip: null,
      aceite_usuario_nome: null,
      link_aceite_expira_em: null,
      created_at: "",
      updated_at: "",
    },
    aprovacao: null,
    contrato: null,
    etapaAtual: partial.etapaAtual,
    etapasConcluidas: 5,
    totalEtapas: 5,
    progressoLabel: "5 de 5",
    agendamentoLiberado: false,
    agendamentoLabel: "Bloqueado",
    dataAprovacao: "2026-07-01T12:00:00Z",
    numeroContrato: "CTR-1",
    ativo: false,
    quantidadeContratada: 1,
    agendamentosRealizados: 0,
    examesProgramadosFuturos: 0,
    asosContratuaisEmAberto: 0,
    agendamentosIniciaisDispensados: false,
    concluidoComExamesFuturos: false,
    fluxoImplantacao: "padrao",
    treinamento: null,
    etapasOperacionais: [],
    possuiPacoteCompletoSst: Boolean(partial.possuiPacoteCompletoSst),
  };
}

const trackingLaudosVazio: OrcamentoLaudosSstRecord = {
  orcamento_id: "orc-1",
  etapa_atual: "epis",
  etapas_concluidas: 0,
  status: "em_andamento",
};
const trackingLaudosTrabalhado: OrcamentoLaudosSstRecord = {
  orcamento_id: "orc-1",
  etapa_atual: "processo_inicial",
  etapas_concluidas: 1,
  status: "em_andamento",
  epi_disponibiliza: true,
};

function assertEncaminha(label: string, possuiPacote: boolean, esperado: boolean) {
  const p = processo({
    etapaAtual: "concluido",
    possuiPacoteCompletoSst: possuiPacote,
  });
  assert.equal(
    isProcessoElegivelLaudosSst(p),
    esperado,
    `${label} → Laudos`
  );
  assert.equal(
    isProcessoElegivelRiscosPsicossociais(p),
    esperado,
    `${label} → Riscos automático`
  );
}

// 1. Pacote completo - SST
assertEncaminha("Pacote completo - SST", true, true);

// 2. Pacote + Treinamentos (flag já considera todos os itens)
assert.equal(
  orcamentoPossuiPacoteCompletoSst(
    [
      { servico_id: TREINO_ID, servico_nome: "Treinamentos" },
      { servico_id: PACOTE_ID, servico_nome: PACOTE_COMPLETO_SST_NOME },
    ],
    PACOTE_ID
  ),
  true
);
assertEncaminha("Pacote + Treinamentos", true, true);

// 3. Somente Treinamentos
assert.equal(
  orcamentoPossuiPacoteCompletoSst(
    [{ servico_id: TREINO_ID, servico_nome: "Treinamentos" }],
    PACOTE_ID
  ),
  false
);
assertEncaminha("Somente Treinamentos", false, false);

// 4. Somente PGR
assert.equal(
  orcamentoPossuiPacoteCompletoSst(
    [{ servico_id: PGR_ID, servico_nome: "PGR" }],
    PACOTE_ID
  ),
  false
);
assertEncaminha("Somente PGR", false, false);

// 5. PGR + LTCAT + PCMSO sem pacote
assertEncaminha("PGR + LTCAT + PCMSO", false, false);

// 6. Somente NR01 Psicossocial
assert.equal(
  orcamentoPossuiPacoteCompletoSst(
    [{ servico_id: NR01_ID, servico_nome: "NR01 Psicossocial" }],
    PACOTE_ID
  ),
  false
);
assertEncaminha("Somente NR01 Psicossocial", false, false);

// 7. Inclusão manual continua independente do pacote
assert.equal(isOrigemManualCliente(RISCOS_CAMPANHA_ORIGEM.manual_cliente), true);
assert.equal(isOrigemManualCliente(RISCOS_CAMPANHA_ORIGEM.orcamento), false);

// LEGRAND: só treinamento, implantação concluída, tracking vazio some da lista
const legrand = processo({
  etapaAtual: "treinamento_agendado",
  possuiPacoteCompletoSst: false,
  clienteNome: "LEGRAND BRASIL LTDA",
});
assert.equal(isProcessoElegivelLaudosSst(legrand), false);
assert.equal(isProcessoElegivelRiscosPsicossociais(legrand), false);
assert.equal(laudosTrackingTemTrabalhoReal(trackingLaudosVazio), false);
assert.equal(
  isProcessoVisivelLaudosSst(legrand, trackingLaudosVazio),
  false,
  "LEGRAND com tracking vazio não aparece em Laudos"
);
assert.equal(
  isProcessoVisivelRiscosAutomatico(legrand, {
    orcamento_id: "orc-1",
    etapa_atual: "lista_presenca",
    etapas_concluidas: 0,
    status: "em_andamento",
  }),
  false,
  "LEGRAND com tracking vazio não aparece em Riscos"
);
assert.equal(
  isProcessoVisivelLaudosSst(legrand, trackingLaudosTrabalhado),
  true,
  "tracking antigo já trabalhado permanece visível"
);
assert.equal(riscosTrackingTemTrabalhoReal({
  orcamento_id: "orc-1",
  etapa_atual: "lista_presenca",
  etapas_concluidas: 0,
  status: "em_andamento",
  lista_solicitada: true,
}), true);

const riscosSrc = readFileSync(
  join(process.cwd(), "services/riscos-psicossociais.service.ts"),
  "utf8"
);
assert.doesNotMatch(
  riscosSrc,
  /listarProcessosLaudosSst\s*\(/,
  "Riscos não deve chamar listarProcessosLaudosSst"
);

console.log("ok: encaminhamento-pacote-sst");
