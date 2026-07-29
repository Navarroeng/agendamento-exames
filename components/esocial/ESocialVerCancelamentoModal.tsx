"use client";

import { Modal } from "@/components/ui/Modal";
import { formatDateBR } from "@/lib/format";
import { formatDateTimeBR } from "@/lib/format-datetime";
import {
  ESOCIAL_VISUAL_STATUS_LABELS,
  type ESocialVisualStatus,
} from "@/lib/esocial-filters";
import { formatEsocialReciboForDisplay } from "@/lib/esocial-recibo";
import type { AgendamentoWithExames } from "@/lib/types";

interface ESocialVerCancelamentoModalProps {
  open: boolean;
  agendamento: AgendamentoWithExames | null;
  onClose: () => void;
}

function labelStatusAnterior(value: string | null | undefined): string {
  if (!value) return "—";
  const known = value as ESocialVisualStatus;
  return ESOCIAL_VISUAL_STATUS_LABELS[known] ?? value;
}

export function ESocialVerCancelamentoModal({
  open,
  agendamento,
  onClose,
}: ESocialVerCancelamentoModalProps) {
  if (!agendamento) return null;

  const canceladoEm = agendamento.esocial_cancelado_em
    ? formatDateTimeBR(agendamento.esocial_cancelado_em)
    : "—";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancelamento do envio ao eSocial"
      subtitle={`${agendamento.colaborador} · ${agendamento.cliente_nome}`}
      footer={
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <InfoRow
          label="Motivo"
          value={agendamento.esocial_motivo_cancelamento?.trim() || "—"}
        />
        <InfoRow
          label="Cancelado por"
          value={agendamento.esocial_cancelado_por?.trim() || "—"}
        />
        <InfoRow label="Data e hora" value={canceladoEm} />
        <InfoRow
          label="Status anterior"
          value={labelStatusAnterior(agendamento.esocial_status_anterior)}
        />
        <InfoRow
          label="Data de envio (preservada)"
          value={
            agendamento.data_envio_esocial
              ? formatDateBR(agendamento.data_envio_esocial)
              : "—"
          }
        />
        <InfoRow
          label="Nº Recibo (preservado)"
          value={
            formatEsocialReciboForDisplay(agendamento.esocial_recibo) || "—"
          }
        />
      </div>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap font-medium text-navy">{value}</p>
    </div>
  );
}
