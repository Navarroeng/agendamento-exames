export type AgendamentoStatus =
  | "rascunho"
  | "agendado"
  | "aso_retido"
  | "cancelado";

export interface AgendamentoFormValues {
  data_agendamento: string;
  horario: string;
  cliente_nome: string;
  colaborador: string;
  colaborador_cpf: string;
  aso: string;
  clinica_nome: string;
  responsavel: string;
  observacoes: string;
  aso_enviado_clinica: string;
  data_aso_enviado_clinica: string;
  aso_assinado: string;
  data_aso_assinado: string;
  aso_enviado_cliente: string;
  data_aso_enviado_cliente: string;
  numero_matricula: string;
  envio_esocial: string;
  data_envio_esocial: string;
  esocial_recibo: string;
}

export interface AgendamentoInsert {
  data_agendamento: string;
  horario: string | null;
  cliente_nome: string;
  colaborador: string;
  colaborador_cpf: string;
  aso: string;
  clinica_nome: string;
  responsavel: string;
  observacoes: string | null;
  aso_enviado_clinica: boolean;
  data_aso_enviado_clinica: string | null;
  aso_assinado: boolean;
  data_aso_assinado: string | null;
  aso_enviado_cliente: boolean;
  data_aso_enviado_cliente: string | null;
  numero_matricula: string | null;
  envio_esocial: boolean;
  data_envio_esocial: string | null;
  esocial_recibo?: string | null;
  esocial_envio_cancelado?: boolean;
  esocial_cancelado_em?: string | null;
  esocial_cancelado_por?: string | null;
  esocial_motivo_cancelamento?: string | null;
  esocial_status_anterior?: string | null;
  cargo_id?: string | null;
  cargo_nome?: string | null;
  status: AgendamentoStatus;
  motivo_cancelamento?: string | null;
  aso_retido_anexo_path?: string | null;
  aso_retido_anexo_nome?: string | null;
  aso_retido_observacao?: string | null;
  aso_retido_em?: string | null;
  aso_retido_por?: string | null;
  /** Contrato da implantação/renovação ao qual o agendamento pertence. */
  contrato_id?: string | null;
}

export interface ExameFormItem {
  id: string;
  exame_id: string;
  tipo_exame: string;
  valor_cliente: string;
  custo_clinica: string;
  lucro: string;
  aviso: string;
  precoAutomatico: boolean;
  /** Clínico: valor cliente editado manualmente (não sobrescrever ao trocar ASO). */
  clinicoValorManual?: boolean;
  /** ASO Demissional + Clínico R$ 0,00: justificativa obrigatória. */
  motivo_valor_zero?: string;
}

export interface ExameCatalogFormValues {
  nome: string;
  valor_navarro: string;
  ativo: string;
  preparo: string;
}

export interface ExameCatalogInsert {
  nome: string;
  categoria: string | null;
  valor_navarro: number;
  ativo: boolean;
  preparo: string | null;
}

