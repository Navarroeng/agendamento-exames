import { SELO_PAGAMENTO_A_VISTA } from "@/lib/clinica-condicao-pagamento";

export function SeloPagamentoAvista({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full bg-[#fff7ed] px-2.5 py-1 text-[11px] font-extrabold text-[#c2410c] ${className}`}
    >
      {SELO_PAGAMENTO_A_VISTA}
    </span>
  );
}
