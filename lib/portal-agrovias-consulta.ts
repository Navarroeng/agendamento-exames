import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { isEnvioEsocialConcluido } from "@/lib/esocial-filters";
import { formatEsocialReciboForDisplay } from "@/lib/esocial-recibo";
import { isAgendamentoCancelado } from "@/lib/contrato-agendamentos";
import { isPeriodicoCanceladoManualmente } from "@/lib/periodico-cancelamento";
import { normalizeCpfDigits } from "@/lib/cpf";
import { formatHorarioDisplay } from "@/lib/format-datetime";
import {
  SITUACAO_REQUISITO_LABEL,
  TIPO_REQUISITO_LABEL,
  type ObraRegistro,
  type PlataformaRegistro,
  type RequisitoRegistro,
} from "@/lib/gestao-plataformas";

export const TIPOS_DOCUMENTO_SST_PORTAL = [
  "pgr",
  "ltcat",
  "pcmso",
  "riscos_psicossociais",
] as const;

export type TipoDocumentoSstPortal = (typeof TIPOS_DOCUMENTO_SST_PORTAL)[number];

export const TIPO_DOCUMENTO_SST_LABEL: Record<TipoDocumentoSstPortal, string> = {
  pgr: "PGR",
  ltcat: "LTCAT",
  pcmso: "PCMSO",
  riscos_psicossociais: "Relatório consolidado de riscos psicossociais",
};

export type DocumentoSstVersao = {
  id: string;
  tipo: TipoDocumentoSstPortal;
  arquivoPath: string;
  arquivoNome: string;
  publicadoEm: string;
  vigente: boolean;
};

export type PeriodicoFontePortal = {
  id: string;
  colaborador: string;
  colaboradorCpf?: string | null;
  cargo: string | null;
  tipoExame: string;
  proximaData: string;
  status: string;
  canceladoEm?: string | null;
  motivoCancelamento?: string | null;
  agendamentoVinculadoId?: string | null;
};

export type AgendamentoFontePortal = {
  id: string;
  colaborador?: string | null;
  colaboradorCpf?: string | null;
  aso?: string | null;
  status?: string | null;
  data?: string | null;
  horario?: string | null;
  envioEsocial?: boolean | string | null;
  dataEnvioEsocial?: string | null;
  esocialRecibo?: string | null;
  esocialEnvioCancelado?: boolean | null;
};

export type PeriodicoPortal = {
  id: string;
  colaborador: string;
  colaboradorCpf: string;
  cargo: string;
  tipoExame: string;
  situacao: "Programado" | "Agendado";
  previsao: string | null;
  data: string | null;
  horario: string | null;
  agendamentoId: string | null;
};

export type EventoEsocialPortal = {
  id: string;
  colaboradorCpf: string;
  tipoEvento: string;
  dataTransmissao: string;
  recibo: string;
  comprovanteDisponivel: false;
};

export type AsoPublicadoFonte = {
  id: string;
  agendamentoId: string;
  arquivoNome: string;
};

export type AsoPortal = {
  id: string;
  agendamentoId: string;
  tipoExame: string;
  data: string;
  arquivoNome: string;
};

function cpf(valor: string | null | undefined): string {
  return normalizeCpfDigits(valor);
}

