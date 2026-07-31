import {
  clienteContratoBadgeClassExibicao,
  formatValorContrato,
  labelAgendamentoContrato,
  labelClienteContratoStatusExibicao,
  labelFinanceiroContrato,
} from "@/lib/cliente-contrato-mappers";
import { formatDateBR } from "@/lib/format";
import type { ClienteContratoRecord } from "@/lib/types";

interface ClienteContratosHistoricoTableProps {
  contratos: ClienteContratoRecord[];
  loading: boolean;
  podeEncerrarContrato?: boolean;
  onEditar: (contrato: ClienteContratoRecord) => void;
  onEncerrar: (contrato: ClienteContratoRecord) => void;
}

export function ClienteContratosHistoricoTable({
  contratos,
  loading,
  podeEncerrarContrato = false,
  onEditar,
  onEncerrar,
}: ClienteContratosHistoricoTableProps) {
  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-app-muted">
        Carregando histórico...
      </p>
    );
  }

  if (contratos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-app-muted">
        Nenhum contrato anterior registrado.
      </p>
    );
  }

  return (
    <div className="table-wrap -mx-1 overflow-x-auto px-1">
      <table className="table-premium w-full min-w-[1180px]">
        <thead>
          <tr>
            {[
              "Contrato",
              "Orçamento",
              "Aprovação",
              "Valor",
              "Status",
              "Financeiro",
              "Agendamento",
              "Ações",
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contratos.map((contrato) => {
            const agendamento = labelAgendamentoContrato(contrato);
            return (
              <tr key={contrato.id}>
                <td className="font-bold text-navy">
                  {contrato.numero?.trim() || "—"}
                </td>
                <td className="font-semibold text-navy">
                  {contrato.numero_orcamento?.trim() || "—"}
                </td>
                <td>
                  {contrato.aprovado_em
                    ? formatDateBR(contrato.aprovado_em.split("T")[0])
                    : formatDateBR(contrato.data_inicio)}
                </td>
                <td className="tabular-nums">
                  {formatValorContrato(contrato.valor_contrato)}
                </td>
                <td>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${clienteContratoBadgeClassExibicao(contrato)}`}
                  >
                    {labelClienteContratoStatusExibicao(contrato)}
                  </span>
                </td>
                <td className="text-xs font-semibold text-[#52617a]">
                  {labelFinanceiroContrato(contrato)}
                </td>
                <td>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      agendamento === "Liberado"
                        ? "bg-brand-green-soft text-brand-green"
                        : "bg-brand-orange-soft text-[#c96d00]"
                    }`}
                  >
                    {agendamento}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="rounded-lg bg-brand-blue-soft px-2.5 py-1 text-[10px] font-bold text-brand-blue"
                      onClick={() => onEditar(contrato)}
                    >
                      Visualizar
                    </button>
                    {podeEncerrarContrato &&
                    (contrato.status === "ativo" ||
                      contrato.status === "em_renovacao") ? (
                      <button
                        type="button"
                        className="rounded-lg bg-[#f4f6fb] px-2.5 py-1 text-[10px] font-bold text-[#52617a]"
                        onClick={() => onEncerrar(contrato)}
                      >
                        Encerrar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
