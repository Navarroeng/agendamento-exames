"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  CHAVE_SESSAO_RECUPERACAO,
  linkRecuperacaoInvalido,
  MENSAGEM_LINK_RECUPERACAO_INVALIDO,
  mensagemErroNovaSenha,
  parametrosAuthDaUrl,
  validarNovaSenha,
} from "@/lib/recuperacao-senha";
import { atualizarSenha, signOut } from "@/services/auth.service";

type EstadoRecuperacao = "verificando" | "pronta" | "invalida";

const verificacoesToken = new Map<
  string,
  Promise<{ userId: string | null }>
>();

let ouvinteInstalado = false;

export function instalarOuvinteRecuperacao() {
  if (typeof window === "undefined" || ouvinteInstalado) return;
  ouvinteInstalado = true;
  const supabase = createClient();
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session?.user.id) {
      window.sessionStorage.setItem(CHAVE_SESSAO_RECUPERACAO, session.user.id);
    }
  });
}

function limparSegredosDaUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("token");
  url.hash = "";
  const search = url.searchParams.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${search ? `?${search}` : ""}`
  );
}

async function sessaoRecuperacaoValida(): Promise<boolean> {
  const esperado = window.sessionStorage.getItem(CHAVE_SESSAO_RECUPERACAO);
  if (!esperado) return false;
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== esperado) {
    window.sessionStorage.removeItem(CHAVE_SESSAO_RECUPERACAO);
    return false;
  }
  return true;
}

export function useRedefinirSenha() {
  const [estado, setEstado] = useState<EstadoRecuperacao>("verificando");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const params = parametrosAuthDaUrl(window.location.href);

    async function preparar() {
      try {
        if (linkRecuperacaoInvalido(params)) {
          window.sessionStorage.removeItem(CHAVE_SESSAO_RECUPERACAO);
          if (ativo) setEstado("invalida");
          return;
        }

        const supabase = createClient();

        if (params.tokenHash && (params.type === "recovery" || !params.type)) {
          const chave = params.tokenHash;
          let pendente = verificacoesToken.get(chave);
          if (!pendente) {
            pendente = supabase.auth
              .verifyOtp({ token_hash: chave, type: "recovery" })
              .then(({ data, error }) => {
                if (error || !data.session?.user.id) return { userId: null };
                window.sessionStorage.setItem(
                  CHAVE_SESSAO_RECUPERACAO,
                  data.session.user.id
                );
                return { userId: data.session.user.id };
              });
            verificacoesToken.set(chave, pendente);
          }
          const resultado = await pendente;
          if (!ativo) return;
          if (!resultado.userId) {
            setEstado("invalida");
            return;
          }
          limparSegredosDaUrl();
          setEstado("pronta");
          return;
        }

        await supabase.auth.getSession();
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (!ativo) return;

        if (await sessaoRecuperacaoValida()) {
          limparSegredosDaUrl();
          setEstado("pronta");
          return;
        }

        if (
          params.type === "recovery" &&
          params.accessToken &&
          params.refreshToken
        ) {
          const { data, error } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          if (!ativo) return;
          if (error || !data.session?.user.id) {
            setEstado("invalida");
            return;
          }
          window.sessionStorage.setItem(
            CHAVE_SESSAO_RECUPERACAO,
            data.session.user.id
          );
          limparSegredosDaUrl();
          setEstado("pronta");
          return;
        }

        if (ativo) setEstado("invalida");
      } catch (err) {
        console.error(err);
        if (ativo) setEstado("invalida");
      }
    }

    void preparar();
    return () => {
      ativo = false;
    };
  }, []);

  const salvar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const erroFormulario = validarNovaSenha(senha, confirmacao);
      if (erroFormulario) {
        toast.error(erroFormulario);
        return;
      }

      setSalvando(true);
      try {
        if (!(await sessaoRecuperacaoValida())) {
          window.sessionStorage.removeItem(CHAVE_SESSAO_RECUPERACAO);
          setEstado("invalida");
          return;
        }

        const { error } = await atualizarSenha(senha);
        if (error) {
          toast.error(mensagemErroNovaSenha(error.message));
          if (
            linkRecuperacaoInvalido({
              error: error.message,
              errorCode: error.code ?? null,
              errorDescription: error.message,
            })
          ) {
            window.sessionStorage.removeItem(CHAVE_SESSAO_RECUPERACAO);
            setEstado("invalida");
          }
          return;
        }

        window.sessionStorage.removeItem(CHAVE_SESSAO_RECUPERACAO);
        try {
          await signOut("local");
        } catch (err) {
          console.error(err);
        }
        window.location.assign("/login?senha=redefinida");
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível salvar a nova senha. Tente novamente.");
      } finally {
        setSalvando(false);
      }
    },
    [senha, confirmacao]
  );

  return {
    estado,
    senha,
    setSenha,
    confirmacao,
    setConfirmacao,
    salvando,
    salvar,
    mensagemLinkInvalido: MENSAGEM_LINK_RECUPERACAO_INVALIDO,
  };
}
