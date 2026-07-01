"use client";

import { useEffect, useRef, useState } from "react";
import { isEnvioEsocialConcluido } from "@/lib/esocial-filters";
import type { AgendamentoWithExames } from "@/lib/types";

interface ESocialRowActionsMenuProps {
  agendamento: AgendamentoWithExames;
  bloqueadoPorFatura?: boolean;
  onVisualizar: (id: string) => void;
  onMarcarEnviado: (id: string) => void;
  onMarcarPendente: (id: string) => void;
  disabled?: boolean;
}

export function ESocialRowActionsMenu({
  agendamento,
  bloqueadoPorFatura = false,
  onVisualizar,
  onMarcarEnviado,
  onMarcarPendente,
  disabled = false,
}: ESocialRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const enviado = isEnvioEsocialConcluido(agendamento.envio_esocial);

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

  const items = bloqueadoPorFatura
    ? [
        { key: "visualizar", label: "Ver agendamento" },
        { key: "bloqueado", label: "Bloqueado por fatura", disabled: true },
      ]
    : enviado
      ? [
          { key: "visualizar", label: "Ver agendamento" },
          { key: "pendente", label: "Marcar como pendente" },
        ]
      : [
          { key: "visualizar", label: "Ver agendamento" },
          { key: "enviado", label: "Marcar como enviado" },
        ];

  function handleAction(key: string) {
    setOpen(false);
    if (disabled || key === "bloqueado") return;
    switch (key) {
      case "visualizar":
        onVisualizar(agendamento.id);
        break;
      case "enviado":
        onMarcarEnviado(agendamento.id);
        break;
      case "pendente":
        onMarcarPendente(agendamento.id);
        break;
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`grid h-7 w-7 place-items-center rounded-[8px] border text-base font-bold leading-none transition-all ${
          open
            ? "border-brand-blue/30 bg-brand-blue-soft text-brand-blue"
            : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-navy"
        } disabled:opacity-50`}
        aria-label="Ações"
        aria-expanded={open}
      >
        ⋯
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[168px] overflow-hidden rounded-[10px] border border-[#e8edf5] bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => handleAction(item.key)}
              className={`block w-full px-3 py-1.5 text-left text-[11px] font-medium transition-colors ${
                item.key === "bloqueado"
                  ? "cursor-not-allowed text-[#94a3b8]"
                  : item.key === "pendente"
                    ? "text-[#64748b] hover:bg-brand-orange-soft hover:text-[#c96d00]"
                    : "text-[#475569] hover:bg-[#f0f4ff] hover:text-brand-blue"
              }`}
              disabled={item.key === "bloqueado"}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
