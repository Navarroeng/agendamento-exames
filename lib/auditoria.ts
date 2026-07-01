export const AUDITORIA_PAGE_SIZE = 50;

export const AUDITORIA_MODULOS = {
  agendamentos: "agendamentos",
  clientes: "clientes",
  clinicas: "clinicas",
  exames: "exames",
  cargos: "cargos",
  faturas_clientes: "faturas_clientes",
  custos_clinicas: "custos_clinicas",
  esocial: "esocial",
  periodicos_futuros: "periodicos_futuros",
  usuarios: "usuarios",
  orcamentos: "orcamentos",
} as const;

export type AuditoriaModulo =
  (typeof AUDITORIA_MODULOS)[keyof typeof AUDITORIA_MODULOS];

export const AUDITORIA_ACOES = {
  criacao: "criacao",
  edicao: "edicao",
  exclusao: "exclusao",
  cancelamento: "cancelamento",
  ativacao: "ativacao",
  desativacao: "desativacao",
  alteracao_preco: "alteracao_preco",
  envio: "envio",
  reagendamento: "reagendamento",
  tentativa_bloqueada_duplicidade: "tentativa_bloqueada_duplicidade",
  tentativa_edicao_bloqueada_fatura: "tentativa_edicao_bloqueada_fatura",
  exames_carregados_cargo: "exames_carregados_cargo",
  exame_removido_agendamento: "exame_removido_agendamento",
  cargo_alterado_exames_recalculados: "cargo_alterado_exames_recalculados",
  exames_complementares_removidos_retorno_trabalho:
    "exames_complementares_removidos_retorno_trabalho",
  procuracao_alterada: "procuracao_alterada",
  agendamento_sem_procuracao_confirmado: "agendamento_sem_procuracao_confirmado",
  clinico_zero_demissional: "clinico_zero_demissional",
  custo_clinica_conferido: "custo_clinica_conferido",
  custo_clinica_reabrir_conferencia: "custo_clinica_reabrir_conferencia",
  fatura_reemitida: "fatura_reemitida",
} as const;

export type AuditoriaAcao =
  (typeof AUDITORIA_ACOES)[keyof typeof AUDITORIA_ACOES];

export const AUDITORIA_MODULO_LABELS: Record<AuditoriaModulo, string> = {
  agendamentos: "Agendamentos",
  clientes: "Clientes",
  clinicas: "Clínicas",
  exames: "Exames",
  cargos: "Cargos",
  faturas_clientes: "Faturas Clientes",
  custos_clinicas: "Custos Clínicas",
  esocial: "e-Social",
  periodicos_futuros: "Periódicos Futuros",
  usuarios: "Usuários",
  orcamentos: "Orçamentos",
};

export const AUDITORIA_ACAO_LABELS: Record<AuditoriaAcao, string> = {
  criacao: "Criação",
  edicao: "Edição",
  exclusao: "Exclusão",
  cancelamento: "Cancelamento",
  ativacao: "Ativação",
  desativacao: "Desativação",
  alteracao_preco: "Alteração de preço",
  envio: "Envio",
  reagendamento: "Reagendamento",
  tentativa_bloqueada_duplicidade: "Tentativa bloqueada (duplicidade)",
  tentativa_edicao_bloqueada_fatura: "Tentativa de edição bloqueada (fatura)",
  exames_carregados_cargo: "Exames carregados pelo cargo",
  exame_removido_agendamento: "Exame removido do agendamento",
  cargo_alterado_exames_recalculados: "Cargo alterado — exames recalculados",
  exames_complementares_removidos_retorno_trabalho:
    "Complementares removidos (Retorno ao Trabalho)",
  procuracao_alterada: "Procuração alterada",
  agendamento_sem_procuracao_confirmado:
    "Agendamento confirmado sem procuração ativa",
  clinico_zero_demissional: "Clínico R$ 0,00 — ASO Demissional",
  fatura_reemitida: "Fatura reemitida",
  custo_clinica_conferido: "Custos conferidos",
  custo_clinica_reabrir_conferencia: "Conferência reaberta",
};

export interface AuditoriaUsuarioContext {
  usuarioId: string | null;
  usuarioNome: string;
  usuarioEmail: string;
}

export interface RegistrarAuditoriaInput {
  usuarioId?: string | null;
  usuarioNome: string;
  usuarioEmail: string;
  modulo: AuditoriaModulo;
  acao: AuditoriaAcao;
  registroId?: string | null;
  registroNome?: string | null;
  descricao: string;
  dadosAntes?: Record<string, unknown> | null;
  dadosDepois?: Record<string, unknown> | null;
}

export interface AuditoriaFilters {
  dataInicio: string;
  dataFim: string;
  usuarioEmail: string;
  modulo: "" | AuditoriaModulo;
  acao: "" | AuditoriaAcao;
}

export const EMPTY_AUDITORIA_FILTERS: AuditoriaFilters = {
  dataInicio: "",
  dataFim: "",
  usuarioEmail: "",
  modulo: "",
  acao: "",
};

export function mapHistoricoAcaoToAuditoria(acao: string): AuditoriaAcao {
  const value = acao.trim().toLowerCase();

  if (value.includes("criação") || value.includes("criacao")) return "criacao";
  if (value.includes("cancel")) return "cancelamento";
  if (value.includes("desativ")) return "desativacao";
  if (value.includes("ativ")) return "ativacao";
  if (value.includes("valor") || value.includes("preço") || value.includes("preco")) {
    return "alteracao_preco";
  }
  if (value.includes("envio") || value.includes("enviado")) return "envio";
  if (value.includes("reagend")) return "reagendamento";
  if (value.includes("exclu") || value.includes("remov")) return "exclusao";

  return "edicao";
}

export function formatAuditoriaModulo(modulo: string): string {
  return (
    AUDITORIA_MODULO_LABELS[modulo as AuditoriaModulo] ??
    modulo.replaceAll("_", " ")
  );
}

export function formatAuditoriaAcao(acao: string): string {
  return AUDITORIA_ACAO_LABELS[acao as AuditoriaAcao] ?? acao;
}
