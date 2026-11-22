/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 — the desk's answer controls: option cards that fill navy when picked, the date picker (the last
 * week as a strip, then a month for anything older or later), the reply-time slider and the note box.
 *
 * ⚠️ NOTHING HERE IS PRE-ANSWERED except the date, which opens on today and says so under the question.
 */
import React, { useEffect, useRef, useState } from "react";
import { replyWords } from "../../../lib/todoWs";
import { DOW, MONL, addDays, dayDiff } from "../../../lib/queryActions/dates";

export const TICK = <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>;
export const DOC = <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 2.5h6l3.5 3.5v11.5h-9.5z" /><path d="M12 2.5V6h3.5M8.5 10h5M8.5 13h5" /></svg>;
export const ZZ = <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5a6.5 6.5 0 1 0 6.5 6.5" /><path d="M13 3.5h4l-4 4.5h4" /><path d="M10 6.5V10l2.4 1.6" /></svg>;
export const DIS = <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="M5.5 14.5l9-9" /></svg>;
export const COPY = <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.5" y="6.5" width="10" height="10" rx="2" /><path d="M13.5 6.5V4.5a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" /></svg>;
export const CLOCK = <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.6 1.8" /></svg>;
export const ARROW = <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" /></svg>;
export const CAL = <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="12" rx="2" /><path d="M3.5 8.5h13M7 3v3M13 3v3" /></svg>;

/** v53 (D4): Gone quiet's row glyph. The app has none, so this is todo-desk-v13's own: a dotted grey ring. It is not a
 *  status (StatusDot stays the only status glyph); a nudge's is QcBubble152's NUDGE_MARK. */
export const QUIET_MARK = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9a9086" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" data-tws="quiet-mark"><circle cx="12" cy="12" r="8" strokeDasharray="1.5 2.6" /></svg>;
/** v53 (D4): housekeeping's row icon, one small form for every job */
export const FORM = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#7a7066" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true" data-tws="form-mark"><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 9h6M9 13h6" strokeLinecap="round" /></svg>;

export interface TileOpt<K extends string> { k: K; label: string; sub?: string; suggested?: boolean; disabled?: boolean; doc?: boolean }

/**
 * v53 (D5) — THE DESK DRAWS ITS ANSWERS AS TILES. The desktop desk wraps its questions in `DeskTiles`; inside it every
 * answer is a tile in a grid with an icon box (the tick once chosen), and a date question is Today / Yesterday / Older.
 * Outside it (the phone's task screen renders the same flows) nothing changes.
 */
export const DeskTiles = React.createContext(false);
const RING = <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="5.5" /></svg>;
const BOX = <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.5" y="4.5" width="11" height="11" rx="2.5" /></svg>;

/** Option cards. One component for single and multi choice: they look the same. */
export function Tiles<K extends string>({ opts, value, onPick, multi = false, name }: {
  opts: readonly TileOpt<K>[]; value: K | readonly K[] | null | undefined; onPick: (k: K) => void; multi?: boolean; name: string;
}) {
  const desk = React.useContext(DeskTiles);
  const on = (k: K) => (Array.isArray(value) ? value.includes(k) : value === k);
  return (
    <div className="tws-tiles" role={multi ? "group" : "radiogroup"} aria-label={name} data-desk={desk ? "" : undefined}>
      {opts.map((o) => (
        <button key={o.k} type="button" className="tws-tile" data-tws-opt={o.k} disabled={o.disabled}
          {...(multi ? { "aria-pressed": on(o.k) } : { role: "radio", "aria-checked": on(o.k) })} onClick={() => onPick(o.k)}>
          {desk ? <span className="tws-ti2" aria-hidden="true">{on(o.k) ? TICK : o.doc ? DOC : multi ? BOX : RING}</span>
            : o.doc ? <span className="tws-di">{DOC}</span> : null}
          <span className="tws-tn">{o.label}{o.suggested ? <i className="tws-sugg">Suggested</i> : null}{o.sub ? <small>{o.sub}</small> : null}</span>
          {desk ? null : <span className="tws-tk">{TICK}</span>}
        </button>
      ))}
    </div>
  );
}

const ymdOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dayFromYmd = (ymd: string): Date => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y, m - 1, d); };
export const longDay = (d: Date, today: Date): string => {
  const n = dayDiff(d, today);
  const pre = n === 0 ? "Today, " : n === -1 ? "Yesterday, " : n === 1 ? "Tomorrow, " : "";
  return `${pre}${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]} ${d.getDate()} ${MONL[d.getMonth()]}`;
};
/** "today", "yesterday", "on Monday 2 November" */
export const dayPhrase = (d: Date, today: Date): string => {
  const n = dayDiff(d, today);
  return n === 0 ? "today" : n === -1 ? "yesterday" : n === 1 ? "tomorrow" : `on ${longDay(d, today)}`;
};

