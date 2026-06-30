/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Edit Query drawer — a Form 11 drawer sibling of EditAgentDrawer, on the shared Form11Drawer shell.
 *
 * The one rule: editing a query never writes derived state. status / responses / revisionRound /
 * pipeline dates are derived from the activity log by recomputeQuery — the single writer. This drawer
 * reads the AUTHORITATIVE per-query `activity` subcollection and stages ACTIVITY edits; commitQueryEdits
 * applies them (+ the stored, non-derived query fields) atomically and recompute derives the rest.
 *
 * Surfaces:
 *  · the change-vs-correction FORK on each non-root timeline event (append a change / fix a mistake),
 *    with hard-blocks that lock Save on a contradiction (Prompt 3);
 *  · staged field edits — send method, materials pills, personalisation notes, and the date-sent
 *    calendar (Prompt 3/4); agent REASSIGNMENT behind a consequence guard when responses exist;
 *  · the journal — full CRUD, an additive log that writes IMMEDIATELY (deliberately not staged);
 *  · the Pro-gated "Attach submission package" hint (stub).
 *
 * Identity is always re-resolved live by `agentId` (the STAGED agent while reassigning).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useScriptAllyDb } from "../lib/db";
import { Agent, Query, QueryStatus, SubmissionMethod } from "../types";
import {
  Form11Drawer, Form11DrawerHandle, Form11Footer, Form11HeaderAvatar, Form11Select, RestingField,
  ConfirmGuard, F11, F11_MONO, F11_SERIF, DirtyDot,
} from "./Form11Drawer";
import { StatusDot } from "./StatusDot";
import { getStatusLabel } from "./StatusPill";
import { getActivityTime, normalizeResultingStatus } from "../lib/queryDerivation";
import { formatQueryMaterial } from "../lib/materials";
import { computeResponseDeadline } from "../lib/responseDeadline";
import { editMaterialsUpdate } from "../lib/packageMetrics";
import {
  validateTimeline, appendNoteFor, ADVANCE_OPTIONS, RECLASSIFY_OPTIONS, TimelineError,
} from "../lib/queryTimelineEdit";
import { commitQueryEdits, QueryEditAppend, QueryEditOps } from "../lib/saveQueryEdits";

const C = {
  deep: "#3a1c14", burgundy: F11.burgundy, sub: "#6a5b4c", muted: "#a89a8a",
  bandFrom: "#f2e6df", bandTo: "#eddfd7", bandLabel: "#9a6a52",
};

const METHOD_OPTIONS = [SubmissionMethod.EMAIL, SubmissionMethod.QUERY_MANAGER, SubmissionMethod.ONLINE_FORM, SubmissionMethod.POST];
const IF_NO_RESPONSE_OPTIONS = ["Remind me to nudge", "Mark as no response automatically", "Do nothing"];
const REJECTION_TYPE_OPTIONS = ["Personalised rejection", "Form rejection", "No reason given"];
const AWAITING = new Set<QueryStatus>([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);
const CLOSED_REVIEW = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.WITHDRAWN]);
const PRO_COPY = "Attach custom submission packages to submissions, then track by-package and by-component stats to see how agents are responding to different versions of your materials. Available on Pro.";

const fmtDate = (d: string | number | Date | null | undefined): string => {
  if (!d && d !== 0) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const toDateInput = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fromDateInput = (s: string, hour: number): number => {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, hour, 0, 0, 0).getTime();
};
const fromDateInputNoon = (s: string): number => fromDateInput(s, 12);

interface Rung { id: string; status: QueryStatus | null; note: string; timeMs: number; provisional: boolean }

export interface EditQueryDrawerProps {
  query: Query;
  isOpen: boolean;
  lockScroll?: boolean;
  onClose: () => void;
  onSavedToast?: (msg: string) => void;
}

