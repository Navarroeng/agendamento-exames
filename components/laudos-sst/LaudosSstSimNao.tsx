"use client";

interface LaudosSstSimNaoProps {
  name: string;
  value: boolean | null;
  disabled?: boolean;
  simLabel?: string;
  naoLabel?: string;
  onChange: (value: boolean) => void;
}

export function LaudosSstSimNao({
  name,
  value,
  disabled,
  simLabel = "Sim",
  naoLabel = "Não",
  onChange,
}: LaudosSstSimNaoProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={value === true}
        onClick={() => onChange(true)}
        className={`rounded-xl px-4 py-2 text-[12px] font-bold transition ${
          value === true
            ? "bg-[#082b63] text-white shadow-sm"
            : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {simLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={value === false}
        onClick={() => onChange(false)}
        className={`rounded-xl px-4 py-2 text-[12px] font-bold transition ${
          value === false
            ? "bg-[#082b63] text-white shadow-sm"
            : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {naoLabel}
      </button>
    </div>
  );
}
