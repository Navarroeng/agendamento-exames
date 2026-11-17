import assert from "node:assert/strict";
import { acessoExternoVigente } from "../lib/acesso-externo-agrovias";
import {
  montarPlataformasPortal,
  asosDoColaborador,
  caminhoPublicacaoAgroviasPermitido,
  csvControlesAgrovias,
  documentosSstVigentes,
  eventosEsocialPortal,
  examesDaFichaPortal,
  filtrarPeriodicosPortal,
  montarPeriodicosPortal,
  validarPdfPublicacao,
  type DocumentoSstVersao,
} from "../lib/portal-agrovias-consulta";
import type { ObraRegistro, PlataformaRegistro, RequisitoRegistro } from "../lib/gestao-plataformas";

const cliente = "11111111-1111-4111-8111-111111111111";

assert.equal(
  acessoExternoVigente({
    perfil: "portal_agrovias",
    ativo: true,
    clienteId: cliente,
    clienteEscopo: cliente,
    revogadoEm: null,
  }),
  true
);
assert.equal(
  acessoExternoVigente({
    perfil: "portal_agrovias",
    ativo: true,
    clienteId: null,
    clienteEscopo: cliente,
    revogadoEm: null,
  }),
  false
);
assert.equal(
  acessoExternoVigente({
    perfil: "portal_agrovias",
    ativo: true,
    clienteId: cliente,
    clienteEscopo: cliente,
    revogadoEm: "2026-11-16T12:00:00.000Z",
  }),
  false
);

const versoes: DocumentoSstVersao[] = [
  {
    id: "antiga",
    tipo: "pgr",
    arquivoPath: `${cliente}/sst/pgr/antiga.pdf`,
    arquivoNome: "pgr-1.pdf",
    publicadoEm: "2026-01-01T00:00:00.000Z",
    vigente: false,
  },
  {
    id: "nova",
    tipo: "pgr",
    arquivoPath: `${cliente}/sst/pgr/nova.pdf`,
    arquivoNome: "pgr-2.pdf",
    publicadoEm: "2026-11-01T00:00:00.000Z",
    vigente: true,
  },
];
assert.deepEqual(documentosSstVigentes(versoes).map((item) => item.id), ["nova"]);
assert.equal(validarPdfPublicacao({ nome: "laudo.pdf", tipo: "application/pdf", tamanho: 100 }), null);
assert.equal(validarPdfPublicacao({ nome: "laudo.docx", tipo: "", tamanho: 100 }), "Envie um arquivo PDF.");
assert.equal(
  caminhoPublicacaoAgroviasPermitido({
    path: `${cliente}/sst/pgr/nova.pdf`,
    clienteId: cliente,
    pasta: "sst",
  }),
  true
);
assert.equal(
  caminhoPublicacaoAgroviasPermitido({
    path: `${cliente}/rh/segredo.pdf`,
    clienteId: cliente,
    pasta: "sst",
  }),
  false
);

const periodicos = montarPeriodicosPortal({
  periodicos: [
    {
      id: "prog",
      colaborador: "Ana",
      colaboradorCpf: "529.982.247-25",
      cargo: "Técnica",
      tipoExame: "Periódico",
      proximaData: "2026-12-01",
      status: "ativo",
    },
    {
      id: "agend",
      colaborador: "Bruno",
      colaboradorCpf: "390.533.447-05",
      cargo: "Operador",
      tipoExame: "Periódico",
      proximaData: "2026-08-01",
      status: "reagendado",
      agendamentoVinculadoId: "ag-1",
    },
    {
      id: "cancelado",
      colaborador: "Carla",
      cargo: "Auxiliar",
      tipoExame: "Periódico",
      proximaData: "2026-09-01",
      status: "cancelado",
      canceladoEm: "2026-07-01T00:00:00.000Z",
      motivoCancelamento: "Desligamento",
    },
  ],
  agendamentos: [
    {
      id: "ag-1",
      aso: "Periódico",
      status: "agendado",
      data: "2026-11-20",
      horario: "08:30:00",
      colaboradorCpf: "39053344705",
    },
  ],
});
assert.deepEqual(
  periodicos.map((item) => [item.id, item.situacao, item.previsao, item.data, item.horario]),
  [
    ["agend", "Agendado", null, "2026-11-20", "08:30"],
    ["prog", "Programado", "2026-12-01", null, null],
  ]
);
assert.equal(
  filtrarPeriodicosPortal({ linhas: periodicos, busca: "ana", mes: "", situacao: "" }).length,
  1
);
assert.equal(
  filtrarPeriodicosPortal({ linhas: periodicos, busca: "", mes: "2026-11", situacao: "Agendado" }).length,
  1
);
const ficha = examesDaFichaPortal({
  periodicos,
  cpf: "390.533.447-05",
  nome: "Bruno",
  agendamentos: [
    {
      id: "ag-1",
      tipoExame: "Periódico",
      dataLabel: "20/11/2026",
      horarioLabel: "08:30",
      situacao: "Agendado",
    },
  ],
});
assert.equal(ficha.length, 1);
assert.equal(ficha[0]?.situacao, "Agendado");

