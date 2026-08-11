/**
 * Progresso após cancelar campanha e criar outra (fonte única = campanha ativa).
 */
import assert from "node:assert/strict";
import type { RiscosCampanhaRecord } from "../lib/riscos-campanha";
import {
  escolherCampanhaParaProgresso,
  isCampanhaStatusParaProgresso,
  mesclarCampanhaListagemModal,
  RISCOS_CAMPANHA_ORIGEM,
} from "../lib/riscos-campanha-origem";
import { buildLaudosSstProcesso } from "../lib/laudos-sst";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";
import {
  buildRiscosPsicossociaisProcesso,
  isCadastroColaboradoresConcluido,
} from "../lib/riscos-psicossociais";

function run(name: string, fn: () => void) {
  fn();
  console.log("OK ", name);
}

function campanha(
  partial: Partial<RiscosCampanhaRecord> &
    Pick<RiscosCampanhaRecord, "id" | "status" | "codigo_publico">
): RiscosCampanhaRecord {
  return {
    orcamento_id: "orc-1",
    cliente_id: "cli-1",
    cnpj: "12345678000199",
    empresa_nome: "LEGRAND BRASIL LTDA",
    data_inicio: "2026-08-01",
    data_encerramento: "2026-08-31",
    quantidade_prevista: 10,
    codigo_acesso_exibicao: "XXXX",
    origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
    responsavel: "AGATHA",
    observacoes: null,
    criado_por: "AGATHA",
    created_at: "2026-08-01T12:00:00.000Z",
    ...partial,
  };
}

run("cancelada nunca é escolhida para progresso", () => {
  const antiga = campanha({
    id: "old",
    status: "cancelada",
    codigo_publico: "OLD123",
    created_at: "2026-08-01T10:00:00.000Z",
    cancelada_em: "2026-08-10T10:00:00.000Z",
  });
  const nova = campanha({
    id: "new",
    status: "aberta",
    codigo_publico: "T4BFGJ",
    created_at: "2026-08-11T12:00:00.000Z",
  });
  assert.equal(isCampanhaStatusParaProgresso("cancelada"), false);
  assert.equal(escolherCampanhaParaProgresso([antiga]), null);
  assert.equal(escolherCampanhaParaProgresso([antiga, nova])?.id, "new");
  assert.equal(escolherCampanhaParaProgresso([antiga, nova])?.codigo_publico, "T4BFGJ");
});

run("mescla listagem×modal não reaplica cancelada", () => {
  const cancelada = campanha({
    id: "old",
    status: "cancelada",
    codigo_publico: "OLD123",
  });
  const ativa = campanha({
    id: "new",
    status: "aberta",
    codigo_publico: "T4BFGJ",
  });
  assert.equal(mesclarCampanhaListagemModal(ativa, cancelada)?.id, "new");
  assert.equal(mesclarCampanhaListagemModal(null, cancelada), null);
  assert.equal(
    mesclarCampanhaListagemModal(ativa, { ...ativa, status: "aberta" })?.id,
    "new"
  );
});

run("cadastro conclui com ≥1 participante (não usa previsto)", () => {
  assert.equal(
    isCadastroColaboradoresConcluido({
      participantesCadastrados: 1,
      quantidadePrevista: 50,
    }),
    true
  );
  assert.equal(
    isCadastroColaboradoresConcluido({
      participantesCadastrados: 0,
      quantidadePrevista: 1,
    }),
    false
  );
});

run("progresso usa nova campanha; não herda da cancelada", () => {
  const implantacao = {
    orcamento: {
      id: "orc-1",
      numero: "ORC-1",
      cliente_nome: "LEGRAND BRASIL LTDA",
      cliente_cnpj: "12.345.678/0001-99",
      responsavel: "AGATHA",
      status: "aprovado",
    },
    etapaAtual: "concluido",
    dataAprovacao: "2026-06-01T12:00:00Z",
    numeroContrato: "CT-1",
  } as ImplantacaoProcesso;

  const laudos = buildLaudosSstProcesso(implantacao, {
    orcamento_id: "orc-1",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 6,
    status: "concluido",
    entrada_em: "2026-08-01T12:00:00Z",
  });

  const listaOk = {
    orcamento_id: "orc-1",
    etapa_atual: "cadastro_empresa" as const,
    etapas_concluidas: 1,
    lista_solicitada: true,
    lista_solicitada_em: "2026-08-02",
    lista_solicitada_email: "a@b.com",
    lista_recebida: true,
    lista_anexo_path: "x/y.pdf",
  };

  const cancelada = campanha({
    id: "old",
    status: "cancelada",
    codigo_publico: "OLD123",
  });
  const comCancelada = buildRiscosPsicossociaisProcesso(
    laudos,
    listaOk,
    cancelada,
    { participantes: [{ status: "respondido" }] }
  );
  // Cancelada descartada → sem campanha no progresso (cadastro/link não avançam).
  assert.equal(comCancelada.campanha, null);
  assert.equal(comCancelada.etapaAtual, "cadastro_colaboradores");
  assert.equal(comCancelada.progressoLabel, "2 de 6");

  const nova = campanha({
    id: "new",
    status: "aberta",
    codigo_publico: "T4BFGJ",
  });
  const comNova = buildRiscosPsicossociaisProcesso(laudos, listaOk, nova, {
    participantes: [{ status: "iniciado" }],
  });
  assert.equal(comNova.campanha?.codigo_publico, "T4BFGJ");
  assert.equal(comNova.etapaAtual, "questionario_finalizado");
  assert.equal(comNova.progressoLabel, "4 de 6");
});

console.log("\nTodos os testes de progresso pós-cancelamento passaram.");
