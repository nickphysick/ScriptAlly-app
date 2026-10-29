/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.2 §A — THE CALENDAR CARD (design-refs/todo-list-v5-2, "CALENDAR CARD" and v9–v14). On the populated
 * page the header's card is an "Overdue first" day panel beside the month.
 *
 * ⚠️ IT TAKES THE HEADER'S HEIGHT AND NEVER SETS IT: `contain: size` and `container-type: size` (name `calc`) on the
 *    card, stretched to the header row. Its own tight rules key off its own height (`@container calc (max-height: 185px)`).
 * ⚠️ EVERY FIGURE IS `lib/trayCalendar`'s. The four parts of today's panel sum to the tray's count; own tasks not yet
 *    in the tray and snoozes are on the month but never counted.
 * ⚠️ NOTHING HERE WRITES. A row filters the tray (the Due pill shares the filter); a day selects; ⤢ opens the drawer.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CAL_KINDS, calKindLabel, counted, daysFrom, itemsOn, kindsOn,
  type CalFilter, type CalItem, type CalKind, type DayBuckets, type DayFilter,
} from "../../../lib/trayCalendar";
import { MONTHS_SHORT } from "../../../lib/dates";

export const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WD_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const ymdParts = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return { y, m: m - 1, d }; };
export const ymdOf = (y: number, m: number, d: number) => { const x = new Date(Date.UTC(y, m, d)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`; };
export const plusDays = (ymd: string, n: number) => { const p = ymdParts(ymd); return ymdOf(p.y, p.m, p.d + n); };
export const weekdayOf = (ymd: string) => { const p = ymdParts(ymd); return new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay(); };
/** "15 Oct" */
export const shortDay = (ymd: string) => { const p = ymdParts(ymd); return `${p.d} ${MONTHS_SHORT[p.m]}`; };
/** "Thu 15 Oct" */
export const dayChip = (ymd: string) => `${WD_LONG[weekdayOf(ymd)].slice(0, 3)} ${shortDay(ymd)}`;
/** "Friday 23 October" */
export const longDay = (ymd: string) => { const p = ymdParts(ymd); return `${WD_LONG[weekdayOf(ymd)]} ${p.d} ${MON_LONG[p.m]}`; };
/** the six (or five) weeks the month draws, Monday first */
export function monthDays(y: number, m: number): string[] {
  const first = ymdOf(y, m, 1);
  let d = plusDays(first, -((weekdayOf(first) + 6) % 7));
  const out: string[] = [];
  for (let i = 0; i < 42; i++) {
    if (i === 35 && ymdParts(d).m !== m) break;
    out.push(d);
    d = plusDays(d, 1);
  }
  return out;
}
export const KIND_DOT: Record<CalKind, string> = { send: "y", nudge: "", close: "s", mine: "h" };
export const KIND_PEEK: Record<CalKind, React.CSSProperties> = {
  send: { background: "#a2452a" }, nudge: { background: "#fff" }, close: { background: "rgba(255,255,255,.45)" }, mine: { background: "transparent", boxShadow: "inset 0 0 0 1.3px #fff" },
};
/** "IN 8 DAYS" · "3 DAYS AGO" · "IN 1 DAY" */
export const relDay = (ymd: string, today: string): string => {
  const n = daysFrom(today, ymd);
  if (n === 0) return "TODAY";
  return n > 0 ? `IN ${n} ${n === 1 ? "DAY" : "DAYS"}` : `${-n} ${n === -1 ? "DAY" : "DAYS"} AGO`;
};

export interface TrayCalendarProps {
  today: string;
  items: readonly CalItem[];
  buckets: DayBuckets;
  /** the tray's count, the badge's number */
  n: number;
  filter: CalFilter | null;
  onFilter: (f: CalFilter | null) => void;
  onOpenDrawer: () => void;
  /** a day's snoozes: switch the tray to Set aside */
  onSetAside: () => void;
  /** §G.1 — the day lit by a hovered row, and the day the pointer is on (lights its rows) */
  litDay?: string | null;
  onHoverDay?: (ymd: string | null) => void;
  /** §G.2 — a row dropped on a day */
  dragging?: boolean;
  onDropDay?: (ymd: string) => void;
  /** the drawer is open: ← → stand down */
  drawerOpen?: boolean;
  /** the selected day lives with the page (the drawer and the pinned chip read it) */
  sel: string;
  onSel: (ymd: string) => void;
}

export const TrayCalendar: React.FC<TrayCalendarProps> = (p) => {
  const { today, items, buckets: b, n, filter, sel } = p;
  const [month, setMonth] = useState(() => { const x = ymdParts(sel); return { y: x.y, m: x.m }; });
  const [dir, setDir] = useState(0);
  const [peek, setPeek] = useState<{ ymd: string; left: number; top: number } | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const over = useRef(false);
  /* the month follows the selected day */
  useEffect(() => { const x = ymdParts(sel); setMonth((mo) => (mo.y === x.y && mo.m === x.m ? mo : { y: x.y, m: x.m })); }, [sel]);
  const go = (ymd: string) => { setDir(Math.sign(daysFrom(sel, ymd))); p.onSel(ymd); window.setTimeout(() => setDir(0), 320); };
  /* ← → move the selected day while the pointer is over the card (not in a field, not with the drawer open) */
  const goRef = useRef(go);
  goRef.current = go;
  const st = useRef({ sel, drawerOpen: !!p.drawerOpen });
  st.current = { sel, drawerOpen: !!p.drawerOpen };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!over.current || st.current.drawerOpen || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      const t = e.target as HTMLElement | null;
      if (t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable)) return;
      e.preventDefault();
      goRef.current(plusDays(st.current.sel, e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const isToday = sel === today;
  const past = sel < today;
  const on = itemsOn(items, sel);
  const due = on.filter((i) => !i.snoozed);
  const snoozed = on.filter((i) => i.snoozed);
  const byKind = (list: readonly CalItem[]) => CAL_KINDS.map((k) => ({ k, n: list.filter((i) => i.kind === k).length })).filter((x) => x.n > 0);
  const pressed = (f: CalFilter) => !!filter && filter.k === f.k && (f.k !== "day" || ((filter as DayFilter).kind === f.kind && (filter as DayFilter).ymd === f.ymd));
  const press = (f: CalFilter) => p.onFilter(pressed(f) ? null : f);
  const sel1 = ymdParts(sel);

  /* ── the day panel ── */
  const todayCounted = items.filter((i) => counted(i) && i.ymd === today);
  const todayKinds = new Set(todayCounted.map((i) => i.kind));
  const todayHint = todayCounted.length === 0 ? "" : todayKinds.size === 1
    ? ({ send: "material to send", nudge: "nudge due", close: "consider closing", mine: "your task" } as Record<CalKind, string>)[[...todayKinds][0]]
    : `${todayKinds.size} kinds`;
  const row = (count: number, label: React.ReactNode, hint: string, f: CalFilter, cls: string, sw?: CalKind) => (
    <button type="button" className={`td52-rw${cls ? ` ${cls}` : ""}${count ? "" : " z"}`} data-td52="cal-row" data-f={f.k === "day" ? `day:${(f as DayFilter).kind}` : f.k}
      aria-pressed={pressed(f)} disabled={!count} onClick={() => press(f)}>
      <b>{count}</b>
      <span className="td52-lb">{sw ? <i className={`td52-sw ${KIND_DOT[sw]}`} aria-hidden="true" /> : null}{label}</span>
      {hint ? <span className="td52-hn">{hint}</span> : null}
    </button>
  );
  let dayBody: React.ReactNode;
  if (isToday) {
    const total = b.overdue + b.today + b.later + b.undated;
    const seg = (k: number, c: string) => (k ? <i className={c} style={{ flex: `${k} 1 0` }} data-td52="mix-seg" data-k={c} /> : null);
    dayBody = (
      <>
        <div className="td52-rows">
          {row(b.overdue, "Overdue", b.oldest ? `since ${shortDay(b.oldest)}` : "", { k: "overdue" }, "od")}
          {row(b.today, "Due today", todayHint, { k: "today" }, "")}
          {row(b.later, "Later", b.next ? `next ${shortDay(b.next)}` : "", { k: "later" }, "")}
        </div>
        <button type="button" className="td52-mix" data-td52="mix" aria-pressed={pressed({ k: "undated" })} data-total={total}
          title="Your whole tray: overdue, due today, coming up, no date" onClick={() => press({ k: "undated" })}>
          <span className="td52-bar" aria-hidden="true">{seg(b.overdue, "o")}{seg(b.today, "t")}{seg(b.later, "l")}{seg(b.undated, "u")}</span>
          <span className="td52-tx">+{b.undated} no date</span>
        </button>
      </>
    );
  } else if (!due.length && !snoozed.length) {
    dayBody = (
      <>
        <div className="td52-lab" data-td52="day-lab">{past ? "NOTHING LEFT OPEN" : "NOTHING DUE"}</div>
        <div className="td52-note" data-td52="day-note">{past ? "Everything due this day is done." : "A clear day."}</div>
      </>
    );
  } else {
    const ago = past ? daysFrom(sel, today) : 0;
    dayBody = (
      <>
        <div className={`td52-lab${past ? " od" : ""}`} data-td52="day-lab">{past ? <>STILL OPEN<span className="td52-ago"> · {ago} DAYS LATE</span></> : "DUE THIS DAY"}</div>
        <div className="td52-rows">
          {byKind(due).map(({ k, n: c }) => (
            <React.Fragment key={k}>{row(c, calKindLabel(k, c), "", { k: "day", kind: k, ymd: sel }, past ? "od" : "", k)}</React.Fragment>
          ))}
          {byKind(snoozed).map(({ k, n: c }) => (
            <button key={`z-${k}`} type="button" className="td52-rw td52-rw--back" data-td52="cal-row" data-f={`back:${k}`} onClick={p.onSetAside}>
              <b>{c}</b><span className="td52-lb"><i className={`td52-sw ${KIND_DOT[k]} faint`} aria-hidden="true" />{calKindLabel(k, c)} back from Set aside</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  /* ── the month ── */
  const days = monthDays(month.y, month.m);
  const atHome = isToday && month.y === ymdParts(today).y && month.m === ymdParts(today).m;
  const ariaFor = (ymd: string) => {
    const ks = kindsOn(items, ymd);
    const words = ks.map((x) => `${x.n} ${x.kind === "mine" ? (x.n === 1 ? "own task" : "own tasks") : calKindLabel(x.kind, x.n).toLowerCase()}${x.snoozed ? " back from Set aside" : ""}`);
    return `${longDay(ymd)}: ${words.length ? words.join(", ") : "nothing dated"}`;
  };
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="td52-calin" data-td52="cal-inner" ref={cardRef}
      onMouseEnter={() => { over.current = true; }} onMouseLeave={() => { over.current = false; setPeek(null); }}>
      <div className="td52-day" data-td52="day" aria-live="polite">
        <div className={`td52-ey${past ? " past" : ""}`} data-td52="day-ey">— {relDay(sel, today)} —</div>
        <div className="td52-dhd">
          <span className="td52-num"><span className={`td52-roll${dir > 0 ? " up" : dir < 0 ? " dn" : ""}`}><span key={sel}>{sel1.d}</span></span></span>
          <span className="td52-wd">{WD_LONG[weekdayOf(sel)]}<small>{MON_LONG[sel1.m]}</small></span>
        </div>
        {dayBody}
        {isToday ? null : (
          <div className="td52-ft"><button type="button" className="td52-ftl" data-td52="back-today" onClick={() => go(today)}>↩ Today · {n} in tray</button></div>
        )}
      </div>
      <div className="td52-mon" data-td52="month">
        <div className="td52-mh">
          <span className="td52-mt" data-td52="month-title">{MON_LONG[month.m]} {month.y}</span>
          <button type="button" className="td52-nb" aria-label="Previous month" onClick={() => setMonth((mo) => (mo.m === 0 ? { y: mo.y - 1, m: 11 } : { y: mo.y, m: mo.m - 1 }))}>‹</button>
          <button type="button" className={`td52-tb${atHome ? " hide" : ""}`} data-td52="today" onClick={() => go(today)}>TODAY</button>
          <button type="button" className="td52-nb" aria-label="Next month" onClick={() => setMonth((mo) => (mo.m === 11 ? { y: mo.y + 1, m: 0 } : { y: mo.y, m: mo.m + 1 }))}>›</button>
          <button type="button" className="td52-nb sq" data-td52="open-drawer" aria-label="Open the calendar" title="Open the calendar" onClick={p.onOpenDrawer}>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5 6.8 5.2M1.5 10.5l3.7-3.7" /></svg>
          </button>
        </div>
        <div className="td52-g" role="grid" aria-label={`${MON_LONG[month.m]} ${month.y}`}>
          <div role="row" className="td52-gr">{["M", "T", "W", "T", "F", "S", "S"].map((x, k) => <div key={k} role="columnheader" className="td52-w" aria-hidden="true">{x}</div>)}</div>
          {weeks.map((wk, wi) => (
            <div key={wi} role="row" className="td52-gr">
              {wk.map((ymd) => {
                const ks = kindsOn(items, ymd);
                const x = ymdParts(ymd);
                const wd = weekdayOf(ymd);
                const cls = ["td52-c", x.m !== month.m ? "om" : "", ymd < today ? "past" : "", wd === 0 || wd === 6 ? "wk" : "", ymd === today ? "today" : "",
                  ymd === sel ? "sel" : "", ks.length ? "m" : "", p.litDay === ymd ? "lit" : "", dropOn === ymd ? "drop" : "",
                  ymd < today && ks.some((k) => !k.snoozed && itemsOn(items, ymd).some((i) => i.kind === k.kind && counted(i))) ? "open" : ""].filter(Boolean).join(" ");
                return (
                  <button key={ymd} type="button" role="gridcell" className={cls} data-td52="day-cell" data-ymd={ymd} aria-selected={ymd === sel} aria-label={ariaFor(ymd)}
                    onClick={() => { setPeek(null); go(ymd); }}
                    onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPeek({ ymd, left: r.left + r.width / 2, top: r.bottom + 8 }); p.onHoverDay?.(ymd); }}
                    onMouseLeave={() => { setPeek(null); p.onHoverDay?.(null); }}
                    onFocus={() => p.onHoverDay?.(ymd)} onBlur={() => p.onHoverDay?.(null)}
                    onDragOver={(e) => { if (!p.dragging) return; e.preventDefault(); if (dropOn !== ymd) setDropOn(ymd); }}
                    onDragLeave={() => setDropOn((d) => (d === ymd ? null : d))}
                    onDrop={(e) => { e.preventDefault(); setDropOn(null); p.onDropDay?.(ymd); }}>
                    <span className="td52-cn">{x.d}</span>
                    {ks.length ? <span className="td52-tk" aria-hidden="true">{ks.map((k) => <i key={k.kind} className={`${KIND_DOT[k.kind]}${k.snoozed ? " faint" : ""}`} data-td52="dot" data-kind={k.kind} />)}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* ⚠️ PORTALLED: the card is a size container, which contains fixed-position children; the tip must not be */}
      {peek && typeof document !== "undefined" ? createPortal((() => {
        const ks = kindsOn(items, peek.ymd);
        const pastDay = peek.ymd < today;
        const d = ymdParts(peek.ymd);
        return (
          <div className="td52-pk" data-td52="peek" style={{ left: Math.min(peek.left - 60, window.innerWidth - 200), top: peek.top }} aria-hidden="true">
            <div className="td52-pd">{WD_SHORT[weekdayOf(peek.ymd)]} {d.d} {MONTHS_SHORT[d.m].toUpperCase()}</div>
            {ks.length ? ks.map((k) => (
              <div key={k.kind} className="td52-pr"><i style={KIND_PEEK[k.kind]} />{k.n} {calKindLabel(k.kind, k.n).toLowerCase()}{k.snoozed ? " · back from Set aside" : pastDay ? " · still open" : ""}</div>
            )) : <div className="td52-pr" style={{ opacity: 0.6 }}>Nothing dated</div>}
          </div>
        );
      })(), document.body) : null}
    </div>
  );
};

/**
 * To-do list v7 §2 — TODAY: the day panel's today figures, laid out across the page in one white card (the date, then
 * Overdue · Due today · Later, then "Open the calendar"). The month lives only in the slide-out drawer now.
 * ⚠️ THE COUNTS ARE THE SAME CONTROLS AS v5.2's ROWS (`data-td52="cal-row"`, the same filters): a press filters the
 *    tray and sets `aria-pressed`; a second press clears it. Figures from `lib/trayCalendar` (DayBuckets), never retold.
 */
export const TrayToday: React.FC<{
  today: string;
  items: readonly CalItem[];
  buckets: DayBuckets;
  filter: CalFilter | null;
  onFilter: (f: CalFilter | null) => void;
  onOpenDrawer: () => void;
  loading?: boolean;
}> = ({ today, items, buckets: b, filter, onFilter, onOpenDrawer, loading }) => {
  const pressed = (f: CalFilter) => !!filter && filter.k === f.k;
  const press = (f: CalFilter) => onFilter(pressed(f) ? null : f);
  const todayCounted = items.filter((i) => counted(i) && i.ymd === today);
  const todayKinds = new Set(todayCounted.map((i) => i.kind));
  const todayHint = todayCounted.length === 0 ? "" : todayKinds.size === 1
    ? ({ send: "material to send", nudge: "nudge due", close: "consider closing", mine: "your task" } as Record<CalKind, string>)[[...todayKinds][0]]
    : `${todayKinds.size} kinds`;
  const d = ymdParts(today);
  const count = (n: number, label: string, hint: string, f: CalFilter, od?: boolean) => (
    <button type="button" className={`td7-ct${od ? " od" : ""}${n ? "" : " z"}`} data-td52="cal-row" data-td7="count" data-f={f.k}
      aria-pressed={pressed(f)} disabled={loading || !n} onClick={() => press(f)}>
      <span className="td7-ctl">{label}</span>
      <b className="td7-ctn">{loading ? "" : n}</b>
      <span className="td7-cth">{loading ? "" : hint || " "}</span>
    </button>
  );
  return (
    <div className="td7-tcard" data-td7="today-card">
      <div className="td7-date" data-td7="date">
        <span className="td7-num">{d.d}</span>
        <span className="td7-wd">{WD_LONG[weekdayOf(today)]}<small>{MON_LONG[d.m]}</small></span>
      </div>
      {count(b.overdue, "Overdue", b.oldest ? `since ${shortDay(b.oldest)}` : "", { k: "overdue" }, true)}
      {count(b.today, "Due today", todayHint, { k: "today" })}
      {count(b.later, "Later", b.next ? `next ${shortDay(b.next)}` : "", { k: "later" })}
      <button type="button" className="td7-calbtn" data-td7="open-calendar" disabled={loading} onClick={onOpenDrawer}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" /></svg>
        Open the calendar
      </button>
    </div>
  );
};
