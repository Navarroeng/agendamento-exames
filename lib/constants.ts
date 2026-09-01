import type { NavIconKey } from "@/components/ui/icons/OutlineIcons";

export const CLINICAS = [
  "Clinimed Saúde Ocupacional",
  "Audioclin",
  "Seg&Med",
] as const;

export const RESPONSAVEIS = ["Bruna", "Rafaela", "Karoline"] as const;

export const TIPOS_ASO = [
  "Admissional",
  "Periódico",
  "Demissional",
  "Retorno ao Trabalho",
  "Mudança de Função",
  "Pontual",
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
  /** Título do grupo. String vazia = item isolado sem cabeçalho (ex.: Dashboard). */
  title: string;
  items: readonly NavItem[];
};

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: "",
    items: [{ iconKey: "home", label: "Dashboard", href: "/dashboard" }],
  },
  {
    title: "Exames",
    items: [
      { iconKey: "calendar", label: "Agendamentos", href: "/" },
      {
        iconKey: "clock",
        label: "Periódicos Futuros",
        href: "/periodicos-futuros",
      },
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
        iconKey: "users",
        label: "Portal do Cliente",
        href: "/portal",
      },
    ],
  },
  {
    title: "Laudos",
    items: [
      { iconKey: "esocial", label: "e-Social", href: "/e-social" },
      {
        iconKey: "document",
        label: "Laudos SST",
        href: "/laudos-sst",
      },
      {
        iconKey: "shield",
        label: "Riscos Psicossociais",
        href: "/riscos-psicossociais",
      },
    ],
  },
  {
    title: "Faturas",
    items: [
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
    title: "Cadastros",
    items: [
      { iconKey: "users", label: "Clientes", href: "/clientes" },
      { iconKey: "briefcase", label: "Cargos", href: "/cargos" },
      { iconKey: "flask", label: "Exames", href: "/exames" },
      { iconKey: "building", label: "Clínicas", href: "/clinicas" },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        iconKey: "chart",
        label: "Gestão Comercial",
        href: "/gestao-comercial",
      },
      { iconKey: "chart", label: "Relatórios", href: "/relatorios" },
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
