"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/constants";
import type { NavItem } from "@/lib/constants";
import { filterNavSectionsByPerfil } from "@/lib/perfil-access";
import { useAuth } from "@/contexts/AuthContext";
import { NavIcon } from "@/components/ui/icons/OutlineIcons";
import { NavarroLogo } from "./NavarroLogo";

function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === null) return false;
  if (item.label === "Agendamentos") return pathname === "/";
  if (item.label === "Dashboard") return pathname === "/dashboard";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = isNavItemActive(pathname, item);

  const className = [
    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium tracking-[-0.1px] transition-all duration-200 ease-out",
    isActive
      ? "bg-[rgba(99,102,241,0.15)] font-semibold text-[#E5E7EB] shadow-[0_0_24px_rgba(99,102,241,0.07)]"
      : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#E5E7EB]",
    item.href
      ? ""
      : "cursor-default opacity-40 hover:bg-transparent hover:text-[#94A3B8]",
  ]
    .filter(Boolean)
    .join(" ");

  const iconClass = isActive
    ? "text-[#818cf8]"
    : "text-[#64748b] group-hover:text-[#94A3B8]";

  const content = (
    <>
      {isActive ? (
        <span
          className="absolute left-0 top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-full bg-[#6366f1] shadow-[0_0_8px_rgba(99,102,241,0.35)]"
          aria-hidden
        />
      ) : null}
      <NavIcon
        iconKey={item.iconKey}
        size={16}
        className={`shrink-0 transition-colors duration-200 ease-out ${iconClass}`}
      />
      <span className="truncate">{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} aria-disabled>
      {content}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const navSections = useMemo(
    () => filterNavSectionsByPerfil(NAV_SECTIONS, profile?.perfil),
    [profile?.perfil]
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-[5] hidden w-[248px] flex-col border-r border-white/[0.08] bg-[#384393] px-3 py-5 shadow-[4px_0_24px_rgba(56,67,147,0.18)] sidebar:flex">
      <div className="brand mb-5 flex justify-center px-1.5">
        <div className="flex w-full items-center justify-center rounded-xl border border-white/20 bg-white px-4 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
          <NavarroLogo priority size="sidebar" />
        </div>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-0.5 py-0.5 pb-3">
        {navSections.map((section, sectionIndex) => (
          <div
            key={section.title}
            className={sectionIndex > 0 ? "mt-1" : undefined}
          >
            <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 first:pt-0">
              {section.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
