import { useMemo } from "react";
import { formatCurrency } from "@/lib/money";
import type { AgendamentoWithExames } from "@/lib/types";
import { IconFlask, SectionHeading } from "./ViewModalUi";

interface ViewModalExamsSectionProps {
  agendamento: AgendamentoWithExames;
}

const TH =
  "border-b border-[#eef2f7] bg-[#f8fafc] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#64748b] whitespace-nowrap";
const TD =
  "border-b border-[#eef2f7] px-2.5 py-2 align-middle text-xs text-[#1f2937]";

export function ViewModalExamsSection({
  agendamento,
}: ViewModalExamsSectionProps) {
  const exames = agendamento.agendamento_exames ?? [];
  const clinicaNome = agendamento.clinica_nome;

  const totals = useMemo(() => {
    let totalCliente = 0;
    let totalCusto = 0;

    (agendamento.agendamento_exames ?? []).forEach((exam) => {
      totalCliente += Number(exam.valor_cliente);
      totalCusto += Number(exam.custo_clinica);
    });

    return {
      totalCliente,
      totalCusto,
      totalLucro: totalCliente - totalCusto,
    };
  }, [agendamento.agendamento_exames]);

  return (
    <section>
      <SectionHeading
        icon={<IconFlask />}
        iconBg="bg-[#5b4acb]"
        title="Exames agendados"
      />

      {exames.length === 0 ? (
        <p className="text-sm text-[#8b95a8]">Nenhum exame vinculado.</p>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-[#e8edf5] bg-white">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className={`${TH} w-10 text-center`}>Nº</th>
                <th className={TH}>Exame</th>
                <th className={TH}>Clínica</th>
                <th className={TH}>Valor cliente</th>
                <th className={TH}>Custo clínica</th>
                <th className={TH}>Lucro</th>
              </tr>
            </thead>
            <tbody>
              {exames.map((exam, index) => {
                const valor = Number(exam.valor_cliente);
                const custo = Number(exam.custo_clinica);
                const lucro = valor - custo;

                return (
                  <tr
                    key={exam.id}
                    className="transition-colors hover:bg-[#fafbff]"
                  >
                    <td className={`${TD} text-center font-medium text-[#64748b]`}>
                      {index + 1}
                    </td>
                    <td className={`${TD} font-semibold text-navy`}>
                      {exam.tipo_exame}
                    </td>
                    <td
                      className={`${TD} max-w-[140px] truncate text-[#475569]`}
                      title={clinicaNome}
                    >
                      {clinicaNome}
                    </td>
                    <td className={`${TD} whitespace-nowrap font-semibold text-brand-blue`}>
                      {formatCurrency(valor)}
                    </td>
                    <td className={`${TD} whitespace-nowrap font-semibold text-[#c96d00]`}>
                      {formatCurrency(custo)}
                    </td>
                    <td className={`${TD} whitespace-nowrap font-semibold text-brand-green`}>
                      {formatCurrency(lucro)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#eef2f7] bg-[#f8fafc]">
                <td
                  colSpan={3}
                  className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]"
                >
                  Totais
                </td>
                <td className="px-2.5 py-2">
                  <span className="mb-px block text-[9px] font-medium uppercase tracking-wide text-[#94a3b8]">
                    Cliente
                  </span>
                  <strong className="text-xs font-bold text-brand-blue">
                    {formatCurrency(totals.totalCliente)}
                  </strong>
                </td>
                <td className="px-2.5 py-2">
                  <span className="mb-px block text-[9px] font-medium uppercase tracking-wide text-[#94a3b8]">
                    Custo
                  </span>
                  <strong className="text-xs font-bold text-[#c96d00]">
                    {formatCurrency(totals.totalCusto)}
                  </strong>
                </td>
                <td className="px-2.5 py-2">
                  <span className="mb-px block text-[9px] font-medium uppercase tracking-wide text-[#94a3b8]">
                    Lucro
                  </span>
                  <strong className="text-xs font-bold text-brand-green">
                    {formatCurrency(totals.totalLucro)}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
