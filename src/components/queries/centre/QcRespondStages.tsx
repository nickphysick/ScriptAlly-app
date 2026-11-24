/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 (design-refs/record-a-response-v2/record-a-response-v2.html + screens/) — THE RESPONSE JOURNEY, a
 * sibling of Log a query's (QcLogStages). One question a screen, in Log a query's own shell: the 540px slide-in, the navy
 * head with its track, the scrolling body, the footer, the discard bar and the toast. The classes ARE Log a query's
 * (`.laq-*`, qcLogStages.css); this journey adds only its own parts (`.rar` in qcRespondStages.css).
 *
 *   Who replied? → What did {First} say? → When did {First} reply? → the reply's own steps → Record → Recorded
 *
 * ⚠️ NOTHING HERE WRITES. The host's `onSave` composes the existing writers (lib/queryActions/respondStages
 *    `planOfResponse`); this component collects the answers and shows what they will make.
 * ⚠️ DATES: Today and Yesterday may be pills; every other date is the app's slider (WeekSlider), and the reply date's
 *    "An earlier date" is the journey's own calendar (no day before the query's last step, none in the future).
 * ⚠️ THE SAMPLE IS THE APP'S ONE SAMPLE CONTROL (SampleControl). No second picker.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { QueryStatus } from "../../../types";
import { FlowHead } from "../../shared/FlowHead";
import { MaterialIcon } from "../../shared/MaterialIcon";
import { StatusDot } from "../../StatusDot";
import { WeekSlider } from "../../forms/WeekSlider";
import { SampleControl } from "../../queryActions/controls";
import type { Book, Sample } from "../../../lib/queryActions/sample";
import { IlloSlot } from "../IlloSlot";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { QcCard154 } from "./QcCard154";
import { NoteArticle, NoteCompose } from "./QcNotes158";
import type { QcRow } from "../../../lib/qcSummary";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { calMonth, monthLong, addNote, editNote, deleteNote, notesToSave, type BookChoice, type Choice, type JourneyNote } from "../../../lib/queryActions/logStages";
import { materialIconKind } from "../../../lib/materialIcon";
import {
  ALL_KINDS, EXTRAS, KIND, STAGE_LABEL, addDaysMs, askedList, daysSince, dm, extrasAsked, headline, likelyKinds, plural, sampleWords, sod,
  recordedCopy, stagesOf, taskLine, toneOf, toneStatus, w3dm, wdm, wentList, whenWord, type RKind, type RStage, type RespAnswers, type RespCounts,
} from "../../../lib/queryActions/respondStages";
import { ICON, useReducedMotion } from "./QcLogStages";
import "./qcv158.css";
import "../../queryActions/queryDrawer.css";
import "../../../marketing/heroCard.css";
import "./qcv149card.css";
import "./qcLogStages.css";
import "./qcRespondStages.css";

/** the Archivist's head (design-refs/dashboard-v93/assets/tier-head-archivist.png) */
export const ARCHIVIST = "/images/archivist-head.png";

/** one query that could have a reply, as "Who replied?" lists it */
export interface RespQuery {
  id: string; name: string; first: string; agency: string; status: QueryStatus | string;
  /** when it reached the status it is at (the wait is counted from here) */
  sinceMs: number;
  group: "wait" | "you" | "closed";
}
/** what the journey needs to know about the query picked */
export interface RespCtx {
  book: Book;
  synopses: readonly Choice[];
  versions: readonly BookChoice[];
  /** the agent's stated reply time, weeks */
  weeks: number | null;
  /** the other open queries an offer can tell */
  othersN: number;
}
/** what a save hands back */
export interface RespSaved { undo: () => Promise<void>; openCard: () => void; counts: RespCounts | null }

export interface QcRespondStagesProps {
  nowMs: number;
  queries: readonly RespQuery[];
  /** a door that named a query: the journey opens at its second step, the Agent step done and not changeable */
  seedQueryId: string | null;
  /** a door's preselected answer (the To-do's "they asked for the partial") */
  seedKind?: RKind | null;
  ctxOf: (queryId: string) => RespCtx | null;
  /** the review's card and numbers, from the save's own plans */
  previewOf: (queryId: string, a: RespAnswers) => { row: QcRow; packageName: string | null; counts: RespCounts } | null;
  onSave: (queryId: string, a: RespAnswers, notes: string[]) => Promise<RespSaved | null>;
  onClose: () => void;
  leaveRef?: React.MutableRefObject<(() => void) | null>;
}

interface RState {
  step: RStage; dir: "in" | "back" | ""; find: string; hi: number;
  qid: string | null; kind: RKind | null; more: boolean;
  when: number | null; earlier: boolean; calAt: number;
  ask: RespAnswers["ask"]; extras: string[]; otherTx: string; samp: Sample; askOk: boolean;
  sub: "ask" | "went"; went: { main: boolean; syn: boolean; x: string[] } | null; wsamp: Sample | null;
  synId: string | null; verId: string | null; wentOk: boolean; wOpen: { main: boolean; syn: boolean };
  sentQ: "yes" | "no" | null; sentAt: "today" | "yesterday"; byDays: number; byNone: boolean; wk: number; wkNone: boolean; nudge: boolean; sentOk: boolean;
  words: string; wordsOk: boolean;
  rrNext: RespAnswers["rrNext"]; rrWk: number; rrNone: boolean; rrOk: boolean;
  ofDays: number; ofNone: boolean; ofOk: boolean; others: "task" | "no" | null;
  notes: JourneyNote[]; noteOpen: boolean; draft: string; noteEdit: { id: string; text: string } | null;
}
const fresh = (nowMs: number, qid: string | null): RState => ({
  step: qid ? "reply" : "who", dir: "", find: "", hi: 0, qid, kind: null, more: false,
  when: null, earlier: false, calAt: new Date(nowMs).getFullYear() * 12 + new Date(nowMs).getMonth(),
  ask: { sample: true, full: true, syn: false, other: false }, extras: [], otherTx: "", samp: { unit: "pages", amt: 50, from: 1, sect: false, fu: null }, askOk: false,
  sub: "ask", went: null, wsamp: null, synId: null, verId: null, wentOk: false, wOpen: { main: true, syn: true },
  sentQ: null, sentAt: "today", byDays: 3, byNone: false, wk: 8, wkNone: false, nudge: true, sentOk: false,
  words: "", wordsOk: false, rrNext: null, rrWk: 4, rrNone: false, rrOk: false, ofDays: 14, ofNone: false, ofOk: false, others: null,
  notes: [], noteOpen: false, draft: "", noteEdit: null,
});

