import React, { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES_ISO, QUICK_PICKS, flagFor, countryName, normaliseCountry } from "../../lib/territory";
import "flag-icons/css/flag-icons.min.css";
import "./forms.css";

export interface CountryComboboxProps {
  /** Stored value: a canonical ISO code, a tolerated legacy full name, or "" (not set). */
  value: string;
  /**
   * Emits a canonical ISO code (via normaliseCountry) on pick, or "" on clear — NEVER the raw
   * typed search text. Typing only filters; closing without picking leaves `value` untouched.
   */
  onChange: (next: string) => void;
  id?: string;
  placeholder?: string;
}

/**
 * Searchable single-select country combobox (Form 11) — GenreCombobox's single-select sibling,
 * sharing its .sa-aa-combo chrome and interaction model (outside-click/Escape close, Enter picks
 * the top match). Closed control shows flag + resolved name (legacy stored names resolve for
 * display and are not re-written unless the user picks). Open panel: search on top; with no query,
 * the QUICK_PICKS common markets + a clear row; with a query, the full COUNTRIES_ISO set filtered
 * by name or ISO code. Restricted to the canonical list — free text can never become the value.
 */
export const CountryCombobox: React.FC<CountryComboboxProps> = ({
  value,
  onChange,
  id,
  placeholder = "Not set",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Resolved display of the stored value: countryName handles codes AND legacy full names (which
  // pass through as their own display name); flagFor resolves both to the flag class or undefined.
  const selectedCode = normaliseCountry(value);
  const displayName = countryName(value);
  const displayFlag = flagFor(value);

  const quickOptions = useMemo(
    () => QUICK_PICKS.map((qc) => COUNTRIES_ISO.find((c) => c.code === qc)).filter(Boolean) as typeof COUNTRIES_ISO,
    [],
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? COUNTRIES_ISO.filter(
        (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().startsWith(q),
      )
    : [];

  const openPanel = () => {
    setQuery("");
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setQuery("");
    controlRef.current?.focus();
  };
  // The ONLY paths that emit: pick a row (canonical code) or clear (""). Raw text never leaves.
  const pick = (code: string) => {
    onChange(normaliseCountry(code) ?? "");
    close();
  };
  const clear = () => {
    onChange("");
    close();
  };

  const row = (c: { code: string; name: string }, hl: boolean) => (
    <div
      key={c.code}
      role="option"
      aria-selected={c.code === selectedCode}
      className={`sa-aa-combo-o sa-cc-o${c.code === selectedCode ? " sel" : ""}${hl ? " hl" : ""}`}
      onClick={() => pick(c.code)}
    >
      <span className={flagFor(c.code)} aria-hidden="true" />
      {c.name}
    </div>
  );

  return (
    <div className={`sa-aa-combo${open ? " open" : ""}`} ref={ref}>
      <button
        type="button"
        ref={controlRef}
        id={id}
        className="sa-aa-combo-control sa-cc-control"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
      >
        {displayName ? (
          <span className="sa-cc-val">
            {displayFlag && <span className={displayFlag} aria-hidden="true" />}
            {displayName}
          </span>
        ) : (
          <span className="sa-cc-ph">{placeholder}</span>
        )}
        <svg
          className="sa-cc-chev"
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="sa-aa-combo-menu sa-cc-menu" role="listbox">
          <div className="sa-cc-search">
            <input
              autoFocus
              value={query}
              placeholder="Search countries…"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (q && filtered.length) pick(filtered[0].code);
                } else if (e.key === "Escape") {
                  e.stopPropagation();
                  close();
                }
              }}
            />
          </div>
          {q ? (
            filtered.length ? (
              filtered.map((c, i) => row(c, i === 0))
            ) : (
              <div className="sa-aa-combo-empty">No country matches “{query.trim()}”</div>
            )
          ) : (
            <>
              <div className="sa-cc-group">Common</div>
              {quickOptions.map((c) => row(c, false))}
              {displayName && (
                <div role="option" aria-selected={false} className="sa-aa-combo-o sa-cc-clear" onClick={clear}>
                  Clear selection
                </div>
              )}
              <div className="sa-cc-hint">Start typing to find any other country.</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
