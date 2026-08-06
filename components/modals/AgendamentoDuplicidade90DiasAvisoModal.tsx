"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  AGENDAMENTO_DUPLICIDADE_90_DIAS_AVISO_COMPLEMENTO,
  AGENDAMENTO_DUPLICIDADE_90_DIAS_AVISO_MSG,
  isRecontratacaoDemissionalAdmissional,
} from "@/lib/agendamento-duplicidade-90dias";
import { formatCPF } from "@/lib/cpf";
import type { AgendamentoDuplicidade90DiasInfo } from "@/services/duplicidade.service";

interface AgendamentoDuplicidade90DiasAvisoModalProps {
  open: boolean;
  agendamento: AgendamentoDuplicidade90DiasInfo | null;
  tipoAsoNovo: string;
  dataNovaIso: string | null;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function statusLabel(status: string): string {
  if (status === "agendado") return "Agendado";
  if (status === "aso_retido") return "ASO Retido";
  if (status === "rascunho") return "Rascunho";
  if (status === "cancelado") return "Cancelado";
  return status;
}

export function AgendamentoDuplicidade90DiasAvisoModal({
  open,
  agendamento,
  tipoAsoNovo,
  dataNovaIso,
  confirming = false,
  onCancel,
  onConfirm,
}: AgendamentoDuplicidade90DiasAvisoModalProps) {
  if (!open || !agendamento) return null;

  const recontratacao = isRecontratacaoDemissionalAdmissional(
    agendamento.tipo_aso,
    tipoAsoNovo
  );
  const dataNovaLabel = dataNovaIso ? formatDateIsoToBR(dataNovaIso) : "—";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Fechar"
        disabled={confirming}
      />

      <div
        className="animate-modal-in relative w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-90d-aviso-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fffbeb] to-white px-6 py-5">
          <h3
            id="dup-90d-aviso-title"
            className="text-lg font-extrabold text-[#2d2a4a]"
          >
            Agendamento recente encontrado
          </h3>
          {recontratacao ? (
            <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
              O colaborador possui um ASO Demissional recente para esta empresa.
              O novo ASO é Admissional, o que pode representar uma recontratação.
              Confirme se deseja prosseguir.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                {AGENDAMENTO_DUPLICIDADE_90_DIAS_AVISO_MSG}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                {AGENDAMENTO_DUPLICIDADE_90_DIAS_AVISO_COMPLEMENTO}
              </p>
            </>
          )}
        </div>

        <div className="space-y-2 px-6 py-5 text-sm">
          {[
            ["Empresa", agendamento.cliente_nome],
            ["Colaborador", agendamento.colaborador],
            ["CPF", formatCPF(agendamento.colaborador_cpf)],
            [
              "Data do agendamento existente",
              formatDateIsoToBR(agendamento.data_agendamento),
            ],
            ["Tipo do ASO existente", agendamento.tipo_aso || "—"],
            ["Status", statusLabel(agendamento.status)],
            ["Clínica", agendamento.clinica_nome || "—"],
            ["Novo tipo de ASO", tipoAsoNovo || "—"],
            ["Nova data pretendida", dataNovaLabel],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[160px_1fr] gap-3 border-b border-[#f1f5f9] py-2 last:border-0"
            >
              <span className="text-xs font-bold uppercase text-[#94a3b8]">
                {label}
              </span>
              <span className="font-semibold text-navy">{value}</span>
            </div>
          ))}

          <div className="mt-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-xs text-[#92400e]">
            <p>
              <span className="font-bold">ASO anterior:</span>{" "}
              {agendamento.tipo_aso || "—"} em{" "}
              {formatDateIsoToBR(agendamento.data_agendamento)}
            </p>
            <p className="mt-1">
              <span className="font-bold">Novo ASO:</span> {tipoAsoNovo || "—"}{" "}
              em {dataNovaLabel}
            </p>
          </div>

          <p className="pt-2 text-sm font-semibold text-navy">
            Deseja continuar com este novo agendamento?
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e8edf5] bg-[#f8fafc] px-6 py-4">
          <button
            type="button"
            className="btn btn-muted"
            disabled={confirming}
            onClick={onCancel}
          >
            Cancelar novo agendamento
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? "Confirmando..." : "Confirmar e continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
