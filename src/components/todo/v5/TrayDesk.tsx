/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 §C — the desk: one task at a time. Position, the card (head band, who, the 60px dial, the deed, a
 * factual lede, three facts, where it stands, a pinned Corkboard note, the foot), then "Done today".
 *
 * ⚠️ NOTHING HERE WRITES. The action opens a door (the page decides which); "Set aside" opens the snooze panel the
 *    page owns; "Open the query" opens the query panel. The stamp only plays once the card has LEFT the board.
 * ⚠️ THE STATUS IN THE HEAD IS THE REAL `StatusDot`.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import type { Dial, Fact, Stop, TrayItem } from "../../../lib/todoTray";
import type { ClearedAct } from "../../../lib/todoCleared";
import { londonClock } from "../../../lib/todoCleared";
import { dayMonth } from "../../../lib/dates";

export const QUILL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 4c-7 1-11 6-12 13" /><path d="M19 4c0 6-4 10-10 11" /><path d="M5 20l2-3" />
  </svg>
);
const PKG = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11Z" /><path d="M2.5 5 8 7.5 13.5 5M8 7.5v6" />
  </svg>
);

/** the due dial (v138's grammar): rust ring + halo once the date has passed, a navy arc for the share of the
 *  window gone otherwise, dashed with no date */
export const DueDial: React.FC<{ dial: Dial; size: number }> = ({ dial, size }) => {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const h = size / 2;
  return (
    <span className="td5-dial" data-td5="dial" data-kind={dial.kind} data-big={size > 52 ? "" : undefined} data-small={size < 48 ? "" : undefined} data-frac={dial.frac.toFixed(3)}
      style={{ width: size, height: size }} title={dial.title}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {dial.kind === "none" ? (
          <circle cx={h} cy={h} r={r} fill="none" stroke="rgba(28,19,15,.22)" strokeWidth="1.5" strokeDasharray="2.5 3" />
        ) : dial.kind === "late" ? (
          <circle data-td5="dial-arc" cx={h} cy={h} r={r} fill="none" stroke="#a2452a" strokeWidth="2.5" />
        ) : (
          <>
            <circle cx={h} cy={h} r={r} fill="none" stroke="rgba(28,19,15,.1)" strokeWidth="2.5" />
            <circle data-td5="dial-arc" cx={h} cy={h} r={r} fill="none" stroke="#2a3a52" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={`${(c * dial.frac).toFixed(2)} ${c.toFixed(2)}`} transform={`rotate(-90 ${h} ${h})`} />
          </>
        )}
      </svg>
      {dial.kind === "none" ? <small>no<br />date</small> : <><b>{dial.day}</b><small>{dial.mon}</small></>}
    </span>
  );
};

export const Disc: React.FC<{ item: TrayItem }> = ({ item }) =>
  item.initials ? <span className="td5-disc" aria-hidden="true">{item.initials}</span> : <span className="td5-disc" data-own="" aria-hidden="true">{QUILL}</span>;

const sentence = (s: string) => s.toLowerCase().replace(/^./, (x) => x.toUpperCase()).replace(/ & /g, " & ");

export interface DeskCardProps {
  item: TrayItem;
  facts: Fact[];
  lede: string;
  stops: Stop[];
  /** days past the due date, where it has passed */
  pastDays: number | null;
  pin: { text: string; meta: string } | null;
  action: string;
  onAct: () => void;
  asideRef: React.Ref<HTMLButtonElement>;
  onAside: (() => void) | null;
  onOpenQuery: (() => void) | null;
  /** the commit sequence: the stamp's word while it plays */
  stamp: { word: string; navy: boolean } | null;
  phase: "rest" | "stamp" | "leave" | "rise";
}

