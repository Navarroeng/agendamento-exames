"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listId = id ?? generatedId;

  useEffect(() => {
    setMounted(true);
  }, []);

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
  }, [open]);

  useEffect(() => {
    if (!open) return;

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

  const menu =
    open && mounted && position
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={listId}
            className="fixed z-[55] overflow-y-auto rounded-[10px] border border-[#e2e8f0] bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
            style={{
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
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
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
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
      {menu}
    </div>
  );
}
