import assert from "node:assert/strict";
import { NAV_SECTIONS } from "../lib/constants";
import {
  FILTRO_GESTAO_VAZIO,
  GESTAO_PLATAFORMAS_PATH,
  LIMITE_PLATAFORMAS_ATIVAS,
  ORCAMENTO_GESTAO_PLATAFORMAS_NUMERO,
  alocacaoAberta,
  atualizarSituacaoRequisito,
  clientePermitidoGestaoPlataformas,
  colaboradoresSemObra,
  contarPlataformasAtivas,
  filtrarObras,
  filtrarRequisitos,
  liberacoesVigentes,
  plataformaDaObra,
  podeAtivarPlataforma,
  resumoVisao,
  type AlocacaoRegistro,
  type ColaboradorGestao,
  type LiberacaoRegistro,
  type ObraRegistro,
  type PlataformaRegistro,
  type RequisitoRegistro,
} from "../lib/gestao-plataformas";
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

console.log("test-gestao-plataformas: OK");
