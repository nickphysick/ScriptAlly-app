/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1 (design-refs/log-a-query-v1/log-a-query-v1.html + screens/) — THE STAGED JOURNEY. One question a
 * screen, in the same side panel and FlowHead as before: Agent → Sent → Materials → How → Log (the check). A stepper on
 * the FlowHead's ground keeps what has been answered; a done segment takes the writer back to that stage. Answering a
 * stage moves on, and skips every stage already answered, so a Change or a batch lands straight back on the check.
 *
 * ⚠️ NOTHING HERE WRITES. The host's `onSave` is the log save (lib/queryActions/logSave) through the shared model in
 *    lib/queryActions/logStages; this component only collects the answers and shows what they will make.
 * ⚠️ NO FREE-TEXT DATE AND NO NATIVE <select>: the date is Today / Yesterday / an inline calendar, and every choice is
 *    a big row or our own menu.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SubmissionMethod } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { FlowHead, FLOW_WORDS } from "../../shared/FlowHead";
import {
  HOW, MILESTONE, MONL, PREVIEW_ID, STAGES, celebrationLine, STAGE_LABEL, STAGE_LINE, askWords, batchCheckLine, batchWhoLine, checkLine, calMonth, dayMon, dayMonY, howLabel, packageFits, piecesFromAsk, piecesMatchAsk,
  planOf, previewOf, sameDay, sizeName, sizesFor, sod, titleName, weekdayDay, whoGroups, yesterday, type Preview,
  type BookChoice, type Choice, type LogAnswers, type Pieces, type PlanContext, type SampleChoice, type StageAgent, type StageKey, type StagePackage,
} from "../../../lib/queryActions/logStages";
import { QcSlip153 } from "./QcSlip153";
import { IlloSlot } from "../IlloSlot";
import "../../../marketing/heroCard.css";
import "./qcv149card.css";
import "./qcLogStages.css";

export const ICON = {
  search: <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#2a3a52" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.6" /><path d="M12.8 12.8l4 4" /></svg>,
  arrow: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>,
  chev: <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#7d7268" strokeWidth="1.5" aria-hidden="true"><path d="M2 3.5l3 3 3-3" /></svg>,
  l: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>,
  r: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>,
  cal: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5b4f47" strokeWidth="1.4" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 7h11M5.5 2v3M10.5 2v3" /></svg>,
  pkg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.4" aria-hidden="true"><path d="M2.5 5.5L8 3l5.5 2.5v5L8 13l-5.5-2.5z M2.5 5.5L8 8l5.5-2.5M8 8v5" /></svg>,
  mail: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5b4f47" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="M2.5 4.5L8 9l5.5-4.5" /></svg>,
  web: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5b4f47" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2 6h12M5 9h6M5 11h4" /></svg>,
  post: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5b4f47" strokeWidth="1.4" aria-hidden="true"><path d="M3 6.5h10v6.5H3z M5 6.5V3h6v3.5" /></svg>,
} as const;

/** what a save hands back: the new query's id, how to undo it, and the door to its card */
export interface Logged { id: string; undo: () => Promise<void>; openCard: () => void }
/** the celebration's facts, fixed at the moment of the log */
interface LoggedView extends Logged { n: number; first: string; preview: Preview; weeks: number | null; before: FlowState }

