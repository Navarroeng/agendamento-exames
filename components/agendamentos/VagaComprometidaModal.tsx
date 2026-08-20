"use client";

import type { ContratoVagaRecord } from "@/lib/contrato-vagas";
import { formatCPF } from "@/lib/cpf";

type VagaComContrato = ContratoVagaRecord & {
  contrato_numero: string | null;
};

interface VagaComprometidaModalProps {
  open: boolean;
  clienteNome: string;
  vaga: VagaComContrato | null;
  saving?: boolean;
  onNaoVincular: () => void;
  onVincular: () => void;
}

export function VagaComprometidaModal({
  open,
  clienteNome,
  vaga,
  saving = false,
  onNaoVincular,
  onVincular,
}: VagaComprometidaModalProps) {
  if (!open || !vaga) return null;

  const numero = vaga.contrato_numero || "—";
  const nome = vaga.colaborador?.trim() || "Funcionário";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-lg rounded-2xl border border-[#e4ebf4] bg-white p-5 shadow-xl"
      >
        <h2 className="text-base font-extrabold text-navy">
          Funcionário já vinculado ao contrato
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#475569]">
          <strong className="text-navy">{nome}</strong> já está vinculado
          {clienteNome ? (
            <>
              {" "}
              à empresa <strong className="text-navy">{clienteNome}</strong>
            </>
          ) : null}{" "}
          no contrato <strong className="text-navy">{numero}</strong> e possui
          uma vaga contratada ainda não agendada.
        </p>
        <div className="mt-3 rounded-xl border border-[#e4ebf4] bg-[#f8fafc] px-3 py-2 text-xs text-[#475569]">
          <p>
            <span className="font-bold text-navy">CPF:</span>{" "}
            {formatCPF(vaga.colaborador_cpf)}
          </p>
          <p className="mt-1">
            <span className="font-bold text-navy">Cargo:</span>{" "}
            {vaga.cargo_nome?.trim() || "—"}
          </p>
        </div>
        <p className="mt-3 text-sm text-[#475569]">
          Deseja vincular este agendamento à vaga contratada?
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn btn-muted"
            disabled={saving}
            onClick={onNaoVincular}
          >
            Continuar sem vincular
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={onVincular}
          >
            Vincular este agendamento à vaga contratada
          </button>
        </div>
      </div>
    </div>
  );
}
