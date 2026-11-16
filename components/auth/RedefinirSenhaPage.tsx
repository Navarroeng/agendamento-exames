"use client";

import Link from "next/link";
import {
  instalarOuvinteRecuperacao,
  useRedefinirSenha,
} from "@/hooks/useRedefinirSenha";
import { NavarroLogo } from "@/components/layout/NavarroLogo";
import { LoginBackground } from "./LoginBackground";

export function RedefinirSenhaPage() {
  instalarOuvinteRecuperacao();
  const {
    estado,
    senha,
    setSenha,
    confirmacao,
    setConfirmacao,
    salvando,
    salvar,
    mensagemLinkInvalido,
  } = useRedefinirSenha();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
      <LoginBackground />

      <div className="relative z-10 w-full max-w-[460px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-7 rounded-[22px] border border-white/10 bg-white px-10 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <NavarroLogo priority size="hero" />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.6px] text-white">
            Redefinir senha
          </h1>
          <p className="mt-2 max-w-[340px] text-sm leading-relaxed text-white/60">
            Escolha uma nova senha para a mesma conta. O perfil e as permissões
            permanecem os mesmos.
          </p>
        </div>

        <div className="rounded-[26px] border border-white/20 bg-white/[0.97] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-9">
          {estado === "verificando" && (
            <p className="text-sm text-[#52617a]">Verificando o link de recuperação...</p>
          )}

          {estado === "invalida" && (
            <div role="alert" className="space-y-4">
              <p className="rounded-xl border border-[#f3c7c7] bg-[#fff6f6] px-4 py-3 text-sm font-medium leading-relaxed text-[#9f2d2d]">
                {mensagemLinkInvalido}
              </p>
              <Link
                href="/login?recuperar=1"
                className="btn btn-primary w-full justify-center py-3.5 text-[15px]"
              >
                Solicitar novo link
              </Link>
            </div>
          )}

          {estado === "pronta" && (
            <form onSubmit={salvar} className="space-y-5">
              <div>
                <label
                  htmlFor="nova-senha"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-app-muted"
                >
                  Nova senha
                </label>
                <input
                  id="nova-senha"
                  type="password"
                  autoComplete="new-password"
                  className="field-input border-[#dfe5f0] bg-[#fafcff] transition focus:border-brand-blue focus:bg-white"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={salvando}
                />
              </div>
              <div>
                <label
                  htmlFor="confirmar-nova-senha"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-app-muted"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="confirmar-nova-senha"
                  type="password"
                  autoComplete="new-password"
                  className="field-input border-[#dfe5f0] bg-[#fafcff] transition focus:border-brand-blue focus:bg-white"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  disabled={salvando}
                />
              </div>
              <button
                type="submit"
                disabled={salvando}
                className="btn btn-primary w-full justify-center py-3.5 text-[15px] shadow-btn-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {salvando ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
