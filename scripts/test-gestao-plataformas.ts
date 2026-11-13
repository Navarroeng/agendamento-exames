import assert from "node:assert/strict";
import { NAV_SECTIONS } from "../lib/constants";
import {
  FILTRO_GESTAO_VAZIO,
  GESTAO_PLATAFORMAS_PATH,
  LIMITE_PLATAFORMAS_ATIVAS,
  ORCAMENTO_GESTAO_PLATAFORMAS_NUMERO,
  alocacaoAberta,
  atualizarSituacaoRequisito,
  caminhoAnexoGestaoPermitido,
  clientePermitidoGestaoPlataformas,
  colaboradoresSemObra,
  contarPlataformasAtivas,
  cursoAtivo,
  estadoListaColaboradores,
  examesProximosDoColaborador,
  examesRealizadosDoColaborador,
  filtrarObras,
  filtrarRequisitos,
  idsParaVincular,
  liberacoesVigentes,
  obrasEmAtencao,
  plataformaDaObra,
  podeAtivarPlataforma,
  resumoVisao,
  type AlocacaoRegistro,
  type CertificadoRegistro,
  type ColaboradorGestao,
  type LiberacaoRegistro,
  type ObraRegistro,
  type PlataformaRegistro,
  type RequisitoRegistro,
} from "../lib/gestao-plataformas";
import { montarHistoricoExamesColaborador } from "../lib/portal-colaboradores";
import { canAccessPath } from "../lib/permissions";

const hoje = "2026-11-13";
const cliente = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const outroCliente = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function plataformas(ativas: number, arquivada = false): PlataformaRegistro[] {
  const lista: PlataformaRegistro[] = Array.from({ length: ativas }, (_, indice) => ({
    id: `p${indice + 1}`,
    nome: `Plataforma ${indice + 1}`,
    linkAcesso: "https://plataforma.exemplo",
    arquivadaEm: null,
  }));
  if (arquivada) {
    lista.push({
      id: "arquivada",
      nome: "Plataforma antiga",
      linkAcesso: "https://antiga.exemplo",
      arquivadaEm: "2026-10-01T00:00:00.000Z",
    });
  }
  return lista;
}

const base = plataformas(LIMITE_PLATAFORMAS_ATIVAS, true);
assert.equal(contarPlataformasAtivas(base), 10);
assert.equal(podeAtivarPlataforma({ plataformas: base }).ok, false);
assert.equal(
  podeAtivarPlataforma({ plataformas: base, plataformaId: "arquivada" }).ok,
  false
);
const comVaga = plataformas(9, true);
assert.equal(
  podeAtivarPlataforma({ plataformas: comVaga, plataformaId: "arquivada" }).ok,
  true
);
assert.equal(base.some((item) => item.id === "arquivada" && item.arquivadaEm), true);

const obras: ObraRegistro[] = [
  {
    id: "obra-a",
    plataformaId: "p1",
    nome: "Obra Norte",
    empresaResponsavel: "Construtora Norte",
    inicioPrevisto: "2026-11-20",
    responsavelAcompanhamento: "Ana",
  },
  {
    id: "obra-b",
    plataformaId: "p1",
    nome: "Obra Sul",
    empresaResponsavel: "Construtora Sul",
    inicioPrevisto: "2026-12-20",
    responsavelAcompanhamento: "Bruno",
  },
];

const colaboradores: ColaboradorGestao[] = [
  {
    id: "col-1",
    nome: "Marina Souza",
    cargo: "Técnica",
    situacao: "ativo",
    situacaoLabel: "Ativo",
  },
  {
    id: "col-2",
    nome: "Paulo Lima",
    cargo: "Auxiliar",
    situacao: "ativo",
    situacaoLabel: "Ativo",
  },
];

const alocacoes: AlocacaoRegistro[] = [
  { id: "a1", obraId: "obra-a", colaboradorId: "col-1", encerradaEm: null },
  { id: "a2", obraId: "obra-b", colaboradorId: "col-1", encerradaEm: null },
  {
    id: "a3",
    obraId: "obra-a",
    colaboradorId: "col-2",
    encerradaEm: "2026-11-01T00:00:00.000Z",
  },
];

