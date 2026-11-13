/**
 * Gestão de Plataformas da AGROVIAS.
 * A habilitação usa o orçamento ORC-2026-0087 e o cliente vinculado a ele.
 * O nome do serviço no orçamento não escolhe o módulo.
 */

import {
  LIMITE_PLATAFORMAS_CONTRATO,
  ORCAMENTO_GESTAO_SST_PLATAFORMAS_NUMERO,
} from "@/lib/contrato-gestao-sst-plataformas";

export const GESTAO_PLATAFORMAS_PATH = "/gestao-plataformas";
export const GESTAO_PLATAFORMAS_MENU = "Gestão de Plataformas";
export const ORCAMENTO_GESTAO_PLATAFORMAS_NUMERO =
  ORCAMENTO_GESTAO_SST_PLATAFORMAS_NUMERO;
export const LIMITE_PLATAFORMAS_ATIVAS = LIMITE_PLATAFORMAS_CONTRATO;
export const JANELA_DIAS_GESTAO_PLATAFORMAS = 30;

export const SITUACOES_REQUISITO = [
  "pendente",
  "pronto_para_postar",
  "enviado",
  "aprovado",
  "recusado",
] as const;

export type SituacaoRequisito = (typeof SITUACOES_REQUISITO)[number];

export const SITUACAO_REQUISITO_LABEL: Record<SituacaoRequisito, string> = {
  pendente: "Pendente",
  pronto_para_postar: "Pronto para postar",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const ABRANGENCIAS_REQUISITO = [
  "equipe",
  "funcao",
  "colaborador",
  "empresa",
] as const;

export type AbrangenciaRequisito = (typeof ABRANGENCIAS_REQUISITO)[number];

export const ABRANGENCIA_REQUISITO_LABEL: Record<AbrangenciaRequisito, string> = {
  equipe: "Toda a equipe",
  funcao: "Por função",
  colaborador: "Por colaborador",
  empresa: "Documento de SST da empresa",
};

export const TIPOS_REQUISITO = ["curso", "exame", "documento_sst"] as const;
export type TipoRequisito = (typeof TIPOS_REQUISITO)[number];

export const TIPO_REQUISITO_LABEL: Record<TipoRequisito, string> = {
  curso: "Curso",
  exame: "Exame",
  documento_sst: "Documento de SST",
};

export type PlataformaRegistro = {
  id: string;
  nome: string;
  linkAcesso: string;
  arquivadaEm: string | null;
};

export type ObraRegistro = {
  id: string;
  plataformaId: string;
  nome: string;
  empresaResponsavel: string;
  inicioPrevisto: string | null;
  responsavelAcompanhamento: string;
};

export type AlocacaoRegistro = {
  id: string;
  obraId: string;
  colaboradorId: string;
  encerradaEm: string | null;
};

export type RequisitoRegistro = {
  id: string;
  obraId: string;
  abrangencia: AbrangenciaRequisito;
  cargo: string | null;
  colaboradorId: string | null;
  tipo: TipoRequisito;
  titulo: string;
  recorrente: boolean;
  competencia: string | null;
  responsavel: string | null;
  prazo: string | null;
  validade: string | null;
  postadoEm: string | null;
  situacao: SituacaoRequisito;
  motivoRecusa: string | null;
  agendamentoId: string | null;
  certificadoId: string | null;
};

export type LiberacaoRegistro = {
  id: string;
  obraId: string;
  colaboradorId: string;
  liberadoEm: string;
  responsavel: string;
};

export type ColaboradorGestao = {
  id: string;
  nome: string;
  cargo: string;
  situacao: "ativo" | "demitido";
  situacaoLabel: string;
};

export type FiltroGestaoPlataformas = {
  busca: string;
  plataformaId: string;
  obraId: string;
  colaboradorId: string;
  situacao: "" | SituacaoRequisito | "vencido" | "sem_obra" | "liberado";
  vencimento: "" | "30" | "vencido";
};

export const FILTRO_GESTAO_VAZIO: FiltroGestaoPlataformas = {
  busca: "",
  plataformaId: "",
  obraId: "",
  colaboradorId: "",
  situacao: "",
  vencimento: "",
};

export function somarDiasIso(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, (mes || 1) - 1, dia || 1));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function plataformaAtiva(plataforma: PlataformaRegistro): boolean {
  return !plataforma.arquivadaEm;
}

