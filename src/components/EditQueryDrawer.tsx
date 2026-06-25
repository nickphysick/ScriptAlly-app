/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Edit Query drawer — a Form 11 drawer sibling of EditAgentDrawer, built on the shared Form11Drawer
 * shell. Phase 2 is READ-ONLY-CORRECT: it proves the layout, the entry points, and that we read the
 * right stores before the ledger is touched (Prompts 3–4 add the correction fork + field edits).
 *
 * The one rule: editing a query never writes derived state. status / responses / revisionRound /
 * pipeline dates are derived from the activity log by recomputeQuery — the single writer. This drawer
 * reads the AUTHORITATIVE per-query `activity` subcollection (the same store recompute + the live
 * reading pane use), NOT the global feed projection.
 *
 * Identity is always re-resolved live by `agentId` / `manuscriptId` — never a stale denormalised
 * string. Critical colours are inline (the Tailwind-drift footgun this codebase has hit before).
 */
import React, { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useScriptAllyDb } from "../lib/db";
import { Query, QueryStatus, SubmissionMethod } from "../types";
import {
  Form11Drawer, Form11DrawerHandle, Form11Footer, Form11HeaderAvatar, F11, F11_MONO, F11_SERIF,
} from "./Form11Drawer";
import { StatusDot } from "./StatusDot";
import { getStatusLabel } from "./StatusPill";
import { getActivityTime, normalizeResultingStatus } from "../lib/queryDerivation";
import { formatQueryMaterial } from "../lib/materials";
import { computeResponseDeadline } from "../lib/responseDeadline";

const C = {
  parchment: F11.parchment, deep: "#3a1c14", burgundy: F11.burgundy, sub: "#6a5b4c",
  muted: "#a89a8a", name: "#3a1c14",
  bandFrom: "#f2e6df", bandTo: "#eddfd7", bandLabel: "#9a6a52",
  matFill: "#ece3d6", matText: "#6a5b4c",
  sage: "#8a9e88", darkSage: "#5a6e58",
};

const METHOD_OPTIONS = [
  SubmissionMethod.EMAIL, SubmissionMethod.QUERY_MANAGER, SubmissionMethod.ONLINE_FORM, SubmissionMethod.POST,
];

