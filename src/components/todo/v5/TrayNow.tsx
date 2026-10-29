/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v12 (design-refs/todo-list-v12/todo-list-v12.html, its v8css, v11css and v12css layers) — the page's new
 * sections: Needs you now (the urgent carousel), the all caught up band with Coming up, and the Nothing yet example.
 *
 * ONE CARD GRAMMAR FOR ALL THREE (`NowCard`, the ref's `.v8-c`, itself the Responses request card's `.rc`): a band in
 * the task group's colour with the group's name and, in italic, when; the agent's disc, name and agency; a paper box
 * with the task in the typewriter and one line under it; a footer with a label and a date, and the task's own button.
 *
 * ⚠️ NOTHING HERE WRITES. A card's press and its button are the page's doors (TodoTray): select the task on the desk,
 *    and the button also starts the desk's own journey for it.
 * ⚠️ THE NOTHING YET EXAMPLE IS FIXED COPY (Iris Callahan's offer, Greg Panetta's partial) and is never the writer's data.
 *    It is `aria-hidden` and `inert`: it is a picture of the page, not a part of it.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { urgentSummary, type UrgentFigures } from "../../../lib/todoUrgent";
import { ARMCHAIR_ART } from "./TrayEmpty";

export type NowGroup = "you" | "chase" | "quiet" | "mine" | "tidy";
export interface NowCardData {
  key: string;
  g: NowGroup;
  head: string;
  /** the band's italic right-hand words ("answer by 23 Oct", "due today", "3 mo overdue", "in 18 days") */
  right: string;
  late?: boolean;
  /** an own task: the pencil disc */
  own?: boolean;
  initials?: string | null;
  who: string;
  agency: string;
  deed: string;
  sub: string;
  footLabel: string;
  footDate: string;
  /** after the date: "8 days left" (calm) or "3 mo overdue" (rust) */
  footExtra?: string;
  footLate?: boolean;
  /** the card's own button; navy for Your move, white otherwise */
  action?: string;
  white?: boolean;
  /** the task's due day and type, as attributes (what the v12 L2 lock reads the urgent rule back from) */
  due?: string | null;
  taskType?: string;
}

const CAL_ICON = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" /></svg>
);

export const NowCard: React.FC<{
  c: NowCardData;
  on?: boolean;
  /** pressing the card (and Enter or Space on it) */
  onPress?: (() => void) | null;
  /** pressing its button */
  onAct?: (() => void) | null;
  /** an example card: nothing is pressable, the button leaves the tab order */
  example?: boolean;
  data?: Record<`data-${string}`, string>;
}> = ({ c, on = false, onPress = null, onAct = null, example = false, data }) => (
  <article className={`td12-c${on ? " on" : ""}`} data-g={c.g} data-td12-card={c.key} data-own={c.own ? "" : undefined}
    data-due={c.due ?? undefined} data-task-type={c.taskType}
    tabIndex={onPress ? 0 : undefined} aria-label={onPress ? `${c.head}: ${c.deed}${c.own ? "" : `, ${c.who}`}` : undefined}
    onClick={onPress ? () => onPress() : undefined}
    onKeyDown={onPress ? (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onPress(); } } : undefined}
    {...data}>
    <div className="td12-ch"><span>{c.head}</span>{c.right ? <small className={c.late ? "late" : undefined} data-td12="right">{c.right}</small> : null}</div>
    <div className="td12-cb">
      <div className="td12-who">
        {c.own ? <span className="td12-disc mine" aria-hidden="true">✎</span> : <span className="td12-disc" aria-hidden="true">{c.initials ?? "··"}</span>}
        <span><b>{c.who}</b>{c.agency ? <i>{c.agency}</i> : null}</span>
      </div>
      <div className="td12-ask"><b data-td12="deed">{c.deed}</b>{c.sub ? <small>{c.sub}</small> : null}</div>
    </div>
    <div className="td12-cf">
      <span><span className="lbl">{c.footLabel}</span><span className="d">{c.footDate}</span>{c.footExtra ? <em className={c.footLate ? undefined : "calm"}>{c.footExtra}</em> : null}</span>
      {c.action ? (
        <button type="button" className={`td12-go${c.white ? " w" : ""}`} data-td12="go" tabIndex={example ? -1 : undefined}
          onClick={onAct ? (e) => { e.stopPropagation(); onAct(); } : undefined}>{c.action}</button>
      ) : null}
    </div>
  </article>
);

