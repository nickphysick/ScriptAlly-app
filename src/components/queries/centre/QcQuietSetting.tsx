/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §1.4 — the quiet window setting: a small settings button in the navy banner opening the pop-over
 * `query-states-v2.html` draws ("When does a query go quiet?", 2 · 3 · 4 · 6 · 8 weeks, "after your nudge").
 * It writes one leaf, `todoPrefs.queries.quietWeeks`, and changes states only, never stored data. No keyboard hints.
 *
 * v153.2 — the trigger is words, not a gear: "Gone quiet after 8 weeks", the weeks being the live setting. The whole
 * phrase is one button; it opens the same pop-over.
 */
import React, { useEffect, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { QUIET_WEEKS } from "../../../lib/queryState";

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
      <button type="button" className="qc152-setbtn qc1532-qw" aria-expanded={open} aria-haspopup="dialog"
        disabled={disabled} onClick={() => setOpen((o) => !o)}><span>Gone quiet after</span> <b>{weeks} weeks</b></button>
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
