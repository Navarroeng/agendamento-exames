import {
  calcValorPacoteCompletoSst,
  isPacoteCompletoSstValorAutomatico,
  parseQuantidadeColaboradores,
} from "@/lib/orcamento-calculo";
import { formatCurrency } from "@/lib/money";
import type {
  OrcamentoItemFormItem,
  ServicoSstRecord,
} from "@/lib/orcamento-types";
import { OrcamentoPacoteInclusosCard } from "./OrcamentoPacoteInclusosCard";
import {
  isPacoteCompletoSst,
  resolveItensInclusosServico,
} from "@/lib/servico-sst-pacote";

interface OrcamentoItemTableRowProps {
  item: OrcamentoItemFormItem;
  servicos: ServicoSstRecord[];
  servicosLoading: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (
    field: keyof OrcamentoItemFormItem,
    value: string,
    servicoNome?: string
  ) => void;
  onApplyValorSugerido: (valor: number | null) => void;
}

const inputClass = "field-input field-input-compact min-w-0 w-full";
const TD =
  "border-b border-[#eef2f7] px-2.5 py-1.5 align-middle text-xs text-[#1f2937]";

export function OrcamentoItemTableRow({
  item,
  servicos,
  servicosLoading,
  canRemove,
  onRemove,
  onUpdate,
  onApplyValorSugerido,
}: OrcamentoItemTableRowProps) {
  const selectedServico = servicos.find((s) => s.id === item.servico_id);
  const isOutros = selectedServico?.nome === "Outros";
  const itensInclusos = resolveItensInclusosServico(
    selectedServico,
    item.servico_nome
  );
  const showPacoteCard = itensInclusos.length > 0;
  const qtd = parseQuantidadeColaboradores(item.quantidade);
  const valorAutomatico = isPacoteCompletoSstValorAutomatico(
    item.servico_nome,
    qtd
  )
    ? calcValorPacoteCompletoSst(qtd)
    : null;
  const showSugestaoAutomatica =
    valorAutomatico != null && !item.valor_manual;

  function handleServicoChange(servicoId: string) {
    const servico = servicos.find((s) => s.id === servicoId);
    const nome = servico?.nome === "Outros" ? "" : servico?.nome ?? "";
    onUpdate("servico_id", servicoId, nome);
    if (isPacoteCompletoSst(nome)) {
      onApplyValorSugerido(null);
      return;
    }
    if (servico?.valor_sugerido != null && servico.nome !== "Outros") {
      onApplyValorSugerido(Number(servico.valor_sugerido));
    }
  }

  return (
    <tr className="transition-colors hover:bg-[#fafbff]">
      <td className={TD}>
        <select
          className={`${inputClass} min-w-[160px]`}
          value={item.servico_id}
          disabled={servicosLoading}
          onChange={(e) => handleServicoChange(e.target.value)}
        >
          <option value="">
            {servicosLoading ? "Carregando..." : "Selecione o serviço..."}
          </option>
          {servicos.map((servico) => (
            <option key={servico.id} value={servico.id}>
              {servico.nome}
            </option>
          ))}
        </select>
        {isOutros && (
          <input
            className={`${inputClass} mt-1`}
            placeholder="Descreva o serviço"
            value={item.servico_nome}
            onChange={(e) => onUpdate("servico_nome", e.target.value)}
          />
        )}
        {showPacoteCard && (
          <OrcamentoPacoteInclusosCard
            servico={selectedServico}
            servicoNome={item.servico_nome}
            compact
          />
        )}
      </td>
      <td className={TD}>
        <input
          className={`${inputClass} max-w-[80px]`}
          inputMode="numeric"
          value={item.quantidade}
          onChange={(e) => onUpdate("quantidade", e.target.value)}
        />
      </td>
      <td className={TD}>
        <input
          className={`${inputClass} max-w-[120px]`}
          placeholder="R$ 0,00"
          value={item.valor_unitario}
          onChange={(e) => onUpdate("valor_unitario", e.target.value)}
        />
        {showSugestaoAutomatica ? (
          <p className="mt-1 max-w-[160px] text-[10px] leading-snug text-app-muted">
            Valor automático: {formatCurrency(valorAutomatico!)}
          </p>
        ) : item.valor_manual && valorAutomatico != null ? (
          <p className="mt-1 max-w-[160px] text-[10px] leading-snug text-app-muted">
            Valor negociado manualmente (tabela:{" "}
            {formatCurrency(valorAutomatico)})
          </p>
        ) : null}
      </td>
      <td className={`${TD} w-10 text-center`}>
        <button
          type="button"
          className="text-[#94a3b8] transition-colors hover:text-brand-red disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Remover serviço"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