/** the summary line under "Needs you now": the overdue part rust and semibold */
export const NowSummary: React.FC<{ f: UrgentFigures }> = ({ f }) => {
  const s = urgentSummary(f);
  if (!s) return null;
  const n = s.parts.length;
  return (
    <p className="td12-sub" data-td12="summary">
      {s.lead}
      {s.parts.map((p, k) => (
        <React.Fragment key={p.text}>
          {k > 0 ? (k === n - 1 ? " and " : ", ") : null}
          {p.overdue ? <span className="od">{p.text}</span> : p.text}
        </React.Fragment>
      ))}.
    </p>
  );
};

/**
 * v12 Phase 1 §2 — NEEDS YOU NOW. The heading and its summary, then on the right a white "Calendar" button (always)
 * and round ← → buttons that scroll the carousel by one card (only while there are more cards than fit). With nothing
 * urgent, one white panel instead of cards.
 */
export const NeedsYouNow: React.FC<{
  cards: NowCardData[];
  figures: UrgentFigures;
  sel: string | null;
  onPress: (key: string) => void;
  onAct: (key: string) => void;
  onCalendar: () => void;
  loading?: boolean;
}> = ({ cards, figures, sel, onPress, onAct, onCalendar, loading = false }) => {
  const car = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ more: false, start: true, end: true });
  const read = useCallback(() => {
    const el = car.current;
    if (!el) return;
    const more = el.scrollWidth > el.clientWidth + 2;
    const next = { more, start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 };
    setEdge((e) => (e.more === next.more && e.start === next.start && e.end === next.end ? e : next));
  }, []);
  useEffect(() => {
    read();
    const el = car.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [read, cards.length]);
  /* ⚠️ THE CARDS ARRIVE IN STAGES WHILE THE BOARD LOADS, AND A SNAP CONTAINER RE-SNAPS TO THE CARD IT WAS ON: left alone,
     the first card snapped at mount is held in view wherever the final order puts it (measured: scrollLeft 4064 on load,
     the offers off to the left). So whenever the set of cards changes the carousel starts again at its first card. */
  const sig = cards.map((c) => c.key).join("|");
  useLayoutEffect(() => {
    const el = car.current;
    if (el && el.scrollLeft !== 0) el.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
    read();
  }, [sig, read]);
  const by = (d: number) => {
    const el = car.current, c = el?.querySelector<HTMLElement>(".td12-c");
    if (el && c) el.scrollBy({ left: d * (c.offsetWidth + 18) });
  };
  return (
    <section className="td7-sec td12-now" aria-labelledby="td12-now-h" data-td12="now">
      <div className="td12-row">
        <div>
          <h2 className="td7-h2" id="td12-now-h">Needs you now</h2>
          {loading ? <p className="td12-sub" aria-hidden="true">&nbsp;</p> : <NowSummary f={figures} />}
        </div>
        <div className="td12-ctl">
          <button type="button" className="td12-cal" data-td12="calendar" disabled={loading} onClick={onCalendar}>{CAL_ICON}Calendar</button>
          <span className="td12-arrows" data-td12="arrows" style={{ visibility: edge.more ? "visible" : "hidden" }} aria-hidden={edge.more ? undefined : true}>
            <button type="button" className="td12-rb" data-td12="prev" aria-label="Previous" disabled={edge.start} tabIndex={edge.more ? undefined : -1} onClick={() => by(-1)}>←</button>
            <button type="button" className="td12-rb" data-td12="next" aria-label="Next" disabled={edge.end} tabIndex={edge.more ? undefined : -1} onClick={() => by(1)}>→</button>
          </span>
        </div>
      </div>
      {loading ? <div className="td12-car" aria-hidden="true" /> : cards.length ? (
        <div className="td12-car" ref={car} data-td12="carousel" onScroll={read}>
          {cards.map((c) => <NowCard key={c.key} c={c} on={sel === c.key} onPress={() => onPress(c.key)} onAct={() => onAct(c.key)} />)}
        </div>
      ) : (
        <div className="td12-none" data-td12="none"><b>Nothing urgent.</b> The rest of your tasks are below.</div>
      )}
    </section>
  );
};

