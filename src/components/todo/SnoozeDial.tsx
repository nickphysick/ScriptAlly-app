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
import {
  clampSnooze, reachableStops, snoozeCeilingDays, snoozeDateLabel, stopTitle, SNOOZE_STOPS,
} from "../../lib/todoActions";
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
  /** ⚠️ THE SLIDER TAKES FOCUS AND FIRES NOTHING — see the note on the body itself. */
  autoFocus?: boolean;
}

/** "TUE 11 AUG" — the mono half of the readout, terse beside the Playfair duration. */
export function dialDateShort(days: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
}

/** "Tuesday 11 August" — the resulting day, spelled. Now the SPOKEN form (`aria-valuetext`), where
 *  a screen reader gets the whole answer rather than the two halves the sighted reader gets. */
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
export const SnoozeDialBody: React.FC<SnoozeDialBodyProps> = ({ card, daysUntilDeadline, onSnooze, autoFocus }) => {
  /* ⚠️ THE TRACK IS THE WHOLE SCALE; `reachableStops` DECIDES ONLY HOW FAR THE KNOB GOES. Those
     are different questions and the dial used to answer both with one list — it rendered the
     reachable stops and nothing else, so a shortened track was the ONLY sign a ceiling existed.
     A track that quietly ends early hides the limit; a full one with its tail hatched explains it,
     which is the difference between "there is nothing past here" and "you may not go past here".
     One source still decides what is writable, and it is still `reachableStops`. */
  const reach = reachableStops(card, daysUntilDeadline);
  const ceiling = snoozeCeilingDays(card, daysUntilDeadline);
  const last = SNOOZE_STOPS.length - 1;
  const maxI = reach.length - 1;                       // −1 when nothing is reachable at all
  const [i, setI] = useState(0);                       // ⚠️ OPENS ON TOMORROW — the commonest move

  /* ⚠️ A DIAL WITH NOTHING TO CHOOSE IS NOT A DIAL. A deadline already past clamps the ceiling to
     zero, so there is no honest tier to offer — the surface says so rather than presenting a
     track that can only write the value you are trying to avoid. */
  const commit = (days: number) => {
    const stop = SNOOZE_STOPS.find((s) => s.days === days);
    const { days: d, when } = clampSnooze(card, days, stop?.label ?? `in ${days} days`, daysUntilDeadline);
    onSnooze(d, when);
  };

  const at = Math.max(0, Math.min(i, maxI));
  const cur = SNOOZE_STOPS[at];
  const pctOf = (n: number) => (n / last) * 100;

  /**
   * ⚠️ `Shift`+ARROW TRAVELS THE PRINTED AXIS — 1D · 1W · 1M · 3M, the very marks under the track.
   * A jump the reader cannot see the destination of is a jump they have to learn; these are drawn
   * on the ruler. Clamped to the ceiling like every other movement, so a shortcut can never reach
   * where a drag may not.
   */
  const axisJump = (dir: 1 | -1) => {
    const marks = SNOOZE_STOPS.map((s, n) => (s.axis ? n : -1)).filter((n) => n >= 0);
    const next = dir === 1
      ? marks.find((n) => n > at) ?? maxI
      : [...marks].reverse().find((n) => n < at) ?? 0;
    setI(Math.max(0, Math.min(next, maxI)));
  };

  return (
    <>
      {maxI < 0 ? (
        <>
          <div className="snz-v snz-vsolo">Not at all</div>
          <p className="snz-cap">This one cannot be put off — its date has already passed.</p>
        </>
      ) : (
        <>
          {/* ⚠️ TWO FACTS, TWO REGISTERS. The Playfair says how LONG ("3 weeks" — the thing twelve
              stops made worth stating), the mono says WHICH DAY. The dial's founding rule is that
              the resulting date is named before you commit to it; it is named here and again on
              the button. Printing the same date twice in two fonts would state one fact twice and
              leave the other unsaid. */}
          <div className="snz-read">
            <span className="snz-v">{stopTitle(cur.tick)}</span>
            <span className="snz-date">{dialDateShort(cur.days)}</span>
          </div>

          <div className="snz-track">
            <span className="snz-fill" style={{ width: `${pctOf(at)}%` }} />
            {/* ⚠️ THE HATCH IS THE CEILING, DRAWN. It takes no pointer events: the transparent
                range beneath it must still receive a click on the reachable part of the track. */}
            {maxI < last && (
              <span className="snz-bar" style={{ left: `${pctOf(maxI)}%` }} aria-hidden />
            )}
            {SNOOZE_STOPS.map((s, n) => (
              <span
                key={s.days}
                className={`snz-stop${n <= at ? " past" : ""}${n > maxI ? " out" : ""}`}
                style={{ left: `${pctOf(n)}%` }}
              />
            ))}
            <span className="snz-knob" style={{ left: `${pctOf(at)}%` }} />
            {/* the operable layer: transparent, exactly over the painted track. ⚠️ ITS `max` IS THE
                CEILING, so the knob STOPS there rather than travelling and being pulled back — a
                control that accepts a value and then writes a different one is the failure
                `clampSnooze` exists to catch, and it is still called on the way out. */}
            <input
              className="snz-range"
              type="range"
              autoFocus={autoFocus}
              min={0}
              max={maxI}
              step={1}
              value={at}
              aria-label="How long to put it off"
              aria-valuetext={`${cur.tick} — ${dialDateLine(cur.days)}`}
              onChange={(e) => setI(Number(e.target.value))}
              onKeyDown={(e) => {
                /* ⚠️ ENTER COMMITS, AND THAT IS WHY THE SLIDER TAKES FOCUS. Open, press Enter,
                   the thing is put off until tomorrow — the commonest move, and reversible from
                   the receipt, which is what makes a one-key commit honest. */
                if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); commit(cur.days); return; }
                if (!e.shiftKey) return;                       // plain arrows are the platform's
                if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); axisJump(1); }
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); axisJump(-1); }
              }}
            />
          </div>

          {/* ⚠️ FOUR MARKS, NOT TWELVE. Twelve labels under this track collide into a smear; the
              axis is what makes a scale readable, and `axis` on the stop table is what keeps each
              mark on the stop it names. A mark past the ceiling is dimmed, not removed — the
              scale must stay the same scale whatever a given card allows. */}
          <div className="snz-ticks">
            {SNOOZE_STOPS.map((s, n) => s.axis && (
              <span
                key={s.days}
                className={`${n === at ? "on" : ""}${n > maxI ? " out" : ""}`}
                style={{ left: `${pctOf(n)}%` }}
              >{s.axis}</span>
            ))}
          </div>

          <div className="snz-foot">
            {/* ⚠️ THE BUTTON CARRIES THE DATE IT WILL WRITE — one formatter with the receipt, so
                what you press and what you are then told cannot name different days. */}
            <button type="button" className="snz-go" onClick={() => commit(cur.days)}>
              Snooze until {snoozeDateLabel(cur.days)}
            </button>
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
      {/* ⚠️ THE SLIDER TAKES FOCUS HERE TOO, and until now nothing did: `s` opened this popover
          and left focus on the ROW, so the arrow keys the dial exists to be driven by were still
          talking to the list behind it. The keyboard path was advertised and not wired. */}
      <SnoozeDialBody card={card} daysUntilDeadline={daysUntilDeadline} onSnooze={onSnooze} autoFocus />
    </div>,
    document.body,
  );
};
