"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import type { ContratoCreditoAsoRecord } from "@/lib/contrato-creditos-aso";

type CreditoComContrato = ContratoCreditoAsoRecord & {
  contrato_numero: string | null;
  contrato_data_inicio: string | null;
  contrato_data_fim: string | null;
};

interface CreditoAsoDisponivelModalProps {
  open: boolean;
  clienteNome: string;
  creditos: CreditoComContrato[];
  selectedId: string | null;
  onSelectId: (id: string) => void;
  onNaoUtilizar: () => void;
  onUtilizar: () => void;
}

export function CreditoAsoDisponivelModal({
  open,
  clienteNome,
  creditos,
  selectedId,
  onSelectId,
  onNaoUtilizar,
  onUtilizar,
}: CreditoAsoDisponivelModalProps) {
  if (!open || creditos.length === 0) return null;

  const multiplo = creditos.length > 1;
  const unico = creditos[0];
  const selecionado =
    creditos.find((c) => c.id === selectedId) ?? (multiplo ? null : unico);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-lg rounded-2xl border border-[#e4ebf4] bg-white p-5 shadow-xl"
      >
        <h2 className="text-base font-extrabold text-navy">
          ASO contratual disponível
        </h2>

        {!multiplo ? (
          <p className="mt-3 text-sm leading-relaxed text-[#475569]">
            A empresa <strong className="text-navy">{clienteNome}</strong> possui{" "}
            {creditos.length} ASO disponível no contrato{" "}
            <strong className="text-navy">
              {unico.contrato_numero || "—"}
            </strong>
            .
            <br />
            Este ASO pode ser utilizado sem cobrança adicional
            {unico.valido_ate
              ? ` até ${formatDateIsoToBR(unico.valido_ate)}`
              : ""}
            .
            <br />
            <br />
            Deseja utilizar este crédito contratual no novo agendamento?
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[#475569]">
              A empresa <strong className="text-navy">{clienteNome}</strong>{" "}
              possui mais de um ASO contratual disponível. Selecione qual
              utilizar:
            </p>
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {creditos.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#e8edf5] px-3 py-2.5 text-xs hover:border-brand-blue/40">
                    <input
                      type="radio"
                      className="mt-0.5 accent-brand-blue"
                      name="credito-aso"
                      checked={selectedId === c.id}
                      onChange={() => onSelectId(c.id)}
                    />
                    <span>
                      <span className="font-extrabold text-navy">
                        {c.contrato_numero || "Contrato"}
                      </span>
                      <br />
                      Quantidade disponível: 1
                      <br />
                      Vigência:{" "}
                      {c.contrato_data_inicio
                        ? formatDateIsoToBR(c.contrato_data_inicio)
                        : "—"}{" "}
                      a{" "}
                      {c.valido_ate
                        ? formatDateIsoToBR(c.valido_ate)
                        : c.contrato_data_fim
                          ? formatDateIsoToBR(c.contrato_data_fim)
                          : "—"}
                      {c.observacao ? (
                        <>
                          <br />
                          Obs.: {c.observacao}
                        </>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn btn-muted text-xs"
            onClick={onNaoUtilizar}
          >
            Não utilizar neste agendamento
          </button>
          <button
            type="button"
            className="btn btn-primary text-xs"
            disabled={multiplo && !selecionado}
            onClick={onUtilizar}
          >
            Utilizar ASO do contrato
          </button>
        </div>
      </div>
    </div>
  );
}
