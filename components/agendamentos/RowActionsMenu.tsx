"use client";

import { useEffect, useRef, useState } from "react";
import type { AgendamentoStatus } from "@/lib/types";

interface RowActionsMenuProps {
  agendamentoId: string;
  agendamentoStatus: AgendamentoStatus;
  bloqueadoPorFatura?: boolean;
  podeCancelarExcepcionalAdmin?: boolean;
  onVisualizar: (id: string) => void;
  onEditar: (id: string) => void;
  onCancelar: (id: string) => void;
  onHistorico: (id: string) => void;
  onAsoRetido: (id: string) => void;
  onLiberarAsoRetido: (id: string) => void;
}

type MenuItem = {
  key: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export function RowActionsMenu({
  agendamentoId,
  agendamentoStatus,
  bloqueadoPorFatura = false,
  podeCancelarExcepcionalAdmin = false,
  onVisualizar,
  onEditar,
  onCancelar,
  onHistorico,
  onAsoRetido,
  onLiberarAsoRetido,
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const items: MenuItem[] = [
    { key: "visualizar", label: "Visualizar", onClick: () => onVisualizar(agendamentoId) },
  ];

  if (bloqueadoPorFatura) {
    items.push({
      key: "editar-doc",
      label: "Editar documentação",
      onClick: () => onEditar(agendamentoId),
    });
    if (podeCancelarExcepcionalAdmin) {
      items.push({
        key: "cancelar",
        label: "Cancelar",
        danger: true,
        onClick: () => onCancelar(agendamentoId),
      });
    }
  } else if (agendamentoStatus !== "cancelado" && agendamentoStatus !== "rascunho") {
    items.push(
      { key: "editar", label: "Editar", onClick: () => onEditar(agendamentoId) },
      {
        key: "cancelar",
        label: "Cancelar",
        danger: true,
        onClick: () => onCancelar(agendamentoId),
      }
    );
  } else if (agendamentoStatus !== "cancelado") {
    items.push({
      key: "editar",
      label: "Editar",
      onClick: () => onEditar(agendamentoId),
    });
  }

  items.push({
    key: "historico",
    label: "Histórico",
    onClick: () => onHistorico(agendamentoId),
  });

  if (agendamentoStatus === "agendado") {
    items.push({
      key: "aso-retido",
      label: "ASO Retido",
      onClick: () => onAsoRetido(agendamentoId),
    });
  }

  if (agendamentoStatus === "aso_retido") {
    items.push({
      key: "liberar-aso-retido",
      label: "Liberar ASO Retido",
      onClick: () => onLiberarAsoRetido(agendamentoId),
    });
  }

  function handleAction(item: MenuItem) {
    if (item.disabled || !item.onClick) return;
    setOpen(false);
    item.onClick();
  }

  return (
    <div className="relative inline-block" ref={ref}>
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
              disabled={item.disabled}
              onClick={() => handleAction(item)}
              className={`block w-full px-3 py-1.5 text-left text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                item.disabled
                  ? "text-[#94a3b8]"
                  : item.danger
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