export const EditQueryDrawer: React.FC<EditQueryDrawerProps> = ({ query, isOpen, lockScroll, onClose, onSavedToast }) => {
  const { agents, manuscripts, packages, journalEntries, currentUser, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useScriptAllyDb();
  const drawerRef = useRef<Form11DrawerHandle>(null);

  // ── staged edits ────────────────────────────────────────────────────────────────
  const [appends, setAppends] = useState<QueryEditAppend[]>([]);
  const [edits, setEdits] = useState<Record<string, { status?: QueryStatus; timeMs?: number; note?: string }>>({});
  const [deletes, setDeletes] = useState<string[]>([]);
  const [draftDateSent, setDraftDateSent] = useState<string | null>(null);
  const [draftMethod, setDraftMethod] = useState<string | null>(null);
  const [draftPersonalisation, setDraftPersonalisation] = useState<string | null>(null);
  const [draftMaterials, setDraftMaterials] = useState<string[] | null>(null);
  const [draftAgentId, setDraftAgentId] = useState<string | null>(null);
  // Parity fields lifted from the retired Queries.tsx inline editor — all stored, non-derived.
  const [draftManuscriptId, setDraftManuscriptId] = useState<string | null>(null);
  const [draftResponseDeadline, setDraftResponseDeadline] = useState<string | null>(null); // YYYY-MM-DD ("" = clear)
  const [draftIfNoResponse, setDraftIfNoResponse] = useState<string | null>(null);
  const [draftPackageId, setDraftPackageId] = useState<string | null>(null);
  const [draftRejectionType, setDraftRejectionType] = useState<string | null>(null);
  const [draftAgentComments, setDraftAgentComments] = useState<string | null>(null);
  const [editingComments, setEditingComments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fork, setFork] = useState<{ id: string; mode: "ask" | "append" | "fix" } | null>(null);
  const [editingPers, setEditingPers] = useState(false);
  const [matAdding, setMatAdding] = useState(false);
  const [matInput, setMatInput] = useState("");
  const [reassign, setReassign] = useState<{ search: string; guardId: string | null } | null>(null);
  const [proHint, setProHint] = useState(false);
  const [journalInput, setJournalInput] = useState("");
  const [editNote, setEditNote] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    setAppends([]); setEdits({}); setDeletes([]); setDraftDateSent(null);
    setDraftMethod(null); setDraftPersonalisation(null); setDraftMaterials(null); setDraftAgentId(null);
    setDraftManuscriptId(null); setDraftResponseDeadline(null); setDraftIfNoResponse(null);
    setDraftPackageId(null); setDraftRejectionType(null); setDraftAgentComments(null); setEditingComments(false);
    setSaving(false); setSaveError(null); setFork(null); setEditingPers(false);
    setMatAdding(false); setMatInput(""); setReassign(null); setProHint(false);
    setJournalInput(""); setEditNote(null);
  }, [query.id, isOpen]);

  // Live identity — resolved by the STAGED agent / manuscript (so a pending change shows immediately).
  const effAgentId = draftAgentId ?? query.agentId;
  const effAgent = agents.find((a) => a.id === effAgentId) || null;
  const origAgent = agents.find((a) => a.id === query.agentId) || null;
  const effManuscriptId = draftManuscriptId ?? query.manuscriptId;
  const manuscript = manuscripts.find((m) => m.id === effManuscriptId) || null;
  const agentName = effAgent?.name?.trim() || "Unknown agent";
  const agency = effAgent?.agency?.trim() || "";
  const msTitle = manuscript?.title || "Untitled manuscript";

  // ── authoritative activity subcollection (the ledger) ──────────────────────────
  const [rungs, setRungs] = useState<Rung[]>([]);
  useEffect(() => {
    if (!currentUser || !isOpen) { setRungs([]); return; }
    const ref = fsQuery(collection(db, "users", currentUser.id, "queries", query.id, "activity"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(ref, (snap) => {
      setRungs(snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          status: normalizeResultingStatus(x.resultingStatus) ?? normalizeResultingStatus(x.type),
          note: typeof x.note === "string" ? x.note : "",
          timeMs: getActivityTime(x.createdAt),
          provisional: x.dateProvisional === true,
        };
      }));
    }, () => { /* a read error must not crash the drawer; recompute owns correctness */ });
    return () => unsub();
  }, [currentUser?.id, query.id, isOpen]);

  // ── effective field values ──────────────────────────────────────────────────────
  const effMethod = draftMethod ?? (query.sendMethod || SubmissionMethod.EMAIL);
  const effPersonalisation = draftPersonalisation ?? (query.personalisationNotes || "");
  const baseMaterials: string[] = (() => {
    const list = (query.materialsWanted && query.materialsWanted.length ? query.materialsWanted : origAgent?.materialsWanted) || [];
    return list.map(formatQueryMaterial).filter(Boolean);
  })();
  const effMaterials = draftMaterials ?? baseMaterials;

  // Parity fields (stored). Package + materials are mutually exclusive (one source of truth), so the
  // free-text pills show only when no package is linked. Active packages for the (staged) manuscript.
  const effIfNoResponse = draftIfNoResponse ?? ((query as { ifNoResponse?: string }).ifNoResponse || "Remind me to nudge");
  const effPackageId = draftPackageId ?? (query.packageId || "");
  const effRejectionType = draftRejectionType ?? (query.rejectionType || "Form rejection");
  const effAgentComments = draftAgentComments ?? (query.agentComments || "");
  const effDeadlineInput = draftResponseDeadline ?? (query.responseDeadline ? toDateInput(new Date(query.responseDeadline).getTime()) : "");
  const packageOptions = [
    { value: "", label: "Custom materials" },
    ...packages.filter((p) => p.status === "Active" && p.manuscriptId === effManuscriptId).map((p) => ({ value: p.id, label: p.packageName })),
  ];
  const linkedPackage = packages.find((p) => p.id === effPackageId) || null;
  const materialsTouched = draftMaterials !== null || draftPackageId !== null;

  const origDateSentMs = query.dateSent ? new Date(query.dateSent).getTime() : Date.now();
  const dateSentMs = draftDateSent ? fromDateInput(draftDateSent, 0) : origDateSentMs;

  // Project the staged ops onto the log (for display + validation).
  const applyEdit = (r: Rung) => {
    const e = edits[r.id];
    return {
      id: r.id,
      status: (e?.status ?? r.status) as QueryStatus | null,
      timeMs: e?.timeMs ?? r.timeMs,
      note: e?.note ?? r.note,
      provisional: e?.timeMs !== undefined ? false : r.provisional,
    };
  };
  const appendRows = appends.map((a) => ({ id: a.tempId, status: a.status as QueryStatus | null, timeMs: a.timeMs, note: a.note, provisional: false, isAppend: true, deleted: false }));
  const displayRows = useMemo(() => {
    const fromRungs = rungs
      .map((r) => ({ ...applyEdit(r), deleted: deletes.includes(r.id), isAppend: false }))
      .filter((r) => r.status && r.status !== QueryStatus.QUERIED);
    return [...fromRungs, ...appendRows].sort((a, b) => a.timeMs - b.timeMs || a.id.localeCompare(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rungs, edits, deletes, appends]);

  const errors: TimelineError[] = useMemo(() => validateTimeline({
    dateSentMs,
    nowMs: Date.now(),
    rungs: displayRows.filter((r) => !r.deleted && r.status).map((r) => ({ id: r.id, status: r.status as QueryStatus, timeMs: r.timeMs })),
  }), [displayRows, dateSentMs]);

  const fieldDirty = draftMethod !== null || draftPersonalisation !== null || materialsTouched || draftAgentId !== null
    || draftDateSent !== null || draftManuscriptId !== null || draftResponseDeadline !== null
    || draftIfNoResponse !== null || draftRejectionType !== null || draftAgentComments !== null;
  const timelineDirty = appends.length > 0 || Object.keys(edits).length > 0 || deletes.length > 0;
  const dirty = fieldDirty || timelineDirty;
  const blocked = errors.length > 0;
  const blockReason = errors[0]?.message ?? null;

  const notes = journalEntries.filter((j) => j.queryId === query.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const responseExpected: Date | null = (() => {
    if (query.responseDeadline) { const d = new Date(query.responseDeadline); return isNaN(d.getTime()) ? null : d; }
    if (query.dateSent && typeof origAgent?.responseTimeWeeks === "number" && origAgent.responseTimeWeeks > 0) {
      const d = new Date(computeResponseDeadline(query.dateSent, origAgent.responseTimeWeeks));
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  })();

  // ── date-sent calendar ───────────────────────────────────────────────────────────
  const dateInputRef = useRef<HTMLInputElement>(null);
  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    try { (el as unknown as { showPicker?: () => void }).showPicker?.(); } catch { el.focus(); el.click(); }
  };
  const todayInput = toDateInput(Date.now());

  // ── staged-op mutators ──────────────────────────────────────────────────────────
  const addAppend = (status: QueryStatus, dayMs: number) => {
    const tempId = `new-${appends.length}-${status}`;
    setAppends((p) => [...p, { tempId, status, timeMs: dayMs, note: appendNoteFor(status, agentName, agency) }]);
    setFork(null);
  };
  const reclassify = (id: string, status: QueryStatus) => setEdits((p) => ({ ...p, [id]: { ...p[id], status, note: appendNoteFor(status, agentName, agency) } }));
  const redate = (id: string, dayMs: number) => setEdits((p) => ({ ...p, [id]: { ...p[id], timeMs: dayMs } }));
  const markDelete = (id: string) => { setDeletes((p) => (p.includes(id) ? p : [...p, id])); setFork(null); };
  const undoDelete = (id: string) => setDeletes((p) => p.filter((x) => x !== id));
  const undoRowEdit = (id: string, isAppend: boolean) => {
    if (isAppend) setAppends((p) => p.filter((a) => a.tempId !== id));
    else setEdits((p) => { const n = { ...p }; delete n[id]; return n; });
    setFork(null);
  };

  // Materials (free-edit — no guard; touch no dates).
  const setMaterials = (list: string[]) => setDraftMaterials(list);
  const removeMaterial = (i: number) => setMaterials(effMaterials.filter((_, idx) => idx !== i));
  const addMaterial = () => {
    const v = matInput.trim();
    if (v) setMaterials([...effMaterials, v]);
    setMatInput(""); setMatAdding(false);
  };

  // Reassignment (consequence guard when the query has recorded responses).
  const pickAgent = (a: Agent) => {
    if (a.id === query.agentId) { setReassign(null); return; }
    if (query.hasAgentResponded) setReassign({ search: reassign?.search ?? "", guardId: a.id });
    else { setDraftAgentId(a.id); setReassign(null); }
  };

  const discardAll = () => {
    setAppends([]); setEdits({}); setDeletes([]); setDraftDateSent(null);
    setDraftMethod(null); setDraftPersonalisation(null); setDraftMaterials(null); setDraftAgentId(null);
    setDraftManuscriptId(null); setDraftResponseDeadline(null); setDraftIfNoResponse(null);
    setDraftPackageId(null); setDraftRejectionType(null); setDraftAgentComments(null); setEditingComments(false);
    setFork(null); setReassign(null); setSaveError(null); setEditingPers(false); setMatAdding(false);
  };

  const handleSave = async () => {
    if (!dirty || blocked || saving || !currentUser) return;
    const queryFields: NonNullable<QueryEditOps["queryFields"]> = {};
    if (draftMethod !== null) queryFields.sendMethod = draftMethod;
    if (draftPersonalisation !== null) queryFields.personalisationNotes = draftPersonalisation;
    if (draftAgentId !== null) queryFields.agentId = draftAgentId;
    if (draftManuscriptId !== null) queryFields.manuscriptId = draftManuscriptId;
    if (draftIfNoResponse !== null) queryFields.ifNoResponse = draftIfNoResponse;
    if (draftResponseDeadline !== null) queryFields.responseDeadline = draftResponseDeadline ? new Date(fromDateInput(draftResponseDeadline, 12)).toISOString() : "";
    if (draftRejectionType !== null) queryFields.rejectionType = draftRejectionType;
    if (draftAgentComments !== null) queryFields.agentComments = draftAgentComments;
    // Materials ⟷ package are one source of truth (editMaterialsUpdate clears the other side).
    if (materialsTouched) Object.assign(queryFields, editMaterialsUpdate({ touched: true, packageId: effPackageId, materials: effMaterials }));
    const ops: QueryEditOps = {
      appends,
      edits: Object.entries(edits).map(([id, e]) => ({ id, ...e })),
      deletes,
      ...(draftDateSent !== null ? { dateSentMs } : {}),
      ...(Object.keys(queryFields).length ? { queryFields } : {}),
    };
    setSaving(true); setSaveError(null);
    const res = await commitQueryEdits(db, currentUser.id, query.id, ops, {
      agentName, manuscriptId: effManuscriptId, manuscriptTitle: manuscript?.title || "",
    });
    setSaving(false);
    if (!res.ok) { setSaveError("error" in res ? res.error : "Couldn’t save the query."); return; }
    discardAll();
    onSavedToast?.("Query updated");
  };

  // Journal — additive, IMMEDIATE (deliberately not staged).
  const addNote = async () => { const t = journalInput.trim(); if (!t) return; await addJournalEntry(query.id, t); setJournalInput(""); };
  const saveNoteEdit = async () => { if (!editNote) return; const t = editNote.text.trim(); if (t) await updateJournalEntry(editNote.id, t); setEditNote(null); };

  const requestClose = () => drawerRef.current?.close(true);
  if (!isOpen) return null;

  const footerText = saveError ? saveError
    : blocked ? `Can’t save — ${blockReason}`
    : dirty ? "Unsaved changes" : "No unsaved changes";
  const footerTone: "idle" | "dirty" | "blocked" = blocked ? "blocked" : dirty ? "dirty" : "idle";

  const agentMatches = reassign
    ? agents.filter((a) => {
        const q = reassign.search.trim().toLowerCase();
        if (!q) return a.id !== query.agentId;
        return a.id !== query.agentId && (`${a.name ?? ""} ${a.agency ?? ""}`.toLowerCase().includes(q));
      }).slice(0, 8)
    : [];

  return (
    <>
      <EditQueryStyles />
      <Form11Drawer
        ref={drawerRef}
        isOpen={isOpen}
        onClose={onClose}
        lockScroll={lockScroll}
        showRail
        suppressEsc={editingPers || editingComments || !!editNote || matAdding}
        header={
          <div style={{ background: `linear-gradient(135deg,${C.bandFrom},${C.bandTo})`, padding: "15px 20px 15px 24px", display: "flex", alignItems: "flex-start", gap: 12, borderBottom: "1px solid rgba(124,58,42,0.12)", position: "relative", flexShrink: 0 }}>
            <Form11HeaderAvatar ring="rgba(124,58,42,0.22)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F11_MONO, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: C.bandLabel, marginBottom: 3 }}>Editing query</div>
              <h2 style={{ fontFamily: F11_SERIF, fontSize: 18, color: C.deep, margin: 0, lineHeight: 1.12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msTitle}</h2>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2, display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  to <b style={{ fontWeight: 600, color: "#5a4636" }}>{agentName}</b>{agency ? ` at ${agency}` : ""}{draftAgentId !== null && <span className="eq-staged"> · reassigned</span>}
                </span>
                <button type="button" className="eq-change" onClick={() => setReassign((r) => (r ? null : { search: "", guardId: null }))}>change</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7 }}>
                <StatusDot status={query.status} overrideSize={14} />
                <span style={{ fontFamily: F11_MONO, fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: C.burgundy }}>{getStatusLabel(query.status)}</span>
              </div>
            </div>
            <div role="button" aria-label="Close" onClick={requestClose} style={{ position: "absolute", top: 13, right: 15, width: 22, height: 22, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.sub }}>
              <svg viewBox="0 0 16 16" fill="none" width={16} height={16}><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" /></svg>
            </div>
          </div>
        }
        footer={<Form11Footer statusText={footerText} tone={footerTone} onDiscard={discardAll} onSave={handleSave} saveDisabled={!dirty || blocked} saving={saving} />}
      >
        {/* ── reassignment (consequence guard when responses exist) ─────────────── */}
        {reassign && (
          <div className="eq-reassign">
            {reassign.guardId ? (
              <ConfirmGuard
                message={<>This query has recorded responses; reassigning moves the whole timeline to <b>{agents.find((a) => a.id === reassign.guardId)?.name || "this agent"}</b>.</>}
                confirmLabel="Reassign anyway"
                keepLabel="Close this & log fresh"
                onConfirm={() => { setDraftAgentId(reassign.guardId); setReassign(null); }}
                onKeep={() => { setReassign(null); requestClose(); }}
              />
            ) : (
              <>
                <div className="eq-reassign-h">Reassign this query to…</div>
                <input autoFocus className="eq-reassign-input" placeholder="Search agents…" value={reassign.search} onChange={(e) => setReassign((r) => r && { ...r, search: e.target.value })} />
                <div className="eq-reassign-list">
                  {agentMatches.length === 0 ? <div className="eq-reassign-empty">No other agents found.</div>
                    : agentMatches.map((a) => (
                      <button key={a.id} type="button" className="eq-reassign-row" onClick={() => pickAgent(a)}>
                        <span className="eq-reassign-name">{a.name || "Unnamed agent"}</span>
                        <span className="eq-reassign-agency">{a.agency || "—"}</span>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Query details ─────────────────────────────────────────────────────── */}
        <Sec>Query details</Sec>
        <Field>
          <Label>Manuscript <DirtyDot on={draftManuscriptId !== null} /></Label>
          <Form11Select value={effManuscriptId} options={manuscripts.map((m) => ({ value: m.id, label: m.title }))}
            onChange={(v) => setDraftManuscriptId(v === query.manuscriptId ? null : v)} ariaLabel="Manuscript" />
        </Field>
        <Two>
          <Field>
            <Label>Date sent <DirtyDot on={draftDateSent !== null} /></Label>
            <div className="eq-display click" onClick={openDatePicker} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDatePicker(); } }}>
              <span className="eq-dval">{fmtDate(dateSentMs)}</span>
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="#bcae9e" strokeWidth={2} strokeLinecap="round"><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
              <input ref={dateInputRef} type="date" className="eq-dateinput" max={todayInput} value={draftDateSent ?? toDateInput(origDateSentMs)} onChange={(e) => setDraftDateSent(e.target.value || null)} />
            </div>
          </Field>
          <Field>
            <Label>Send method <DirtyDot on={draftMethod !== null} /></Label>
            <Form11Select value={effMethod} options={METHOD_OPTIONS} onChange={(v) => setDraftMethod(v === (query.sendMethod || SubmissionMethod.EMAIL) ? null : v)} ariaLabel="Send method" />
          </Field>
        </Two>

        <Two>
          <Field>
            <Label>Response deadline <DirtyDot on={draftResponseDeadline !== null} /></Label>
            <input type="date" className="eq-datefield" value={effDeadlineInput}
              onChange={(e) => setDraftResponseDeadline(e.target.value === (query.responseDeadline ? toDateInput(new Date(query.responseDeadline).getTime()) : "") ? null : e.target.value)} />
          </Field>
          <Field>
            <Label>If no response <DirtyDot on={draftIfNoResponse !== null} /></Label>
            <Form11Select value={effIfNoResponse} options={IF_NO_RESPONSE_OPTIONS}
              onChange={(v) => setDraftIfNoResponse(v === ((query as { ifNoResponse?: string }).ifNoResponse || "Remind me to nudge") ? null : v)} ariaLabel="If no response" />
          </Field>
        </Two>

        <Field>
          <Label>Materials sent <DirtyDot on={materialsTouched} /></Label>
          {packageOptions.length > 1 && (
            <div style={{ marginBottom: effPackageId ? 0 : 7 }}>
              <Form11Select value={effPackageId} options={packageOptions}
                onChange={(v) => { setDraftPackageId(v === (query.packageId || "") ? null : v); if (v) setDraftMaterials(null); }} ariaLabel="Submission package" />
            </div>
          )}
          {effPackageId ? (
            <div className="eq-pkglinked">Materials are defined by <b>{linkedPackage?.packageName || "the linked package"}</b>.</div>
          ) : (
            <div className="eq-matpills">
              {effMaterials.length === 0 && !matAdding && <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>No materials recorded</span>}
              {effMaterials.map((m, i) => (
                <span key={`${m}-${i}`} className="eq-matpill">{m}<button type="button" className="eq-matx" aria-label={`Remove ${m}`} onClick={() => removeMaterial(i)}>✕</button></span>
              ))}
              {matAdding ? (
                <input autoFocus className="eq-matinput" placeholder="e.g. First 3 chapters" value={matInput}
                  onChange={(e) => setMatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMaterial(); } else if (e.key === "Escape") { setMatAdding(false); setMatInput(""); } }}
                  onBlur={addMaterial} />
              ) : (
                <button type="button" className="eq-matadd" onClick={() => setMatAdding(true)}>+ add</button>
              )}
            </div>
          )}
        </Field>

        <Field>
          <Label>Personalisation notes <DirtyDot on={draftPersonalisation !== null} /></Label>
          <RestingField
            value={effPersonalisation}
            placeholder="Add a personalisation note"
            multiline quoted
            isEditing={editingPers}
            onStartEdit={() => setEditingPers(true)}
            onEndEdit={() => setEditingPers(false)}
            onCommit={(v) => setDraftPersonalisation(v === (query.personalisationNotes || "") ? null : v)}
          />
        </Field>

        <div className="eq-pkg"><button type="button" className="eq-pkg-link" onClick={() => setProHint((p) => !p)}>Attach submission package</button><span className="eq-pro">Pro</span></div>
        {proHint && <div className="eq-prohint"><span>{PRO_COPY}</span></div>}

        {/* ── Rejection details (rejected / withdrawn only — parity with the retired inline editor) ── */}
        {CLOSED_REVIEW.has(query.status) && (
          <>
            <Sec top>Rejection details</Sec>
            <Field>
              <Label>Rejection type <DirtyDot on={draftRejectionType !== null} /></Label>
              <Form11Select value={effRejectionType} options={REJECTION_TYPE_OPTIONS}
                onChange={(v) => setDraftRejectionType(v === (query.rejectionType || "Form rejection") ? null : v)} ariaLabel="Rejection type" />
            </Field>
            <Field>
              <Label>Agent comments / feedback <DirtyDot on={draftAgentComments !== null} /></Label>
              <RestingField value={effAgentComments} placeholder="Paste the agent’s feedback…" multiline
                isEditing={editingComments} onStartEdit={() => setEditingComments(true)} onEndEdit={() => setEditingComments(false)}
                onCommit={(v) => setDraftAgentComments(v === (query.agentComments || "") ? null : v)} />
            </Field>
          </>
        )}

        {/* ── The record (timeline) — the ledger, editable through the fork ──────── */}
        <Sec top>The record</Sec>
        <div className="eq-timeline">
          <div className="eq-trow">
            <span className="eq-tdot"><StatusDot status={QueryStatus.QUERIED} overrideSize={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="eq-tlabel">Query sent <span className="eq-lock" title="The first event — its date is the “Date sent” field above; changing it can remove later events.">· locked</span></div>
              <div className="eq-tdesc">Query sent to {agentName}{agency ? ` at ${agency}` : ""}</div>
              <div className="eq-tdate">{fmtDate(dateSentMs)}{draftDateSent !== null && <span className="eq-staged"> · edited</span>}</div>
            </div>
          </div>

          {displayRows.map((r) => {
            const status = (r.status ?? QueryStatus.QUERIED) as QueryStatus;
            const isEdited = !r.isAppend && !!edits[r.id];
            const open = fork?.id === r.id;
            if (r.deleted) {
              return (
                <div key={r.id} className="eq-trow deleted">
                  <span className="eq-tdot"><StatusDot status={status} overrideSize={16} ghost /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="eq-tdesc struck">{r.note || getStatusLabel(status)}</div>
                    <button type="button" className="eq-undo" onClick={() => undoDelete(r.id)}>Undo — keep “{getStatusLabel(status)}”</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={r.id} className="eq-trow">
                <span className="eq-tdot"><StatusDot status={status} overrideSize={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="eq-tlabel">{getStatusLabel(status)}{r.isAppend && <span className="eq-staged"> · new</span>}{isEdited && <span className="eq-staged"> · edited</span>}</div>
                  <div className="eq-tdesc">{r.note || getStatusLabel(status)}</div>
                  <div className="eq-tdate">{r.provisional ? "Date needed" : fmtDate(r.timeMs)}</div>

                  {!open && (r.isAppend
                    ? <button type="button" className="eq-fix" onClick={() => undoRowEdit(r.id, true)}>Remove</button>
                    : <button type="button" className="eq-fix" onClick={() => setFork({ id: r.id, mode: "ask" })}>fix</button>)}

                  {open && fork!.mode === "ask" && (
                    <div className="eq-fork">
                      <div className="eq-fork-q">Did something change, or are you fixing a mistake?</div>
                      <div className="eq-fork-row">
                        <button type="button" className="eq-fork-btn" onClick={() => setFork({ id: r.id, mode: "append" })}>Something changed</button>
                        <button type="button" className="eq-fork-btn" onClick={() => setFork({ id: r.id, mode: "fix" })}>I’m fixing a mistake</button>
                        <button type="button" className="eq-fork-cancel" onClick={() => setFork(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {open && fork!.mode === "append" && <AppendForm todayInput={todayInput} onAdd={addAppend} onCancel={() => setFork(null)} />}
                  {open && fork!.mode === "fix" && (
                    <FixForm current={status} dayInput={toDateInput(r.timeMs)} todayInput={todayInput}
                      onReclassify={(s) => reclassify(r.id, s)} onRedate={(ms) => redate(r.id, ms)} onDelete={() => markDelete(r.id)} onDone={() => setFork(null)} />
                  )}
                </div>
              </div>
            );
          })}

          {!(fork && fork.id === "NEW") ? (
            <button type="button" className="eq-logchange" onClick={() => setFork({ id: "NEW", mode: "append" })}>+ Log a change</button>
          ) : (
            <div className="eq-trow"><span className="eq-tdot" style={{ width: 16 }} /><div style={{ flex: 1 }}>
              <AppendForm todayInput={todayInput} onAdd={addAppend} onCancel={() => setFork(null)} />
            </div></div>
          )}

          {responseExpected && AWAITING.has(query.status) && !timelineDirty && draftDateSent === null && (
            <div className="eq-trow derived">
              <span className="eq-derived-dot" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="eq-derived-pill">Response expected</div>
                <div className="eq-derived-line">By {fmtDate(responseExpected)} · derived from the agent’s turnaround</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Your notes (journal — immediate CRUD) ─────────────────────────────── */}
        <Sec top>Your notes</Sec>
        {notes.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", padding: "2px 0 8px" }}>No notes yet — your private journal for this query lives here.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {notes.map((n) => (
              <div key={n.id} className="eq-note">
                <div className="eq-note-head">
                  <span className="eq-note-date">{new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {!(editNote && editNote.id === n.id) && (
                    <span className="eq-note-actions">
                      <button type="button" className="eq-note-btn" onClick={() => setEditNote({ id: n.id, text: n.entryText })}>edit</button>
                      <button type="button" className="eq-note-btn del" onClick={() => deleteJournalEntry(n.id)}>delete</button>
                    </span>
                  )}
                </div>
                {editNote && editNote.id === n.id ? (
                  <div>
                    <textarea className="eq-note-edit" autoFocus value={editNote.text} onChange={(e) => setEditNote({ id: n.id, text: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNoteEdit(); } else if (e.key === "Escape") setEditNote(null); }} />
                    <div className="eq-note-editrow">
                      <button type="button" className="eq-note-save" onClick={saveNoteEdit}>Save</button>
                      <button type="button" className="eq-note-cancel" onClick={() => setEditNote(null)}>Cancel</button>
                    </div>
                  </div>
                ) : <div className="eq-note-text">{n.entryText}</div>}
              </div>
            ))}
          </div>
        )}
        <div className="eq-journal-add">
          <textarea className="eq-journal-input" placeholder="Add a note — a call, a reminder, a detail…" value={journalInput}
            onChange={(e) => setJournalInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }} />
          <button type="button" className="eq-journal-btn" disabled={!journalInput.trim()} onClick={addNote}>Add note</button>
        </div>
        <div style={{ height: 8 }} />
      </Form11Drawer>
    </>
  );
};

// ── the fork's append form ("something changed") ──────────────────────────────────
const AppendForm: React.FC<{ todayInput: string; onAdd: (s: QueryStatus, ms: number) => void; onCancel: () => void }> = ({ todayInput, onAdd, onCancel }) => {
  const [status, setStatus] = useState<QueryStatus>(ADVANCE_OPTIONS[0]);
  const [day, setDay] = useState(todayInput);
  return (
    <div className="eq-fork">
      <div className="eq-fork-q">What happened?</div>
      <div className="eq-fork-fields">
        <select className="eq-fork-select" value={status} onChange={(e) => setStatus(e.target.value as QueryStatus)}>
          {ADVANCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" className="eq-fork-date" max={todayInput} value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      <div className="eq-fork-row">
        <button type="button" className="eq-fork-add" disabled={!day} onClick={() => onAdd(status, fromDateInputNoon(day))}>Add to the record</button>
        <button type="button" className="eq-fork-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

// ── the fork's fix form ("I'm fixing a mistake") ──────────────────────────────────
const FixForm: React.FC<{ current: QueryStatus; dayInput: string; todayInput: string; onReclassify: (s: QueryStatus) => void; onRedate: (ms: number) => void; onDelete: () => void; onDone: () => void }> = ({ current, dayInput, todayInput, onReclassify, onRedate, onDelete, onDone }) => {
  const [status, setStatus] = useState<QueryStatus>(RECLASSIFY_OPTIONS.includes(current) ? current : RECLASSIFY_OPTIONS[0]);
  const [day, setDay] = useState(dayInput);
  return (
    <div className="eq-fork">
      <div className="eq-fork-q">Correct this event</div>
      <div className="eq-fork-fields">
        <select className="eq-fork-select" value={status} onChange={(e) => { const s = e.target.value as QueryStatus; setStatus(s); onReclassify(s); }}>
          {RECLASSIFY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" className="eq-fork-date" max={todayInput} value={day} onChange={(e) => { setDay(e.target.value); if (e.target.value) onRedate(fromDateInputNoon(e.target.value)); }} />
      </div>
      <div className="eq-fork-row">
        <button type="button" className="eq-fork-del" onClick={onDelete}>Delete event</button>
        <button type="button" className="eq-fork-add" onClick={onDone}>Done</button>
      </div>
    </div>
  );
};

// ── layout atoms ──────────────────────────────────────────────────────────────────
const Sec: React.FC<{ children: React.ReactNode; top?: boolean }> = ({ children, top }) => (
  <div style={{ fontFamily: F11_MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#5a4636", margin: top ? "22px 0 11px" : "2px 0 11px", display: "flex", alignItems: "center", gap: 9 }}>
    <span>{children}</span><span style={{ flex: 1, height: 1, background: "#e6d8c8" }} />
  </div>
);
const Field: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ marginBottom: 14 }}>{children}</div>;
const Two: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>{children}</div>;
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: F11_MONO, fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9c8878", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>{children}</div>
);

const EditQueryStyles: React.FC = () => (
  <style>{`
    .eq-change{background:transparent;border:none;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.04em;text-transform:uppercase;color:#9a6a52;cursor:pointer;padding:1px 4px;border-bottom:1px solid rgba(154,106,82,.4);flex-shrink:0;}
    .eq-change:hover{color:#7c3a2a;}
    .eq-reassign{background:#fdf6f0;border:1px solid #ecd9c6;border-radius:10px;padding:11px 12px;margin-bottom:14px;}
    .eq-reassign-h{font-size:11.5px;color:#7a5c48;font-weight:500;margin-bottom:8px;}
    .eq-reassign-input{width:100%;font-family:'Source Sans Pro',sans-serif;font-size:12.5px;color:#3a1c14;background:#fffdf9;border:1px solid #ece2d4;border-radius:8px;padding:8px 11px;outline:none;}
    .eq-reassign-input:focus{border-color:#8a9e88;}
    .eq-reassign-list{display:flex;flex-direction:column;gap:2px;margin-top:7px;max-height:180px;overflow-y:auto;}
    .eq-reassign-row{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;background:#fffdf9;border:1px solid #f0e7da;border-radius:8px;padding:7px 10px;cursor:pointer;}
    .eq-reassign-row:hover{border-color:#7c3a2a;background:#fffefb;}
    .eq-reassign-name{font-size:12.5px;color:#3a1c14;font-weight:500;}
    .eq-reassign-agency{font-size:10.5px;color:#a89a8a;}
    .eq-reassign-empty{font-size:11.5px;color:#a89a8a;font-style:italic;padding:6px 2px;}
    .eq-matpills{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:2px;}
    .eq-matpill{display:inline-flex;align-items:center;gap:5px;background:#ece3d6;border:1px solid transparent;color:#6a5b4c;border-radius:999px;font-family:'Source Sans Pro',sans-serif;font-size:11px;font-weight:500;padding:4px 9px 4px 11px;}
    .eq-matx{background:transparent;border:none;color:#ab9a85;opacity:.6;cursor:pointer;font-size:10px;line-height:1;padding:0;}
    .eq-matpill:hover .eq-matx{opacity:1;} .eq-matx:hover{color:#7c3a2a;opacity:1;}
    .eq-matadd{border:1px dashed #ddd0bf;color:#b9aa99;border-radius:999px;font-family:'Source Sans Pro',sans-serif;font-size:11px;font-weight:500;padding:4px 11px;background:transparent;cursor:pointer;}
    .eq-matadd:hover{border-color:#7c3a2a;color:#7c3a2a;}
    .eq-matinput{font-family:'Source Sans Pro',sans-serif;font-size:11.5px;color:#3a1c14;background:#fffdf9;border:1px solid #ece2d4;border-radius:999px;padding:4px 11px;outline:none;min-width:140px;}
    .eq-matinput:focus{border-color:#8a9e88;}
    .eq-datefield{margin-top:2px;width:100%;min-height:38px;font-family:'Source Sans Pro',sans-serif;font-size:12.5px;color:#3a1c14;background:#fffdf9;border:1px solid #ece2d4;border-radius:8px;padding:8px 11px;outline:none;box-sizing:border-box;}
    .eq-datefield:focus{border-color:#8a9e88;}
    .eq-pkglinked{margin-top:7px;font-size:11.5px;color:#6a5b4c;background:#f3ecdf;border:1px solid #e6d8c8;border-radius:8px;padding:8px 11px;}
    .eq-display{position:relative;min-height:38px;display:flex;align-items:center;gap:8px;padding:8px 11px;background:#fffdf9;border:1px solid #ece2d4;border-radius:8px;margin-top:2px;}
    .eq-display.click{cursor:pointer;transition:border-color .14s,background .14s;}
    .eq-display.click:hover{border-color:#d8c9b6;background:#fffefb;}
    .eq-dval{flex:1;min-width:0;font-size:13px;color:#3a1c14;line-height:1.4;overflow:hidden;text-overflow:ellipsis;}
    .eq-dateinput{position:absolute;inset:0;opacity:0;width:100%;height:100%;border:none;cursor:pointer;}
    .eq-pkg{display:flex;align-items:center;gap:8px;margin:-4px 0 4px;}
    .eq-pkg-link{background:transparent;border:none;font-size:11.5px;color:#a89a8a;border-bottom:1px dashed #d8c9b6;cursor:pointer;padding:0 0 1px;}
    .eq-pkg-link:hover{color:#7c3a2a;}
    .eq-pro{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.06em;text-transform:uppercase;color:#7c3a2a;background:#f5e2da;border:1px solid #e8c8bc;border-radius:5px;padding:2px 6px;}
    .eq-prohint{display:flex;gap:7px;background:#eef2ec;border:1px solid #d8e0d4;border-radius:9px;padding:9px 11px;margin:2px 0 6px;font-size:11px;line-height:1.5;color:#5a6e58;}
    .eq-timeline{position:relative;display:flex;flex-direction:column;gap:2px;}
    .eq-trow{position:relative;display:flex;gap:11px;align-items:flex-start;padding:8px 0;}
    .eq-trow.deleted{opacity:.75;}
    .eq-tdot{flex-shrink:0;margin-top:1px;}
    .eq-tlabel{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;color:#7c3a2a;font-weight:600;margin-bottom:2px;display:flex;gap:6px;align-items:center;}
    .eq-lock{color:#bcae9e;font-weight:500;letter-spacing:.03em;}
    .eq-staged{color:#b07a4a;font-weight:600;}
    .eq-tdesc{font-size:12.5px;color:#3a1c14;line-height:1.35;}
    .eq-tdesc.struck{text-decoration:line-through;color:#a89a8a;}
    .eq-tdate{font-family:'JetBrains Mono',monospace;font-size:10px;color:#a89a8a;margin-top:2px;}
    .eq-fix{margin-top:5px;background:transparent;border:none;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.04em;text-transform:uppercase;color:#bcae9e;cursor:pointer;padding:2px 0;}
    .eq-fix:hover{color:#7c3a2a;}
    .eq-undo{margin-top:4px;background:transparent;border:none;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.04em;text-transform:uppercase;color:#7c3a2a;cursor:pointer;border-bottom:1px solid rgba(124,58,42,.4);padding:0;}
    .eq-logchange{margin:6px 0 2px 27px;align-self:flex-start;background:#fffdf9;border:1px dashed #ddd0bf;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;color:#9a8876;cursor:pointer;padding:7px 12px;}
    .eq-logchange:hover{border-color:#7c3a2a;color:#7c3a2a;}
    .eq-fork{margin-top:7px;background:#fdf6f0;border:1px solid #ecd9c6;border-radius:9px;padding:10px 11px;}
    .eq-fork-q{font-size:11.5px;color:#7a5c48;margin-bottom:8px;font-weight:500;}
    .eq-fork-row{display:flex;flex-wrap:wrap;gap:7px;align-items:center;}
    .eq-fork-fields{display:flex;gap:7px;margin-bottom:8px;}
    .eq-fork-select,.eq-fork-date{flex:1;min-width:0;font-family:'Source Sans Pro',sans-serif;font-size:12px;color:#3a1c14;background:#fffdf9;border:1px solid #ece2d4;border-radius:7px;padding:6px 8px;outline:none;}
    .eq-fork-select:focus,.eq-fork-date:focus{border-color:#8a9e88;}
    .eq-fork-btn{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.03em;text-transform:uppercase;background:#fff;border:1px solid #e3d7c9;border-radius:7px;color:#6a5b4c;cursor:pointer;padding:7px 10px;}
    .eq-fork-btn:hover{border-color:#7c3a2a;color:#7c3a2a;}
    .eq-fork-add{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;background:#7c3a2a;color:#f8f5f0;border:none;border-radius:7px;cursor:pointer;padding:7px 13px;}
    .eq-fork-add:hover{background:#5e2b1f;} .eq-fork-add:disabled{background:#efe6da;color:#bcae9e;cursor:not-allowed;}
    .eq-fork-del{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;background:#f7e4de;color:#a83a2a;border:1px solid #e6bdb0;border-radius:7px;cursor:pointer;padding:7px 11px;}
    .eq-fork-del:hover{background:#f1d3ca;}
    .eq-fork-cancel{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.04em;text-transform:uppercase;background:transparent;border:none;color:#a89a8a;cursor:pointer;padding:7px 4px;}
    .eq-fork-cancel:hover{color:#7c3a2a;}
    .eq-trow.derived{opacity:.9;}
    .eq-derived-dot{flex-shrink:0;width:16px;height:16px;border-radius:50%;border:2px dashed rgba(124,58,42,0.4);margin-top:2px;}
    .eq-derived-pill{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;color:#8a7a5a;background:#f3ecdf;border:1px solid #e6d8c8;border-radius:5px;padding:2px 7px;margin-bottom:3px;}
    .eq-derived-line{font-size:11.5px;color:#8a7d6e;}
    .eq-note{background:#fffdf9;border:1px solid #ece2d4;border-radius:9px;padding:9px 11px;}
    .eq-note-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px;}
    .eq-note-date{font-family:'JetBrains Mono',monospace;font-size:9px;color:#a89a8a;}
    .eq-note-actions{display:flex;gap:8px;}
    .eq-note-btn{background:transparent;border:none;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.03em;text-transform:uppercase;color:#bcae9e;cursor:pointer;padding:0;}
    .eq-note-btn:hover{color:#7c3a2a;} .eq-note-btn.del:hover{color:#a83a2a;}
    .eq-note-text{font-size:12px;color:#3a1c14;line-height:1.5;white-space:pre-wrap;}
    .eq-note-edit{width:100%;font-family:'Source Sans Pro',sans-serif;font-size:12px;color:#3a1c14;background:#fff;border:1px solid #e0d5c8;border-radius:7px;padding:7px 9px;outline:none;resize:vertical;min-height:48px;}
    .eq-note-edit:focus{border-color:#8a9e88;}
    .eq-note-editrow{display:flex;gap:7px;margin-top:6px;}
    .eq-note-save{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.04em;text-transform:uppercase;background:#7c3a2a;color:#f8f5f0;border:none;border-radius:6px;cursor:pointer;padding:5px 11px;}
    .eq-note-cancel{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.04em;text-transform:uppercase;background:transparent;border:none;color:#a89a8a;cursor:pointer;}
    .eq-journal-add{display:flex;flex-direction:column;gap:7px;}
    .eq-journal-input{width:100%;font-family:'Source Sans Pro',sans-serif;font-size:12px;color:#3a1c14;background:#fffdf9;border:1px solid #ece2d4;border-radius:9px;padding:9px 11px;outline:none;resize:vertical;min-height:46px;}
    .eq-journal-input:focus{border-color:#8a9e88;}
    .eq-journal-btn{align-self:flex-start;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;background:#7c3a2a;color:#f8f5f0;border:none;border-radius:7px;cursor:pointer;padding:7px 14px;}
    .eq-journal-btn:hover{background:#5e2b1f;} .eq-journal-btn:disabled{background:#efe6da;color:#bcae9e;cursor:not-allowed;}
  `}</style>
);
