import type {
  DashboardKpiColumn,
  DashboardKpiKey,
} from "@/lib/dashboard/types";

export const DASHBOARD_KPI_DETAIL: Record<
  DashboardKpiKey,
  {
    title: string;
    subtitle: string;
    emptyMessage: string;
    columns: DashboardKpiColumn[];
  }
> = {
  pendenciasEsocial: {
    title: "Pendências e-Social",
    subtitle: "Registros pendentes de competências anteriores.",
    emptyMessage: "Nenhuma pendência de e-Social em meses anteriores.",
    columns: [
      { id: "colaborador", label: "Colaborador" },
      { id: "empresa", label: "Empresa" },
      { id: "data", label: "Data do exame" },
      { id: "tipoAso", label: "Tipo ASO" },
      { id: "status", label: "Status e-Social" },
    ],
  },
  asosNaoRecebidosClinicas: {
    title: "ASOs não recebidos das clínicas",
    subtitle: "Agendamentos de meses anteriores com ASO ainda não recebido.",
    emptyMessage: "Nenhum ASO pendente de recebimento das clínicas.",
    columns: [
      { id: "colaborador", label: "Colaborador" },
      { id: "empresa", label: "Empresa" },
      { id: "data", label: "Data do agendamento" },
      { id: "clinica", label: "Clínica" },
      { id: "tipoAso", label: "Tipo ASO" },
      { id: "status", label: "Status" },
    ],
  },
  asosNaoEnviadosClientes: {
    title: "ASOs não enviados aos clientes",
    subtitle: "Registros de meses anteriores pendentes de envio ao cliente.",
    emptyMessage: "Nenhum ASO pendente de envio aos clientes.",
    columns: [
      { id: "colaborador", label: "Colaborador" },
      { id: "empresa", label: "Empresa" },
      { id: "data", label: "Data" },
      { id: "tipoAso", label: "Tipo ASO" },
      { id: "status", label: "Status de envio" },
    ],
  },
  periodicosVencidos: {
    title: "Periódicos vencidos",
    subtitle: "Colaboradores com exames periódicos vencidos em meses anteriores.",
    emptyMessage: "Nenhum periódico vencido de meses anteriores.",
    columns: [
      { id: "colaborador", label: "Colaborador" },
      { id: "empresa", label: "Empresa" },
      { id: "exame", label: "Exame" },
      { id: "data", label: "Data de vencimento" },
      { id: "status", label: "Situação" },
    ],
  },
  periodicosVencendoMesAtual: {
    title: "Periódicos vencendo neste mês",
    subtitle: "Colaboradores com periódicos a vencer na competência atual.",
    emptyMessage: "Nenhum periódico vencendo neste mês.",
    columns: [
      { id: "colaborador", label: "Colaborador" },
      { id: "empresa", label: "Empresa" },
      { id: "exame", label: "Exame" },
      { id: "data", label: "Data de vencimento" },
      { id: "status", label: "Situação" },
    ],
  },
  agendamentosDoDia: {
    title: "Agendamentos de hoje",
    subtitle: "Todos os agendamentos do dia.",
    emptyMessage: "Nenhum agendamento para hoje.",
    columns: [
      { id: "horario", label: "Horário" },
      { id: "colaborador", label: "Colaborador" },
      { id: "empresa", label: "Empresa" },
      { id: "tipoAso", label: "Tipo ASO" },
      { id: "clinica", label: "Clínica" },
      { id: "status", label: "Status" },
    ],
  },
};
