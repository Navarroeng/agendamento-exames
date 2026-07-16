"use client";

import { useEffect, useRef, useState } from "react";
import {
  CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO,
  CUSTOS_CLINICA_ACAO_REABRIR,
  CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO,
  CUSTOS_CLINICA_ACAO_VER_FATURA,
} from "@/lib/custos-clinicas-conferencia";
import type { FaturaMesRow } from "@/lib/fatura-mes-resumo";
import { canReemitirFaturaCliente } from "@/lib/fatura-reemissao";
import type { FaturaRecord, FaturaTipo } from "@/lib/types";
import { FaturaRowActionsMenu } from "./FaturaRowActionsMenu";

interface FaturasMesRowActionsProps {
  variant: FaturaTipo;
  row: FaturaMesRow;
  saving: boolean;
  onVisualizarAgendamentos: (referenciaNome: string) => void;
  onEmitir: (referenciaNome: string) => void;
  onVisualizarFatura: (id: string) => void;
  onGerarPdf: (id: string) => void;
  onCancelar: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onEditarPagamento: (id: string) => void;
  onMarcarPendente: (id: string) => void;
  onVerComprovante?: (id: string) => void;
  onVerFaturaClinica?: (id: string) => void;
  onReemitir?: (id: string) => void;
  onReabrirConferencia?: (id: string) => void;
}

const EMIT_LABEL: Record<FaturaTipo, string> = {
  cliente: "Emitir fatura",
  clinica: CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO,
};

type MenuItem = {
  key: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
};

export function FaturasMesRowActions({
  variant,
  row,
  saving,
  onVisualizarAgendamentos,
  onEmitir,
  onVisualizarFatura,
  onGerarPdf,
  onCancelar,
  onMarcarPago,
  onEditarPagamento,
  onMarcarPendente,
  onVerComprovante,
  onReemitir,
  onReabrirConferencia,
  onVerFaturaClinica,
}: FaturasMesRowActionsProps) {
  const fatura = row.fatura;

  if (
    variant === "clinica" &&
    fatura &&
    fatura.status === "emitida" &&
    !(fatura.pago ?? false)
  ) {
    return (
      <ClinicaConferidoActionsMenu
        referenciaNome={row.referenciaNome}
        saving={saving}
        temFaturaClinica={Boolean(fatura.fatura_clinica_path?.trim())}
        onVisualizar={() => onVisualizarFatura(fatura.id)}
        onVerFaturaClinica={() => onVerFaturaClinica?.(fatura.id)}
        onRegistrarPagamento={() => onMarcarPago(fatura.id)}
        onReabrirConferencia={() => onReabrirConferencia?.(fatura.id)}
      />
    );
  }

  if (
    variant === "clinica" &&
    fatura &&
    fatura.status === "rascunho"
  ) {
    return (
      <AbertaEmissaoActionsMenu
        referenciaNome={row.referenciaNome}
        emitLabel={CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO}
        saving={saving}
        onVisualizar={() => onVisualizarFatura(fatura.id)}
        onEmitir={() => onEmitir(row.referenciaNome)}
      />
    );
  }

  if (
    fatura &&
    variant === "cliente" &&
    canReemitirFaturaCliente(fatura)
  ) {
    return (
      <CanceladaClienteActionsMenu
        referenciaNome={row.referenciaNome}
        saving={saving}
        onVisualizar={() => onVisualizarFatura(fatura.id)}
        onReemitir={() => onReemitir?.(fatura.id)}
        reemitirLabel="Reemitir fatura"
      />
    );
  }

  if (fatura) {
    const faturaComPagamento: FaturaRecord = {
      ...fatura,
      pago: fatura.pago ?? false,
    };

    return (
      <FaturaRowActionsMenu
        fatura={faturaComPagamento}
        variant={variant}
        onVisualizar={onVisualizarFatura}
        onGerarPdf={onGerarPdf}
        onCancelar={onCancelar}
        onMarcarPago={onMarcarPago}
        onEditarPagamento={onEditarPagamento}
        onMarcarPendente={onMarcarPendente}
        onVerComprovante={onVerComprovante}
        onReemitir={onReemitir}
      />
    );
  }

  return (
    <AbertaEmissaoActionsMenu
      referenciaNome={row.referenciaNome}
      emitLabel={EMIT_LABEL[variant]}
      saving={saving}
      onVisualizar={() => onVisualizarAgendamentos(row.referenciaNome)}
      onEmitir={() => onEmitir(row.referenciaNome)}
    />
  );
}

