/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do v5.2 §C — the slide-out calendar: ⤢ on the card and the pinned day chip open it. A month (or a week) of chips,
 * one per item, and an agenda for the selected day. It reads Part B's items and nothing else.
 *
 * ⚠️ ACTING HAPPENS ON THE DESK: a chip or "Open on the desk" hands the task to the tray (`onDesk`) and closes the
 *    drawer. Nothing here starts a journey and nothing here writes.
 * ⚠️ PORTALLED TO THE BODY, so `.td5-root`'s tokens do not reach it: its colours are literals (todoV52.css §C).
 */
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CAL_KINDS, calKindLabel, daysFrom, itemsOn, type CalItem, type CalKind } from "../../../lib/trayCalendar";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { MON_LONG, WD_LONG, monthDays, plusDays, shortDay, weekdayOf, ymdParts } from "./TrayCalendar";

const CHIP: Record<CalKind, string> = { send: "you", nudge: "chase", close: "reply", mine: "tidy" };
const PILL: Record<CalKind, [string, React.CSSProperties]> = {
  send: ["SEND MATERIALS", { background: "#e7a184" }],
  nudge: ["NUDGES", { background: "#fff" }],
  close: ["CONSIDER CLOSING", { background: "rgba(255,255,255,.45)" }],
  mine: ["YOUR TASKS", { background: "transparent", boxShadow: "inset 0 0 0 1.3px #fff" }],
};
const DN = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const weekStart = (ymd: string) => plusDays(ymd, -((weekdayOf(ymd) + 6) % 7));

