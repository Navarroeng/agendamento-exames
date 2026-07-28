import {
  clienteContratoStatusBadgeClass,
  formatReajusteContrato,
  formatValorContrato,
  formatVigenciaContrato,
  labelAgendamentoContrato,
  labelClienteContratoStatus,
  labelClienteContratoTipo,
  labelFinanceiroContrato,
} from "@/lib/cliente-contrato-mappers";
import type { ClienteContratoRecord } from "@/lib/types";

interface ClienteContratoAtualCardProps {
  contrato: ClienteContratoRecord | null;
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-[#1f2937]">{value}</p>
    </div>
  );
}

export function ClienteContratoAtualCard({
  contrato,
}: ClienteContratoAtualCardProps) {
  if (!contrato) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d7deec] bg-gradient-to-br from-[#fbfcff] to-[#f6f8fc] px-5 py-8 text-center">
        <p className="text-sm font-bold text-[#52617a]">Nenhum contrato</p>
        <p className="mt-1 text-xs text-[#8b95a8]">
          Ao aprovar um orçamento, o pré-cadastro e o contrato são criados
          automaticamente.
        </p>
      </div>
    );
  }

  const agendamentoLabel = labelAgendamentoContrato(contrato);

  return (
    <div className="rounded-2xl border border-[#dbe4f4] bg-gradient-to-br from-white via-[#fbfdff] to-[#f0f4ff] p-5 shadow-[0_8px_28px_rgba(67,84,232,0.08)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b95a8]">
            Contrato atual
          </p>
          <p className="mt-0.5 text-sm font-extrabold text-navy">
            {contrato.numero?.trim() ||
              formatVigenciaContrato(contrato.data_inicio, contrato.data_fim)}
          </p>
          {contrato.numero_orcamento?.trim() ? (
            <p className="mt-0.5 text-xs font-semibold text-[#52617a]">
              Orçamento: {contrato.numero_orcamento}
            </p>
          ) : null}
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${clienteContratoStatusBadgeClass(contrato.status)}`}
        >
          {labelClienteContratoStatus(contrato.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Metric
          label="Valor contrato"
          value={formatValorContrato(contrato.valor_contrato)}
        />
        <Metric
          label="Colaboradores"
          value={
            contrato.quantidade_colaboradores != null
              ? String(contrato.quantidade_colaboradores)
              : "—"
          }
        />
        <Metric
          label="Financeiro"
          value={labelFinanceiroContrato(contrato)}
        />
        <Metric label="Agendamento" value={agendamentoLabel} />
        <Metric
          label="Tipo contrato"
          value={labelClienteContratoTipo(contrato.tipo_contrato)}
        />
        <Metric
          label="Reajuste"
          value={formatReajusteContrato(contrato.reajuste_percentual)}
        />
      </div>
    </div>
  );
}
