"use client";

import { useEffect, useRef, useState } from "react";
import type { PeriodicoFuturoGrupo } from "@/lib/periodico-agrupamento";

interface PeriodicoRowActionsMenuProps {
  record: PeriodicoFuturoGrupo;
  canAct: boolean;
  canCancelarPeriodico?: boolean;
  disabled?: boolean;
  onCriarAgendamento: (record: PeriodicoFuturoGrupo) => void;
  onVisualizarAgendamento?: (agendamentoId: string) => void;
  onEditarProximaData: (record: PeriodicoFuturoGrupo) => void;
  onAdicionarCpf?: (record: PeriodicoFuturoGrupo) => void;
  onReagendar: (ids: string[]) => void;
  onCancelarPeriodico?: (record: PeriodicoFuturoGrupo) => void;
}

type MenuItem = {
  key: string;
  label: string;
  danger?: boolean;
};

export function PeriodicoRowActionsMenu({
  record,
  canAct,
  canCancelarPeriodico = false,
  disabled = false,
  onCriarAgendamento,
  onVisualizarAgendamento,
  onEditarProximaData,
  onAdicionarCpf,
  onReagendar,
  onCancelarPeriodico,
}: PeriodicoRowActionsMenuProps) {
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

  const agendamentoParaVer =
    record.agendamentoVinculadoIds?.[0] ||
    record.agendamento_vinculado_id ||
    (record.displayStatus === "reagendado" ? record.agendamento_id : null);
  const verAgendamento =
    record.displayStatus === "reagendado" &&
    Boolean(agendamentoParaVer) &&
    Boolean(onVisualizarAgendamento);

  const podeEditarProximaData = record.podeEditarProximaData;
  const periodicoCancelado = record.displayStatus === "cancelado";

  const items: MenuItem[] = [];

  if (!periodicoCancelado) {
    items.push(
      verAgendamento
        ? { key: "ver", label: "Ver agendamento" }
        : { key: "criar", label: "Criar agendamento" }
    );
  }

  if (onAdicionarCpf && !record.temCpf) {
    items.push({ key: "cpf", label: "Adicionar CPF" });
  }

  if (canAct) {
    if (podeEditarProximaData) {
      items.push({ key: "editar_data", label: "Editar próxima data" });
    }
    items.push({ key: "reagendar", label: "Reagendar" });
  }

  if (canCancelarPeriodico && onCancelarPeriodico) {
    items.push({ key: "cancelar_periodico", label: "Cancelar periódico", danger: true });
  }

  if (items.length === 0) {
    return <span className="text-[10px] text-[#94a3b8]">—</span>;
  }

  function handleAction(key: string) {
    setOpen(false);
    if (disabled) return;
    switch (key) {
      case "criar":
        onCriarAgendamento(record);
        break;
      case "ver":
        if (agendamentoParaVer) {
          onVisualizarAgendamento?.(agendamentoParaVer);
        }
        break;
      case "editar_data":
        if (!record.podeEditarProximaData) return;
        onEditarProximaData(record);
        break;
      case "cpf":
        onAdicionarCpf?.(record);
        break;
      case "reagendar":
        onReagendar(record.ids);
        break;
      case "cancelar_periodico":
        onCancelarPeriodico?.(record);
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
          className="absolute right-0 top-full z-20 mt-1 min-w-[176px] overflow-hidden rounded-[10px] border border-[#e8edf5] bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
          role="menu"
        >
          {items.map((item, index) => {
            const prev = items[index - 1];
            const showDivider = Boolean(item.danger && prev && !prev.danger);
            return (
              <div key={item.key}>
                {showDivider ? (
                  <div className="my-1 border-t border-[#eef2f7]" />
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleAction(item.key)}
                  className={`block w-full px-3 py-1.5 text-left text-[11px] font-medium transition-colors ${
                    item.danger
                      ? "text-brand-red hover:bg-brand-red-soft"
                      : "text-[#475569] hover:bg-[#f0f4ff] hover:text-brand-blue"
                  }`}
                >
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
