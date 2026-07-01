"use client";

import { useMemo } from "react";
import {
  buildMonthReferenceOptions,
  resolveMonthReferenceValue,
} from "@/lib/month-reference-options";

interface MonthReferenceSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Quando true, inclui opção vazia (ex.: filtros opcionais). */
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function MonthReferenceSelect({
  value,
  onChange,
  disabled = false,
  className = "field-input w-full",
  id,
  allowEmpty = false,
  emptyLabel = "Todos os meses",
}: MonthReferenceSelectProps) {
  const options = useMemo(() => buildMonthReferenceOptions(), []);
  const selected = allowEmpty
    ? value
    : resolveMonthReferenceValue(value, options);

  return (
    <select
      id={id}
      className={className}
      value={selected}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty ? (
        <option value="">{emptyLabel}</option>
      ) : null}
      {options.map((month) => (
        <option key={month} value={month}>
          {month}
        </option>
      ))}
    </select>
  );
}
