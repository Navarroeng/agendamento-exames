import {
  clienteContratoBadgeClassExibicao,
  formatReajusteContrato,
  condicaoPagamentoExibicao,
  formatValorContratoExibicao,
  formatVigenciaContrato,
  labelClienteContratoStatusExibicao,
  labelClienteContratoTipo,
  labelFinanceiroContrato,
} from "@/lib/cliente-contrato-mappers";
import {
  resolveDisponibilidadeAgendamentoCliente,
  type DisponibilidadeAgendamentoResult,
} from "@/lib/cliente-disponibilidade-agendamento";
import { formatDateBR } from "@/lib/format";
import type { ClienteContratoConsulta } from "@/lib/cliente-contrato-atual";
import { RenovacaoContratoBadge } from "./RenovacaoContratoBadge";

interface ClienteContratoAtualCardProps {
  contrato: ClienteContratoConsulta | null;
  /** Mesmo resultado da listagem e do campo do cliente. */
  disponibilidade?: Pick<DisponibilidadeAgendamentoResult, "label"> | null;
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string | null;
}) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-[#1f2937]">{value}</p>
      {detail ? (
        <p className="mt-0.5 text-[11px] font-semibold text-[#64748b]">{detail}</p>
      ) : null}
    </div>
  );
}

export function ClienteContratoAtualCard({
  contrato,
  disponibilidade,
}: ClienteContratoAtualCardProps) {
  if (!contrato) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d7deec] bg-gradient-to-br from-[#fbfcff] to-[#f6f8fc] px-5 py-8 text-center">
        <p className="text-sm font-bold text-[#52617a]">
          Nenhum contrato SST ativo
        </p>
        <p className="mt-1 text-xs text-[#8b95a8]">
          Pacote SST, mensalidade e demais vínculos operacionais aparecem
          aqui. Serviços pontuais (AET, perícias, laudos avulsos) ficam na
          seção abaixo.
        </p>
      </div>
    );
  }

  const agendamentoLabel =
    disponibilidade?.label ??
    resolveDisponibilidadeAgendamentoCliente({
      cliente: {},
      contratos: [contrato],
    }).label;
  const statusLabel = labelClienteContratoStatusExibicao(contrato);
  const condicao = condicaoPagamentoExibicao(contrato);
  const situacao = labelFinanceiroContrato(contrato);
  const detalheFinanceiro =
    situacao !== "—" && situacao !== condicao ? situacao : null;

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
          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${clienteContratoBadgeClassExibicao(contrato)}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-4">
        <Metric label="Status" value={statusLabel} />
        <Metric
          label="Início"
          value={
            contrato.data_inicio?.trim()
              ? formatDateBR(contrato.data_inicio)
              : "—"
          }
        />
        <Metric
          label="Fim previsto"
          value={
            contrato.data_fim?.trim() ? formatDateBR(contrato.data_fim) : "—"
          }
        />
        {contrato.encerrado_em ? (
          <Metric
            label="Encerrado em"
            value={formatDateBR(contrato.encerrado_em.split("T")[0])}
          />
        ) : null}
        <Metric
          label="Financeiro"
          value={condicao}
          detail={detalheFinanceiro}
        />
        <Metric
          label="Valor"
          value={formatValorContratoExibicao(contrato)}
        />
        <Metric
          label="Colaboradores"
          value={
            contrato.quantidade_colaboradores != null
              ? String(contrato.quantidade_colaboradores)
              : "—"
          }
        />
        <Metric label="Agendamento" value={agendamentoLabel} />
        <Metric
          label="Tipo"
          value={labelClienteContratoTipo(contrato.tipo_contrato)}
        />
        <Metric
          label="Reajuste"
          value={formatReajusteContrato(contrato.reajuste_percentual)}
        />
        <div className="rounded-xl border border-[#e8edf5] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
            Renovação
          </p>
          <div className="mt-1">
            <RenovacaoContratoBadge
              renovacaoAutomatica={contrato.renovacaoAutomatica}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
