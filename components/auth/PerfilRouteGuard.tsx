"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPath, SEM_PERMISSAO_PATH } from "@/lib/perfil-access";

interface PerfilRouteGuardProps {
  children: ReactNode;
}

export function PerfilRouteGuard({ children }: PerfilRouteGuardProps) {
  const { profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const allowed = canAccessPath(profile?.perfil, pathname);

  useEffect(() => {
    if (loading) return;
    if (!allowed) router.replace(SEM_PERMISSAO_PATH);
  }, [loading, allowed, router]);

  if (loading || !allowed) return null;

  return children;
}
