"use client";

import { useEffect, useId, useRef, useState } from "react";

export type CheckboxMultiSelectOption<T extends string> = {
  value: T;
  label: string;
};

type CheckboxMultiSelectProps<T extends string> = {
  id?: string;
  className?: string;
  closedLabel: string;
  todosLabel?: string;
  todosChecked: boolean;
  options: readonly CheckboxMultiSelectOption<T>[];
  isOptionChecked: (value: T) => boolean;
  onToggleTodos: () => void;
  onToggleOption: (value: T) => void;
  ariaLabel: string;
};

export function CheckboxMultiSelect<T extends string>({
  id,
  className = "field-input field-input-compact text-sm",
  closedLabel,
  todosLabel = "Todos",
  todosChecked,
  options,
  isOptionChecked,
  onToggleTodos,
  onToggleOption,
  ariaLabel,
}: CheckboxMultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listId = id ?? generatedId;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={listId}
        className={`${className} flex items-center justify-between gap-2 text-left`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="min-w-0 truncate">{closedLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-[#94a3b8] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={listId}
          className="absolute z-30 mt-1 w-full min-w-[11.5rem] overflow-hidden rounded-[10px] border border-[#e2e8f0] bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
        >
          <label className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-[#1f2937] hover:bg-[#f8fafc]">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 shrink-0 accent-brand-blue"
              checked={todosChecked}
              onChange={onToggleTodos}
            />
            {todosLabel}
          </label>
          <div className="my-1 border-t border-[#eef2f7]" />
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-[#1f2937] hover:bg-[#f8fafc]"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 shrink-0 accent-brand-blue"
                checked={isOptionChecked(option.value)}
                onChange={() => onToggleOption(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
