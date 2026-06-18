import { isExameClinicoManual } from "@/lib/exame-pricing";
import type { ExameFormItem } from "@/lib/types";

interface ExamTableRowProps {
  exam: ExameFormItem;
  canRemove: boolean;
  pricingLoading: boolean;
  onRemove: () => void;
  onUpdate: (field: keyof ExameFormItem, value: string) => void;
}

const inputClass =
  "field-input field-input-compact min-w-0 disabled:cursor-not-allowed disabled:opacity-60";
const TD =
  "border-b border-[#eef2f7] px-2.5 py-1.5 align-middle text-xs text-[#1f2937]";

function PrecoBadge({ exam }: { exam: ExameFormItem }) {
  if (!exam.tipo_exame.trim() || exam.aviso) return null;

  if (exam.precoAutomatico) {
    return (
      <span className="inline-block rounded-md bg-[#ecfdf3] px-1.5 py-px text-[9px] font-medium text-[#16a34a]">
        Automático
      </span>
    );
  }

  if (
    isExameClinicoManual(exam.tipo_exame) &&
    !exam.clinicoValorManual &&
    exam.valor_cliente.trim()
  ) {
    return (
      <span className="inline-block rounded-md bg-[#ecfdf3] px-1.5 py-px text-[9px] font-medium text-[#16a34a]">
        Automático (ASO)
      </span>
    );
  }

  return (
    <span className="inline-block rounded-md bg-[#f1f5f9] px-1.5 py-px text-[9px] font-medium text-[#64748b]">
      Manual
    </span>
  );
}

export function ExamTableRow({
  exam,
  canRemove,
  pricingLoading,
  onRemove,
  onUpdate,
}: ExamTableRowProps) {
  const readOnlyPreco = exam.precoAutomatico && !exam.aviso;
  const disabled = pricingLoading;

  return (
    <>
      <tr className="transition-colors hover:bg-[#fafbff]">
        <td className={TD}>
          <span className="block min-w-[132px] font-semibold text-[#1f2937]">
            {exam.tipo_exame || "—"}
          </span>
        </td>
        <td className={TD}>
          <input
            className={`${inputClass} w-full min-w-[92px] bg-[#f8fafc]`}
            value={exam.valor_cliente}
            placeholder={pricingLoading ? "..." : "0,00"}
            readOnly={readOnlyPreco}
            disabled={disabled && readOnlyPreco}
            onChange={(e) => onUpdate("valor_cliente", e.target.value)}
          />
        </td>
        <td className={TD}>
          <input
            className={`${inputClass} w-full min-w-[92px] cursor-not-allowed bg-[#f8fafc]`}
            value={exam.custo_clinica}
            placeholder={pricingLoading ? "..." : "0,00"}
            readOnly
            disabled={disabled}
            tabIndex={-1}
            aria-readonly="true"
          />
        </td>
        <td className={TD}>
          <input
            className={`${inputClass} w-full min-w-[80px] bg-[#f0fdf4] font-semibold text-[#16a34a]`}
            value={exam.lucro}
            readOnly
            tabIndex={-1}
          />
        </td>
        <td className={`${TD} whitespace-nowrap`}>
          <PrecoBadge exam={exam} />
        </td>
        <td className={`${TD} w-10 text-center`}>
          <button
            type="button"
            className="inline-grid h-6 w-6 cursor-pointer place-items-center rounded-md border-0 bg-brand-red-soft text-sm font-bold leading-none text-brand-red transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={onRemove}
            disabled={!canRemove}
            title="Remover exame"
            aria-label="Remover exame"
          >
            ×
          </button>
        </td>
      </tr>
      {exam.aviso ? (
        <tr>
          <td
            colSpan={6}
            className="border-b border-[#eef2f7] bg-[#fffbeb] px-2.5 py-1.5"
          >
            <p className="text-[11px] font-medium text-[#b45309]">{exam.aviso}</p>
          </td>
        </tr>
      ) : null}
    </>
  );
}
