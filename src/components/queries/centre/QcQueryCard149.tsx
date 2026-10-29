/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 Part C (design-refs/query-centre-v149/, screens 05–10) — THE QUERY PANEL IS THE QUERY CARD.
 * The panel keeps its shape and its slide-in (QueryPanelHost / SidePanel, unchanged); what it holds is the landing
 * page's query card, drawn from `src/marketing/heroCard.css`'s own `.mk-lc*` classes as v142's Cards view drew it,
 * with its tabs working: Tracking · Agent · Materials · Notes, and a footer that acts.
 *
 * THREE MODES, ONE CARD:
 *   view     — the tabs, the due line and the primary action, then Record a response · Edit query · Close query and
 *              ‹ n / M › through the list in its visible order.
 *   respond  — "What did {first} say?": four answers, a date and a note. The band, agent row and book block stay.
 *   edit     — a navy "Editing this query" strip; step dates become fields with × to remove; "+ Add a step"; the
 *              package becomes a select; what was sent toggles; the Agent tab's fields become inputs.
 *
 * ⚠️ THE CARD SAVES NOTHING ITSELF. Each save is the page's, through the existing writers (the response journey's
 *    `saveResponse`, `editActivity`, the entry-delete path, `recordMaterialsSent`, the agent card's save), each under one
 *    snapshot with the undo bar. The card only collects answers and says what is wrong before Save is allowed.
 * ⚠️ IT PORTALS WITH THE PANEL (document.body), so it reads no page token: `--mk-f-*` are declared on its root, as
 *    qcv142.css declared them on the Cards view's card.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { MONTHS_SHORT } from "../../../lib/dates";
import { STAGE_NAME, WHERE_LABEL, whereItStands, type QcRow, type WhereKey } from "../../../lib/qcSummary";
import { STRIP_TINT, type AgentView, type ChipIcon, type NextStep, type StoryStep, type Strip } from "../../../lib/qcCardStory";
import "../../../marketing/heroCard.css";
import "./qcv149card.css";
import { FlowHead, FLOW_WORDS, RECORD_LINE } from "../../shared/FlowHead";
import { STAGE_STEPS, stageIndex } from "../../../lib/queriesPhone";


/** the band's tint and ink, and the pill's ground, per set (the landing card's With you / With the agent / Closed;
 *  Gone quiet a 135° stripe) — moved here from v142's retired Cards view */
export const CARD_TONE: Record<WhereKey, { bg: string; fg: string; pill: string }> = {
  you: { bg: "#f5e6df", fg: "#7c3a2a", pill: "#f5e6df" },
  agent: { bg: "#e2e6e0", fg: "#4d524a", pill: "#e6e9e4" },
  quiet: { bg: "repeating-linear-gradient(135deg, #ebe6dd 0 6px, #f3efe8 6px 12px)", fg: "#6b5f52", pill: "#efeae2" },
  closed: { bg: "#e4e1db", fg: "#5b524a", pill: "#ece8e3" },
};
/** the package chip's words: "LIGHT PACKAGE", or "NO PACKAGE" */
export const packageChip = (name: string | null): string => {
  if (!name) return "NO PACKAGE";
  const n = name.trim();
  return (/package$/i.test(n) ? n : `${n} package`).toUpperCase();
};

export type CardMode = "view" | "respond" | "edit";
export type CardTab = "tracking" | "agent" | "materials" | "notes";
export type RespChoice = "partial" | "full" | "pass" | "offer";

export interface CardStep {
  key: string;
  /** present when the step is a real activity (it can be redated or removed) */
  activityId?: string;
  title: string;
  ms: number | null;
  status: QueryStatus | null;
  /** the first step is the query itself: it cannot be removed on its own */
  root: boolean;
}
export interface CardAgent {
  name: string; agency: string; email: string; replyWeeks: number | null; firstQueried: string;
  /** the agent's first name for "What did … say?"; null when there is no agent record (the card then says "they") */
  first: string | null;
}
export interface CardPiece { key: string; label: string; on: boolean }
export interface StepChoice { key: string; label: string }
export interface CardEdits {
  dates: Record<string, string>;
  removed: string[];
  added: { kind: string; date: string } | null;
  packageKey: string | null;
  pieces: Record<string, boolean>;
  agent: Partial<{ name: string; agency: string; email: string; replyWeeks: string }>;
}

const RESP: { k: RespChoice; label: string; hint: string }[] = [
  { k: "partial", label: "They asked for a partial", hint: "You’ll send it" },
  { k: "full", label: "They asked for the full manuscript", hint: "You’ll send it" },
  { k: "pass", label: "They passed", hint: "Closes the query" },
  { k: "offer", label: "They offered representation", hint: "Decide by your date" },
];
const MON = MONTHS_SHORT;
/** "10 MAY", with the year when it is not this one */
export const stepDay = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MON[d.getMonth()].toUpperCase()}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
};
/** the edit fields' words: "10 May 2026" */
export const fieldDay = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
/** "10 May 2026", "10 May" (this year) or "2026-05-10" → a local midnight, or null */
export function parseDay(s: string, nowMs: number): number | null {
  const t = s.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  m = /^(\d{1,2})\s+([A-Za-z]{3,})\.?\s*(\d{4})?$/.exec(t);
  if (!m) return null;
  const mi = MON.findIndex((x) => x.toLowerCase() === m![2].slice(0, 3).toLowerCase());
  if (mi < 0) return null;
  const y = m[3] ? +m[3] : new Date(nowMs).getFullYear();
  const d = new Date(y, mi, +m[1]);
  return d.getMonth() === mi ? d.getTime() : null;
}

