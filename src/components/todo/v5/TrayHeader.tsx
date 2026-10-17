/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 §A — the header, built as Contact list v17.1's (eyebrow, the 50px title, the byline, two buttons,
 * the hawk shadow) with ONE card: three counts that filter, and "Cleared this week".
 *
 * ⚠️ THE TITLE'S n IS THE SIDEBAR BADGE'S NUMBER (`boardFigures(cols).cards`), passed in by the page that derives
 *    both from the one `assembleBoardColumns`. The h1 keeps `data-page-title`.
 * ⚠️ THE ROWS ARE THE CONTROLS; the bar's segments take a press too but are `aria-hidden`. A press filters the
 *    tray (the Task type pill's state); it never scrolls.
 * ⚠️ THE RING: ink is cleared this week, rust is still in the tray, with cream ticks at both joins (v17.1's health
 *    ring, re-read for tasks). Its figures are `lib/todoCleared`'s and the board's.
 */
import React from "react";
import type { TrayKind } from "../../../lib/todoTray";
import { TRAY_KINDS } from "../../../lib/todoTray";

export const TODO_EYEBROW = "— TO-DO LIST —";
export const TODO_SHADOW = "/images/hawk-shadow.png?v=1";
export const titleWords = (n: number) => (n === 1 ? "task in your tray" : "tasks in your tray");

const RING = { box: 95, r: 42, w: 9, join: 2.5 };
const RING_C = 2 * Math.PI * RING.r;

export const ClearedRing: React.FC<{ cleared: number; left: number; loading?: boolean }> = ({ cleared, left, loading }) => {
  const c = RING.box / 2;
  const total = cleared + left;
  const share = total ? cleared / total : 1;
  const ink = loading ? 0 : RING_C * share;
  const rot = `rotate(-90 ${c} ${c})`;
  const joins = !loading && cleared > 0 && left > 0;
  return (
    <span className="td5-rg" data-td5="ring" data-share={loading ? "" : share.toFixed(4)}>
      <svg viewBox={`0 0 ${RING.box} ${RING.box}`} aria-hidden="true">
        {left > 0 || loading ? <circle data-td5="ring-left" cx={c} cy={c} r={RING.r} fill="none" stroke="#a2452a" strokeOpacity={loading ? 0.12 : 0.85} strokeWidth={RING.w} /> : null}
        {ink > 0 ? <circle data-td5="ring-ink" cx={c} cy={c} r={RING.r} fill="none" stroke="#2a3a52" strokeWidth={RING.w} strokeLinecap="butt"
          strokeDasharray={`${ink.toFixed(2)} ${RING_C.toFixed(2)}`} transform={rot} style={{ transition: "stroke-dasharray .6s cubic-bezier(.22,.8,.3,1)" }} /> : null}
        {joins ? (
          <>
            <circle data-td5="ring-join" cx={c} cy={c} r={RING.r} fill="none" stroke="#fff" strokeWidth={RING.w + 1}
              strokeDasharray={`${RING.join} ${RING_C - RING.join}`} strokeDashoffset={RING.join / 2} transform={rot} />
            <circle data-td5="ring-join" cx={c} cy={c} r={RING.r} fill="none" stroke="#fff" strokeWidth={RING.w + 1}
              strokeDasharray={`${RING.join} ${RING_C - RING.join}`} strokeDashoffset={-(ink - RING.join / 2)} transform={rot} />
          </>
        ) : null}
      </svg>
      <span className="td5-pc" data-td5="ring-n">{loading ? "" : cleared}</span>
    </span>
  );
};

const SEG: Record<TrayKind, string> = { you: "you", chase: "chase", tidy: "tidy" };

export const TrayHeader: React.FC<{
  loading: boolean;
  /** null while loading */
  n: number | null;
  /** the empty-tray title */
  caught?: boolean;
  msTitle: string | null;
  counts: Record<TrayKind, number>;
  active: TrayKind | null;
  onKind: (k: TrayKind) => void;
  cleared: number;
  onRing: () => void;
  ringTitle: string;
  onAdd: () => void;
  asideN: number;
  asideRef: React.Ref<HTMLButtonElement>;
  onAside: () => void;
  /** v5.2 §A — on the populated page the card's contents are the calendar (TrayCalendar); caught up and empty keep v5.1's */
  calendar?: React.ReactNode;
  /** a calendar filter is on: the card's other rows fade */
  calFiltered?: boolean;
  /** v5.2 §F.1 — the populated title: "{o} overdue · {t} due today" (Part B's figures) */
  urgent?: { overdue: number; today: number } | null;
  children?: React.ReactNode;
}> = ({ loading, n, caught, msTitle, counts, active, onKind, cleared, onRing, ringTitle, onAdd, asideN, asideRef, onAside, calendar, calFiltered, urgent, children }) => {
  const left = n ?? 0;
  /* v5.2 §F.1 — the title says what's urgent, from Part B; it ticks when the figure changes (never on arrival) */
  const urgentKey = urgent ? `${urgent.overdue}-${urgent.today}` : "";
  const seenKey = React.useRef<string | null>(null);
  const tick = !!urgent && seenKey.current !== null && seenKey.current !== urgentKey;
  React.useEffect(() => { if (urgent) seenKey.current = urgentKey; }, [urgentKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const urgentWords = urgent
    ? (urgent.overdue || urgent.today ? [urgent.overdue ? `${urgent.overdue} overdue` : "", urgent.today ? `${urgent.today} due today` : ""].filter(Boolean).join(" · ") : "Nothing due today")
    : "";
  return (
    <header className="td5-hd" data-td5="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
      <img className="td5-shadow" data-td5="shadow" alt="" aria-hidden="true" src={TODO_SHADOW} />
      <div className="td5-tr" data-td5="header-row">
        <div className="td5-tb" data-td5="title-block">
          <span className="td5-ey" data-td5="eyebrow">{TODO_EYEBROW}</span>
          <h1 className="td5-title" data-page-title="" data-td5="title" tabIndex={-1}
            aria-label={caught ? "Your tray is empty" : urgent && n !== null ? urgentWords : n === null ? "Tasks in your tray" : `${n} ${titleWords(n)}`}>
            <span aria-hidden="true">
              {caught ? "Your tray is empty" : urgent && n !== null ? (
                <span key={urgentKey} className={`td52-urg${tick ? " tick" : ""}`} data-td52="title-urgent">
                  {urgent.overdue ? <span className="td52-od" data-td52="title-od">{urgent.overdue} overdue</span> : null}
                  {urgent.overdue && urgent.today ? " · " : null}
                  {urgent.today ? <span data-td52="title-today">{urgent.today} due today</span> : null}
                  {!urgent.overdue && !urgent.today ? "Nothing due today" : null}
                </span>
              ) : (
                <>{n === null ? <span className="td5-blank">00</span> : <span data-td5="title-n">{n}</span>}{" "}{titleWords(n ?? 0)}</>
              )}
            </span>
          </h1>
          <div className="td5-by" data-td5="byline">
            {msTitle ? <span className="td5-byt">for <i className="td5-ms">{msTitle}</i></span> : <span className="td5-byt">for your book</span>}
          </div>
        </div>
        <div className="td5-acts" data-td5="acts">
          <button type="button" className="td5-b1" data-td5="add" disabled={loading} onClick={onAdd}>+ Add a task</button>
          <button type="button" className="td5-b2" data-td5="aside" ref={asideRef} disabled={loading} onClick={onAside}>{asideN ? `Set aside · ${asideN}` : "Set aside"}</button>
        </div>
        {calendar ? (
          <div className="td5-card td52-cal" data-td5="card" data-td52="cal" data-filtered={calFiltered ? "" : undefined}>{calendar}</div>
        ) : (
        <div className="td5-card" data-td5="card" data-on={active ?? undefined}>
          <div className="td5-cnt" data-td5="counts" role="group" aria-label="What is in your tray">
            <div className="td5-bar" data-td5="card-bar" aria-hidden="true">
              {TRAY_KINDS.filter((k) => loading || counts[k.id] > 0).map((k) => (
                <i key={k.id} className={`td5-sg td5-sg--${SEG[k.id]}`} data-td5="card-seg" data-k={k.id}
                  data-on={active === k.id ? "" : undefined} style={{ flex: `${loading ? 1 : counts[k.id]} 1 0` }}
                  onClick={loading ? undefined : () => onKind(k.id)} />
              ))}
            </div>
            {TRAY_KINDS.map((k) => (
              <button key={k.id} type="button" className="td5-row" data-td5="card-row" data-k={k.id}
                aria-pressed={active === k.id} disabled={loading} onClick={() => onKind(k.id)}>
                <i className={`td5-sw td5-sg--${SEG[k.id]}`} aria-hidden="true" />
                <b className="td5-n" data-td5="card-n">{loading ? "" : counts[k.id]}</b>
                <span className="td5-lb">{k.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="td5-hl" data-td5="cleared" data-none={left === 0 ? "" : undefined} disabled={loading} onClick={onRing}
            aria-label={`Cleared this week: ${cleared}. ${left} still to do.`} title={ringTitle}>
            <ClearedRing cleared={cleared} left={left} loading={loading} />
            <span className="td5-ht">
              <b>Cleared this week</b>
              <em data-td5="still">{loading ? "" : left ? `${left} still to do` : "Nothing left to do"}</em>
            </span>
          </button>
        </div>
        )}
      </div>
      {children}
    </header>
  );
};