const esocial = eventosEsocialPortal({
  agendamentos: [
    {
      id: "ok",
      colaboradorCpf: "52998224725",
      aso: "Periódico",
      envioEsocial: true,
      dataEnvioEsocial: "2026-11-18",
      esocialRecibo: "1.1.0000000000000000001",
      data: "2026-11-01",
    },
    {
      id: "cancelado",
      colaboradorCpf: "52998224725",
      aso: "Periódico",
      envioEsocial: true,
      dataEnvioEsocial: "2026-11-02",
      esocialRecibo: "1.1.0000000000000000002",
      esocialEnvioCancelado: true,
    },
    {
      id: "sem-recibo",
      colaboradorCpf: "52998224725",
      aso: "Periódico",
      envioEsocial: true,
      dataEnvioEsocial: "2026-11-03",
      esocialRecibo: "",
    },
  ],
  cpf: "529.982.247-25",
});
assert.equal(esocial.length, 1);
assert.equal(esocial[0]?.dataTransmissao, "2026-11-18");
assert.equal(esocial[0]?.tipoEvento, "Periódico");
assert.equal(esocial[0]?.comprovanteDisponivel, false);
assert.equal(eventosEsocialPortal({ agendamentos: [], cpf: "" }).length, 0);

const asos = asosDoColaborador({
  publicados: [{ id: "aso-1", agendamentoId: "ag-1", arquivoNome: "aso.pdf" }],
  agendamentos: [{ id: "ag-1", colaboradorCpf: "52998224725", aso: "Periódico", data: "2026-11-01" }],
  cpf: "529.982.247-25",
});
assert.equal(asos.length, 1);
assert.equal(
  asosDoColaborador({
    publicados: [{ id: "aso-1", agendamentoId: "ag-1", arquivoNome: "aso.pdf" }],
    agendamentos: [{ id: "ag-1", colaboradorCpf: "39053344705", aso: "Periódico", data: "2026-11-01" }],
    cpf: "529.982.247-25",
  }).length,
  0
);

const plataforma: PlataformaRegistro = {
  id: "plat",
  nome: "Plataforma Norte",
  linkAcesso: "https://exemplo.test",
  arquivadaEm: null,
};
const obra: ObraRegistro = {
  id: "obra",
  plataformaId: "plat",
  nome: "Obra 1",
  empresaResponsavel: "AgroVias",
  inicioPrevisto: "2026-12-01",
  responsavelAcompanhamento: "Ana",
};
const requisito: RequisitoRegistro = {
  id: "req",
  obraId: "obra",
  abrangencia: "colaborador",
  cargo: null,
  colaboradorId: "col-1",
  tipo: "exame",
  titulo: "Periódico",
  recorrente: false,
  competencia: null,
  responsavel: null,
  prazo: null,
  validade: "2026-12-15",
  postadoEm: null,
  situacao: "pendente",
  motivoRecusa: null,
  agendamentoId: null,
  certificadoId: null,
};
const csv = csvControlesAgrovias({
  extraidoEm: "2026-11-16",
  plataformas: [plataforma],
  obras: [obra],
  requisitos: [requisito],
  nomeColaborador: () => "Ana",
});
assert.match(csv, /2026-11-16/);
assert.match(csv, /Plataforma Norte/);
assert.match(csv, /Periódico/);
assert.match(csv, /Pendente/);

const consultaPlataformas = montarPlataformasPortal({
  hoje: "2026-11-16",
  plataformas: [
    plataforma,
    { id: "arquivada", nome: "Antiga", linkAcesso: "https://exemplo.test", arquivadaEm: "2026-01-01" },
  ],
  obras: [obra],
  requisitos: [requisito],
  nomeColaborador: () => "Ana",
});
assert.equal(consultaPlataformas.length, 1);
assert.equal(consultaPlataformas[0]?.nome, "Plataforma Norte");
assert.equal(consultaPlataformas[0]?.obras[0]?.pendencias, 1);
assert.equal(consultaPlataformas[0]?.obras[0]?.documentos[0]?.situacao, "Pendente");
assert.equal(consultaPlataformas[0]?.obras[0]?.vencimentos[0]?.validade, "2026-12-15");
assert.equal(consultaPlataformas[0]?.obras[0]?.documentos[0]?.colaborador, "Ana");
assert.equal("linkAcesso" in (consultaPlataformas[0] ?? {}), false);

console.log("test-portal-agrovias-consulta: OK");
