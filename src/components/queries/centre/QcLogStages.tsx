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
import type { SubmissionMethod } from "../../../types";
import { FlowHead, FLOW_WORDS } from "../../shared/FlowHead";
import {
  STAGES, STAGE_LABEL, STAGE_LINE, batchWhoLine, dayMon, sameDay, titleName, whoGroups, yesterday,
  type BookChoice, type Choice, type LogAnswers, type Pieces, type PlanContext, type StageAgent, type StageKey, type StagePackage,
} from "../../../lib/queryActions/logStages";
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

/** what a save hands back: the new query's id and count, how to undo it, and the door to its card */
export interface Logged { id: string; undo: () => Promise<void>; openCard: () => void }

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

/* ── the journey ──────────────────────────────────────────────────────────────────────────────────────────────── */

export const QcLogStages: React.FC<QcLogStagesProps> = (p) => {
  const { nowMs, agents } = p;
  const [s, setS] = useState<FlowState>(() => freshState(nowMs));
  const set = (patch: Partial<FlowState>) => setS((o) => ({ ...o, ...patch }));
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

  /* ── the stepper's values ── */
  const values: Record<StageKey, string | null> = {
    who: agent?.first ?? null,
    when: s.sent == null ? null : sameDay(s.sent, nowMs) ? "Today" : sameDay(s.sent, yesterday(nowMs)) ? "Yesterday" : dayMon(s.sent),
    what: null,
    how: null,
    check: null,
  };

  const line = s.step === "who" ? (s.carried ? batchWhoLine(s.carried) : FLOW_WORDS.log.line)
    : s.step === "check" ? null : STAGE_LINE[s.step];
  const backFoot = (hint: string | null) => (
    <>
      <button type="button" className="qls-lnk" data-qls={s.step === "who" ? "cancel" : "back"} onClick={() => (s.step === "who" ? p.onClose() : go(STAGES[Math.max(0, STAGES.indexOf(s.step) - 1)], "back"))}>{s.step === "who" ? "Cancel" : "Back"}</button>
      <span className="qls-sp" />
      {hint ? <span className="qls-hint">{hint}</span> : null}
    </>
  );

  const body = s.step === "who" ? whoBody() : <p className="qls-qs">This stage arrives in the next phase.</p>;
  const foot = s.step === "who" ? backFoot("↑ ↓ and ↵") : backFoot(null);

  return (
    <div className="qc149f qls qcv-legacy" data-qc149f="log" data-qls="root" data-step={s.step}>
      <div className="mk-lc-in qc149c-in qls-in">
        <FlowHead title={FLOW_WORDS.log.title} line={line} onClose={p.onClose} data={{ "data-qc149f": "band" }} closeData={{ "data-qc149f": "close" }} />
        <Stepper s={s} values={values} onGo={(k) => go(k)} />
        <div ref={sbRef} key={s.step} className={`qls-sb${s.dir ? ` is-${s.dir}` : ""}`} data-qls="body">{body}</div>
        <div className="qls-cf" data-qls="foot">{foot}</div>
      </div>
    </div>
  );
};

