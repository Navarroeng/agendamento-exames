import { formatCurrency } from "@/lib/money";
import { Panel } from "@/components/ui/Panel";
import { IconClipboard } from "@/components/ui/icons/OutlineIcons";
import type {
  OrcamentoItemFormItem,
  ServicoSstRecord,
} from "@/lib/orcamento-types";
import { OrcamentoItemTableRow } from "./OrcamentoItemTableRow";

interface OrcamentoItensSectionProps {
  itens: OrcamentoItemFormItem[];
  servicos: ServicoSstRecord[];
  servicosLoading: boolean;
  servicosError: string | null;
  subtotal: number;
  descontoPercentual: string;
  valorTotal: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (
    id: string,
    field: keyof OrcamentoItemFormItem,
    value: string,
    servicoNome?: string
  ) => void;
  onApplyValorSugerido: (itemId: string, valor: number | null) => void;
}

const TH =
  "border-b border-[#eef2f7] bg-[#f8fafc] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#64748b] whitespace-nowrap";

export function OrcamentoItensSection({
  itens,
  servicos,
  servicosLoading,
  servicosError,
  subtotal,
  descontoPercentual,
  valorTotal,
  onAdd,
  onRemove,
  onUpdate,
  onApplyValorSugerido,
}: OrcamentoItensSectionProps) {
  return (
    <Panel
      title="Itens do orçamento"
      icon={<IconClipboard />}
      iconTone="purple"
      action={
        <button type="button" className="btn btn-primary text-xs" onClick={onAdd}>
          + Adicionar Serviço
        </button>
      }
    >
      {servicosError && (
        <div className="mb-3 rounded-[10px] border border-brand-red/20 bg-brand-red-soft px-3 py-2 text-[11px] font-medium text-brand-red">
          {servicosError}
        </div>
      )}
      {!servicosLoading && !servicosError && servicos.length === 0 && (
        <div className="mb-3 rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[11px] font-medium text-[#b45309]">
          Catálogo de serviços SST vazio. Execute o seed SQL no Supabase para
          popular a tabela servicos_sst.
        </div>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-[#eef2f7]">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className={TH}>Serviço</th>
              <th className={TH}>Quantidade de colaboradores</th>
              <th className={TH}>Valor</th>
              <th className={`${TH} w-10 text-center`}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <OrcamentoItemTableRow
                key={item.id}
                item={item}
                servicos={servicos}
                servicosLoading={servicosLoading}
                canRemove={itens.length > 1}
                onRemove={() => onRemove(item.id)}
                onUpdate={(field, value, servicoNome) =>
                  onUpdate(item.id, field, value, servicoNome)
                }
                onApplyValorSugerido={(valor) =>
                  onApplyValorSugerido(item.id, valor)
                }
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#f8fafc]">
              <td
                colSpan={2}
                className="border-t border-[#eef2f7] px-2.5 py-2 text-right text-[11px] font-semibold text-[#64748b]"
              >
                Subtotal
              </td>
              <td className="border-t border-[#eef2f7] px-2.5 py-2 text-xs font-bold text-navy">
                {formatCurrency(subtotal)}
              </td>
              <td className="border-t border-[#eef2f7]" />
            </tr>
            <tr className="bg-[#fffbeb]">
              <td
                colSpan={2}
                className="border-t border-[#eef2f7] px-2.5 py-2 text-right text-[11px] font-semibold text-[#64748b]"
              >
                Desconto ({descontoPercentual || "0"}%)
              </td>
              <td className="border-t border-[#eef2f7] px-2.5 py-2 text-xs font-semibold text-[#b45309]">
                {formatCurrency(subtotal - valorTotal)}
              </td>
              <td className="border-t border-[#eef2f7]" />
            </tr>
            <tr className="bg-brand-blue-soft/40">
              <td
                colSpan={2}
                className="border-t border-[#eef2f7] px-2.5 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-wide text-navy"
              >
                Valor total
              </td>
              <td className="border-t border-[#eef2f7] px-2.5 py-2.5 text-sm font-extrabold text-navy">
                {formatCurrency(valorTotal)}
              </td>
              <td className="border-t border-[#eef2f7]" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}
