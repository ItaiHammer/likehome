"use client";

import { useEffect, useId, useRef, useState } from "react";

type Option = { value: string; label: string };

type PropertyPickerProps = {
  id: string;
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

/** Styled, keyboard-accessible alternative to native select option menus.
 * The native Windows/Firefox menu doesn't always inherit LikeHome's Inter font.
 */
export function PropertyPicker({
  id,
  label = "Property",
  options,
  value,
  onChange,
}: PropertyPickerProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(0, options.findIndex((item) => item.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    const outsideClick = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outsideClick);
    return () => document.removeEventListener("pointerdown", outsideClick);
  }, []);

  useEffect(() => {
    if (open) optionButtons.current[focusedIndex]?.focus();
  }, [open, focusedIndex]);

  function toggleMenu() {
    setFocusedIndex(selectedIndex);
    setOpen((current) => !current);
  }

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  }

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedIndex((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setFocusedIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setFocusedIndex(options.length - 1);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative min-w-0 font-sans">
      <label htmlFor={id} className="mb-1.5 block text-sm font-normal text-ink">
        {label}
      </label>
      <button
        id={id}
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggleMenu}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setFocusedIndex(selectedIndex);
            setOpen(true);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="flex w-full items-center justify-between gap-3 rounded-control border border-edge bg-surface px-3 py-2.5 text-left font-sans text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      >
        <span className="min-w-0 truncate">{selected?.label ?? "Select a property"}</span>
        <svg className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m5 7 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && options.length > 0 && (
        <div
          id={menuId}
          role="listbox"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-control border border-edge bg-surface p-1 font-sans shadow-lg"
        >
          {options.map((item, index) => (
            <button
              key={item.value}
              ref={(element) => { optionButtons.current[index] = element; }}
              type="button"
              role="option"
              aria-selected={item.value === value}
              tabIndex={index === focusedIndex ? 0 : -1}
              onClick={() => pick(item.value)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`block w-full rounded-control px-3 py-2 text-left font-sans text-sm font-normal leading-5 text-ink hover:bg-blue/10 focus-visible:bg-blue/10 focus-visible:outline-none ${item.value === value ? "bg-blue/5" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