function ClinicaConferidoActionsMenu({
  referenciaNome,
  saving,
  temFaturaClinica,
  onVisualizar,
  onVerFaturaClinica,
  onRegistrarPagamento,
  onReabrirConferencia,
}: {
  referenciaNome: string;
  saving: boolean;
  temFaturaClinica: boolean;
  onVisualizar: () => void;
  onVerFaturaClinica: () => void;
  onRegistrarPagamento: () => void;
  onReabrirConferencia: () => void;
}) {
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
    { key: "visualizar", label: "Visualizar", onClick: onVisualizar },
    ...(temFaturaClinica
      ? [
          {
            key: "ver-fatura",
            label: CUSTOS_CLINICA_ACAO_VER_FATURA,
            onClick: onVerFaturaClinica,
          },
        ]
      : []),
    {
      key: "registrar-pagamento",
      label: CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO,
      onClick: onRegistrarPagamento,
    },
    {
      key: "reabrir",
      label: CUSTOS_CLINICA_ACAO_REABRIR,
      onClick: onReabrirConferencia,
    },
  ];

  function handleAction(item: MenuItem) {
    setOpen(false);
    item.onClick();
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        disabled={saving}
        onClick={() => setOpen((prev) => !prev)}
        className={`grid h-7 w-7 place-items-center rounded-[8px] border text-base font-bold leading-none transition-all duration-150 disabled:opacity-50 ${
          open
            ? "border-brand-blue/30 bg-brand-blue-soft text-brand-blue"
            : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-navy"
        }`}
        aria-label={`Ações — ${referenciaNome}`}
        aria-expanded={open}
      >
        ⋯
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[176px] origin-top-right overflow-hidden rounded-[10px] border border-[#e8edf5] bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)] animate-[fadeIn_0.15s_ease]"
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => handleAction(item)}
              className="block w-full px-3 py-1.5 text-left text-[11px] font-medium text-[#475569] transition-colors hover:bg-[#f0f4ff] hover:text-brand-blue"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CanceladaClienteActionsMenu({
  referenciaNome,
  saving,
  onVisualizar,
  onReemitir,
  reemitirLabel = "Emitir novamente",
}: {
  referenciaNome: string;
  saving: boolean;
  onVisualizar: () => void;
  onReemitir: () => void;
  reemitirLabel?: string;
}) {
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
    { key: "visualizar", label: "Visualizar", onClick: onVisualizar },
    { key: "reemitir", label: reemitirLabel, onClick: onReemitir },
  ];

  function handleAction(item: MenuItem) {
    setOpen(false);
    item.onClick();
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        disabled={saving}
        onClick={() => setOpen((prev) => !prev)}
        className={`grid h-7 w-7 place-items-center rounded-[8px] border text-base font-bold leading-none transition-all duration-150 disabled:opacity-50 ${
          open
            ? "border-brand-blue/30 bg-brand-blue-soft text-brand-blue"
            : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-navy"
        }`}
        aria-label={`Ações — ${referenciaNome}`}
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
              className="block w-full px-3 py-1.5 text-left text-[11px] font-medium text-[#475569] transition-colors hover:bg-[#f0f4ff] hover:text-brand-blue"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AbertaEmissaoActionsMenu({
  referenciaNome,
  emitLabel,
  saving,
  onVisualizar,
  onEmitir,
}: {
  referenciaNome: string;
  emitLabel: string;
  saving: boolean;
  onVisualizar: () => void;
  onEmitir: () => void;
}) {
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
    { key: "visualizar", label: "Visualizar", onClick: onVisualizar },
    { key: "emitir", label: emitLabel, onClick: onEmitir },
  ];

  function handleAction(item: MenuItem) {
    setOpen(false);
    item.onClick();
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        disabled={saving}
        onClick={() => setOpen((prev) => !prev)}
        className={`grid h-7 w-7 place-items-center rounded-[8px] border text-base font-bold leading-none transition-all duration-150 disabled:opacity-50 ${
          open
            ? "border-brand-blue/30 bg-brand-blue-soft text-brand-blue"
            : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-navy"
        }`}
        aria-label={`Ações — ${referenciaNome}`}
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
              className="block w-full px-3 py-1.5 text-left text-[11px] font-medium text-[#475569] transition-colors hover:bg-[#f0f4ff] hover:text-brand-blue"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
