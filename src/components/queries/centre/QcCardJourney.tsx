/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1 (design-refs/card-journeys-v1) — THE SHELL OF THE FOUR CARD JOURNEYS: Mark sent, Close, Answer an
 * offer, Reopen. It is Record a response's shell, not a second one: the same `.laq` / `.rar` classes (qcLogStages.css,
 * qcRespondStages.css), the navy head with the Archivist's head (FlowHead), the track and its `StepValue`, the big rows,
 * the calendar, the app's WeekSlider, the tick tiles, the review card (the real grid card, QcCard154 `preview`), the
 * stamp, the big numbers, the Notes tab's own note parts, the discard bar.
 *
 * A journey is a SPEC (`CJSpec`): its steps, what each asks, its plans (the existing writers), its review extras and its
 * finish words. This file owns everything they share: moving between steps, the track, the footer, the leave check,
 * Escape, ⌘↵ on the review, the review card and numbers, notes, the save and its Undo, and the finish screen.
 *
 * ⚠️ NOTHING HERE WRITES. `onSave` is the host's (CardJourneyHost): the spec's plans, one batch, one snapshot.
 * ⚠️ THE AGENT STEP IS ALWAYS DONE and cannot be changed: every door names the query.
 * ⚠️ THE COLOUR is the query's own status to start, then the status it is moving to once that is known (`spec.tone`).
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Query } from "../../../types";
import type { CardJourneyKind } from "../../../lib/queryPanelStore";
import { FlowHead } from "../../shared/FlowHead";
import { MaterialIcon } from "../../shared/MaterialIcon";
import { WeekSlider } from "../../forms/WeekSlider";
import { IlloSlot } from "../IlloSlot";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { QcCard154 } from "./QcCard154";
import { NoteArticle, NoteCompose } from "./QcNotes158";
import type { QcRow } from "../../../lib/qcSummary";
import { calMonth, monthLong, addNote, editNote, deleteNote, notesToSave, type BookChoice, type Choice, type JourneyNote } from "../../../lib/queryActions/logStages";
import { materialIconKind } from "../../../lib/materialIcon";
import { addDaysMs, dm, sod, toneOf, wdm } from "../../../lib/queryActions/respondStages";
import type { Book } from "../../../lib/queryActions/sample";
import type { Activity } from "../../../types";
import type { PlanCtx, WritePlan } from "../../../lib/qc152Write";
import type { RawActivityDoc } from "../../../lib/recomputeFields";
import { CJ_LABEL, type CJStage } from "../../../lib/queryActions/cardJourneys";
import { ICON, useReducedMotion } from "./QcLogStages";
import { ARCHIVIST, StepValue } from "./QcRespondStages";
import "./qcv158.css";
import "../../queryActions/queryDrawer.css";
import "../../../marketing/heroCard.css";
import "./qcv149card.css";
import "./qcLogStages.css";
import "./qcRespondStages.css";
import "./qcCardJourney.css";

/** what every journey knows about the query it is for */
export interface CJCtx {
  q: Query;
  first: string;
  nowMs: number;
  book: Book;
  synopses: readonly Choice[];
  versions: readonly BookChoice[];
  /** the agent's stated reply time, weeks */
  weeks: number | null;
  /** the other open queries on this book (an offer's "tell the others") */
  othersN: number;
  /** this query's feed rows, oldest first */
  log: readonly Activity[];
  /** the book's queries now (the numbers) */
  book_queries: readonly Query[];
}
export interface CJCount { k: string; n: number; d: number; label: string }
export interface CJPreview { row: QcRow; packageName: string | null; counts: CJCount[] }
export interface CJSaved { undo: () => Promise<void>; counts: CJCount[] }
export interface CJFinish { head: [string, string]; slot: string; big: string; line: [string, string | null, string]; stamp: string; stampMs: number }

