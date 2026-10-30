/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Edit this query" on a phone (phone last screens v1, 9B and 10B; mocks `editB1`, `rwB`).
 *
 * A page of six sections — Agent · What you sent · How and when · Reply window · Their responses ·
 * Notes — each opening a one-question screen with the query card in the navy band (the field being
 * changed in blush wash), the question, the control, and Cancel / Save pinned at the foot.
 *
 * ⚠️ EVERY FIELD AND EVERY SAVE IS THE EDIT DRAWER'S. Each Save builds the drawer's own
 * `QueryEditOps` for that section's fields and calls `commitQueryEdits` — the drawer's write, in one
 * batch — with the drawer's own rules (materials ⟷ package via `editMaterialsUpdate`; the package is
 * stamped only when it is not already locked; the timeline is checked by `validateTimeline`; the
 * reply window is the drawer's `writerExpectedDate` at noon). Notes use the drawer's
 * `addJournalEntry`. Nothing is written another way.
 *
 * Changes save as they are made, with Undo: a snapshot of the query is taken before each save and
 * the snackbar's Undo puts it back.
 *
 * ⚠️ THE REPLY WINDOW STORES A DATE, SO DAYS ARE KEPT. The drawer's field is the writer's expected
 * date, not a count of weeks, so weeks + days from the wheel land exactly (sent date + n days) and
 * nothing is rounded.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { Agent, Query, QueryStatus } from "../../../types";
import { agentPrimary, agentSecondary, AGENT_NOT_SPECIFIED } from "../../../lib/agentDisplay";
import { commitQueryEdits, type QueryEditOps } from "../../../lib/saveQueryEdits";
import { editMaterialsUpdate, isPackageLocked } from "../../../lib/packageMetrics";
import { formatQueryMaterial } from "../../../lib/materials";
import { writerExpectedIso } from "../../../lib/expectedDate";
import { getActivityTime, normalizeResultingStatus } from "../../../lib/queryDerivation";
import { validateTimeline, appendNoteFor, ADVANCE_OPTIONS } from "../../../lib/queryTimelineEdit";
import { takeSnapshot, restoreSnapshot } from "../../../lib/queryActions/snapshot";
import { showUndoBar, openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { formatDate } from "../../../lib/dates";
import { METHOD_OPTIONS, IF_NO_RESPONSE_OPTIONS, REJECTION_TYPE_OPTIONS } from "../../EditQueryDrawer";
import "./editQueryPhone.css";

type Section = "agent" | "sent" | "howwhen" | "reply" | "responses" | "notes";
interface Rung { id: string; status: QueryStatus | null; timeMs: number }

const DAY = 86_400_000;
const toInput = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fromInput = (s: string, hour: number) => { const [y, m, d] = s.split("-").map(Number); return y && m && d ? new Date(y, m - 1, d, hour).getTime() : NaN; };
const dm = (ms: number) => formatDate(new Date(ms), { day: "numeric", month: "short" });
const wdm = (ms: number) => formatDate(new Date(ms), { weekday: "short", day: "numeric", month: "short" });
const AUTO_NO = IF_NO_RESPONSE_OPTIONS[1];
const NUDGE = IF_NO_RESPONSE_OPTIONS[0];
const CLOSED_REVIEW = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.WITHDRAWN]);
const CHIP_WEEKS = [6, 8, 12, 16];

