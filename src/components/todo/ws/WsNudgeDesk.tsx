/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v2 (design-refs/todo-nudge-desk-v2/) — THE DESKTOP NUDGE DESK, round the three things the writer
 * needs, top to bottom: it's overdue (the hawk beside one headline); you send the nudge yourself and confirm it ("I've
 * sent it"); tell us when (Today / Yesterday / Another day). Nothing folds, glides or moves position. Nothing is saved
 * here: the footer's Log it runs the flow's own commit (`saveNudgeSent`), enabled once both steps are done.
 * The words and shapes are lib/todoNudgeDesk's (pure, locked).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { addDays } from "../../../lib/queryActions/dates";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { openingMonth } from "../../../lib/monthGrid";
import { MonthGrid } from "../../shared/MonthGrid";
import { nudgeAnswers, nudgeDayWord, nudgeTimeline, shortDate, type TimelineShape } from "../../../lib/todoNudgeDesk";
import { stageVars, type WsTask } from "../../../lib/todoWs";
import { STAGE_COLOURS, type Stage } from "../../../lib/stageColours";
import type { NudgeDesk } from "./wsFlows";

const MENTOR = "/images/todo/mentor.webp";
const TICK = <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" /></svg>;
/** the answers' plain navy outline icons (no tile behind them): sun, history clock, calendar */
const ICON: Record<"today" | "yesterday" | "other", React.ReactNode> = {
  today: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></svg>,
  yesterday: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /><path d="M12 8v4l3 2" /></svg>,
  other: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>,
};