export interface CJParts {
  /** a big row (`.laq-big > button`) */
  big: (o: { k: string; data: string; glyph: React.ReactNode; title: string; sub?: string; on: boolean; onClick: () => void; arrow?: boolean; disc?: boolean }) => React.ReactNode;
  /** Today · Yesterday · An earlier date (the calendar, no future, none before `minMs`) */
  dates: (o: { data: string; cur: number | null; minMs: number; onPick: (ms: number) => void }) => React.ReactNode;
  /** the app's one slider (WeekSlider) with its sentence beneath */
  slider: (o: { k: string; label: string; value: number; none: boolean; noneLabel: string; min?: number; max?: number; ends?: readonly [string, string]; onChange: (n: number) => void; onNone: () => void; note: React.ReactNode }) => React.ReactNode;
  /** a tick tile that opens in place */
  tile: (key: string, on: boolean, title: React.ReactNode, sub: string | null, extra: React.ReactNode | null, toggle: () => void) => React.ReactNode;
  /** a radio list of named choices (synopses, versions) */
  opts: (k: string, list: readonly { id: string; name: string }[], cur: string | null, pick: (id: string) => void) => React.ReactNode;
  /** a to-do row on the review */
  todo: (title: string, when: string, key: string) => React.ReactNode;
  /** the review's material tiles */
  tiles: (list: readonly string[]) => React.ReactNode;
  /** a tick on its own ("Remind me to nudge on …") */
  check: (o: { data: string; on: boolean; label: React.ReactNode; onClick: () => void }) => React.ReactNode;
}
export interface CJApi<S> {
  s: S; c: CJCtx; parts: CJParts;
  set: (p: Partial<S>) => void;
  /** answer and move to the first step still unanswered */
  answer: (p: Partial<S>) => void;
  go: (k: CJStage) => void;
  /** hand over to Record a response in the same panel ("{First} passed", "{First} replied after all") */
  handOver: (reply: "passed" | null) => void;
}
export interface CJSpec<S> {
  kind: CardJourneyKind;
  init: (c: CJCtx) => S;
  /** the steps, "agent" first and "log" last */
  stages: (s: S, c: CJCtx) => CJStage[];
  done: (s: S, k: CJStage, c: CJCtx) => boolean;
  value: (s: S, k: CJStage, c: CJCtx) => string;
  /** the head while in the journey */
  head: (s: S, c: CJCtx) => [string, string];
  /** the status whose colour the form takes */
  tone: (s: S, c: CJCtx) => string | null;
  body: (k: CJStage, api: CJApi<S>) => React.ReactNode;
  /** a step's own "Carry on" (a step answered by a big row needs none: null shows "Pick one to carry on") */
  carry?: (k: CJStage, api: CJApi<S>) => { ok: boolean; run: () => void; hint?: string } | null;
  /** the review */
  check: { title: (c: CJCtx) => string; button: string; extras: (api: CJApi<S>, pv: CJPreview) => React.ReactNode };
  finish: (s: S, c: CJCtx, counts: CJCount[]) => CJFinish;
  /** the save: the existing writers' plans, in order, for ONE `commitMany`; the other queries it touches; the numbers */
  write: {
    plans: (pc: PlanCtx & { feed: RawActivityDoc[] }, s: S, c: CJCtx) => WritePlan[];
    extraIds?: (s: S, c: CJCtx) => string[];
    counts: (c: CJCtx, after: Query, s: S) => CJCount[];
  };
}

export interface QcCardJourneyProps<S> {
  spec: CJSpec<S>;
  ctx: CJCtx;
  /** the review's card and numbers, from the save's own plans */
  previewOf: (s: S) => CJPreview | null;
  onSave: (s: S, notes: string[]) => Promise<CJSaved | null>;
  /** the saved query's row as the page has it now (the finish screen's card) */
  rowOf: () => QcRow | null;
  onClose: () => void;
  onHandOver: (reply: "passed" | null) => void;
  /** opened from the card: the finish button is "Back to {First}'s card" */
  fromCard: boolean;
  leaveRef?: React.MutableRefObject<(() => void) | null>;
}

const noop = () => {};

