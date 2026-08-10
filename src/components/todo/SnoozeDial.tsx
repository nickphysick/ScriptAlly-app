/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SnoozeDial — putting something off, with the date said out loud first (tasks-consolidation,
 * Phase 4; ref design-refs/tasks-page.html, the dial; design-refs/tasks-states.html's snooze note).
 *
 * ⚠️ THE DIAL NAMES THE RESULTING DATE BEFORE YOU COMMIT TO IT. That is the whole reason it
 * replaced a tier menu: "Give it a week" is a promise about a date you then have to work out for
 * yourself, and the one thing a writer wants to know before putting an agent's request away is
 * exactly which morning it comes back. The Playfair line is therefore the dial's headline, not a
 * caption under the control.
 *
 * ⚠️ THE CEILING IS THE TRACK'S OWN LENGTH — the knob cannot reach a tier it is not allowed to
 * write. `reachableStops` applies `snoozeCeilingDays`, so an offer's dial has ONE stop and a
 * deadline's ends at the deadline. A control that let you choose a value and then quietly wrote a
 * different one is the failure `clampSnooze` exists to catch; here the clamp should never have to
 * fire, and it is still called on the way out, because a guard you rely on being unnecessary is
 * a guard you have stopped having.
 *
 * ⚠️ IT IS A RANGE INPUT UNDER A PAINTED TRACK, and that is a deliberate choice over a pointer-
 * drag handler. Dragging, clicking anywhere on the track, arrow keys, Home/End and every
 * assistive technology come free and correct from the platform; a bespoke `pointermove` gives
 * only the first two and has to reimplement the rest badly. The input is transparent and covers
 * the track exactly; what you see is ours, what you operate is the browser's.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BoardCard } from "../../lib/todoBoard";
import { clampSnooze, reachableStops, snoozeCeilingDays } from "../../lib/todoActions";
import { placeMenu } from "../../lib/todoMenu";
import { BrandDatePicker } from "../forms";
import "./snoozeDial.css";

export interface SnoozeDialProps {
  card: BoardCard;
  anchor: HTMLElement;
  /** Days remaining on a deadline, where the card has one — the dial stops there. */
  daysUntilDeadline?: number;
  /** The one write, already clamped and re-labelled. */
  onSnooze: (days: number, when: string) => void;
  onClose: (returnFocus: boolean) => void;
}

export interface SnoozeDialBodyProps {
  card: BoardCard;
  daysUntilDeadline?: number;
  onSnooze: (days: number, when: string) => void;
}

/** "Tuesday 11 August" — the resulting day, spelled, because a writer plans in weekdays. */
export function dialDateLine(days: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const daysBetween = (from: Date, isoDay: string): number => {
  const [y, m, d] = isoDay.split("-").map(Number);
  const target = new Date(y, (m ?? 1) - 1, d ?? 1);
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86400000);
};

/**
 * ⚠️ THE CONTROL, SEPARATED FROM ITS CONTAINER — and this is the whole of Phase 2's structural
 * work. The dial is now worn by TWO surfaces: its own portalled popover (the `s` key, and
 * Snoozed's "Change the date…") and, inline, the split button's menu. Extracting the body is what
 * lets both be the SAME dial rather than two that drift; a second slider built for the menu is
 * precisely what the pack forbade, and copying this one would have been that in all but name.
 *
 * What stays outside: the portal, the placement and the closers. Those are a POPOVER's concerns,
 * and the menu already has its own — it is placed by `placeMenu`, closed by its own outside-press
 * and Escape. Pushing them down here would give the inline copy a second set fighting the first.
 */
export const SnoozeDialBody: React.FC<SnoozeDialBodyProps> = ({ card, daysUntilDeadline, onSnooze }) => {
  const stops = reachableStops(card, daysUntilDeadline);
  const ceiling = snoozeCeilingDays(card, daysUntilDeadline);
  const [i, setI] = useState(0);

  /* ⚠️ A DIAL WITH NOTHING TO CHOOSE IS NOT A DIAL. A deadline already past clamps the ceiling to
     zero, so there is no honest tier to offer — the surface says so rather than presenting a
     track that can only write the value you are trying to avoid. */
  const commit = (days: number) => {
    const stop = stops.find((s) => s.days === days);
    const { days: d, when } = clampSnooze(card, days, stop?.label ?? `in ${days} days`, daysUntilDeadline);
    onSnooze(d, when);
  };

  const cur = stops[Math.min(i, Math.max(0, stops.length - 1))];
  const pct = stops.length > 1 ? (i / (stops.length - 1)) * 100 : 0;

  return (
    <>
      {stops.length === 0 ? (
        <>
          <div className="snz-v">Not at all</div>
          <p className="snz-cap">This one cannot be put off — its date has already passed.</p>
        </>
      ) : (
        <>
          <div className="snz-v">{dialDateLine(cur.days)}</div>

          <div className="snz-track">
            <span className="snz-fill" style={{ width: `${pct}%` }} />
            {stops.map((s, n) => (
              <span
                key={s.days}
                className={`snz-stop${n <= i ? " past" : ""}`}
                style={{ left: `${stops.length > 1 ? (n / (stops.length - 1)) * 100 : 0}%` }}
              />
            ))}
            <span className="snz-knob" style={{ left: `${pct}%` }} />
            {/* the operable layer: transparent, exactly over the painted track */}
            <input
              className="snz-range"
              type="range"
              min={0}
              max={Math.max(0, stops.length - 1)}
              step={1}
              value={Math.min(i, stops.length - 1)}
              aria-label="How long to put it off"
              aria-valuetext={`${cur.tick} — ${dialDateLine(cur.days)}`}
              onChange={(e) => setI(Number(e.target.value))}
            />
          </div>

          <div className="snz-ticks">
            {stops.map((s, n) => (
              <span key={s.days} className={n === i ? "on" : undefined}>{s.tick}</span>
            ))}
          </div>

          <div className="snz-foot">
            <button type="button" className="snz-go" onClick={() => commit(cur.days)}>Snooze</button>
            {/* ⚠️ ONE PICKER, APP-WIDE — the ceiling rides in as `max`, so an exact date can never
                be chosen past a limit the track already refuses. */}
            <span className="snz-pick">
              <BrandDatePicker
                variant="hub"
                value=""
                placeholder="Pick a date…"
                ariaLabel="Pick a return date"
                min={ymd(new Date(Date.now() + 86400000))}
                max={ymd(new Date(Date.now() + ceiling * 86400000))}
                onChange={(iso) => { if (iso) commit(Math.max(1, daysBetween(new Date(), iso))); }}
              />
            </span>
          </div>

          {/* ⚠️ THE CAPTION EXPLAINS THE CEILING WHERE ONE BITES, and says nothing where none
              does — a standing note about limits that do not apply teaches a rule the writer
              will then look for and not find. */}
          {card.taskType === "offer_received" ? (
            <p className="snz-cap">Offers stop at tomorrow — an offer left waiting is an offer at risk.</p>
          ) : typeof daysUntilDeadline === "number" ? (
            <p className="snz-cap">This one stops at its deadline. Putting it off past that is the app helping you miss it.</p>
          ) : null}
        </>
      )}
    </>
  );
};

/**
 * ⚠️ THE POPOVER THE BODY WEARS AT ITS OWN CALL SITES — the `s` key and Snoozed's "Change the
 * date…". Nothing about the control changed when the menu learned to wear it too: this keeps the
 * portal, the placement and the closers, and the dial inside is the same component the menu draws.
 */
export const SnoozeDial: React.FC<SnoozeDialProps> = ({ card, anchor, daysUntilDeadline, onSnooze, onClose }) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  /* Placed after first paint, from the trigger's own rect — the same `placeMenu` the ⋯ menu uses,
     so the two surfaces flip off the viewport's bottom edge by identical arithmetic. The deps are
     the inputs the CONTENT's height depends on; the stop list is derived from them by a pure
     function, so naming them names it. */
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const p = placeMenu(r, { w: b.width, h: b.height }, { w: window.innerWidth, h: window.innerHeight });
    setPos({ left: p.left, top: p.top });
  }, [anchor, card, daysUntilDeadline]);

  /* The closers, matching PortalMenu's: outside press, Escape (focus returns), scroll, resize. */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (elRef.current?.contains(t) || anchor.contains(t))) return;
      onClose(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(true); }
    };
    const away = () => onClose(false);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", away);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", away);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={elRef}
      className="snz-dial"
      role="dialog"
      aria-label={`Put “${card.title}” off until`}
      style={pos ? { left: pos.left, top: pos.top } : { opacity: 0, pointerEvents: "none" }}
    >
      <div className="snz-k">PUT IT OFF UNTIL</div>
      <SnoozeDialBody card={card} daysUntilDeadline={daysUntilDeadline} onSnooze={onSnooze} />
    </div>,
    document.body,
  );
};
