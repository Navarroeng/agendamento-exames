import { RequiredMark } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { RESPONSAVEIS } from "@/lib/constants";
import type { OrcamentoFormField } from "@/hooks/useOrcamentoForm";
import {
  ORCAMENTO_STATUS_OPTIONS,
  type OrcamentoFormValues,
  type ServicoSstRecord,
} from "@/lib/orcamento-types";
import type { ClienteRecord } from "@/lib/types";
import { OrcamentoItensSection } from "./OrcamentoItensSection";

interface OrcamentoFormProps {
  form: OrcamentoFormValues;
  isEditing: boolean;
  clientes: ClienteRecord[];
  servicos: ServicoSstRecord[];
  servicosLoading: boolean;
  servicosError: string | null;
  subtotal: number;
  valorTotal: number;
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
  clientes,
  servicos,
  servicosLoading,
  servicosError,
  subtotal,
  valorTotal,
  onChange,
  onSelectCliente,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onApplyValorSugerido,
}: OrcamentoFormProps) {
  return (
    <>
      <Panel
        id="cadastrar-orcamento"
        title={isEditing ? "Editar orçamento" : "Novo orçamento"}
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
              Status
            </label>
            <select
              className="field-input"
              value={form.status}
              onChange={(e) => onChange("status", e.target.value)}
            >
              {ORCAMENTO_STATUS_OPTIONS.map((option) => (
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
              className="field-input"
              value={form.cliente_id}
              onChange={(e) => onSelectCliente(e.target.value)}
            >
              <option value="">Selecionar cliente...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Cliente <RequiredMark />
            </label>
            <input
              className="field-input"
              placeholder="Nome da empresa"
              value={form.cliente_nome}
              onChange={(e) => onChange("cliente_nome", e.target.value)}
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
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Responsável Navarro <RequiredMark />
            </label>
            <select
              className="field-input"
              value={form.responsavel}
              onChange={(e) => onChange("responsavel", e.target.value)}
            >
              {RESPONSAVEIS.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
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

      <div className="mt-[18px]">
        <OrcamentoItensSection
          itens={form.itens}
          servicos={servicos}
          servicosLoading={servicosLoading}
          servicosError={servicosError}
          subtotal={subtotal}
          descontoPercentual={form.desconto_percentual}
          valorTotal={valorTotal}
          onAdd={onAddItem}
          onRemove={onRemoveItem}
          onUpdate={onUpdateItem}
          onApplyValorSugerido={onApplyValorSugerido}
        />
      </div>

      <div className="mt-[18px]">
        <Panel title="Condições comerciais" icon={<IconFileText />}>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Desconto (%)
            </label>
            <input
              className="field-input"
              inputMode="decimal"
              placeholder="0"
              value={form.desconto_percentual}
              onChange={(e) => onChange("desconto_percentual", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Forma de pagamento
            </label>
            <input
              className="field-input"
              placeholder="Ex.: 30 dias, boleto, PIX..."
              value={form.forma_pagamento}
              onChange={(e) => onChange("forma_pagamento", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Validade da proposta
            </label>
            <input
              type="date"
              className="field-input"
              value={form.validade_proposta}
              onChange={(e) => onChange("validade_proposta", e.target.value)}
            />
          </div>
        </div>
        </Panel>
      </div>
    </>
  );
}
