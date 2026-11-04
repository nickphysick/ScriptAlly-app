/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The timeline strip (import review; ref design-refs/import-timeline-strip-v1.html, #deck and #row).
 * A query's whole timeline on one line: Query sent, each event in date order, then "+ Add an event".
 * Each step is a tile — its StatusDot ring, its name, its date — and pressing one opens a pop-over to
 * change it. The latest step is the dark one. Under the line, where the query stands.
 *
 * ⚠️ IT DRAWS AND IT ASKS; IT DECIDES NOTHING. Order, the latest step, the answered rule and every
 * edit are lib/importTimeline's. An edit hands the whole new query to `onChange`; nothing is written
 * until the import commits.
 *
 * ⚠️ THE POP-OVER FLOATS OVER THE PAGE. It is absolutely placed under its tile, so opening it moves no
 * other box. It flips above the tile when there is no room below, aligns to the tile's right edge when
 * it would pass the card's, and when neither fits it is scrolled into view. One open at a time; its
 * tile again, Esc, Cancel or a click outside closes it without saving; Enter saves once a date is
 * chosen. Focus goes to the date field on open and back to the tile on close.
 */
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { QueryStatus } from "../../../types";
import type { ReviewQuery } from "../../../lib/smartImportReviewModel";
import {
  STRIP_EVENT_TYPES, STRIP_WORDS, stripEvents, stripOrder, nextEventType, whereItStands, eventBeforeSent,
  stepName, setSentDate, waiveSentDate, addEvent, editEvent, removeEvent, calendarStart,
} from "../../../lib/importTimeline";
import { readTypedDate, localToday, tileDate, longDate, monthGrid, monthTitle, stepMonth } from "../../../lib/importTypedDate";
import { useEscapeLayer, ESC_LEVEL } from "../../../lib/escapeStack";
import { StatusDot } from "../../StatusDot";
import "./timelineStrip.css";

type Target = "sent" | "new" | number;
const keyOf = (t: Target) => (typeof t === "number" ? `e${t}` : t);

interface Draft { target: Target; type: QueryStatus; typed: string; sel: string | null; err: boolean; y: number; m: number }

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

const Calendar: React.FC<{ d: Draft; today: string; onMonth: (y: number, m: number) => void; onPick: (iso: string) => void }> = ({ d, today, onMonth, onPick }) => {
  const g = monthGrid(d.y, d.m);
  const atToday = `${d.y}-${String(d.m).padStart(2, "0")}` >= today.slice(0, 7);
  return (
    <div className="o9-cal" data-strip="cal">
      <div className="o9-calh">
        <button type="button" className="o9-calnav" aria-label="Previous month" data-act="cal-prev" onClick={() => onMonth(...stepMonth(d.y, d.m, -1))}>‹</button>
        <b data-strip="cal-title">{monthTitle(d.y, d.m)}</b>
        <button type="button" className="o9-calnav" aria-label="Next month" data-act="cal-next" disabled={atToday} onClick={() => onMonth(...stepMonth(d.y, d.m, 1))}>›</button>
      </div>
      <div className="o9-calg">
        {DOW.map((w, i) => <span key={i} className="o9-dow" aria-hidden="true">{w}</span>)}
        {Array.from({ length: g.lead }, (_, i) => <span key={`b${i}`} />)}
        {g.days.map((iso) => (
          <button type="button" key={iso} data-day={iso} disabled={iso > today} aria-label={longDate(iso)} aria-pressed={iso === d.sel}
            className={`o9-day${iso === d.sel ? " is-sel" : ""}${iso === today ? " is-today" : ""}`} onClick={() => onPick(iso)}>
            {Number(iso.slice(8))}
          </button>
        ))}
      </div>
    </div>
  );
};

export const TimelineStrip: React.FC<{ query: ReviewQuery; onChange: (next: ReviewQuery) => void; today?: string }> = ({ query, onChange, today: todayIn }) => {
  const today = todayIn ?? localToday();
  const events = useMemo(() => stripEvents(query), [query]);
  const order = useMemo(() => stripOrder(events), [events]);
  const latest = order.length ? order[order.length - 1] : null;
  const [d, setD] = useState<Draft | null>(null);
  const [place, setPlace] = useState<{ up: boolean; right: boolean }>({ up: false, right: false });
  const qid = useId();
  const stripRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tiles = useRef(new Map<string, HTMLButtonElement | null>());
  const returnTo = useRef<string | null>(null);

  const open = (target: Target) => {
    if (d && keyOf(d.target) === keyOf(target)) { close(); return; }
    const base = calendarStart(query, target, today);
    const sel = target === "sent" ? (query.sentDate ? query.sentDate.slice(0, 10) : null) : target === "new" ? null : (events[target]?.date?.slice(0, 10) ?? null);
    const type = target === "new" ? nextEventType(events) : target === "sent" ? QueryStatus.QUERIED : events[target].type;
    returnTo.current = keyOf(target);
    setPlace({ up: false, right: false });
    setD({ target, type, typed: "", sel, err: false, y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) });
  };
  const close = () => {
    setD(null);
    const k = returnTo.current;
    if (k) requestAnimationFrame(() => tiles.current.get(k)?.focus({ preventScroll: true }));
  };
  const save = () => {
    if (!d || !d.sel) return;
    const next = d.target === "sent" ? setSentDate(query, d.sel)
      : d.target === "new" ? addEvent(query, d.type, d.sel)
      : editEvent(query, d.target, d.type, d.sel);
    if (d.target === "new") returnTo.current = "new";
    onChange(next);
    close();
  };

  /* Place the pop-over once it is drawn: right-aligned if it would pass the card, above if there is
     no room below, else scrolled into view. Read once per opening, so placing it cannot re-place it. */
  useLayoutEffect(() => {
    const p = popRef.current;
    if (!d || !p) return;
    const r = p.getBoundingClientRect();
    const card = (stripRef.current?.closest("[data-strip-host]") ?? stripRef.current) as HTMLElement | null;
    const lim = card?.getBoundingClientRect().right ?? window.innerWidth;
    const tileTop = p.parentElement?.getBoundingClientRect().top ?? 0;
    const right = r.right > lim - 8;
    /* the room is the scroll area's, not the window's: the set-up sheet starts below the bar and clips */
    let port = { top: 0, bottom: window.innerHeight };
    for (let e = p.parentElement; e; e = e.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(e).overflowY)) { const b = e.getBoundingClientRect(); port = { top: Math.max(0, b.top), bottom: Math.min(window.innerHeight, b.bottom) }; break; }
    }
    let up = false;
    if (r.bottom > port.bottom - 12) {
      if (tileTop - r.height - 20 > port.top) up = true;
      else p.scrollIntoView({ block: "nearest" });
    }
    if (right !== place.right || up !== place.up) setPlace({ up, right });
    inputRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.target]);

  /* A month with six weeks makes the pop-over a row taller: when the calendar turns, a pop-over
     placed below its tile is brought into view again, so its foot is never left under a clip. */
  useLayoutEffect(() => {
    if (d && !place.up) popRef.current?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.y, d?.m]);

  /* A click outside the pop-over and its tile closes it, without saving. */
  useEffect(() => {
    if (!d) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (tiles.current.get(keyOf(d.target))?.contains(t)) return;
      setD(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [d]);
  useEscapeLayer(!!d, close, ESC_LEVEL.cardPopup);

  const typed = (v: string) => setD((x) => {
    if (!x) return x;
    const sel = readTypedDate(v, today);
    return sel ? { ...x, typed: v, sel, err: false, y: Number(sel.slice(0, 4)), m: Number(sel.slice(5, 7)) } : { ...x, typed: v, sel: null, err: v.trim().length >= 3 };
  });

  const pop = (target: Target) => {
    if (!d || keyOf(d.target) !== keyOf(target)) return null;
    const isSent = target === "sent", isNew = target === "new";
    return (
      <div ref={popRef} className={`o9-spop${place.right ? " is-right" : ""}${place.up ? " is-up" : ""}`} role="dialog" aria-labelledby={`${qid}-q`} data-strip="pop"
        onKeyDown={(e) => { if (e.key === "Enter" && d.sel && (e.target as HTMLElement).tagName !== "BUTTON") { e.preventDefault(); save(); } }}>
        <p className="o9-spopq" id={`${qid}-q`}>{isSent ? STRIP_WORDS.askSent : isNew ? STRIP_WORDS.askNew : STRIP_WORDS.askEvent}</p>
        {isNew && <p className="o9-spopnote" data-strip="note">{STRIP_WORDS.newNote}</p>}
        {!isSent && (
          <select className="o9-spopsel" aria-label="What happened" value={d.type} data-strip="type" onChange={(e) => setD({ ...d, type: e.target.value as QueryStatus })}>
            {STRIP_EVENT_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
        )}
        <input ref={inputRef} className="o9-spopin" placeholder={STRIP_WORDS.placeholder} value={d.typed} autoComplete="off" aria-label="Date" data-strip="date" onChange={(e) => typed(e.target.value)} />
        <div className="o9-rd" aria-live="polite" data-strip="readback">
          {d.err ? <span className="is-bad">{STRIP_WORDS.bad}</span> : d.sel ? <span className="is-ok">{longDate(d.sel)}</span> : <span className="is-hint">{STRIP_WORDS.hint}</span>}
        </div>
        <Calendar d={d} today={today} onMonth={(y, m) => setD({ ...d, y, m })} onPick={(iso) => setD({ ...d, sel: iso, typed: "", err: false })} />
        <div className="o9-spopfoot">
          <button type="button" className="sf-btn sf-btn--sm" disabled={!d.sel} onClick={save} data-strip="save">{isNew ? STRIP_WORDS.addBtn : STRIP_WORDS.save}</button>
          <button type="button" className="sf-link sf-link--quiet" onClick={close} data-strip="cancel">{STRIP_WORDS.cancel}</button>
          <span className="o9-sp" />
          {isSent
            ? <button type="button" className="sf-link sf-link--quiet" data-strip="waive" onClick={() => { onChange(waiveSentDate(query)); close(); }}>{STRIP_WORDS.waive}</button>
            : !isNew && <button type="button" className="sf-link sf-link--quiet o9-rm" data-strip="remove" onClick={() => { onChange(removeEvent(query, target as number)); returnTo.current = "sent"; close(); }}>{STRIP_WORDS.remove}</button>}
        </div>
      </div>
    );
  };

  const tile = (target: Target, status: QueryStatus, name: string, sub: string, cls: string) => {
    const k = keyOf(target);
    const on = d && keyOf(d.target) === k;
    return (
      <div className="o9-stopw" key={k}>
        <button type="button" ref={(el) => { tiles.current.set(k, el); }} className={`o9-stop${cls}${on ? " is-open" : ""}`}
          aria-expanded={!!on} aria-haspopup="dialog" data-step={k} onClick={() => open(target)}>
          <StatusDot status={status} overrideSize={22} decorative />
          <span><b>{name}</b><small>{sub}</small></span>
        </button>
        {pop(target)}
      </div>
    );
  };

  const sentSub = query.sentWaived && !query.sentDate ? STRIP_WORDS.noDate : query.sentDate ? tileDate(query.sentDate) : STRIP_WORDS.addDate;
  const sentCls = `${query.sentDate || query.sentWaived ? "" : " is-miss"}${latest === null ? " is-now" : ""}`;
  const stands = whereItStands(query);
  const bad = eventBeforeSent(query);
  return (
    <div className="o9-stripw" data-strip-for={query.id}>
      <div className="o9-strip" ref={stripRef} data-strip="strip">
        {tile("sent", QueryStatus.QUERIED, STRIP_WORDS.sent, sentSub, sentCls)}
        {order.map((i) => {
          const e = events[i];
          return tile(i, e.type, stepName(e.type), e.date ? tileDate(e.date) : STRIP_WORDS.addDate, `${e.date ? "" : " is-miss"}${i === latest ? " is-now" : ""}`);
        })}
        <div className="o9-stopw" key="new">
          <button type="button" ref={(el) => { tiles.current.set("new", el); }} className={`o9-stop o9-stop--add${d?.target === "new" ? " is-open" : ""}`}
            aria-expanded={d?.target === "new"} aria-haspopup="dialog" data-step="new" onClick={() => open("new")}>{STRIP_WORDS.add}</button>
          {pop("new")}
        </div>
      </div>
      <p className="o9-stands" data-strip="stands">
        {bad ? <span className="o9-warn">{STRIP_WORDS.before}</span>
          : <>{STRIP_WORDS.stands} <b>{stands.stage}</b>, {stands.court}. {STRIP_WORDS.pressAny}</>}
      </p>
    </div>
  );
};