assert.equal(plataformaDaObra(obras, "obra-a"), "p1");
assert.equal(plataformaDaObra(obras, "obra-b"), "p1");
assert.deepEqual(
  colaboradoresSemObra({ colaboradores, alocacoes }).map((item) => item.id),
  ["col-2"]
);
assert.equal(alocacaoAberta(alocacoes[2]), false);
assert.equal(alocacoes.some((item) => item.id === "a3"), true);

const requisitos: RequisitoRegistro[] = [
  {
    id: "req-a",
    obraId: "obra-a",
    abrangencia: "colaborador",
    cargo: null,
    colaboradorId: "col-1",
    tipo: "documento_sst",
    titulo: "ASO da obra norte",
    recorrente: false,
    competencia: null,
    responsavel: "Ana",
    prazo: "2026-11-18",
    validade: "2026-12-01",
    postadoEm: null,
    situacao: "pendente",
    motivoRecusa: null,
    agendamentoId: null,
    certificadoId: null,
  },
  {
    id: "req-b",
    obraId: "obra-b",
    abrangencia: "colaborador",
    cargo: null,
    colaboradorId: "col-1",
    tipo: "curso",
    titulo: "NR da obra sul",
    recorrente: false,
    competencia: null,
    responsavel: "Bruno",
    prazo: null,
    validade: "2026-11-01",
    postadoEm: "2026-10-20",
    situacao: "pendente",
    motivoRecusa: null,
    agendamentoId: "ag-1",
    certificadoId: null,
  },
  {
    id: "req-c",
    obraId: "obra-a",
    abrangencia: "empresa",
    cargo: null,
    colaboradorId: null,
    tipo: "documento_sst",
    titulo: "PGR da contratante",
    recorrente: true,
    competencia: "2026-11",
    responsavel: "Ana",
    prazo: null,
    validade: null,
    postadoEm: "2026-11-02",
    situacao: "recusado",
    motivoRecusa: "Arquivo ilegível",
    agendamentoId: null,
    certificadoId: null,
  },
];

const depois = atualizarSituacaoRequisito(requisitos, "req-a", "aprovado");
assert.equal(depois.find((item) => item.id === "req-a")?.situacao, "aprovado");
assert.equal(depois.find((item) => item.id === "req-b")?.situacao, "pendente");
assert.equal(depois.find((item) => item.id === "req-c")?.situacao, "recusado");

const liberacoes: LiberacaoRegistro[] = [
  {
    id: "lib-a",
    obraId: "obra-a",
    colaboradorId: "col-1",
    liberadoEm: "2026-11-12",
    responsavel: "Ana",
  },
];
const vigentes = liberacoesVigentes({ liberacoes, alocacoes });
assert.equal(vigentes.length, 1);
assert.equal(vigentes.some((item) => item.obraId === "obra-b"), false);

const visao = resumoVisao({
  plataformas: base,
  obras,
  alocacoes,
  requisitos,
  liberacoes,
  hoje,
});
assert.equal(visao.plataformasAtivas, 10);
assert.equal(visao.limite, 10);
assert.equal(
  filtrarObras({
    obras,
    plataformas: base,
    filtro: FILTRO_GESTAO_VAZIO,
    hoje,
    somenteMobilizacao: true,
  }).length,
  visao.mobilizacoes.length
);
assert.equal(visao.mobilizacoes[0]?.id, "obra-a");
assert.equal(
  filtrarRequisitos({
    requisitos,
    obras,
    filtro: { ...FILTRO_GESTAO_VAZIO, situacao: "recusado" },
    hoje,
  }).length,
  visao.recusados.length
);
assert.equal(
  filtrarRequisitos({
    requisitos,
    obras,
    filtro: { ...FILTRO_GESTAO_VAZIO, vencimento: "30" },
    hoje,
  }).length,
  visao.vencimentos.length
);
assert.equal(visao.liberados.length, 1);

assert.equal(clientePermitidoGestaoPlataformas({
  clienteId: cliente,
  clienteAutorizadoId: cliente,
}), true);
assert.equal(clientePermitidoGestaoPlataformas({
  clienteId: outroCliente,
  clienteAutorizadoId: cliente,
}), false);
assert.equal(ORCAMENTO_GESTAO_PLATAFORMAS_NUMERO, "ORC-2026-0087");
assert.equal(canAccessPath("admin", GESTAO_PLATAFORMAS_PATH), true);
assert.equal(canAccessPath("operacional", GESTAO_PLATAFORMAS_PATH), true);
assert.equal(
  NAV_SECTIONS.find((secao) => secao.title === "Gestão Comercial")?.items.some(
    (item) => item.href === GESTAO_PLATAFORMAS_PATH
  ),
  true
);