export function useReducedMotion(): boolean {
  const q = "(prefers-reduced-motion: reduce)";
  const [r, setR] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

export interface QcLogStagesProps {
  nowMs: number;
  agents: readonly StageAgent[];
  seedAgentId: string | null;
  bookTitle: string;
  packages: readonly StagePackage[];
  activePackageId: string | null;
  letters: readonly Choice[];
  synopses: readonly Choice[];
  bookVersions: readonly BookChoice[];
  /** this book's queries so far (the new one is n = count + 1) */
  count: number;
  quietWeeks: number;
  ctx: PlanContext;
  onClose: () => void;
  /** "+ Add {Name} as a new agent": opens Adding new agent; `done` is handed the new agent's id */
  onAddAgent: (name: string, done: (id: string) => void) => void;
  onSave: (a: LogAnswers) => Promise<Logged | null>;
}

export interface FlowState {
  step: StageKey;
  dir: "in" | "back" | "";
  find: string;
  hi: number;
  showBusy: boolean;
  agentId: string | null;
  sent: number | null;
  earlier: boolean;
  calY: number;
  calM: number;
  /** packages view, or the pieces chosen one by one */
  custom: boolean;
  packageId: string | null;
  pieces: Pieces;
  piecesSet: boolean;
  piecesTouched: boolean;
  via: SubmissionMethod | null;
  note: string;
  noteOpen: boolean;
  /** the first name of the agent just logged with "Log and start another" */
  carried: string | null;
}

export const freshState = (nowMs: number): FlowState => ({
  step: "who", dir: "", find: "", hi: 0, showBusy: false, agentId: null, sent: null, earlier: false,
  calY: new Date(nowMs).getFullYear(), calM: new Date(nowMs).getMonth(),
  custom: false, packageId: null, pieces: { letterId: null, synopsisId: null, sample: null }, piecesSet: false, piecesTouched: false,
  via: null, note: "", noteOpen: false, carried: null,
});

export const answered = (s: FlowState, k: StageKey): boolean =>
  k === "who" ? !!s.agentId : k === "when" ? s.sent != null : k === "what" ? s.piecesSet : k === "how" ? !!s.via : false;
/** the next stage not yet answered, after `from` (the check when everything is) */
export function nextStage(s: FlowState, from: StageKey): StageKey {
  for (let j = STAGES.indexOf(from) + 1; j < STAGES.length; j++) if (!answered(s, STAGES[j])) return STAGES[j];
  return "check";
}

/** stand-ins for a piece the book has no version of yet: ticked, but recorded with no version id */
export const NO_LETTER = "__letter";
export const NO_SYN = "__synopsis";
const NO_PIECES: Pieces = { letterId: null, synopsisId: null, sample: null };
const NO_ASK = { ql: true, syn: true, sample: { unit: "none" as const, amt: 0, from: 1, sect: false, fu: null }, stated: false };

/* ── the shared parts ─────────────────────────────────────────────────────────────────────────────────────────── */

export const Stepper: React.FC<{ s: FlowState; values: Record<StageKey, string | null>; onGo: (k: StageKey) => void }> = ({ s, values, onGo }) => (
  <div className="qls-steps" data-qls="steps" role="list">
    {STAGES.map((k) => {
      const now = s.step === k;
      const done = !now && answered(s, k);
      return (
        <button key={k} type="button" role="listitem" className={`qls-st${now ? " is-now" : ""}${done ? " is-done" : ""}`} data-qls="step" data-k={k}
          data-state={now ? "now" : done ? "done" : "todo"} disabled={!done} aria-current={now ? "step" : undefined}
          aria-label={done ? `${STAGE_LABEL[k]}: ${values[k] ?? ""}. Change it` : STAGE_LABEL[k]} onClick={() => onGo(k)}>
          {STAGE_LABEL[k]}<b data-qls="step-value">{done ? values[k] ?? "" : " "}</b>
        </button>
      );
    })}
  </div>
);

export const BigRow: React.FC<{
  glyph: React.ReactNode; glyphClass?: string; title: string; sub?: string | null; tag?: React.ReactNode; tagClass?: string;
  on?: boolean; hi?: boolean; arrow?: boolean; onClick: () => void; data?: Record<string, string>;
}> = ({ glyph, glyphClass, title, sub, tag, tagClass, on, hi, arrow = true, onClick, data }) => (
  <button type="button" className={`${on ? "is-on" : ""}${hi ? " is-hi" : ""}`} onClick={onClick} aria-pressed={on ? true : undefined} {...data}>
    <span className={`qls-g${glyphClass ? ` ${glyphClass}` : ""}`} aria-hidden="true">{glyph}</span>
    <span className="qls-tx"><b>{title}</b>{sub ? <span>{sub}</span> : null}</span>
    {tag ? <span className={`qls-tag${tagClass ? ` ${tagClass}` : ""}`} data-qls="tag">{tag}</span> : null}
    {arrow ? <span className="qls-ar" aria-hidden="true">{ICON.arrow}</span> : null}
  </button>
);

/* ── the celebration ──────────────────────────────────────────────────────────────────────────────────────────── */

/** the slip colours, falling once */
const CONFETTI = ["#efe7da", "#ecd6d2", "#d3dce7", "#e7d6dc", "#2a3a52", "#e0d2bb"] as const;
/** a fixed scatter (no Math.random in render): each piece's start, drift, spin, length and delay */
const PIECES = Array.from({ length: 46 }, (_, i) => {
  const r = (k: number) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  return { left: 6 + r(1) * 88, x: r(2) * 120 - 60, rot: r(3) * 720 - 360, dur: 1600 + r(4) * 1200, wait: 250 + r(5) * 500, dot: i % 3 === 0, c: CONFETTI[i % CONFETTI.length] };
});
/**
 * ⚠️ THE FALL IS THE WEB ANIMATIONS API, NOT A CSS KEYFRAME: a `var()` inside `@keyframes` fails silently in this
 * setup, and each piece needs its own drift and spin. One animation each, run once, and the layer removed after.
 */
const Confetti: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const els = [...(ref.current?.querySelectorAll<HTMLElement>("i") ?? [])];
    const anims = els.map((el, i) => {
      const p = PIECES[i];
      return el.animate?.([{ transform: "translate(0,0) rotate(0deg)", opacity: 0.9 }, { transform: `translate(${p.x}px,720px) rotate(${p.rot}deg)`, opacity: 0 }],
        { duration: p.dur, delay: p.wait, easing: "cubic-bezier(.3,.6,.6,1)", fill: "both" });
    });
    const t = window.setTimeout(() => setGone(true), 3600);
    return () => { window.clearTimeout(t); anims.forEach((a) => a?.cancel()); };
  }, []);
  if (gone) return null;
  return (
    <div ref={ref} className="qls-conf" data-qls="confetti" aria-hidden="true">
      {PIECES.map((p, i) => <i key={i} className={p.dot ? "is-dot" : undefined} style={{ left: `${p.left}%`, background: p.c }} />)}
    </div>
  );
};

/** "Off to {First}." types itself out, like the page titles (all at once under reduced motion) */
const TypedHead: React.FC<{ text: string; reduce: boolean }> = ({ text, reduce }) => {
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) { setN(text.length); return; }
    let i = 0, t = 0;
    const tick = () => { i++; setN(i); if (i < text.length) t = window.setTimeout(tick, 55); };
    t = window.setTimeout(tick, 350);
    return () => window.clearTimeout(t);
  }, [text, reduce]);
  return (
    <h2 className="qls-yh" data-qls="yay-head" aria-label={text}>
      <span aria-hidden="true">{text.slice(0, n)}</span>{n < text.length ? <span className="qls-cur" aria-hidden="true" /> : null}
    </h2>
  );
};

