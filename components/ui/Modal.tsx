"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalSize =
  | "default"
  | "wide"
  | "extraWide"
  | "xl"
  | "xxl"
  /** Viewer A4 — ~95vw × 95vh; o documento interno define o tamanho real. */
  | "viewport";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  extraWide?: boolean;
  /** Largura premium (~1320px) para formulários grandes. `xxl` ~1480px. */
  size?: ModalSize;
  headerActions?: ReactNode;
  /** Quando false, clique no overlay não fecha (útil com formulário dirty). */
  closeOnOverlayClick?: boolean;
}

function resolveWidthClass(
  size: ModalSize | undefined,
  wide: boolean,
  extraWide: boolean
): string {
  if (size === "viewport") return "w-[95vw] max-w-[95vw]";
  if (size === "xxl") return "max-w-[1480px]";
  if (size === "xl") return "max-w-[1320px]";
  if (size === "extraWide" || extraWide) return "max-w-5xl";
  if (size === "wide" || wide) return "max-w-3xl";
  return "max-w-2xl";
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
  extraWide = false,
  size,
  headerActions,
  closeOnOverlayClick = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const widthClass = resolveWidthClass(size, wide, extraWide);
  const isViewport = size === "viewport";
  const heightClass = isViewport ? "h-[95vh] max-h-[95vh]" : "max-h-[90vh]";
  const bodyPadClass = isViewport ? "p-0" : "p-4 sm:p-6";

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center riscos-relatorio-print-shell ${isViewport ? "p-2 sm:p-3" : "p-3 sm:p-4"}`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px] riscos-relatorio-print-hide"
        onClick={() => {
          if (closeOnOverlayClick) onClose();
        }}
        aria-label="Fechar"
      />
      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-app-line bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)] riscos-relatorio-print-dialog ${heightClass} ${widthClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-app-line bg-gradient-to-b from-white to-[#fbfcff] px-5 py-4 sm:gap-4 sm:px-6 sm:py-5 riscos-relatorio-print-hide">
          <div className="min-w-0 flex-1">
            <h3
              id="modal-title"
              className="text-lg font-extrabold tracking-[-0.2px] text-navy sm:text-xl"
            >
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-1 text-sm text-app-muted">{subtitle}</p>
            ) : null}
            {headerActions ? (
              <div className="mt-2.5 sm:hidden">{headerActions}</div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-start gap-2">
            {headerActions ? (
              <div className="hidden sm:block">{headerActions}</div>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-app-line text-lg text-app-muted transition-colors hover:bg-brand-blue-soft hover:text-brand-blue"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden riscos-relatorio-print-body ${bodyPadClass}`}
        >
          {children}
        </div>
        {footer ? (
          <div className="pointer-events-auto shrink-0 border-t border-app-line bg-white px-4 py-3 sm:px-6 sm:py-4 riscos-relatorio-print-hide">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
