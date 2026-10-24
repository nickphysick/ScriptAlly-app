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
import "../../../marketing/heroCard.css";
import "./qcv149card.css";


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
  stand: { heading: string; text: string } | null;
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
  const band = (
    <div className="mk-lc-band qc149c-band" data-qc149c="band" style={{ background: tone.bg, color: tone.fg }}>
      <span data-qc149c="band-word">{WHERE_LABEL[where].label}</span>
      <span className="qc149c-rt">
        {r.dayN != null ? <span className="mk-lc-day" data-qc149c="day"><span className="mk-odo-dk">Day</span> <span>{r.dayN}</span></span> : null}
        <button type="button" className="qc149c-x" data-qc149c="close" aria-label="Close the query" onClick={p.onClose}>×</button>
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
  const book = (
    <div className="mk-lc-ms qc149c-ms">
      <small>QUERYING</small>
      <b data-qc149c="book">{p.msTitle ?? "No manuscript"}</b>
      {editing && p.packageChoices.length ? (
        <select className="qc149c-pksel" data-qc149c="pkg-select" aria-label="Package" value={ed.packageKey ?? p.packageKey ?? ""}
          onChange={(e) => setEd((x) => ({ ...x, packageKey: e.target.value }))}>
          {p.packageChoices.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      ) : (
        <div className="mk-lc-chips"><span data-qc149c="package">{packageChip(p.packageName)}</span></div>
      )}
    </div>
  );

  /* ── respond mode ── */
  if (mode === "respond") {
    return (
      <div className="qc149c qcv-legacy" data-qc149c="card" data-mode="respond" data-id={r.id} data-where={where}>
        <div className="mk-lc-in qc149c-in">
          {band}{agentRow}{book}
          <div className="qc149c-md" data-qc149c="respond">
            <div className="qc149c-lb">Recording a response</div>
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
      <div className="qc149c-pane" data-qc149c="pane" data-pane="tracking" hidden={tab !== "tracking"} role="tabpanel">
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
                  <input className="qc149c-ed-d" data-qc149c="step-date" aria-label={`${s.title}: date`}
                    value={ed.dates[s.activityId] ?? (s.ms != null ? fieldDay(s.ms) : "")}
                    onChange={(e) => { const v = e.target.value; setEd((x) => ({ ...x, dates: { ...x.dates, [s.activityId!]: v } })); }} />
                ) : (
                  <span className="mk-lc-d" data-qc149c="step-day">{s.ms != null ? stepDay(s.ms, nowMs) : "NOT DATED"}</span>
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
        {editing && !ed.added && p.stepChoices.length ? (
          <button type="button" className="qc149c-addstep" data-qc149c="add-step" onClick={() => setEd((x) => ({ ...x, added: { kind: "", date: fieldDay(nowMs) } }))}>+ Add a step</button>
        ) : null}
        {!editing && p.stand ? (
          <div className="qc149c-stand" data-qc149c="stand" style={{ ["--qc149c-sb" as string]: tone.pill, ["--qc149c-sf" as string]: tone.fg }}>
            <small>{p.stand.heading}</small>
            <p>{p.stand.text}</p>
          </div>
        ) : null}
      </div>
      <div className="qc149c-pane" data-qc149c="pane" data-pane="agent" hidden={tab !== "agent"} role="tabpanel">
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
      </div>
      <div className="qc149c-pane" data-qc149c="pane" data-pane="materials" hidden={tab !== "materials"} role="tabpanel">
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
      <div className="qc149c-pane" data-qc149c="pane" data-pane="notes" hidden={tab !== "notes"} role="tabpanel">
        <NotesPane first={p.agent.first} notes={p.notes} onAdd={p.onAddNote} resetKey={r.id} />
      </div>
    </>
  );

  return (
    <div className={`qc149c qcv-legacy${editing ? " editing" : ""}`} data-qc149c="card" data-mode={mode} data-id={r.id} data-where={where}>
      <div className="mk-lc-in qc149c-in">
        {band}
        {editing ? <div className="qc149c-edbar" data-qc149c="edit-bar"><i aria-hidden="true" />Editing this query</div> : null}
        {agentRow}{book}{tabsRow}
        {panes}
        {editing ? (
          <div className="qc149c-mft">
            <button type="button" className="qc149c-cx" data-qc149c="cancel" onClick={() => p.onMode("view")}>Cancel</button>
            {edBad ? <span className="qc149c-err" data-qc149c="edit-error">{edBad}</span> : <span className="qc149c-sp" />}
            <button type="button" className="qc149c-save" data-qc149c="save-edits" disabled={!!edBad || busy} onClick={() => save(() => p.onSaveEdits(ed))}>Save changes</button>
          </div>
        ) : (
          <>
            <div className="mk-lc-ft qc149c-ft">
              {p.due ? <span className={p.due.hot ? "mk-late" : undefined} data-qc149c="due" data-hot={p.due.hot ? "" : undefined}>{CLOCK}<em>{p.due.line}</em></span> : <span />}
              {p.primary ? <button type="button" className="qc149c-primary" data-qc149c="primary" onClick={p.onPrimary}>{p.primary.label}</button> : null}
            </div>
            <div className="qc149c-more" data-qc149c="more">
              <button type="button" data-qc149c="record" onClick={() => p.onMode("respond")}>Record a response</button>
              <button type="button" data-qc149c="edit" onClick={() => p.onMode("edit")}>Edit query</button>
              {r.court !== "closed" && !p.primary?.close ? <button type="button" data-qc149c="close-query" onClick={p.onCloseQuery}>Close query</button> : null}
              <span className="qc149c-sp" />
              <span className="qc149c-nvb" data-qc149c="nav">
                <button type="button" data-qc149c="prev" aria-label="Previous query" disabled={p.index <= 0} onClick={() => p.onStep(-1)}>{LEFT}</button>
                <span data-qc149c="pos">{p.index + 1} / {p.total}</span>
                <button type="button" data-qc149c="next" aria-label="Next query" disabled={p.index >= p.total - 1} onClick={() => p.onStep(1)}>{RIGHT}</button>
              </span>
            </div>
          </>
        )}
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
