"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  acoesMenuListagemProcessoRiscos,
  pathAvaliacaoCampanha,
} from "@/lib/riscos-campanha";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

type RiscosProcessoRowActionsMenuProps = {
  processo: RiscosPsicossociaisProcesso;
  isAdmin: boolean;
  savingRemover?: boolean;
  onAbrir: (processo: RiscosPsicossociaisProcesso) => void;
  onRemoverProcesso?: (processo: RiscosPsicossociaisProcesso) => void;
};

export function RiscosProcessoRowActionsMenu({
  processo,
  isAdmin,
  savingRemover = false,
  onAbrir,
  onRemoverProcesso,
}: RiscosProcessoRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const campanha = processo.campanha;
  const acoes = acoesMenuListagemProcessoRiscos({
    campanhaStatus: campanha?.status,
    codigoPublico: campanha?.codigo_publico,
    isAdmin,
    hasCampanha: Boolean(campanha?.id),
  });

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const btn = rootRef.current.getBoundingClientRect();
    const estimatedHeight = 220;
    setOpenUp(btn.bottom + estimatedHeight > window.innerHeight - 8);
  }, [open]);

  async function handleCopiarLink() {
    if (!acoes.podeCopiarLink || !campanha?.codigo_publico) return;
    const path = pathAvaliacaoCampanha(campanha.codigo_publico);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado com sucesso.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-flex justify-center">
      <button
        type="button"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold transition ${
          open
            ? "bg-brand-blue-soft text-brand-blue"
            : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-navy"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Ações do processo ${processo.implantacao.orcamento.numero}`}
        onClick={() => setOpen((v) => !v)}
      >
        ⋮
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute right-0 z-30 w-56 overflow-hidden rounded-xl border border-[#e8edf5] bg-white py-1 text-left shadow-[0_10px_30px_rgba(15,23,42,0.12)] ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <MenuItem
            label="Abrir"
            onClick={() => {
              setOpen(false);
              onAbrir(processo);
            }}
          />
          <MenuItem
            label="Copiar link"
            disabled={!acoes.podeCopiarLink}
            title={
              acoes.podeCopiarLink
                ? "Copiar link completo da pesquisa"
                : acoes.copiarLinkMotivoDesabilitado
            }
            onClick={() => void handleCopiarLink()}
          />
          <MenuItem
            label="Gerar relatório"
            disabled={!acoes.podeGerarRelatorio}
            title={acoes.gerarRelatorioMotivoDesabilitado}
            onClick={() => setOpen(false)}
          />
          {acoes.mostrarRemoverProcesso ? (
            <>
              <div className="my-1 border-t border-[#eef2f7]" />
              <MenuItem
                label="Remover processo"
                danger
                disabled={savingRemover}
                onClick={() => {
                  setOpen(false);
                  onRemoverProcesso?.(processo);
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  disabled = false,
  danger = false,
  title,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={title}
      className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${
        disabled
          ? "cursor-not-allowed text-[#cbd5e1]"
          : danger
            ? "text-brand-red hover:bg-[#fef2f2]"
            : "text-navy hover:bg-[#f8fafc]"
      }`}
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
    >
      {label}
    </button>
  );
}