export function QcCardJourney<S>(p: QcCardJourneyProps<S>): React.ReactElement {
  const { spec, ctx: c } = p;
  const nowMs = c.nowMs;
  const today = sod(nowMs), yday = addDaysMs(nowMs, -1);
  const first = c.first;
  const [s, setS] = useState<S>(() => spec.init(c));
  const touched = useRef(false);
  const stagesNow = (x: S) => spec.stages(x, c);
  const nextOf = (x: S): CJStage => { const sg = stagesNow(x); for (const k of sg) if (k !== "log" && !spec.done(x, k, c)) return k; return "log"; };
  const [step, setStep] = useState<CJStage>(() => nextOf(s));
  const [dir, setDir] = useState<"in" | "back" | "">("");
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [cal, setCal] = useState<{ open: boolean; at: number }>({ open: false, at: new Date(nowMs).getFullYear() * 12 + new Date(nowMs).getMonth() });
  const set = (patch: Partial<S>) => { touched.current = true; setS((o) => ({ ...o, ...patch })); };
  const answer = (patch: Partial<S>) => {
    touched.current = true;
    const n = { ...s, ...patch };
    setS(n); setStep(nextOf(n)); setDir("in"); setLeaveAsk(false);
    setCal((o) => ({ ...o, open: false }));
  };
  const go = (k: CJStage) => { setStep(k); setDir("back"); setLeaveAsk(false); setCal((o) => ({ ...o, open: false })); };
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const sbRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"flow" | "done">("flow");
  const [saved, setSaved] = useState<(CJSaved & { before: S }) | null>(null);

  /* ── the colour ── */
  const tone = toneOf(spec.tone(s, c));
  const toneStyle = tone ? ({ "--sc": tone.disc, "--st2": tone.wash, "--sm": tone.mark } as React.CSSProperties) : undefined;

  /* ── the shared parts ── */
  const calRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (cal.open && calRef.current && sbRef.current) sbRef.current.scrollTop = sbRef.current.scrollHeight; }, [cal.open]);
  const parts: CJParts = {
    big: (o) => (
      <button key={o.k} type="button" className={o.on ? "is-on" : ""} aria-pressed={o.on} data-cj={o.data} data-k={o.k} onClick={o.onClick}>
        <span className={`laq-g${o.disc ? " is-st" : ""}`} aria-hidden="true">{o.glyph}</span>
        <span className="laq-tx"><b>{o.title}</b>{o.sub ? <span>{o.sub}</span> : null}</span>
        {o.arrow === false ? null : <span className="laq-ar" aria-hidden="true">{ICON.arrow}</span>}
      </button>
    ),
    dates: (o) => {
      const minDay = sod(o.minMs);
      const y = Math.floor(cal.at / 12), m = cal.at % 12;
      const cm = calMonth(y, m, nowMs);
      const minAt = new Date(minDay).getFullYear() * 12 + new Date(minDay).getMonth();
      const early = o.cur != null && o.cur !== today && o.cur !== yday;
      const row = (k: string, title: string, sub: string, on: boolean, click: () => void, arrow = true) => parts.big({ k, data: o.data, glyph: ICON.cal, title, sub, on, onClick: click, arrow });
      return (
        <>
          <div className="laq-big" data-cj={`${o.data}-rows`}>
            {today >= minDay ? row("today", "Today", wdm(today), o.cur === today, () => o.onPick(today)) : null}
            {yday >= minDay ? row("yesterday", "Yesterday", wdm(yday), o.cur === yday, () => o.onPick(yday)) : null}
            {row("earlier", "An earlier date", early ? `Chosen: ${dm(o.cur!)}` : "Pick it from the calendar", cal.open, () => setCal((x) => ({ ...x, open: !x.open })), false)}
          </div>
          {cal.open ? (
            <div className="laq-cal" data-cj="calendar" ref={calRef}>
              <div className="laq-calh">
                <button type="button" aria-label="Previous month" data-cj="cal-prev" disabled={cal.at <= minAt} onClick={() => setCal((x) => ({ ...x, at: x.at - 1 }))}>{ICON.l}</button>
                <b data-cj="cal-month">{monthLong(y, m)} {y}</b>
                <button type="button" aria-label="Next month" data-cj="cal-next" disabled={!cm.canNext} onClick={() => setCal((x) => ({ ...x, at: x.at + 1 }))}>{ICON.r}</button>
              </div>
              <div className="laq-calg">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} aria-hidden="true">{d}</span>)}
                {Array.from({ length: cm.lead }, (_, i) => <i key={`b${i}`} />)}
                {cm.days.map((d) => (
                  <button key={d.ms} type="button" data-cj="cal-day" data-day={d.day} disabled={d.future || d.ms < minDay} aria-label={wdm(d.ms)}
                    className={`${d.today ? "is-today" : ""}${o.cur === d.ms ? " is-on" : ""}`} onClick={() => o.onPick(d.ms)}>{d.day}</button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      );
    },
    slider: (o) => (
      <div className="laq-wkb" data-cj="slider" data-k={o.k}>
        <WeekSlider label={o.label} value={o.none ? null : o.value} min={o.min ?? 1} max={o.max ?? 26} readout={(n) => `${n} week${n === 1 ? "" : "s"}`} unknownLabel={o.noneLabel}
          ends={o.ends ?? ["1 week", "26 weeks"]} onChange={o.onChange} onUnknown={o.onNone} />
        <p className="laq-wkx" data-cj="slider-note">{o.note}</p>
      </div>
    ),
    tile: (key, on, title, sub, extra, toggle) => (
      <div key={key} className={`laq-gt${on ? " is-on" : ""}`} data-cj="tile" data-k={key} data-on={on ? "1" : "0"}>
        <button type="button" role="checkbox" aria-checked={on} aria-expanded={extra ? on : undefined} onClick={toggle}>
          <span className="laq-ck" aria-hidden="true">{on ? "✓" : ""}</span>
          <span className="laq-tx"><b>{title}</b>{sub ? <span data-cj="tile-sub">{sub}</span> : null}</span>
        </button>
        {on && extra ? <div className="laq-gs" data-cj="tile-open">{extra}</div> : null}
      </div>
    ),
    opts: (k, list, cur, pick) => (
      <div className="laq-opts" role="radiogroup" aria-label={k === "ver" ? "Which version" : "Which synopsis"}>
        {list.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={cur === o.id} className={`laq-opt${cur === o.id ? " is-on" : ""}`} data-cj="opt" data-k={k} data-id={o.id} onClick={() => pick(o.id)}>
            <span className="laq-rdo" aria-hidden="true" /><span className="laq-on">{o.name}</span>
          </button>
        ))}
      </div>
    ),
    todo: (title, when, key) => (
      <div key={key} className="laq-todo rar-todo" data-cj="task"><i aria-hidden="true" /><span><b>{title}</b></span><span className="rar-when"><em>to-do</em>{when}</span></div>
    ),
    tiles: (list) => (
      <div className={`rvw is-${Math.min(3, Math.max(1, list.length))}`} data-cj="tiles" role="list">
        {list.map((t, i) => {
          const k = materialIconKind(t);
          return <div key={i} className="rvw-t" role="listitem" data-cj="tile-r" data-kind={k ?? ""}>{k ? <span className="rvw-i" aria-hidden="true"><MaterialIcon kind={k} size={24} /></span> : null}<b>{t}</b></div>;
        })}
      </div>
    ),
    check: (o) => (
      <button type="button" className={`rar-chk${o.on ? " is-on" : ""}`} role="checkbox" aria-checked={o.on} data-cj={o.data} onClick={o.onClick}>
        <span className="laq-ck" aria-hidden="true">{o.on ? "✓" : ""}</span><span>{o.label}</span>
      </button>
    ),
  };
  const api: CJApi<S> = { s, c, parts, set, answer, go, handOver: (r) => p.onHandOver(r) };

  /* ── the review ── */
  const pv = useMemo(() => (step === "log" || phase === "done" ? p.previewOf(s) : null), [s, step, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const [stamp, setStamp] = useState(false);
  const [notes, setNotes] = useState<{ notes: JourneyNote[]; open: boolean; draft: string; edit: { id: string; text: string } | null }>({ notes: [], open: false, draft: "", edit: null });
  const card = (row: QcRow, pkg: string | null, stampOn: boolean, word: string, stampMs: number) => (
    <div className={`laq-pv laq-pvw qc151 qc153 is-wide${phase === "done" ? " is-logged" : ""}${stampOn ? " has-stamp" : ""}`} data-cj="preview">
      <div className="laq-pvc"><QcCard154 row={row} nowMs={nowMs} selected={false} packageName={pkg} act={null} onOpen={noop} onAct={noop} preview /></div>
      {stampOn ? <span className={`laq-stamp${reduce ? "" : " is-thump"}`} data-cj="stamp" aria-hidden="true"><span>{word}</span><small>{dm(stampMs).toUpperCase()}</small></span> : null}
    </div>
  );
  const numbers = (cs: readonly CJCount[]) => (
    <div className="rvb is-big" role="group" aria-label="What this does" data-cj="counts">
      {cs.map((x) => (
        <div key={x.k} className="rvb-c" data-cj="count" data-k={x.k} data-d={x.d}>
          <span className="rvb-n">{x.n}{x.d ? <i className={x.d < 0 ? "is-dn" : ""}>{x.d < 0 ? `−${-x.d}` : `+${x.d}`}</i> : null}</span><span className="rvb-l">{x.label}</span>
        </div>
      ))}
    </div>
  );
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (notes.open) { noteRef.current?.focus({ preventScroll: true }); noteRef.current?.closest(".nx-nc")?.scrollIntoView({ block: "nearest" }); } }, [notes.open]);
  const notesBlock = (
    <div className="qc152 laq-notes" data-cj="notes">
      {notes.notes.length ? <>
        <div className="rvw-h"><b>Notes</b></div>
        <div className="nx-nl">
          {notes.notes.map((n) => (
            <NoteArticle key={n.id} n={{ id: n.id, text: n.text, ms: n.ms, pinned: false }} nowMs={nowMs}
              editing={notes.edit && notes.edit.id === n.id ? notes.edit.text : null}
              onEditChange={(text) => setNotes((o) => ({ ...o, edit: { id: n.id, text } }))}
              onEditCancel={() => setNotes((o) => ({ ...o, edit: null }))}
              onEditSave={() => setNotes((o) => (o.edit && o.edit.text.trim() ? { ...o, notes: editNote(o.notes, o.edit.id, o.edit.text), edit: null } : o))}
              onEdit={() => setNotes((o) => ({ ...o, edit: { id: n.id, text: n.text } }))}
              onDelete={() => setNotes((o) => ({ ...o, notes: deleteNote(o.notes, n.id), edit: o.edit?.id === n.id ? null : o.edit }))} />
          ))}
        </div>
      </> : null}
      {notes.open
        ? <NoteCompose value={notes.draft} onChange={(t) => { touched.current = true; setNotes((o) => ({ ...o, draft: t })); }} onAdd={() => setNotes((o) => (o.draft.trim() ? { ...o, notes: addNote(o.notes, o.draft, Date.now()), draft: "", open: false } : o))} fieldRef={noteRef} />
        : <p className="rvw-n"><button type="button" className="laq-lk" data-cj="add-note" onClick={() => setNotes((o) => ({ ...o, open: true }))}>{notes.notes.length ? "Add another note" : "Add a note"}</button></p>}
    </div>
  );
  const checkBody = () => {
    if (!pv) return null;
    return (
      <>
        <h2 className="laq-qh" data-cj="q">{spec.check.title(c)}</h2>
        <p className="laq-qs laq-rvs">This is how {first}’s card will look on your Queries page.</p>
        {card(pv.row, pv.packageName, stamp, finishOf(pv.counts).stamp, finishOf(pv.counts).stampMs)}
        {spec.check.extras(api, pv)}
        {notesBlock}
        {numbers(pv.counts)}
      </>
    );
  };
  const finishOf = (cs: CJCount[]) => spec.finish(saved?.before ?? s, c, cs);

  /* ── saving ── */
  const [busy, setBusy] = useState(false);
  const [bump, setBump] = useState(false);
  const save = async () => {
    if (busy || !pv) return;
    setBusy(true);
    const done = await p.onSave(s, notesToSave({ notes: notes.notes, edit: notes.edit, draft: notes.draft }));
    setBusy(false);
    if (!done) return;
    const before = s;
    const then = () => { setSaved({ ...done, before }); setPhase("done"); };
    if (reduce) { then(); return; }
    setStamp(true); setBump(true);
    window.setTimeout(() => { setStamp(false); setBump(false); then(); }, 650);
  };
  useEffect(() => {
    if (step !== "log" || phase !== "flow") return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || (e.target as HTMLElement | null)?.closest?.('[data-cj="notes"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && rootRef.current?.offsetParent) { e.preventDefault(); void save(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  /* ── leaving: with answers it asks, without it closes ── */
  const leave = () => { if (phase === "flow" && touched.current) setLeaveAsk(true); else p.onClose(); };
  if (p.leaveRef) p.leaveRef.current = leave;
  useEscapeLayer(true, () => {
    if (phase !== "flow") { p.onClose(); return; }
    if (notes.edit) { setNotes((o) => ({ ...o, edit: null })); return; }
    if (notes.open && !notes.draft.trim()) { setNotes((o) => ({ ...o, open: false })); return; }
    if (cal.open) { setCal((o) => ({ ...o, open: false })); return; }
    if (leaveAsk) { setLeaveAsk(false); return; }
    leave();
  }, ESC_LEVEL.journey);

  /* ↑ ↓ over the big rows */
  useEffect(() => {
    if (step === "log") return undefined;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea") || !rootRef.current?.offsetParent) return;
      const bs = [...(sbRef.current?.querySelectorAll<HTMLButtonElement>(".laq-big > button") ?? [])];
      if (!bs.length || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
      let i = bs.findIndex((b) => b.classList.contains("is-hi"));
      if (i < 0) i = bs.findIndex((b) => b === document.activeElement);
      e.preventDefault();
      i = e.key === "ArrowDown" ? (i + 1) % bs.length : (i - 1 + bs.length) % bs.length;
      bs.forEach((b) => b.classList.remove("is-hi")); bs[i].classList.add("is-hi"); bs[i].focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step]);

  /* ── the head and the track ── */
  const sg = stagesNow(phase === "done" && saved ? saved.before : s);
  const track = (allDone: boolean) => (
    <div className="laq-trk" data-cj="track" role="list" aria-label="Step by step">
      {sg.map((k, i) => {
        const x = phase === "done" && saved ? saved.before : s;
        const now = !allDone && step === k;
        const d = allDone || (!now && (k === "agent" || (k !== "log" && spec.done(x, k, c))));
        const v = k === "agent" ? first : k === "log" ? "" : spec.value(x, k, c);
        const cls = `laq-s${now ? " is-n" : ""}${d ? " is-d" : ""}`;
        const inner = <><span className="laq-nd" aria-hidden="true">{d ? "✓" : i + 1}</span><span className="laq-l">{CJ_LABEL[k]}{d && k !== "log" && v ? <StepValue text={v} /> : null}</span></>;
        const canGo = d && !allDone && k !== "agent" && k !== "log";
        return (
          <div key={k} role="listitem" className={`laq-si${d ? " is-done" : ""}`} aria-label={d && v ? `${CJ_LABEL[k]}: ${v}` : undefined}>
            {canGo
              ? <button type="button" className={cls} data-cj="step" data-k={k} data-state="done" aria-label={`${CJ_LABEL[k]}: ${v}. Change it`} onClick={() => go(k)}>{inner}</button>
              : <span className={cls} data-cj="step" data-k={k} data-state={now ? "now" : d ? "done" : "todo"} aria-current={now ? "step" : undefined}>{inner}</span>}
          </div>
        );
      })}
    </div>
  );
  const top = (h: [string, string], allDone: boolean) => (
    <div className="laq-top rar-top" data-laq="top">
      <FlowHead title={<>{h[0]}<span className="is-c br" data-cj="head-2">{h[1]}</span></>} titleKey={`${h[0]}|${h[1]}`}
        mark={<img className="flh-m rar-art" data-cj="art" src={ARCHIVIST} alt="" width={48} height={48} />}
        onClose={() => leave()} data={{ "data-cj": "head" }} closeData={{ "data-cj": "close" }} />
      {track(allDone)}
    </div>
  );

  /* ── the finish screen ── */
  if (phase === "done" && saved) {
    const f = finishOf(saved.counts);
    const row = p.rowOf() ?? pv?.row ?? null;
    return (
      <div ref={rootRef} className="laq rar cj" data-cj="root" data-kind={spec.kind} data-step="done" style={toneStyle}>
        <div className="laq-in">
          {top(f.head, true)}
          <div className="laq-sb laq-yayb" data-cj="body">
            <div className="laq-yay" data-cj="done">
              <IlloSlot name={f.slot} width={170} height={96} />
              <h2 className="laq-yh" data-cj="done-head">{f.big}</h2>
              <p className="laq-yl" data-cj="done-line">{f.line[0]}{f.line[1] != null ? <b>{f.line[1]}</b> : null}{f.line[2]}</p>
              {row ? <div className="laq-slipw">{card(row, pv?.packageName ?? null, true, f.stamp, f.stampMs)}</div> : null}
            </div>
          </div>
          <div className="laq-cf" data-cj="foot">
            <button type="button" className="laq-lnk" data-cj="undo" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await saved.undo(); } finally { setBusy(false); }
              const b = saved.before;
              setSaved(null); setPhase("flow"); setS(b); setStep("log"); setDir("back");
            }}>Undo</button>
            <span className="laq-sp" />
            <button type="button" className="laq-btn" data-cj="done-btn" onClick={p.onClose}>{p.fromCard ? `Back to ${first}’s card` : "Done"}</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── the footer ── */
  const idx = sg.indexOf(step);
  const prev = sg[idx - 1];
  const backBtn = !prev || prev === "agent"
    ? <button type="button" className="laq-lnk" data-cj="cancel" onClick={() => leave()}>Cancel</button>
    : <button type="button" className="laq-lnk" data-cj="back" onClick={() => go(prev)}>Back</button>;
  const hint = (t: string) => <span className="laq-hint" data-cj="hint">{t}</span>;
  const foot = (() => {
    if (step === "log") return <>
      <button type="button" className="laq-lnk" data-cj="cancel" onClick={() => leave()} disabled={busy || stamp}>Cancel</button>
      <span className="laq-sp" />
      <button type="button" className="laq-btn" data-cj="save" disabled={busy || stamp || !pv} aria-busy={busy || undefined} onClick={() => void save()}>{busy ? "Saving…" : <>{spec.check.button} {ICON.arrow}</>}</button>
    </>;
    const cr = spec.carry?.(step, api) ?? null;
    if (!cr) return <>{backBtn}<span className="laq-sp" />{hint("Pick one to carry on")}</>;
    return <>{backBtn}<span className="laq-sp" />{cr.ok ? <button type="button" className="laq-btn" data-cj="go" onClick={cr.run}>Carry on {ICON.arrow}</button> : hint(cr.hint ?? "Pick one to carry on")}</>;
  })();
  const leaveFoot = (
    <>
      <span className="laq-lv" role="alertdialog" aria-label="Discard this?"><b>Discard this?</b> Nothing has been saved yet.</span>
      <span className="laq-sp" />
      <button type="button" className="laq-lnk" data-cj="leave-keep" autoFocus onClick={() => setLeaveAsk(false)}>Keep going</button>
      <button type="button" className="laq-btn" data-cj="leave-discard" onClick={p.onClose}>Discard</button>
    </>
  );
  return (
    <div ref={rootRef} className="laq rar cj" data-cj="root" data-kind={spec.kind} data-step={step} style={toneStyle}>
      <div className={`laq-in${bump ? " is-bump" : ""}`}>
        {top(spec.head(s, c), false)}
        <div ref={sbRef} key={step} className={`laq-sb${dir && !reduce ? ` is-${dir}` : ""}${step === "log" ? " is-chk" : ""}`} data-cj="body">{step === "log" ? checkBody() : spec.body(step, api)}</div>
        <div className={`laq-cf${leaveAsk ? " is-leave" : ""}`} data-cj="foot">{leaveAsk ? leaveFoot : foot}</div>
      </div>
    </div>
  );
}
