"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconUser } from "@/components/ui/icons/OutlineIcons";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { resolveValidadePropostaIso } from "@/lib/orcamento-validade";
import {
  ORCAMENTO_STATUS_BADGE,
  ORCAMENTO_STATUS_LABELS,
  formatOrcamentoOrigemCliente,
  type OrcamentoComItens,
  type ServicoSstRecord,
} from "@/lib/orcamento-types";
import { formatResponsavelOrcamentoDisplay } from "@/lib/orcamento-responsavel";
import { OrcamentoViewBody } from "./OrcamentoViewBody";

interface OrcamentoViewModalProps {
  orcamento: OrcamentoComItens | null;
  servicos: ServicoSstRecord[];
  onClose: () => void;
  onEditar?: (id: string) => void;
  onGerarPdf?: (id: string) => void;
  onAprovar?: (id: string) => void;
}

export function OrcamentoViewModal({
  orcamento,
  servicos,
  onClose,
  onEditar,
  onGerarPdf,
  onAprovar,
}: OrcamentoViewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!orcamento) return;

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
  }, [orcamento, onClose]);

  if (!orcamento || !mounted) return null;

  const badge = ORCAMENTO_STATUS_BADGE[orcamento.status];
  const validadeIso = resolveValidadePropostaIso(orcamento.data_proposta);
  const validadeLabel = validadeIso ? formatDateIsoToBR(validadeIso) : null;
  const podeEditar =
    Boolean(onEditar) &&
    orcamento.status !== "cancelado" &&
    orcamento.status !== "aprovado";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div
        className="relative z-10 flex max-h-[88vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-[#dbe3ef] bg-white shadow-[0_28px_70px_rgba(8,43,99,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orcamento-view-title"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-gradient-to-r from-[#082b63] via-[#0a3578] to-[#0c3f8c] px-5 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3
                  id="orcamento-view-title"
                  className="text-lg font-extrabold tracking-[-0.3px] sm:text-xl"
                >
                  Orçamento {orcamento.numero}
                </h3>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${badge.className}`}
                >
                  {ORCAMENTO_STATUS_LABELS[orcamento.status]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/80">
                <span>
                  Emissão:{" "}
                  <strong className="font-semibold text-white">
                    {formatDateIsoToBR(orcamento.data_proposta)}
                  </strong>
                </span>
                <span>
                  Responsável:{" "}
                  <strong className="font-semibold text-white">
                    {formatResponsavelOrcamentoDisplay(orcamento.responsavel)}
                  </strong>
                </span>
                <span>
                  Origem:{" "}
                  <strong className="font-semibold text-white">
                    {formatOrcamentoOrigemCliente(orcamento.origem_cliente)}
                  </strong>
                </span>
                {validadeLabel ? (
                  <span className="text-white/70">Válida até {validadeLabel}</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-lg text-white transition-colors hover:bg-white/20"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f7f9fc] p-4 sm:p-6">
          <OrcamentoViewBody orcamento={orcamento} servicos={servicos} />
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-[#e4ebf4] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="hidden items-center gap-2 text-[11px] text-[#94a3b8] sm:flex">
            <IconUser size={14} />
            <span>
              {formatResponsavelOrcamentoDisplay(orcamento.responsavel)}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn justify-center sm:w-auto"
              onClick={onClose}
            >
              Fechar
            </button>
            {podeEditar ? (
              <button
                type="button"
                className="btn justify-center sm:w-auto"
                onClick={() => {
                  onClose();
                  onEditar?.(orcamento.id);
                }}
              >
                Editar
              </button>
            ) : null}
            {onGerarPdf ? (
              <button
                type="button"
                className="btn justify-center sm:w-auto"
                onClick={() => onGerarPdf(orcamento.id)}
              >
                Gerar PDF
              </button>
            ) : null}
            {onAprovar ? (
              <button
                type="button"
                className="btn btn-primary justify-center sm:w-auto"
                onClick={() => {
                  onClose();
                  onAprovar(orcamento.id);
                }}
              >
                {orcamento.status === "aprovado"
                  ? "Ver aprovação"
                  : "Aprovar"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