/** the count rolls from n−1 to n, the landing odometer's roll in the ref's form */
const Odometer: React.FC<{ n: number }> = ({ n }) => {
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true))); return () => cancelAnimationFrame(r); }, []);
  return (
    <span className={`qls-odo${go ? " is-go" : ""}`} data-qls="odometer" data-n={n} aria-label={String(n)}>
      <span aria-hidden="true"><b>{n - 1}</b><b>{n}</b></span>
    </span>
  );
};

/* ── the journey ──────────────────────────────────────────────────────────────────────────────────────────────── */

export const QcLogStages: React.FC<QcLogStagesProps> = (p) => {
  const { nowMs, agents } = p;
  const [s, setS] = useState<FlowState>(() => freshState(nowMs));
  const set = (patch: Partial<FlowState>) => setS((o) => ({ ...o, ...patch }));
  /* the flow, then the celebration once a query is logged with "Log query" */
  const [phase, setPhase] = useState<"flow" | "yay">("flow");
  const [logged, setLogged] = useState<LoggedView | null>(null);
  const agent = agents.find((a) => a.id === s.agentId) ?? null;
  const findRef = useRef<HTMLInputElement>(null);
  const sbRef = useRef<HTMLDivElement>(null);

  const go = (step: StageKey, dir?: "in" | "back") => setS((o) => ({ ...o, step, hi: 0, dir: dir ?? (STAGES.indexOf(step) > STAGES.indexOf(o.step) ? "in" : "back") }));
  /** answer the current stage and move on, skipping anything already answered */
  const answer = (patch: Partial<FlowState>) => setS((o) => {
    const n = { ...o, ...patch };
    return { ...n, step: nextStage(n, o.step), hi: 0, dir: "in" };
  });

  /* a seeded agent (the Contact list's "+ Log a query") is the first answer */
  useEffect(() => {
    const a = p.seedAgentId ? agents.find((x) => x.id === p.seedAgentId && !x.querying) : null;
    if (a) answer({ agentId: a.id });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id: string) => {
    const a = agents.find((x) => x.id === id);
    if (!a) return;
    /* how always comes from the agent's own card in a batch; otherwise the How stage asks, with the card's first */
    answer({ agentId: id, find: "", via: s.carried ? a.via : null });
  };

  /* ── the Agent stage ── */
  const g = useMemo(() => whoGroups(agents, s.find), [agents, s.find]);
  const pick = [...g.ready, ...g.closed];
  const hi = Math.min(s.hi, Math.max(0, pick.length - 1));
  useEffect(() => { if (s.step === "who") findRef.current?.focus({ preventScroll: true }); }, [s.step]);
  useLayoutEffect(() => {
    if (s.step !== "who") return;
    sbRef.current?.querySelector<HTMLElement>(".qls-big > button.is-hi")?.scrollIntoView({ block: "nearest" });
  }, [hi, s.step]);

  const whoBody = () => {
    let i = 0;
    const row = (a: StageAgent) => {
      const k = i++;
      return (
        <BigRow key={a.id} glyph={a.initials} title={a.name} sub={a.agency} hi={k === hi} onClick={() => choose(a.id)}
          tag={a.closed ? (a.reopens ? `Closed until ${a.reopens}` : "Closed to queries") : null} tagClass={a.closed ? "is-closed" : undefined}
          data={{ "data-qls": "agent", "data-id": a.id, "data-group": a.closed ? "closed" : "ready" }} />
      );
    };
    const q = s.find.trim();
    const off = (a: StageAgent) => (
      <div key={a.id} className="qls-off" data-qls="agent-busy" data-id={a.id}>
        <span className="qls-g" aria-hidden="true">{a.initials}</span><b>{a.name}</b>
        <span>{a.queriedMs != null ? `queried ${dayMon(a.queriedMs)}` : "already querying"}</span>
      </div>
    );
    const nm = titleName(q);
    return (
      <>
        <h2 className="qls-qh">Who are you querying?</h2>
        <label className="qls-srch">{ICON.search}
          <input ref={findRef} value={s.find} data-qls="find" placeholder="Find an agent in your Contact list" aria-label="Find an agent in your Contact list" autoComplete="off"
            onChange={(e) => set({ find: e.target.value, hi: 0 })}
            onKeyDown={(e) => {
              const n = pick.length;
              if (e.key === "ArrowDown" && n) { e.preventDefault(); set({ hi: (hi + 1) % n }); }
              else if (e.key === "ArrowUp" && n) { e.preventDefault(); set({ hi: (hi - 1 + n) % n }); }
              else if (e.key === "Enter" && n) { e.preventDefault(); choose(pick[hi].id); }
            }} />
        </label>
        {g.ready.length ? <><div className="qls-grp" data-qls="group" data-k="ready">Ready to query <span>{g.ready.length}</span></div><div className="qls-big">{g.ready.map(row)}</div></> : null}
        {g.closed.length ? <><div className="qls-grp" data-qls="group" data-k="closed">Closed right now <span>{g.closed.length}</span></div><div className="qls-big">{g.closed.map(row)}</div></> : null}
        {q && g.busyHit.length ? <><div className="qls-grp" data-qls="group" data-k="busy">Already querying</div>{g.busyHit.map(off)}</> : null}
        {!q && g.busy.length ? (s.showBusy
          ? <><div className="qls-grp" data-qls="group" data-k="busy">Already querying <span>{g.busy.length}</span><button type="button" className="qls-lk" style={{ marginLeft: "auto", fontSize: 13.5 }} data-qls="busy-hide" onClick={() => set({ showBusy: false })}>Hide</button></div>{g.busy.map(off)}</>
          : <button type="button" className="qls-busy" data-qls="busy" onClick={() => set({ showBusy: true })}>
              <span className="qls-faces" aria-hidden="true">{g.busy.slice(0, 4).map((a) => <i key={a.id}>{a.initials}</i>)}</span>
              You're already querying {g.busy.length} {g.busy.length === 1 ? "agent" : "agents"} with this book<u>Show</u>
            </button>) : null}
        {q && !pick.length && !g.busyHit.length ? (
          <div className="qls-none" data-qls="none">No one called “{q}” in your Contact list.<br />
            <button type="button" className="qls-btn is-ghost is-sm" style={{ marginTop: 10 }} data-qls="new-agent" onClick={() => p.onAddAgent(nm, (id) => answer({ agentId: id, find: "" }))}>+ Add {nm} as a new agent</button>
          </div>
        ) : null}
      </>
    );
  };

  /* ── the Sent stage ── */
  const first = agent?.first ?? "the agent";
  const y = yesterday(nowMs);
  const isEarlier = s.sent != null && !sameDay(s.sent, nowMs) && !sameDay(s.sent, y);
  const calRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (s.earlier && calRef.current && sbRef.current) sbRef.current.scrollTop = sbRef.current.scrollHeight; }, [s.earlier]);
  const whenBody = () => {
    const cal = calMonth(s.calY, s.calM, nowMs);
    const shift = (d: number) => { const m = new Date(s.calY, s.calM + d, 1); set({ calY: m.getFullYear(), calM: m.getMonth() }); };
    return (
      <>
        <h2 className="qls-qh">When did it go to {first}?</h2>
        <p className="qls-qs">This starts the clock on {first}'s reply window.</p>
        <div className="qls-big" data-qls="when">
          <BigRow glyph={ICON.cal} title="Today" sub={weekdayDay(nowMs)} on={sameDay(s.sent, nowMs)} data={{ "data-qls": "when-opt", "data-k": "today" }} onClick={() => answer({ sent: sod(nowMs), earlier: false })} />
          <BigRow glyph={ICON.cal} title="Yesterday" sub={weekdayDay(y)} on={sameDay(s.sent, y)} data={{ "data-qls": "when-opt", "data-k": "yesterday" }} onClick={() => answer({ sent: y, earlier: false })} />
          <BigRow glyph={ICON.cal} title="An earlier date" sub={isEarlier ? `Chosen: ${dayMonY(s.sent!, nowMs)}` : "Pick it from the calendar"} on={s.earlier} arrow={false}
            data={{ "data-qls": "when-opt", "data-k": "earlier" }} onClick={() => set({ earlier: !s.earlier })} />
        </div>
        {s.earlier ? (
          <div className="qls-cal" data-qls="calendar" ref={calRef}>
            <div className="qls-calh">
              <button type="button" aria-label="Previous month" data-qls="cal-prev" onClick={() => shift(-1)}>{ICON.l}</button>
              <b data-qls="cal-month">{MONL[s.calM]} {s.calY}</b>
              <button type="button" aria-label="Next month" data-qls="cal-next" disabled={!cal.canNext} onClick={() => shift(1)}>{ICON.r}</button>
            </div>
            <div className="qls-calg">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} aria-hidden="true">{d}</span>)}
              {Array.from({ length: cal.lead }, (_, i) => <i key={`b${i}`} />)}
              {cal.days.map((d) => (
                <button key={d.ms} type="button" data-qls="cal-day" data-day={d.day} disabled={d.future} aria-label={weekdayDay(d.ms)}
                  className={`${d.today ? "is-today" : ""}${sameDay(s.sent, d.ms) ? " is-on" : ""}`} onClick={() => answer({ sent: d.ms })}>{d.day}</button>
              ))}
            </div>
          </div>
        ) : null}
      </>
    );
  };

  /* ── the Materials stage ── */
  const dflt = { letter: p.letters[0]?.id ?? null, synopsis: p.synopses[0]?.id ?? null, book: p.bookVersions.find((b) => b.current)?.id ?? p.bookVersions[0]?.id ?? null };
  const ask = agent?.ask ?? null;
  const aw = ask ? askWords(ask) : null;
  const hasPkgs = p.packages.length > 0;
  const showPkgs = hasPkgs && !s.custom;
  const usePackage = (pk: StagePackage) => {
    /* a package sets the letter and the synopsis; a package states no sample size, so where it tests a book version
       the portion is what the agent asks for, else the house opening sample (3 chapters) */
    const sample: SampleChoice | null = pk.card.bookVersion
      ? (ask && ask.sample.unit !== "none" ? { unit: ask.sample.unit, amt: ask.sample.amt, bookVersionId: null } : { unit: "chapters", amt: 3, bookVersionId: null })
      : null;
    answer({ packageId: pk.id, piecesSet: true, custom: false, pieces: { letterId: pk.card.qlId, synopsisId: pk.card.synId, sample } });
  };
  /* the pieces view starts from what the agent asks for, the first time it is shown for this agent */
  useEffect(() => {
    if (s.step === "what" && !showPkgs && !s.piecesTouched) {
      set({ pieces: ask ? piecesFromAsk(ask, NO_PIECES, dflt) : { letterId: dflt.letter ?? NO_LETTER, synopsisId: dflt.synopsis ?? NO_SYN, sample: null }, piecesTouched: true });
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const [pop, setPop] = useState<{ k: "letter" | "syn" | "sample"; top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const openPop = (k: "letter" | "syn" | "sample", el: HTMLElement) => {
    if (pop?.k === k) { setPop(null); return; }
    const r = el.getBoundingClientRect(), c = rootRef.current!.getBoundingClientRect();
    setPop({ k, top: r.bottom - c.top + 6, left: r.right - c.left });
  };
  /* the menu flips upwards when there is no room below, and is kept inside the panel, so it is never clipped */
  useLayoutEffect(() => {
    const el = popRef.current, root = rootRef.current;
    if (!pop || !el || !root) return;
    const c = root.getBoundingClientRect();
    const h = el.offsetHeight, w = el.offsetWidth;
    const r = root.querySelector<HTMLElement>(`[data-qls="vr"][data-k="${pop.k}"]`)?.getBoundingClientRect();
    let top = pop.top;
    const up = !!r && top + h > c.height - 8;
    if (up && r) top = r.top - c.top - h - 6;
    el.dataset.up = up ? "1" : "0";
    el.style.top = `${Math.max(8, top)}px`;
    el.style.left = `${Math.max(8, Math.min(pop.left - w, c.width - w - 8))}px`;
  }, [pop]);
  useEscapeLayer(!!pop, () => setPop(null), ESC_LEVEL.drawerPopup);
  useEffect(() => {
    if (!pop) return;
    const off = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (popRef.current?.contains(t) || t.closest?.('[data-qls="vr"]')) return;
      setPop(null);
    };
    document.addEventListener("pointerdown", off, true);
    return () => document.removeEventListener("pointerdown", off, true);
  }, [pop]);
  useEffect(() => setPop(null), [s.step]);

  const pc = s.pieces;
  const sizes = sizesFor(ask ?? NO_ASK);
  const sampleNow: SampleChoice = pc.sample ?? { unit: ask && ask.sample.unit !== "none" ? ask.sample.unit : "chapters", amt: ask && ask.sample.unit !== "none" ? ask.sample.amt : 3, bookVersionId: dflt.book };
  const bookName = (id: string | null) => p.bookVersions.find((b) => b.id === id)?.name ?? null;
  const setPieces = (patch: Partial<Pieces>) => set({ pieces: { ...pc, ...patch } });
  const tog = (k: "letter" | "syn" | "sample") => {
    if (k === "letter") setPieces({ letterId: pc.letterId ? null : dflt.letter ?? NO_LETTER });
    else if (k === "syn") setPieces({ synopsisId: pc.synopsisId ? null : dflt.synopsis ?? NO_SYN });
    else setPieces({ sample: pc.sample ? null : sampleNow });
  };
  const letterName = (id: string | null) => p.letters.find((l) => l.id === id)?.name ?? "Query letter";
  const synName = (id: string | null) => p.synopses.find((l) => l.id === id)?.name ?? "Synopsis";
  const pieceCount = [!!pc.letterId, !!pc.synopsisId, !!pc.sample].filter(Boolean).length;
  const anyPiece = pieceCount > 0;
  const fitsAsk = ask ? piecesMatchAsk(ask, pc) : false;

  const whatBody = () => {
    const sub = aw ? `${first}'s card asks for ${aw}.` : `Nothing on ${first}'s card about what they ask for.`;
    if (showPkgs) {
      const fitOne = ask ? p.packages.find((x) => packageFits(x, ask))?.id ?? null : null;
      return (
        <>
          <h2 className="qls-qh">What did you send {first}?</h2>
          <p className="qls-qs" data-qls="asks">{sub}</p>
          <div className="qls-big" data-qls="packages">
            {p.packages.map((x) => (
              <BigRow key={x.id} glyph={ICON.pkg} glyphClass="is-pkg" title={x.name} sub={x.pieces.join(" · ")} on={s.piecesSet && s.packageId === x.id}
                tag={x.id === fitOne ? `✓ What ${first} asks for` : x.active ? "Active" : null} tagClass={x.id === fitOne ? "is-y" : undefined}
                data={{ "data-qls": "package", "data-id": x.id }} onClick={() => usePackage(x)} />
            ))}
            <button type="button" className="is-quiet" data-qls="choose-pieces" onClick={() => set({ custom: true, piecesTouched: false })}><span className="qls-tx"><b>Choose the pieces myself</b></span></button>
          </div>
        </>
      );
    }
    const row = (k: "letter" | "syn" | "sample", label: string, on: boolean, val: string) => (
      <div className={`qls-pc${on ? " is-on" : ""}`} data-qls="piece" data-k={k} data-on={on ? "1" : "0"} role="checkbox" aria-checked={on} tabIndex={0}
        onClick={() => tog(k)} onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && e.target === e.currentTarget) { e.preventDefault(); tog(k); } }}>
        <span className="qls-bx" aria-hidden="true">{on ? "✓" : ""}</span>
        <span className="qls-tx"><b>{label}</b></span>
        <button type="button" className="qls-vr" data-qls="vr" data-k={k} aria-haspopup="menu" aria-expanded={pop?.k === k}
          onClick={(e) => { e.stopPropagation(); openPop(k, e.currentTarget); }}>{val}{ICON.chev}</button>
      </div>
    );
    const bv = bookName(sampleNow.bookVersionId);
    return (
      <>
        <h2 className="qls-qh">What did you send {first}?</h2>
        <p className="qls-qs" data-qls="asks">{sub}</p>
        <div className="qls-pcs" data-qls="pieces">
          {row("letter", "Query letter", !!pc.letterId, letterName(pc.letterId ?? dflt.letter))}
          {row("syn", "Synopsis", !!pc.synopsisId, synName(pc.synopsisId ?? dflt.synopsis))}
          {row("sample", "Opening pages", !!pc.sample, `${sizeName(sampleNow)}${bv ? ` · ${bv}` : ""}`)}
        </div>
        {ask?.stated ? <p className="qls-ask" data-qls="ask-line">{fitsAsk ? `✓ That's what ${first} asks for.` : <button type="button" className="qls-lk" data-qls="use-ask" onClick={() => setPieces(piecesFromAsk(ask, pc, dflt))}>Use what {first} asks for</button>}</p> : null}
        {hasPkgs ? <p className="qls-ask"><button type="button" className="qls-lk" data-qls="back-packages" onClick={() => set({ custom: false })}>Back to your packages</button></p> : null}
      </>
    );
  };
  const menu = () => {
    if (!pop) return null;
    const item = (key: string, on: boolean, label: string, onPick: () => void, small?: string) => (
      <button key={key} type="button" role="menuitemradio" aria-checked={on} data-qls="menu-item" onClick={() => { onPick(); setPop(null); }}>
        <span className="qls-ck" aria-hidden="true">{on ? "✓" : ""}</span>{label}{small ? <small>{small}</small> : null}
      </button>
    );
    let inner: React.ReactNode;
    if (pop.k === "letter") inner = <><div className="qls-ph">Which letter?</div>{(p.letters.length ? p.letters : [{ id: NO_LETTER, name: "Query letter" }]).map((l) => item(l.id, (pc.letterId ?? dflt.letter ?? NO_LETTER) === l.id, l.name, () => setPieces({ letterId: l.id })))}</>;
    else if (pop.k === "syn") inner = <><div className="qls-ph">Which synopsis?</div>{(p.synopses.length ? p.synopses : [{ id: NO_SYN, name: "Synopsis" }]).map((l) => item(l.id, (pc.synopsisId ?? dflt.synopsis ?? NO_SYN) === l.id, l.name, () => setPieces({ synopsisId: l.id })))}</>;
    else inner = (
      <>
        <div className="qls-ph">How much?</div>
        {sizes.map((z) => item(`${z.unit}${z.amt}`, sampleNow.unit === z.unit && sampleNow.amt === z.amt, sizeName(z), () => setPieces({ sample: { ...sampleNow, unit: z.unit, amt: z.amt } })))}
        {p.bookVersions.length ? <><hr /><div className="qls-ph">From</div>{p.bookVersions.map((b) => item(b.id, sampleNow.bookVersionId === b.id, b.name, () => setPieces({ sample: { ...sampleNow, bookVersionId: b.id } }), b.current ? "current" : undefined))}</> : null}
      </>
    );
    return <div ref={popRef} className="qls-pop" role="menu" data-qls="menu" data-k={pop.k} style={{ top: pop.top, left: 8 }}>{inner}</div>;
  };

  /* ── the How stage ── */
  const howBody = () => {
    const sub: Record<string, string> = {
      [SubmissionMethod.EMAIL]: agent?.email ? `To ${agent.email}` : `No email on ${first}'s card yet`,
      [SubmissionMethod.QUERY_MANAGER]: `${first}'s QueryManager form`,
      [SubmissionMethod.ONLINE_FORM]: agent?.agency && agent.agency !== "No agency" ? `The form on ${agent.agency}'s website` : "The form on their website",
      [SubmissionMethod.POST]: "Printed and posted",
    };
    const card = agent?.via ? HOW.find((h) => h.k === agent.via) ?? null : null;
    const order = card ? [card, ...HOW.filter((h) => h.k !== card.k)] : [...HOW];
    return (
      <>
        <h2 className="qls-qh">How did you send it?</h2>
        <p className="qls-qs">{card ? `${first}'s card says ${card.word}, so that's first.` : `Nothing on ${first}'s card about how they take queries.`}</p>
        <div className="qls-big" data-qls="how">
          {order.map((h) => (
            <BigRow key={h.k} glyph={h.k === SubmissionMethod.EMAIL ? ICON.mail : h.k === SubmissionMethod.POST ? ICON.post : ICON.web} title={h.label} sub={sub[h.k]}
              on={s.via === h.k} tag={card?.k === h.k ? `From ${first}'s card` : null} data={{ "data-qls": "how-opt", "data-k": h.k }} onClick={() => answer({ via: h.k })} />
          ))}
        </div>
      </>
    );
  };

  /* ── the check stage ── */
  const answers = (): LogAnswers | null => (s.agentId && s.sent != null && s.via && s.piecesSet
    ? { agentId: s.agentId, sent: s.sent, via: s.via, packageId: s.packageId, letterId: pc.letterId, synopsisId: pc.synopsisId, sample: pc.sample, note: s.note.trim() }
    : null);
  const preview = useMemo(() => {
    const a = answers();
    if (!a || (s.step !== "check" && phase === "flow")) return null;
    const plan = planOf(a, p.ctx, PREVIEW_ID, false);
    return plan ? previewOf(plan, nowMs, p.quietWeeks) : null;
  }, [s, phase, p.ctx, nowMs, p.quietWeeks]); // eslint-disable-line react-hooks/exhaustive-deps
  const slip = (pv: NonNullable<typeof preview>, tag: boolean) => (
    <div className="qls-pv qls-pvw qc151 qc153" data-qls="preview">
      {tag ? <span className="qls-pvtag" data-qls="preview-tag">Preview</span> : null}
      <QcSlip153 row={pv.row} nowMs={nowMs} selected={false} packageName={pv.packageName} agent={pv.agent} act={null} onOpen={() => {}} onAct={() => {}}
        preview={pv.noWindow ? { next: { value: "No reply window", line: `add one on ${first}'s card` }, policy: { value: "Not on their card", line: null } } : {}} />
      {stamp ? <span className={`qls-stamp${reduce ? "" : " is-thump"}`} data-qls="stamp"><span>Logged</span><small>{dayMon(s.sent ?? nowMs).toUpperCase()}</small></span> : null}
    </div>
  );
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (s.noteOpen) noteRef.current?.focus({ preventScroll: true }); }, [s.noteOpen]);
  const checkBody = () => (
    <>
      <h2 className="qls-qh">Ready to log {first}?</h2>
      <p className="qls-qs">Here's how {first} will look in your Query Centre. Hover the paperclip to check what went.</p>
      {preview ? slip(preview, true) : null}
      <div className="qls-nt">
        {s.noteOpen
          ? <textarea ref={noteRef} data-qls="note" value={s.note} placeholder={`Anything about this query for ${first}. It goes on the query card.`} aria-label="A note on this query" onChange={(e) => set({ note: e.target.value })} />
          : <button type="button" className="qls-lk" data-qls="add-note" onClick={() => set({ noteOpen: true })}>+ Add a note</button>}
      </div>
      <p className="qls-qs is-foot">Something not right? Tap any step above to change it.</p>
    </>
  );

  /* ── logging ── */
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState(false);
  const [bump, setBump] = useState(false);
  const [toast, setToast] = useState<{ text: string; undo: () => void } | null>(null);
  const toastTimer = useRef<number | null>(null);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);
  const showToast = (text: string, undo: () => void) => {
    setToast({ text, undo });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  };
  /** the stamp thumps onto the preview and the panel gives a small bump; about 650ms later `then` runs */
  const stampThen = (then: () => void) => {
    if (reduce) { then(); return; }
    setStamp(true); setBump(true);
    window.setTimeout(() => { setStamp(false); setBump(false); then(); }, 650);
  };
  const doLog = async (more: boolean) => {
    const a = answers();
    if (!a || busy) return;
    setBusy(true);
    const n = p.count + 1;
    const before = s;
    const done = await p.onSave(a);
    setBusy(false);
    if (!done) return;
    const lastFirst = agent?.first ?? "The agent";
    if (more) {
      stampThen(() => {
        /* the date and materials carry over; how comes from the next agent's card */
        setS((o) => ({ ...o, step: "who", dir: "in", agentId: null, via: null, find: "", note: "", noteOpen: false, hi: 0, showBusy: false, carried: lastFirst }));
        showToast(`${lastFirst} logged`, async () => { setToast(null); await done.undo(); setS({ ...before, step: "check", dir: "back" }); });
      });
    } else {
      stampThen(() => { setLogged({ ...done, n, first: lastFirst, preview: preview!, weeks: agent?.weeks ?? null, before }); setPhase("yay"); });
    }
  };
  /* ⌘↵ / Ctrl↵ logs from the check */
  useEffect(() => {
    if (s.step !== "check" || phase !== "flow") return;
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && rootRef.current?.offsetParent) { e.preventDefault(); void doLog(false); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  const checkFoot = (
    <>
      <button type="button" className="qls-lnk" data-qls="cancel" onClick={p.onClose} disabled={busy || stamp}>Cancel</button>
      <span className="qls-sp" />
      <button type="button" className="qls-lnk" data-qls="log-more" disabled={busy || stamp} onClick={() => void doLog(true)}>Log and start another</button>
      <button type="button" className="qls-btn" data-qls="log" disabled={busy || stamp} onClick={() => void doLog(false)}>Log query {ICON.arrow}</button>
    </>
  );

  /* ↑ ↓ and ↵ over the big rows on Sent, Materials and How */
  useEffect(() => {
    if (s.step !== "when" && s.step !== "what" && s.step !== "how") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea") || popRef.current) return;
      if (!rootRef.current?.isConnected || !rootRef.current.offsetParent) return;
      const bs = [...(sbRef.current?.querySelectorAll<HTMLButtonElement>(".qls-big > button:not(.is-quiet)") ?? [])];
      if (!bs.length) return;
      let i = bs.findIndex((b) => b.classList.contains("is-hi"));
      if (i < 0) i = bs.findIndex((b) => b === document.activeElement);
      if (i < 0) i = bs.findIndex((b) => b.classList.contains("is-on"));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        i = e.key === "ArrowDown" ? (i + 1) % bs.length : (i - 1 + bs.length) % bs.length;
        bs.forEach((b) => b.classList.remove("is-hi"));
        bs[i].classList.add("is-hi");
        bs[i].focus();
      } else if (e.key === "Enter" && i >= 0 && !(t && t.closest?.("button"))) { e.preventDefault(); bs[i].click(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [s.step]);

  /* ── the stepper's values ── */
  const values: Record<StageKey, string | null> = {
    who: agent?.first ?? null,
    when: s.sent == null ? null : sameDay(s.sent, nowMs) ? "Today" : sameDay(s.sent, y) ? "Yesterday" : dayMon(s.sent),
    what: !s.piecesSet ? null : s.packageId ? p.packages.find((x) => x.id === s.packageId)?.name ?? "Package" : `${pieceCount} ${pieceCount === 1 ? "piece" : "pieces"}`,
    how: s.via ? howLabel(s.via) : null,
    check: null,
  };

  const line = s.step === "who" ? (s.carried ? batchWhoLine(s.carried) : FLOW_WORDS.log.line)
    : s.step === "check" ? (s.carried ? batchCheckLine(s.carried) : checkLine(p.count + 1, p.bookTitle)) : STAGE_LINE[s.step];
  const backFoot = (hint: string | null) => (
    <>
      <button type="button" className="qls-lnk" data-qls={s.step === "who" ? "cancel" : "back"} onClick={() => (s.step === "who" ? p.onClose() : go(STAGES[Math.max(0, STAGES.indexOf(s.step) - 1)], "back"))}>{s.step === "who" ? "Cancel" : "Back"}</button>
      <span className="qls-sp" />
      {hint ? <span className="qls-hint">{hint}</span> : null}
    </>
  );

  const body = s.step === "who" ? whoBody() : s.step === "when" ? whenBody() : s.step === "what" ? whatBody() : s.step === "how" ? howBody()
    : checkBody();
  const piecesFoot = (
    <>
      <button type="button" className="qls-lnk" data-qls="back" onClick={() => go("when", "back")}>Back</button>
      <span className="qls-sp" />
      <button type="button" className="qls-btn" data-qls="pieces-continue" disabled={!anyPiece}
        onClick={() => answer({ packageId: null, piecesSet: true })}>Continue {ICON.arrow}</button>
    </>
  );
  const foot = s.step === "who" ? backFoot("↑ ↓ and ↵") : s.step === "what" && !showPkgs ? piecesFoot
    : s.step === "check" ? checkFoot : backFoot("Tap one to carry on");

  if (phase === "yay" && logged) {
    const L = logged;
    const line = celebrationLine(L.preview, L.first, L.weeks, nowMs);
    const mile = MILESTONE[L.n] ?? null;
    return (
      <div ref={rootRef} className="qc149f qls qcv-legacy" data-qc149f="log" data-qls="root" data-step="yay">
        <div className="mk-lc-in qc149c-in qls-in">
          <div className="qls-yay" data-qls="yay">
            <IlloSlot name="celebration · query sent" width={210} height={130} />
            <TypedHead text={`Off to ${L.first}.`} reduce={reduce} />
            <p className="qls-yl" data-qls="yay-line">{line}</p>
            <span className="qls-cnt" data-qls="count">Query number <Odometer n={L.n} /> for {p.bookTitle}</span>
            {mile ? <span className="qls-ms" data-qls="milestone">{mile}</span> : null}
            <div className="qls-slipw">
              <div className="qls-pv qls-pvw qc151 qc153" data-qls="preview">
                <QcSlip153 row={L.preview.row} nowMs={nowMs} selected={false} packageName={L.preview.packageName} agent={L.preview.agent} act={null} onOpen={() => {}} onAct={() => {}}
                  preview={L.preview.noWindow ? { next: { value: "No reply window", line: `add one on ${L.first}'s card` }, policy: { value: "Not on their card", line: null } } : {}} />
                <span className="qls-stamp" data-qls="stamp"><span>Logged</span><small>{dayMon(L.before.sent ?? nowMs).toUpperCase()}</small></span>
              </div>
            </div>
          </div>
          <div className="qls-cf" data-qls="foot">
            <button type="button" className="qls-lnk" data-qls="open-card" onClick={() => L.openCard()}>Open {L.first}'s card</button>
            <span className="qls-sp" />
            <button type="button" className="qls-lnk" data-qls="undo" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await L.undo(); } finally { setBusy(false); }
              setLogged(null); setPhase("flow"); setS({ ...L.before, step: "check", dir: "back" });
            }}>Undo</button>
            <button type="button" className="qls-lnk" data-qls="done" onClick={p.onClose}>Done</button>
            <button type="button" className="qls-btn" data-qls="log-another" onClick={() => { setLogged(null); setPhase("flow"); setS({ ...freshState(nowMs), dir: "in" }); }}>Log another {ICON.arrow}</button>
          </div>
          {reduce ? null : <Confetti />}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="qc149f qls qcv-legacy" data-qc149f="log" data-qls="root" data-step={s.step}>
      <div className={`mk-lc-in qc149c-in qls-in${bump ? " is-bump" : ""}`}>
        <FlowHead title={FLOW_WORDS.log.title} line={line} onClose={p.onClose} data={{ "data-qc149f": "band" }} closeData={{ "data-qc149f": "close" }} />
        <Stepper s={s} values={values} onGo={(k) => go(k)} />
        <div ref={sbRef} key={s.step} className={`qls-sb${s.dir ? ` is-${s.dir}` : ""}`} data-qls="body">{body}</div>
        <div className="qls-cf" data-qls="foot">{foot}</div>
        <div className={`qls-toast${toast ? " is-on" : ""}`} data-qls="toast" role="status" aria-live="polite">
          {toast ? <>{toast.text}<button type="button" data-qls="toast-undo" onClick={toast.undo}>Undo</button></> : null}
        </div>
      </div>
      {menu()}
    </div>
  );
};

