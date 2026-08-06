import type { NavIconKey } from "@/components/ui/icons/OutlineIcons";

export const CLINICAS = [
  "Clinimed Saúde Ocupacional",
  "Audioclin",
  "Seg&Med",
] as const;

export const RESPONSAVEIS = ["Bruna", "Rafaela"] as const;

export const TIPOS_ASO = [
  "Admissional",
  "Periódico",
  "Demissional",
  "Retorno ao Trabalho",
  "Mudança de Função",
] as const;

export const TIPOS_EXAME = [
  "Clínico",
  "Audiometria",
  "PPF",
  "Espirometria",
  "Acuidade Visual",
  "ECG",
  "EEG",
] as const;

export const SIM_NAO = ["Não", "Sim"] as const;

export type NavItem = {
  iconKey: NavIconKey;
  label: string;
  href: string | null;
};

export type NavSection = {
  title: string;
  items: readonly NavItem[];
};

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: "Operação",
    items: [
      { iconKey: "home", label: "Dashboard", href: "/dashboard" },
      { iconKey: "calendar", label: "Agendamentos", href: "/" },
      { iconKey: "esocial", label: "e-Social", href: "/e-social" },
      {
        iconKey: "clock",
        label: "Periódicos Futuros",
        href: "/periodicos-futuros",
      },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { iconKey: "users", label: "Clientes", href: "/clientes" },
      { iconKey: "briefcase", label: "Cargos", href: "/cargos" },
      { iconKey: "flask", label: "Exames", href: "/exames" },
      { iconKey: "building", label: "Clínicas", href: "/clinicas" },
    ],
  },
  {
    title: "Gestão Comercial",
    items: [
      { iconKey: "document", label: "Orçamentos", href: "/orcamentos" },
      {
        iconKey: "checklist",
        label: "Implantação de Clientes",
        href: "/implantacao",
      },
      {
        iconKey: "chart",
        label: "Gestão Comercial",
        href: "/gestao-comercial",
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      { iconKey: "chart", label: "Relatórios", href: "/relatorios" },
      {
        iconKey: "receipt",
        label: "Faturas Clientes",
        href: "/faturas-clientes",
      },
      {
        iconKey: "wallet",
        label: "Custos Clínicas",
        href: "/custos-clinicas",
      },
    ],
  },
  {
    title: "Administração",
    items: [
      { iconKey: "user", label: "Usuários", href: "/usuarios" },
      { iconKey: "shield", label: "Auditoria", href: "/auditoria" },
    ],
  },
];

/** Lista plana (compatibilidade). */
export const NAV_ITEMS: readonly NavItem[] = NAV_SECTIONS.flatMap(
  (section) => section.items
);