const AWAITING = new Set<QueryStatus>([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);

const firstName = (n?: string) => (n?.trim().split(/\s+/)[0] || "the agent");
const fmtDate = (d: string | number | Date | null | undefined): string => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/** A timeline rung read from the authoritative subcollection. */
interface Rung {
  id: string;
  status: QueryStatus | null;
  note: string;
  timeMs: number;
  provisional: boolean;
}

export interface EditQueryDrawerProps {
  query: Query;
  isOpen: boolean;
  onClose: () => void;
  /** Lock background (window) scroll while open — the app-level overlay use. */
  lockScroll?: boolean;
  onSavedToast?: (msg: string) => void;
}

export const EditQueryDrawer: React.FC<EditQueryDrawerProps> = ({ query, isOpen, onClose, lockScroll }) => {
  const { agents, manuscripts, journalEntries, currentUser } = useScriptAllyDb();
  const drawerRef = useRef<Form11DrawerHandle>(null);

  // Live identity — resolved by id every render, never a stored copy.
  const agent = agents.find((a) => a.id === query.agentId) || null;
  const manuscript = manuscripts.find((m) => m.id === query.manuscriptId) || null;
  const agentName = agent?.name?.trim() || "Unknown agent";
  const agency = agent?.agency?.trim() || "";
  const msTitle = manuscript?.title || "Untitled manuscript";

  // ── authoritative activity subcollection (the ledger) ──────────────────────────
  const [rungs, setRungs] = useState<Rung[]>([]);
  useEffect(() => {
    if (!currentUser || !isOpen) { setRungs([]); return; }
    const ref = fsQuery(
      collection(db, "users", currentUser.id, "queries", query.id, "activity"),
      orderBy("createdAt", "asc"),
    );
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

  // Journal — the per-query notes (read-only this phase).
  const notes = journalEntries
    .filter((j) => j.queryId === query.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Materials sent: the query's own list if present, else the agent's wanted list. Render every item
  // through formatQueryMaterial (the union shape).
  const materials: string[] = (() => {
    const list = (query.materialsWanted && query.materialsWanted.length ? query.materialsWanted : agent?.materialsWanted) || [];
    return list.map(formatQueryMaterial).filter(Boolean);
  })();

  // Derived "response expected by" — never stored on the timeline; mirrors the live reading pane.
  const responseExpected: Date | null = (() => {
    if (query.responseDeadline) { const d = new Date(query.responseDeadline); return isNaN(d.getTime()) ? null : d; }
    if (query.dateSent && typeof agent?.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0) {
      const d = new Date(computeResponseDeadline(query.dateSent, agent.responseTimeWeeks));
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  })();

  // Timeline rows: the synthesised root (from the query's dateSent — a plain Queried query has no
  // subcollection rung), then every non-Queried rung in chronological order. The Queried rung, if one
  // exists (imported queries), is folded into the root so it never double-renders.
  const eventRungs = rungs.filter((r) => r.status && r.status !== QueryStatus.QUERIED);

  const requestClose = () => drawerRef.current?.close(true);

  if (!isOpen) return null;

  return (
    <>
      <EditQueryStyles />
      <Form11Drawer
        ref={drawerRef}
        isOpen={isOpen}
        onClose={onClose}
        lockScroll={lockScroll}
        showRail
        header={
          <div style={{ background: `linear-gradient(135deg,${C.bandFrom},${C.bandTo})`, padding: "15px 20px 15px 24px", display: "flex", alignItems: "flex-start", gap: 12, borderBottom: "1px solid rgba(124,58,42,0.12)", position: "relative", flexShrink: 0 }}>
            <Form11HeaderAvatar ring="rgba(124,58,42,0.22)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F11_MONO, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: C.bandLabel, marginBottom: 3 }}>Editing query</div>
              <h2 style={{ fontFamily: F11_SERIF, fontSize: 18, color: C.deep, margin: 0, lineHeight: 1.12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msTitle}</h2>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                to <b style={{ fontWeight: 600, color: "#5a4636" }}>{agentName}</b>{agency ? ` at ${agency}` : ""}
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
        footer={
          <Form11Footer statusText="No unsaved changes" tone="idle" onDiscard={() => {}} onSave={() => {}} saveDisabled saving={false} />
        }
      >
        {/* ── Query details ─────────────────────────────────────────────────────── */}
        <Sec>Query details</Sec>
        <Two>
          <Field><Label>Date sent</Label><DisplayBox value={fmtDate(query.dateSent)} placeholder="No send date" /></Field>
          <Field><Label>Send method</Label><DisplaySelect value={query.sendMethod || SubmissionMethod.EMAIL} options={METHOD_OPTIONS} /></Field>
        </Two>

        <Field>
          <Label>Materials sent</Label>
          <div className="eq-matpills">
            {materials.length === 0 ? (
              <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>No materials recorded</span>
            ) : (
              materials.map((m, i) => <span key={i} className="eq-matpill">{m}</span>)
            )}
            <span className="eq-matadd" aria-hidden="true">+ add</span>
          </div>
        </Field>

        <Field>
          <Label>Personalisation notes</Label>
          <DisplayBox value={query.personalisationNotes || ""} placeholder="No personalisation notes" multiline quoted />
        </Field>

        <div className="eq-pkg">
          <span className="eq-pkg-link">Attach submission package</span>
          <span className="eq-pro">Pro</span>
        </div>

        {/* ── The record (timeline) ─────────────────────────────────────────────── */}
        <Sec top>The record</Sec>
        <div className="eq-timeline">
          {/* Root "Query sent" — locked: changing the send date can remove later events. */}
          <TimelineRow
            status={QueryStatus.QUERIED}
            label="Query sent"
            desc={`Query sent to ${agentName}${agency ? ` at ${agency}` : ""}`}
            date={fmtDate(query.dateSent)}
            locked
          />
          {eventRungs.map((r) => (
            <TimelineRow
              key={r.id}
              status={r.status as QueryStatus}
              label={getStatusLabel(r.status as QueryStatus)}
              desc={r.note || getStatusLabel(r.status as QueryStatus)}
              date={r.provisional ? "" : fmtDate(r.timeMs)}
              provisional={r.provisional}
            />
          ))}
          {responseExpected && AWAITING.has(query.status) && (
            <div className="eq-trow derived">
              <span className="eq-derived-dot" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="eq-derived-pill">Response expected</div>
                <div className="eq-derived-line">By {fmtDate(responseExpected)} · derived from the agent's turnaround</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Your notes (journal) ──────────────────────────────────────────────── */}
        <Sec top>Your notes</Sec>
        {notes.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", padding: "2px 0 6px" }}>
            No notes yet — your private journal for this query lives here.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map((n) => (
              <div key={n.id} className="eq-note">
                <div className="eq-note-date">{new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                <div className="eq-note-text">{n.entryText}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 8 }} />
      </Form11Drawer>
    </>
  );
};

// ── layout atoms ──────────────────────────────────────────────────────────────────
const Sec: React.FC<{ children: React.ReactNode; top?: boolean }> = ({ children, top }) => (
  <div style={{ fontFamily: F11_MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#5a4636", margin: top ? "22px 0 11px" : "2px 0 11px", display: "flex", alignItems: "center", gap: 9 }}>
    <span>{children}</span><span style={{ flex: 1, height: 1, background: "#e6d8c8" }} />
  </div>
);
const Field: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginBottom: 14 }}>{children}</div>
);
const Two: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>{children}</div>
);
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: F11_MONO, fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9c8878", marginBottom: 5 }}>{children}</div>
);

// Read-only display in the resting-field shape (Phase 2). Prompt 4 swaps these for the editable
// RestingField / Form11Select.
const DisplayBox: React.FC<{ value: string; placeholder: string; multiline?: boolean; quoted?: boolean }> = ({ value, placeholder, multiline, quoted }) => {
  const empty = value.trim() === "";
  return (
    <div className={`eq-display${multiline ? " ml" : ""}`}>
      <span className={`eq-dval${empty ? " ph" : ""}`} style={{ fontStyle: quoted && !empty ? "italic" : undefined, whiteSpace: multiline ? "normal" : "nowrap" }}>
        {empty ? placeholder : (quoted ? `“${value}”` : value)}
      </span>
    </div>
  );
};
const DisplaySelect: React.FC<{ value: string; options: string[] }> = ({ value }) => (
  <div className="eq-display select">
    <span className="eq-dval">{value}</span>
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#7c3a2a" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
  </div>
);

const TimelineRow: React.FC<{ status: QueryStatus; label: string; desc: string; date: string; locked?: boolean; provisional?: boolean }> = ({ status, label, desc, date, locked, provisional }) => (
  <div className="eq-trow">
    <span className="eq-tdot"><StatusDot status={status} overrideSize={16} /></span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="eq-tlabel">{label}{locked && <span className="eq-lock" title="The first event — changing the send date can remove later events">· locked</span>}</div>
      <div className="eq-tdesc">{desc}</div>
      <div className="eq-tdate">{provisional ? "Date needed" : date}</div>
    </div>
  </div>
);

/** Query-specific styles (materials pills, the read-only fields, the timeline, journal, Pro link). */
const EditQueryStyles: React.FC = () => (
  <style>{`
    .eq-matpills{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:2px;}
    .eq-matpill{background:#ece3d6;border:1px solid transparent;color:#6a5b4c;border-radius:999px;font-family:'Inter',sans-serif;font-size:11px;font-weight:500;padding:4px 11px;}
    .eq-matadd{border:1px dashed #ddd0bf;color:#b9aa99;border-radius:999px;font-family:'Inter',sans-serif;font-size:11px;font-weight:500;padding:4px 11px;}
    .eq-display{min-height:38px;display:flex;align-items:center;gap:8px;padding:8px 11px;background:#fffdf9;border:1px solid #ece2d4;border-radius:8px;margin-top:2px;}
    .eq-display.ml{align-items:flex-start;min-height:54px;}
    .eq-display.select{justify-content:space-between;}
    .eq-dval{flex:1;min-width:0;font-size:13px;color:#3a1c14;line-height:1.4;overflow:hidden;text-overflow:ellipsis;}
    .eq-dval.ph{color:#b9aa99;}
    .eq-pkg{display:flex;align-items:center;gap:8px;margin:-4px 0 4px;}
    .eq-pkg-link{font-size:11.5px;color:#a89a8a;border-bottom:1px dashed #d8c9b6;cursor:default;}
    .eq-pro{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.06em;text-transform:uppercase;color:#7c3a2a;background:#f5e2da;border:1px solid #e8c8bc;border-radius:5px;padding:2px 6px;}
    .eq-timeline{position:relative;display:flex;flex-direction:column;gap:2px;}
    .eq-trow{position:relative;display:flex;gap:11px;align-items:flex-start;padding:8px 0;}
    .eq-tdot{flex-shrink:0;margin-top:1px;}
    .eq-tlabel{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;color:#7c3a2a;font-weight:600;margin-bottom:2px;display:flex;gap:6px;align-items:center;}
    .eq-lock{color:#bcae9e;font-weight:500;letter-spacing:.03em;}
    .eq-tdesc{font-size:12.5px;color:#3a1c14;line-height:1.35;}
    .eq-tdate{font-family:'JetBrains Mono',monospace;font-size:10px;color:#a89a8a;margin-top:2px;}
    .eq-trow.derived{opacity:.9;}
    .eq-derived-dot{flex-shrink:0;width:16px;height:16px;border-radius:50%;border:2px dashed rgba(124,58,42,0.4);margin-top:2px;}
    .eq-derived-pill{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;color:#8a7a5a;background:#f3ecdf;border:1px solid #e6d8c8;border-radius:5px;padding:2px 7px;margin-bottom:3px;}
    .eq-derived-line{font-size:11.5px;color:#8a7d6e;}
    .eq-note{background:#fffdf9;border:1px solid #ece2d4;border-radius:9px;padding:9px 11px;}
    .eq-note-date{font-family:'JetBrains Mono',monospace;font-size:9px;color:#a89a8a;margin-bottom:3px;}
    .eq-note-text{font-size:12px;color:#3a1c14;line-height:1.5;}
  `}</style>
);
