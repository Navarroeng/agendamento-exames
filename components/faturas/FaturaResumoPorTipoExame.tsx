import { buildResumoPorTipoExame } from "@/lib/fatura-mappers";
import { formatCurrency } from "@/lib/money";
import type { FaturaItemInsert } from "@/lib/types";

interface FaturaResumoPorTipoExameProps {
  itens: FaturaItemInsert[];
}

export function FaturaResumoPorTipoExame({
  itens,
}: FaturaResumoPorTipoExameProps) {
  const resumo = buildResumoPorTipoExame(itens);
  const totalExames = itens.length;
  const totalValor = itens.reduce(
    (sum, i) => sum + Number(i.valor_unitario),
    0
  );

  if (resumo.length === 0) return null;

  return (
    <div className="border-t border-[#eef2f7] px-5 py-4">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-navy">
          Resumo por tipo de exame
        </p>
        <div className="mt-1 h-0.5 w-16 rounded-full bg-[#c9972b]" />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#082b63] text-[10px] font-bold uppercase tracking-wide text-white">
              <th className="px-3 py-2.5">Tipo de exame</th>
              <th className="px-3 py-2.5 text-center">Qtd. de exames</th>
              <th className="px-3 py-2.5 text-right">Total de custo (R$)</th>
            </tr>
          </thead>
          <tbody>
            {resumo.map((row, idx) => (
              <tr
                key={row.tipo}
                className={idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}
              >
                <td className="border-b border-[#eef2f7] px-3 py-2 text-[11px] font-medium text-[#334155]">
                  {row.tipo}
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-2 text-center text-[11px] text-[#334155]">
                  {row.qtd}
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-2 text-right text-[11px] font-semibold text-navy">
                  {formatCurrency(row.total)}
                </td>
              </tr>
            ))}
            <tr className="bg-[#f0f4ff]">
              <td className="px-3 py-2.5 text-[11px] font-bold text-navy">
                Total geral
              </td>
              <td className="px-3 py-2.5 text-center text-[11px] font-bold text-navy">
                {totalExames}
              </td>
              <td className="px-3 py-2.5 text-right text-[11px] font-bold text-navy">
                {formatCurrency(totalValor)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
