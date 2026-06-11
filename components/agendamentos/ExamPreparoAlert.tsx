import {
  collectExamesComPreparo,
  type ExameComPreparo,
} from "@/lib/exame-preparo";
import type { ExameFormItem, ExameRecord } from "@/lib/types";

interface ExamPreparoAlertProps {
  exams: ExameFormItem[];
  catalogExames: ExameRecord[];
}

function PreparoItem({ item }: { item: ExameComPreparo }) {
  return (
    <li className="rounded-[10px] border border-[#fde68a]/80 bg-white/80 px-3 py-2">
      <p className="text-[11px] font-bold text-[#92400e]">{item.nome}</p>
      <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-[#78350f]">
        {item.preparo}
      </p>
    </li>
  );
}

export function ExamPreparoAlert({ exams, catalogExames }: ExamPreparoAlertProps) {
  const items = collectExamesComPreparo(exams, catalogExames);
  if (items.length === 0) return null;

  return (
    <div className="mt-3 rounded-[12px] border border-[#fcd34d] bg-[#fffbeb] px-3.5 py-3">
      <p className="text-[11px] font-bold text-[#b45309]">
        Este agendamento possui exames com preparo.
      </p>
      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <PreparoItem key={`${item.nome}-${item.preparo.slice(0, 24)}`} item={item} />
        ))}
      </ul>
    </div>
  );
}
