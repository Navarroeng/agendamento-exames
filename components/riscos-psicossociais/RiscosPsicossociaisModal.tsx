"use client";

import { Modal } from "@/components/ui/Modal";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  RISCOS_PSICOSSOCIAIS_ETAPAS,
  type RiscosPsicossociaisEtapaId,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";

interface RiscosPsicossociaisModalProps {
  open: boolean;
  processo: RiscosPsicossociaisProcesso | null;
  tab: RiscosPsicossociaisEtapaId;
  onTabChange: (tab: RiscosPsicossociaisEtapaId) => void;
  onClose: () => void;
}

export function RiscosPsicossociaisModal({
  open,
  processo,
  tab,
  onTabChange,
  onClose,
}: RiscosPsicossociaisModalProps) {
  if (!open || !processo) return null;

  const { orcamento, numeroContrato } = processo.implantacao;
  const etapaAtual = RISCOS_PSICOSSOCIAIS_ETAPAS.find((e) => e.id === tab);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Riscos Psicossociais · ${orcamento.numero}`}
      subtitle={`${formatClienteNomeDisplay(orcamento.cliente_nome)}${
        numeroContrato ? ` · Contrato ${numeroContrato}` : ""
      } · ${processo.progressoLabel} etapas`}
      size="xl"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {RISCOS_PSICOSSOCIAIS_ETAPAS.map((etapa) => {
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