const CLOCK = <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></svg>;
const DOC = <svg width="11" height="12" viewBox="0 0 11 12" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true"><rect x="1" y="1" width="9" height="10" rx=".5" /><path d="M3 4h5M3 6h5M3 8h3" /></svg>;
const LEFT = <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l-6 6 6 6" /></svg>;
/* v149.1 — the mock's own marks (design-refs/query-centre-v149-1/query-card-panel-v2.html) */
const BOOK = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5f5a53" strokeWidth="1.6" strokeLinejoin="round"><path d="M3.5 5.5c2.8-1.3 5.8-1.3 8.5.6 2.7-1.9 5.7-1.9 8.5-.6v13c-2.8-1.3-5.8-1.3-8.5.6-2.7-1.9-5.7-1.9-8.5-.6z" /><path d="M12 6.1v13" /></svg>;
const CHIP_ICON: Record<ChipIcon, React.ReactNode> = {
  letter: <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><rect x="3" y="2" width="10" height="12" rx="1.4" /><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" strokeLinecap="round" /></svg>,
  synopsis: <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 4h10M3 8h10M3 12h6" /></svg>,
  pages: <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><rect x="4.5" y="4" width="8.5" height="10" rx="1.2" /><path d="M3 11.5V3.2c0-.7.5-1.2 1.2-1.2h6.3" /></svg>,
  full: <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><rect x="3" y="2" width="10" height="12" rx="1.4" /><path d="M3 11h10" /></svg>,
  bell: <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"><path d="M4.5 11h7l-1-1.4V7a2.5 2.5 0 0 0-5 0v2.6zM7 12.6a1.1 1.1 0 0 0 2 0" /></svg>,
  notes: <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 4h10M3 8h10M3 12h6" /></svg>,
};
const TICK = <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>;
/** a nudge is not a status: the ring with a bell (the landing card's own) */
const NUDGE_G = <svg className="qc149c-g" viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#1c130f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="#fff" /><path d="M7 12.5h6l-.9-1.2V9a2.1 2.1 0 0 0-4.2 0v2.3zM9.2 14h1.6" /></svg>;
const HOLD_G = <svg className="qc149c-g" viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#1c130f" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="#fff" /><path d="M7 10h6" strokeLinecap="round" /></svg>;
/** the next step's mark: a dashed, faint ring */
const NEXT_G = <svg className="qc149c-g" viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="#fff" stroke="#a59a90" strokeWidth="1.5" strokeDasharray="2 2" /></svg>;
const SPARK = <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M10 2l1.6 5.2L17 9l-5.4 1.8L10 16l-1.6-5.2L3 9l5.4-1.8z" /></svg>;
const RIGHT = <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4l6 6-6 6" /></svg>;

export interface QcQueryCard149Props {
  row: QcRow;
  nowMs: number;
  msTitle: string | null;
  packageName: string | null;
  sent: { label: string }[];
  agent: CardAgent;
  steps: CardStep[];
  /** the step to light briefly (just added) */
  freshKey?: string | null;
  /** v149.1 A1 — the book block's chips: age category · genre · word count, the present ones only */
  bookChips: string[];
  /** v149.1 B3 — the step whose date field edit mode should open at (the row's "add date"), and that it was reached */
  focusStep?: string | null;
  onFocused?: () => void;
  /** v149.1 A2 — each Tracking step's part of the story, the faint next step (null when closed), and A3 the strip */
  story: StoryStep[];
  nextStep: NextStep | null;
  strip: Strip;
  due: { line: string; hot: boolean } | null;
  /** the row's next move; `close` when it is closing the query (the quiet row then drops its own Close query) */
  primary: { label: string; respond: boolean; close?: boolean } | null;
  index: number;
  total: number;
  notes: { id: string; text: string; when: string }[];
  mode: CardMode;
  onMode: (m: CardMode) => void;
  tab?: CardTab;
  onTab?: (t: CardTab) => void;
  onClose: () => void;
  onStep: (delta: number) => void;
  onPrimary: () => void;
  onCloseQuery: () => void;
  onContactList: () => void;
  onCopyEmail: () => void;
  /** v149.1 A5 — the Agent tab's parts, and the agent form opened at a field ("+ Add …", "Edit agent") */
  agentView: AgentView;
  wishlist: { text: string; genres: { label: string; hit: boolean }[] };
  contact: { email: string; website: string; websiteHref: string | null; submission: string | null };
  onAgentField: (field: "wishlist" | "email" | "website" | "method" | null) => void;
  onOpenPiece: (label: string) => void;
  onAddNote: (text: string) => void;
  onRespond: (k: RespChoice, dayMs: number, note: string) => Promise<boolean>;
  /** edit mode */
  packageChoices: { key: string; label: string }[];
  packageKey: string | null;
  pieces: CardPiece[];
  stepChoices: StepChoice[];
  removable: (activityId: string) => string[];
  onSaveEdits: (e: CardEdits) => Promise<boolean>;
  /**
   * Queries on a phone v1 — "phone" moves the strip above the tabs as "Your next step" (its sentence, its sub-line, the
   * next move in navy and a second choice in white), drops the band's × (the phone's own ‹ Queries closes), and keeps
   * the footer to the due line and ‹ N / M › (Edit and Close live in the phone's ⋯ menu). Absent = the desktop card.
   */
  layout?: "desk" | "phone";
  /** the picture on the phone's next step (quill and ink) */
  nextArt?: { src: string; w: number; h: number } | null;
  /**
   * Phone app v2, Part 3 (ref qsheet.js QH B · QB B · QL B · QN A) — the card as a pull-up SHEET: no tabs, one scroll
   * (the stage track, the latest three steps with "See the whole story", what was sent, the agent), and "Your next step"
   * pinned at the foot whatever the scroll. Opt-in and phone-only; every other caller passes nothing and is unchanged.
   */
  sheet?: boolean;
  /** the sheet's ••• (the phone's more sheet) */
  onMore?: () => void;
  /** the sheet's closed foot: "View the wall" */
  onWall?: () => void;
}

