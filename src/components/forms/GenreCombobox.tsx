import React, { useEffect, useRef, useState } from "react";
import "./forms.css";

export interface GenreComboboxProps {
  /** Full predefined list of selectable genres. */
  options: string[];
  /** Currently selected genres (removable chips). */
  value: string[];
  onChange: (genres: string[]) => void;
  placeholder?: string;
}

/**
 * Searchable multi-select combobox (Form 11). Selected genres render as removable chips inside
 * the control; typing filters the menu; Enter adds the top match; Backspace on an empty input
 * removes the last chip. Restricted to the predefined list — typed text that matches nothing is
 * not added. Closes on outside-click and Escape.
 */
export const GenreCombobox: React.FC<GenreComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = "Search genres…",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filtered = options.filter(
    (g) => !value.includes(g) && g.toLowerCase().includes(query.toLowerCase().trim())
  );

  const add = (name: string) => {
    if (!name || value.includes(name)) return;
    onChange([...value, name]);
    setQuery("");
    inputRef.current?.focus();
  };
  const remove = (name: string) => onChange(value.filter((g) => g !== name));

  return (
    <div className={`sa-aa-combo${open ? " open" : ""}`} ref={ref}>
      <div
        className="sa-aa-combo-control"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {value.map((name) => (
          <span key={name} className="sa-aa-gchip">
            {name}
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(name);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="sa-aa-combo-in"
          value={query}
          placeholder={value.length ? "" : placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length) add(filtered[0]);
            } else if (e.key === "Backspace" && !query && value.length) {
              remove(value[value.length - 1]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      {open && (
        <div className="sa-aa-combo-menu" role="listbox">
          {filtered.length ? (
            filtered.map((g, i) => (
              <div
                key={g}
                role="option"
                aria-selected={false}
                className={`sa-aa-combo-o${i === 0 && query.trim() ? " hl" : ""}`}
                onClick={() => add(g)}
              >
                {g}
              </div>
            ))
          ) : (
            <div className="sa-aa-combo-empty">
              {query.trim() ? "No matching genre" : "All genres selected"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
