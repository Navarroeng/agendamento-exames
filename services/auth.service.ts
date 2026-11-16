import { createClient } from "@/lib/supabase/client";

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function solicitarRecuperacaoSenha(email: string, redirectTo: string) {
  const supabase = createClient();
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function atualizarSenha(password: string) {
  const supabase = createClient();
  return supabase.auth.updateUser({ password });
}

export async function signOut(scope: "global" | "local" = "global") {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut({ scope });
  if (error) throw error;
}