const blankEdits = (): CardEdits => ({ dates: {}, removed: [], added: null, packageKey: null, pieces: {}, agent: {} });

export const QcQueryCard149: React.FC<QcQueryCard149Props> = (p) => {
  const { row: r, nowMs, mode } = p;
  const where = whereItStands(r, nowMs);
  const tone = CARD_TONE[where];
  const first = p.agent.first || "they";
  const [tabOwn, setTabOwn] = useState<CardTab>("tracking");
  const tab = p.tab ?? tabOwn;
  const setTab = (t: CardTab) => { setTabOwn(t); p.onTab?.(t); };
  /* a new query (another row, ‹ ›) opens on Tracking in view mode */
  useEffect(() => { setTabOwn("tracking"); }, [r.id]);

  /* ── respond ── */
  const [pick, setPick] = useState<RespChoice | null>(null);
  const [rDay, setRDay] = useState(() => fieldDay(nowMs));
  const [rNote, setRNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (mode === "respond") { setPick(null); setRDay(fieldDay(nowMs)); setRNote(""); } }, [mode, r.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const rDayMs = parseDay(rDay, nowMs);
  const rBad = rDayMs == null ? "Write the date as 24 Oct" : rDayMs > nowMs ? "The reply can’t be in the future" : null;

  /* ── edit ── */
  const [ed, setEd] = useState<CardEdits>(blankEdits);
  /* v149.1 A2 — "Add date" opens the edit mode at that step's date field */
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const addDate = (id: string) => { setFocusDate(id); setTab("tracking"); p.onMode("edit"); };
  useEffect(() => { if (mode === "edit" && p.focusStep) { setFocusDate(p.focusStep); setTabOwn("tracking"); p.onFocused?.(); } }, [mode, p.focusStep]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (mode === "edit") { setEd(blankEdits()); setTabOwn((t) => (t === "notes" ? "tracking" : t)); } }, [mode, r.id]);
  const stepMs = (s: CardStep): number | null => (s.activityId && ed.dates[s.activityId] != null ? parseDay(ed.dates[s.activityId], nowMs) : s.ms);
  const kept = p.steps.filter((s) => !(s.activityId && ed.removed.includes(s.activityId)));
  const edBad = useMemo(() => {
    for (const s of p.steps) if (s.activityId && ed.dates[s.activityId] != null && parseDay(ed.dates[s.activityId], nowMs) == null) return `“${s.title}”: write the date as 10 May 2026`;
    let prev = -Infinity;
    for (const s of kept) {
      const ms = stepMs(s);
      if (ms == null) continue;
      if (ms > nowMs) return `“${s.title}” can’t be in the future`;
      if (ms + 1 < prev) return `“${s.title}” is dated before the step above it`;
      prev = ms;
    }
    if (ed.added) {
      const ms = parseDay(ed.added.date, nowMs);
      if (ms == null) return "The new step: write the date as 10 May 2026";
      if (ms > nowMs) return "The new step can’t be in the future";
      if (ms + 1 < prev) return "The new step is dated before the last one";
      if (!ed.added.kind) return "Choose what the new step was";
    }
    if (ed.agent.replyWeeks != null && ed.agent.replyWeeks.trim() !== "" && !/^\d{1,2}$/.test(ed.agent.replyWeeks.trim())) return "Replies in: a number of weeks";
    return null;
  }, [ed, p.steps, nowMs]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleRemove = (id: string) => setEd((e) => {
    const all = p.removable(id);
    if (!all.length) return e;
    const on = e.removed.includes(id);
    return { ...e, removed: on ? e.removed.filter((x) => !all.includes(x)) : [...new Set([...e.removed, ...all])] };
  });

  const save = async (fn: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    try { if (await fn()) p.onMode("view"); } finally { setBusy(false); }
  };

  const editing = mode === "edit";
  const phone = p.layout === "phone";
  const sheetView = phone && !!p.sheet && !editing;
  const [allStory, setAllStory] = useState(false);
  useEffect(() => { setAllStory(false); }, [r.id]);
  /* the phone's "Your next step": the strip's own sentence and button, above the tabs */
  const nextBlock = phone && !editing && r.court !== "closed" ? (
    <div className="qc149c-nx" data-qc149c="next-block">
      {p.nextArt ? <img className="qc149c-nxart" src={p.nextArt.src} width={p.nextArt.w} height={p.nextArt.h} alt="" aria-hidden="true" draggable={false} data-qm1-art="quill" /> : null}
      <small>Your next step</small>
      <b data-qc149c="next-sentence">{p.strip.bold}</b>
      {p.strip.sub ? <p data-qc149c="next-sub">{p.strip.sub}</p> : null}
      <div className="qc149c-nxbtns">
        {p.strip.button && p.primary ? <button type="button" className="qc149c-nxb primary" data-qc149c="next-primary" onClick={p.onPrimary}>{p.strip.button}</button> : null}
        {p.primary?.respond
          ? <button type="button" className="qc149c-nxb" data-qc149c="next-second" onClick={p.onCloseQuery}>Close query</button>
          : <button type="button" className="qc149c-nxb" data-qc149c="next-second" onClick={() => p.onMode("respond")}>{p.agent.first ? `${p.agent.first} replied` : "They replied"}</button>}
      </div>
    </div>
  ) : null;
  const band = (
    <div className="mk-lc-band qc149c-band" data-qc149c="band" style={{ background: tone.bg, color: tone.fg }}>
      <span data-qc149c="band-word">{WHERE_LABEL[where].label}</span>
      <span className="qc149c-rt">
        {r.dayN != null ? <span className="mk-lc-day" data-qc149c="day"><span className="mk-odo-dk">Day</span> <span>{r.dayN}</span></span> : null}
        {phone ? null : <button type="button" className="qc149c-x" data-qc149c="close" aria-label="Close the query" onClick={p.onClose}>×</button>}
      </span>
    </div>
  );
  const agentRow = (
    <div className="mk-lc-agent qc149c-agent">
      <span className="mk-lc-disc qc149c-disc">{r.initials}</span>
      <div className="qc149c-who"><div className="mk-lc-nm qcv-open-nm" data-qc149c="name">{r.agentName}</div><div className="mk-lc-ag">{r.agency}</div></div>
      <span className="mk-lc-pill qc149c-pill" data-qc149c="pill" style={{ background: tone.pill }}><StatusDot status={r.status} overrideSize={15} />{STAGE_NAME[r.status]}</span>
    </div>
  );
  /* v149.1 A1 — the landing card's book tile beside QUERYING, the title and its chips: age category · genre · word
     count (each only when the record has it), then the package chip in its lilac */
  const book = (
    <div className="mk-lc-ms qc149c-ms" data-qc149c="book-block">
      <span className="qc149c-bk" data-qc149c="book-tile" aria-hidden="true">{BOOK}</span>
      <div className="qc149c-bkt">
        <small>QUERYING</small>
        <b data-qc149c="book">{p.msTitle ?? "No manuscript"}</b>
        {editing && p.packageChoices.length ? (
          <select className="qc149c-pksel" data-qc149c="pkg-select" aria-label="Package" value={ed.packageKey ?? p.packageKey ?? ""}
            onChange={(e) => setEd((x) => ({ ...x, packageKey: e.target.value }))}>
            {p.packageChoices.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        ) : (
          <div className="mk-lc-chips qc149c-mc">
            {p.bookChips.map((c) => <span key={c} data-qc149c="book-chip">{c}</span>)}
            <span className="qc149c-pk" data-qc149c="package">{p.packageName ? packageChip(p.packageName) : "No package"}</span>
          </div>
        )}
      </div>
    </div>
  );

  /* ── respond mode ── */
  if (mode === "respond") {
    /* Contact list v25.1 B — the band is the header: "Recording response", and the answer's line once one is picked (it
       changes with the pick). The mode's own "Recording a response" label goes: the header says it. */
    const head = (
      <FlowHead title={FLOW_WORDS.record.title} line={pick ? RECORD_LINE[pick] : null} onClose={p.onClose} closeLabel="Close the query"
        data={{ "data-qc149c": "band" }} closeData={{ "data-qc149c": "close" }}
        right={r.dayN != null ? <span className="mk-lc-day" data-qc149c="day"><span className="mk-odo-dk">Day</span> <span>{r.dayN}</span></span> : null} />
    );
    return (
      <div className="qc149c qcv-legacy" data-qc149c="card" data-mode="respond" data-id={r.id} data-where={where}>
        <div className="mk-lc-in qc149c-in">
          {head}{agentRow}{book}
          <div className="qc149c-md" data-qc149c="respond">
            <h3 className="qc149c-h3">What did {first} say?</h3>
            <div role="radiogroup" aria-label={`What did ${first} say?`}>
              {RESP.map((o) => (
                <button key={o.k} type="button" role="radio" className="qc149c-opt" data-qc149c="resp-opt" data-k={o.k} aria-checked={pick === o.k} onClick={() => setPick(o.k)}>
                  <i aria-hidden="true" />{o.label}<small>{o.hint}</small>
                </button>
              ))}
            </div>
            <label className="qc149c-fld"><span>Date</span>
              <input className="qc149c-inp" data-qc149c="resp-date" value={rDay} aria-invalid={!!rBad} onChange={(e) => setRDay(e.target.value)} /></label>
            <label className="qc149c-fld"><span>Note</span>
              <textarea className="qc149c-inp" data-qc149c="resp-note" value={rNote} placeholder="Anything they said worth keeping" onChange={(e) => setRNote(e.target.value)} /></label>
            <p className="qc149c-hint">{rBad && rDay.trim() ? <b className="qc149c-err">{rBad}.</b> : null} Saving adds this to the query’s story and moves it on.</p>
          </div>
          <div className="qc149c-mft">
            <button type="button" className="qc149c-cx" data-qc149c="cancel" onClick={() => p.onMode("view")}>Cancel</button>
            <span className="qc149c-sp" />
            <button type="button" className="qc149c-save" data-qc149c="save-response" disabled={!pick || !!rBad || busy}
              onClick={() => save(async () => { const ok = await p.onRespond(pick!, rDayMs!, rNote); if (ok) setTab("tracking"); return ok; })}>Save response</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── view and edit share the panes ── */
  const tabsRow = (
    <div className="mk-lc-tabs qc149c-tabs" role="tablist" aria-label="The query">
      {(["tracking", "agent", "materials", "notes"] as const).map((t) => (
        <button key={t} type="button" role="tab" className="qc149c-tab" data-qc149c="tab" data-tab={t} aria-selected={tab === t}
          disabled={editing && t === "notes"} onClick={() => setTab(t)}>
          {t === "tracking" ? "Tracking" : t === "agent" ? "Agent" : t === "materials" ? "Materials" : "Notes"}
        </button>
      ))}
    </div>
  );
  const sentChips = editing
    ? p.pieces.map((pc) => {
      const on = ed.pieces[pc.key] ?? pc.on;
      return <button key={pc.key} type="button" className={`qc149c-piece${on ? "" : " off"}`} data-qc149c="piece" data-k={pc.key} aria-pressed={on}
        onClick={() => setEd((x) => ({ ...x, pieces: { ...x.pieces, [pc.key]: !on } }))}>{DOC}{pc.label}</button>;
    })
    : p.sent.map((s) => <span key={s.label}>{DOC}{s.label}</span>);

  const panes = (
    <>
      <div className="qc149c-pane qc149c-trk" data-qc149c="pane" data-pane="tracking" hidden={sheetView ? false : tab !== "tracking"} role="tabpanel">
        {!editing ? (
          <>
            {sheetView ? (
              <>
                <StageTrack index={stageIndex(r.status, p.story.map((x) => x.status))} status={r.status} />
                <h4 className="qc149c-qsec">The latest</h4>
              </>
            ) : null}
            <ol className="qc149c-story" data-qc149c="steps">
              {p.story.length + (p.nextStep ? 1 : 0) > 1 ? <i className="qc149c-srail" aria-hidden="true" /> : null}
              {p.story.map((s, si) => (
                <li key={s.key} className={`qc149c-st${p.freshKey && (s.activityId === p.freshKey || s.key === p.freshKey) ? " fresh" : ""}${sheetView && !allStory && si < p.story.length - 3 ? " qc149c-old" : ""}`}
                  data-qc149c="step" data-status={s.status ?? undefined} data-kind={s.kind ?? undefined} data-activity={s.activityId}>
                  {s.kind === "nudge" ? NUDGE_G : s.kind === "holding" ? HOLD_G : s.status ? <span className="qc149c-g"><StatusDot status={s.status} overrideSize={17} /></span> : HOLD_G}
                  <div className="qc149c-sb">
                    <div className="qc149c-tl">
                      <span className="qc149c-t" data-qc149c="step-title">{s.title}{s.qualifier ? <> <em data-qc149c="step-qual">{s.qualifier}</em></> : null}</span>
                      {s.ms != null ? <span className="qc149c-d" data-qc149c="step-day">{stepDay(s.ms, nowMs)}</span>
                        : s.activityId ? <button type="button" className="qc149c-adddate" data-qc149c="add-date" onClick={() => addDate(s.activityId!)}>Add date</button>
                        : <span className="qc149c-d" data-qc149c="step-day" />}
                    </div>
                    {s.note ? <div className="qc149c-sub" data-qc149c="step-note">“{s.note}”</div> : null}
                    {s.chips.length ? (
                      <div className="qc149c-chs" data-qc149c="chips">
                        {s.chips.map((c) => (
                          <span key={c.label} className={`qc149c-ch${c.tone === "plain" ? "" : ` ${c.tone}`}`} data-qc149c="chip" data-tone={c.tone}>
                            {c.tone === "ok" ? TICK : CHIP_ICON[c.icon]}{c.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
              {p.nextStep ? (
                <li className="qc149c-st next" data-qc149c="next-step">
                  {NEXT_G}
                  <div className="qc149c-sb">
                    <div className="qc149c-tl"><span className="qc149c-t" data-qc149c="next-title">{p.nextStep.title}</span></div>
                    <div className="qc149c-sub" data-qc149c="next-why">{p.nextStep.why}</div>
                  </div>
                </li>
              ) : null}
            </ol>
            {sheetView && p.story.length > 3 ? (
              <button type="button" className="qc149c-whole" data-qc149c="whole-story" aria-expanded={allStory} onClick={() => setAllStory((v) => !v)}>
                {allStory ? "Show the latest" : "See the whole story"}
              </button>
            ) : null}
            {/* v149.1 A3 — the action strip, at the foot of the pane: what is happening, the choice, and the next move */}
            {phone ? null : <div className="qc149c-strip" data-qc149c="strip" data-kind={p.strip.kind} style={{ background: STRIP_TINT[where] }}>
              {SPARK}
              <p><b data-qc149c="strip-bold">{p.strip.bold}</b>{p.strip.sub ? <span data-qc149c="strip-sub">{p.strip.sub}</span> : null}</p>
              {p.strip.button && p.primary ? <button type="button" className="qc149c-sbtn" data-qc149c="strip-btn" onClick={p.onPrimary}>{p.strip.button}</button> : null}
            </div>}
          </>
        ) : (
        <ol className="mk-lc-steps qc149c-steps" data-qc149c="steps">
          {p.steps.length > 1 ? <i className="mk-lc-rail qc149c-rail" aria-hidden="true" /> : null}
          {p.steps.map((s, i) => {
            const gone = !!s.activityId && ed.removed.includes(s.activityId);
            return (
              <li key={s.key} className={`mk-lc-step qc149c-step${gone ? " gone" : ""}${p.freshKey && (s.activityId === p.freshKey || s.key === p.freshKey) ? " fresh" : ""}`}
                data-qc149c="step" data-status={s.status ?? undefined} data-activity={s.activityId}>
                <span className="qc142-g" aria-hidden="true">{s.status ? <StatusDot status={s.status} overrideSize={15} /> : <i className="qc142-dot" />}</span>
                <span className="mk-lc-t" data-qc149c="step-title">{s.title}</span>
                {editing && s.activityId && !gone ? (
                  <input className="qc149c-ed-d" data-qc149c="step-date" aria-label={`${s.title}: date`} autoFocus={focusDate === s.activityId}
                    onFocus={() => { if (focusDate === s.activityId) setFocusDate(null); }}
                    value={ed.dates[s.activityId] ?? (s.ms != null ? fieldDay(s.ms) : "")}
                    onChange={(e) => { const v = e.target.value; setEd((x) => ({ ...x, dates: { ...x.dates, [s.activityId!]: v } })); }} />
                ) : (
                  <span className="mk-lc-d" data-qc149c="step-day">{s.ms != null ? stepDay(s.ms, nowMs) : ""}</span>
                )}
                {editing ? (
                  s.activityId && !s.root ? (
                    <button type="button" className="qc149c-rm" data-qc149c="step-remove" aria-pressed={gone} title={gone ? "Keep this step" : "Remove this step"}
                      aria-label={gone ? `Keep ${s.title}` : `Remove ${s.title}`} onClick={() => toggleRemove(s.activityId!)}>{gone ? "↺" : "×"}</button>
                  ) : <span />
                ) : null}
                {i === 0 && (sentChips.length || editing) ? (
                  <span className="mk-lc-att qc149c-att" data-qc149c="sent-with">{sentChips}</span>
                ) : null}
              </li>
            );
          })}
          {editing && ed.added ? (
            <li className="mk-lc-step qc149c-step fresh" data-qc149c="step-new">
              <span className="qc142-g" aria-hidden="true"><i className="qc142-dot" /></span>
              <select className="qc149c-pksel qc149c-kind" data-qc149c="new-kind" aria-label="What the new step was" value={ed.added.kind}
                onChange={(e) => { const v = e.target.value; setEd((x) => ({ ...x, added: x.added ? { ...x.added, kind: v } : null })); }}>
                <option value="">Choose…</option>
                {p.stepChoices.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <input className="qc149c-ed-d" data-qc149c="new-date" aria-label="The new step's date" value={ed.added.date}
                onChange={(e) => { const v = e.target.value; setEd((x) => ({ ...x, added: x.added ? { ...x.added, date: v } : null })); }} />
              <button type="button" className="qc149c-rm" aria-label="Drop the new step" onClick={() => setEd((x) => ({ ...x, added: null }))}>×</button>
            </li>
          ) : null}
        </ol>
        )}
        {editing && !ed.added && p.stepChoices.length ? (
          <button type="button" className="qc149c-addstep" data-qc149c="add-step" onClick={() => setEd((x) => ({ ...x, added: { kind: "", date: fieldDay(nowMs) } }))}>+ Add a step</button>
        ) : null}
      </div>
      <div className="qc149c-pane" data-qc149c="pane" data-pane="agent" hidden={sheetView ? false : tab !== "agent"} role="tabpanel">
        {sheetView ? <h4 className="qc149c-qsec">About {p.agent.first || "the agent"}</h4> : null}
        {!editing ? <AgentPane p={p} first={p.agent.first} /> : (
        <div className="qc149c-pg">
          <dl className="qc149c-kv">
            {([
              ["name", "Agent", p.agent.name],
              ["agency", "Agency", p.agent.agency],
              ["first", "First queried", p.agent.firstQueried],
              ["replyWeeks", "Replies in", p.agent.replyWeeks != null ? `About ${p.agent.replyWeeks} week${p.agent.replyWeeks === 1 ? "" : "s"}` : "Not stated"],
              ["email", "Email", p.agent.email || "Not recorded"],
            ] as const).map(([k, l, v]) => (
              <React.Fragment key={k}>
                <dt>{l}</dt>
                <dd data-qc149c="kv" data-k={k}>
                  {editing && k !== "first" ? (
                    <input className="qc149c-kvin" data-qc149c="agent-field" data-k={k} aria-label={l}
                      value={ed.agent[k] ?? (k === "replyWeeks" ? (p.agent.replyWeeks != null ? String(p.agent.replyWeeks) : "") : k === "email" ? p.agent.email : k === "name" ? p.agent.name : p.agent.agency)}
                      placeholder={k === "replyWeeks" ? "Weeks" : undefined}
                      onChange={(e) => { const val = e.target.value; setEd((x) => ({ ...x, agent: { ...x.agent, [k]: val } })); }} />
                  ) : v}
                </dd>
              </React.Fragment>
            ))}
          </dl>
          {editing ? <p className="qc149c-hint" data-qc149c="agent-note">{p.agent.first ? `These are ${p.agent.first}’s details` : "These are the agent’s details"} in your Contact list, so changing them changes them everywhere.</p> : (
            <div className="qc149c-lnks">
              <button type="button" className="qc149c-lnk" data-qc149c="contact-list" onClick={p.onContactList}>Open in Contact list</button>
              {p.agent.email ? <button type="button" className="qc149c-lnk" data-qc149c="copy-email" onClick={p.onCopyEmail}>Copy email</button> : null}
            </div>
          )}
        </div>
        )}
      </div>
      <div className="qc149c-pane" data-qc149c="pane" data-pane="materials" hidden={sheetView ? false : tab !== "materials"} role="tabpanel">
        {sheetView ? <h4 className="qc149c-qsec">What you sent</h4> : null}
        <div className="qc149c-pg qc149c-mt">
          <h5>Package</h5>
          <div className="qc149c-mrow" data-qc149c="mat-package">{p.packageName ?? "No package"}
            {!editing ? <button type="button" className="qc149c-small" data-qc149c="mat-change" onClick={() => { p.onMode("edit"); setTab("tracking"); }}>Change</button> : null}</div>
          <h5>What you sent</h5>
          {p.sent.length ? p.sent.map((s) => (
            <div key={s.label} className="qc149c-mrow" data-qc149c="mat-piece">{DOC}{s.label}
              <button type="button" className="qc149c-small" onClick={() => p.onOpenPiece(s.label)}>Open</button></div>
          )) : <div className="qc149c-mrow"><i>Nothing logged yet</i></div>}
        </div>
      </div>
      <div className="qc149c-pane" data-qc149c="pane" data-pane="notes" hidden={sheetView ? true : tab !== "notes"} role="tabpanel">
        <NotesPane first={p.agent.first} notes={p.notes} onAdd={p.onAddNote} resetKey={r.id} />
      </div>
    </>
  );

  if (sheetView) {
    /* the sheet's pinned foot: the next step on a live query; on a closed one, the wall it went to (ref nextBlock) */
    const closedFoot = r.court === "closed" ? (
      <div className="qc149c-nx qc149c-nx--closed" data-qc149c="next-block">
        <small>Your next step</small>
        <b data-qc149c="next-sentence">{STAGE_NAME[r.status] ?? r.status}</b>
        <p data-qc149c="next-sub">It’s on your Wall of no</p>
        <div className="qc149c-nxbtns"><button type="button" className="qc149c-nxb" data-qc149c="next-wall" onClick={p.onWall}>View the wall</button></div>
      </div>
    ) : null;
    return (
      <div className="qc149c qcv-legacy qc149c--sheet" data-qc149c="card" data-mode={mode} data-id={r.id} data-where={where} data-sheet="">
        {band}
        <div className="qc149c-sheetbody" data-qc149c="sheet-body">
          <div className="qc149c-sheethead">
            {agentRow}
            {p.onMore ? <button type="button" className="qc149c-more3" data-qc149c="more-btn" aria-label="More actions" aria-haspopup="dialog" onClick={p.onMore}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="5.5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="18.5" cy="12" r="1.2" fill="currentColor" /></svg>
            </button> : null}
          </div>
          {panes}
        </div>
        <div className="qc149c-sheetfoot" data-qc149c="next-pinned">{nextBlock ?? closedFoot}</div>
      </div>
    );
  }

  return (
    <div className={`qc149c qcv-legacy${editing ? " editing" : ""}`} data-qc149c="card" data-mode={mode} data-id={r.id} data-where={where}>
      <div className="mk-lc-in qc149c-in">
        {band}
        {editing ? <div className="qc149c-edbar" data-qc149c="edit-bar"><i aria-hidden="true" />Editing this query</div> : null}
        {agentRow}{book}{nextBlock}{tabsRow}
        {panes}
        {editing ? (
          <div className="qc149c-mft">
            <button type="button" className="qc149c-cx" data-qc149c="cancel" onClick={() => p.onMode("view")}>Cancel</button>
            {edBad ? <span className="qc149c-err" data-qc149c="edit-error">{edBad}</span> : <span className="qc149c-sp" />}
            <button type="button" className="qc149c-save" data-qc149c="save-edits" disabled={!!edBad || busy} onClick={() => save(() => p.onSaveEdits(ed))}>Save changes</button>
          </div>
        ) : (
          <>
            {/* v149.1 A4 — two rows: the due line, then the three links and ‹ N / M ›; the primary is the strip's button */}
            <div className="qc149c-ft2" data-qc149c="footer">
              <div className="qc149c-l1" data-qc149c="foot-l1">
                {p.due ? <span className={`qc149c-w${p.due.hot ? " hot" : ""}`} data-qc149c="due" data-hot={p.due.hot ? "" : undefined}>{CLOCK}<em>{p.due.line}</em></span> : null}
              </div>
            <div className="qc149c-more qc149c-l2" data-qc149c="more">
              {phone ? null : <>
              <button type="button" data-qc149c="record" onClick={() => p.onMode("respond")}>Record a response</button>
              <button type="button" data-qc149c="edit" onClick={() => p.onMode("edit")}>Edit query</button>
              {r.court !== "closed" ? <button type="button" data-qc149c="close-query" onClick={p.onCloseQuery}>Close query</button> : null}
              </>}
              <span className="qc149c-sp" />
              <span className="qc149c-nvb" data-qc149c="nav">
                <button type="button" data-qc149c="prev" aria-label="Previous query" disabled={p.index <= 0} onClick={() => p.onStep(-1)}>{LEFT}</button>
                <span data-qc149c="pos">{p.index + 1} / {p.total}</span>
                <button type="button" data-qc149c="next" aria-label="Next query" disabled={p.index >= p.total - 1} onClick={() => p.onStep(1)}>{RIGHT}</button>
              </span>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/** Phone app v2, Part 3 — the four-step stage track (ref qsheet.js `stageTrack`): Queried · Partial · Full · Offer, the
 *  current step marked with its own glyph and its stage name, the steps before it filled */
const StageTrack: React.FC<{ index: number; status: QueryStatus | string }> = ({ index, status }) => (
  <div className="qc149c-stg" data-qc149c="stage-track" data-index={index}>
    {STAGE_STEPS.map((w, j) => (
      <React.Fragment key={w}>
        {j > 0 ? <i className="qc149c-stgl" aria-hidden="true" data-on={j <= index ? "" : undefined} /> : null}
        <div className={`qc149c-stgi${j <= index ? " on" : ""}${j === index ? " now" : ""}`} data-qc149c="stage" data-on={j <= index ? "" : undefined} data-now={j === index ? "" : undefined}>
          <span className="qc149c-stgd">{j === index ? <StatusDot status={status} overrideSize={18} decorative /> : null}</span>
          <span className="qc149c-stgw">{j === index ? (STAGE_NAME[status as QueryStatus] ?? w) : w}</span>
        </div>
      </React.Fragment>
    ))}
  </div>
);

/** v149.1 A5 — the Agent tab: what they're looking for, four facts, every query to them, how to reach them */
const MAIL = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l8.5 6 8.5-6" /></svg>;
const WEB = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
const FORM = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>;
const AgentPane: React.FC<{ p: QcQueryCard149Props; first: string | null }> = ({ p, first }) => {
  const who = first || "the agent";
  return (
    <div className="qc149c-pg qc149c-ag" data-qc149c="agent-pane">
      <div className="qc149c-wl" data-qc149c="wishlist">
        <span className="qc149c-k">What {first ? `${first}’s` : "they’re"} looking for</span>
        {p.wishlist.text ? <q data-qc149c="wish-text">{p.wishlist.text}</q>
          : <button type="button" className="qc149c-add" data-qc149c="wish-add" onClick={() => p.onAgentField("wishlist")}>+ Add their wishlist</button>}
        {p.wishlist.genres.length ? (
          <div className="qc149c-gs">{p.wishlist.genres.map((g) => <span key={g.label} className={g.hit ? "hit" : undefined} data-qc149c="genre" data-hit={g.hit ? "" : undefined}>{g.label}</span>)}</div>
        ) : null}
      </div>
      <div className="qc149c-facts" data-qc149c="facts">
        {p.agentView.facts.map((f) => (
          <div key={f.key} data-qc149c="fact" data-k={f.key} data-known={f.known ? "" : undefined}>
            <span className="qc149c-k">{f.label}</span><b>{f.value}</b>{f.sub ? <small>{f.sub}</small> : null}
          </div>
        ))}
      </div>
      <div className="qc149c-hist" data-qc149c="history">
        <span className="qc149c-k">You and {who}</span>
        {p.agentView.history.map((h) => (
          <div key={h.id} className="qc149c-hrow" data-qc149c="hist-row" data-id={h.id} data-current={h.current ? "" : undefined}>
            <span className="qc149c-hg"><StatusDot status={h.status} overrideSize={17} /></span>
            <span className="qc149c-ht">{h.title}{h.when ? <em> · {h.when}</em> : null}</span>
            <span className={`qc149c-hs${h.current ? " cur" : ""}`}>{STAGE_NAME[h.status] ?? h.status}</span>
          </div>
        ))}
      </div>
      <div className="qc149c-ct" data-qc149c="contact">
        <span className="qc149c-k">Contact</span>
        <div className="qc149c-crow" data-qc149c="ct-row" data-k="email">{MAIL}
          {p.contact.email ? <><span className="qc149c-cv">{p.contact.email}</span><button type="button" className="qc149c-act" data-qc149c="ct-act" onClick={p.onCopyEmail}>COPY</button></>
            : <button type="button" className="qc149c-add" data-qc149c="ct-add" onClick={() => p.onAgentField("email")}>+ Add email</button>}
        </div>
        <div className="qc149c-crow" data-qc149c="ct-row" data-k="website">{WEB}
          {p.contact.website ? <><span className="qc149c-cv">{p.contact.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>{p.contact.websiteHref ? <a className="qc149c-act" data-qc149c="ct-act" href={p.contact.websiteHref} target="_blank" rel="noreferrer">OPEN</a> : null}</>
            : <button type="button" className="qc149c-add" data-qc149c="ct-add" onClick={() => p.onAgentField("website")}>+ Add website</button>}
        </div>
        <div className="qc149c-crow" data-qc149c="ct-row" data-k="submission">{FORM}
          {p.contact.submission ? <span className="qc149c-cv">{p.contact.submission}</span>
            : <button type="button" className="qc149c-add" data-qc149c="ct-add" onClick={() => p.onAgentField("method")}>+ Add how {who} takes queries</button>}
        </div>
      </div>
      <div className="qc149c-lk">
        <button type="button" className="qc149c-lnk" data-qc149c="contact-list" onClick={p.onContactList}>Open in Contact list</button>
        <button type="button" className="qc149c-lnk" data-qc149c="edit-agent" onClick={() => p.onAgentField(null)}>Edit agent</button>
      </div>
    </div>
  );
};

/** the Notes pane: the query's own notes (the journal), newest first, and one field that adds a note on blur */
const NotesPane: React.FC<{ first: string | null; notes: { id: string; text: string; when: string }[]; onAdd: (t: string) => void; resetKey: string }> = ({ first, notes, onAdd, resetKey }) => {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setDraft(""); }, [resetKey]);
  const commit = () => { const t = draft.trim(); if (t) { onAdd(t); setDraft(""); } };
  return (
    <div className="qc149c-pg" data-qc149c="notes">
      <textarea ref={ref} className="qc149c-note" data-qc149c="note-field" value={draft} placeholder={first ? `Notes on this query for ${first}: what they said, what to try next` : "Notes on this query: what they said, what to try next"}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
      {notes.map((n) => (
        <div key={n.id} className="qc149c-noteitem" data-qc149c="note"><small>{n.when}</small><p>{n.text}</p></div>
      ))}
    </div>
  );
};

/** the response choice for a row whose next move is answering: QueryStatus has no "received" for these */
export const RESP_STATUS: Record<RespChoice, QueryStatus> = {
  partial: QueryStatus.PARTIAL_REQUESTED, full: QueryStatus.FULL_REQUESTED, pass: QueryStatus.REJECTED, offer: QueryStatus.OFFER,
};
