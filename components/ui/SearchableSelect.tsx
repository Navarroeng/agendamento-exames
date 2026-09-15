"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { textMatchesSearch } from "@/lib/text-normalize";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  id?: string;
  className?: string;
  value: string;
  options: readonly SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  emptyLabel?: string;
  clearLabel?: string;
};

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

const MENU_GAP_PX = 4;
const MENU_MAX_HEIGHT_PX = 280;
const VIEWPORT_PAD_PX = 8;

function measureMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(rect.width, 184);
  let left = rect.left;
  if (left + width > window.innerWidth - VIEWPORT_PAD_PX) {
    left = window.innerWidth - VIEWPORT_PAD_PX - width;
  }
  left = Math.max(VIEWPORT_PAD_PX, left);

  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD_PX;
  const spaceAbove = rect.top - VIEWPORT_PAD_PX;
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;

  if (openUp) {
    return {
      bottom: window.innerHeight - rect.top + MENU_GAP_PX,
      left,
      width,
      maxHeight: Math.max(96, Math.min(MENU_MAX_HEIGHT_PX, spaceAbove - MENU_GAP_PX)),
    };
  }

  return {
    top: rect.bottom + MENU_GAP_PX,
    left,
    width,
    maxHeight: Math.max(96, Math.min(MENU_MAX_HEIGHT_PX, spaceBelow - MENU_GAP_PX)),
  };
}

export function SearchableSelect({
  id,
  className = "field-input field-input-compact text-sm",
  value,
  options,
  onChange,
  placeholder = "Buscar...",
  ariaLabel,
  emptyLabel = "Nenhuma opção encontrada",
  clearLabel = "Limpar seleção",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const listId = `${id ?? generatedId}-list`;
  const selected =
    options.find((option) => option.value === value) ??
    (value ? { value, label: value } : null);

  const filtered = useMemo(
    () => options.filter((option) => textMatchesSearch(option.label, query)),
    [options, query]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      if (!triggerRef.current) return;
      setPosition(measureMenuPosition(triggerRef.current));
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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

  function selectValue(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  const menu =
    open && mounted && position
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[55] overflow-hidden rounded-[10px] border border-[#e2e8f0] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
            style={{
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
          >
            <div className="border-b border-[#eef2f7] p-1.5">
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={listId}
                aria-label={ariaLabel}
                className="field-input field-input-compact w-full text-sm"
                placeholder={placeholder}
                value={query}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  if (filtered.length === 1) selectValue(filtered[0].value);
                }}
              />
            </div>
            <div
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              className="overflow-y-auto py-1"
              style={{ maxHeight: Math.max(64, position.maxHeight - 52) }}
            >
              {value ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="block w-full px-2.5 py-1.5 text-left text-xs text-[#64748b] hover:bg-[#f8fafc]"
                  onClick={() => selectValue("")}
                >
                  Todas
                </button>
              ) : null}
              {filtered.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-[#94a3b8]">{emptyLabel}</p>
              ) : (
                filtered.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`block w-full px-2.5 py-1.5 text-left text-xs hover:bg-[#f8fafc] ${
                        isSelected
                          ? "font-semibold text-brand-blue"
                          : "text-[#1f2937]"
                      }`}
                      onClick={() => selectValue(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative" ref={triggerRef}>
      <button
        type="button"
        id={id}
        className={`${className} flex w-full items-center justify-between gap-2 text-left ${
          value ? "pr-14" : ""
        }`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span
          className={`min-w-0 truncate ${
            selected ? "text-navy" : "text-[#94a3b8]"
          }`}
        >
          {selected?.label || placeholder}
        </span>
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
      {value ? (
        <button
          type="button"
          aria-label={clearLabel}
          className="absolute right-7 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded text-[#94a3b8] hover:text-navy"
          onClick={(event) => {
            event.stopPropagation();
            selectValue("");
          }}
        >
          ×
        </button>
      ) : null}
      {menu}
    </div>
  );
}
