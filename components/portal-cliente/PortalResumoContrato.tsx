"use client";

import type {
  PortalContratoBadgeTone,
  PortalContratoResumo,
} from "@/lib/portal-contrato";

export function PortalResumoContrato({
  contrato,
}: {
  contrato: PortalContratoResumo;
}) {
  const campos: {
    label: string;
    valor: string;
    tone?: PortalContratoBadgeTone;
  }[] = [
    {
      label: contrato.vigenciaTitulo,
      valor: contrato.vigenciaResumoLabel,
    },
    {
      label: "Colaboradores contratados",
      valor: contrato.colaboradoresContratadosLabel,
    },
    {
      label: "Procuração",
      valor: contrato.procuracaoLabel,
      tone: contrato.procuracaoTone,
    },
    {
      label: "Agendamento",
      valor: contrato.agendamentoLabel,
      tone: contrato.agendamentoTone,
    },
  ];

  return (
    <dl className="grid grid-cols-1 gap-px border-t border-[#eef2f7] bg-[#eef2f7] sm:grid-cols-2 xl:grid-cols-4">
      {campos.map((campo) => (
        <div
          key={campo.label}
          className="flex flex-col justify-center gap-1 bg-white px-5 py-3.5"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
            {campo.label}
          </dt>
          <dd>
            {campo.tone ? (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass(campo.tone)}`}
              >
                {campo.valor}
              </span>
            ) : (
              <span className="text-sm font-semibold text-[#0b1f4d]">
                {campo.valor}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function badgeClass(tone: PortalContratoBadgeTone): string {
  if (tone === "ok") {
    return "bg-[#f0fdf4] text-[#15803d]";
  }
  if (tone === "pendente") {
    return "bg-[#fffbeb] text-[#b45309]";
  }
  if (tone === "bloqueio") {
    return "bg-[#fff5f5] text-[#dc2626]";
  }
  return "bg-[#f8fafc] text-[#64748b]";
}
