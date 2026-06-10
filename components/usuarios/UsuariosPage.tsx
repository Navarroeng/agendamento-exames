"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconUser } from "@/components/ui/icons/OutlineIcons";
import { UsuariosTable } from "./UsuariosTable";
import { useUsuariosList } from "@/hooks/useUsuariosList";

export function UsuariosPage() {
  const { usuarios, loading, error } = useUsuariosList();

  return (
    <AppShell
      title="Usuários"
      subtitle="Usuários com acesso ao sistema e perfis de operação."
      icon={<IconUser size={20} />}
    >
      <UsuariosTable usuarios={usuarios} loading={loading} error={error} />
    </AppShell>
  );
}
