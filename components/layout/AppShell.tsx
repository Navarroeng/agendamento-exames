"use client";

import { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

const SIDEBAR_WIDTH = "248px";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
}

export function AppShell({
  children,
  title = "Agendamento de Exames",
  subtitle = "Cadastre e acompanhe exames ocupacionais, ASO, custos e faturamento.",
  icon,
}: AppShellProps) {
  return (
    <div className="app flex min-h-screen">
      <Sidebar />
      <main className="w-full px-[18px] py-[18px] pb-10 sidebar:ml-[248px] sidebar:w-[calc(100%-248px)] sidebar:px-[30px] sidebar:py-[22px] sidebar:pb-10">
        <Header title={title} subtitle={subtitle} icon={icon} />
        {children}
      </main>
    </div>
  );
}

export { SIDEBAR_WIDTH };