function iso(valor: string | null | undefined): string | null {
  const texto = String(valor ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

export function isTipoDocumentoSstPortal(valor: string): valor is TipoDocumentoSstPortal {
  return (TIPOS_DOCUMENTO_SST_PORTAL as readonly string[]).includes(valor);
}

export function validarPdfPublicacao(params: {
  nome: string;
  tipo: string;
  tamanho: number;
}): string | null {
  if (!params.nome.trim().toLowerCase().endsWith(".pdf")) {
    return "Envie um arquivo PDF.";
  }
  const mime = params.tipo.trim().toLowerCase();
  if (mime && mime !== "application/pdf") return "Envie um arquivo PDF.";
  if (params.tamanho <= 0 || params.tamanho > 10 * 1024 * 1024) {
    return "O PDF precisa ter até 10 MB.";
  }
  return null;
}

export function caminhoPublicacaoAgroviasPermitido(params: {
  path: string;
  clienteId: string;
  pasta: "sst" | "aso";
}): boolean {
  const caminho = params.path.replace(/\\/g, "/").trim();
  const cliente = params.clienteId.trim();
  if (!caminho || !cliente || caminho.includes("..")) return false;
  return caminho.startsWith(`${cliente}/${params.pasta}/`) && caminho.toLowerCase().endsWith(".pdf");
}

export function documentosSstVigentes(
  versoes: readonly DocumentoSstVersao[]
): DocumentoSstVersao[] {
  const porTipo = new Map<TipoDocumentoSstPortal, DocumentoSstVersao>();
  for (const versao of versoes) {
    if (!versao.vigente) continue;
    const atual = porTipo.get(versao.tipo);
    if (!atual || versao.publicadoEm >= atual.publicadoEm) porTipo.set(versao.tipo, versao);
  }
  return TIPOS_DOCUMENTO_SST_PORTAL.flatMap((tipo) => {
    const versao = porTipo.get(tipo);
    return versao ? [versao] : [];
  });
}

function agendamentoAtivo(agendamento: AgendamentoFontePortal | undefined): boolean {
  if (!agendamento) return false;
  if (isAgendamentoCancelado(agendamento.status)) return false;
  const status = String(agendamento.status ?? "").trim().toLowerCase();
  return status === "agendado" || status === "aso_retido" || status === "realizado" || status === "concluido";
}

export function montarPeriodicosPortal(params: {
  periodicos: readonly PeriodicoFontePortal[];
  agendamentos: readonly AgendamentoFontePortal[];
}): PeriodicoPortal[] {
  const porId = new Map(params.agendamentos.map((item) => [item.id, item]));
  const linhas: PeriodicoPortal[] = [];
  for (const periodico of params.periodicos) {
    if (
      periodico.status === "cancelado" ||
      isPeriodicoCanceladoManualmente({
        status: periodico.status as "ativo" | "reagendado" | "cancelado",
        cancelado_em: periodico.canceladoEm,
        motivo_cancelamento: periodico.motivoCancelamento,
      })
    ) {
      continue;
    }
    const vinculado = periodico.agendamentoVinculadoId
      ? porId.get(periodico.agendamentoVinculadoId)
      : undefined;
    if (periodico.status === "reagendado" || (vinculado && agendamentoAtivo(vinculado))) {
      if (!agendamentoAtivo(vinculado)) continue;
      linhas.push({
        id: periodico.id,
        colaborador: periodico.colaborador,
        colaboradorCpf: cpf(periodico.colaboradorCpf),
        cargo: periodico.cargo?.trim() || "Cargo não informado",
        tipoExame: periodico.tipoExame.trim() || vinculado?.aso?.trim() || "Exame",
        situacao: "Agendado",
        previsao: null,
        data: iso(vinculado?.data),
        horario: vinculado?.horario ? formatHorarioDisplay(vinculado.horario).slice(0, 5) : null,
        agendamentoId: vinculado?.id ?? null,
      });
      continue;
    }
    if (periodico.status !== "ativo") continue;
    linhas.push({
      id: periodico.id,
      colaborador: periodico.colaborador,
      colaboradorCpf: cpf(periodico.colaboradorCpf),
      cargo: periodico.cargo?.trim() || "Cargo não informado",
      tipoExame: periodico.tipoExame.trim() || "Exame",
      situacao: "Programado",
      previsao: iso(periodico.proximaData),
      data: null,
      horario: null,
      agendamentoId: null,
    });
  }
  return linhas.sort((a, b) => {
    const dataA = a.situacao === "Agendado" ? a.data ?? "" : a.previsao ?? "";
    const dataB = b.situacao === "Agendado" ? b.data ?? "" : b.previsao ?? "";
    return dataA.localeCompare(dataB) || a.colaborador.localeCompare(b.colaborador);
  });
}

export function filtrarPeriodicosPortal(params: {
  linhas: readonly PeriodicoPortal[];
  busca: string;
  mes: string;
  situacao: "" | "Programado" | "Agendado";
}): PeriodicoPortal[] {
  const busca = params.busca.trim().toLocaleLowerCase();
  const mes = params.mes.trim();
  return params.linhas.filter((linha) => {
    if (params.situacao && linha.situacao !== params.situacao) return false;
    if (busca && !linha.colaborador.toLocaleLowerCase().includes(busca)) return false;
    if (mes) {
      const data = linha.situacao === "Agendado" ? linha.data : linha.previsao;
      if (!data || data.slice(0, 7) !== mes) return false;
    }
    return true;
  });
}

export function eventosEsocialPortal(params: {
  agendamentos: readonly AgendamentoFontePortal[];
  cpf?: string | null;
}): EventoEsocialPortal[] {
  const filtrarPessoa = params.cpf !== undefined;
  const alvo = cpf(params.cpf);
  if (filtrarPessoa && !alvo) return [];
  return params.agendamentos.flatMap((agendamento) => {
    if (agendamento.esocialEnvioCancelado) return [];
    if (!isEnvioEsocialConcluido(agendamento.envioEsocial)) return [];
    const recibo = formatEsocialReciboForDisplay(agendamento.esocialRecibo);
    if (!recibo) return [];
    const data = iso(agendamento.dataEnvioEsocial);
    if (!data) return [];
    const documento = cpf(agendamento.colaboradorCpf);
    if (filtrarPessoa && documento !== alvo) return [];
    return [{
      id: agendamento.id,
      colaboradorCpf: documento,
      tipoEvento: String(agendamento.aso ?? "").trim() || "Evento de SST",
      dataTransmissao: data,
      recibo,
      comprovanteDisponivel: false as const,
    }];
  });
}

export function asosDoColaborador(params: {
  publicados: readonly AsoPublicadoFonte[];
  agendamentos: readonly AgendamentoFontePortal[];
  cpf: string;
}): AsoPortal[] {
  const alvo = cpf(params.cpf);
  if (!alvo) return [];
  const porId = new Map(params.agendamentos.map((item) => [item.id, item]));
  return params.publicados.flatMap((publicado) => {
    const agendamento = porId.get(publicado.agendamentoId);
    if (!agendamento || cpf(agendamento.colaboradorCpf) !== alvo) return [];
    return [{
      id: publicado.id,
      agendamentoId: publicado.agendamentoId,
      tipoExame: String(agendamento.aso ?? "").trim() || "ASO",
      data: iso(agendamento.data) ?? "",
      arquivoNome: publicado.arquivoNome,
    }];
  });
}

export type ExameFichaPortal = {
  id: string;
  tipoExame: string;
  situacao: string;
  quando: string;
};

export function examesDaFichaPortal(params: {
  periodicos: readonly PeriodicoPortal[];
  agendamentos: readonly {
    id: string;
    tipoExame: string;
    dataLabel: string;
    horarioLabel: string;
    situacao: string;
  }[];
  cpf: string;
  nome: string;
}): ExameFichaPortal[] {
  const alvo = cpf(params.cpf);
  const nome = params.nome.trim().toLocaleLowerCase();
  const doColaborador = params.periodicos.filter((linha) => {
    if (alvo && linha.colaboradorCpf) return linha.colaboradorCpf === alvo;
    return linha.colaborador.trim().toLocaleLowerCase() === nome;
  });
  const ocupados = new Set(
    doColaborador.flatMap((linha) => (linha.agendamentoId ? [linha.agendamentoId] : []))
  );
  const programados = doColaborador.map((linha) => ({
    id: linha.id,
    tipoExame: linha.tipoExame,
    situacao: linha.situacao,
    quando:
      linha.situacao === "Agendado"
        ? [labelDataPortal(linha.data), linha.horario].filter(Boolean).join(" · ")
        : `Previsão ${labelDataPortal(linha.previsao)}`,
  }));
  const extras = params.agendamentos
    .filter((item) => !ocupados.has(item.id))
    .map((item) => ({
      id: item.id,
      tipoExame: item.tipoExame,
      situacao: item.situacao,
      quando: [item.dataLabel, item.horarioLabel].filter((parte) => parte && parte !== "Não informado").join(" · "),
    }));
  return [...programados, ...extras];
}

export function labelDataPortal(isoData: string | null): string {
  return isoData ? formatDateIsoToBR(isoData) : "Não informado";
}

function csvCampo(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

export function csvControlesAgrovias(params: {
  extraidoEm: string;
  plataformas: readonly PlataformaRegistro[];
  obras: readonly ObraRegistro[];
  requisitos: readonly RequisitoRegistro[];
  nomeColaborador: (id: string) => string;
}): string {
  const plataformas = new Map(params.plataformas.map((item) => [item.id, item.nome]));
  const obras = new Map(params.obras.map((item) => [item.id, item]));
  const cabecalho = [
    "extraido_em",
    "plataforma",
    "obra",
    "colaborador",
    "tipo",
    "titulo",
    "validade",
    "situacao",
  ];
  const linhas = params.requisitos.map((requisito) => {
    const obra = obras.get(requisito.obraId);
    return [
      params.extraidoEm,
      obra ? plataformas.get(obra.plataformaId) ?? "" : "",
      obra?.nome ?? "",
      requisito.colaboradorId ? params.nomeColaborador(requisito.colaboradorId) : "",
      TIPO_REQUISITO_LABEL[requisito.tipo],
      requisito.titulo,
      requisito.validade ?? "",
      SITUACAO_REQUISITO_LABEL[requisito.situacao],
    ].map(csvCampo).join(";");
  });
  return `\uFEFF${cabecalho.join(";")}\n${linhas.join("\n")}`;
}
