/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §1.4 — the quiet window setting: a small settings button in the navy banner opening the pop-over
 * `query-states-v2.html` draws ("When does a query go quiet?", 2 · 3 · 4 · 6 · 8 weeks, "after your nudge").
 * It writes one leaf, `todoPrefs.queries.quietWeeks`, and changes states only, never stored data. No keyboard hints.
 */
import React, { useEffect, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { QUIET_WEEKS } from "../../../lib/queryState";

const GEAR = (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="10" cy="10" r="2.6" />
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
  </svg>
);

export const QcQuietSetting: React.FC<{ weeks: number; onSet: (w: number) => void; disabled?: boolean }> = ({ weeks, onSet, disabled }) => {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEscapeLayer(open, () => setOpen(false), ESC_LEVEL.page);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open]);
  return (
    <div className="qc152-set" ref={wrap} data-qc152="quiet-setting">
      <button type="button" className="qc152-setbtn" aria-label="Query Centre settings" aria-expanded={open} aria-haspopup="dialog"
        disabled={disabled} onClick={() => setOpen((o) => !o)}>{GEAR}</button>
      {open ? (
        <div className="qc152-setpop" role="dialog" aria-label="When does a query go quiet?" data-qc152="quiet-pop">
          <b>When does a query go quiet?</b>
          <div className="qc152-sg" role="radiogroup" aria-label="Quiet window">
            {QUIET_WEEKS.map((w) => (
              <button key={w} type="button" role="radio" aria-checked={w === weeks} className={w === weeks ? "on" : undefined}
                data-weeks={w} onClick={() => onSet(w)}>{w} weeks</button>
            ))}
          </div>
          <span className="qc152-setaf">after your nudge</span>
          <em>Applies to every query; changes nothing already closed.</em>
        </div>
      ) : null}
    </div>
  );
};
