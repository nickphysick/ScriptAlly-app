/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TYPED SAMPLE CONTROL (Add an agent v2, design v15 — design-refs/add-agent-v2/add-agent-v2.html, `sampleTyped`, the
 * ref's `sx-*` parts). A shared part BESIDE the app's sample picker (`SampleControl`, controls.tsx), holding the same
 * `Sample`:
 *
 *   The first [ 7,500 ]   Pages | Words | Chapters
 *   Often asked for  3 chapters · 5 pages · 10 pages · 50 pages · 10,000 words
 *   - - - - - - - - - - - - - - - - - - - - - - - - - -
 *   From the opening.  [Sarah asks for a different part]      ← the link only with `parts`
 *
 * ⚠️ NO − AND + BUTTONS: the amount is typed; the up and down arrow keys change it by one.
 * ⚠️ `parts` IS OFF WHERE THE RECORD CANNOT KEEP A STARTING POINT. An agent's `materialsWanted` has no "from" form, so the
 *    add journey draws the opening only; a query's `Sample` does keep one (`from`, `sect`).
 * Model: lib/queryActions/sampleTyped.
 */
import React, { useState } from "react";
import type { Sample } from "../../lib/queryActions/sample";
import {
  COMMON_ASKS, TYPED_UNITS, TYPED_UNIT_LABEL, askOn, clampAmt, digitsOf, fmtAmt, fromUnitOf, withAsk, withUnit, type TypedUnit,
} from "../../lib/queryActions/sampleTyped";
import "./sampleTyped.css";

export interface SampleTypedProps {
  /** the id prefix (every workspace page stays mounted) */
  name: string;
  sample: Sample;
  onChange: (s: Sample) => void;
  /** the agent's first name, for "Sarah asks for a different part" */
  first: string;
  /** offer a starting point other than the opening — only where the record can keep one */
  parts?: boolean;
  /** data attribute prefix for probes */
  data?: string;
}

export const SampleTyped: React.FC<SampleTypedProps> = ({ name, sample: s, onChange, first, parts = false, data = "sx" }) => {
  const u: TypedUnit = s.unit === "none" ? "chapters" : s.unit;
  /* while typing, the field shows what was typed (digits, formatted as they come); on blur, the number */
  const [typing, setTyping] = useState<string | null>(null);
  const [atTyping, setAtTyping] = useState<string | null>(null);
  const step = (e: React.KeyboardEvent<HTMLInputElement>, cur: number, put: (n: number) => void) => {
    const k = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
    if (!k) return;
    e.preventDefault();
    put(cur + k);
  };
  const putAmt = (n: number) => { onChange({ ...s, unit: u, amt: clampAmt(n, u) }); setTyping(null); };
  const putAt = (n: number) => { onChange({ ...s, from: Math.max(1, Math.floor(n)) }); setAtTyping(null); };
  const at = s.fu ?? fromUnitOf(u);

  return (
    <div className="sx" data-sx="root" data-k={data}>
      <div className="sx-row">
        <span className="sx-w" data-sx="lead">{s.sect ? "Any" : "The first"}</span>
        <input id={`${name}-sx-n`} className="sx-n" data-sx="amt" inputMode="numeric" autoComplete="off" aria-label="How many"
          value={typing ?? fmtAmt(s.amt, u)}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const n = digitsOf(e.target.value);
            if (n == null) { setTyping(""); return; }
            const c = clampAmt(n, u);
            onChange({ ...s, unit: u, amt: c });
            setTyping(fmtAmt(c, u));
          }}
          onBlur={() => setTyping(null)}
          onKeyDown={(e) => step(e, s.amt, putAmt)} />
        <span className="sx-seg" role="radiogroup" aria-label="Counted in" data-sx="units">
          {TYPED_UNITS.map((x) => (
            <button key={x} type="button" role="radio" aria-checked={u === x} className={u === x ? "on" : ""} data-sx="unit" data-k={x}
              onClick={() => { onChange(withUnit({ ...s, unit: u }, x)); setTyping(null); }}>{TYPED_UNIT_LABEL[x]}</button>
          ))}
        </span>
      </div>
      <div className="sx-com" data-sx="common">
        <span>Often asked for</span>
        {COMMON_ASKS.map((c) => {
          const on = askOn({ ...s, unit: u }, c);
          return (
            <button key={`${c.unit}${c.amt}`} type="button" className={`laq-chip${on ? " is-on" : ""}`} aria-pressed={on} data-sx="ask" data-k={`${c.unit}:${c.amt}`}
              onClick={() => { onChange(withAsk(s, c)); setTyping(null); }}>
              {fmtAmt(c.amt, c.unit)} {c.amt === 1 ? c.unit.slice(0, -1) : c.unit}
            </button>
          );
        })}
      </div>
      <div className="sx-from" data-sx="from">
        {s.sect && parts
          ? <>
            Starting at {at}
            <input id={`${name}-sx-at`} className="sx-n sm" data-sx="at" inputMode="numeric" autoComplete="off" aria-label={`Starting at ${at}`}
              value={atTyping ?? String(s.from)}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => { const n = digitsOf(e.target.value); if (n == null) { setAtTyping(""); return; } onChange({ ...s, from: Math.max(1, n) }); setAtTyping(String(Math.max(1, n))); }}
              onBlur={() => setAtTyping(null)}
              onKeyDown={(e) => step(e, s.from, putAt)} />
            <button type="button" className="sx-lk" data-sx="to-opening" onClick={() => onChange({ ...s, sect: false, from: 1, fu: null })}>Back to the opening</button>
          </>
          : <>
            From the opening.
            {parts ? <button type="button" className="sx-lk" data-sx="to-part" onClick={() => onChange({ ...s, sect: true, from: s.from > 1 ? s.from : 1, fu: fromUnitOf(u) })}>{first} asks for a different part</button> : null}
          </>}
      </div>
    </div>
  );
};