/**
 * The date picker: six days as a strip (back from today for a thing that happened, on from tomorrow for a thing ahead),
 * then a chip that opens a month for anything further.
 */
export function DatePick(p: { value: Date; onPick: (d: Date) => void; today: Date; dir: "past" | "future" }) {
  const desk = React.useContext(DeskTiles);
  return desk ? <DateTiles {...p} /> : <DateStrip {...p} />;
}

/** v53 (D5): the desk's date question as tiles — the two nearest days, then "Older" (or "Later"), which opens the month */
function DateTiles({ value, onPick, today, dir }: { value: Date; onPick: (d: Date) => void; today: Date; dir: "past" | "future" }) {
  const near = dir === "past" ? [today, addDays(today, -1)] : [addDays(today, 1), addDays(today, 7)];
  const names = dir === "past" ? ["Today", "Yesterday"] : ["Tomorrow", "In a week"];
  const inNear = near.some((d) => dayDiff(d, value) === 0);
  const [open, setOpen] = useState(!inNear);
  const short = (d: Date) => `${DOW[d.getDay()]} ${d.getDate()} ${MONL[d.getMonth()].slice(0, 3)}`;
  return (
    <div className="tws-dpick" data-tws="date">
      <div className="tws-tiles" role="radiogroup" aria-label="Pick a day" data-desk="">
        {near.map((d, i) => {
          const on = !open && dayDiff(d, value) === 0;
          return (
            <button key={ymdOf(d)} type="button" className="tws-tile" role="radio" aria-checked={on} data-tws-day={i} onClick={() => { setOpen(false); onPick(d); }}>
              <span className="tws-ti2" aria-hidden="true">{on ? TICK : CAL}</span>
              <span className="tws-tn">{names[i]}<small>{short(d)}</small></span>
            </button>
          );
        })}
        <button type="button" className="tws-tile" role="radio" aria-checked={open || !inNear} data-tws-day="older" onClick={() => setOpen((o) => !o)}>
          <span className="tws-ti2" aria-hidden="true">{open || !inNear ? TICK : CAL}</span>
          <span className="tws-tn">{dir === "past" ? "Older" : "Later"}<small>{!inNear ? short(value) : "Pick from the month"}</small></span>
        </button>
      </div>
      {open ? <MonthCal value={value} onPick={onPick} today={today} dir={dir} /> : null}
    </div>
  );
}

function MonthCal({ value, onPick, today, dir }: { value: Date; onPick: (d: Date) => void; today: Date; dir: "past" | "future" }) {
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const minMonth = new Date(today.getFullYear(), today.getMonth() - (dir === "past" ? 24 : 0), 1);
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + (dir === "future" ? 18 : 0), 1);
  const ok = (d: Date) => (dir === "past" ? dayDiff(d, today) <= 0 : dayDiff(d, today) > 0);
  const calRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cal = calRef.current;
    const sc = cal?.closest<HTMLElement>(".tws-wq");
    if (!cal || !sc) return;
    const over = cal.getBoundingClientRect().bottom - sc.getBoundingClientRect().bottom + 8;
    if (over > 0) sc.scrollTop += over;
  }, []);
  return (
    <div className="tws-mcal" ref={calRef} data-tws="calendar">
      <div className="tws-mh">
        <button type="button" aria-label="Previous month" disabled={month <= minMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
        <b>{MONL[month.getMonth()]} {month.getFullYear()}</b>
        <button type="button" aria-label="Next month" disabled={month >= maxMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="tws-mg">
        {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <i key={i}>{x}</i>)}
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {Array.from({ length: n }, (_, i) => {
          const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
          return <button key={i} type="button" disabled={!ok(d)} data-today={dayDiff(d, today) === 0 ? "" : undefined} aria-pressed={dayDiff(d, value) === 0} onClick={() => onPick(d)}>{i + 1}</button>;
        })}
      </div>
    </div>
  );
}

