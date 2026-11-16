"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PORTAL_AGROVIAS_PATH } from "@/lib/acesso-externo-agrovias";
import { canAccessPath, SEM_PERMISSAO_PATH } from "@/lib/perfil-access";
import { isPerfilPortalAgrovias } from "@/lib/permissions";
import { Header } from "./Header";
import { MobileMenu, MobileMenuButton, Sidebar } from "./Sidebar";

const SIDEBAR_WIDTH = "248px";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  /** O portal da AGROVIAS usa a faixa da marca no lugar do título interno. */
  semTitulo?: boolean;
  /** Faixa no topo da área interna, sem esconder o menu de perfil. */
  faixa?: ReactNode;
  /** Omite o título grande quando a faixa já identifica a tela. */
  ocultarTitulo?: boolean;
}

export function AppShell({
  children,
  title = "Agendamento de Exames",
  subtitle = "Cadastre e acompanhe exames ocupacionais, ASO, custos e faturamento.",
  icon,
  semTitulo = false,
  faixa,
  ocultarTitulo = false,
}: AppShellProps) {
  const { profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccessPath(profile?.perfil, pathname);
  const [menuAberto, setMenuAberto] = useState(false);
  const fecharMenu = useCallback(() => setMenuAberto(false), []);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/login");
      return;
    }
    if (!allowed) {
      router.replace(
        isPerfilPortalAgrovias(profile.perfil) ? PORTAL_AGROVIAS_PATH : SEM_PERMISSAO_PATH
      );
    }
  }, [loading, profile, allowed, router]);

  if (loading || !profile || !allowed) return null;

  const faixaInterna = Boolean(faixa) && !semTitulo;
  const menuMovel = (
    <MobileMenuButton
      open={menuAberto}
      onClick={() => setMenuAberto((aberto) => !aberto)}
    />
  );

  return (
    <div className="app flex min-h-screen">
      <Sidebar />
      <MobileMenu open={menuAberto} onClose={fecharMenu} />
      <main
        className={
          semTitulo
            ? "relative w-full pb-8 sidebar:ml-[248px] sidebar:w-[calc(100%-248px)]"
            : faixaInterna
              ? "relative w-full sidebar:ml-[248px] sidebar:w-[calc(100%-248px)]"
              : "w-full px-[18px] py-[18px] pb-10 sidebar:ml-[248px] sidebar:w-[calc(100%-248px)] sidebar:px-[30px] sidebar:py-[22px] sidebar:pb-10"
        }
      >
        {semTitulo ? (
          <div className="absolute right-3 top-3 z-20 sidebar:hidden">
            {menuMovel}
          </div>
        ) : null}
        {semTitulo ? (
          children
        ) : faixaInterna ? (
          <>
            {faixa}
            <div className="px-[18px] py-[18px] pb-10 sidebar:px-[30px] sidebar:py-[22px]">
              <Header
                title={title}
                subtitle={subtitle}
                icon={icon}
                ocultarTitulo={ocultarTitulo}
                menu={menuMovel}
              />
              {children}
            </div>
          </>
        ) : (
          <>
            <Header
              title={title}
              subtitle={subtitle}
              icon={icon}
              menu={menuMovel}
            />
            {children}
          </>
        )}
      </main>
    </div>
  );
}

export { SIDEBAR_WIDTH };
