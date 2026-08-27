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
  riscos_psicossociais: "riscos_psicossociais",
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
  confirmacao_duplicidade_aso_diferente:
    "confirmacao_duplicidade_aso_diferente",
  tentativa_recibo_esocial_duplicado: "tentativa_recibo_esocial_duplicado",
  tentativa_edicao_bloqueada_fatura: "tentativa_edicao_bloqueada_fatura",
  tentativa_encerrar_contrato_sem_permissao:
    "tentativa_encerrar_contrato_sem_permissao",
  alteracao_responsavel_processo: "alteracao_responsavel_processo",
  agendamento_bloqueado_inadimplencia: "agendamento_bloqueado_inadimplencia",
  fatura_marcada_vencida: "fatura_marcada_vencida",
  exames_carregados_cargo: "exames_carregados_cargo",
  exame_removido_agendamento: "exame_removido_agendamento",
  cargo_alterado_exames_recalculados: "cargo_alterado_exames_recalculados",
  exames_complementares_removidos_retorno_trabalho:
    "exames_complementares_removidos_retorno_trabalho",
  procuracao_alterada: "procuracao_alterada",
  agendamento_cliente_liberado: "agendamento_cliente_liberado",
  agendamento_cliente_bloqueado: "agendamento_cliente_bloqueado",
  agendamento_cliente_bloqueio_restaurado:
    "agendamento_cliente_bloqueio_restaurado",
  agendamento_sem_procuracao_confirmado: "agendamento_sem_procuracao_confirmado",
  clinico_zero_demissional: "clinico_zero_demissional",
  fatura_reemitida: "fatura_reemitida",
  fatura_substituida: "fatura_substituida",
  fatura_marcada_reemitida: "fatura_marcada_reemitida",
  fatura_necessita_reemissao: "fatura_necessita_reemissao",
  cancelamento_excepcional_fatura_emitida:
    "cancelamento_excepcional_fatura_emitida",
  custo_clinica_marcado_conferido: "custo_clinica_marcado_conferido",
  custo_clinica_conferencia_reaberta: "custo_clinica_conferencia_reaberta",
  fatura_emissao_reaberta: "fatura_emissao_reaberta",
  vinculo_contrato_implantacao: "vinculo_contrato_implantacao",
  sem_vinculo_contrato_implantacao: "sem_vinculo_contrato_implantacao",
  dispensa_agendamentos_iniciais: "dispensa_agendamentos_iniciais",
  reabertura_agendamentos_iniciais: "reabertura_agendamentos_iniciais",
  treinamento_agendado: "treinamento_agendado",
  treinamento_confirmado: "treinamento_confirmado",
  treinamento_reagendado: "treinamento_reagendado",
  treinamento_realizado: "treinamento_realizado",
  treinamento_cancelado: "treinamento_cancelado",
  credito_aso_registrado: "credito_aso_registrado",
  credito_aso_utilizado: "credito_aso_utilizado",
  credito_aso_devolvido: "credito_aso_devolvido",
  credito_aso_expirado: "credito_aso_expirado",
  credito_aso_removido: "credito_aso_removido",
  credito_aso_observacao_editada: "credito_aso_observacao_editada",
  contrato_vagas_salvas: "contrato_vagas_salvas",
  contrato_vaga_vinculada: "contrato_vaga_vinculada",
  contrato_vaga_funcionario_removido: "contrato_vaga_funcionario_removido",
  periodico_cpf_regularizado: "periodico_cpf_regularizado",
  periodico_futuro_cancelado: "periodico_futuro_cancelado",
  riscos_lista_solicitada: "riscos_lista_solicitada",
  riscos_lista_recebida: "riscos_lista_recebida",
  riscos_lista_anexo_removido: "riscos_lista_anexo_removido",
  riscos_lista_anexo_substituido: "riscos_lista_anexo_substituido",
  riscos_campanha_criada: "riscos_campanha_criada",
  riscos_campanha_aberta: "riscos_campanha_aberta",
  riscos_campanha_encerrada: "riscos_campanha_encerrada",
  riscos_campanha_prazo_prorrogado: "riscos_campanha_prazo_prorrogado",
  riscos_campanha_reaberta: "riscos_campanha_reaberta",
  riscos_processo_cancelado: "riscos_processo_cancelado",
  riscos_campanha_excluida: "riscos_campanha_excluida",
  riscos_processo_removido: "riscos_processo_removido",
  riscos_participante_criado: "riscos_participante_criado",
  riscos_participante_editado: "riscos_participante_editado",
  riscos_participante_removido: "riscos_participante_removido",
  riscos_participacao_invalidada: "riscos_participacao_invalidada",
  riscos_relatorio_gerado: "riscos_relatorio_gerado",
  riscos_relatorio_regenerado: "riscos_relatorio_regenerado",
  riscos_campanha_logo_atualizado: "riscos_campanha_logo_atualizado",
  riscos_campanha_logo_removido: "riscos_campanha_logo_removido",
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
  riscos_psicossociais: "Riscos Psicossociais",
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
  confirmacao_duplicidade_aso_diferente:
    "Confirmação de ASO diferente em 90 dias",
  tentativa_recibo_esocial_duplicado:
    "Tentativa de recibo e-Social duplicado",
  tentativa_edicao_bloqueada_fatura: "Tentativa de edição bloqueada (fatura)",
  tentativa_encerrar_contrato_sem_permissao:
    "Tentativa de encerrar contrato sem permissão",
  alteracao_responsavel_processo: "Alteração de responsável do processo",
  agendamento_bloqueado_inadimplencia:
    "Novo agendamento bloqueado (inadimplência)",
  fatura_marcada_vencida: "Fatura marcada como vencida",
  exames_carregados_cargo: "Exames carregados pelo cargo",
  exame_removido_agendamento: "Exame removido do agendamento",
  cargo_alterado_exames_recalculados: "Cargo alterado — exames recalculados",
  exames_complementares_removidos_retorno_trabalho:
    "Complementares removidos (Retorno ao Trabalho)",
  procuracao_alterada: "Procuração alterada",
  agendamento_cliente_liberado: "Cliente liberado para agendamentos",
  agendamento_cliente_bloqueado: "Cliente bloqueado para novos agendamentos",
  agendamento_cliente_bloqueio_restaurado:
    "Bloqueio manual restaurado (correção)",
  agendamento_sem_procuracao_confirmado:
    "Agendamento confirmado sem procuração ativa",
  clinico_zero_demissional: "Clínico R$ 0,00 — ASO Demissional",
  fatura_reemitida: "Fatura reemitida",
  fatura_substituida: "Fatura substituída",
  fatura_marcada_reemitida: "Fatura marcada como reemitida",
  fatura_necessita_reemissao: "Fatura necessita reemissão",
  cancelamento_excepcional_fatura_emitida:
    "Cancelamento excepcional (fatura emitida)",
  custo_clinica_marcado_conferido: "Custo marcado como conferido",
  custo_clinica_conferencia_reaberta: "Conferência reaberta",
  fatura_emissao_reaberta: "Emissão de fatura reaberta",
  vinculo_contrato_implantacao: "Vínculo ao contrato (implantação)",
  sem_vinculo_contrato_implantacao: "Sem vínculo ao contrato (implantação)",
  dispensa_agendamentos_iniciais: "Dispensa de agendamentos iniciais",
  reabertura_agendamentos_iniciais: "Reabertura de agendamentos iniciais",
  treinamento_agendado: "Treinamento agendado",
  treinamento_confirmado: "Treinamento confirmado",
  treinamento_reagendado: "Treinamento reagendado",
  treinamento_realizado: "Treinamento realizado",
  treinamento_cancelado: "Treinamento cancelado",
  credito_aso_registrado: "ASO contratual em aberto registrado",
  credito_aso_utilizado: "ASO contratual utilizado em agendamento",
  credito_aso_devolvido: "ASO contratual devolvido ao saldo",
  credito_aso_expirado: "ASO contratual expirado",
  credito_aso_removido: "ASO contratual em aberto removido",
  credito_aso_observacao_editada: "Observação do ASO em aberto editada",
  contrato_vagas_salvas: "Lista de vagas/funcionários do contrato salva",
  contrato_vaga_vinculada: "Agendamento vinculado à vaga contratual",
  contrato_vaga_funcionario_removido:
    "Funcionário desvinculado da vaga contratual",
  periodico_cpf_regularizado: "CPF regularizado em periódicos futuros",
  periodico_futuro_cancelado: "Periódico futuro cancelado",
  riscos_lista_solicitada: "Lista de presença solicitada",
  riscos_lista_recebida: "Lista de presença recebida",
  riscos_lista_anexo_removido: "Anexo da lista de presença removido",
  riscos_lista_anexo_substituido: "Anexo da lista de presença substituído",
  riscos_campanha_criada: "Campanha de avaliação criada",
  riscos_campanha_aberta: "Campanha de avaliação aberta",
  riscos_campanha_encerrada: "Campanha de avaliação encerrada",
  riscos_campanha_prazo_prorrogado: "Prazo da campanha de avaliação prorrogado",
  riscos_campanha_reaberta: "Campanha de avaliação reaberta",
  riscos_processo_cancelado: "Processo de Riscos Psicossociais cancelado",
  riscos_campanha_excluida: "Campanha de avaliação excluída definitivamente",
  riscos_processo_removido: "Processo de Riscos Psicossociais removido definitivamente",
  riscos_participante_criado: "Participante da pesquisa cadastrado",
  riscos_participante_editado: "Participante da pesquisa editado",
  riscos_participante_removido: "Participante da pesquisa removido",
  riscos_participacao_invalidada: "Participação da pesquisa invalidada",
  riscos_relatorio_gerado: "Relatório final de Riscos gerado",
  riscos_relatorio_regenerado: "Relatório final de Riscos regenerado",
  riscos_campanha_logo_atualizado: "Logo da campanha de Riscos atualizado",
  riscos_campanha_logo_removido: "Logo da campanha de Riscos removido",
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
