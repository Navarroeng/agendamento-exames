"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/constants";
import type { NavItem } from "@/lib/constants";
import { filterNavSectionsByPerfil } from "@/lib/perfil-access";
import { useAuth } from "@/contexts/AuthContext";
import { NavIcon } from "@/components/ui/icons/OutlineIcons";

function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === null) return false;
  if (item.label === "Agendamentos") return pathname === "/";
  if (item.label === "Dashboard") return pathname === "/dashboard";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
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
      <Link href={item.href} className={className} onClick={onNavigate}>
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

function useNavSections() {
  const { profile } = useAuth();

  return useMemo(() => {
    if (profile?.perfil === "portal_agrovias") {
      return [
        {
          title: "AGROVIAS",
          items: [{ iconKey: "users" as const, label: "Colaboradores", href: "/portal-agrovias" }],
        },
      ];
    }
    return filterNavSectionsByPerfil(NAV_SECTIONS, profile?.perfil);
  }, [profile?.perfil]);
}

function SidebarPanel({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const navSections = useNavSections();

  return (
    <>
      <div className="brand mb-5 flex justify-center px-1.5">
        <div className="flex w-full items-center justify-center rounded-xl border border-white/20 bg-white px-3 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
          <Image
            src="/logo-navarro-relatorio-riscos.png"
            alt="Navarro Engenharia"
            width={373}
            height={110}
            priority
            className="h-auto w-full object-contain object-center"
          />
        </div>
      </div>

      <nav
        className="sidebar-nav-scroll flex flex-1 flex-col overflow-y-auto px-0.5 py-0.5 pb-3"
        aria-label="Menu principal"
      >
        {navSections.map((section, sectionIndex) => (
          <div
            key={section.title || section.items[0]?.label || sectionIndex}
            className={sectionIndex > 0 ? "mt-1" : undefined}
          >
            {section.title ? (
              <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 first:pt-0">
                {section.title}
              </p>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-[5] hidden w-[248px] flex-col border-r border-white/[0.08] bg-[#384393] px-3 py-5 shadow-[4px_0_24px_rgba(56,67,147,0.18)] sidebar:flex">
      <SidebarPanel />
    </aside>
  );
}

function IconMenu() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function MobileMenuButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="sidebar:hidden grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#e8edf5] bg-white text-navy shadow-[0_4px_20px_rgba(15,23,42,0.05)]"
      aria-label={open ? "Fechar menu" : "Abrir menu"}
      aria-expanded={open}
      aria-controls="menu-mobile-navarro"
      onClick={onClick}
    >
      {open ? <IconClose /> : <IconMenu />}
    </button>
  );
}

export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const desktop = window.matchMedia("(min-width: 850px)");
    const onViewport = () => {
      if (desktop.matches) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onViewport);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onViewport);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sidebar:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-[#0b1f4d]/50"
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <aside
        id="menu-mobile-navarro"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-y-0 left-0 flex w-[248px] max-w-[85vw] flex-col border-r border-white/[0.08] bg-[#384393] px-3 py-5 shadow-[4px_0_24px_rgba(56,67,147,0.18)]"
      >
        <div className="mb-3 flex justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IconClose />
          </button>
        </div>
        <SidebarPanel onNavigate={onClose} />
      </aside>
    </div>
  );
}
