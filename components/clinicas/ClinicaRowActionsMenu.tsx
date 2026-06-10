"use client";

import { useEffect, useRef, useState } from "react";
import type { ClinicaStatus } from "@/lib/types";

interface ClinicaRowActionsMenuProps {
  clinicaId: string;
  status: ClinicaStatus;
  onVisualizar: (id: string) => void;
  onEditar: (id: string) => void;
  onDesativar: (id: string) => void;
  onHistorico: (id: string) => void;
}

export function ClinicaRowActionsMenu({
  clinicaId,
  status,
  onVisualizar,
  onEditar,
  onDesativar,
  onHistorico,
}: ClinicaRowActionsMenuProps) {
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

  const items = [
    { key: "visualizar" as const, label: "Visualizar" },
    { key: "editar" as const, label: "Editar" },
    {
      key: "desativar" as const,
      label: "Desativar",
      disabled: status === "inativa",
    },
    { key: "historico" as const, label: "Histórico" },
  ];

  function handleAction(key: (typeof items)[number]["key"]) {
    setOpen(false);
    switch (key) {
      case "visualizar":
        onVisualizar(clinicaId);
        break;
      case "editar":
        onEditar(clinicaId);
        break;
      case "desativar":
        onDesativar(clinicaId);
        break;
      case "historico":
        onHistorico(clinicaId);
        break;
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="grid h-8 w-8 place-items-center rounded-lg border border-app-line bg-white text-lg font-bold leading-none text-[#52617a] transition-colors hover:border-brand-blue hover:bg-brand-blue-soft hover:text-brand-blue"
        aria-label="Ações"
        aria-expanded={open}
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[148px] overflow-hidden rounded-xl border border-app-line bg-white py-1 shadow-card">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={"disabled" in item && item.disabled}
              onClick={() => handleAction(item.key)}
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-[#52617a] transition-colors hover:bg-brand-blue-soft hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
