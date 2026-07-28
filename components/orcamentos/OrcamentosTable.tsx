import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCurrency } from "@/lib/money";
import { Panel } from "@/components/ui/Panel";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import {
  ORCAMENTO_STATUS_BADGE,
  ORCAMENTO_STATUS_LABELS,
  formatOrcamentoOrigemCliente,
  type OrcamentoRecord,
} from "@/lib/orcamento-types";
import { OrcamentoRowActionsMenu } from "./OrcamentoRowActionsMenu";

interface OrcamentosTableProps {
  orcamentos: OrcamentoRecord[];
  loading: boolean;
  error: string | null;
  onVisualizar: (id: string) => void;
  onEditar: (id: string) => void;
  onGerarPdf: (id: string) => void;
  onCancelar: (id: string) => void;
  onAprovar: (id: string) => void;
}

export function OrcamentosTable({
  orcamentos,
  loading,
  error,
  onVisualizar,
  onEditar,
  onGerarPdf,
  onCancelar,
  onAprovar,
}: OrcamentosTableProps) {
  return (
    <Panel
      title="Histórico de Orçamentos"
      icon={<IconFileText />}
      iconTone="blue"
    >
      <div className="table-wrap -mx-6 overflow-x-auto px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-app-muted">Carregando...</p>
        )}
        {!loading && error && (
          <p className="py-8 text-center text-sm text-brand-red">{error}</p>
        )}
        {!loading && !error && orcamentos.length === 0 && (
          <p className="py-8 text-center text-sm text-app-muted">
            Nenhum orçamento encontrado.
          </p>
        )}
        {!loading && !error && orcamentos.length > 0 && (
          <table className="table-premium w-full min-w-[960px]">
            <thead>
              <tr>
                {[
                  "Número",
                  "Data",
                  "Cliente",
                  "Origem",
                  "Responsável",
                  "Valor total",
                  "Status",
                  "Ações",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((orcamento) => {
                const badge = ORCAMENTO_STATUS_BADGE[orcamento.status];
                return (
                  <tr key={orcamento.id}>
                    <td className="font-bold text-navy">{orcamento.numero}</td>
                    <td>{formatDateIsoToBR(orcamento.data_proposta)}</td>
                    <td className="max-w-[200px] truncate">
                      {orcamento.cliente_nome}
                    </td>
                    <td>
                      {formatOrcamentoOrigemCliente(orcamento.origem_cliente)}
                    </td>
                    <td>{orcamento.responsavel}</td>
                    <td className="font-semibold text-navy">
                      {formatCurrency(Number(orcamento.valor_total))}
                    </td>
                    <td>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${badge.className}`}
                      >
                        {ORCAMENTO_STATUS_LABELS[orcamento.status]}
                      </span>
                    </td>
                    <td>
                      <OrcamentoRowActionsMenu
                        orcamento={orcamento}
                        onVisualizar={onVisualizar}
                        onEditar={onEditar}
                        onGerarPdf={onGerarPdf}
                        onCancelar={onCancelar}
                        onAprovar={onAprovar}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}
