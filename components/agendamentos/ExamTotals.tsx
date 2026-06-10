import { formatCurrency } from "@/lib/money";

interface ExamTotalsProps {
  totalCliente: number;
  totalCusto: number;
  totalLucro: number;
}

export function ExamTotals({
  totalCliente,
  totalCusto,
  totalLucro,
}: ExamTotalsProps) {
  return (
    <tfoot>
      <tr className="border-t border-[#eef2f7] bg-[#f8fafc]">
        <td className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
          Totais
        </td>
        <td className="px-2.5 py-2">
          <span className="mb-px block text-[9px] font-medium uppercase tracking-wide text-[#94a3b8]">
            Cliente
          </span>
          <strong className="text-xs font-bold text-navy">
            {formatCurrency(totalCliente)}
          </strong>
        </td>
        <td className="px-2.5 py-2">
          <span className="mb-px block text-[9px] font-medium uppercase tracking-wide text-[#94a3b8]">
            Custo
          </span>
          <strong className="text-xs font-bold text-navy">
            {formatCurrency(totalCusto)}
          </strong>
        </td>
        <td className="px-2.5 py-2">
          <span className="mb-px block text-[9px] font-medium uppercase tracking-wide text-[#94a3b8]">
            Lucro
          </span>
          <strong className="text-xs font-bold text-brand-green">
            {formatCurrency(totalLucro)}
          </strong>
        </td>
        <td colSpan={2} />
      </tr>
    </tfoot>
  );
}