export const EditQueryPhone: React.FC<{ query: Query; onClose: () => void; onDelete: (id: string) => void }> = ({ query, onClose, onDelete }) => {
  const { agents, manuscripts, packages, currentUser, addJournalEntry, journalEntries, deleteJournalEntry } = useScriptAllyDb();
  const [open, setOpen] = useState<Section | null>(null);
  /* the latest entries, read when Undo is pressed (the closure would hold the list from before the note) */
  const jRef = useRef(journalEntries);
  jRef.current = journalEntries;
  const [rungs, setRungs] = useState<Rung[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const ref = fsQuery(collection(db, "users", currentUser.id, "queries", query.id, "activity"), orderBy("createdAt", "asc"));
    return onSnapshot(ref, (snap) => setRungs(snap.docs.map((d) => {
      const x = d.data();
      return { id: d.id, status: normalizeResultingStatus(x.resultingStatus) ?? normalizeResultingStatus(x.type), timeMs: getActivityTime(x.createdAt) };
    })), () => { /* a read error must not crash the page */ });
  }, [currentUser?.id, query.id]);

  const agent = (agents as Agent[]).find((a) => a.id === query.agentId) ?? null;
  const agentName = agent ? agentPrimary(agent) : AGENT_NOT_SPECIFIED;
  const agency = agent ? (agentSecondary(agent) === AGENT_NOT_SPECIFIED ? "" : agentSecondary(agent)) : "";
  const ms = manuscripts.find((m) => m.id === query.manuscriptId) ?? null;
  const pkg = packages.find((p) => p.id === query.packageId) ?? null;
  const sentMs = query.dateSent ? new Date(query.dateSent).getTime() : Date.now();
  const expIso = writerExpectedIso(query);
  const expMs = expIso ? new Date(expIso).getTime() : null;
  const materials = ((query.materialsWanted && query.materialsWanted.length ? query.materialsWanted : agent?.materialsWanted) ?? []).map(formatQueryMaterial).filter(Boolean) as string[];
  const responses = rungs.filter((r) => r.status && r.status !== QueryStatus.QUERIED);
  const journalN = journalEntries.filter((j) => j.queryId === query.id).length;

  /** The drawer's write for one section, with a snapshot first so the snackbar can undo it. */
  const save = async (ops: Partial<QueryEditOps>, label: string, extra?: () => Promise<void>, undoInstead?: () => Promise<void>) => {
    if (!currentUser || saving) return false;
    setSaving(true); setError(null);
    const snap = await takeSnapshot(currentUser.id, [query.id]);
    const full: QueryEditOps = { appends: [], edits: [], deletes: [], ...ops };
    const res = await commitQueryEdits(db, currentUser.id, query.id, full, {
      agentName, manuscriptId: full.queryFields?.manuscriptId ?? query.manuscriptId, manuscriptTitle: ms?.title || "",
    });
    if (res.ok && extra) await extra();
    setSaving(false);
    if (!res.ok) { setError("error" in res ? res.error : "Couldn’t save the query."); return false; }
    showUndoBar({ message: `${label} saved`, sub: agentName, undo: undoInstead ?? (() => restoreSnapshot(snap)) });
    setOpen(null);
    return true;
  };

  const rows: [Section, string, string][] = [
    ["agent", "Agent", [agentName, agency].filter(Boolean).join(" · ")],
    ["sent", "What you sent", pkg ? `${pkg.packageName}` : materials.length ? materials.join(", ") : "Nothing recorded"],
    ["howwhen", "How and when", `${query.sendMethod || METHOD_OPTIONS[0]} · ${dm(sentMs)}`],
    ["reply", "Reply window", expMs ? `${Math.round((expMs - sentMs) / (7 * DAY))} weeks · reply expected by ${dm(expMs)}` : "Not set"],
    ["responses", "Their responses", responses.length ? responses.map((r) => `${STAGE_NAME[r.status!] ?? r.status} ${dm(r.timeMs)}`).join(", ") : "None yet"],
    ["notes", "Notes", journalN ? `${journalN} ${journalN === 1 ? "note" : "notes"}` : "No notes"],
  ];

  const card = (field: Section, value: React.ReactNode) => (
    <div className="eqp-card" data-eqp="card">
      <div className="eqp-cardband"><span>{STAGE_NAME[query.status] ?? query.status}</span><span>Day {Math.max(0, Math.floor((Date.now() - sentMs) / DAY))}</span></div>
      <div className="eqp-cardid"><b>{agentName}</b><small>{[agency, `queried ${dm(sentMs)}`].filter(Boolean).join(" · ")}</small></div>
      <div className="eqp-cardfield" data-eqp="field" data-field={field}>{rows.find((r) => r[0] === field)![1]}: <span className="eqp-wash">{value}</span></div>
    </div>
  );

  if (open) {
    /* A note is its own document (`journalEntries`), outside the query's snapshot: its Undo removes
       the entry it added, found by its query and its text. */
    const undoNote = (text: string) => async () => {
      const mine = jRef.current.filter((j) => j.queryId === query.id && j.entryText === text).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (mine[0]) await deleteJournalEntry(mine[0].id);
    };
    const props = { query, card, save, saving, error, undoNote, onCancel: () => { setOpen(null); setError(null); }, agentName, agency, sentMs, expMs, agent, materials, rungs: responses, pkgs: packages, mss: manuscripts, agents: agents as Agent[], addJournalEntry };
    /* Portalled to <body>, above the phone sheets (z 1000–1010) and under the snackbar (1100): the
       query sheet it was opened from stays open beneath it and makes #root inert. */
    return createPortal(
      <div className="eqp" data-eqp="step" data-section={open}>
        {open === "agent" && <AgentStep {...props} />}
        {open === "sent" && <SentStep {...props} />}
        {open === "howwhen" && <HowWhenStep {...props} />}
        {open === "reply" && <ReplyStep {...props} />}
        {open === "responses" && <ResponsesStep {...props} />}
        {open === "notes" && <NotesStep {...props} />}
      </div>, document.body);
  }

  return createPortal(
    <div className="eqp" data-eqp="page">
      <div className="eqp-top">
        <div className="eqp-bar"><button type="button" className="eqp-lnk" onClick={onClose} data-eqp="back">‹ {agentName}</button><button type="button" className="eqp-lnk" onClick={onClose} data-eqp="done">Done</button></div>
        <h1 className="eqp-h">Edit this query</h1>
      </div>
      <div className="eqp-sheet">
        <div className="eqp-group">
          {rows.map(([k, label, value]) => (
            <button key={k} type="button" className="eqp-sr" data-eqp="section" data-section={k} onClick={() => setOpen(k)}>
              <span className="eqp-srt"><small>{label}</small><b>{value}</b></span><span className="eqp-chev" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
        <p className="eqp-note">Changes save as you make them, with Undo.</p>
        <div className="eqp-group">
          <button type="button" className="eqp-sr" data-eqp="close" onClick={() => { onClose(); openQueryDrawer({ mode: "close", queryId: query.id }); }}><span className="eqp-srt"><b className="eqp-strong">Close this query</b></span><span className="eqp-chev" aria-hidden="true">›</span></button>
          <button type="button" className="eqp-sr" data-eqp="delete" onClick={() => { onClose(); onDelete(query.id); }}><span className="eqp-srt"><b className="eqp-strong">Delete this query</b></span><span className="eqp-chev" aria-hidden="true">›</span></button>
        </div>
      </div>
    </div>, document.body);
};

type StepProps = {
  query: Query; card: (f: Section, v: React.ReactNode) => React.ReactNode;
  save: (ops: Partial<QueryEditOps>, label: string, extra?: () => Promise<void>, undoInstead?: () => Promise<void>) => Promise<boolean>;
  saving: boolean; error: string | null; onCancel: () => void; agentName: string; agency: string; sentMs: number; expMs: number | null;
  agent: Agent | null; materials: string[]; rungs: Rung[]; pkgs: ReturnType<typeof useScriptAllyDb>["packages"];
  mss: ReturnType<typeof useScriptAllyDb>["manuscripts"]; agents: Agent[]; addJournalEntry: (id: string, t: string) => Promise<void>;
  undoNote: (text: string) => () => Promise<void>;
};

const Step: React.FC<{ p: StepProps; field: Section; value: React.ReactNode; q: string; help?: string; onSave: () => void; canSave?: boolean; children: React.ReactNode }> = ({ p, field, value, q, help, onSave, canSave = true, children }) => (
  <>
    <div className="eqp-top">
      <div className="eqp-bar"><button type="button" className="eqp-lnk" onClick={p.onCancel} data-eqp="step-back">‹ Edit</button></div>
      {p.card(field, value)}
    </div>
    <div className="eqp-sheet eqp-sheet--step">
      <h1 className="eqp-q">{q}</h1>
      {help && <p className="eqp-help">{help}</p>}
      {children}
      {p.error && <p className="eqp-err" role="alert">{p.error}</p>}
    </div>
    <div className="eqp-pin">
      <button type="button" className="eqp-cancel" onClick={p.onCancel} data-eqp="cancel">Cancel</button>
      <button type="button" className="eqp-btn" disabled={!canSave || p.saving} onClick={onSave} data-eqp="save">{p.saving ? "Saving…" : "Save"}</button>
    </div>
  </>
);

const Radio: React.FC<{ on: boolean; onPick: () => void; label: string; sub?: string; data?: string }> = ({ on, onPick, label, sub, data }) => (
  <button type="button" role="radio" aria-checked={on} className={`eqp-opt${on ? " on" : ""}`} onClick={onPick} data-eqp="opt" data-value={data ?? label}>
    <span className="eqp-dot" aria-hidden="true" /><span><b>{label}</b>{sub ? <small>{sub}</small> : null}</span>
  </button>
);

const AgentStep: React.FC<StepProps> = (p) => {
  const [pick, setPick] = useState(p.query.agentId);
  const [find, setFind] = useState("");
  const list = p.agents.filter((a) => `${agentPrimary(a)} ${agentSecondary(a)}`.toLowerCase().includes(find.toLowerCase())).slice(0, 40);
  const picked = p.agents.find((a) => a.id === pick);
  return (
    <Step p={p} field="agent" value={picked ? agentPrimary(picked) : p.agentName} q="Who did you send it to?" help="Moving the query to another agent keeps its history."
      canSave={pick !== p.query.agentId} onSave={() => void p.save({ queryFields: { agentId: pick } }, "Agent")}>
      <input className="eqp-in" placeholder="Find an agent" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Find an agent" data-eqp="find" />
      <div className="eqp-opts" role="radiogroup">
        {list.map((a) => <Radio key={a.id} on={a.id === pick} onPick={() => setPick(a.id)} label={agentPrimary(a)} sub={agentSecondary(a)} data={a.id} />)}
      </div>
    </Step>
  );
};

const SentStep: React.FC<StepProps> = (p) => {
  const [msId, setMsId] = useState(p.query.manuscriptId);
  const [pkgId, setPkgId] = useState(p.query.packageId || "");
  const [mats, setMats] = useState<string[]>(p.materials);
  const [add, setAdd] = useState("");
  const [pers, setPers] = useState(p.query.personalisationNotes || "");
  const live = p.pkgs.filter((x) => x.status === "Active" && x.manuscriptId === msId);
  const matsTouched = pkgId !== (p.query.packageId || "") || mats.join("\n") !== p.materials.join("\n");
  const dirty = msId !== p.query.manuscriptId || matsTouched || pers !== (p.query.personalisationNotes || "");
  const onSave = () => {
    const f: NonNullable<QueryEditOps["queryFields"]> = {};
    if (msId !== p.query.manuscriptId) f.manuscriptId = msId;
    if (pers !== (p.query.personalisationNotes || "")) f.personalisationNotes = pers;
    if (matsTouched) Object.assign(f, editMaterialsUpdate({ touched: true, packageId: pkgId, materials: pkgId ? [] : mats }));
    const target = matsTouched && pkgId ? p.pkgs.find((x) => x.id === pkgId) ?? null : null;
    void p.save({ queryFields: f, ...(target && !isPackageLocked(target) ? { stampPackageId: target.id } : {}) }, "What you sent");
  };
  const pkgName = p.pkgs.find((x) => x.id === pkgId)?.packageName;
  return (
    <Step p={p} field="sent" value={pkgName ?? (mats.join(", ") || "Nothing recorded")} q="What did you send?" canSave={dirty} onSave={onSave}>
      {p.mss.length > 1 && (<>
        <p className="eqp-lab">Manuscript</p>
        <div className="eqp-opts" role="radiogroup" data-eqp="ms">{p.mss.map((m) => <Radio key={m.id} on={m.id === msId} onPick={() => setMsId(m.id)} label={m.title} data={m.id} />)}</div>
      </>)}
      <p className="eqp-lab">Submission package</p>
      <div className="eqp-opts" role="radiogroup" data-eqp="pkg">
        <Radio on={!pkgId} onPick={() => setPkgId("")} label="Custom materials" data="" />
        {live.map((x) => <Radio key={x.id} on={x.id === pkgId} onPick={() => setPkgId(x.id)} label={x.packageName} data={x.id} />)}
      </div>
      {!pkgId && (<>
        <p className="eqp-lab">Materials</p>
        <div className="eqp-pills" data-eqp="mats">
          {mats.map((m, i) => <span key={`${m}-${i}`} className="eqp-pill">{m}<button type="button" aria-label={`Remove ${m}`} onClick={() => setMats(mats.filter((_, j) => j !== i))}>✕</button></span>)}
          <input className="eqp-in eqp-in--sm" placeholder="Add, e.g. first 3 chapters" value={add} onChange={(e) => setAdd(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && add.trim()) { e.preventDefault(); setMats([...mats, add.trim()]); setAdd(""); } }} aria-label="Add a material" data-eqp="mat-add" />
        </div>
      </>)}
      <p className="eqp-lab">Personalisation notes</p>
      <textarea className="eqp-in eqp-ta" value={pers} onChange={(e) => setPers(e.target.value)} aria-label="Personalisation notes" data-eqp="pers" />
    </Step>
  );
};

const HowWhenStep: React.FC<StepProps> = (p) => {
  const [method, setMethod] = useState<string>(p.query.sendMethod || METHOD_OPTIONS[0]);
  const [date, setDate] = useState(toInput(p.sentMs));
  const dateMs = fromInput(date, 0);
  const dirty = method !== (p.query.sendMethod || METHOD_OPTIONS[0]) || date !== toInput(p.sentMs);
  return (
    <Step p={p} field="howwhen" value={`${method} · ${isNaN(dateMs) ? "—" : dm(dateMs)}`} q="How and when did you send it?" canSave={dirty && !isNaN(dateMs)}
      onSave={() => void p.save({ ...(date !== toInput(p.sentMs) ? { dateSentMs: dateMs } : {}), ...(method !== (p.query.sendMethod || METHOD_OPTIONS[0]) ? { queryFields: { sendMethod: method } } : {}) }, "How and when")}>
      <p className="eqp-lab">Sent on</p>
      <input type="date" className="eqp-in" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Sent on" data-eqp="date" />
      <p className="eqp-lab">How</p>
      <div className="eqp-opts" role="radiogroup" data-eqp="method">{METHOD_OPTIONS.map((m) => <Radio key={m} on={m === method} onPick={() => setMethod(m)} label={m} />)}</div>
    </Step>
  );
};

/** 10B — chips, a two-column wheel (weeks 0–52, days 0–6), the date line, and No reply means no. */
const ReplyStep: React.FC<StepProps> = (p) => {
  const usual = p.agent?.responseTimeWeeks && p.agent.responseTimeWeeks > 0 ? p.agent.responseTimeWeeks : null;
  const startDays = p.expMs ? Math.max(0, Math.round((p.expMs - p.sentMs) / DAY)) : (usual ?? 8) * 7;
  const [wk, setWk] = useState(Math.min(52, Math.floor(startDays / 7)));
  const [dy, setDy] = useState(startDays % 7);
  const curIf = (p.query as { ifNoResponse?: string }).ifNoResponse || NUDGE;
  const [no, setNo] = useState(curIf === AUTO_NO);
  const days = wk * 7 + dy;
  const due = p.sentMs + days * DAY;
  const dueInput = toInput(due);
  const was = p.expMs ? toInput(p.expMs) : "";
  const nextIf = no ? AUTO_NO : curIf === AUTO_NO ? NUDGE : curIf;
  const dirty = dueInput !== was || nextIf !== curIf;
  return (
    <Step p={p} field="reply" value={<span data-eqp="due">{wdm(due)}</span>} q="When should we expect a reply?"
      help={usual ? `${p.agency || p.agentName} usually replies in ${usual} weeks.` : "The agency doesn’t say how long it takes to reply."}
      canSave={dirty}
      onSave={() => void p.save({ queryFields: {
        ...(dueInput !== was ? { writerExpectedDate: new Date(fromInput(dueInput, 12)).toISOString() } : {}),
        ...(nextIf !== curIf ? { ifNoResponse: nextIf } : {}),
      } }, "Reply window")}>
      <div className="eqp-chips" data-eqp="chips">
        {CHIP_WEEKS.map((w) => (
          <button key={w} type="button" className={`eqp-chip${wk === w && dy === 0 ? " on" : ""}`} onClick={() => { setWk(w); setDy(0); }} data-eqp="chip" data-w={w}>
            {w} weeks{usual === w ? <small>Usual</small> : null}
          </button>
        ))}
      </div>
      <div className="eqp-whl" data-eqp="wheel">
        <div className="eqp-whlband" aria-hidden="true" />
        <Wheel n={53} value={wk} onChange={setWk} label="Weeks" data="weeks" /><span className="eqp-u">weeks</span>
        <Wheel n={7} value={dy} onChange={setDy} label="Days" data="days" /><span className="eqp-u">days</span>
      </div>
      <p className="eqp-dl" data-eqp="dateline">Expected by {wdm(due)}{dy === 0 ? ` (${wk} ${wk === 1 ? "week" : "weeks"} after you sent it)` : ` (${days} days after you sent it)`}</p>
      <label className="eqp-sw" data-eqp="nrmn">No reply means no
        <input type="checkbox" role="switch" checked={no} onChange={() => setNo(!no)} aria-label="No reply means no" /><span className="eqp-tg" aria-hidden="true"><i /></span>
      </label>
    </Step>
  );
};

/** A scroll-snap column; the value is read from where it settles, and set by scrolling to it. */
const Wheel: React.FC<{ n: number; value: number; onChange: (v: number) => void; label: string; data: string }> = ({ n, value, onChange, label, data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const H = 40;
  const settle = useRef<number | undefined>(undefined);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (Math.round(el.scrollTop / H) !== value) el.scrollTop = value * H;
  }, [value]);
  return (
    <div ref={ref} className="eqp-col" role="listbox" aria-label={label} tabIndex={0} data-eqp={`col-${data}`}
      onScroll={(e) => { const el = e.currentTarget; window.clearTimeout(settle.current); settle.current = window.setTimeout(() => { const v = Math.max(0, Math.min(n - 1, Math.round(el.scrollTop / H))); if (v !== value) onChange(v); }, 90); }}
      onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); onChange(Math.min(n - 1, value + 1)); } if (e.key === "ArrowUp") { e.preventDefault(); onChange(Math.max(0, value - 1)); } }}>
      {Array.from({ length: n }, (_, i) => <div key={i} className={`eqp-it${i === value ? " on" : ""}`} role="option" aria-selected={i === value} data-v={i} onClick={() => onChange(i)}>{i}</div>)}
    </div>
  );
};

