import { RequiredMark } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { maskCNPJInput } from "@/lib/cnpj";
import { formatCurrency } from "@/lib/money";
import { VALIDADE_PROPOSTA_DIAS } from "@/lib/orcamento-validade";
import type { CondicoesPagamentoProposta } from "@/lib/orcamento-pagamento";
import type { OrcamentoFormField } from "@/hooks/useOrcamentoForm";
import {
  ORCAMENTO_ORIGEM_OPTIONS,
  type OrcamentoFormValues,
  type ServicoSstRecord,
} from "@/lib/orcamento-types";
import type { ClienteRecord } from "@/lib/types";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { OrcamentoItensSection } from "./OrcamentoItensSection";

interface OrcamentoFormProps {
  form: OrcamentoFormValues;
  isEditing: boolean;
  /** Quando true, o formulário é exibido dentro do modal (títulos sem duplicar o header). */
  embeddedInModal?: boolean;
  clientes: ClienteRecord[];
  servicos: ServicoSstRecord[];
  servicosLoading: boolean;
  servicosError: string | null;
  subtotal: number;
  valorTotal: number;
  validadeProposta: string;
  condicoesPagamento: CondicoesPagamentoProposta;
  onChange: (field: OrcamentoFormField, value: string) => void;
  onSelectCliente: (clienteId: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (
    id: string,
    field: keyof OrcamentoFormValues["itens"][number],
    value: string,
    servicoNome?: string
  ) => void;
  onApplyValorSugerido: (itemId: string, valor: number | null) => void;
}

export function OrcamentoForm({
  form,
  isEditing,
  embeddedInModal = false,
  clientes,
  servicos,
  servicosLoading,
  servicosError,
  subtotal,
  valorTotal,
  validadeProposta,
  condicoesPagamento,
  onChange,
  onSelectCliente,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onApplyValorSugerido,
}: OrcamentoFormProps) {
  const clienteBloqueado = Boolean(form.cliente_id.trim());
  const headerTitle = embeddedInModal
    ? "Dados do orçamento"
    : isEditing
      ? "Editar orçamento"
      : "Novo orçamento";

  return (
    <>
      <Panel
        id="cadastrar-orcamento"
        title={headerTitle}
        icon={<IconFileText />}
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Número
            </label>
            <input
              className="field-input bg-[#f8fafc]"
              value={form.numero}
              readOnly
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Data <RequiredMark />
            </label>
            <input
              type="date"
              className="field-input"
              value={form.data_proposta}
              onChange={(e) => onChange("data_proposta", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Origem do cliente <RequiredMark />
            </label>
            <select
              className="field-input"
              value={form.origem_cliente}
              onChange={(e) => onChange("origem_cliente", e.target.value)}
            >
              <option value="">Selecionar origem...</option>
              {ORCAMENTO_ORIGEM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Cliente cadastrado
            </label>
            <select
              id="orcamento-primeiro-campo"
              className="field-input"
              value={form.cliente_id}
              onChange={(e) => onSelectCliente(e.target.value)}
            >
              <option value="">Selecionar cliente...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {formatClienteNomeDisplay(cliente.nome)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Cliente <RequiredMark />
            </label>
            <input
              className={`field-input uppercase ${clienteBloqueado ? "bg-[#f8fafc]" : ""}`}
              placeholder="Nome da empresa"
              value={form.cliente_nome}
              readOnly={clienteBloqueado}
              onChange={(e) => onChange("cliente_nome", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              CNPJ
            </label>
            <input
              className="field-input"
              placeholder="00.000.000/0000-00"
              value={form.cliente_cnpj}
              onChange={(e) =>
                onChange("cliente_cnpj", maskCNPJInput(e.target.value))
              }
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Setor
            </label>
            <div className="relative">
              <input
                className="field-input pr-14"
                placeholder="Setor / área"
                maxLength={30}
                value={form.cliente_setor}
                onChange={(e) =>
                  onChange("cliente_setor", e.target.value.slice(0, 30))
                }
              />
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-1.5 right-2.5 text-[10px] tabular-nums text-[#94a3b8]"
              >
                {form.cliente_setor.length} / 30
              </span>
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Endereço
            </label>
            <input
              className="field-input"
              placeholder="Endereço completo"
              value={form.cliente_endereco}
              onChange={(e) => onChange("cliente_endereco", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Contato
            </label>
            <input
              className="field-input"
              value={form.contato}
              onChange={(e) => onChange("contato", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              E-mail
            </label>
            <input
              type="email"
              className="field-input"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Telefone
            </label>
            <input
              className="field-input"
              value={form.telefone}
              onChange={(e) => onChange("telefone", e.target.value)}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Observações
            </label>
            <textarea
              className="field-input min-h-[72px] resize-y"
              value={form.observacoes}
              onChange={(e) => onChange("observacoes", e.target.value)}
            />
          </div>
        </div>
      </Panel>

      <div className={embeddedInModal ? "mt-4" : "mt-[18px]"}>
        <OrcamentoItensSection
          itens={form.itens}
          servicos={servicos}
          servicosLoading={servicosLoading}
          servicosError={servicosError}
          subtotal={subtotal}
          valorTotal={valorTotal}
          onAdd={onAddItem}
          onRemove={onRemoveItem}
          onUpdate={onUpdateItem}
          onApplyValorSugerido={onApplyValorSugerido}
        />
      </div>

      <div className={embeddedInModal ? "mt-4" : "mt-[18px]"}>
        <Panel title="Condições comerciais" icon={<IconFileText />}>
        <p className="mb-4 text-[11px] text-[#64748b]">
          Validade da proposta:{" "}
          <span className="font-semibold text-navy">
            {validadeProposta
              ? formatDateIsoToBR(validadeProposta)
              : "—"}
          </span>
          {validadeProposta ? (
            <span className="text-[#94a3b8]">
              {" "}
              ({VALIDADE_PROPOSTA_DIAS} dias após a data de emissão)
            </span>
          ) : null}
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
              Pagamento parcelado
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <label className="mb-1.5 block text-xs font-bold text-navy">
                  Quantidade de parcelas
                </label>
                <select
                  className="field-input"
                  value={String(condicoesPagamento.parcelas)}
                  onChange={(e) =>
                    onChange("quantidade_parcelas", e.target.value)
                  }
                >
                  {condicoesPagamento.opcoesParcelas.map((qtd) => (
                    <option key={qtd} value={qtd}>
                      {qtd}x
                    </option>
                  ))}
                </select>
              </div>
              <div className="pb-2">
                <p className="text-[11px] text-[#64748b]">Valor de cada parcela</p>
                <p className="text-sm font-bold text-navy">
                  {formatCurrency(condicoesPagamento.valorParcela)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-[#64748b]">
              Parcela mínima de R$ 500,00 · até {condicoesPagamento.maxParcelas}x
              para este valor.
            </p>
          </div>
          <div className="rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#b45309]">
              Valor à vista
            </p>
            <p className="mt-1 text-sm font-extrabold text-navy">
              {condicoesPagamento.textoAVista}
            </p>
            <p className="mt-1 text-[11px] text-[#64748b]">
              5% de desconto sobre {formatCurrency(valorTotal)}, arredondado para
              baixo na centena.
            </p>
          </div>
        </div>
        </Panel>
      </div>
    </>
  );
}
