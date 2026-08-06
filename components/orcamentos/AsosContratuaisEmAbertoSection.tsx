"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import type { ContratoCreditoAsoRecord } from "@/lib/contrato-creditos-aso";

interface AsosContratuaisEmAbertoSectionProps {
  creditos: ContratoCreditoAsoRecord[];
  numeroContrato: string | null;
  onEditarObservacao: (credito: ContratoCreditoAsoRecord) => void;
  onRemover: (credito: ContratoCreditoAsoRecord) => void;
}

export function AsosContratuaisEmAbertoSection({
  creditos,
  numeroContrato,
  onEditarObservacao,
  onRemover,
}: AsosContratuaisEmAbertoSectionProps) {
  const disponiveis = creditos.filter((c) => c.status === "disponivel");
  if (disponiveis.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
      <div className="border-b border-[#eef2f7] px-4 py-3">
        <h3 className="text-sm font-extrabold text-navy">
          ASOs disponíveis para uso futuro
        </h3>
        <p className="mt-0.5 text-xs text-[#64748b]">
          Créditos do contrato ainda sem colaborador definido, disponíveis para
          utilização durante a vigência.
        </p>
        <p className="mt-2 text-xs font-semibold text-navy">
          ASOs disponíveis: {disponiveis.length}
          {numeroContrato ? ` · Contrato: ${numeroContrato}` : ""}
        </p>
      </div>
      <ul className="divide-y divide-[#f1f5f9]">
        {disponiveis.map((c) => (
          <li key={c.id} className="px-4 py-3">
            <p className="text-sm font-extrabold text-navy">
              ASO contratual disponível
            </p>
            <div className="mt-2 grid gap-1 text-xs text-[#64748b] sm:grid-cols-2">
              <p>
                <span className="font-bold text-navy">Contrato:</span>{" "}
                {numeroContrato || "—"}
              </p>
              <p>
                <span className="font-bold text-navy">Válidos até:</span>{" "}
                {c.valido_ate ? formatDateIsoToBR(c.valido_ate) : "—"}
              </p>
              <p>
                <span className="font-bold text-navy">Status:</span> Disponíveis
                para uso
              </p>
              <p>
                <span className="font-bold text-navy">Colaborador:</span>{" "}
                {c.colaborador?.trim() || "Ainda não definido"}
              </p>
              {c.observacao ? (
                <p className="sm:col-span-2">
                  <span className="font-bold text-navy">Observação:</span>{" "}
                  {c.observacao}
                </p>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="text-[11px] font-semibold text-brand-blue hover:underline"
                onClick={() => onEditarObservacao(c)}
              >
                Editar observação
              </button>
              <button
                type="button"
                className="text-[11px] font-semibold text-brand-red hover:underline"
                onClick={() => onRemover(c)}
              >
                Remover classificação
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
