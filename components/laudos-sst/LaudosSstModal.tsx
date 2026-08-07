"use client";

import { Modal } from "@/components/ui/Modal";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  LAUDOS_SST_ETAPAS,
  type LaudosSstEtapaId,
  type LaudosSstProcesso,
} from "@/lib/laudos-sst";

interface LaudosSstModalProps {
  open: boolean;
  processo: LaudosSstProcesso | null;
  tab: LaudosSstEtapaId;
  onTabChange: (tab: LaudosSstEtapaId) => void;
  onClose: () => void;
}

export function LaudosSstModal({
  open,
  processo,
  tab,
  onTabChange,
  onClose,
}: LaudosSstModalProps) {
  if (!open || !processo) return null;

  const { orcamento, numeroContrato } = processo.implantacao;
  const etapaAtual = LAUDOS_SST_ETAPAS.find((e) => e.id === tab);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Laudos SST · ${orcamento.numero}`}
      subtitle={`${formatClienteNomeDisplay(orcamento.cliente_nome)}${
        numeroContrato ? ` · Contrato ${numeroContrato}` : ""
      } · ${processo.progressoLabel} etapas`}
      size="xl"
      footer={
        <div className="flex justify-end">
          <button type="button" className="btn justify-center sm:w-auto" onClick={onClose}>
            Fechar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {LAUDOS_SST_ETAPAS.map((etapa) => {
            const active = etapa.id === tab;
            return (
              <button
                key={etapa.id}
                type="button"
                onClick={() => onTabChange(etapa.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold transition ${
                  active
                    ? "bg-[#082b63] text-white shadow-sm"
                    : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                }`}
              >
                {etapa.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-5 py-10 text-center">
          <p className="text-sm font-extrabold text-navy">
            {etapaAtual?.label ?? "Etapa"}
          </p>
          <p className="mt-2 text-sm text-app-muted">
            Conteúdo desta etapa será configurado posteriormente.
          </p>
        </div>
      </div>
    </Modal>
  );
}
