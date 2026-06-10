import Link from "next/link";
import {
  IconCalendar,
  IconEsocial,
  IconFileText,
  IconShield,
  IconUsers,
} from "@/components/ui/icons/OutlineIcons";
import type { ReactNode } from "react";

const ACTIONS: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Novo Agendamento", icon: <IconCalendar size={15} /> },
  { href: "/exames", label: "Exames", icon: <IconFileText size={15} /> },
  { href: "/e-social", label: "e-Social", icon: <IconEsocial size={15} /> },
  {
    href: "/periodicos-futuros",
    label: "Periódicos Futuros",
    icon: <IconShield size={15} />,
  },
  { href: "/clientes", label: "Clientes", icon: <IconUsers size={15} /> },
];

export function DashboardQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <Link
          key={action.href + action.label}
          href={action.href}
          className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3.5 py-2 text-[12px] font-bold text-navy shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-colors hover:border-brand-blue/40 hover:bg-brand-blue-soft"
        >
          <span className="text-brand-blue">{action.icon}</span>
          {action.label}
        </Link>
      ))}
    </div>
  );
}
