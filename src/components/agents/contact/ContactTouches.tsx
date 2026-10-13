/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CONTACT LIST'S TOUCHES (v14 §7): the live count, the A–Z rail, and the bar's density toggle and key sheet.
 * The other touches live where they act — the reflow and the dead end on the page (AgentList), the search mark and
 * the keyboard focus ring on the rows (ContactRows), the lifting labels on the shared table (shell/listTable).
 *
 * ⚠️ EVERY MOTION HERE IS OFF UNDER REDUCED MOTION, read at the moment it would run, never cached.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SHORTCUTS, isMac, keycaps } from "../../../lib/shortcuts";
import type { Density } from "../../../lib/contactListMemory";

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * §7.1 — THE LIVE COUNT: "Showing n of N" counts to its new value over about 380ms whenever it changes (an ease-out
 * cubic, the mock's own), instant under reduced motion and on first paint. While it counts it takes the slate ink.
 */
export const CountTo: React.FC<{ value: number }> = ({ value }) => {
  const [shown, setShown] = useState(value);
  const [ticking, setTicking] = useState(false);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return undefined;
    if (reducedMotion()) { setShown(value); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    setTicking(true);
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 380);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else window.setTimeout(() => setTicking(false), 300);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={ticking ? "cl14-ticking" : undefined} data-cl14-count={value}>{shown}</span>;
};

/* ⚠️ RETIRED (Contact list v16 baked decision 6): `ContactAzRail`, the A–Z rail down the sheet's right edge. */

/** The keyboard, drawn (a control whose meaning is its glyph is drawn, never typed — U+2328 is in none of our faces). */
const KeyboardMark: React.FC = () => (
  <svg viewBox="0 0 18 14" width="17" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
    <rect x="1" y="1.5" width="16" height="11" rx="2" />
    <path d="M4 5h1M7 5h1M10 5h1M13 5h1M4 7.5h1M7 7.5h1M10 7.5h1M13 7.5h1M5.5 10h7" strokeLinecap="round" />
  </svg>
);

/** One key-sheet line: the keycaps from the registry, never typed here. */
const KeyLine: React.FC<{ keys: string[]; label: string }> = ({ keys, label }) => (
  <span className="cl14-kbl">
    <span className="cl14-kbk">{keys.map((k) => <kbd key={k}>{k}</kbd>)}</span>
    <span>{label}</span>
  </span>
);

/**
 * §7.6 + §7.7 — THE BAR'S EXTRAS, on the ink: Comfortable / Compact (remembered for the visit), and the ⌨ key
 * sheet listing the list's keys (from the shared registry). Below 1440 the ⌨ hides (CSS).
 */
export const ContactBarExtras: React.FC<{ density: Density; onDensity: (d: Density) => void }> = ({ density, onDensity }) => {
  /* every chord the registry binds, as its own keycaps (j and ↓ are both "next") */
  const caps = (id: keyof typeof SHORTCUTS) => SHORTCUTS[id].chords.map((c) => keycaps(c, isMac()).join(""));
  return (
    <span className="cl14-xt" data-cl14="extras">
      <span className="cl14-dens" role="group" aria-label="Row density" data-cl14="density">
        {(["comfortable", "compact"] as const).map((d) => (
          <button key={d} type="button" className={density === d ? "on" : undefined} aria-pressed={density === d} data-cl14-dens={d} onClick={() => onDensity(d)}>
            {d === "comfortable" ? "Comfortable" : "Compact"}
          </button>
        ))}
      </span>
      <span className="cl14-kbh" tabIndex={0} role="button" aria-label="Keyboard shortcuts for the list" data-cl14="keys">
        <KeyboardMark />
        <span className="cl14-kbp" role="tooltip">
          <b>Keyboard</b>
          <KeyLine keys={caps("contactsDown").concat(caps("contactsUp"))} label="Move through the list" />
          <KeyLine keys={caps("contactsOpen")} label="Open the card" />
          <KeyLine keys={caps("contactsAct")} label="Start the next action" />
          <KeyLine keys={caps("contactsLetGo")} label="Let go" />
          <KeyLine keys={caps("contactsFind")} label="Find an agent" />
          <KeyLine keys={caps("contactsHk")} label="Housekeeping" />
        </span>
      </span>
    </span>
  );
};

/** §7.2 — THE GENTLE REFLOW: the first 14 rows fade and rise 8px, staggered 22ms. Never on first load; off under
 *  reduced motion. The Web Animations API, so no keyframe has to read a custom property. */
export function useReflow(container: React.RefObject<HTMLElement | null>, key: string): void {
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reducedMotion()) return;
    const rows = container.current ? [...container.current.querySelectorAll<HTMLElement>('[data-clv="row"]')].slice(0, 14) : [];
    rows.forEach((r, i) => {
      if (typeof r.animate !== "function") return;
      r.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 420, delay: i * 22, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
    });
  }, [key]);
}