/** the step answered? (the design's `done`) */
function isDone(s: RState, k: RStage): boolean {
  switch (k) {
    case "who": return !!s.qid;
    case "reply": return !!s.kind;
    case "when": return s.when != null;
    case "asked": return s.askOk;
    case "sent": return s.sentOk && (s.sentQ === "no" || s.wentOk);
    case "words": return s.wordsOk;
    case "next": return s.rrOk;
    case "by": return s.ofOk;
    case "others": return !!s.others;
    default: return false;
  }
}
/** the first step not yet answered (the review when every one is) */
const nextOf = (s: RState): RStage => { const sg = stagesOf(s.kind); for (let i = 0; i < sg.length - 1; i++) if (!isDone(s, sg[i])) return sg[i]; return "check"; };

const noop = () => {};

export const QcRespondStages: React.FC<QcRespondStagesProps> = (p) => {
  const { nowMs } = p;
  const today = sod(nowMs);
  const yday = addDaysMs(nowMs, -1);
  const fixed = !!p.seedQueryId;
  const [s, setS] = useState<RState>(() => {
    const st = fresh(nowMs, p.seedQueryId);
    if (p.seedKind) return { ...st, kind: p.seedKind, step: "when" };
    return st;
  });
  const touched = useRef(false);
  const set = (patch: Partial<RState>) => { touched.current = true; setS((o) => ({ ...o, ...patch })); };
  /** answer and move to the first step still unanswered */
  const answer = (patch: Partial<RState> | ((o: RState) => Partial<RState>)) => {
    touched.current = true;
    setS((o) => { const n = { ...o, ...(typeof patch === "function" ? patch(o) : patch) }; return { ...n, step: nextOf(n), sub: "ask", dir: "in", hi: 0 }; });
    setLeaveAsk(false);
  };
  const go = (k: RStage) => { setS((o) => ({ ...o, step: k, sub: "ask", dir: "back", hi: 0 })); setLeaveAsk(false); };

  const q = p.queries.find((x) => x.id === s.qid) ?? null;
  const ctx = useMemo(() => (s.qid ? p.ctxOf(s.qid) : null), [s.qid]); // eslint-disable-line react-hooks/exhaustive-deps
  const first = q?.first ?? "";
  const [phase, setPhase] = useState<"flow" | "done">("flow");
  const [saved, setSaved] = useState<(RespSaved & { a: RespAnswers; before: RState; first: string }) | null>(null);
  const [sitting, setSitting] = useState(0);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const sbRef = useRef<HTMLDivElement>(null);
  const findRef = useRef<HTMLInputElement>(null);

  /* the agent's own reply time is where the slider starts, once a query is picked */
  useEffect(() => { if (ctx?.weeks && ctx.weeks >= 1 && ctx.weeks <= 26) setS((o) => (o.wk === 8 && !touched.current ? { ...o, wk: ctx.weeks! } : o)); }, [ctx]);

  /* ── the answers, as the model reads them ── */
  const sentMs = s.sentAt === "yesterday" ? yday : today;
  const expectBy = s.wkNone ? null : addDaysMs(sentMs, s.wk * 7);
  const synName = ctx?.synopses.find((x) => x.id === s.synId)?.name ?? null;
  const verName = ctx?.versions.find((x) => x.id === s.verId)?.name ?? null;
  const answers = (): RespAnswers | null => (s.kind && s.when != null ? {
    kind: s.kind, when: s.when, ask: s.ask, extras: s.extras, otherTx: s.otherTx, samp: s.samp,
    sentQ: s.sentQ, sentMs, went: s.went, wsamp: s.wsamp, synName, verId: s.verId,
    sendBy: s.byNone ? null : addDaysMs(today, s.byDays), expectBy, nudgeOn: s.nudge && expectBy != null ? expectBy : null,
    words: s.words.trim(), rrNext: s.rrNext, rrBy: s.rrNone ? null : addDaysMs(today, s.rrWk * 7),
    ofBy: s.ofNone ? null : addDaysMs(s.when, s.ofDays), others: s.others,
  } : null);

  /* ── the colour: the query's status once picked, then where the reply moves it (lib/stageColours) ── */
  const tone = toneOf(toneStatus(q?.status ?? null, s.kind, s.rrNext));
  const toneStyle = tone ? ({ "--sc": tone.disc, "--st2": tone.wash, "--sm": tone.mark } as React.CSSProperties) : undefined;

  /* ── Who replied? ── */
  const match = (x: RespQuery) => { const t = s.find.trim().toLowerCase(); return !t || `${x.name} ${x.agency}`.toLowerCase().includes(t); };
  const grp = (g: RespQuery["group"]) => p.queries.filter((x) => x.group === g && !doneIds.includes(x.id) && match(x)).sort((a, b) => a.sinceMs - b.sinceMs);
  const wait = grp("wait"), you = grp("you"), closed = s.find.trim() ? grp("closed") : [];
  const pickable = [...wait, ...you, ...closed];
  const hi = Math.min(s.hi, Math.max(0, pickable.length - 1));
  const pick = (x: RespQuery) => answer((o) => (o.qid === x.id ? { find: "" } : { ...fresh(nowMs, x.id), find: "" }));
  useEffect(() => { if (s.step === "who" && phase === "flow") findRef.current?.focus({ preventScroll: true }); }, [s.step, phase]);
  useLayoutEffect(() => { if (s.step === "who") sbRef.current?.querySelector<HTMLElement>(".laq-big > button.is-hi")?.scrollIntoView({ block: "nearest" }); }, [hi, s.step]);
  const disc = (status: QueryStatus | string, closedRow = false) => (
    /* the disc is the status's own flat colour: the stripes are the two cards' bands only (lib/stageColours) */
    <span className="laq-g is-st" style={{ "--c": closedRow ? toneOf(QueryStatus.REJECTED)!.disc : toneOf(status)!.disc } as React.CSSProperties} aria-hidden="true">
      <StatusDot status={status} overrideSize={21} decorative />
    </span>
  );
  const row = (x: RespQuery, k: number) => {
    const n = daysSince(x.sinceMs, nowMs);
    return (
      <button key={x.id} type="button" className={`${k === hi ? "is-hi" : ""}${s.qid === x.id ? " is-on" : ""}`} data-rar="who-row" data-id={x.id} data-group={x.group} data-status={x.status} onClick={() => pick(x)}>
        {disc(x.status, x.group === "closed")}
        <span className="laq-tx"><b>{x.name}</b><span>{x.agency ? `${x.agency} · ` : ""}{STAGE_NAME[x.status as QueryStatus] ?? x.status} {dm(x.sinceMs)}</span></span>
        {x.group === "closed" ? null : <span className="laq-tag is-m" data-rar="wait">{plural(n, "day")}</span>}
        <span className="laq-ar" aria-hidden="true">{ICON.arrow}</span>
      </button>
    );
  };
  const whoBody = () => {
    let k = 0;
    const group = (key: string, label: string, list: RespQuery[]) => (list.length ? <>
      <div className="laq-grp" data-rar="group" data-k={key}>{label} <span>{list.length}</span></div>
      <div className="laq-big">{list.map((x) => row(x, k++))}</div>
    </> : null);
    const t = s.find.trim();
    return (
      <>
        <h2 className="laq-qh">Who replied?</h2>
        <label className="laq-srch">{ICON.search}
          <input ref={findRef} value={s.find} data-rar="find" placeholder="Find the agent" aria-label="Find the agent" autoComplete="off"
            onChange={(e) => set({ find: e.target.value, hi: 0 })}
            onKeyDown={(e) => {
              const n = pickable.length;
              if (e.key === "ArrowDown" && n) { e.preventDefault(); set({ hi: (hi + 1) % n }); }
              else if (e.key === "ArrowUp" && n) { e.preventDefault(); set({ hi: (hi - 1 + n) % n }); }
              else if (e.key === "Enter" && n) { e.preventDefault(); pick(pickable[hi]); }
            }} />
        </label>
        {group("wait", "Waiting to hear back", wait)}
        {group("you", "Already with you", you)}
        {group("closed", "Closed · a reply reopens it", closed)}
        {t && !pickable.length ? <div className="laq-none" data-rar="none">No query with “{t}”.</div> : null}
        {!t ? <p className="laq-ask rar-hint" data-rar="who-hint">Longest wait first. Search to find a closed query.</p> : null}
      </>
    );
  };

  /* ── What did {First} say? ── */
  const kindRow = (k: RKind) => (
    <button key={k} type="button" className={s.kind === k ? "is-on" : ""} aria-pressed={s.kind === k ? true : undefined} data-rar="kind" data-k={k}
      onClick={() => answer((o) => (o.kind === k ? {} : { ...fresh(nowMs, o.qid), when: o.when, calAt: o.calAt, kind: k, notes: o.notes, wk: o.wk }))}>
      {disc(KIND[k].to)}
      <span className="laq-tx"><b>{KIND[k].t}</b><span>{KIND[k].s}</span></span>
      <span className="laq-ar" aria-hidden="true">{ICON.arrow}</span>
    </button>
  );
  const replyBody = () => {
    if (!q) return null;
    const likely = likelyKinds(q.status);
    const rest = ALL_KINDS.filter((k) => !likely.includes(k));
    const showRest = s.more || (!!s.kind && rest.includes(s.kind));
    const n = daysSince(q.sinceMs, nowMs);
    return (
      <>
        <h2 className="laq-qh">What did {first} say?</h2>
        <p className="laq-qs" data-rar="reply-sub">{STAGE_NAME[q.status as QueryStatus] ?? q.status} since {dm(q.sinceMs)}, {plural(n, "day")} ago.</p>
        <div className="laq-big" data-rar="kinds">{likely.map(kindRow)}</div>
        {rest.length ? (showRest
          ? <><div className="laq-grp rar-rest" data-rar="group" data-k="rest">Another kind of reply</div><div className="laq-big" data-rar="kinds-rest">{rest.map(kindRow)}</div></>
          : <p className="laq-ask rar-more"><button type="button" className="laq-lk" data-rar="more" onClick={() => setS((o) => ({ ...o, more: true, dir: "" }))}>Another kind of reply</button></p>) : null}
      </>
    );
  };

  /* ── When did {First} reply? ── */
  const calRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (s.earlier && calRef.current && sbRef.current) sbRef.current.scrollTop = sbRef.current.scrollHeight; }, [s.earlier]);
  const minDay = q ? sod(q.sinceMs) : 0;
  const whenBody = () => {
    const y = Math.floor(s.calAt / 12), m = s.calAt % 12;
    const cal = calMonth(y, m, nowMs);
    const minAt = new Date(minDay).getFullYear() * 12 + new Date(minDay).getMonth();
    const early = s.when != null && s.when !== today && s.when !== yday;
    const big = (k: string, title: string, sub: string, on: boolean, click: () => void, arrow = true) => (
      <button type="button" className={on ? "is-on" : ""} aria-pressed={on} data-rar="when-opt" data-k={k} onClick={click}>
        <span className="laq-g" aria-hidden="true">{ICON.cal}</span>
        <span className="laq-tx"><b>{title}</b><span>{sub}</span></span>
        {arrow ? <span className="laq-ar" aria-hidden="true">{ICON.arrow}</span> : null}
      </button>
    );
    return (
      <>
        <h2 className="laq-qh">When did {first} reply?</h2>
        <p className="laq-qs">The date on their email, not the day you read it.</p>
        <div className="laq-big" data-rar="when">
          {big("today", "Today", wdm(today), s.when === today, () => answer({ when: today, earlier: false }))}
          {yday >= minDay ? big("yesterday", "Yesterday", wdm(yday), s.when === yday, () => answer({ when: yday, earlier: false })) : null}
          {big("earlier", "An earlier date", early ? `Chosen: ${dm(s.when!)}` : "Pick it from the calendar", s.earlier, () => setS((o) => ({ ...o, earlier: !o.earlier, dir: "" })), false)}
        </div>
        {s.earlier ? (
          <div className="laq-cal" data-rar="calendar" ref={calRef}>
            <div className="laq-calh">
              <button type="button" aria-label="Previous month" data-rar="cal-prev" disabled={s.calAt <= minAt} onClick={() => setS((o) => ({ ...o, calAt: o.calAt - 1, dir: "" }))}>{ICON.l}</button>
              <b data-rar="cal-month">{monthLong(y, m)} {y}</b>
              <button type="button" aria-label="Next month" data-rar="cal-next" disabled={!cal.canNext} onClick={() => setS((o) => ({ ...o, calAt: o.calAt + 1, dir: "" }))}>{ICON.r}</button>
            </div>
            <div className="laq-calg">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} aria-hidden="true">{d}</span>)}
              {Array.from({ length: cal.lead }, (_, i) => <i key={`b${i}`} />)}
              {cal.days.map((d) => (
                <button key={d.ms} type="button" data-rar="cal-day" data-day={d.day} disabled={d.future || d.ms < minDay} aria-label={wdm(d.ms)}
                  className={`${d.today ? "is-today" : ""}${s.when === d.ms ? " is-on" : ""}`} onClick={() => answer({ when: d.ms })}>{d.day}</button>
              ))}
            </div>
          </div>
        ) : null}
      </>
    );
  };

  /* ── the tick tiles that open in place (Log a query's pieces screen) ── */
  const tile = (key: string, on: boolean, title: React.ReactNode, sub: string | null, extra: React.ReactNode | null, toggle: () => void, open = true) => (
    <div className={`laq-gt${on ? " is-on" : ""}`} data-rar="tile" data-k={key} data-on={on ? "1" : "0"}>
      <button type="button" role="checkbox" aria-checked={on} aria-expanded={extra ? on && open : undefined} onClick={toggle}>
        <span className="laq-ck" aria-hidden="true">{on ? "✓" : ""}</span>
        <span className="laq-tx"><b>{title}</b>{sub ? <span data-rar="tile-sub">{sub}</span> : null}</span>
      </button>
      {on && open && extra ? <div className="laq-gs" data-rar="tile-open">{extra}</div> : null}
    </div>
  );
  const sampleCtl = (smp: Sample, onChange: (x: Sample) => void) => ctx ? (
    <div className="laq-qsamp" data-rar="sample-control"><SampleControl name="rar" sample={smp} book={ctx.book} onChange={onChange} /></div>
  ) : null;
  const opts = (k: string, list: readonly { id: string; name: string }[], cur: string | null, pickIt: (id: string) => void) => (
    <div className="laq-opts" role="radiogroup" aria-label={k === "ver" ? "Which version" : "Which synopsis"}>
      {list.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={cur === o.id} className={`laq-opt${cur === o.id ? " is-on" : ""}`} data-rar="opt" data-k={k} data-id={o.id} onClick={() => pickIt(o.id)}>
          <span className="laq-rdo" aria-hidden="true" /><span className="laq-on">{o.name}</span>
        </button>
      ))}
    </div>
  );

  /* ── What did {First} ask for? ── */
  const extraBlock = (
    <>
      <div className="rar-xc" role="group" aria-label="Things agents often ask for">
        {EXTRAS.map((x) => {
          const on = s.extras.includes(x);
          return <button key={x} type="button" className={`laq-chip${on ? " is-on" : ""}`} aria-pressed={on} data-rar="extra" data-k={x}
            onClick={() => set({ extras: on ? s.extras.filter((y) => y !== x) : [...s.extras, x] })}>{x}</button>;
        })}
      </div>
      <input className="rar-in" data-rar="other-tx" value={s.otherTx} placeholder="Or type what they asked for" aria-label="What else they asked for" autoComplete="off"
        onChange={(e) => set({ otherTx: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter" && askedNow().length) { e.preventDefault(); answer({ askOk: true, went: null, wentOk: false }); } }} />
    </>
  );
  const askedNow = () => (s.kind ? askedList({ kind: s.kind, ask: s.ask, extras: s.extras, otherTx: s.otherTx, samp: s.samp }) : []);
  const askedBody = () => {
    const a = s.ask;
    const tog = (k: keyof RState["ask"]) => () => set({ ask: { ...a, [k]: !a[k] } });
    return (
      <>
        <h2 className="laq-qh">What did {first} ask for?</h2>
        <p className="laq-qs">It stays on {first}’s query, so you know exactly what to send.</p>
        <div className="laq-gen" data-rar="asked">
          {s.kind === "pr"
            ? tile("sample", a.sample, "A sample", a.sample ? sampleWords(s.samp) : "Pages, chapters or words", sampleCtl(s.samp, (x) => set({ samp: x })), tog("sample"))
            : tile("full", a.full, "The full manuscript", null, null, tog("full"))}
          {tile("syn", a.syn, "Synopsis", null, null, tog("syn"))}
          {tile("other", a.other, "Something else", null, extraBlock, tog("other"))}
        </div>
      </>
    );
  };

  /* ── Have you sent it yet? ── */
  const noun = s.kind === "fr" ? "your full" : "your partial";
  const slider = (k: "wk" | "byDays" | "rrWk" | "ofDays") => {
    const def = {
      wk: { label: "Reply time", min: 1, max: 26, none: "wkNone" as const, noneLabel: "Unknown", ends: ["1 week", "26 weeks"] as const, read: (n: number) => plural(n, "week"),
        note: () => (expectBy == null ? "No reply date, so there’s nothing to remind you about." : <>Reply expected by <b>{w3dm(expectBy)}</b>.</>) },
      byDays: { label: "Send it by", min: 0, max: 30, none: "byNone" as const, noneLabel: "No date", ends: ["Today", "30 days"] as const, read: (n: number) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`),
        note: () => (s.byNone ? "It goes on your to-do list with no date." : <>On your to-do list for <b>{w3dm(addDaysMs(today, s.byDays))}</b>.</>) },
      rrWk: { label: "Resubmit in", min: 1, max: 26, none: "rrNone" as const, noneLabel: "No date", ends: ["1 week", "26 weeks"] as const, read: (n: number) => plural(n, "week"),
        note: () => (s.rrNone ? "It goes on your to-do list with no date." : <>On your to-do list for <b>{w3dm(addDaysMs(today, s.rrWk * 7))}</b>.</>) },
      ofDays: { label: "Answer needed in", min: 1, max: 30, none: "ofNone" as const, noneLabel: "They didn’t say", ends: ["1 day", "30 days"] as const, read: (n: number) => plural(n, "day"),
        note: () => (s.ofNone || s.when == null ? "Answering goes on your to-do list with no date." : <>That’s <b>{w3dm(addDaysMs(s.when, s.ofDays))}</b>. Answering goes on your to-do list for that day.</>) },
    }[k];
    const off = s[def.none];
    return (
      <div className="laq-wkb" data-rar="slider" data-k={k}>
        <WeekSlider label={def.label} value={off ? null : s[k]} min={def.min} max={def.max} readout={def.read} unknownLabel={def.noneLabel} ends={def.ends}
          onChange={(v) => set({ [k]: v, [def.none]: false } as Partial<RState>)} onUnknown={() => set({ [def.none]: !off } as Partial<RState>)} />
        <p className="laq-wkx" data-rar="slider-note">{def.note()}</p>
      </div>
    );
  };
  const opt = (grp: "sentQ" | "rrNext", k: string, title: string, sub: string, extra: React.ReactNode | null) => {
    const on = s[grp] === k;
    return (
      <div className={`laq-nopt${on ? " is-on" : ""}`} data-rar="opt-row" data-g={grp} data-k={k} data-on={on ? "1" : "0"}>
        <button type="button" role="radio" aria-checked={on} onClick={() => set({ [grp]: k } as Partial<RState>)}>
          <span className="laq-rd" aria-hidden="true" /><span className="laq-tx"><b>{title}</b><span>{sub}</span></span>
        </button>
        {on && extra ? extra : null}
      </div>
    );
  };
  const nudgeRow = expectBy == null ? null : (
    <button type="button" className={`rar-chk${s.nudge ? " is-on" : ""}`} role="checkbox" aria-checked={s.nudge} data-rar="nudge" onClick={() => set({ nudge: !s.nudge })}>
      <span className="laq-ck" aria-hidden="true">{s.nudge ? "✓" : ""}</span><span>Remind me to nudge on {w3dm(expectBy)}</span>
    </button>
  );
  const sentBody = () => (
    <>
      <h2 className="laq-qh">Have you sent {noun} yet?</h2>
      <p className="laq-qs">{askedNow().join(", ")}.</p>
      <div className="laq-nopts" role="radiogroup" aria-label="Have you sent it yet?" data-rar="sent">
        {opt("sentQ", "yes", "Yes, it’s gone", "Next, tell us exactly what went.", <>
          <span className="rar-cl">When did it go?</span>
          <div className="laq-nch rar-nch" role="radiogroup" aria-label="When did it go?">
            {(["today", "yesterday"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={s.sentAt === k} className={`laq-chip${s.sentAt === k ? " is-on" : ""}`} data-rar="sent-at" data-k={k} onClick={() => set({ sentAt: k })}>{k === "today" ? "Today" : "Yesterday"}</button>
            ))}
          </div>
          <div className="rar-sl">{slider("wk")}{nudgeRow}</div>
        </>)}
        {opt("sentQ", "no", "Not yet", "Sending it goes on your to-do list.", <div className="rar-sl">{slider("byDays")}</div>)}
      </div>
    </>
  );
  /* "it's gone": start from exactly what was asked for */
  const initWent = (o: RState): Partial<RState> => ({
    went: { main: true, syn: o.ask.syn, x: o.kind ? extrasAsked({ ask: o.ask, extras: o.extras, otherTx: o.otherTx }) : [] },
    wsamp: { ...o.samp }, synId: o.synId ?? ctx?.synopses[0]?.id ?? null, verId: o.verId ?? ctx?.versions.find((v) => v.current)?.id ?? ctx?.versions[0]?.id ?? null,
  });
  const wentBody = () => {
    const w = s.went;
    if (!w) return null;
    const full = s.kind === "fr";
    const ver = ctx?.versions.length ? <>
      <div className="laq-gh laq-verh"><b>Which version is it from?</b></div>
      {opts("ver", ctx.versions, s.verId, (id) => set({ verId: id }))}
    </> : null;
    const mainSub = w.main ? (full ? verName : `${s.wsamp ? sampleWords(s.wsamp) : ""}${verName ? ` · ${verName}` : ""}`) : (full ? null : "Pages, chapters or words");
    const items = askedNow();
    return (
      <>
        <h2 className="laq-qh">What did you send {first}?</h2>
        <div className="laq-asks" data-rar="asked-card">
          <div className="laq-ah"><b>What {first} asked for</b><span>From this reply</span></div>
          <ul>{items.map((t) => <li key={t}><span className="laq-mk" aria-hidden="true" /><b>{t}</b></li>)}</ul>
          <p className="laq-af"><button type="button" className="laq-btn is-xs" data-rar="went-ask" onClick={() => answer((o) => ({ ...initWent(o), wentOk: true, sentOk: true }))}>I sent exactly that {ICON.arrow}</button></p>
        </div>
        <div className="laq-gen" data-rar="went">
          {full
            ? tile("main", w.main, "The full manuscript", mainSub, ver, () => set({ went: { ...w, main: !w.main } }))
            : tile("main", w.main, "A sample", mainSub, <>{s.wsamp ? sampleCtl(s.wsamp, (x) => set({ wsamp: x })) : null}{ver}</>, () => set({ went: { ...w, main: !w.main } }))}
          {tile("syn", w.syn, "Synopsis", w.syn ? synName : null, ctx?.synopses.length ? opts("syn", ctx.synopses, s.synId, (id) => set({ synId: id })) : null, () => set({ went: { ...w, syn: !w.syn } }))}
          {extrasAsked({ ask: s.ask, extras: s.extras, otherTx: s.otherTx }).map((x) => tile(`x:${x}`, w.x.includes(x), x, null, null, () => set({ went: { ...w, x: w.x.includes(x) ? w.x.filter((y) => y !== x) : [...w.x, x] } })))}
        </div>
      </>
    );
  };

  /* ── their words, the revision, the offer ── */
  const wordsRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (s.step === "words") wordsRef.current?.focus({ preventScroll: true }); }, [s.step]);
  const wordsBody = () => (
    <>
      <h2 className="laq-qh">{s.kind === "rr" ? `What did ${first} ask you to change?` : `Did ${first} say anything worth keeping?`}</h2>
      <p className="laq-qs">{s.kind === "rr" ? "Paste or type their notes. They stay on the query while you revise." : "Paste or type their words. They go with this query on your Responses page."}</p>
      <textarea ref={wordsRef} className="rar-ta" data-rar="words" value={s.words} placeholder="Their words, as they wrote them" aria-label="Their words"
        onChange={(e) => set({ words: e.target.value })}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && s.words.trim()) { e.preventDefault(); answer({ wordsOk: true }); } }} />
    </>
  );
  const nextBody = () => (
    <>
      <h2 className="laq-qh">Will you revise it?</h2>
      <p className="laq-qs">You can change this later on {first}’s card.</p>
      <div className="laq-nopts" role="radiogroup" aria-label="Will you revise it?" data-rar="next">
        {opt("rrNext", "yes", "Yes, I’ll revise", "Resubmitting goes on your to-do list.", <div className="rar-sl">{slider("rrWk")}</div>)}
        {opt("rrNext", "unsure", "Not sure yet", "The query stays open, with you. Nothing goes on your to-do list.", null)}
        {opt("rrNext", "close", "No, close the query", "It’s marked as closed by you.", null)}
      </div>
    </>
  );
  const byBody = () => (
    <>
      <h2 className="laq-qh">When does {first} need your answer?</h2>
      <p className="laq-qs">Counted from the day they replied, {s.when != null ? whenWord(s.when, nowMs).toLowerCase() : ""}.</p>
      {slider("ofDays")}
    </>
  );
  const othersBody = () => {
    const n = ctx?.othersN ?? 0;
    const big = (k: "task" | "no", glyph: React.ReactNode, title: string, sub: string) => (
      <button type="button" className={s.others === k ? "is-on" : ""} aria-pressed={s.others === k} data-rar="others" data-k={k} onClick={() => answer({ others: k })}>
        <span className="laq-g" aria-hidden="true">{glyph}</span><span className="laq-tx"><b>{title}</b><span>{sub}</span></span><span className="laq-ar" aria-hidden="true">{ICON.arrow}</span>
      </button>
    );
    return (
      <>
        <h2 className="laq-qh">Tell the other agents?</h2>
        <p className="laq-qs">{n} of your queries {n === 1 ? "is" : "are"} still with other agents.</p>
        <div className="laq-big">
          {big("task", TASK, "Put it on my to-do list", `One task, with all ${plural(n, "agent")} listed.`)}
          {big("no", NO, "Not now", "Nothing goes on your to-do list.")}
        </div>
      </>
    );
  };

  /* ── the review ── */
  const a = answers();
  const pv = useMemo(() => (a && s.qid && (s.step === "check" || phase === "done") ? p.previewOf(s.qid, a) : null), [s, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const [stamp, setStamp] = useState(false);
  const card = (row: QcRow, pkg: string | null, stampOn: boolean, stampMs: number) => (
    <div className={`laq-pv laq-pvw qc151 qc153 is-wide${phase === "done" ? " is-logged" : ""}${stampOn ? " has-stamp" : ""}`} data-rar="preview">
      <div className="laq-pvc"><QcCard154 row={row} nowMs={nowMs} selected={false} packageName={pkg} act={null} onOpen={noop} onAct={noop} preview /></div>
      {stampOn ? <span className={`laq-stamp${reduce ? "" : " is-thump"}`} data-rar="stamp" aria-hidden="true"><span>Recorded</span><small>{dm(stampMs).toUpperCase()}</small></span> : null}
    </div>
  );
  const tiles = (list: readonly string[]) => (
    <div className={`rvw is-${Math.min(3, Math.max(1, list.length))}`} data-rar="tiles" role="list">
      {list.map((t, i) => {
        const k = materialIconKind(t);
        /* the app's own rule (lib/materialIcon): the full manuscript and free text have no icon, and keep their tile */
        return <div key={i} className="rvw-t" role="listitem" data-rar="tile-r" data-kind={k ?? ""}>{k ? <span className="rvw-i" aria-hidden="true"><MaterialIcon kind={k} size={24} /></span> : null}<b>{t}</b></div>;
      })}
    </div>
  );
  const todo = (t: [string, string], key: string) => (
    <div key={key} className="laq-todo rar-todo" data-rar="task"><i aria-hidden="true" /><span><b>{t[0]}</b></span><span className="rar-when"><em>to-do</em>{t[1]}</span></div>
  );
  const numbers = (c: RespCounts) => {
    const cell = (k: string, n: number, d: number, label: string) => (
      <div className="rvb-c" data-rar="count" data-k={k} data-d={d}>
        <span className="rvb-n">{n}<i className={d < 0 ? "is-dn" : d === 0 ? "is-nil" : ""}>{d < 0 ? "−1" : "+1"}</i></span><span className="rvb-l">{label}</span>
      </div>
    );
    return (
      <div className="rvb is-big" role="group" aria-label="What recording this does" data-rar="counts">
        {cell(c.lead.k, c.lead.n, c.lead.d, c.lead.label)}
        {cell("replies", c.replies.n, c.replies.d, "replies in")}
      </div>
    );
  };
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (s.noteOpen) { noteRef.current?.focus({ preventScroll: true }); noteRef.current?.closest(".nx-nc")?.scrollIntoView({ block: "nearest" }); } }, [s.noteOpen]);
  const addTheNote = () => { if (!s.draft.trim()) return; setS((o) => ({ ...o, notes: addNote(o.notes, o.draft, Date.now()), draft: "", noteOpen: false })); };
  const notesBlock = () => (
    <div className="qc152 laq-notes" data-rar="notes">
      {s.notes.length ? <>
        <div className="rvw-h"><b>Notes</b></div>
        <div className="nx-nl">
          {s.notes.map((n) => (
            <NoteArticle key={n.id} n={{ id: n.id, text: n.text, ms: n.ms, pinned: false }} nowMs={nowMs}
              editing={s.noteEdit && s.noteEdit.id === n.id ? s.noteEdit.text : null}
              onEditChange={(text) => set({ noteEdit: { id: n.id, text } })}
              onEditCancel={() => set({ noteEdit: null })}
              onEditSave={() => setS((o) => (o.noteEdit && o.noteEdit.text.trim() ? { ...o, notes: editNote(o.notes, o.noteEdit.id, o.noteEdit.text), noteEdit: null } : o))}
              onEdit={() => set({ noteEdit: { id: n.id, text: n.text } })}
              onDelete={() => setS((o) => ({ ...o, notes: deleteNote(o.notes, n.id), noteEdit: o.noteEdit?.id === n.id ? null : o.noteEdit }))} />
          ))}
        </div>
      </> : null}
      {s.noteOpen
        ? <NoteCompose value={s.draft} onChange={(t) => set({ draft: t })} onAdd={addTheNote} fieldRef={noteRef} />
        : <p className="rvw-n"><button type="button" className="laq-lk" data-rar="add-note" onClick={() => set({ noteOpen: true })}>{s.notes.length ? "Add another note" : "Add a note"}</button></p>}
    </div>
  );
  const isReq = s.kind === "pr" || s.kind === "fr";
  const checkBody = () => {
    if (!a || !pv) return null;
    const t = taskLine(a, first);
    const went = isReq && s.sentQ === "yes";
    return (
      <>
        <h2 className="laq-qh">Ready to record {first}’s reply?</h2>
        <p className="laq-qs laq-rvs">This is how {first}’s card will look on your Queries page.</p>
        {card(pv.row, pv.packageName, stamp, s.when ?? nowMs)}
        {isReq ? <>
          <div className="rvw-h" data-rar="tiles-h"><b>{went ? "What went" : `What ${first} asked for`}</b>{went ? <span>sent {whenWord(sentMs, nowMs).toLowerCase()}{s.went?.main && verName ? `, from ${verName}` : ""}</span> : null}</div>
          {tiles(went ? wentList(a) : askedList(a))}
        </> : null}
        {a.words ? <><div className="rvw-h"><b>In {first}’s words</b></div><p className="rar-q" data-rar="quote">{a.words}</p></> : null}
        {t ? todo(t, "t") : null}
        {s.kind === "of" && s.others === "task" ? todo([`Tell the other ${plural(ctx?.othersN ?? 0, "agent")} about the offer`, "Today"], "o") : null}
        {notesBlock()}
        {numbers(pv.counts)}
      </>
    );
  };

  /* ── recording ── */
  const [busy, setBusy] = useState(false);
  const [bump, setBump] = useState(false);
  const [toast, setToast] = useState<{ text: string; undo: () => void } | null>(null);
  const toastTimer = useRef<number | null>(null);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);
  const stampThen = (then: () => void) => {
    if (reduce) { then(); return; }
    setStamp(true); setBump(true);
    window.setTimeout(() => { setStamp(false); setBump(false); then(); }, 650);
  };
  const record = async (more: boolean) => {
    const ans = answers();
    if (!ans || !s.qid || busy) return;
    setBusy(true);
    const notes = notesToSave({ notes: s.notes, edit: s.noteEdit, draft: s.draft });
    const done = await p.onSave(s.qid, ans, notes);
    setBusy(false);
    if (!done) return;
    const before = s, f = first, qid = s.qid;
    if (more) {
      stampThen(() => {
        setDoneIds((d) => [...d, qid]);
        setSitting((k) => k + 1);
        setS({ ...fresh(nowMs, null), dir: "in" });
        setToast({ text: `Recorded ${f}’s reply.`, undo: async () => {
          setToast(null);
          await done.undo();
          setDoneIds((d) => d.filter((x) => x !== qid));
          setSitting((k) => Math.max(0, k - 1));
          setS({ ...before, step: "check", dir: "back" });
        } });
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 6000);
      });
    } else {
      stampThen(() => { setSaved({ ...done, a: ans, before, first: f }); setPhase("done"); });
    }
  };
  /* ⌘↵ / Ctrl↵ records from the review (a note's own field keeps the key) */
  useEffect(() => {
    if (s.step !== "check" || phase !== "flow") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || (e.target as HTMLElement | null)?.closest?.('[data-rar="notes"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && rootRef.current?.offsetParent) { e.preventDefault(); void record(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  /* ── leaving: with answers it asks, without it closes (Log a query's own check) ── */
  const [leaveAsk, setLeaveAsk] = useState(false);
  const answered = touched.current && (!!s.kind || (!!s.qid && !fixed));
  const leave = () => { if (phase === "flow" && answered) setLeaveAsk(true); else p.onClose(); };
  if (p.leaveRef) p.leaveRef.current = leave;
  /* ESCAPE, one layer above the panel (lib/escapeStack): the materials pop-up is its own layer above this; then a note being
     edited, an empty writing box, the search on step one, the open calendar, the discard bar, and last the leave check */
  useEscapeLayer(true, () => {
    if (phase !== "flow") { p.onClose(); return; }
    if (s.noteEdit) { setS((o) => ({ ...o, noteEdit: null })); return; }
    if (s.noteOpen && !s.draft.trim()) { setS((o) => ({ ...o, noteOpen: false })); return; }
    if (s.step === "who" && s.find) { setS((o) => ({ ...o, find: "", hi: 0, dir: "" })); return; }
    if (s.step === "when" && s.earlier) { setS((o) => ({ ...o, earlier: false })); return; }
    if (leaveAsk) { setLeaveAsk(false); return; }
    leave();
  }, ESC_LEVEL.journey);

  /* ↑ ↓ ↵ over the big rows on the steps without a field */
  useEffect(() => {
    if (s.step === "who" || s.step === "check" || s.step === "words") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea") || !rootRef.current?.offsetParent) return;
      const bs = [...(sbRef.current?.querySelectorAll<HTMLButtonElement>(".laq-big > button") ?? [])];
      if (!bs.length) return;
      let i = bs.findIndex((b) => b.classList.contains("is-hi"));
      if (i < 0) i = bs.findIndex((b) => b === document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        i = e.key === "ArrowDown" ? (i + 1) % bs.length : (i - 1 + bs.length) % bs.length;
        bs.forEach((b) => b.classList.remove("is-hi")); bs[i].classList.add("is-hi"); bs[i].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [s.step]);

  /* ── the track ── */
  const value = (k: RStage): string => {
    if (k === "who") return first;
    if (k === "reply") return s.kind ? KIND[s.kind].short : "";
    if (k === "when") return s.when != null ? whenWord(s.when, nowMs) : "";
    if (k === "asked") {
      const l = askedNow();
      if (s.kind === "fr" && s.ask.full) return `Full${l.length > 1 ? ` +${l.length - 1}` : ""}`;
      if (s.kind === "pr" && s.ask.sample) return `${s.samp.amt.toLocaleString("en-GB")} ${s.samp.amt === 1 ? s.samp.unit.replace(/s$/, "") : s.samp.unit}`;
      return plural(l.length, "thing");
    }
    if (k === "sent") return s.sentQ === "yes" ? whenWord(sentMs, nowMs) : "Not yet";
    if (k === "words") return s.words.trim() ? "Added" : "Skipped";
    if (k === "next") return s.rrNext === "yes" ? "Revise" : s.rrNext === "close" ? "Close" : "Not sure";
    if (k === "by") return s.ofNone || s.when == null ? "No date" : dm(addDaysMs(s.when, s.ofDays));
    if (k === "others") return s.others === "task" ? "Task" : "Not now";
    return "";
  };
  const track = (allDone: boolean) => (
    <div className="laq-trk" data-rar="track" role="list" aria-label="Recording a response, step by step">
      {stagesOf(s.kind).map((k, i) => {
        const now = !allDone && s.step === k;
        const d = allDone || (!now && isDone(s, k));
        const cls = `laq-s${now ? " is-n" : ""}${d ? " is-d" : ""}`;
        const inner = <><span className="laq-nd" aria-hidden="true">{d ? "✓" : i + 1}</span><span className="laq-l">{STAGE_LABEL[k]}{d && k !== "check" ? <b data-rar="step-value">{value(k)}</b> : null}</span></>;
        const canGo = d && !allDone && !(k === "who" && fixed);
        return (
          <div key={k} role="listitem" className={`laq-si${d ? " is-done" : ""}`}>
            {canGo
              ? <button type="button" className={cls} data-rar="step" data-k={k} data-state="done" aria-label={`${STAGE_LABEL[k]}: ${value(k)}. Change it`} onClick={() => go(k)}>{inner}</button>
              : <span className={cls} data-rar="step" data-k={k} data-state={now ? "now" : d ? "done" : "todo"} aria-current={now ? "step" : undefined}>{inner}</span>}
          </div>
        );
      })}
    </div>
  );
  const counts = saved?.counts ?? pv?.counts ?? null;
  const [h1, h2] = headline({
    kind: phase === "done" ? saved?.a.kind ?? null : s.kind, first: phase === "done" ? saved?.first ?? first : first, recorded: phase === "done", sitting, picked: !!s.qid,
    requests: counts?.lead.k === "requests" ? counts.lead.n : null, activeLeft: counts?.lead.k === "active" ? counts.lead.n : null,
    offers: counts?.lead.k === "offer" ? counts.lead.n : null, rrNext: phase === "done" ? saved?.a.rrNext ?? null : s.rrNext,
    sentQ: phase === "done" ? saved?.a.sentQ ?? null : null,
  });
  const top = (allDone: boolean) => (
    <div className="laq-top rar-top" data-laq="top">
      <FlowHead title={<>{h1}<span className="is-c br" data-rar="head-2">{h2}</span></>} titleKey={`${h1}|${h2}`}
        mark={<img className="flh-m rar-art" data-rar="art" src={ARCHIVIST} alt="" width={48} height={48} />}
        onClose={() => leave()} data={{ "data-rar": "head" }} closeData={{ "data-rar": "close" }} />
      {track(allDone)}
    </div>
  );

  /* ── the recorded screen ── */
  if (phase === "done" && saved && pv) {
    const A = saved.a, f = saved.first;
    const rc = recordedCopy(A, f, { othersN: ctx?.othersN ?? 0, activeLeft: counts?.lead.k === "active" ? counts.lead.n : null });
    const slot = rc.slot, yh = rc.big;
    const yl: React.ReactNode = <>{rc.line[0]}{rc.line[1] != null ? <b>{rc.line[1]}</b> : null}{rc.line[2]}</>;
    return (
      <div ref={rootRef} className="laq rar" data-rar="root" data-step="done" style={toneStyle}>
        <div className="laq-in">
          {top(true)}
          <div className="laq-sb laq-yayb" data-rar="body">
            <div className="laq-yay" data-rar="done">
              <IlloSlot name={slot} width={170} height={96} />
              <h2 className="laq-yh" data-rar="done-head">{yh}</h2>
              <p className="laq-yl" data-rar="done-line">{yl}</p>
              <div className="laq-slipw">{card(pv.row, pv.packageName, true, A.when)}</div>
            </div>
          </div>
          <div className="laq-cf" data-rar="foot">
            <button type="button" className="laq-lnk" data-rar="open-card" onClick={() => saved.openCard()}>Open {f}’s card</button>
            <span className="laq-sp" />
            <button type="button" className="laq-lnk" data-rar="undo" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await saved.undo(); } finally { setBusy(false); }
              const b = saved.before;
              setSaved(null); setPhase("flow"); setS({ ...b, step: "check", dir: "back" });
            }}>Undo</button>
            <button type="button" className="laq-lnk" data-rar="another" onClick={() => { setDoneIds((d) => [...d, saved.before.qid ?? ""]); setSitting((k) => k + 1); setSaved(null); setPhase("flow"); setS({ ...fresh(nowMs, null), dir: "in" }); }}>Record another</button>
            <button type="button" className="laq-btn" data-rar="done-btn" onClick={p.onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── the footer ── */
  const sg = stagesOf(s.kind);
  const idx = sg.indexOf(s.step);
  const backBtn = idx <= 0 || (idx === 1 && fixed)
    ? <button type="button" className="laq-lnk" data-rar="cancel" onClick={() => leave()}>Cancel</button>
    : <button type="button" className="laq-lnk" data-rar="back" onClick={() => go(sg[Math.max(0, idx - 1)])}>Back</button>;
  const carry = (act: string, run: () => void, label = "Carry on") => <button type="button" className="laq-btn" data-rar={act} onClick={run}>{label} {ICON.arrow}</button>;
  const hint = (t: string) => <span className="laq-hint" data-rar="hint">{t}</span>;
  const wentAny = s.went ? wentList({ kind: s.kind!, went: s.went, wsamp: s.wsamp, synName }).length > 0 : false;
  const foot = (() => {
    if (s.step === "who") return <>{backBtn}<span className="laq-sp" />{hint("↑ ↓ and ↵")}</>;
    if (s.step === "asked") return <>{backBtn}<span className="laq-sp" />{askedNow().length ? carry("asked-go", () => answer({ askOk: true, went: null, wentOk: false })) : hint("Pick at least one to carry on")}</>;
    if (s.step === "sent" && s.sub === "went") return <><button type="button" className="laq-lnk" data-rar="went-back" onClick={() => setS((o) => ({ ...o, sub: "ask", dir: "back" }))}>Back</button><span className="laq-sp" />{wentAny ? carry("went-go", () => answer({ wentOk: true, sentOk: true })) : hint("Pick at least one to carry on")}</>;
    if (s.step === "sent") return <>{backBtn}<span className="laq-sp" />{s.sentQ ? carry("sent-go", () => {
      if (s.sentQ === "yes") { setS((o) => ({ ...o, ...(o.went ? {} : initWent(o)), sub: "went", dir: "in" })); return; }
      answer({ sentOk: true });
    }) : hint("Pick one to carry on")}</>;
    if (s.step === "next") return <>{backBtn}<span className="laq-sp" />{s.rrNext ? carry("next-go", () => answer({ rrOk: true })) : hint("Pick one to carry on")}</>;
    if (s.step === "words") return <>{backBtn}<span className="laq-sp" /><button type="button" className="laq-lnk" data-rar="words-skip" onClick={() => answer({ words: "", wordsOk: true })}>Skip</button>
      <button type="button" className="laq-btn" data-rar="words-go" disabled={!s.words.trim()} onClick={() => answer({ wordsOk: true })}>Carry on {ICON.arrow}</button></>;
    if (s.step === "by") return <>{backBtn}<span className="laq-sp" />{carry("by-go", () => answer({ ofOk: true }))}</>;
    if (s.step === "check") return <>
      <button type="button" className="laq-lnk" data-rar="cancel" onClick={() => leave()} disabled={busy || stamp}>Cancel</button>
      <span className="laq-sp" />
      <button type="button" className="laq-lnk" data-rar="record-more" disabled={busy || stamp} onClick={() => void record(true)}>Record and start another</button>
      <button type="button" className="laq-btn" data-rar="record" disabled={busy || stamp} aria-busy={busy || undefined} onClick={() => void record(false)}>{busy ? "Recording…" : <>Record reply {ICON.arrow}</>}</button>
    </>;
    return <>{backBtn}<span className="laq-sp" />{hint("Pick one to carry on")}</>;
  })();
  const leaveFoot = (
    <>
      <span className="laq-lv" role="alertdialog" aria-label="Discard this reply?"><b>Discard this?</b> Nothing has been saved yet.</span>
      <span className="laq-sp" />
      <button type="button" className="laq-lnk" data-rar="leave-keep" autoFocus onClick={() => setLeaveAsk(false)}>Keep going</button>
      <button type="button" className="laq-btn" data-rar="leave-discard" onClick={p.onClose}>Discard</button>
    </>
  );

  const body = s.step === "who" ? whoBody() : s.step === "reply" ? replyBody() : s.step === "when" ? whenBody() : s.step === "asked" ? askedBody()
    : s.step === "sent" ? (s.sub === "went" ? wentBody() : sentBody()) : s.step === "words" ? wordsBody() : s.step === "next" ? nextBody()
    : s.step === "by" ? byBody() : s.step === "others" ? othersBody() : checkBody();
  return (
    <div ref={rootRef} className="laq rar" data-rar="root" data-step={s.step} data-sub={s.step === "sent" ? s.sub : undefined} style={toneStyle}>
      <div className={`laq-in${bump ? " is-bump" : ""}`}>
        {top(false)}
        <div ref={sbRef} key={s.step === "sent" ? `sent:${s.sub}` : s.step} className={`laq-sb${s.dir && !reduce ? ` is-${s.dir}` : ""}${s.step === "check" ? " is-chk" : ""}`} data-rar="body">{body}</div>
        <div className={`laq-cf${leaveAsk ? " is-leave" : ""}`} data-rar="foot">{leaveAsk ? leaveFoot : foot}</div>
        <div className={`laq-toast${toast ? " is-on" : ""}`} data-rar="toast" role="status" aria-live="polite">
          {toast ? <>{toast.text}<button type="button" data-rar="toast-undo" onClick={toast.undo}>Undo</button></> : null}
        </div>
      </div>
    </div>
  );
};

const TASK = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5b4f47" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" /><path d="M5.3 8.2l1.9 1.9 3.6-4" /></svg>;
const NO = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5b4f47" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d="M5.5 8h5" /></svg>;
