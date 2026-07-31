"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  resolveOrcamentoAcoesMenu,
  type OrcamentoAcaoMenu,
} from "@/lib/orcamento-acoes";
import type { OrcamentoRecord } from "@/lib/orcamento-types";

interface OrcamentoRowActionsMenuProps {
  orcamento: OrcamentoRecord;
  podeEncerrarContrato?: boolean;
  onEditar: (id: string) => void;
  onGerarPdf: (id: string) => void;
  onCancelar: (id: string) => void;
  onAprovar: (id: string) => void;
}

type MenuItem = {
  key: OrcamentoAcaoMenu;
  label: string;
  danger?: boolean;
  onClick: () => void;
};

const LABELS: Record<OrcamentoAcaoMenu, string> = {
  editar: "Editar",
  gerar_pdf: "Gerar PDF",
  aprovar: "Aprovar",
  cancelar: "Cancelar",
};

export function OrcamentoRowActionsMenu({
  orcamento,
  podeEncerrarContrato = false,
  onEditar,
  onGerarPdf,
  onCancelar,
  onAprovar,
}: OrcamentoRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handlers: Record<OrcamentoAcaoMenu, () => void> = useMemo(
    () => ({
      editar: () => onEditar(orcamento.id),
      gerar_pdf: () => onGerarPdf(orcamento.id),
      aprovar: () => onAprovar(orcamento.id),
      cancelar: () => onCancelar(orcamento.id),
    }),
    [onAprovar, onCancelar, onEditar, onGerarPdf, orcamento.id]
  );

  const items: MenuItem[] = useMemo(
    () =>
      resolveOrcamentoAcoesMenu(orcamento.status, {
        podeEncerrarContrato,
      }).map((key) => ({
        key,
        label:
          key === "cancelar" && orcamento.status === "aprovado"
            ? "Encerrar contrato"
            : LABELS[key],
        danger: key === "cancelar",
        onClick: handlers[key],
      })),
    [handlers, orcamento.status, podeEncerrarContrato]
  );

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleAction(item: MenuItem) {
    setOpen(false);
    item.onClick();
  }

  return (
    <div className="relative inline-flex justify-center" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`grid h-7 w-7 place-items-center rounded-[8px] border text-base font-bold leading-none transition-all duration-150 ${
          open
            ? "border-brand-blue/30 bg-brand-blue-soft text-brand-blue"
            : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-navy"
        }`}
        aria-label="Ações"
        aria-expanded={open}
      >
        ⋯
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[160px] origin-top-right overflow-hidden rounded-[10px] border border-[#e8edf5] bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)] animate-[fadeIn_0.15s_ease]"
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => handleAction(item)}
              className={`block w-full px-3 py-1.5 text-left text-[11px] font-medium transition-colors ${
                item.danger
                  ? "text-[#64748b] hover:bg-brand-red-soft hover:text-brand-red"
                  : "text-[#475569] hover:bg-[#f0f4ff] hover:text-brand-blue"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