function DateStrip({ value, onPick, today, dir }: { value: Date; onPick: (d: Date) => void; today: Date; dir: "past" | "future" }) {
  const strip = Array.from({ length: 6 }, (_, i) => addDays(today, dir === "past" ? -i : i + 1));
  const inStrip = strip.some((d) => dayDiff(d, value) === 0);
  const [open, setOpen] = useState(!inStrip);
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const word = (d: Date, i: number) => (dir === "past" ? (i === 0 ? "Today" : i === 1 ? "Yest." : DOW[d.getDay()]) : (i === 0 ? "Tmrw" : DOW[d.getDay()]));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const minMonth = new Date(today.getFullYear(), today.getMonth() - (dir === "past" ? 24 : 0), 1);
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + (dir === "future" ? 18 : 0), 1);
  const ok = (d: Date) => (dir === "past" ? dayDiff(d, today) <= 0 : dayDiff(d, today) > 0);
  /* v52 Part C — the month opens beneath the strip, inside the question, and is brought wholly into the questions
     column's own view (its scroller only — never scrollIntoView, which would move the page too), so the footer below
     the column never sits over it */
  const calRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const cal = calRef.current;
    const sc = cal?.closest<HTMLElement>(".tws-wq");
    if (!cal || !sc) return;
    const over = cal.getBoundingClientRect().bottom - sc.getBoundingClientRect().bottom + 8;
    if (over > 0) sc.scrollTop += over;
  }, [open]);
  return (
    <div className="tws-dpick" data-tws="date">
      <div className="tws-dstrip">
        {strip.map((d, i) => (
          <button key={ymdOf(d)} type="button" className="tws-dchip2" aria-pressed={!open && dayDiff(d, value) === 0} onClick={() => { setOpen(false); onPick(d); }}>
            <small>{word(d, i)}</small><b>{d.getDate()}</b>
          </button>
        ))}
        <button type="button" className="tws-dchip2" aria-pressed={open || !inStrip} aria-label={dir === "past" ? "An older date" : "A later date"} onClick={() => setOpen((o) => !o)}>
          <small>{!inStrip ? MONL[value.getMonth()].slice(0, 3) : dir === "past" ? "Older" : "Later"}</small>
          <b>{!inStrip ? value.getDate() : CAL}</b>
        </button>
      </div>
      {open ? (
        <div className="tws-mcal" ref={calRef} data-tws="calendar">
          <div className="tws-mh">
            <button type="button" aria-label="Previous month" disabled={month <= minMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
            <b>{MONL[month.getMonth()]} {month.getFullYear()}</b>
            <button type="button" aria-label="Next month" disabled={month >= maxMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="tws-mg">
            {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <i key={i}>{x}</i>)}
            {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
            {Array.from({ length: n }, (_, i) => {
              const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
              return (
                <button key={i} type="button" disabled={!ok(d)} data-today={dayDiff(d, today) === 0 ? "" : undefined}
                  aria-pressed={dayDiff(d, value) === 0} onClick={() => onPick(d)}>{i + 1}</button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="tws-dsel">{longDay(value, today)}</div>
    </div>
  );
}

/** How long the agent takes to reply: 1 to 26 weeks in steps of one. "Not set yet" until it is touched. */
export function ReplySlider({ weeks, onPick }: { weeks: number | null; onPick: (w: number) => void }) {
  const v = weeks ?? 8;
  const [big, small] = replyWords(weeks);
  return (
    <div className="tws-wks" data-set={weeks ? "" : undefined} data-tws="reply">
      <div className="tws-wkr"><b>{big}</b><span>{small}</span></div>
      <input type="range" min={1} max={26} step={1} value={v} aria-label="Reply time in weeks" aria-valuetext={weeks ? big : "Not set yet"}
        onChange={(e) => onPick(Number(e.target.value))} onClick={(e) => onPick(Number((e.target as HTMLInputElement).value))} />
      <div className="tws-wkl" aria-hidden="true">
        {[1, 4, 8, 12, 16, 20, 26].map((n) => <span key={n} style={{ left: `${((n - 1) / 25) * 100}%` }}>{n === 26 ? "6 mo" : n === 1 ? "1 wk" : n}</span>)}
      </div>
    </div>
  );
}

/** A copyable draft (the nudge's short note). The writer sends it from their own email; the app sends nothing. */
export function CopyDraft({ text, onCopied }: { text: string; onCopied: (ok: boolean) => void }) {
  return (
    <>
      <div className="tws-draft" data-tws="draft">{text}</div>
      <button type="button" className="tws-copy" onClick={() => {
        if (!navigator.clipboard) { onCopied(false); return; }
        void navigator.clipboard.writeText(text).then(() => onCopied(true), () => onCopied(false));
      }}>{COPY}Copy it</button>
    </>
  );
}