export const TrayCalDrawer: React.FC<{
  open: boolean;
  today: string;
  items: readonly CalItem[];
  n: number;
  sel: string;
  onSel: (ymd: string) => void;
  onClose: () => void;
  /** hand a task to the desk (closes the drawer first); never starts anything */
  onDesk: (item: CalItem) => void;
  /** the item's deed and its second line, as the tray words them */
  wordsOf: (item: CalItem) => { deed: string; line: string };
  onAdd: () => void;
}> = (p) => {
  const { open, today, items, sel } = p;
  const [view, setView] = useState<"month" | "week">("month");
  const [off, setOff] = useState<Partial<Record<CalKind, boolean>>>({});
  const [month, setMonth] = useState(() => { const x = ymdParts(sel); return { y: x.y, m: x.m }; });
  /* the drawer opens on the selected day's month */
  useEffect(() => { if (open) { const x = ymdParts(sel); setMonth({ y: x.y, m: x.m }); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const x = ymdParts(sel); setMonth((mo) => (mo.y === x.y && mo.m === x.m ? mo : { y: x.y, m: x.m })); }, [sel]);
  useEscapeLayer(open, p.onClose, ESC_LEVEL.trayCalendar);

  const shown = useMemo(() => items.filter((i) => !off[i.kind]), [items, off]);
  const onDay = (ymd: string) => shown.filter((i) => i.ymd === ymd);
  const days = monthDays(month.y, month.m);
  const counts = useMemo(() => {
    const c: Record<CalKind, number> = { send: 0, nudge: 0, close: 0, mine: 0 };
    for (const i of items) { const x = ymdParts(i.ymd); if (x.y === month.y && x.m === month.m) c[i.kind]++; }
    return c;
  }, [items, month]);

  const chip = (i: CalItem) => (
    <button key={i.key} type="button" className={`td52-ev ${CHIP[i.kind]}${i.ymd < today && !i.snoozed ? " late" : ""}${i.snoozed ? " snz" : ""}`}
      data-td52="dr-chip" data-key={i.key} data-kind={i.kind} title={`${p.wordsOf(i).deed} · ${p.wordsOf(i).line}`}
      onClick={(e) => { e.stopPropagation(); p.onDesk(i); }}>
      <i aria-hidden="true" /><span>{i.title}</span>
    </button>
  );
  const nav = (d: number) => {
    if (view === "month") setMonth((mo) => { const m = mo.m + d; return { y: mo.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; });
    else p.onSel(plusDays(sel, 7 * d));
  };
  const ws = weekStart(sel);
  const selP = ymdParts(sel);

  /* the agenda */
  const dated = itemsOn(items, sel).filter((i) => !off[i.kind]);
  const gap = daysFrom(today, sel);
  const past = sel < today;
  const rel = sel === today ? "TODAY" : gap > 0 ? `IN ${gap} DAY${gap === 1 ? "" : "S"}` : `${-gap} DAY${gap === -1 ? "" : "S"} AGO`;
  const things = (k: number) => `${k} ${k === 1 ? "thing" : "things"}`;
  const sub = dated.length ? `${things(dated.length)}${past ? " still open from this day" : " due"}` : past ? "Nothing still open from this day" : "Nothing dated";
  const cols = Array.from({ length: 7 }, (_, k) => { const d = plusDays(weekStart(sel), k); return { d, c: itemsOn(items, d).length }; });
  const mx = Math.max(1, ...cols.map((c) => c.c));

  return createPortal(
    <>
      <div className={`td52-scrim${open ? " on" : ""}`} data-td52="dr-scrim" onClick={p.onClose} aria-hidden="true" />
      <aside className={`td52-dr${open ? " on" : ""}`} data-td52="drawer" aria-label="Calendar" aria-hidden={!open} inert={!open ? ("" as unknown as boolean) : undefined}>
        <div className="td52-dh">
          <span className="td52-dt">Calendar</span>
          <div className="td52-mnav">
            <button type="button" aria-label={view === "month" ? "Previous month" : "Previous week"} onClick={() => nav(-1)}>‹</button>
            <span className="td52-dmt" data-td52="dr-title">{view === "month" ? `${MON_LONG[month.m]} ${month.y}` : `Week of ${shortDay(ws)}`}</span>
            <button type="button" aria-label={view === "month" ? "Next month" : "Next week"} onClick={() => nav(1)}>›</button>
            <button type="button" data-td52="dr-today" onClick={() => { const x = ymdParts(today); setMonth({ y: x.y, m: x.m }); p.onSel(today); }}>Today</button>
          </div>
          <div className="td52-fil">
            {CAL_KINDS.map((k) => (
              <button key={k} type="button" className={off[k] ? "off" : ""} data-td52="dr-kind" data-kind={k} aria-pressed={!off[k]}
                onClick={() => setOff((o) => ({ ...o, [k]: !o[k] }))}>
                <i style={PILL[k][1]} aria-hidden="true" />{PILL[k][0]}{counts[k] ? <b> {counts[k]}</b> : null}
              </button>
            ))}
          </div>
          <div className="td52-seg" role="group" aria-label="View">
            <button type="button" className={view === "month" ? "on" : ""} aria-pressed={view === "month"} data-td52="dr-month" onClick={() => setView("month")}>Month</button>
            <button type="button" className={view === "week" ? "on" : ""} aria-pressed={view === "week"} data-td52="dr-week" onClick={() => setView("week")}>Week</button>
          </div>
          <button type="button" className="td52-dx" aria-label="Close the calendar" data-td52="dr-close" onClick={p.onClose}>×</button>
        </div>
        <div className="td52-db">
          <div className="td52-dc" data-td52="dr-grid" data-view={view}>
            {view === "month" ? (
              <div className="td52-big">
                {DN.map((x) => <div key={x} className="td52-dn">{x}</div>)}
                {days.map((d) => {
                  const its = onDay(d);
                  const x = ymdParts(d);
                  const wd = weekdayOf(d);
                  return (
                    <div key={d} role="button" tabIndex={0} data-td52="dr-day" data-ymd={d}
                      className={`td52-bd${x.m !== month.m ? " om" : ""}${wd === 0 || wd === 6 ? " wkd" : ""}${d === today ? " today" : ""}${d === sel ? " sel" : ""}`}
                      onClick={() => p.onSel(d)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.onSel(d); } }}>
                      <div className="td52-bn"><span>{x.d}{x.d === 1 ? ` ${shortDay(d).split(" ")[1]}` : ""}</span></div>
                      {its.slice(0, 4).map(chip)}
                      {its.length > 4 ? <div className="td52-more">+{its.length - 4} MORE</div> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="td52-wk7">
                {Array.from({ length: 7 }, (_, k) => plusDays(ws, k)).map((d) => {
                  const its = onDay(d);
                  return (
                    <div key={d} role="button" tabIndex={0} data-td52="dr-day" data-ymd={d} className={`td52-col${d === today ? " today" : ""}${d === sel ? " sel" : ""}`}
                      onClick={() => p.onSel(d)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.onSel(d); } }}>
                      <div className="td52-bn wk">{WD_LONG[weekdayOf(d)].slice(0, 3)}<small>{shortDay(d).toUpperCase()}</small></div>
                      {its.length ? its.map(chip) : <div className="td52-more">—</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="td52-ag" data-td52="agenda">
            <div className="td52-agl" data-td52="ag-rel">{rel}</div>
            <h3 className="td52-agh">{WD_LONG[weekdayOf(sel)]} {selP.d} {MON_LONG[selP.m]}</h3>
            <div className="td52-ags" data-td52="ag-sub">{sub} · {p.n} in your tray</div>
            <div className="td52-agn">
              <button type="button" onClick={() => p.onSel(plusDays(sel, -1))}>‹ Day</button>
              <button type="button" onClick={() => p.onSel(plusDays(sel, 1))}>Day ›</button>
              <button type="button" data-td52="ag-add" style={{ marginLeft: "auto" }} onClick={p.onAdd}>+ Add a task</button>
            </div>
            {CAL_KINDS.map((k) => {
              const m = dated.filter((i) => i.kind === k);
              if (!m.length) return null;
              return (
                <React.Fragment key={k}>
                  <div className={`td52-gh ${CHIP[k]}`} data-td52="ag-band" data-kind={k}><span>{calKindLabel(k, m.length)}</span><span>{m.length}</span></div>
                  {m.map((i) => {
                    const w = p.wordsOf(i);
                    return (
                      <div key={i.key} className="td52-ai" data-td52="ag-item" data-key={i.key}>
                        <b>{w.deed}</b><em>{w.line}</em>
                        <button type="button" data-td52="ag-go" onClick={() => p.onDesk(i)}>Open on the desk</button>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
            <div className="td52-agw">
              <div className="td52-agl">THIS WEEK · {cols.reduce((s, c) => s + c.c, 0)} DATED</div>
              <div className="td52-wb">
                {cols.map((c) => (
                  <button key={c.d} type="button" className={`${c.d === sel ? "on" : ""}${c.d === today ? " td" : ""}`} data-td52="ag-bar" data-ymd={c.d} onClick={() => p.onSel(c.d)}
                    aria-label={`${WD_LONG[weekdayOf(c.d)]}: ${c.c} dated`}>
                    <i style={{ height: Math.max(3, (c.c / mx) * 32) }} />{WD_LONG[weekdayOf(c.d)].slice(0, 2)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>,
    document.body,
  );
};
