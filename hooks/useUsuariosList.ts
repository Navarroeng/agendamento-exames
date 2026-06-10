"use client";

import { useCallback, useEffect, useState } from "react";
import { listarPerfisUsuarios } from "@/services/perfil.service";
import type { PerfilUsuario } from "@/lib/types";

export function useUsuariosList() {
  const [usuarios, setUsuarios] = useState<PerfilUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarPerfisUsuarios();
      setUsuarios(data);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Erro ao carregar usuários";
      setError(message);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { usuarios, loading, error, refresh };
}