const ResponsesStep: React.FC<StepProps> = (p) => {
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [deletes, setDeletes] = useState<string[]>([]);
  const [addStatus, setAddStatus] = useState<QueryStatus | "">("");
  const [addDate, setAddDate] = useState(toInput(Date.now()));
  const [rej, setRej] = useState(p.query.rejectionType || REJECTION_TYPE_OPTIONS[1]);
  const [comments, setComments] = useState(p.query.agentComments || "");
  const appends = addStatus ? [{ tempId: "phone-add", status: addStatus as QueryStatus, timeMs: fromInput(addDate, 12), note: appendNoteFor(addStatus as QueryStatus, p.agentName, p.agency) }] : [];
  const live = p.rungs.filter((r) => !deletes.includes(r.id)).map((r) => ({ id: r.id, status: r.status as QueryStatus, timeMs: edits[r.id] ?? r.timeMs }));
  const errors = useMemo(() => validateTimeline({ dateSentMs: p.sentMs, nowMs: Date.now(), rungs: [...live, ...appends.map((a) => ({ id: a.tempId, status: a.status, timeMs: a.timeMs }))] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(live), JSON.stringify(appends), p.sentMs]);
  const showRej = CLOSED_REVIEW.has(p.query.status);
  const fieldsDirty = (showRej && rej !== (p.query.rejectionType || REJECTION_TYPE_OPTIONS[1])) || comments !== (p.query.agentComments || "");
  const dirty = Object.keys(edits).length > 0 || deletes.length > 0 || appends.length > 0 || fieldsDirty;
  const onSave = () => void p.save({
    appends, edits: Object.entries(edits).map(([id, timeMs]) => ({ id, timeMs })), deletes,
    queryFields: { ...(showRej && rej !== (p.query.rejectionType || REJECTION_TYPE_OPTIONS[1]) ? { rejectionType: rej } : {}), ...(comments !== (p.query.agentComments || "") ? { agentComments: comments } : {}) },
  }, "Their responses");
  return (
    <Step p={p} field="responses" value={live.length ? `${STAGE_NAME[live[live.length - 1].status] ?? ""} ${dm(live[live.length - 1].timeMs)}` : "None yet"} q="What have they said?"
      canSave={dirty && errors.length === 0} onSave={onSave}>
      <div className="eqp-opts" data-eqp="rungs">
        {p.rungs.map((r) => (
          <div key={r.id} className={`eqp-rung${deletes.includes(r.id) ? " is-del" : ""}`} data-eqp="rung" data-id={r.id}>
            <b>{STAGE_NAME[r.status!] ?? r.status}</b>
            <input type="date" className="eqp-in eqp-in--sm" value={toInput(edits[r.id] ?? r.timeMs)} aria-label={`Date of ${STAGE_NAME[r.status!]}`}
              onChange={(e) => { const t = fromInput(e.target.value, 12); if (!isNaN(t)) setEdits({ ...edits, [r.id]: t }); }} />
            <button type="button" className="eqp-mini" onClick={() => setDeletes(deletes.includes(r.id) ? deletes.filter((x) => x !== r.id) : [...deletes, r.id])} data-eqp="rung-del">
              {deletes.includes(r.id) ? "Keep" : "It never happened"}</button>
          </div>
        ))}
      </div>
      <p className="eqp-lab">Add a response</p>
      <select className="eqp-in" value={addStatus} onChange={(e) => setAddStatus(e.target.value as QueryStatus | "")} aria-label="Add a response" data-eqp="add-status">
        <option value="">Nothing to add</option>
        {ADVANCE_OPTIONS.map((s) => <option key={s} value={s}>{STAGE_NAME[s] ?? s}</option>)}
      </select>
      {addStatus && <input type="date" className="eqp-in" value={addDate} onChange={(e) => setAddDate(e.target.value)} aria-label="When" data-eqp="add-date" />}
      {showRej && (<>
        <p className="eqp-lab">Kind of no</p>
        <div className="eqp-opts" role="radiogroup">{REJECTION_TYPE_OPTIONS.map((o) => <Radio key={o} on={o === rej} onPick={() => setRej(o)} label={o} />)}</div>
      </>)}
      <p className="eqp-lab">Their comments</p>
      <textarea className="eqp-in eqp-ta" value={comments} onChange={(e) => setComments(e.target.value)} aria-label="Their comments" data-eqp="comments" />
      {errors.length > 0 && <p className="eqp-err" role="alert">{errors[0].message}</p>}
    </Step>
  );
};

const NotesStep: React.FC<StepProps> = (p) => {
  const [text, setText] = useState("");
  return (
    <Step p={p} field="notes" value={text.trim() ? "a new note" : "—"} q="Add a note" help="Notes are for you; the agent never sees them." canSave={!!text.trim()}
      onSave={() => void p.save({}, "Note", () => p.addJournalEntry(p.query.id, text.trim()), p.undoNote(text.trim()))}>
      <textarea className="eqp-in eqp-ta eqp-ta--tall" value={text} onChange={(e) => setText(e.target.value)} aria-label="The note" data-eqp="note" />
    </Step>
  );
};
