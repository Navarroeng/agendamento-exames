"use client";

import { useEffect, useRef, useState } from "react";
import type { FaturaRecord, FaturaStatus, FaturaTipo } from "@/lib/types";
import { CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO } from "@/lib/custos-clinicas-conferencia";
import {
  faturaStatusEmissaoAtiva,
  faturaStatusHistoricoReemissao,
} from "@/lib/fatura-reemissao";

interface FaturaRowActionsMenuProps {
  fatura: FaturaRecord;
  variant?: FaturaTipo;
  onVisualizar: (id: string) => void;
  onGerarPdf: (id: string) => void;
  onCancelar: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onEditarPagamento: (id: string) => void;
  onMarcarPendente: (id: string) => void;
  onVerComprovante?: (id: string) => void;
  onReemitir?: (id: string) => void;
}

type MenuItem = {
  key: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
};

export function FaturaRowActionsMenu({
  fatura,
  variant = "cliente",
  onVisualizar,
  onGerarPdf,
  onCancelar,
  onMarcarPago,
  onEditarPagamento,
  onMarcarPendente,
  onVerComprovante,
  onReemitir,
}: FaturaRowActionsMenuProps) {
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
    {
      key: "visualizar",
      label: "Visualizar",
      onClick: () => onVisualizar(fatura.id),
    },
  ];

  if (fatura.status === "cancelada" && onReemitir) {
    items.push({
      key: "reemitir",
      label: "Emitir novamente",
      onClick: () => onReemitir(fatura.id),
    });
  }

  if (fatura.status === "necessita_reemissao" && onReemitir) {
    items.push({
      key: "reemitir",
      label: "Reemitir fatura",
      onClick: () => onReemitir(fatura.id),
    });
  }

  if (faturaStatusEmissaoAtiva(fatura.status)) {
    items.push({
      key: "pdf",
      label: "Gerar PDF",
      onClick: () => onGerarPdf(fatura.id),
    });
  }

  if (faturaStatusEmissaoAtiva(fatura.status)) {
    if (fatura.pago) {
      if (fatura.comprovante_pagamento_path && onVerComprovante) {
        items.push({
          key: "ver-comprovante",
          label: "Ver comprovante",
          onClick: () => onVerComprovante(fatura.id),
        });
      }
      items.push({
        key: "editar-pagamento",
        label: "Editar pagamento",
        onClick: () => onEditarPagamento(fatura.id),
      });
      items.push({
        key: "marcar-pendente",
        label: "Marcar como pendente",
        danger: true,
        onClick: () => onMarcarPendente(fatura.id),
      });
    } else {
      items.push({
        key: "marcar-pago",
        label:
          variant === "clinica"
            ? CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO
            : "Marcar como pago",
        onClick: () => onMarcarPago(fatura.id),
      });
    }
  }

  if (faturaStatusHistoricoReemissao(fatura.status)) {
    items.push({
      key: "pdf",
      label: "Gerar PDF",
      onClick: () => onGerarPdf(fatura.id),
    });
  }

  if (
    fatura.status !== "cancelada" &&
    !faturaStatusHistoricoReemissao(fatura.status) &&
    fatura.status !== "necessita_reemissao" &&
    variant === "cliente"
  ) {
    items.push({
      key: "cancelar",
      label: "Cancelar fatura",
      danger: true,
      onClick: () => onCancelar(fatura.id),
    });
  }

  function handleAction(item: MenuItem) {
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
