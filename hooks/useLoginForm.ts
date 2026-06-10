"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signInWithEmail } from "@/services/auth.service";

export function useLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!email.trim() || !password) {
        toast.error("Informe e-mail e senha.");
        return;
      }

      setLoading(true);
      try {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) {
          toast.error(
            error.message === "Invalid login credentials"
              ? "E-mail ou senha incorretos."
              : error.message
          );
          return;
        }
        toast.success("Login realizado com sucesso!");
        router.push("/");
        router.refresh();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao entrar. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, router]
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleSubmit,
  };
}