/** v12 Phase 3 §2 — the acknowledgement: a blush band with the armchair hawk breaking out of it */
export const CaughtAck: React.FC<{ cleared: number; until: string | null }> = ({ cleared, until }) => (
  <section className="td12-ack" aria-label="All caught up" data-td12="ack">
    <img src={ARMCHAIR_ART} alt="" aria-hidden="true" width={170} />
    <div>
      <h2 className="td12-ackh">You’re all caught up.</h2>
      <p data-td12="ack-line">
        {cleared ? `You cleared ${cleared} ${cleared === 1 ? "task" : "tasks"} today. ` : null}
        {until ? <>{cleared ? "Nothing else is due until " : "Nothing is due until "}<b>{until}</b>.</> : "Nothing else is due yet."}
      </p>
    </div>
  </section>
);

/** v12 Phase 3 §3 — Coming up: up to three cards in a three-column grid; left out when nothing is dated ahead */
export const ComingUpCards: React.FC<{ cards: { c: NowCardData; onOpen: (() => void) | null }[] }> = ({ cards }) => (cards.length ? (
  <section className="td7-sec td12-up" aria-labelledby="td12-up-h" data-td12="coming-up">
    <h2 className="td7-h2" id="td12-up-h">Coming up</h2>
    <p className="td12-sub td12-upsub">Your next three tasks and when they’re due.</p>
    <div className="td12-grid">
      {cards.map(({ c, onOpen }) => <NowCard key={c.key} c={{ ...c, action: onOpen ? c.action : undefined }} onAct={onOpen} />)}
    </div>
  </section>
) : null);

const EXAMPLE: NowCardData[] = [
  { key: "ex-iris", g: "you", head: "Your move", right: "answer by 23 Oct", initials: "IC", who: "Iris Callahan", agency: "Northgate Literary",
    deed: "Reply to the offer", sub: "Iris has offered representation.", footLabel: "Answer by", footDate: "23 Oct", action: "Open the offer" },
  { key: "ex-greg", g: "you", head: "Your move", right: "3 wk overdue", late: true, initials: "GP", who: "Greg Panetta", agency: "Curtis Vane",
    deed: "Send your partial", sub: "Greg asked for the first 50 pages.", footLabel: "Due", footDate: "26 Sep", action: "Mark sent" },
];

/** v12 Phase 4 §2 — the example well: a faded preview of the page beside "How this page works" */
export const NothingYetWell: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  /* `inert` is a boolean attribute React 19 passes through; set it on the node so the column takes no focus anywhere */
  const ghost = useRef<HTMLDivElement>(null);
  useEffect(() => { ghost.current?.setAttribute("inert", ""); }, []);
  return (
    <section className="td12-stage" aria-labelledby="td12-how-h" data-td12="example">
      <span className="td12-ex">Example</span>
      <div className="td12-ghost" aria-hidden="true" ref={ghost} data-td12="ghost">
        <h2>Needs you now</h2>
        <p className="gsub">3 things to do first: 1 overdue, 1 due today and an offer to answer.</p>
        <div className="gcards">{EXAMPLE.map((c) => <NowCard key={c.key} c={c} example />)}</div>
        <div className="gsheet">
          <div className="gbar"><i style={{ width: 260 }} /><i style={{ width: 92 }} /><i style={{ width: 150 }} /></div>
          {[0, 1, 2, 3].map((k) => <div key={k} className="grow"><span className="d" /><span><b /><s /></span><em /></div>)}
        </div>
      </div>
      <div className="td12-fade" aria-hidden="true" />
      <div className="td12-how" data-td12="how">
        <h2 className="td12-howh" id="td12-how-h">How this page works</h2>
        <p>Log a query and QueryHawk adds a task here whenever there’s something for you to do on it.</p>
        <ol className="td12-steps" data-td12="steps">
          <li><span className="num">1</span><b>Log a query</b><span>Add the agent, the date you sent it and what you included.</span></li>
          <li><span className="num">2</span><b>We track the dates</b><span>When requested pages are due, when a reply is due and when it’s fair to nudge.</span></li>
          <li><span className="num">3</span><b>Tasks appear here</b><span>Sending a partial, nudging an agent or closing a query that’s gone quiet.</span></li>
        </ol>
        <div className="td12-own">
          <p>You can add your own tasks too, like rewriting your synopsis.</p>
          <button type="button" data-td12="how-add" onClick={onAdd}>+ Add a task</button>
        </div>
      </div>
    </section>
  );
};
