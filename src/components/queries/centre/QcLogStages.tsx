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
import { MaterialIcon } from "../../shared/MaterialIcon";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SubmissionMethod, type Query } from "../../../types";
import { FlowHead } from "../../shared/FlowHead";
import {
  HOW, MILESTONE, PREVIEW_ID, firstName, monthLong, STAGES, celebrationLine, STAGE_LABEL, headline, calMonth, dayMon, dayMonY, howLabel, askItems, askFill, sizeName, NO_LETTER, NO_SYN,
  planOf, previewOf, sameDay, sod, choiceOfSample, sampleOfChoice, titleName, weekdayDay, whoGroups, yesterday, type Preview,
  WEEKDAY, calMonthAhead, cardOffer, expectOf, nudgeAnswer, nudgeChips, nudgeDateOf, isPastReply, settleReply, chipOn, daysBefore, replyDefaults, replyReady, toggleUnknown, withWeeks, type ReplyAnswers,
  reviewCounts, type ReviewCounts, type BookChoice, type Choice, type LogAnswers, type Pieces, type PlanContext, type SampleChoice, type StageAgent, type StageKey, type StagePackage,
} from "../../../lib/queryActions/logStages";
import { QcCard154 } from "./QcCard154";
import { WeekSlider } from "../../forms/WeekSlider";
import { addDays } from "../../../lib/queryActions/dates";
import { SampleControl } from "../../queryActions/controls";
import type { Book, Materials } from "../../../lib/queryActions/sample";
import type { LogAgain } from "../../../lib/queryActions/drawerStore";
/* the sample control's rules and its --qad-* tokens (declared for `.laq` there too) */
import "../../queryActions/queryDrawer.css";
import { IlloSlot } from "../IlloSlot";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
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
  /* materials fork v1 — the fork's tiles: a package, and loose pages (the mock's drawings) */
  box: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></svg>,
  pages: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M8 3h8l4 4v10H8V3z" /><path d="M16 3v4h4" /><path d="M8 7H4v14h12v-4" /></svg>,
  pkg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.4" aria-hidden="true"><path d="M2.5 5.5L8 3l5.5 2.5v5L8 13l-5.5-2.5z M2.5 5.5L8 8l5.5-2.5M8 8v5" /></svg>,
  mail: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5b4f47" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="M2.5 4.5L8 9l5.5-4.5" /></svg>,
  web: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5b4f47" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2 6h12M5 9h6M5 11h4" /></svg>,
  post: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5b4f47" strokeWidth="1.4" aria-hidden="true"><path d="M3 6.5h10v6.5H3z M5 6.5V3h6v3.5" /></svg>,
} as const;

/** what a save hands back: the new query's id, how to undo it, and the door to its card */
export interface Logged {
  id: string; undo: () => Promise<void>; openCard: () => void;
  /** v2 — Undo also removes the agent this journey added for it (nothing else uses them): the journey goes back to step one */
  agentGoesOnUndo?: () => boolean;
}
/** the celebration's facts, fixed at the moment of the log */
interface LoggedView extends Logged { n: number; first: string; preview: Preview; weeks: number | null; before: FlowState; reply: ReplyAnswers | null }

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
  /** the book's sizes, for the sample control's ceilings and presets */
  book: Book;
  onClose: () => void;
  /** v2 · Phase 2 — "Add and carry on": the new agent card's own create; `created` is false when it merged into a twin */
  onCreateAgent: (name: string, agency: string) => Promise<{ id: string; created: boolean } | { error: string }>;
  /** v2 · Phase 3 — "Not sent yet?": the to-do task's id (one per agent), and "It has gone after all" (removes it) */
  onNotSent: (agentId: string, agentName: string) => Promise<string | null>;
  onSentAfterAll: (agentId: string) => Promise<void>;
  /** v2 · Phase 6 — this book's queries, for the review's two numbers (the Dashboard's own functions read them) */
  bookQueries: readonly Query[];
  /** v2 · Phase 7 — the Dashboard's active count for this book, live (read back after a save) */
  activeNow?: number;

  onSave: (a: LogAnswers) => Promise<Logged | null>;
  /** v1.2 — a door that names a package (a package's builder): it is preselected on the Materials stage, still unanswered,
   *  so the ask card shows over it */
  seedPackageId?: string | null;
  /** v1.2 — "Log another" from the old drawer's receipt: the date and the materials carry over, as "Log and start another" */
  again?: LogAgain | null;
  /** v1.2 — the host's press on the dimmed page: set to the journey's leave check (ask with answers, close without) */
  leaveRef?: React.MutableRefObject<(() => void) | null>;
}

/** materials fork v1 — the Materials stage's screens: two tiles, then a package or the pieces one by one */
export type MatView = "fork" | "pkg" | "pcs";
/** the screen a carried-on answer reopens on (a package, else the pieces) */
export const matOf = (s: Pick<FlowState, "piecesSet" | "packageId" | "mat">): MatView => (s.piecesSet ? (s.packageId ? "pkg" : "pcs") : s.mat);

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
  /** materials fork v1 — which of the Materials stage's three screens shows: the fork, the packages, or the pieces */
  mat: MatView;
  packageId: string | null;
  /** what the stage carried on with (the package's pieces, or the pieces picked); this is what the log saves */
  pieces: Pieces;
  piecesSet: boolean;
  /** materials fork v1 — the pieces screen's own picks, kept while the writer goes back to the fork or tries a package,
   *  and copied into `pieces` only when they carry on from that screen */
  picked: Pieces;
  /** the pieces screen has been given its starting picks */
  piecesTouched: boolean;
  /** v2 — which of the pieces screen's three ticks are open in place (Escape folds them, keeping the tick) */
  pOpen: { letter: boolean; syn: boolean; sample: boolean };
  via: SubmissionMethod | null;
  note: string;
  noteOpen: boolean;
  /** the first name of the agent just logged with "Log and start another" */
  carried: string | null;
  /** v1.2 — the package a door named: shown chosen on the Materials stage until the writer answers it */
  pkgSeed: string | null;
  /** v1.3 — the Nudge stage's answers for this agent (null until changed: the agent's defaults stand), and whether it
   *  has been answered (Continue); both reset with a new agent, so "Log and start another" asks again */
  reply: ReplyAnswers | null;
  replySet: boolean;
  /** v1.3 — the month "Pick a date" shows, as year·12 + month */
  nCal: number | null;
  /** v2 · Phase 2 — the add-an-agent screen, in this panel (prefilled from the search) */
  adding: { name: string; agency: string; error: string | null; busy: boolean } | null;
  /** v2 · Phase 3 — the not-sent screen is showing */
  notSent: boolean;
}

export const freshState = (nowMs: number): FlowState => ({
  step: "who", dir: "", find: "", hi: 0, showBusy: false, agentId: null, sent: null, earlier: false,
  calY: new Date(nowMs).getFullYear(), calM: new Date(nowMs).getMonth(),
  mat: "fork", packageId: null, pieces: { letterId: null, synopsisId: null, sample: null }, piecesSet: false,
  picked: { letterId: null, synopsisId: null, sample: null }, piecesTouched: false, pOpen: { letter: false, syn: false, sample: false },
  via: null, note: "", noteOpen: false, carried: null, pkgSeed: null, reply: null, replySet: false, nCal: null,
  adding: null, notSent: false,
});

export const answered = (s: FlowState, k: StageKey): boolean =>
  k === "who" ? !!s.agentId : k === "when" ? s.sent != null : k === "what" ? s.piecesSet : k === "how" ? !!s.via : k === "nudge" ? s.replySet : false;
/** the next stage not yet answered, after `from` (the check when everything is) */
export function nextStage(s: FlowState, from: StageKey): StageKey {
  for (let j = STAGES.indexOf(from) + 1; j < STAGES.length; j++) if (!answered(s, STAGES[j])) return STAGES[j];
  return "check";
}

/** stand-ins for a piece the book has no version of yet: ticked, but recorded with no version id */
export { NO_LETTER, NO_SYN };

/* ── the shared parts ─────────────────────────────────────────────────────────────────────────────────────────── */

/* v1.1 — THE TRACK (option C): the stages (six from v1.3) as the slip's own status track, on the FlowHead's ground. A finished
   node is a button (navy, ✓, its answer under its label) that opens that stage; the current one is a white disc ringed
   in navy; the rest are faint outlines and are not focusable. */
