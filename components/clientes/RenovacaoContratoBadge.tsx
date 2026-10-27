import { labelRenovacaoContratoListagem } from "@/lib/contrato-navarro";

export function RenovacaoContratoBadge({
  renovacaoAutomatica,
}: {
  renovacaoAutomatica?: boolean | null;
}) {
  const label = labelRenovacaoContratoListagem(renovacaoAutomatica);
  if (label === "—") {
    return <span className="text-xs font-semibold text-[#8b95a8]">—</span>;
  }
  const automatica = label === "Automática";
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold leading-tight ${
        automatica
          ? "bg-brand-blue-soft text-brand-blue"
          : "bg-[#f3efe6] text-[#8a6232]"
      }`}
    >
      {label}
    </span>
  );
}