export const DeskCard: React.FC<DeskCardProps> = ({ item, facts, lede, stops, pastDays, pin, action, onAct, asideRef, onAside, onOpenQuery, stamp, phase }) => {
  const g = item.group;
  return (
    <article className="td5-dcard" data-td5="desk-card" data-key={item.key} data-group={g.id} data-bucket={item.bucket} data-task-type={item.card.taskType ?? (item.card.userTaskId ? "own" : undefined)} data-query={item.query?.id} data-sweep={item.sweep ? "" : undefined} data-phase={phase === "rest" ? undefined : phase === "stamp" ? undefined : phase}>
      <div className="td5-chead" data-td5="desk-head" style={{ background: g.tint, color: g.ink }}>
        <img src={g.art.src} alt="" aria-hidden="true" style={{ width: g.art.w + 6, left: g.art.l + 4, top: g.art.t - 2 }} />
        <span className="td5-cn">{g.name}</span>
        <span className="td5-why">{g.note}</span>
        <span className="td5-sp" />
        {item.query?.status ? (
          <span className="td5-st" data-td5="desk-status"><StatusDot status={item.query.status} overrideSize={18} decorative />{sentence(String(item.query.status))}</span>
        ) : null}
      </div>
      {stamp ? <div className="td5-stamp" data-td5="stamp" data-navy={stamp.navy ? "" : undefined} aria-hidden="true">{stamp.word}</div> : null}
      <div className="td5-cbody">
        <div className="td5-who">
          <Disc item={item} />
          <span className="td5-wn"><b>{item.who}</b>{item.whoSub ? <small>{item.whoSub}</small> : null}</span>
          <DueDial dial={item.dial} size={60} />
        </div>
        <h2 className="td5-deed" data-td5="deed">{item.deed}</h2>
        {lede ? <p className="td5-lede" data-td5="lede">{lede}</p> : null}
        <div className="td5-facts" data-td5="facts">
          {facts.map((f) => (
            <div key={f.label}>
              <span className="td5-fl">{f.label}</span>
              {f.pkg ? <span className="td5-fv"><span className="td5-chip" data-td5="pkg" title={f.value}>{PKG}<span>{f.value}</span></span></span>
                : <span className="td5-fv" data-muted={f.muted ? "" : undefined}>{f.value}</span>}
            </div>
          ))}
        </div>
        {stops.length ? (
          <div className="td5-where" data-td5="where">
            <span className="td5-fl">Where it stands</span>
            <div className="td5-tl">
              {stops.map((s, k) => (
                <React.Fragment key={`${s.status}-${s.ms}-${k}`}>
                  {k > 0 ? <i className="td5-seg" /> : null}
                  <span className="td5-stop" data-td5="stop">
                    <span className="td5-dt">{dayMonth(s.ms)}</span>
                    <span className="td5-g">{s.nudge ? <i /> : <StatusDot status={s.status} overrideSize={18} decorative />}</span>
                    <span className="td5-lb">{s.nudge ? "Nudged" : sentence(s.status)}</span>
                  </span>
                </React.Fragment>
              ))}
              <i className="td5-seg" data-late={pastDays != null ? "" : undefined} style={{ flexGrow: 1.6 }} />
              <span className="td5-today" data-td5="today" data-late={pastDays != null ? "" : undefined}>
                <span className="td5-tdl" data-td5="today-label">{pastDays != null ? `Today · ${pastDays} ${pastDays === 1 ? "day" : "days"} past` : "Today"}</span>
              </span>
            </div>
          </div>
        ) : null}
        {pin ? (
          <div className="td5-pin" data-td5="pin"><p>{pin.text}</p><small>{pin.meta}</small></div>
        ) : null}
      </div>
      <div className="td5-cfoot">
        <button type="button" className="td5-b1" data-td5="act" onClick={onAct}>{action}</button>
        {onAside ? <button type="button" className="td5-b2" data-td5="desk-aside" ref={asideRef} onClick={onAside}>Set aside</button> : null}
        {onOpenQuery ? <button type="button" className="td5-lnk" data-td5="open-query" onClick={onOpenQuery}>Open the query</button> : null}
        <span className="td5-sp" />
        <span className="td5-keys" aria-hidden="true"><kbd>E</kbd> {item.bucket === "note" ? "tick" : "act"}</span>
      </div>
    </article>
  );
};

export const DoneToday: React.FC<{ acts: readonly ClearedAct[]; fresh: string | null; undoFor: (a: ClearedAct) => (() => void) | null; title?: string }> = ({ acts, fresh, undoFor, title = "Done today" }) => (
  <div className="td5-done" data-td5="done">
    <div className="td5-doneh"><b>{title}</b><span data-td5="done-n">{acts.length ? `${acts.length} cleared` : ""}</span></div>
    {acts.length ? (
      <div className="td5-slips">
        {acts.map((a) => {
          const undo = undoFor(a);
          return (
            <div key={a.id} className="td5-slip" data-td5="slip" data-act={a.id} data-new={fresh === a.id ? "" : undefined}>
              <span className="td5-ss" data-navy={a.stamp === "NUDGED" || a.stamp === "SAVED" ? "" : undefined}>{a.stamp}</span>
              <span className="td5-sw3"><b>{a.label}</b><small>{a.timed ? londonClock(a.at) : "Today"} · {a.consequence}</small></span>
              {undo ? <button type="button" data-td5="slip-undo" onClick={undo}>Undo</button> : <span />}
            </div>
          );
        })}
      </div>
    ) : <div className="td5-noslips">Nothing cleared yet today.</div>}
  </div>
);
