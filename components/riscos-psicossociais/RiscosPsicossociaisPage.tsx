"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconShield } from "@/components/ui/icons/OutlineIcons";

export function RiscosPsicossociaisPage() {
  return (
    <AppShell
      title="Riscos Psicossociais"
      subtitle="Módulo em preparação."
      icon={<IconShield size={20} />}
    >
      <div className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-16 text-center shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <p className="text-sm font-semibold text-app-muted">Em desenvolvimento</p>
      </div>
    </AppShell>
  );
}