export const Stepper: React.FC<{ s: FlowState; values: Record<StageKey, string | null>; onGo: (k: StageKey) => void; locked?: boolean;
  /** v2 — the logged screen: every step done, the last one too */
  allDone?: boolean }> = ({ s, values, onGo, locked, allDone }) => (
  <div className="laq-trk" data-qls="steps" data-laq="track" role="list" aria-label="Logging a query, step by step">
    {STAGES.map((k, i) => {
      const now = !locked && s.step === k;
      const done = allDone || (!now && answered(s, k));
      const state = now ? "now" : done ? "done" : "todo";
      const cls = `laq-s${now ? " is-n" : ""}${done ? " is-d" : ""}`;
      const inner = <>
        <span className="laq-nd" data-laq="node" aria-hidden="true">{done ? "✓" : i + 1}</span>
        <span className="laq-l">{STAGE_LABEL[k]}{done && k !== "check" ? <b data-qls="step-value">{values[k] ?? ""}</b> : null}</span>
      </>;
      return (
        <div key={k} role="listitem" className="laq-si">
          {done && !locked ? (
            <button type="button" className={cls} data-qls="step" data-k={k} data-state={state}
              aria-label={`${STAGE_LABEL[k]}: ${values[k] ?? ""}. Change it`} onClick={() => onGo(k)}>{inner}</button>
          ) : (
            <span className={cls} data-qls="step" data-k={k} data-state={state} aria-current={now ? "step" : undefined}>{inner}</span>
          )}
        </div>
      );
    })}
  </div>
);

export const BigRow: React.FC<{
  glyph: React.ReactNode; glyphClass?: string; title: string; sub?: string | null; tag?: React.ReactNode; tagClass?: string;
  on?: boolean; hi?: boolean; arrow?: boolean; onClick: () => void; data?: Record<string, string>;
  /** v2 — the quiet row ("Add a new agent"): no frame, an underlined title */
  quiet?: boolean;
}> = ({ glyph, glyphClass, title, sub, tag, tagClass, on, hi, arrow = true, onClick, data, quiet }) => (
  <button type="button" className={`${on ? "is-on" : ""}${hi ? " is-hi" : ""}${quiet ? " is-quiet" : ""}`} onClick={onClick} aria-pressed={on ? true : undefined} {...data}>
    <span className={`laq-g${glyphClass ? ` ${glyphClass}` : ""}`} aria-hidden="true">{glyph}</span>
    <span className="laq-tx"><b>{title}</b>{sub ? <span>{sub}</span> : null}</span>
    {tag ? <span className={`laq-tag${tagClass ? ` ${tagClass}` : ""}`} data-qls="tag">{tag}</span> : null}
    {arrow ? <span className="laq-ar" aria-hidden="true">{ICON.arrow}</span> : null}
  </button>
);

/* v2 · Phase 4 — WHAT {FIRST} ASKS FOR heads the Materials step (D9): the card's asks as plain items, and one button
   that fills the materials to match and moves on (lib/queryActions/logStages `askFill`). Nothing on the card: the nil line
   and no button. It reads the agent's card and never writes it. */
export const AskCardView: React.FC<{ items: readonly string[]; first: string; fitName: string | null; onUse: () => void }> = ({ items, first, fitName, onUse }) => {
  if (!items.length) return (
    <div className="laq-asks is-nil" data-qls="asks" data-kind="nil"><p>Nothing on {first}'s card about what they ask for, so tell us what went.</p></div>
  );
  return (
    <div className="laq-asks" data-qls="asks" data-kind="card">
      <div className="laq-ah"><b>What {first} asks for</b><span>From {first}'s card</span></div>
      <ul>
        {items.map((t) => <li key={t} data-qls="ask"><span className="laq-mk" aria-hidden="true" /><b>{t}</b></li>)}
      </ul>
      <p className="laq-af" data-qls="ask-foot">
        {fitName ? <span data-qls="ask-fit">Your <b>{fitName}</b> package matches it.</span> : null}
        <button type="button" className="laq-btn is-xs" data-qls="use-ask" onClick={onUse}>I sent what {first} asks for {ICON.arrow}</button>
      </p>
    </div>
  );
};

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
    <div ref={ref} className="laq-conf" data-qls="confetti" aria-hidden="true">
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
    <h2 className="laq-yh" data-qls="yay-head" aria-label={text}>
      <span aria-hidden="true">{text.slice(0, n)}</span>{n < text.length ? <span className="laq-cur" aria-hidden="true" /> : null}
    </h2>
  );
};

/** the count rolls from n−1 to n, the landing odometer's roll in the ref's form */
const Odometer: React.FC<{ n: number }> = ({ n }) => {
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true))); return () => cancelAnimationFrame(r); }, []);
  return (
    <span className={`laq-odo${go ? " is-go" : ""}`} data-qls="odometer" data-n={n} aria-label={String(n)}>
      <span aria-hidden="true"><b>{n - 1}</b><b>{n}</b></span>
    </span>
  );
};

const noop = () => {};

/* v2 · Phase 6 — WHAT LOGGING THIS DOES, under the review card (the ref's v22 `.rvs`): two small quiet tiles of one height,
   "Active queries {n} → {n+1}" with a line stepping up one, and "Queries sent {n} → {n+1}" with this week's bar gaining a
   block. The figures are `reviewCounts` (the Dashboard's own functions); "Active queries" shows only when the Dashboard
   would count this query. Reduced motion: the final state, still. */
const ARROW_R = <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="#a0675a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 6h15M11.5 1.5 16 6l-4.5 4.5" /></svg>;
export const ReviewNumbers: React.FC<{ c: ReviewCounts }> = ({ c }) => {
  const showActive = c.active[1] > c.active[0];
  const top = Math.max(1, ...c.weeks, c.weeks[c.weeks.length - 1] + 1);
  const hOf = (v: number) => (v ? Math.max(5, Math.round((v / top) * 26)) : 2);
  const last = c.weeks.length - 1;
  const lastH = hOf(c.weeks[last] ?? 0);
  const num = (a: number, b: number) => <span className="rvs-n"><i>{a}</i>{ARROW_R}<b>{b}</b></span>;
  return (
    <div className={`rvs${showActive ? "" : " is-one"}`} role="group" aria-label="What logging this does" data-qls="counts">
      {showActive ? (
        <div className="rvs-t" data-qls="count-tile" data-k="active" aria-label={`Active queries: ${c.active[0]}, then ${c.active[1]}`}>
          <span className="rvs-l">Active queries</span>{num(c.active[0], c.active[1])}
          <svg className="rvs-sp" width="84" height="30" viewBox="0 0 112 40" aria-hidden="true">
            <path d="M0,27 H62" stroke="var(--laq-navy)" strokeOpacity=".55" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path className="rvs-g" d="M62,27 C80,27 80,12 98,12" stroke="#a0675a" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4 4.5" />
            <circle cx="62" cy="27" r="3.5" fill="#fff" stroke="var(--laq-navy)" strokeWidth="1.8" />
            <circle className="rvs-d" cx="98" cy="12" r="5" fill="#f5e2da" stroke="#a0675a" strokeWidth="1.8" />
          </svg>
        </div>
      ) : null}
      <div className="rvs-t" data-qls="count-tile" data-k="sent" aria-label={`Queries sent: ${c.sent[0]}, then ${c.sent[1]}`}>
        <span className="rvs-l">Queries sent</span>{num(c.sent[0], c.sent[1])}
        <svg className="rvs-sp" width="84" height="30" viewBox="0 0 112 40" aria-hidden="true">
          {c.weeks.map((v, i) => { const h = hOf(v); return <rect key={i} x={8 + i * 14} y={34 - h} width="9" height={h} rx="2" fill="var(--laq-navy)" fillOpacity={v ? (i === last ? 1 : 0.55) : 0.2} />; })}
          <rect className="rvs-d" x={8 + last * 14 + 0.8} y={Math.max(1, 34 - lastH - 9.2)} width="7.4" height="7.4" rx="1.8" fill="#f5e2da" stroke="#a0675a" strokeWidth="1.6" strokeDasharray="2.5 2.5" />
        </svg>
      </div>
    </div>
  );
};

/* ── the journey ──────────────────────────────────────────────────────────────────────────────────────────────── */

