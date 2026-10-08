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
import { createPortal } from "react-dom";
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

/**
 * §7.4 — THE A–Z RAIL: 26 wide, fixed at the sheet's right edge, vertically centred, frosted white. It shows only
 * while the list's letter panel fills the middle of the scroller and Grouping is Letter; the current letter is
 * filled ink and letters with no agents are faint. Clicking or dragging along it jumps; a teardrop bubble names the
 * letter while dragging.
 * ⚠️ PORTALLED TO <body>, SO IT IS GATED ON THE ROUTE BEING ON SCREEN — a portal outlives its page under the
 * display-toggling shell (the house law). Its state is DERIVED from the boxes on every scroll, never an observer.
 */
const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const ContactAzRail: React.FC<{
  active: boolean;
  byLetter: boolean;
  /** the list column — the rail reads its panel and dividers */
  listRef: React.RefObject<HTMLElement | null>;
  letters: ReadonlySet<string>;
}> = ({ active, byLetter, listRef, letters }) => {
  const [show, setShow] = useState(false);
  const [cur, setCur] = useState<string | null>(null);
  const [bubble, setBubble] = useState<{ l: string; y: number } | null>(null);
  const railRef = useRef<HTMLElement>(null);
  const scrub = useRef(false);

  useEffect(() => {
    if (!active || !byLetter) { setShow(false); return undefined; }
    const sc = listRef.current?.closest<HTMLElement>(".wpg-scroll");
    if (!sc) return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const panel = listRef.current?.querySelector<HTMLElement>(".lt-panel");
      const h = sc.getBoundingClientRect();
      if (!panel || h.height === 0) { setShow(false); return; }
      const r = panel.getBoundingClientRect();
      setShow(r.top < h.top + h.height * 0.45 && r.bottom > h.top + h.height * 0.55);
      let l: string | null = null;
      for (const d of panel.querySelectorAll<HTMLElement>('[data-clv="band"][data-letter]')) {
        if (d.getBoundingClientRect().top - h.top <= 110) l = d.dataset.letter ?? null; else break;
      }
      setCur((c) => (c === l ? c : l));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    sc.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    read();
    return () => { sc.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [active, byLetter, listRef, letters]);

  const jump = (l: string) => {
    const d = listRef.current?.querySelector<HTMLElement>(`[data-clv="band"][data-letter="${l}"]`);
    /* the divider's own scroll-margin lands it just under the pinned labels (shell/listTable) */
    d?.scrollIntoView({ block: "start", behavior: "auto" });
  };
  const hit = (clientY: number): { l: string; y: number } | null => {
    const rail = railRef.current;
    if (!rail) return null;
    const r = rail.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, clientY) as HTMLElement | null;
    const l = el?.dataset?.azl;
    if (!el || !l || !letters.has(l)) return null;
    return { l, y: el.offsetTop + el.offsetHeight / 2 };
  };

  if (!active || typeof document === "undefined") return null;
  return createPortal(
    <nav
      ref={railRef} className={`cl14-azr${show ? " show" : ""}`} data-cl14="rail" aria-label="Jump to letter"
      aria-hidden={!show || undefined} inert={!show || undefined}
      onPointerDown={(e) => {
        const h = hit(e.clientY);
        if (!h) return;
        scrub.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setBubble(h);
        jump(h.l);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (!scrub.current) return;
        const h = hit(e.clientY);
        if (h) { setBubble(h); jump(h.l); }
      }}
      onPointerUp={() => { scrub.current = false; setBubble(null); }}
      onPointerCancel={() => { scrub.current = false; setBubble(null); }}
    >
      <span className={`cl14-azb${bubble ? " on" : ""}`} style={bubble ? { top: bubble.y } : undefined} aria-hidden="true">
        <span>{bubble?.l}</span>
      </span>
      {AZ.map((l) => (
        <button
          key={l} type="button" data-azl={l} tabIndex={show && letters.has(l) ? 0 : -1}
          className={`${letters.has(l) ? "" : "off"}${l === cur ? " on" : ""}`.trim() || undefined}
          aria-label={letters.has(l) ? `Jump to ${l}` : `No agents under ${l}`} disabled={!letters.has(l)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jump(l); } }}
        >
          {l}
        </button>
      ))}
    </nav>,
    document.body,
  );
};

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
