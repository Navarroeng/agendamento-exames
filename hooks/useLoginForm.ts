"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PORTAL_AGROVIAS_PATH } from "@/lib/acesso-externo-agrovias";
import { isPerfilPortalAgrovias } from "@/lib/permissions";
import {
  callbackRecuperacaoNaUrl,
  CHAVE_SESSAO_RECUPERACAO,
  linkRecuperacaoInvalido,
  MENSAGEM_LINK_RECUPERACAO_INVALIDO,
  MENSAGEM_SENHA_REDEFINIDA,
  parametrosAuthDaUrl,
  REDEFINIR_SENHA_PATH,
  resultadoSolicitacaoRecuperacao,
  urlRedefinirSenha,
} from "@/lib/recuperacao-senha";
import { buscarPerfilUsuarioLogado } from "@/services/perfil.service";
import {
  signInWithEmail,
  solicitarRecuperacaoSenha,
} from "@/services/auth.service";

export function useLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [senhaRedefinida, setSenhaRedefinida] = useState(false);
  const [recuperacaoAberta, setRecuperacaoAberta] = useState(false);
  const [recuperacaoEnviada, setRecuperacaoEnviada] = useState(false);
  const [recuperacaoMensagem, setRecuperacaoMensagem] = useState("");

  useEffect(() => {
    const params = parametrosAuthDaUrl(window.location.href);
    if (callbackRecuperacaoNaUrl(params)) {
      window.location.replace(
        `${REDEFINIR_SENHA_PATH}${window.location.search}${window.location.hash}`
      );
      return;
    }

    const search = new URLSearchParams(window.location.search);
    if (linkRecuperacaoInvalido(params)) setLinkInvalido(true);
    if (search.get("recuperar") === "1") setRecuperacaoAberta(true);
    if (search.get("senha") === "redefinida") setSenhaRedefinida(true);
  }, []);

  const abrirRecuperacao = useCallback(() => {
    setRecuperacaoEnviada(false);
    setRecuperacaoMensagem("");
    setRecuperacaoAberta(true);
  }, []);

  const voltarAoLogin = useCallback(() => {
    setRecuperacaoAberta(false);
    setRecuperacaoEnviada(false);
    setRecuperacaoMensagem("");
    setPassword("");
  }, []);

  const solicitarRecuperacao = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const endereco = email.trim();
      if (!endereco || !endereco.includes("@")) {
        toast.error("Informe um e-mail válido.");
        return;
      }

      setLoading(true);
      try {
        const { error } = await solicitarRecuperacaoSenha(
          endereco,
          urlRedefinirSenha(window.location.origin)
        );
        const resultado = resultadoSolicitacaoRecuperacao(error);
        if (!resultado.confirmacaoGenerica) {
          toast.error(resultado.mensagem);
          return;
        }
        setRecuperacaoMensagem(resultado.mensagem);
        setRecuperacaoEnviada(true);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível enviar o link agora. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [email]
  );

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
          if (
            linkRecuperacaoInvalido({
              error: error.message,
              errorCode: error.code ?? null,
              errorDescription: error.message,
            })
          ) {
            setLinkInvalido(true);
            setRecuperacaoAberta(true);
            toast.error(MENSAGEM_LINK_RECUPERACAO_INVALIDO);
            return;
          }
          toast.error(
            error.message === "Invalid login credentials"
              ? "E-mail ou senha incorretos."
              : error.message
          );
          return;
        }
        window.sessionStorage.removeItem(CHAVE_SESSAO_RECUPERACAO);
        toast.success("Login realizado com sucesso!");
        let destino = "/";
        try {
          const perfil = await buscarPerfilUsuarioLogado();
          if (isPerfilPortalAgrovias(perfil?.perfil)) destino = PORTAL_AGROVIAS_PATH;
        } catch (err) {
          console.error(err);
        }
        router.push(destino);
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
    linkInvalido,
    senhaRedefinida,
    mensagemSenhaRedefinida: MENSAGEM_SENHA_REDEFINIDA,
    mensagemLinkInvalido: MENSAGEM_LINK_RECUPERACAO_INVALIDO,
    recuperacaoAberta,
    recuperacaoEnviada,
    recuperacaoMensagem,
    abrirRecuperacao,
    voltarAoLogin,
    solicitarRecuperacao,
  };
}
