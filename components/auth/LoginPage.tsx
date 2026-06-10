"use client";

import { useLoginForm } from "@/hooks/useLoginForm";
import { NavarroLogo } from "@/components/layout/NavarroLogo";
import { LoginBackground } from "./LoginBackground";

export function LoginPage() {
  const { email, setEmail, password, setPassword, loading, handleSubmit } =
    useLoginForm();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
      <LoginBackground />

      <div className="relative z-10 w-full max-w-[460px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-7 rounded-[22px] border border-white/10 bg-white px-10 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <NavarroLogo priority size="hero" />
          </div>
          <h2 className="text-[28px] font-extrabold tracking-[-0.6px] text-white">
            Acesso ao sistema
          </h2>
          <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-white/60">
            Gestão de agendamentos e exames ocupacionais
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[26px] border border-white/20 bg-white/[0.97] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-9"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-app-muted"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="field-input border-[#dfe5f0] bg-[#fafcff] transition focus:border-brand-blue focus:bg-white"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-app-muted"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="field-input border-[#dfe5f0] bg-[#fafcff] transition focus:border-brand-blue focus:bg-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary mt-7 w-full justify-center py-3.5 text-[15px] shadow-btn-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-7 text-center text-xs font-medium text-white/40">
          Navarro Engenharia — uso interno autorizado
        </p>
      </div>
    </div>
  );
}
