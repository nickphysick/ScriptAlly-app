/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Country picker for the flip editor — a CONSTRAINED control over src/lib/territory.ts.
 *
 * Written fresh rather than reusing forms/CountryCombobox: that component's Form-11 chrome (0.5px
 * #e0d5c8 border, 9px radius, inset shadow, sage focus ring) would have to be overridden on five
 * properties to sit between Email and Submissions page here, which is fighting its layout rather
 * than reusing it. The BEHAVIOUR CONTRACT is deliberately identical: `value` accepts a canonical
 * ISO code, a tolerated legacy full name, or ""; `onChange` emits a canonical ISO code (through
 * normaliseCountry) or "" to clear — NEVER raw typed text. Deployed rules validate the stored value
 * with isKnownCountry, so a free-text field here would produce writes the rules reject at Done.
 *
 * ESCAPE, STAGE 1: while the menu is open this listens on the CAPTURE phase and calls
 * stopImmediatePropagation, so it closes itself and the page's bubble-phase handler never sees the
 * key — the draft is never discarded by dismissing a dropdown.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES_ISO, QUICK_PICKS, countryName, flagFor, normaliseCountry } from "../../lib/territory";
import "flag-icons/css/flag-icons.min.css";

interface AgentCountryPickerProps {
  /** Stored value: an ISO code, a legacy full name, or "". */
  value: string;
  /** Emits a canonical ISO code, or "" when cleared. */
  onChange: (next: string) => void;
  id?: string;
}

export const AgentCountryPicker: React.FC<AgentCountryPickerProps> = ({ value, onChange, id }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const code = normaliseCountry(value) || "";
  const label = countryName(value) || "";
  const flag = flagFor(value);

  // Stage 1 of the Escape cascade — capture phase, and the event stops dead here.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(false);
      setQuery("");
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? COUNTRIES_ISO.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q) : []),
    [q],
  );
  const quick = useMemo(
    () => QUICK_PICKS.map((k) => COUNTRIES_ISO.find((c) => c.code === k)).filter(Boolean) as { code: string; name: string }[],
    [],
  );

  const pick = (next: string) => {
    onChange(next ? normaliseCountry(next) || "" : "");
    setOpen(false);
    setQuery("");
  };

  const option = (c: { code: string; name: string }) => (
    <button type="button" key={c.code} role="option" aria-selected={c.code === code}
      className={`agl-cc-o${c.code === code ? " sel" : ""}`} onClick={() => pick(c.code)}>
      <span className={flagFor(c.code) || ""} aria-hidden="true" />
      <span>{c.name}</span>
    </button>
  );

  return (
    <div className={`agl-cc${open ? " open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="agl-cc-control"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {flag && <span className={flag} aria-hidden="true" />}
        {label ? <span>{label}</span> : <span className="ph">Not set</span>}
        <svg className="chev" width="10" height="7" viewBox="0 0 10 7" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="agl-cc-menu" role="listbox" aria-label="Country">
          <input
            ref={searchRef}
            type="text"
            className="agl-in"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries…"
            aria-label="Search countries"
            style={{ marginBottom: 6 }}
          />
          {q ? (
            filtered.length ? filtered.slice(0, 40).map(option) : <div className="agl-cc-empty">No country matches “{query.trim()}”.</div>
          ) : (
            <>
              <div className="grp">Common</div>
              {quick.map(option)}
              {code && (
                <button type="button" className="agl-cc-o" onClick={() => pick("")}>
                  <span>Clear country</span>
                </button>
              )}
              <div className="grp">Start typing to find any other country</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