export const WsNudgeDesk: React.FC<{ t: WsTask; nd: NudgeDesk; today: Date; stage: Stage | null; otherOpen: boolean; setOtherOpen: (o: boolean) => void }> = ({ t, nd, today, stage, otherOpen, setOtherOpen }) => {
  const first = nd.facts.first;
  const answers = nudgeAnswers(today, nd.when === "other" ? nd.picked : null);
  /* "Another day" opens the picker (the page holds whether it is open, so key 3 can open it); nothing changes until a
     day is set there */
  const choose = (k: "today" | "yesterday" | "other") => {
    if (!nd.sent) return;
    if (k === "other") { setOtherOpen(true); return; }
    setOtherOpen(false);
    nd.pick(k);
  };
  const s1 = nd.sent ? "done" : "on";
  const s2 = !nd.sent ? "off" : nd.picked ? "done" : "on";
  return (
    <div className="twn2" data-twn="desk">
      {/* 1 · it's overdue: the hawk beside one headline, no speech bubble */}
      <div className="twn2-ctx" data-twn="context">
        <img src={MENTOR} alt="" />
        <div><h2>{first}’s reply is <em>overdue</em>.</h2><p>Send a nudge, then log it below.</p></div>
      </div>

      {/* the timeline, there from the start; a pick adds the nudge and the next reminder */}
      <NudgeTimeline first={first} picked={nd.picked} shape={nudgeTimeline(nd.facts, nd.picked, nd.then, today)}
        style={stageVars(stage, t.query?.status) as Record<string, string> | undefined} stage={stage} />

      {/* 2 and 3 · you send it yourself and confirm it; then tell us when */}
      <div className="twn2-steps" data-twn="steps">
        <div className="twn2-stp" data-st={s1} data-twn-step="send">
          <span className="twn2-num" aria-hidden="true">{nd.sent ? TICK : "1"}</span>
          <div className="twn2-tx"><b>Send {first} a nudge</b><small>From your own email, the way you sent the query: a short note asking if it reached them.</small></div>
          <button type="button" className={nd.sent ? "sp-btn sp-btn--fill twn2-sent" : "sp-btn sp-btn--line twn2-sent"} data-twn="sent" aria-pressed={nd.sent} onClick={nd.confirm}>
            {nd.sent ? <>{TICK}Sent</> : "I’ve sent it"}
          </button>
        </div>
        <div className="twn2-stp" data-st={s2} data-twn-step="when" aria-disabled={!nd.sent || undefined}>
          <span className="twn2-num" aria-hidden="true">{nd.picked ? TICK : "2"}</span>
          <div className="twn2-tx">
            <b>When did you send it?</b>
            {nd.picked ? <small data-twn="nudged">You nudged {first} <b>{nudgeDayWord(nd.picked, today)}</b>. Next reminder <b>{shortDate(nd.then)}</b>.</small> : null}
          </div>
          <span />
          <div className="twn2-chs" role="radiogroup" aria-label={`When did you send ${first} the nudge?`} data-twn="answers">
            {answers.map((a) => (
              <button key={a.k} type="button" className="twn2-ch" role="radio" aria-checked={nd.when === a.k} data-twn-when={a.k}
                aria-haspopup={a.k === "other" ? "dialog" : undefined} aria-expanded={a.k === "other" ? otherOpen : undefined}
                disabled={!nd.sent} tabIndex={nd.sent ? 0 : -1} onClick={() => choose(a.k)}>
                <span className="twn2-ic">{ICON[a.k]}</span><b>{a.title}</b><small>{a.sub}</small>
              </button>
            ))}
            {nd.sent && otherOpen ? (
              <NudgeCalendar today={today} min={nd.facts.sent ?? addDays(today, -730)} value={nd.when === "other" ? nd.picked : null}
                onPick={(d) => { setOtherOpen(false); nd.pick("other", d); }} onClose={() => setOtherOpen(false)} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

/** the plumage colours the line reads (lib/stageColours): slate for the wait, blush and rust for the overdue stretch */
const PLUMAGE = {
  "--twn-slate": STAGE_COLOURS.full.rim, "--twn-slate-l": STAGE_COLOURS.full.edge,
  "--twn-hatch-a": STAGE_COLOURS.partial.edge, "--twn-hatch-b": STAGE_COLOURS.partial.bandRequested, "--twn-rust": STAGE_COLOURS.partial.rim,
};
const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * v2 Phase 2 — THE TIMELINE, THERE FROM THE START. The banded card (white, the hairline, a soft shadow, radius 14, the
 * band in the query card head's stage colour), full width. "{First}'s timeline" until a day is picked, then "{First}'s
 * updated timeline". On a pick (or a changed day) only the new parts animate: the title cross-fades, "You nudged" drops
 * in, the dashed run draws, the next reminder pops in. They are keyed by the day, so a changed day replays them; the card
 * itself never replays or moves.
 */
const NudgeTimeline: React.FC<{ first: string; picked: Date | null; shape: TimelineShape; style: Record<string, string> | undefined; stage: Stage | null }> = ({ first, picked, shape: s, style, stage }) => {
  const pc = (n: number) => `${n}%`;
  const day = picked ? ymd(picked) : "none";
  /* labels in one row slide apart when dates sit close (nudge desk v1's pass, measured: they collided at 1280 and 1512) */
  const lineRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    const W = line.clientWidth, PAD = 18, GAP = 8;
    for (const row of ["twn-up", "twn-dn"]) {
      const items = [...line.querySelectorAll<HTMLElement>(`.twn-l.${row}`)].map((el) => {
        el.style.setProperty("--twn-dx", "0px");
        const x = (parseFloat(el.dataset.twnX ?? "0") / 100) * W, w = el.offsetWidth;
        const left = el.classList.contains("twn-end") ? x + 8 - w : el.classList.contains("twn-lft") ? x - 8 : x - w / 2;
        return { el, left, w, dx: 0 };
      }).sort((a, b) => a.left - b.left);
      for (let i = items.length - 2; i >= 0; i--) {
        const a = items[i], b = items[i + 1];
        const over = a.left + a.dx + a.w + GAP - (b.left + b.dx);
        if (over > 0) a.dx -= over;
        if (a.left + a.dx < -PAD) a.dx = -PAD - a.left;
      }
      for (let i = 1; i < items.length; i++) {
        const a = items[i - 1], b = items[i];
        const over = a.left + a.dx + a.w + GAP - (b.left + b.dx);
        if (over > 0) b.dx += over;
      }
      for (const it of items) it.el.style.setProperty("--twn-dx", `${Math.round(it.dx)}px`);
    }
  });
  return (
    <div className="twn-tl" data-twn="timeline" data-twn-picked={picked ? "" : undefined} data-tws58-stage={stage ?? undefined} style={{ ...(style ?? {}), ...PLUMAGE } as React.CSSProperties}>
      <h5 className="twn-band" data-twn="band"><span key={picked ? "upd" : "now"} className="twn-ttl">{first}’s {picked ? "updated timeline" : "timeline"}</span></h5>
      <div className="twn-line" data-twn="line" ref={lineRef}>
        <span className="twn-seg twn-s1" style={{ left: pc(s.solid.from), width: pc(s.solid.to - s.solid.from) }} />
        {s.hatch ? <span className="twn-seg twn-s2" style={{ left: pc(s.hatch.from), width: pc(s.hatch.to - s.hatch.from) }} /> : null}
        <span className="twn-p" data-twn-pt="start" style={{ left: pc(s.start.x) }} />
        <span className="twn-l twn-dn twn-lft" data-twn-lab="start" data-twn-x={s.start.x} style={{ left: pc(s.start.x) }}>{s.start.label}<b>{s.start.date}</b></span>
        {s.due ? <>
          <span className="twn-p" data-twn-pt="due" style={{ left: pc(s.due.x) }} />
          <span className="twn-l twn-dn" data-twn-lab="due" data-twn-x={s.due.x} style={{ left: pc(s.due.x) }}>{s.due.label}<b>{s.due.date}</b></span>
        </> : null}
        {s.hatch ? <span className="twn-l twn-up twn-ago" data-twn-lab="ago" data-twn-x={(s.hatch.from + s.hatch.to) / 2} style={{ left: pc((s.hatch.from + s.hatch.to) / 2) }}><i>No reply for {s.hatch.ago}</i></span> : null}
        {s.today ? <>
          <span className="twn-p twn-now" data-twn-pt="today" style={{ left: pc(s.today.x) }} />
          <span className="twn-l twn-dn" data-twn-lab="today" data-twn-x={s.today.x} style={{ left: pc(s.today.x) }}><b>Today</b></span>
        </> : null}
        {s.nudge && s.next && s.dashed ? (
          <React.Fragment key={day}>
            <span className="twn-seg twn-s3" style={{ left: pc(s.dashed.from), width: pc(s.dashed.to - s.dashed.from) }} />
            <span className="twn-p twn-nud" data-twn-pt="nudge" style={{ left: pc(s.nudge.x) }} />
            <span className="twn-l twn-dn twn-nw" data-twn-lab="nudge" data-twn-x={s.nudge.x} style={{ left: pc(s.nudge.x) }}>You nudged<b>{s.nudge.date}</b></span>
            <span className="twn-p twn-next" data-twn-pt="next" style={{ left: pc(s.next.x) }} />
            <span className="twn-l twn-up twn-end" data-twn-lab="next" data-twn-x={s.next.x} style={{ left: `calc(${pc(s.next.x)} + 8px)` }}>Next reminder<b>{s.next.date}</b></span>
          </React.Fragment>
        ) : null}
      </div>
    </div>
  );
};

/**
 * v2 Phase 3 — THE CALENDAR FOR "ANOTHER DAY": a popover anchored above the answers row, right-aligned to it (320px, the
 * app's popover surface), so it never pushes the layout. The month grid is the shared primitive (components/shared/
 * MonthGrid): the arrows stop at the month the query was sent and at this month; days after today and before the send
 * are not open. A pick closes it and sets the answer; a click outside, or Esc, closes it and changes nothing — Esc is the
 * popover's own layer (ESC_LEVEL.page), so it never reaches the page's "Where to start" Esc while the popover is open.
 */
const NudgeCalendar: React.FC<{ today: Date; min: Date; value: Date | null; onPick: (d: Date) => void; onClose: () => void }> = ({ today, min, value, onPick, onClose }) => {
  const [month, setMonth] = useState(() => openingMonth(value, min, today));
  const ref = useRef<HTMLDivElement>(null);
  useEscapeLayer(true, onClose, ESC_LEVEL.page);
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (!el || ref.current?.contains(el) || el.closest('[data-twn-when="other"]')) return;
      onClose();
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [onClose]);
  return (
    <div ref={ref} className="twn2-cal" role="dialog" aria-label="The day the nudge went" data-twn="calendar">
      <MonthGrid month={month} onMonth={setMonth} min={min} max={today} today={today} value={value} onPick={onPick}
        label="The day the nudge went" footnote="The day the nudge went. Later days aren’t open." />
    </div>
  );
};