export const QcLogStages: React.FC<QcLogStagesProps> = (p) => {
  const { nowMs, agents } = p;
  const [s, setS] = useState<FlowState>(() => freshState(nowMs));
  /* v1.2 — anything the writer does marks the journey as answered (a door's seeds do not), for the dimmed page's leave check */
  const touched = useRef(false);
  const set = (patch: Partial<FlowState>) => { touched.current = true; setS((o) => ({ ...o, ...patch })); };
  /* the flow, then the celebration once a query is logged with "Log query" */
  const [phase, setPhase] = useState<"flow" | "yay">("flow");
  const [logged, setLogged] = useState<LoggedView | null>(null);
  /* v2 — "Log and start another" this sitting: the headline's "That's {n} logged." (Undo steps it back) */
  const [sitting, setSitting] = useState(0);
  const agent = agents.find((a) => a.id === s.agentId) ?? null;
  const findRef = useRef<HTMLInputElement>(null);
  const sbRef = useRef<HTMLDivElement>(null);

  /* materials fork v1 — coming back to Materials lands on the screen the writer carried on from, never the fork */
  const go = (step: StageKey, dir?: "in" | "back") => setS((o) => ({ ...o, step, hi: 0, dir: dir ?? (STAGES.indexOf(step) > STAGES.indexOf(o.step) ? "in" : "back"), ...(step === "what" ? { mat: matOf(o) } : {}) }));
  /** answer the current stage and move on, skipping anything already answered */
  const answer = (patch: Partial<FlowState>) => { touched.current = true; advance(patch); };
  const advance = (patch: Partial<FlowState>) => setS((o) => {
    const n = { ...o, ...patch };
    return { ...n, step: nextStage(n, o.step), hi: 0, dir: "in" };
  });

  /* a door's seeds, none of which counts as the writer's answer: the agent (an agent's card, the Contact list) is the
     first answer; v1.2 — a package a door named is shown chosen on Materials; "Log another" carries the date and the
     materials over (the package if it was one, else the pieces), as "Log and start another" does */
  useEffect(() => {
    const patch: Partial<FlowState> = {};
    if (p.seedPackageId && p.packages.some((x) => x.id === p.seedPackageId)) Object.assign(patch, { pkgSeed: p.seedPackageId, mat: "pkg" });
    const ag = p.again;
    if (ag) {
      patch.sent = sod(new Date(ag.sent).getTime());
      const pk = ag.how !== "individual" ? p.packages.find((x) => x.id === ag.pkg) : undefined;
      const m = ag.mat as Materials | undefined;
      if (pk) Object.assign(patch, { packageId: pk.id, piecesSet: true, mat: "pkg", pieces: { letterId: pk.card.qlId, synopsisId: pk.card.synId, sample: null } });
      else if (m && (m.ql || m.syn || (m.s && m.s.unit !== "none"))) {
        const book = p.bookVersions.find((b) => b.current)?.id ?? p.bookVersions[0]?.id ?? null;
        const pieces: Pieces = { letterId: m.ql ? p.letters[0]?.id ?? NO_LETTER : null, synopsisId: m.syn ? p.synopses[0]?.id ?? NO_SYN : null, sample: m.s ? choiceOfSample(m.s, book) : null };
        Object.assign(patch, { mat: "pcs", piecesSet: true, piecesTouched: true, packageId: null, pieces, picked: pieces });
      }
    }
    const a = p.seedAgentId ? agents.find((x) => x.id === p.seedAgentId && !x.querying) : null;
    if (a) patch.agentId = a.id;
    /* ⚠️ PLACED, NOT ADVANCED: the step is worked out from the first stage, never from the one on screen, so running the
       seed twice (React's StrictMode does, in development) lands in the same place — v1.1's seed advanced twice there */
    if (Object.keys(patch).length) setS((o) => { const n = { ...o, ...patch }; return { ...n, step: n.agentId ? nextStage(n, "who") : "who", hi: 0, dir: "in" }; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id: string) => {
    const a = agents.find((x) => x.id === id);
    if (!a) return;
    /* how always comes from the agent's own card in a batch; otherwise the How stage asks, with the card's first */
    answer({ agentId: id, find: "", via: s.carried ? a.via : null, ...(id !== s.agentId ? { reply: null, replySet: false, nCal: null } : {}) });
  };

  /* ── the Agent stage ── */
  const g = useMemo(() => whoGroups(agents, s.find), [agents, s.find]);
  const pick = [...g.ready, ...g.closed];
  const hi = Math.min(s.hi, Math.max(0, pick.length - 1));
  useEffect(() => { if (s.step === "who") findRef.current?.focus({ preventScroll: true }); }, [s.step]);
  useLayoutEffect(() => {
    if (s.step !== "who") return;
    sbRef.current?.querySelector<HTMLElement>(".laq-big > button.is-hi")?.scrollIntoView({ block: "nearest" });
  }, [hi, s.step]);

  /* v2 · Phase 2 — the add-an-agent screen, in this panel: the name from the search, an agency if they know it */
  const startAdd = () => set({ adding: { name: titleName(s.find), agency: "", error: null, busy: false }, dir: "in" });
  /** agents added here, by id → their name, until the Contact list's listener brings the record in */
  const addedNames = useRef<Record<string, string>>({});
  const createdIds = useRef<Set<string>>(new Set());
  const addAgent = async () => {
    const ad = s.adding;
    if (!ad || ad.busy || !ad.name.trim()) return;
    setS((o) => (o.adding ? { ...o, adding: { ...o.adding, busy: true, error: null } } : o));
    const r = await p.onCreateAgent(titleName(ad.name), ad.agency);
    if ("error" in r) { setS((o) => (o.adding ? { ...o, adding: { ...o.adding, busy: false, error: r.error } } : o)); return; }
    addedNames.current[r.id] = titleName(ad.name);
    if (r.created) createdIds.current.add(r.id);
    answer({ adding: null, agentId: r.id, find: "", via: null, reply: null, replySet: false, nCal: null });
  };
  const addBody = () => {
    const ad = s.adding!;
    const upd = (patch: Partial<NonNullable<FlowState["adding"]>>) => set({ adding: { ...ad, ...patch, error: null } });
    const key = (e: React.KeyboardEvent) => { if (e.key === "Enter" && ad.name.trim()) { e.preventDefault(); void addAgent(); } };
    return (
      <>
        <h2 className="laq-qh">Who’s the new agent?</h2>
        <p className="laq-qs">Just the name for now. You’ll carry straight on with this query.</p>
        <label className="laq-fl"><span>Name</span>
          <input data-qls="add-name" autoComplete="off" value={ad.name} autoFocus={!ad.name} onChange={(e) => upd({ name: e.target.value })} onKeyDown={key} /></label>
        <label className="laq-fl"><span>Agency<i>if you know it</i></span>
          <input data-qls="add-agency" autoComplete="off" value={ad.agency} autoFocus={!!ad.name} onChange={(e) => upd({ agency: e.target.value })} onKeyDown={key} /></label>
        {ad.error ? <p className="laq-err" data-qls="add-error" role="alert">{ad.error}</p> : null}
        <p className="laq-info" data-qls="add-info">They go on your Contact list now. Filling in the rest of their card goes on your to-do list, so it doesn’t hold this up.</p>
      </>
    );
  };
  const addFoot = (
    <>
      <button type="button" className="laq-lnk" data-qls="add-back" onClick={() => set({ adding: null, dir: "back" })}>Back</button>
      <span className="laq-sp" />
      <button type="button" className="laq-btn" data-qls="add-go" disabled={!s.adding?.name.trim() || s.adding?.busy} aria-busy={s.adding?.busy || undefined}
        onClick={() => void addAgent()}>Add and carry on {ICON.arrow}</button>
    </>
  );

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
      <div key={a.id} className="laq-off" data-qls="agent-busy" data-id={a.id}>
        <span className="laq-g" aria-hidden="true">{a.initials}</span><b>{a.name}</b>
        <span>{a.queriedMs != null ? `queried ${dayMon(a.queriedMs)}` : "already querying"}</span>
      </div>
    );
    const nm = titleName(q);
    return (
      <>
        <h2 className="laq-qh">Who did you query?</h2>
        <label className="laq-srch">{ICON.search}
          <input ref={findRef} value={s.find} data-qls="find" placeholder="Find an agent in your Contact list" aria-label="Find an agent in your Contact list" autoComplete="off"
            onChange={(e) => set({ find: e.target.value, hi: 0 })}
            onKeyDown={(e) => {
              const n = pick.length;
              if (e.key === "ArrowDown" && n) { e.preventDefault(); set({ hi: (hi + 1) % n }); }
              else if (e.key === "ArrowUp" && n) { e.preventDefault(); set({ hi: (hi - 1 + n) % n }); }
              else if (e.key === "Enter" && n) { e.preventDefault(); choose(pick[hi].id); }
              else if (e.key === "Enter" && q) { e.preventDefault(); startAdd(); }
            }} />
        </label>
        {g.ready.length ? <><div className="laq-grp" data-qls="group" data-k="ready">Not queried yet <span>{g.ready.length}</span></div><div className="laq-big">{g.ready.map(row)}</div></> : null}
        {g.closed.length ? <><div className="laq-grp" data-qls="group" data-k="closed">Closed right now <span>{g.closed.length}</span></div><div className="laq-big">{g.closed.map(row)}</div></> : null}
        {q && !pick.length && !g.busyHit.length ? <div className="laq-none" data-qls="none">No one called “{q}” in your Contact list.</div> : null}
        {/* v2 · Phase 2 — adding an agent is always the list's last row, and never leaves this journey */}
        <div className="laq-big laq-addw">
          <BigRow glyph="+" title={q && !pick.length ? `Add ${nm} as a new agent` : "Add a new agent"} quiet arrow={false} onClick={startAdd}
            data={{ "data-qls": "new-agent" }} />
        </div>
        {q && g.busyHit.length ? <><div className="laq-grp" data-qls="group" data-k="busy">Already querying</div>{g.busyHit.map(off)}</> : null}
        {!q && g.busy.length ? (s.showBusy
          ? <><div className="laq-grp" data-qls="group" data-k="busy">Already querying <span>{g.busy.length}</span><button type="button" className="laq-lk" style={{ marginLeft: "auto", fontSize: 13.5 }} data-qls="busy-hide" onClick={() => set({ showBusy: false })}>Hide</button></div>{g.busy.map(off)}</>
          : <button type="button" className="laq-busy" data-qls="busy" onClick={() => set({ showBusy: true })}>
              <span className="laq-faces" aria-hidden="true">{g.busy.slice(0, 4).map((a) => <i key={a.id}>{a.initials}</i>)}</span>
              You've already queried {g.busy.length} {g.busy.length === 1 ? "agent" : "agents"} with this book<u>Show</u>
            </button>) : null}
      </>
    );
  };

  /* ── the Sent stage ── */
  const first = agent?.first ?? (s.agentId && addedNames.current[s.agentId] ? firstName(addedNames.current[s.agentId]) : "the agent");
  const y = yesterday(nowMs);
  const isEarlier = s.sent != null && !sameDay(s.sent, nowMs) && !sameDay(s.sent, y);
  const calRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (s.earlier && calRef.current && sbRef.current) sbRef.current.scrollTop = sbRef.current.scrollHeight; }, [s.earlier]);
  const whenBody = () => {
    const cal = calMonth(s.calY, s.calM, nowMs);
    const shift = (d: number) => { const m = new Date(s.calY, s.calM + d, 1); set({ calY: m.getFullYear(), calM: m.getMonth() }); };
    return (
      <>
        <h2 className="laq-qh">When did it go to {first}?</h2>
        <p className="laq-qs">This starts the clock on {first}'s reply window.</p>
        <div className="laq-big" data-qls="when">
          <BigRow glyph={ICON.cal} title="Today" sub={weekdayDay(nowMs)} on={sameDay(s.sent, nowMs)} data={{ "data-qls": "when-opt", "data-k": "today" }} onClick={() => answer({ sent: sod(nowMs), earlier: false })} />
          <BigRow glyph={ICON.cal} title="Yesterday" sub={weekdayDay(y)} on={sameDay(s.sent, y)} data={{ "data-qls": "when-opt", "data-k": "yesterday" }} onClick={() => answer({ sent: y, earlier: false })} />
          <BigRow glyph={ICON.cal} title="An earlier date" sub={isEarlier ? `Chosen: ${dayMonY(s.sent!, nowMs)}` : "Pick it from the calendar"} on={s.earlier} arrow={false}
            data={{ "data-qls": "when-opt", "data-k": "earlier" }} onClick={() => set({ earlier: !s.earlier })} />
        </div>
        {s.earlier ? (
          <div className="laq-cal" data-qls="calendar" ref={calRef}>
            <div className="laq-calh">
              <button type="button" aria-label="Previous month" data-qls="cal-prev" onClick={() => shift(-1)}>{ICON.l}</button>
              <b data-qls="cal-month">{monthLong(s.calY, s.calM)} {s.calY}</b>
              <button type="button" aria-label="Next month" data-qls="cal-next" disabled={!cal.canNext} onClick={() => shift(1)}>{ICON.r}</button>
            </div>
            <div className="laq-calg">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} aria-hidden="true">{d}</span>)}
              {Array.from({ length: cal.lead }, (_, i) => <i key={`b${i}`} />)}
              {cal.days.map((d) => (
                <button key={d.ms} type="button" data-qls="cal-day" data-day={d.day} disabled={d.future} aria-label={weekdayDay(d.ms)}
                  className={`${d.today ? "is-today" : ""}${sameDay(s.sent, d.ms) ? " is-on" : ""}`} onClick={() => answer({ sent: d.ms })}>{d.day}</button>
              ))}
            </div>
          </div>
        ) : null}
        {/* v2 · Phase 3 — not sent yet: a to-do task, and no query record */}
        <p className="laq-ask laq-notsent">Not sent yet? <button type="button" className="laq-lk" data-qls="not-sent" disabled={nsBusy} onClick={() => void notSent()}>Put it on your to-do list</button></p>
      </>
    );
  };

  /* ── v2 · Phase 3 — not sent yet ── */
  const [nsBusy, setNsBusy] = useState(false);
  const notSent = async () => {
    if (!s.agentId || nsBusy) return;
    setNsBusy(true);
    const id = await p.onNotSent(s.agentId, agent?.name ?? addedNames.current[s.agentId] ?? first);
    setNsBusy(false);
    if (id) set({ notSent: true, earlier: false, dir: "in" });
  };
  const notSentBody = () => (
    <>
      <h2 className="laq-qh">We’ll hold it for you.</h2>
      <p className="laq-qs">Nothing is logged yet. It’s on your to-do list for when it goes.</p>
      <div className="laq-todo" data-qls="not-sent-task">
        <i aria-hidden="true" />
        <span><b>Send your query to {agent?.name ?? (s.agentId ? addedNames.current[s.agentId] : null) ?? first}</b><span>{agent?.agency || "No agency yet"} · added today</span></span>
      </div>
    </>
  );
  const notSentFoot = (
    <>
      <button type="button" className="laq-lnk" data-qls="sent-after-all" onClick={async () => { if (s.agentId) await p.onSentAfterAll(s.agentId); set({ notSent: false, sent: null, dir: "back", step: "when" }); }}>It has gone after all</button>
      <span className="laq-sp" />
      <button type="button" className="laq-btn" data-qls="not-sent-done" onClick={p.onClose}>Done</button>
    </>
  );

  /* ── the Materials stage ── v2 · Phase 4 (screens 06, 07, 12, 19, 22)
     What is on offer depends on what the writer has saved (4b): packages → the fork's two tiles (A package / Materials);
     named materials and no packages → straight to the pieces; nothing saved → the pieces with generic pieces and a note.
     ONE PIECES SCREEN for everyone (4c): three ticks, each opening in place — Query letter and Synopsis offer the named
     ones where some are saved, A sample opens the app's SampleControl (and "Which version is it from?" when versions are
     saved). Collapsed, each says what it is: the sample always states its size (D8).
     ⚠️ ONLY THE SCREEN CARRIED ON FROM IS SAVED: a package writes `pieces` from the package; the pieces screen works on
        `picked` and copies it into `pieces` on Carry on. Generic pieces are the stand-ins the build already stores
        (NO_LETTER / NO_SYN, a sample with no book version) — no new field. */
  const dflt = { letter: p.letters[0]?.id ?? null, synopsis: p.synopses[0]?.id ?? null, book: p.bookVersions.find((b) => b.current)?.id ?? p.bookVersions[0]?.id ?? null };
  const ask = agent?.ask ?? null;
  const hasPkgs = p.packages.length > 0;
  const hasNamed = p.letters.length > 0 || p.synopses.length > 0 || p.bookVersions.length > 0;
  /* with no packages there is no fork and no packages screen: the pieces are the step */
  const mat: MatView = hasPkgs ? s.mat : "pcs";
  const items = askItems(ask);
  const fill = askFill(ask, p.packages, dflt);
  /* D9 — one tap: the package that matches exactly, else the pieces the card names; then on to the next step. Everything
     stays editable from the track. */
  const useAsk = () => {
    if (!fill) return;
    if (fill.kind === "pkg") answer({ packageId: fill.pkg.id, piecesSet: true, mat: "pkg", pieces: fill.pieces });
    else answer({ packageId: null, piecesSet: true, mat: "pcs", pieces: fill.pieces, picked: fill.pieces, piecesTouched: true, pOpen: { letter: false, syn: false, sample: false } });
  };
  const asks = () => <AskCardView items={items} first={first} fitName={fill?.kind === "pkg" ? fill.pkg.name : null} onUse={useAsk} />;
  const usePackage = (pk: StagePackage) => {
    /* a package sets the letter and the synopsis; a package states no sample size, so where it tests a book version
       the portion is what the agent asks for, else the house opening sample (3 chapters) */
    const sample: SampleChoice | null = pk.card.bookVersion
      ? (ask && ask.sample.unit !== "none" ? { unit: ask.sample.unit, amt: ask.sample.amt, bookVersionId: null } : { unit: "chapters", amt: 3, bookVersionId: null })
      : null;
    answer({ packageId: pk.id, piecesSet: true, mat: "pkg", pieces: { letterId: pk.card.qlId, synopsisId: pk.card.synId, sample } });
  };
  /* the pieces screen's first look: the query letter ticked (every query has one) and open; nothing else */
  const startPicks = (): Partial<FlowState> => (s.piecesTouched ? {} : {
    picked: { letterId: dflt.letter ?? NO_LETTER, synopsisId: null, sample: null }, piecesTouched: true, pOpen: { letter: true, syn: false, sample: false },
  });
  useEffect(() => {
    if (s.step === "what" && mat === "pcs" && !s.piecesTouched) set(startPicks());
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const toMat = (to: MatView) => set({ mat: to, dir: to === "fork" ? "back" : "in", ...(to === "pcs" ? startPicks() : {}) });
  const rootRef = useRef<HTMLDivElement>(null);

  const pc = s.pieces;
  const pk = s.picked;
  /** the sample a tick starts from: what the agent asks for, else the house opening sample (3 chapters) */
  const sampleStart: SampleChoice = { unit: ask && ask.sample.unit !== "none" ? ask.sample.unit : "chapters", amt: ask && ask.sample.unit !== "none" ? ask.sample.amt : 3, bookVersionId: dflt.book };
  /** a change on the pieces screen; while the pieces are the stage's answer it stays the answer, as the old picker's did */
  const setPicked = (patch: Partial<Pieces>, open?: Partial<FlowState["pOpen"]>) => {
    const picked = { ...pk, ...patch };
    const keep = s.piecesSet && !s.packageId && (!!picked.letterId || !!picked.synopsisId || !!picked.sample);
    set({ picked, ...(keep ? { pieces: picked } : {}), ...(open ? { pOpen: { ...s.pOpen, ...open } } : {}) });
  };
  const pieceCount = [!!pc.letterId, !!pc.synopsisId, !!pc.sample].filter(Boolean).length;
  /* Carry on stands under today's rule: any one piece will do */
  const anyPicked = !!pk.letterId || !!pk.synopsisId || !!pk.sample;
  const carryOn = () => answer({ packageId: null, piecesSet: true, mat: "pcs", pieces: pk, pOpen: { letter: false, syn: false, sample: false } });

  const forkBody = () => {
    const n = p.packages.length;
    const tile = (k: "pkg" | "pcs", icon: React.ReactNode, title: string, desc: string, foot: string) => (
      <button type="button" className="laq-tile" data-qls="fork-tile" data-k={k} onClick={() => toMat(k)}>
        <span className="laq-ti" aria-hidden="true">{icon}</span>
        <b className="laq-tt">{title}</b>
        <span className="laq-td">{desc}</span>
        <span className="laq-tm" data-qls="fork-foot"><span>{foot}</span><span aria-hidden="true">→</span></span>
      </button>
    );
    return (
      <>
        <h2 className="laq-qh">What did you send {first}?</h2>
        {asks()}
        <div className="laq-fork" data-qls="fork">
          {tile("pkg", ICON.box, "A package", "A set you've already put together: letter, synopsis and version in one go.", `${n} saved ${n === 1 ? "package" : "packages"}`)}
          {tile("pcs", ICON.pages, "Materials", "Pick the pieces yourself: a query letter, a synopsis, and the version your opening is from.", "Choose what went")}
        </div>
      </>
    );
  };

  const pkgBody = () => (
    <>
      <h2 className="laq-qh">Which package went to {first}?</h2>
      <p className="laq-qs">Tap the one you sent.</p>
      <div className="laq-big" data-qls="packages">
        {p.packages.map((x) => (
          <BigRow key={x.id} glyph={ICON.pkg} glyphClass="is-pkg" title={x.name} sub={x.pieces.join(" · ")} on={(s.piecesSet ? s.packageId : s.pkgSeed) === x.id}
            tag={x.active ? "Active" : null} tagClass="is-m" data={{ "data-qls": "package", "data-id": x.id }} onClick={() => usePackage(x)} />
        ))}
      </div>
      <p className="laq-ask"><button type="button" className="laq-lk" data-qls="choose-pieces" onClick={() => toMat("pcs")}>Choose the pieces myself instead</button></p>
    </>
  );

  const pcsBody = () => {
    const opts = (k: "letter" | "syn" | "ver", list: readonly { id: string; name: string }[], on: (id: string) => boolean, pick: (id: string) => void) => (
      <div className="laq-opts" role="radiogroup" aria-label={k === "letter" ? "Which query letter" : k === "syn" ? "Which synopsis" : "Which version"}>
        {list.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={on(o.id)} className={`laq-opt${on(o.id) ? " is-on" : ""}`} data-qls="pc-opt" data-k={k} data-id={o.id} onClick={() => pick(o.id)}>
            <span className="laq-rdo" aria-hidden="true" /><span className="laq-on">{o.name}</span>
          </button>
        ))}
      </div>
    );
    /** one tick: unticked → ticked and open; ticked and open → unticked (the ref); ticked and folded (Esc) → open */
    const tile = (k: "letter" | "syn" | "sample", icon: React.ReactNode, title: string, ticked: boolean, sub: string | null, extra: React.ReactNode | null, tick: (on: boolean) => void) => {
      const open = ticked && s.pOpen[k] && !!extra;
      return (
        <div className={`laq-gt${ticked ? " is-on" : ""}`} data-qls="piece" data-k={k} data-on={ticked ? "1" : "0"}>
          <button type="button" role="checkbox" aria-checked={ticked} aria-expanded={extra ? open : undefined}
            onClick={() => { if (!ticked) tick(true); else if (open || !extra) tick(false); else set({ pOpen: { ...s.pOpen, [k]: true } }); }}>
            <span className="laq-ck" aria-hidden="true">{ticked ? "✓" : ""}</span>
            <span className="laq-tx"><b>{icon}{title}</b>{sub ? <span data-qls="piece-sub">{sub}</span> : null}</span>
          </button>
          {open ? <div className="laq-gs" data-qls="piece-open">{extra}</div> : null}
        </div>
      );
    };
    const letterName = p.letters.find((l) => l.id === pk.letterId)?.name ?? null;
    const synName = p.synopses.find((l) => l.id === pk.synopsisId)?.name ?? null;
    const verNow = p.bookVersions.find((b) => b.id === pk.sample?.bookVersionId) ?? null;
    const sampleSub = pk.sample ? `${sizeName(pk.sample)}${verNow ? ` · ${verNow.name}` : ""}` : "Pages, chapters or words";
    return (
      <>
        <h2 className="laq-qh">{hasPkgs ? `Which pieces went to ${first}?` : `What did you send ${first}?`}</h2>
        {asks()}
        <div className="laq-gen" data-qls="pieces">
          {tile("letter", <MaterialIcon kind="letter" inline />, "Query letter", !!pk.letterId, letterName,
            p.letters.length ? opts("letter", p.letters, (id) => pk.letterId === id, (id) => setPicked({ letterId: id })) : null,
            (on) => setPicked({ letterId: on ? dflt.letter ?? NO_LETTER : null }, { letter: on }))}
          {tile("syn", <MaterialIcon kind="synopsis" inline />, "Synopsis", !!pk.synopsisId, synName,
            p.synopses.length ? opts("syn", p.synopses, (id) => pk.synopsisId === id, (id) => setPicked({ synopsisId: id })) : null,
            (on) => setPicked({ synopsisId: on ? dflt.synopsis ?? NO_SYN : null }, { syn: on }))}
          {tile("sample", null, "A sample", !!pk.sample, sampleSub,
            pk.sample ? (
              <div className="laq-qsamp" data-qls="sample-control">
                <SampleControl name="laq" sample={sampleOfChoice(pk.sample)} book={p.book}
                  onChange={(x) => setPicked({ sample: choiceOfSample(x, pk.sample?.bookVersionId ?? null) })} />
                {p.bookVersions.length ? <>
                  <div className="laq-gh laq-verh"><b>Which version is it from?</b></div>
                  {opts("ver", p.bookVersions, (id) => (pk.sample?.bookVersionId ?? "") === id, (id) => setPicked({ sample: pk.sample ? { ...pk.sample, bookVersionId: id } : null }))}
                </> : null}
              </div>
            ) : null,
            (on) => setPicked({ sample: on ? (pk.sample ?? sampleStart) : null }, { sample: on }))}
        </div>
        {hasNamed ? null : <p className="laq-info laq-gnote" data-qls="generic-note">You haven’t saved any named materials yet, so these go on the query as they are. Name them later on your Materials page if you want to compare versions.</p>}
        {hasPkgs ? <p className="laq-ask"><button type="button" className="laq-lk" data-qls="back-packages" onClick={() => toMat("pkg")}>Use a saved package instead</button></p> : null}
      </>
    );
  };

  const whatBody = () => (mat === "fork" ? forkBody() : mat === "pkg" ? pkgBody() : pcsBody());

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
        <h2 className="laq-qh">How did you send it?</h2>
        <p className="laq-qs">{card ? `${first}'s card says ${card.word}, so that's first.` : `Nothing on ${first}'s card about how they take queries.`}</p>
        <div className="laq-big" data-qls="how">
          {order.map((h) => (
            <BigRow key={h.k} glyph={h.k === SubmissionMethod.EMAIL ? ICON.mail : h.k === SubmissionMethod.POST ? ICON.post : ICON.web} title={h.label} sub={sub[h.k]}
              on={s.via === h.k} tag={card?.k === h.k ? `From ${first}'s card` : null} data={{ "data-qls": "how-opt", "data-k": h.k }} onClick={() => answer({ via: h.k })} />
          ))}
        </div>
      </>
    );
  };

  /* ── v1.3 — the Nudge stage: when they might reply, and whether to be reminded ── */
  const agentWk = agent?.weeks ?? null;
  /* v2 · Phase 5 — the answers settled against the dates (settleReply): "now" only while the reply date has passed (and
     the default the first time it has), Close it only with a reply date still ahead */
  const rp0: ReplyAnswers | null = s.reply ?? (agent ? replyDefaults({ responseTimeWeeks: agentWk ?? undefined, noResponseMeansNo: agent.nrmn }) : null);
  const rp: ReplyAnswers | null = rp0 && s.sent != null ? settleReply(rp0, s.sent, nowMs, !s.reply) : rp0;
  const setReply = (r: ReplyAnswers) => set({ reply: r });
  const nudgeBody = () => {
    if (!rp || s.sent == null) return null;
    const sent = s.sent;
    const ex = expectOf(sent, rp.wk);
    const past = isPastReply(sent, rp.wk, nowMs);
    const offer = cardOffer(agentWk, rp.wk);
    const nd = nudgeDateOf(rp, sent, nowMs);
    const day = (d: Date) => `${WEEKDAY[d.getDay()].slice(0, 3)} ${dayMonY(d.getTime(), nowMs)}`;
    const opt = (k: ReplyAnswers["ifNo"], title: string, sub: string, extra: React.ReactNode, dis: boolean, tag: string | null) => (
      <div className={`laq-nopt${rp.ifNo === k ? " is-on" : ""}${dis ? " is-dis" : ""}`} data-qls="nudge-opt" data-k={k} data-on={rp.ifNo === k ? "1" : "0"}>
        <button type="button" role="radio" aria-checked={rp.ifNo === k} disabled={dis} onClick={() => setReply({ ...rp, ifNo: k })}>
          <span className="laq-rd" aria-hidden="true" /><span className="laq-tx"><b>{title}</b><span data-qls="nudge-opt-sub">{sub}</span></span>
          {tag ? <span className="laq-ntag" data-qls="nudge-tag">{tag}</span> : null}
        </button>
        {rp.ifNo === k && extra ? extra : null}
      </div>
    );
    const chips = nudgeChips(sent, rp.wk, nowMs);
    const on = chipOn(rp, chips);
    const calAt = s.nCal ?? (() => { const d = new Date(rp.nPick ?? nd?.getTime() ?? nowMs); return d.getFullYear() * 12 + d.getMonth(); })();
    const cal = calMonthAhead(Math.floor(calAt / 12), calAt % 12, nowMs);
    const chipRow = (
      <>
        <div className="laq-nch" data-qls="nudge-chips" role="radiogroup" aria-label="When to be reminded">
          {chips.map((c) => (
            <button key={c.k} type="button" role="radio" aria-checked={on === c.k} className={`laq-chip${on === c.k ? " is-on" : ""}`} data-qls="nudge-chip" data-k={c.k}
              onClick={() => setReply({ ...rp, ifNo: "nudge", nWhen: c.k })}>{c.label}</button>
          ))}
          <button type="button" role="radio" aria-checked={rp.nWhen === "pick"} className={`laq-chip${rp.nWhen === "pick" ? " is-on" : ""}`} data-qls="nudge-chip" data-k="pick"
            onClick={() => set({ reply: { ...rp, nWhen: "pick" }, nCal: null })}>Pick a date</button>
        </div>
        {rp.nWhen === "pick" ? (
          <div className="laq-cal laq-ncal" data-qls="nudge-calendar">
            <div className="laq-calh">
              <button type="button" aria-label="Previous month" data-qls="ncal-prev" disabled={!cal.canPrev} onClick={() => set({ nCal: calAt - 1 })}>{ICON.l}</button>
              <b data-qls="ncal-month">{monthLong(Math.floor(calAt / 12), calAt % 12)} {Math.floor(calAt / 12)}</b>
              <button type="button" aria-label="Next month" data-qls="ncal-next" onClick={() => set({ nCal: calAt + 1 })}>{ICON.r}</button>
            </div>
            <div className="laq-calg">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} aria-hidden="true">{d}</span>)}
              {Array.from({ length: cal.lead }, (_, i) => <i key={`b${i}`} />)}
              {cal.days.map((d) => (
                <button key={d.ms} type="button" data-qls="ncal-day" data-day={d.day} disabled={!d.future} aria-label={weekdayDay(d.ms)}
                  className={`${d.today ? "is-today" : ""}${sameDay(rp.nPick, d.ms) ? " is-on" : ""}`} onClick={() => setReply({ ...rp, nPick: d.ms })}>{d.day}</button>
              ))}
            </div>
          </div>
        ) : null}
      </>
    );
    return (
      <>
        <h2 className="laq-qh">{past ? `How long does ${first} usually take?` : `When might ${first} reply?`}</h2>
        <p className="laq-qs" data-qls="nudge-sub">{agentWk ? `${first}'s card says ${agentWk} weeks.` : `Nothing on ${first}'s card about how long they take. Your best guess is fine.`}</p>
        <div className="laq-wkb" data-qls="weeks">
          <WeekSlider label="Response time" value={rp.wk} min={1} max={26}
            onChange={(w) => setReply(withWeeks(rp, w, agentWk))} onUnknown={() => setReply(toggleUnknown(rp, agentWk))} />
          <p className="laq-wkx" data-qls="reply-by">{!ex ? "No reply date, so choose when to be reminded below."
            : past ? <>That was <b>{day(ex)}</b>, {Math.max(1, daysBefore(ex.getTime(), nowMs))} days ago.</> : <>Reply expected by <b>{day(ex)}</b>.</>}</p>
          {offer ? (
            <label className={`laq-svk${rp.saveWk ? " is-on" : ""}`} data-qls="save-weeks" data-kind={offer.kind} data-on={rp.saveWk ? "1" : "0"}>
              <input type="checkbox" className="sr-only" checked={rp.saveWk} onChange={() => setReply({ ...rp, saveWk: !rp.saveWk })} />
              <span className="laq-bx3" aria-hidden="true">{rp.saveWk ? "✓" : ""}</span>
              {offer.kind === "save"
                ? <span><b>Save {offer.n} weeks to {first}'s card</b><i>It keeps your Contact list complete, so your tracking and analysis are more accurate.</i></span>
                : <span><b>Update {first}'s card to {offer.n} weeks</b><i>It says {offer.was} weeks now. Keeping it current makes your tracking and analysis more accurate.</i></span>}
            </label>
          ) : null}
        </div>
        {past ? <>
          {/* v2 · Phase 5 — the reply date had already gone by on the date given (screen 09) */}
          <h3 className="laq-qh is-q2">It’s past that date. What now?</h3>
          <div className="laq-nopts" data-qls="nudge-opts" data-past="1" role="radiogroup" aria-label="It’s past that date. What now?">
            {opt("now", `I’ll nudge ${first} now`, "It goes on your to-do list for today.", null, false, null)}
            {opt("nudge", "Give it longer", nd && rp.ifNo === "nudge" ? `Remind me to nudge on ${day(nd)}.` : `Remind me to nudge on ${day(chips[1].d)}.`, chipRow, false, null)}
            {opt("none", "No reminder", "Nothing goes on your to-do list.", null, false, null)}
          </div>
        </> : <>
        <h3 className="laq-qh is-q2">Want a reminder to nudge?</h3>
        <div className="laq-nopts" data-qls="nudge-opts" role="radiogroup" aria-label="Want a reminder to nudge?">
          {opt("nudge", "Remind me to nudge", nd ? `On ${day(nd)}. It goes on your to-do list.` : rp.nWhen === "pick" && rp.ifNo === "nudge" ? "Pick the day below." : `On ${day(chips[1].d)}. It goes on your to-do list.`, chipRow, false, null)}
          {opt("close", "Close it if there's no reply", ex ? `On ${day(addDays(ex, 1))}, marked as no reply.` : "Needs a response time first.", null, !ex, agent?.nrmn ? `${first}'s card says no reply means no` : null)}
          {/* ⚠️ the brief's "You can add one later from the query card." is not true today: the card logs a nudge sent and
             snoozes one that is due, but nothing there sets a new reminder (reported in v1.3's REPORT) */}
          {opt("none", "No reminder", "Nothing goes on your to-do list.", null, false, null)}
        </div>
        </>}
      </>
    );
  };

  /* ── the check stage ── */
  const answers = (): LogAnswers | null => (s.agentId && s.sent != null && s.via && s.piecesSet
    ? { agentId: s.agentId, sent: s.sent, via: s.via, packageId: s.packageId, letterId: pc.letterId, synopsisId: pc.synopsisId, sample: pc.sample, note: s.note.trim(), ...(rp ? { reply: rp } : {}) }
    : null);
  const preview = useMemo(() => {
    const a = answers();
    if (!a || (s.step !== "check" && phase === "flow")) return null;
    const plan = planOf(a, p.ctx, PREVIEW_ID, false, nowMs);
    return plan ? previewOf(plan, nowMs, p.quietWeeks) : null;
  }, [s, phase, p.ctx, nowMs, p.quietWeeks]); // eslint-disable-line react-hooks/exhaustive-deps
  /* v2 · Phase 6 — THE PREVIEW IS THE QUERIES PAGE'S OWN GRID CARD (QcCard154, `preview`), given the row the save's own
     record makes (`previewOf`); QcSlip153 leaves this journey. The page's root classes (.qc151.qc153) carry its sheet. */
  const card = (pv: NonNullable<typeof preview>, stampOn: boolean, sentMs: number | null) => (
    <div className="laq-pv laq-pvw qc151 qc153" data-qls="preview">
      <QcCard154 row={pv.row} nowMs={nowMs} selected={false} packageName={pv.packageName} act={null} onOpen={noop} onAct={noop} preview />
      {stampOn ? <span className={`laq-stamp${reduce ? "" : " is-thump"}`} data-qls="stamp"><span>Logged</span><small>{dayMon(sentMs ?? nowMs).toUpperCase()}</small></span> : null}
    </div>
  );
  /* the two quiet numbers under the card: the Dashboard's own functions, without and with this query */
  const counts = useMemo(() => (preview ? reviewCounts(p.bookQueries, preview.query, new Date(nowMs)) : null), [preview, p.bookQueries, nowMs]);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (s.noteOpen) noteRef.current?.focus({ preventScroll: true }); }, [s.noteOpen]);
  const checkBody = () => (
    <>
      <h2 className="laq-qh">Ready to log {first}?</h2>
      <p className="laq-qs">Here’s how {first} will look on your Queries page. Tap the paperclip to check what went.</p>
      {preview ? card(preview, stamp, s.sent) : null}
      <div className="laq-nt">
        {s.noteOpen
          ? <textarea ref={noteRef} data-qls="note" value={s.note} placeholder={`Anything about this query for ${first}. It goes on the query card.`} aria-label="A note on this query" onChange={(e) => set({ note: e.target.value })} />
          : <button type="button" className="laq-lk" data-qls="add-note" onClick={() => set({ noteOpen: true })}>+ Add a note</button>}
      </div>
      {counts ? <ReviewNumbers c={counts} /> : null}
      <p className="laq-qs is-foot">Something not right? Tap any step above to change it.</p>
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
        setS((o) => ({ ...o, step: "who", dir: "in", agentId: null, via: null, find: "", note: "", noteOpen: false, hi: 0, showBusy: false, carried: lastFirst, reply: null, replySet: false, nCal: null }));
        setSitting((k) => k + 1);
        showToast(`${lastFirst} logged.`, async () => {
          setToast(null);
          const gone = !!done.agentGoesOnUndo?.();
          await done.undo();
          setSitting((k) => Math.max(0, k - 1));
          setS(gone ? { ...before, agentId: null, via: null, reply: null, replySet: false, nCal: null, step: "who", dir: "back" } : { ...before, step: "check", dir: "back" });
        });
      });
    } else {
      stampThen(() => { setLogged({ ...done, n, first: lastFirst, preview: preview!, weeks: rp?.wk ?? null, before, reply: rp }); setPhase("yay"); });
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
      <button type="button" className="laq-lnk" data-qls="cancel" onClick={p.onClose} disabled={busy || stamp}>Cancel</button>
      <span className="laq-sp" />
      <button type="button" className="laq-lnk" data-qls="log-more" disabled={busy || stamp} onClick={() => void doLog(true)}>Log and start another</button>
      {/* the save is awaited before the stamp (a stamp is a claim that it landed), so while it is in flight the button says so */}
      <button type="button" className="laq-btn" data-qls="log" disabled={busy || stamp} aria-busy={busy || undefined} onClick={() => void doLog(false)}>{busy ? "Logging…" : <>Log query {ICON.arrow}</>}</button>
    </>
  );

  /* ↑ ↓ and ↵ over the big rows on Sent, Materials and How */
  useEffect(() => {
    if (s.step !== "when" && s.step !== "what" && s.step !== "how") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea")) return;
      if (!rootRef.current?.isConnected || !rootRef.current.offsetParent) return;
      const bs = [...(sbRef.current?.querySelectorAll<HTMLButtonElement>(".laq-big > button:not(.is-quiet)") ?? [])];
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
    nudge: s.replySet && rp && s.sent != null ? nudgeAnswer(rp, s.sent, nowMs) : null,
    check: null,
  };

  /* v2 — the headline (lib/queryActions/logStages `headline`): two lines, the same on every step, by where the writer is */
  const [hl1, hl2] = headline({ sitting, agentChosen: !!s.agentId, sentMs: s.sent, nowMs, notSent: s.notSent });
  /* D1 — ONE NAVY PIECE: the FlowHead and the track sit on one painted block (.laq-top), so there is no join between two
     navy boxes to show as a hairline at any zoom. The mentor is decorative (empty alt). */
  const top = (
    <div className="laq-top" data-laq="top">
      <FlowHead title={<>{hl1}<span className="is-c br" data-laq="head-2">{hl2}</span></>} titleKey={`${hl1}|${hl2}`}
        mark={<img className="flh-m" data-laq="mentor" src="/icon-192.png" alt="" width={48} height={48} />}
        onClose={p.onClose} data={{ "data-qc149f": "band" }} closeData={{ "data-qc149f": "close" }} />
      <Stepper s={s} values={values} onGo={(k) => go(k)} locked={s.notSent} />
    </div>
  );
  const backFoot = (hint: string | null) => (
    <>
      <button type="button" className="laq-lnk" data-qls={s.step === "who" ? "cancel" : "back"} onClick={() => (s.step === "who" ? p.onClose() : go(STAGES[Math.max(0, STAGES.indexOf(s.step) - 1)], "back"))}>{s.step === "who" ? "Cancel" : "Back"}</button>
      <span className="laq-sp" />
      {hint ? <span className="laq-hint">{hint}</span> : null}
    </>
  );

  /* v1.2 — THE DIMMED PAGE'S LEAVE CHECK, the action drawers' own: with answers it asks, without it closes. The host's
     scrim calls it through `leaveRef`; Escape is unchanged (the host closes). */
  const [leaveAsk, setLeaveAsk] = useState(false);
  const leave = () => { if (phase === "flow" && !s.notSent && touched.current) setLeaveAsk(true); else p.onClose(); };
  if (p.leaveRef) p.leaveRef.current = leave;
  /* v2 · Phase 7 — ESCAPE IS THE SAME LEAVE CHECK, on the one Escape stack (lib/escapeStack), at ESC_LEVEL.journey: above
     every host that mounts the journey (so none of them closes it first), below a docked card's peek. Order: an open paperclip (its own layer above the drawer's, so it never reaches here) → an in-place picker
     (the sent calendar, an open piece on the pieces screen) → the leave check (Esc there keeps the journey) → close.
     With nothing entered yet it just closes. */
  useEscapeLayer(true, () => {
    if (phase !== "flow") { p.onClose(); return; }
    if (leaveAsk) { setLeaveAsk(false); return; }
    if (s.step === "when" && s.earlier) { setS((o) => ({ ...o, earlier: false })); return; }
    if (s.step === "what" && (s.pOpen.letter || s.pOpen.syn || s.pOpen.sample)) { setS((o) => ({ ...o, pOpen: { letter: false, syn: false, sample: false } })); return; }
    leave();
  }, ESC_LEVEL.journey);
  const leaveFoot = (
    <>
      <span className="laq-lv" role="alertdialog" aria-label="Discard this query?"><b>Discard this?</b> Nothing has been saved yet.</span>
      <span className="laq-sp" />
      <button type="button" className="laq-lnk" data-qls="leave-keep" autoFocus onClick={() => setLeaveAsk(false)}>Keep going</button>
      <button type="button" className="laq-btn" data-qls="leave-discard" onClick={p.onClose}>Discard</button>
    </>
  );

  const body = s.notSent ? notSentBody() : s.adding ? addBody() : s.step === "who" ? whoBody() : s.step === "when" ? whenBody() : s.step === "what" ? whatBody() : s.step === "how" ? howBody()
    : s.step === "nudge" ? nudgeBody() : checkBody();
  /* materials fork v1 — the fork's Back is the stage's (to Sent); a branch's Back is the fork. The pieces screen's right
     side is the tip until Carry on can be pressed, in one slot of the button's height, so nothing moves when it swaps */
  const matBack = (hint: string) => (
    <>
      <button type="button" className="laq-lnk" data-qls="back" onClick={() => toMat("fork")}>Back</button>
      <span className="laq-sp" />
      <span className="laq-hint" data-qls="hint">{hint}</span>
    </>
  );
  const piecesFoot = (
    <>
      <button type="button" className="laq-lnk" data-qls="back" onClick={() => (hasPkgs ? toMat("fork") : go("when", "back"))}>Back</button>
      <span className="laq-sp" />
      <span className="laq-slot" data-qls="carry-slot">
        {anyPicked
          ? <button type="button" className="laq-btn" data-qls="pieces-continue" onClick={carryOn}>Carry on {ICON.arrow}</button>
          : <span className="laq-hint" data-qls="hint">Pick at least one to carry on</span>}
      </span>
    </>
  );
  const nudgeFoot = (
    <>
      <button type="button" className="laq-lnk" data-qls="back" onClick={() => go("how", "back")}>Back</button>
      <span className="laq-sp" />
      <button type="button" className="laq-btn" data-qls="nudge-continue" disabled={!rp || !replyReady(rp)}
        onClick={() => { if (rp) answer({ reply: rp, replySet: true }); }}>Continue {ICON.arrow}</button>
    </>
  );
  const foot = s.notSent ? notSentFoot : s.adding ? addFoot : s.step === "who" ? backFoot("↑ ↓ and ↵") : s.step === "what" && mat === "pcs" ? piecesFoot
    : s.step === "what" && mat === "pkg" ? matBack("Tap a package to carry on")
    : s.step === "nudge" ? nudgeFoot : s.step === "check" ? checkFoot : backFoot("Tap one to carry on");

  if (phase === "yay" && logged) {
    const L = logged;
    const line = L.reply && L.before.sent != null
      ? celebrationLine({ first: L.first, wk: L.weeks, sentMs: L.before.sent, nowMs, reply: L.reply })
      : "";
    /* v2 · Phase 7 — the header on the logged screen: "Logged. Off to {First}!" and the active count READ BACK from the
       Dashboard's own count (the host's live `activeNow`), never n+1 assumed; every step done, none a door */
    const passedL = L.before.sent != null && isPastReply(L.before.sent, L.weeks, nowMs);
    const [y1, y2] = headline({ sitting, agentChosen: true, sentMs: L.before.sent, nowMs, logged: { first: L.first, passed: passedL, active: p.activeNow ?? null } });
    const yTop = (
      <div className="laq-top" data-laq="top">
        <FlowHead title={<>{y1}<span className="is-c br" data-laq="head-2">{y2}</span></>} titleKey={`${y1}|${y2}`}
          mark={<img className="flh-m" data-laq="mentor" src="/icon-192.png" alt="" width={48} height={48} />}
          onClose={p.onClose} data={{ "data-qc149f": "band" }} closeData={{ "data-qc149f": "close" }} />
        <Stepper s={L.before} values={values} onGo={() => {}} locked allDone />
      </div>
    );
    const mile = MILESTONE[L.n] ?? null;
    return (
      <div ref={rootRef} className="laq" data-qc149f="log" data-qls="root" data-step="yay">
        <div className="laq-in">
          {yTop}
          <div className="laq-sb laq-yayb" data-qls="body">
          <div className="laq-yay" data-qls="yay">
            <IlloSlot name="celebration · query sent" width={170} height={96} />
            <TypedHead text={`Off to ${L.first}.`} reduce={reduce} />
            <p className="laq-yl" data-qls="yay-line">{line}</p>
            <span className="laq-cnt" data-qls="count">Query number <Odometer n={L.n} /> for {p.bookTitle}</span>
            {mile ? <span className="laq-ms" data-qls="milestone">{mile}</span> : null}
            <div className="laq-slipw">
              {card(L.preview, true, L.before.sent)}
            </div>
          </div>
          </div>
          <div className="laq-cf" data-qls="foot">
            <button type="button" className="laq-lnk" data-qls="open-card" onClick={() => L.openCard()}>Open {L.first}'s card</button>
            <span className="laq-sp" />
            <button type="button" className="laq-lnk" data-qls="undo" disabled={busy} onClick={async () => {
              setBusy(true);
              const gone = !!L.agentGoesOnUndo?.();
              try { await L.undo(); } finally { setBusy(false); }
              setLogged(null); setPhase("flow");
              setS(gone ? { ...L.before, agentId: null, via: null, reply: null, replySet: false, nCal: null, step: "who", dir: "back" } : { ...L.before, step: "check", dir: "back" });
            }}>Undo</button>
            <button type="button" className="laq-lnk" data-qls="done" onClick={p.onClose}>Done</button>
            <button type="button" className="laq-btn" data-qls="log-another" onClick={() => { setLogged(null); setPhase("flow"); setS({ ...freshState(nowMs), dir: "in" }); }}>Log another {ICON.arrow}</button>
          </div>
          {reduce ? null : <Confetti />}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="laq" data-qc149f="log" data-qls="root" data-step={s.step}>
      <div className={`laq-in${bump ? " is-bump" : ""}`}>
        {top}
        <div ref={sbRef} key={s.notSent ? "not-sent" : s.adding ? "adding" : s.step === "what" ? `what:${mat}` : s.step} className={`laq-sb${s.dir ? ` is-${s.dir}` : ""}`} data-qls="body">{body}</div>
        <div className={`laq-cf${leaveAsk ? " is-leave" : ""}`} data-qls="foot">{leaveAsk ? leaveFoot : foot}</div>
        <div className={`laq-toast${toast ? " is-on" : ""}`} data-qls="toast" role="status" aria-live="polite">
          {toast ? <>{toast.text}<button type="button" data-qls="toast-undo" onClick={toast.undo}>Undo</button></> : null}
        </div>
      </div>
    </div>
  );
};

