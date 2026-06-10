"use client";

import Link from "next/link";
import { LoginBackground } from "./LoginBackground";
import { NavarroLogo } from "@/components/layout/NavarroLogo";

export function SemPermissaoPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
      <LoginBackground />

      <div className="relative z-10 w-full max-w-[480px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 rounded-[22px] border border-white/10 bg-white px-8 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <NavarroLogo priority size="hero" />
          </div>

          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] shadow-[0_8px_32px_rgba(79,99,255,0.12)] backdrop-blur-sm">
            <svg
              className="h-8 w-8 text-[#a5b4fc]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>

          <h1 className="text-[28px] font-extrabold tracking-[-0.6px] text-white">
            Sem permissão
          </h1>
          <p className="mt-3 max-w-[360px] text-sm leading-relaxed text-white/55">
            Você não tem autorização para acessar esta área do sistema. Entre em
            contato com o administrador se precisar de acesso.
          </p>
        </div>

        <div className="rounded-[26px] border border-white/20 bg-white/[0.97] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-9">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="rounded-xl border border-[#e8edf5] bg-[#f8faff] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                Acesso restrito
              </p>
              <p className="mt-1 text-sm text-[#475569]">
                Esta página requer permissões de administrador ou perfil
                autorizado.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="btn btn-primary w-full justify-center py-3.5 text-[15px] shadow-btn-primary"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        </div>

        <p className="mt-7 text-center text-xs font-medium text-white/35">
          Navarro Engenharia · Gestão Ocupacional
        </p>
      </div>
    </div>
  );
}
