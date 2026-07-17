"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buscarPerfilUsuarioLogado } from "@/services/perfil.service";
import { signOut as authSignOut } from "@/services/auth.service";
import type { PerfilUsuario } from "@/lib/types";

interface AuthContextValue {
  profile: PerfilUsuario | null;
  loading: boolean;
  displayName: string;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await buscarPerfilUsuarioLogado();
      setProfile(data);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const data = await buscarPerfilUsuarioLogado();
        if (!cancelled) setProfile(data);
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshProfile();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setProfile(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  const displayName = profile?.nome ?? "Usuário";

  const value = useMemo(
    () => ({
      profile,
      loading,
      displayName,
      signOut,
      refreshProfile,
    }),
    [profile, loading, displayName, signOut, refreshProfile]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}

export function useHistoricoUsuario() {
  const { displayName, profile } = useAuth();
  return profile?.nome ?? displayName;
}

export function useAuditoriaUsuario() {
  const { displayName, profile } = useAuth();
  return useMemo(
    () => ({
      usuarioId: profile?.user_id ?? null,
      usuarioNome: profile?.nome ?? displayName,
      usuarioEmail: profile?.email ?? "",
    }),
    [profile?.user_id, profile?.nome, profile?.email, displayName]
  );
}