assert.deepEqual(idsParaVincular({
  alocacoes,
  obraId: "obra-a",
  colaboradorIds: ["col-1", "col-1", "col-2"],
}), ["col-2"]);
assert.equal(obrasEmAtencao({ obras, requisitos, hoje }).some((obra) => obra.id === "obra-a"), true);

const historico = montarHistoricoExamesColaborador({
  cpf: "52998224725",
  agendamentos: [
    {
      id: "ex-1",
      colaborador: "Marina Souza",
      colaborador_cpf: "52998224725",
      aso: "Periódico",
      status: "agendado",
      data_agendamento: "2026-10-01",
    },
    {
      id: "ex-futuro",
      colaborador: "Marina Souza",
      colaborador_cpf: "52998224725",
      aso: "Periódico",
      status: "agendado",
      data_agendamento: "2026-12-01",
    },
    {
      id: "ex-cancelado",
      colaborador: "Marina Souza",
      colaborador_cpf: "52998224725",
      aso: "Admissional",
      status: "cancelado",
      data_agendamento: "2026-09-01",
    },
    {
      id: "ex-homonimo",
      colaborador: "Marina Souza",
      colaborador_cpf: "39053344705",
      aso: "Admissional",
      status: "aso_retido",
      data_agendamento: "2026-08-01",
    },
  ],
});
assert.deepEqual(
  examesRealizadosDoColaborador({ exames: historico, hoje }).map((exame) => exame.id),
  ["ex-1"]
);
assert.deepEqual(
  examesProximosDoColaborador({ exames: historico, hoje }).map((exame) => exame.id),
  ["ex-futuro"]
);
assert.deepEqual(
  examesProximosDoColaborador({
    exames: [
      { id: "fut", dataIso: "2026-12-01", situacao: "Agendado" },
      { id: "can", dataIso: "2026-12-02", situacao: "Cancelado" },
      { id: "pas", dataIso: "2026-10-01", situacao: "Agendado" },
    ],
    hoje,
  }).map((exame) => exame.id),
  ["fut"]
);

const curso = { id: "curso-1", nome: "NR-35", valorCentavos: 18000, inativadoEm: "2026-11-01T00:00:00.000Z" };
const certificado: CertificadoRegistro = {
  id: "cert-1",
  colaboradorId: "col-1",
  cursoId: curso.id,
  realizadoEm: "2026-10-10",
  validade: "2027-10-10",
  arquivoNome: "certificado.pdf",
  arquivoPath: `${cliente}/certificados/cert-1/certificado.pdf`,
};
assert.equal(cursoAtivo(curso), false);
assert.equal(certificado.cursoId, curso.id);
assert.equal("valorCentavos" in certificado, false);
assert.equal(caminhoAnexoGestaoPermitido({
  path: certificado.arquivoPath ?? "",
  clienteId: cliente,
}), true);
assert.equal(caminhoAnexoGestaoPermitido({
  path: `${outroCliente}/rh/doc/arquivo.pdf`,
  clienteId: cliente,
}), false);
assert.equal(estadoListaColaboradores({
  carregando: false,
  falha: false,
  totalCadastro: 0,
  totalFiltrado: 0,
}), "vazio");
assert.equal(estadoListaColaboradores({
  carregando: false,
  falha: false,
  totalCadastro: 2,
  totalFiltrado: 0,
}), "sem_resultado");
assert.equal(estadoListaColaboradores({
  carregando: false,
  falha: true,
  totalCadastro: 0,
  totalFiltrado: 0,
}), "falha");

const comCertificado = atualizarSituacaoRequisito(
  requisitos.map((requisito) =>
    requisito.id === "req-a" ? { ...requisito, certificadoId: certificado.id } : requisito
  ),
  "req-a",
  "aprovado"
);
assert.equal(comCertificado.find((item) => item.id === "req-a")?.situacao, "aprovado");
assert.equal(comCertificado.find((item) => item.id === "req-b")?.situacao, "pendente");
assert.equal(comCertificado.find((item) => item.id === "req-a")?.certificadoId, certificado.id);
assert.equal(comCertificado.find((item) => item.id === "req-b")?.certificadoId, null);

console.log("test-gestao-plataformas: OK");
