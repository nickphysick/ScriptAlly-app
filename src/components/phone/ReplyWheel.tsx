/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The reply window's control on a phone (last-screens 10B; mock `rwB`): chips for 6, 8, 12 and 16 weeks (the
 * agency's usual marked "Usual"), a two-column wheel — weeks 0–52 and days 0–6, scroll-snapped, a blush selection
 * band, faded ends, typewriter numerals — and the date line beneath.
 *
 * ONE COMPONENT, TWO USERS (phone fixes v1, decision 6): "Edit this query" and Log a query's reply step. It holds
 * no state of its own beyond the wheel's scroll; the caller owns the day count and what saving it means (both
 * store the expected DATE, so weeks and days are kept exactly).
 */
import React, { useEffect, useRef } from "react";
import { formatDate } from "../../lib/dates";
import "./replyWheel.css";

const DAY = 86_400_000;
export const CHIP_WEEKS = [6, 8, 12, 16];
export const wdm = (ms: number) => formatDate(new Date(ms), { weekday: "short", day: "numeric", month: "short" });

export const ReplyWheel: React.FC<{ sentMs: number; days: number; onDays: (d: number) => void; usual: number | null }> = ({ sentMs, days, onDays, usual }) => {
  const wk = Math.min(52, Math.floor(days / 7));
  const dy = days % 7;
  const due = sentMs + days * DAY;
  const cur = useRef({ wk, dy }); cur.current = { wk, dy };
  return (
    <div className="rw" data-rw="reply-wheel">
      <div className="rw-chips" data-rw="chips">
        {CHIP_WEEKS.map((w) => (
          <button key={w} type="button" className={`rw-chip${wk === w && dy === 0 ? " on" : ""}`} onClick={() => onDays(w * 7)} data-rw="chip" data-w={w}>
            {w} weeks{usual === w ? <small>Usual</small> : null}
          </button>
        ))}
      </div>
      <div className="rw-whl" data-rw="wheel">
        <div className="rw-band" aria-hidden="true" />
        <Wheel n={53} value={wk} onChange={(v) => onDays(v * 7 + cur.current.dy)} label="Weeks" data="weeks" /><span className="rw-u">weeks</span>
        <Wheel n={7} value={dy} onChange={(v) => onDays(cur.current.wk * 7 + v)} label="Days" data="days" /><span className="rw-u">days</span>
      </div>
      <p className="rw-dl" data-rw="dateline">Expected by {wdm(due)}{dy === 0 ? ` (${wk} ${wk === 1 ? "week" : "weeks"} after you sent it)` : ` (${days} days after you sent it)`}</p>
    </div>
  );
};

/** A scroll-snap column; the value is read from where it settles, and set by scrolling to it. */
const Wheel: React.FC<{ n: number; value: number; onChange: (v: number) => void; label: string; data: string }> = ({ n, value, onChange, label, data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const H = 40;
  const settle = useRef<number | undefined>(undefined);
  /* the settle timer fires after a re-render may already have happened (the OTHER column settling first), so it
     reads the latest value and callback, never the closure it was scheduled in — or turning weeks then days
     inside 90ms sends the old weeks back with the new days */
  const live = useRef({ value, onChange });
  live.current = { value, onChange };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (Math.round(el.scrollTop / H) !== value) el.scrollTop = value * H;
  }, [value]);
  return (
    <div ref={ref} className="rw-col" role="listbox" aria-label={label} tabIndex={0} data-rw={`col-${data}`}
      onScroll={(e) => { const el = e.currentTarget; window.clearTimeout(settle.current); settle.current = window.setTimeout(() => { const v = Math.max(0, Math.min(n - 1, Math.round(el.scrollTop / H))); if (v !== live.current.value) live.current.onChange(v); }, 90); }}
      onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); onChange(Math.min(n - 1, value + 1)); } if (e.key === "ArrowUp") { e.preventDefault(); onChange(Math.max(0, value - 1)); } }}>
      {Array.from({ length: n }, (_, i) => <div key={i} className={`rw-it${i === value ? " on" : ""}`} role="option" aria-selected={i === value} data-v={i} onClick={() => onChange(i)}>{i}</div>)}
    </div>
  );
};
