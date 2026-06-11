import type { ComponentType, ReactNode, SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

const defaults = {
  size: 16,
  strokeWidth: 1.75,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconBase({
  size = 16,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      {...defaults}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
    </IconBase>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </IconBase>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="9.5" cy="8" r="3" />
      <path d="M20 19v-1a3 3 0 0 0-2-2.8M16 4.2a3 3 0 0 1 0 5.6" />
    </IconBase>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h.01M9 11h.01M9 15h.01M15 7h.01M15 11h.01M15 15h.01" />
    </IconBase>
  );
}

export function IconFlask(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 2v6.5L5.5 18a2 2 0 0 0 1.8 3h9.7a2 2 0 0 0 1.8-3L14 8.5V2" />
      <path d="M8 2h8" />
    </IconBase>
  );
}

export function IconChart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15V9M12 15V6M16 15v-4" />
    </IconBase>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-2-1.5L15 21l-3-1.5L9 21l-2 1.5L5 21l-2 1.5V5a2 2 0 0 1 2-2z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </IconBase>
  );
}

export function IconEsocial(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7l-5-5z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6M9 17h4" />
      <path d="M16 14.5 17.5 16 21 12.5" />
    </IconBase>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9z" />
      <path d="M17 12h3" />
    </IconBase>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 4h5v5M10 14 20 4M18 9v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h9" />
    </IconBase>
  );
}

export function IconUser(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </IconBase>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </IconBase>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="7" y="4" width="10" height="16" rx="1.5" />
      <path d="M9 4.5h6a1.5 1.5 0 0 0 0-3H9a1.5 1.5 0 0 0 0 3z" />
    </IconBase>
  );
}

export function IconFileText(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6M9 9h2" />
    </IconBase>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </IconBase>
  );
}

export function IconShield(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 20 7v6c0 4.4-3.2 7.4-8 8-4.8-.6-8-3.6-8-8V7l8-4z" />
    </IconBase>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 3h8l1 4-3 2a11 11 0 0 0 5 5l2-3 4 1v8a2 2 0 0 1-2 2C10.5 22 2 13.5 2 4a2 2 0 0 1 2-2z" />
    </IconBase>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </IconBase>
  );
}

export function IconCreditCard(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </IconBase>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />
    </IconBase>
  );
}

export function IconBriefcase(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="8" width="16" height="11" rx="1.5" />
      <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" />
      <path d="M4 12h16" />
    </IconBase>
  );
}

export function IconClock(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </IconBase>
  );
}

export type NavIconKey =
  | "home"
  | "calendar"
  | "esocial"
  | "users"
  | "building"
  | "flask"
  | "briefcase"
  | "chart"
  | "clock"
  | "receipt"
  | "wallet"
  | "external"
  | "user"
  | "shield"
  | "settings";

const NAV_ICON_MAP: Record<NavIconKey, ComponentType<IconProps>> = {
  home: IconHome,
  calendar: IconCalendar,
  esocial: IconEsocial,
  users: IconUsers,
  building: IconBuilding,
  flask: IconFlask,
  briefcase: IconBriefcase,
  chart: IconChart,
  clock: IconClock,
  receipt: IconReceipt,
  wallet: IconWallet,
  external: IconExternal,
  user: IconUser,
  shield: IconShield,
  settings: IconSettings,
};

export function NavIcon({
  iconKey,
  ...props
}: IconProps & { iconKey: NavIconKey }) {
  const Comp = NAV_ICON_MAP[iconKey];
  return <Comp {...props} />;
}

export const PAGE_ICONS = {
  agendamentos: IconCalendar,
  clientes: IconUsers,
  clinicas: IconBuilding,
  exames: IconFlask,
  cargos: IconBriefcase,
  faturas: IconReceipt,
  usuarios: IconUser,
  relatorios: IconChart,
  financeiro: IconWallet,
} as const;
