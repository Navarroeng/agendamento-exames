"use client";

import type { ReactNode } from "react";
import { iniciaisNome, labelPerfil } from "@/lib/auth-labels";
import { useAuth } from "@/contexts/AuthContext";
import { PageIcon } from "@/components/ui/IconBox";
import { IconCalendar } from "@/components/ui/icons/OutlineIcons";

interface HeaderProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
}

export function Header({
  title,
  subtitle,
  icon = <IconCalendar size={20} />,
}: HeaderProps) {
  const { profile, loading, signOut } = useAuth();

  const nome = profile?.nome ?? (loading ? "..." : "Usuário");
  const cargo = profile ? labelPerfil(profile.perfil) : "—";
  const iniciais = iniciaisNome(nome);

  return (
    <header className="mb-6 flex flex-col items-start justify-between gap-3.5 sidebar:flex-row sidebar:items-center">
      <div className="title-area flex items-center gap-4">
        <PageIcon>{icon}</PageIcon>
        <div>
          <h2 className="text-[26px] font-semibold tracking-[-0.6px] text-navy">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p>
        </div>
      </div>
      <div className="user flex items-center gap-3 rounded-xl border border-[#e8edf5] bg-white/90 px-3.5 py-2.5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] backdrop-blur-sm">
        <div className="avatar grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#5668ff] to-[#7c8cff] text-sm font-bold text-white shadow-[0_4px_12px_rgba(79,99,255,0.25)]">
          {iniciais}
        </div>
        <div>
          <strong className="text-sm font-semibold text-navy">{nome}</strong>
          <br />
          <span className="text-xs text-[#94a3b8]">{cargo}</span>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="ml-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold text-[#64748b] transition-all duration-200 hover:border-[#cbd5e1] hover:bg-white hover:text-navy"
          title="Sair do sistema"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
