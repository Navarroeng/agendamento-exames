"use client";

import { useEffect, useRef, useState } from "react";

interface RowActionsMenuProps {
  agendamentoId: string;
  onVisualizar: (id: string) => void;
  onEditar: (id: string) => void;
  onCancelar: (id: string) => void;
  onHistorico: (id: string) => void;
}

const ITEMS = [
  { key: "visualizar", label: "Visualizar" },
  { key: "editar", label: "Editar" },
  { key: "cancelar", label: "Cancelar", danger: true },
  { key: "historico", label: "Histórico" },
] as const;

export function RowActionsMenu({
  agendamentoId,
  onVisualizar,
  onEditar,
  onCancelar,
  onHistorico,
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

  function handleAction(key: (typeof ITEMS)[number]["key"]) {
    setOpen(false);
    switch (key) {
      case "visualizar":
        onVisualizar(agendamentoId);
        break;
      case "editar":
        onEditar(agendamentoId);
        break;
      case "cancelar":
        onCancelar(agendamentoId);
        break;
      case "historico":
        onHistorico(agendamentoId);
        break;
    }
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
          className="absolute right-0 top-full z-20 mt-1 min-w-[136px] origin-top-right overflow-hidden rounded-[10px] border border-[#e8edf5] bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)] animate-[fadeIn_0.15s_ease]"
          role="menu"
        >
          {ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => handleAction(item.key)}
              className={`block w-full px-3 py-1.5 text-left text-[11px] font-medium transition-colors ${
                "danger" in item && item.danger
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