export interface ExameRecord extends ExameCatalogInsert {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CargoFormValues {
  nome: string;
  descricao: string;
  ativo: string;
  /** Vazio até o usuário selecionar; 6 ou 12 após escolha */
  validadePeriodicoMeses: "" | "12" | "6";
  exameIds: string[];
}

export type ValidadePeriodicoMeses = 6 | 12;

export interface CargoInsert {
  nome: string;
  descricao: string | null;
  ativo: boolean;
  validade_periodico_meses: ValidadePeriodicoMeses;
}

export interface CargoRecord extends CargoInsert {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CargoExameRecord {
  id: string;
  cargo_id: string;
  exame_id: string;
  obrigatorio: boolean;
  observacoes: string | null;
  ativo: boolean;
  gerar_alerta_6m: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CargoExameInput {
  exame_id: string;
}

export type PeriodicoFuturoStoredStatus = "ativo" | "reagendado" | "cancelado";

export type PeriodicoFuturoDisplayStatus =
  | "em_dia"
  | "vence_30_dias"
  | "vencido"
  | "reagendado"
  | "cancelado";

export interface PeriodicoFuturoRecord {
  id: string;
  agendamento_id: string | null;
  cliente_nome: string;
  colaborador: string;
  cargo_id: string | null;
  cargo_nome: string | null;
  exame_id: string;
  tipo_exame: string;
  exame_nome: string;
  data_realizada: string;
  proxima_data: string;
  status: PeriodicoFuturoStoredStatus;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PeriodicoFuturoRow extends PeriodicoFuturoRecord {
  displayStatus: PeriodicoFuturoDisplayStatus;
  dataRealizadaBR: string;
  proximaDataBR: string;
}

export interface PeriodicoFuturoFilters {
  empresa: string;
  colaborador: string;
  cargo: string;
  exame: string;
  status: "" | PeriodicoFuturoDisplayStatus;
  mesReferencia: string;
}

export interface CargoExameWithExame extends CargoExameRecord {
  exames: ExameRecord;
}

export interface CargoComExames extends CargoRecord {
  cargo_exames: CargoExameWithExame[];
}

export interface ClinicaExameRecord {
  id: string;
  clinica_id: string;
  exame_id: string;
  custo_clinica: number;
  valor_navarro: number;
  prazo_resultado: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClinicaExameWithExame extends ClinicaExameRecord {
  exames: ExameRecord;
}

export interface ExameHistoricoRecord {
  id: string;
  exame_id: string;
  usuario: string;
  acao: string;
  detalhes: string | null;
  created_at: string;
}

export interface ClinicaExameHistoricoRecord {
  id: string;
  clinica_id: string;
  clinica_exame_id: string | null;
  usuario: string;
  acao: string;
  detalhes: string | null;
  created_at: string;
}

export interface PrecoExameAgendamento {
  ok: boolean;
  exameId?: string;
  valorNavarro: number;
  custoClinica: number;
  message?: string;
}

export interface ExameInsert {
  agendamento_id: string;
  tipo_exame: string;
  valor_cliente: number;
  custo_clinica: number;
  motivo_valor_zero?: string | null;
}

export interface AgendamentoRecord extends AgendamentoInsert {
  id: string;
  created_at?: string | null;
}

export interface AgendamentoExameRecord {
  id: string;
  agendamento_id: string;
  tipo_exame: string;
  valor_cliente: number;
  custo_clinica: number;
  motivo_valor_zero?: string | null;
}

export interface AgendamentoWithExames extends AgendamentoRecord {
  agendamento_exames: AgendamentoExameRecord[];
}

export interface AgendamentoHistoricoRecord {
  id: string;
  agendamento_id: string;
  usuario: string;
  acao: string;
  detalhes: string | null;
  created_at: string;
}

export type ClienteProcuracao = "ativa" | "inativa";

export interface ClienteFormValues {
  nome: string;
  cnpj: string;
  procuracao: ClienteProcuracao;
  disponivel_agendamento: string;
}

export interface ClienteInsert {
  nome: string;
  cnpj: string;
  procuracao: ClienteProcuracao;
  disponivel_agendamento: boolean;
  origem_cadastro?: "manual" | "orcamento";
  contato?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  setor?: string | null;
}

export interface ClienteUpdate {
  nome: string;
  cnpj: string;
  procuracao: ClienteProcuracao;
  disponivel_agendamento: boolean;
  contato?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  setor?: string | null;
}

export interface ClienteRecord extends ClienteInsert {
  id: string;
  contato?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  setor?: string | null;
  created_at?: string | null;
}

export type ClienteContratoStatus =
  | "ativo"
  | "encerrado"
  | "em_renovacao"
  | "cancelado"
  | "aguardando_envio"
  | "enviado"
  | "assinado"
  | "aguardando_pagamento"
  | "pago";

export type ClienteContratoTipo =
  | "mensal"
  | "anual"
  | "avulso"
  | "sem_contrato";

export interface ClienteContratoFormValues {
  data_inicio: string;
  data_fim: string;
  quantidade_colaboradores: string;
  valor_contrato: string;
  condicao_pagamento: string;
  tipo_contrato: ClienteContratoTipo;
  reajuste_percentual: string;
  observacoes: string;
  status: ClienteContratoStatus;
}

export interface ClienteContratoInsert {
  cliente_id: string;
  data_inicio: string;
  data_fim: string | null;
  quantidade_colaboradores: number | null;
  valor_contrato: number | null;
  condicao_pagamento: string | null;
  tipo_contrato: ClienteContratoTipo | null;
  reajuste_percentual: number | null;
  observacoes: string | null;
  status: ClienteContratoStatus;
  orcamento_id?: string | null;
  numero_orcamento?: string | null;
  numero?: string | null;
  quantidade_parcelas?: number | null;
  valor_parcela?: number | null;
  valor_avista?: number | null;
  desconto_percentual?: number | null;
  aprovado_em?: string | null;
  aprovado_por?: string | null;
  liberado_para_agendamento?: boolean;
}

export interface ClienteContratoRecord extends Omit<ClienteContratoInsert, "cliente_id"> {
  id: string;
  cliente_id: string;
  orcamento_id?: string | null;
  numero_orcamento?: string | null;
  numero?: string | null;
  quantidade_parcelas?: number | null;
  valor_parcela?: number | null;
  valor_avista?: number | null;
  desconto_percentual?: number | null;
  aprovado_em?: string | null;
  aprovado_por?: string | null;
  contrato_enviado_em?: string | null;
  contrato_assinado_em?: string | null;
  boleto_vencimento?: string | null;
  boleto_pago?: boolean;
  boleto_pago_em?: string | null;
  liberado_para_agendamento?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClienteComContratos extends ClienteRecord {
  cliente_contratos: ClienteContratoRecord[];
}

export type ClinicaStatus = "ativa" | "inativa";

export type ClinicaTipoAtendimento = "horario_agendado" | "ordem_chegada";

export interface ClinicaJanelaHorario {
  inicio: string;
  fim: string;
}

export interface ClinicaFormValues {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  responsavel: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  forma_pagamento: string;
  prazo_pagamento: string;
  observacoes_financeiras: string;
  horario_atendimento: string;
  possui_coleta: string;
  possui_sistema_online: string;
  exames_atendidos: string;
  observacoes: string;
  status: string;
  tipo_atendimento: string;
  dias_atendimento: string;
  horario_padrao_inicio: string;
  horario_padrao_fim: string;
  horario_clinico_inicio: string;
  horario_clinico_fim: string;
  horario_complementar_inicio: string;
  horario_complementar_fim: string;
  janela_adicional_inicio: string;
  janela_adicional_fim: string;
  observacao_operacional: string;
}

export interface ClinicaInsert {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  responsavel: string;
  telefone: string;
  whatsapp: string | null;
  email: string;
  site: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  forma_pagamento: string | null;
  prazo_pagamento: string | null;
  observacoes_financeiras: string | null;
  horario_atendimento: string | null;
  possui_coleta: boolean;
  possui_sistema_online: boolean;
  exames_atendidos: string | null;
  observacoes: string | null;
  status: ClinicaStatus;
  tipo_atendimento: ClinicaTipoAtendimento;
  dias_atendimento: number[] | null;
  horario_padrao_inicio: string | null;
  horario_padrao_fim: string | null;
  horario_clinico_inicio: string | null;
  horario_clinico_fim: string | null;
  horario_complementar_inicio: string | null;
  horario_complementar_fim: string | null;
  janelas_adicionais: ClinicaJanelaHorario[] | null;
  observacao_operacional: string | null;
}

export interface ClinicaRecord extends ClinicaInsert {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClinicaListItem extends ClinicaRecord {
  qtdExames: number;
  ultimoAgendamento: string | null;
}

export interface ClinicaHistoricoRecord {
  id: string;
  clinica_id: string;
  usuario: string;
  acao: string;
  detalhes: string | null;
  created_at: string;
}

export interface ClinicaTableRow {
  key: string;
  clinicaId: string;
  nome: string;
  cidade: string;
  responsavel: string;
  telefone: string;
  email: string;
  status: ClinicaStatus;
  qtdExames: number;
  ultimoAgendamento: string;
}

export interface PendenciaBadge {
  label: string;
  status: "done" | "pending";
  text: string;
}

export interface AgendamentoTableRow {
  key: string;
  agendamentoId: string;
  dataAgendada: string;
  cliente: string;
  colaborador: string;
  aso: string;
  examesResumo: string;
  totalCliente: string;
  statusType: "draft" | "active" | "cancelled" | "asoRetido" | "pending";
  statusLabel: string;
  agendamentoStatus: AgendamentoStatus;
  asoClinica: boolean;
  asoAssinado: boolean;
  asoCliente: boolean;
  matricula: string;
  esocial: boolean;
  bloqueadoPorFatura?: boolean;
  podeCancelarExcepcionalAdmin?: boolean;
  faturaBloqueioNumero?: string | null;
  faturaBloqueioStatus?: string | null;
}

export type PerfilUsuarioTipo = "admin" | "operacional" | string;

export interface PerfilUsuario {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuarioTipo;
  ativo: boolean;
  created_at?: string | null;
}

export type FaturaTipo = "cliente" | "clinica";
export type FaturaStatus =
  | "rascunho"
  | "emitida"
  | "vencida"
  | "cancelada"
  | "necessita_reemissao"
  | "substituida"
  | "reemitida";

export interface FaturaRecord {
  id: string;
  numero: string;
  tipo: FaturaTipo;
  referencia_id: string | null;
  referencia_nome: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  mes_referencia: string | null;
  data_emissao: string | null;
  data_vencimento: string;
  valor_total: number;
  total_exames: number;
  status: FaturaStatus;
  gerado_por: string | null;
  pago: boolean;
  data_pagamento: string | null;
  observacao_pagamento: string | null;
  comprovante_pagamento_path: string | null;
  comprovante_pagamento_nome: string | null;
  conferido_em: string | null;
  conferido_por: string | null;
  fatura_clinica_path: string | null;
  fatura_clinica_nome: string | null;
  fatura_clinica_tipo: string | null;
  fatura_clinica_tamanho: number | null;
  observacao_conferencia: string | null;
  conferencia_registrada_em: string | null;
  fatura_origem_id: string | null;
  fatura_substituta_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaturaItemRecord {
  id: string;
  fatura_id: string;
  agendamento_id: string | null;
  data_agendamento: string;
  colaborador: string;
  cliente_nome: string;
  clinica_nome: string;
  tipo_aso: string;
  exame_nome: string;
  valor_unitario: number;
  quantidade: number;
  valor_total: number;
}

export interface FaturaItemInsert {
  agendamento_id: string | null;
  data_agendamento: string;
  colaborador: string;
  cliente_nome: string;
  clinica_nome: string;
  tipo_aso: string;
  exame_nome: string;
  valor_unitario: number;
  quantidade: number;
  valor_total: number;
}

export interface FaturaComItens extends FaturaRecord {
  fatura_itens: FaturaItemRecord[];
}

export interface FaturaPreviewState {
  tipo: FaturaTipo;
  referenciaNome: string;
  periodoLabel: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  data_vencimento: string;
  data_vencimento_label: string;
  itens: FaturaItemInsert[];
  numero: string | null;
  faturaId: string | null;
  status: FaturaStatus | null;
  readonly: boolean;
  faturaOrigemId?: string | null;
  faturaOrigemNumero?: string | null;
  faturaSubstitutaId?: string | null;
  faturaSubstitutaNumero?: string | null;
  conferido_em?: string | null;
  conferido_por?: string | null;
  fatura_clinica_path?: string | null;
  fatura_clinica_nome?: string | null;
  fatura_clinica_tipo?: string | null;
  fatura_clinica_tamanho?: number | null;
  observacao_conferencia?: string | null;
  conferencia_registrada_em?: string | null;
}

export interface AuditoriaRecord {
  id: string;
  usuario_nome: string;
  usuario_email: string;
  modulo: string;
  acao: string;
  registro_id: string | null;
  registro_nome: string | null;
  descricao: string;
  created_at: string;
}