export function alocacaoAberta(alocacao: AlocacaoRegistro): boolean {
  return !alocacao.encerradaEm;
}

export function contarPlataformasAtivas(
  plataformas: readonly PlataformaRegistro[]
): number {
  return plataformas.filter(plataformaAtiva).length;
}

export function podeAtivarPlataforma(params: {
  plataformas: readonly PlataformaRegistro[];
  plataformaId?: string | null;
}): { ok: true } | { ok: false; erro: string } {
  const ativas = params.plataformas.filter(
    (plataforma) =>
      plataformaAtiva(plataforma) && plataforma.id !== params.plataformaId
  ).length;
  if (ativas >= LIMITE_PLATAFORMAS_ATIVAS) {
    return {
      ok: false,
      erro: `O limite é de ${LIMITE_PLATAFORMAS_ATIVAS} plataformas ativas. Arquive uma plataforma antes de incluir ou reativar outra.`,
    };
  }
  return { ok: true };
}

export function linkPlataformaValido(link: string): boolean {
  try {
    const url = new URL(link.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function requisitoVencido(
  requisito: Pick<RequisitoRegistro, "validade">,
  hoje: string
): boolean {
  return Boolean(requisito.validade && requisito.validade < hoje);
}

export function requisitoVenceNaJanela(
  requisito: Pick<RequisitoRegistro, "validade">,
  hoje: string,
  dias = JANELA_DIAS_GESTAO_PLATAFORMAS
): boolean {
  if (!requisito.validade) return false;
  const limite = somarDiasIso(hoje, dias);
  return requisito.validade >= hoje && requisito.validade <= limite;
}

export function obrasMobilizacaoProxima(
  obras: readonly ObraRegistro[],
  hoje: string,
  dias = JANELA_DIAS_GESTAO_PLATAFORMAS
): ObraRegistro[] {
  const limite = somarDiasIso(hoje, dias);
  return obras
    .filter(
      (obra) =>
        Boolean(obra.inicioPrevisto) &&
        obra.inicioPrevisto! >= hoje &&
        obra.inicioPrevisto! <= limite
    )
    .sort((a, b) =>
      String(a.inicioPrevisto).localeCompare(String(b.inicioPrevisto))
    );
}

export function requisitosRecusados(
  requisitos: readonly RequisitoRegistro[]
): RequisitoRegistro[] {
  return requisitos.filter((requisito) => requisito.situacao === "recusado");
}

export function requisitosVencendo(
  requisitos: readonly RequisitoRegistro[],
  hoje: string
): RequisitoRegistro[] {
  return requisitos
    .filter((requisito) => requisitoVenceNaJanela(requisito, hoje))
    .sort((a, b) => String(a.validade).localeCompare(String(b.validade)));
}

export function liberacoesVigentes(params: {
  liberacoes: readonly LiberacaoRegistro[];
  alocacoes: readonly AlocacaoRegistro[];
}): LiberacaoRegistro[] {
  const abertas = new Set(
    params.alocacoes.filter(alocacaoAberta).map(
      (alocacao) => `${alocacao.obraId}:${alocacao.colaboradorId}`
    )
  );
  const porChave = new Map<string, LiberacaoRegistro>();
  for (const liberacao of params.liberacoes) {
    const chave = `${liberacao.obraId}:${liberacao.colaboradorId}`;
    if (!abertas.has(chave)) continue;
    const atual = porChave.get(chave);
    if (!atual || liberacao.liberadoEm >= atual.liberadoEm) {
      porChave.set(chave, liberacao);
    }
  }
  return Array.from(porChave.values());
}

export function colaboradoresSemObra<T extends { id: string }>(params: {
  colaboradores: readonly T[];
  alocacoes: readonly AlocacaoRegistro[];
}): T[] {
  const vinculados = new Set(
    params.alocacoes.filter(alocacaoAberta).map((alocacao) => alocacao.colaboradorId)
  );
  return params.colaboradores.filter(
    (colaborador) => !vinculados.has(colaborador.id)
  );
}

export function pendenciasAbertasDaObra(
  requisitos: readonly RequisitoRegistro[],
  obraId: string,
  hoje: string
): number {
  return requisitos.filter(
    (requisito) =>
      requisito.obraId === obraId &&
      (requisito.situacao === "pendente" ||
        requisito.situacao === "pronto_para_postar" ||
        requisito.situacao === "recusado" ||
        requisitoVencido(requisito, hoje))
  ).length;
}

export function contagemEquipeObra(
  alocacoes: readonly AlocacaoRegistro[],
  liberacoes: readonly LiberacaoRegistro[],
  obraId: string
): { vinculados: number; liberados: number } {
  const abertas = alocacoes.filter(
    (alocacao) => alocacao.obraId === obraId && alocacaoAberta(alocacao)
  );
  const liberados = liberacoesVigentes({ liberacoes, alocacoes }).filter(
    (liberacao) => liberacao.obraId === obraId
  ).length;
  return { vinculados: abertas.length, liberados };
}

function normalizarBusca(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function contemBusca(texto: string, busca: string): boolean {
  if (!busca) return true;
  return normalizarBusca(texto).includes(normalizarBusca(busca));
}

export function filtrarObras(params: {
  obras: readonly ObraRegistro[];
  plataformas: readonly PlataformaRegistro[];
  filtro: FiltroGestaoPlataformas;
  hoje: string;
  somenteMobilizacao?: boolean;
}): ObraRegistro[] {
  const mobilizacao = new Set(
    obrasMobilizacaoProxima(params.obras, params.hoje).map((obra) => obra.id)
  );
  return params.obras.filter((obra) => {
    if (params.filtro.plataformaId && obra.plataformaId !== params.filtro.plataformaId) {
      return false;
    }
    if (params.filtro.obraId && obra.id !== params.filtro.obraId) return false;
    if (params.somenteMobilizacao && !mobilizacao.has(obra.id)) return false;
    const plataforma = params.plataformas.find(
      (item) => item.id === obra.plataformaId
    );
    return contemBusca(
      `${obra.nome} ${obra.empresaResponsavel} ${obra.responsavelAcompanhamento} ${plataforma?.nome ?? ""}`,
      params.filtro.busca
    );
  });
}

export function filtrarRequisitos(params: {
  requisitos: readonly RequisitoRegistro[];
  obras: readonly ObraRegistro[];
  filtro: FiltroGestaoPlataformas;
  hoje: string;
  somenteRecusados?: boolean;
  somenteVencendo?: boolean;
}): RequisitoRegistro[] {
  const obrasPorId = new Map(params.obras.map((obra) => [obra.id, obra]));
  return params.requisitos.filter((requisito) => {
    const obra = obrasPorId.get(requisito.obraId);
    if (params.filtro.plataformaId && obra?.plataformaId !== params.filtro.plataformaId) {
      return false;
    }
    if (params.filtro.obraId && requisito.obraId !== params.filtro.obraId) {
      return false;
    }
    if (
      params.filtro.colaboradorId &&
      requisito.colaboradorId !== params.filtro.colaboradorId
    ) {
      return false;
    }
    if (params.somenteRecusados && requisito.situacao !== "recusado") return false;
    if (params.somenteVencendo && !requisitoVenceNaJanela(requisito, params.hoje)) {
      return false;
    }
    if (params.filtro.situacao === "vencido" && !requisitoVencido(requisito, params.hoje)) {
      return false;
    }
    if (
      params.filtro.situacao &&
      params.filtro.situacao !== "vencido" &&
      params.filtro.situacao !== "sem_obra" &&
      params.filtro.situacao !== "liberado" &&
      requisito.situacao !== params.filtro.situacao
    ) {
      return false;
    }
    if (params.filtro.vencimento === "30" && !requisitoVenceNaJanela(requisito, params.hoje)) {
      return false;
    }
    if (params.filtro.vencimento === "vencido" && !requisitoVencido(requisito, params.hoje)) {
      return false;
    }
    return contemBusca(
      `${requisito.titulo} ${TIPO_REQUISITO_LABEL[requisito.tipo]} ${obra?.nome ?? ""}`,
      params.filtro.busca
    );
  });
}

export function situacaoIndependentePorObra(params: {
  requisitos: readonly RequisitoRegistro[];
  obraId: string;
  colaboradorId: string;
}): RequisitoRegistro[] {
  return params.requisitos.filter(
    (requisito) =>
      requisito.obraId === params.obraId &&
      (requisito.abrangencia === "equipe" ||
        requisito.abrangencia === "empresa" ||
        requisito.colaboradorId === params.colaboradorId)
  );
}

export function plataformaDaObra(
  obras: readonly ObraRegistro[],
  obraId: string
): string | null {
  return obras.find((obra) => obra.id === obraId)?.plataformaId ?? null;
}

export function clientePermitidoGestaoPlataformas(params: {
  clienteId: string | null | undefined;
  clienteAutorizadoId: string | null | undefined;
}): boolean {
  const cliente = String(params.clienteId ?? "").trim();
  const autorizado = String(params.clienteAutorizadoId ?? "").trim();
  return Boolean(cliente && autorizado && cliente === autorizado);
}

export function atualizarSituacaoRequisito(
  requisitos: readonly RequisitoRegistro[],
  requisitoId: string,
  situacao: SituacaoRequisito,
  motivoRecusa: string | null = null
): RequisitoRegistro[] {
  return requisitos.map((requisito) =>
    requisito.id === requisitoId
      ? { ...requisito, situacao, motivoRecusa }
      : requisito
  );
}

export function resumoVisao(params: {
  plataformas: readonly PlataformaRegistro[];
  obras: readonly ObraRegistro[];
  alocacoes: readonly AlocacaoRegistro[];
  requisitos: readonly RequisitoRegistro[];
  liberacoes: readonly LiberacaoRegistro[];
  hoje: string;
}) {
  const mobilizacoes = obrasMobilizacaoProxima(params.obras, params.hoje);
  const recusados = requisitosRecusados(params.requisitos);
  const vencimentos = requisitosVencendo(params.requisitos, params.hoje);
  const liberados = liberacoesVigentes({
    liberacoes: params.liberacoes,
    alocacoes: params.alocacoes,
  });
  return {
    plataformasAtivas: contarPlataformasAtivas(params.plataformas),
    limite: LIMITE_PLATAFORMAS_ATIVAS,
    mobilizacoes,
    recusados,
    vencimentos,
    liberados,
  };
}

export function validarPlataformaEntrada(input: {
  nome: string;
  linkAcesso: string;
}): string | null {
  if (input.nome.trim().length < 2) return "Informe o nome da plataforma.";
  if (!linkPlataformaValido(input.linkAcesso)) {
    return "Informe um link de acesso válido, começando com http:// ou https://.";
  }
  return null;
}

export function validarObraEntrada(input: {
  nome: string;
  empresaResponsavel: string;
  inicioPrevisto: string;
  responsavelAcompanhamento: string;
}): string | null {
  if (input.nome.trim().length < 2) return "Informe o nome da obra.";
  if (input.empresaResponsavel.trim().length < 2) {
    return "Informe a empresa responsável pela obra.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.inicioPrevisto)) {
    return "Informe a data prevista de início.";
  }
  if (input.responsavelAcompanhamento.trim().length < 2) {
    return "Informe o responsável pelo acompanhamento.";
  }
  return null;
}

export function validarRequisitoEntrada(input: {
  abrangencia: string;
  cargo: string | null;
  colaboradorId: string | null;
  tipo: string;
  titulo: string;
  recorrente: boolean;
  competencia: string | null;
  situacao: string;
  motivoRecusa: string | null;
}): string | null {
  if (!ABRANGENCIAS_REQUISITO.includes(input.abrangencia as AbrangenciaRequisito)) {
    return "Escolha a abrangência do requisito.";
  }
  if (!TIPOS_REQUISITO.includes(input.tipo as TipoRequisito)) {
    return "O módulo acompanha cursos, exames e documentos de SST.";
  }
  if (input.titulo.trim().length < 2) return "Informe o título do requisito.";
  if (input.abrangencia === "colaborador" && !input.colaboradorId) {
    return "Selecione o colaborador do requisito individual.";
  }
  if (input.abrangencia === "funcao" && !String(input.cargo ?? "").trim()) {
    return "Informe a função do requisito.";
  }
  if (input.recorrente && !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.competencia ?? "")) {
    return "Informe a competência no formato AAAA-MM.";
  }
  if (!SITUACOES_REQUISITO.includes(input.situacao as SituacaoRequisito)) {
    return "Situação inválida.";
  }
  if (input.situacao === "recusado" && !String(input.motivoRecusa ?? "").trim()) {
    return "Informe o motivo da recusa.";
  }
  return null;
}

export type AcaoGestaoPlataformas =
  | {
      acao: "salvar_plataforma";
      id?: string;
      nome: string;
      linkAcesso: string;
    }
  | { acao: "arquivar_plataforma"; id: string }
  | { acao: "reativar_plataforma"; id: string }
  | {
      acao: "salvar_obra";
      id?: string;
      plataformaId: string;
      nome: string;
      empresaResponsavel: string;
      inicioPrevisto: string;
      responsavelAcompanhamento: string;
    }
  | { acao: "vincular"; colaboradorId: string; obraIds: string[] }
  | { acao: "encerrar_alocacao"; id: string }
  | {
      acao: "salvar_requisito";
      id?: string;
      obraId: string;
      abrangencia: AbrangenciaRequisito;
      cargo: string | null;
      colaboradorId: string | null;
      tipo: TipoRequisito;
      titulo: string;
      recorrente: boolean;
      competencia: string | null;
      responsavel: string | null;
      prazo: string | null;
      validade: string | null;
      postadoEm: string | null;
      situacao: SituacaoRequisito;
      motivoRecusa: string | null;
      agendamentoId: string | null;
      certificadoId: string | null;
    }
  | {
      acao: "situacao_requisito";
      id: string;
      situacao: SituacaoRequisito;
      motivoRecusa?: string | null;
      postadoEm?: string | null;
    }
  | {
      acao: "liberar";
      obraId: string;
      colaboradorId: string;
      liberadoEm: string;
      responsavel: string;
    }
  | { acao: "salvar_curso"; id?: string; nome: string; valorCentavos: number }
  | { acao: "inativar_curso"; id: string }
  | { acao: "reativar_curso"; id: string }
  | { acao: "vincular_lote"; obraId: string; colaboradorIds: string[] }
  | { acao: "solicitar_documento"; colaboradorId: string; identificacao: string }
  | { acao: "conferir_documento"; id: string }
  | { acao: "solicitar_reenvio"; id: string; observacao: string }
  | { acao: "conceder_acesso"; email: string; nome: string }
  | { acao: "revogar_acesso"; id: string };

export type CursoCatalogo = {
  id: string;
  nome: string;
  valorCentavos: number;
  inativadoEm: string | null;
};

export type CertificadoRegistro = {
  id: string;
  colaboradorId: string;
  cursoId: string;
  realizadoEm: string;
  validade: string | null;
  arquivoNome: string | null;
  arquivoPath: string | null;
};

export const SITUACOES_DOCUMENTO_RH = [
  "aguardando_envio",
  "recebido",
  "conferido",
  "reenvio_solicitado",
] as const;

export type SituacaoDocumentoRh = (typeof SITUACOES_DOCUMENTO_RH)[number];

export const SITUACAO_DOCUMENTO_RH_LABEL: Record<SituacaoDocumentoRh, string> = {
  aguardando_envio: "Aguardando envio",
  recebido: "Recebido",
  conferido: "Conferido",
  reenvio_solicitado: "Reenvio solicitado",
};

export type DocumentoRhEvento = {
  id: string;
  documentoId: string;
  situacao: SituacaoDocumentoRh;
  observacao: string | null;
  responsavel: string | null;
  registradoEm: string;
};

export type DocumentoRhRegistro = {
  id: string;
  colaboradorId: string;
  identificacao: string;
  incluidoEm: string;
  arquivoNome: string;
  arquivoPath: string;
  situacao: SituacaoDocumentoRh;
  observacao: string | null;
};

export type AcessoExternoRegistro = {
  id: string;
  email: string;
  nome: string;
  concedidoEm: string;
  revogadoEm: string | null;
};

export const ANEXO_GESTAO_MAX_BYTES = 10 * 1024 * 1024;
export const ANEXO_GESTAO_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function centavosDeReais(
  valor: number
): { ok: true; centavos: number } | { ok: false; erro: string } {
  if (!Number.isFinite(valor) || valor < 0) {
    return { ok: false, erro: "Informe o valor do curso em reais." };
  }
  const centavos = Math.round(valor * 100);
  if (centavos > 100_000_000) {
    return { ok: false, erro: "Informe um valor de curso válido." };
  }
  return { ok: true, centavos };
}

export function validarCursoEntrada(input: {
  nome: string;
  valorCentavos: number;
}): string | null {
  if (input.nome.trim().length < 2) return "Informe o nome do curso.";
  if (!Number.isInteger(input.valorCentavos) || input.valorCentavos < 0) {
    return "Informe o valor do curso em reais.";
  }
  return null;
}

export function cursoAtivo(curso: Pick<CursoCatalogo, "inativadoEm">): boolean {
  return !curso.inativadoEm;
}

export function idsParaVincular(params: {
  alocacoes: readonly AlocacaoRegistro[];
  obraId: string;
  colaboradorIds: readonly string[];
}): string[] {
  const abertos = new Set(
    params.alocacoes
      .filter(
        (alocacao) => alocacao.obraId === params.obraId && alocacaoAberta(alocacao)
      )
      .map((alocacao) => alocacao.colaboradorId)
  );
  const vistos = new Set<string>();
  const novos: string[] = [];
  for (const bruto of params.colaboradorIds) {
    const id = bruto.trim();
    if (!id || vistos.has(id) || abertos.has(id)) continue;
    vistos.add(id);
    novos.push(id);
  }
  return novos;
}

export type EstadoListaColaboradores =
  | "carregando"
  | "falha"
  | "vazio"
  | "sem_resultado"
  | "lista";

export function estadoListaColaboradores(params: {
  carregando: boolean;
  falha: boolean;
  totalCadastro: number;
  totalFiltrado: number;
}): EstadoListaColaboradores {
  if (params.carregando) return "carregando";
  if (params.falha) return "falha";
  if (params.totalCadastro === 0) return "vazio";
  if (params.totalFiltrado === 0) return "sem_resultado";
  return "lista";
}

function exameCancelado(situacao: string): boolean {
  return situacao.toLocaleLowerCase("pt-BR") === "cancelado";
}

export function examesRealizadosDoColaborador<
  T extends { dataIso: string | null; situacao: string },
>(params: { exames: readonly T[]; hoje: string }): T[] {
  return params.exames.filter((exame) => {
    if (!exame.dataIso || exame.dataIso > params.hoje) return false;
    return !exameCancelado(exame.situacao);
  });
}

export function examesProximosDoColaborador<
  T extends { dataIso: string | null; situacao: string },
>(params: { exames: readonly T[]; hoje: string }): T[] {
  return params.exames
    .filter((exame) => {
      if (!exame.dataIso || exame.dataIso <= params.hoje) return false;
      return !exameCancelado(exame.situacao);
    })
    .slice()
    .sort((a, b) => String(a.dataIso).localeCompare(String(b.dataIso)));
}

export function obrasEmAtencao(params: {
  obras: readonly ObraRegistro[];
  requisitos: readonly RequisitoRegistro[];
  hoje: string;
}): ObraRegistro[] {
  const proximas = new Set(
    obrasMobilizacaoProxima(params.obras, params.hoje).map((obra) => obra.id)
  );
  return params.obras
    .filter(
      (obra) =>
        proximas.has(obra.id) ||
        pendenciasAbertasDaObra(params.requisitos, obra.id, params.hoje) > 0
    )
    .sort((a, b) =>
      String(a.inicioPrevisto ?? "9999-99-99").localeCompare(
        String(b.inicioPrevisto ?? "9999-99-99")
      )
    );
}

export function validarAnexoGestao(params: {
  nome: string;
  tipo: string;
  tamanho: number;
}): string | null {
  if (!params.nome.trim()) return "Selecione o arquivo.";
  if (params.tamanho <= 0 || params.tamanho > ANEXO_GESTAO_MAX_BYTES) {
    return "O arquivo precisa ter até 10 MB.";
  }
  const tipo = params.tipo.trim().toLowerCase();
  const nome = params.nome.trim().toLowerCase();
  const extensaoOk = [".pdf", ".jpg", ".jpeg", ".png", ".webp"].some((ext) =>
    nome.endsWith(ext)
  );
  const mimeOk = ANEXO_GESTAO_MIMES.some((mime) => mime === tipo);
  if (!mimeOk && !extensaoOk) {
    return "Envie um PDF ou uma imagem (JPG, PNG ou WEBP).";
  }
  return null;
}

export function caminhoAnexoGestaoPermitido(params: {
  path: string;
  clienteId: string;
}): boolean {
  const caminho = params.path.replace(/\\/g, "/").trim();
  const cliente = params.clienteId.trim();
  if (!caminho || !cliente || caminho.includes("..")) return false;
  return (
    caminho.startsWith(`${cliente}/certificados/`) ||
    caminho.startsWith(`${cliente}/rh/`)
  );
}
