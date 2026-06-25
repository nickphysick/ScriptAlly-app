/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Edit Agent drawer — the click-to-edit agent editor, built to edit-agent-v6.html.
 *
 * Visual sibling of the Edit Query drawer but a richer shell (the real query drawer is a plain
 * fixed slab): a slide-in MountPanel (parchment + inset burgundy clip), an "editing" spine tab, a
 * Lottie pencil in the sage band, a scrolling body, a pinned Save/Discard footer, and per-field
 * dirty-dots. Native controls are replaced by the app's canonical components — BrandDropdown,
 * FitStars, StatusDot. Saves through useScriptAllyDb().saveAgentEdits (Prompt 1): only touched
 * fields go in the patch (undefined = untouched), and "Not set" response time passes null →
 * deleteField(). NO extraWrites — the responseTimeWeeks deadline fan-out is Prompt 3.
 *
 * Critical colours are inline styles (Tailwind drift trap); only hover/scrollbar/keyframes live in
 * the scoped <style>.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import Lottie from "lottie-react";
import { useScriptAllyDb } from "../lib/db";
import { Agent, Query, QueryStatus, SubmissionStatus, SubmissionMethod } from "../types";
import { BrandDropdown } from "./forms";
import { FitStars } from "./forms/FitStars";
import { StatusDot } from "./StatusDot";
import { getStatusLabel } from "./StatusPill";
import { AgentEditPatch } from "../lib/saveAgentEdits";
import editPencil from "../assets/edit-pencil-animation.json";

const C = {
  page: "#EDE6DF", parchment: "#fdfaf5", field: "#ffffff", fieldBorder: "#e0d5c8",
  burgundy: "#7c3a2a", deep: "#3a1c14", pink: "#f5e2da", pinkBorder: "#e8c8bc",
  label: "#9c8878", name: "#3a1c14", sub: "#6a7e68", sage1: "#d7ddd5", sage2: "#d5dbd3",
  sageAccent: "#8a9e88", darkSage: "#5a6e58", sageTint: "#eef2ec", err: "#a83a2a",
  errBg: "#f7e4de", errBorder: "#e6bdb0", muted: "#a89a8a",
};
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Playfair Display', serif";

// No-response policy ↔ boolean. The mockup's third "Not specified" needs a schema field the Agent
// model doesn't have (noResponseMeansNo is a plain boolean), so we offer the two storable states.
const NOREPLY_TRUE = "No reply means no";
const NOREPLY_FALSE = "Replies either way";
const noReplyLabel = (b: boolean) => (b ? NOREPLY_TRUE : NOREPLY_FALSE);

const STATUS_OPTIONS = Object.values(SubmissionStatus).map((s) => ({ value: s, label: s }));
const METHOD_OPTIONS = Object.values(SubmissionMethod).map((s) => ({ value: s, label: s }));
const NOREPLY_OPTIONS = [NOREPLY_TRUE, NOREPLY_FALSE].map((s) => ({ value: s, label: s }));

const AWAITING_REPLY = new Set<QueryStatus>([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);
const TERMINAL = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const firstName = (n: string) => (n.trim().split(/\s+/)[0] || "this agent");
const eqArr = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** The drawer's editable working copy, seeded from the agent. weeks: number | null ("Not set"). */
interface Draft {
  name: string; agency: string; email: string; website: string;
  status: SubmissionStatus; method: string; noReply: boolean;
  weeks: number | null; rating: number;
  genres: string[]; materials: string[]; mswl: string; notes: string;
}

const draftFromAgent = (a: Agent): Draft => ({
  name: a.name ?? "", agency: a.agency ?? "", email: a.email ?? "", website: a.website ?? "",
  status: (a.submissionStatus as SubmissionStatus) ?? SubmissionStatus.UNKNOWN,
  method: a.submissionMethod ?? SubmissionMethod.EMAIL,
  noReply: !!a.noResponseMeansNo,
  weeks: typeof a.responseTimeWeeks === "number" ? a.responseTimeWeeks : null,
  rating: a.starRating ?? 0,
  genres: [...(a.genres ?? [])], materials: [...(a.materialsWanted ?? [])],
  mswl: a.mswlNotes ?? "", notes: a.notes ?? "",
});

export interface EditAgentDrawerProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  /** Read-only queries list rows link out via this (the Edit Query drawer isn't mounted here). */
  onOpenQuery?: (queryId: string) => void;
  onSavedToast?: (msg: string) => void;
}

export const EditAgentDrawer: React.FC<EditAgentDrawerProps> = ({ agent, isOpen, onClose, onOpenQuery, onSavedToast }) => {
  const { queries, manuscripts, saveAgentEdits } = useScriptAllyDb();

  const orig = useMemo(() => draftFromAgent(agent), [agent]);
  const [S, setS] = useState<Draft>(orig);
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editBuf = useRef<string>("");

  // Reseed when the agent changes or the drawer (re)opens; clear transient edit state.
  useEffect(() => {
    setS(orig);
    setEditing(null);
    setErrors({});
    setSaved(false);
    setSaveError(null);
  }, [orig, isOpen]);

  useEffect(() => {
    // Capture-phase + stopImmediatePropagation so the top-most overlay owns Escape: when the drawer
    // is opened OVER a FormShell (the Log-a-Query stub-completion entry), Esc closes only the drawer
    // and never reaches the form beneath. While a field is being edited inline, Esc belongs to that
    // field — let it through untouched.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !isOpen || editing) return;
      e.stopImmediatePropagation();
      onClose();
    };
    if (isOpen) window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, onClose, editing]);

  if (!isOpen) return null;

  const agentQueries = queries.filter((q) => q.agentId === agent.id);
  const openCount = agentQueries.filter((q) => !TERMINAL.has(q.status)).length;
  const awaitingCount = agentQueries.filter((q) => AWAITING_REPLY.has(q.status)).length;
  const msTitle = (q: Query) => manuscripts.find((m) => m.id === q.manuscriptId)?.title || "Untitled manuscript";

  // ── dirty / validation ──────────────────────────────────────────────────────
  const dirty = {
    name: S.name !== orig.name, agency: S.agency !== orig.agency, email: S.email !== orig.email,
    website: S.website !== orig.website, status: S.status !== orig.status, method: S.method !== orig.method,
    noReply: S.noReply !== orig.noReply, weeks: S.weeks !== orig.weeks, rating: S.rating !== orig.rating,
    genres: !eqArr(S.genres, orig.genres), materials: !eqArr(S.materials, orig.materials),
    mswl: S.mswl !== orig.mswl, notes: S.notes !== orig.notes,
  };
  const anyDirty = Object.values(dirty).some(Boolean);
  const liveErrors: Record<string, string> = {};
  if (S.name.trim() === "") liveErrors.name = "An agent needs a name. Add one to save, or discard to keep what was there.";
  if (S.email.trim() !== "" && !emailOk(S.email)) liveErrors.email = "That doesn’t look like an email address. Fix it or clear the field.";
  const blocked = Object.keys(liveErrors).length > 0;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setS((p) => ({ ...p, [k]: v }));

  // ── save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!anyDirty || blocked || saving) return;
    const patch: AgentEditPatch = {};
    if (dirty.name) patch.name = S.name.trim();
    if (dirty.agency) patch.agency = S.agency.trim();
    if (dirty.email) patch.email = S.email.trim();
    if (dirty.website) patch.website = S.website.trim();
    if (dirty.status) patch.submissionStatus = S.status;
    if (dirty.method) patch.submissionMethod = S.method;
    if (dirty.noReply) patch.noResponseMeansNo = S.noReply;
    if (dirty.weeks) patch.responseTimeWeeks = S.weeks; // number, or null = "Not set" → deleteField()
    if (dirty.rating) patch.starRating = S.rating;
    if (dirty.genres) patch.genres = S.genres;
    if (dirty.materials) patch.materialsWanted = S.materials;
    if (dirty.mswl) patch.mswlNotes = S.mswl;
    if (dirty.notes) patch.notes = S.notes;

    setSaving(true);
    setSaveError(null);
    // NOTE: no extraWrites — the responseTimeWeeks deadline fan-out is Prompt 3; a stale deadline
    // on existing queries after a response-time edit is knowingly deferred to that phase.
    const res = await saveAgentEdits(agent.id, patch);
    setSaving(false);
    if (!res.ok) {
      setSaveError("error" in res ? res.error : "Couldn’t save the agent.");
      return;
    }
    setSaved(true);
    onSavedToast?.("Agent updated");
    setTimeout(() => setSaved(false), 1600);
  };

  const discardAll = () => { setS(orig); setEditing(null); setErrors({}); setSaveError(null); };

  // ── small presentational helpers ──────────────────────────────────────────────
  const Dot = ({ on }: { on: boolean }) => (
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.burgundy, opacity: on ? 0.65 : 0, transition: "opacity .15s", display: "inline-block" }} />
  );
  const Label = ({ children, on }: { children: React.ReactNode; on: boolean }) => (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: C.label, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
      {children} <Dot on={on} />
    </div>
  );
  const Sec = ({ children, top }: { children: React.ReactNode; top?: boolean }) => (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase", color: C.label, margin: top ? "24px 0 11px" : "2px 0 11px", display: "flex", alignItems: "center", gap: 8 }}>
      <span>{children}</span><span style={{ flex: 1, height: 1, background: "#ece2d6" }} />
    </div>
  );

  // A click-to-edit TEXT field: plain value → click reveals input → Enter/blur commits, Esc reverts.
  const TextField = ({ field, value, placeholder, multiline, muted, quoted }: {
    field: keyof Draft; value: string; placeholder?: string; multiline?: boolean; muted?: boolean; quoted?: boolean;
  }) => {
    const isEditing = editing === field;
    const err = liveErrors[field as string];
    const display = value.trim() === "" ? (field === "name" ? "No name" : "—") : (quoted ? `“${value}”` : value);
    if (isEditing) {
      const common = {
        autoFocus: true,
        defaultValue: value,
        onFocus: () => { editBuf.current = value; },
        onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { set(field, e.target.value as Draft[typeof field]); setEditing(null); },
        style: {
          width: "100%", background: C.field, border: `1px solid ${err ? C.errBorder : C.fieldBorder}`,
          borderRadius: 7, padding: "8px 11px", fontSize: 12.5, color: C.name, fontFamily: "'Inter',sans-serif",
          outline: "none", marginTop: 2, ...(multiline ? { minHeight: 54, lineHeight: 1.45, resize: "vertical" as const, fontStyle: quoted ? "italic" as const : undefined } : {}),
          ...(quoted && !multiline ? { fontStyle: "italic" as const } : {}),
        },
      };
      return multiline ? (
        <textarea {...common} onKeyDown={(e) => { if (e.key === "Escape") { (e.target as HTMLTextAreaElement).value = editBuf.current; (e.target as HTMLTextAreaElement).blur(); } }} />
      ) : (
        <input {...common} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } else if (e.key === "Escape") { (e.target as HTMLInputElement).value = editBuf.current; (e.target as HTMLInputElement).blur(); } }} />
      );
    }
    return (
      <>
        <div className="ea-editable" tabIndex={0} role="button"
          onClick={() => setEditing(field as string)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(field as string); } }}>
          <span className={`ea-fval${multiline || quoted ? " wrap" : ""}`} style={{ color: err ? C.err : muted || value.trim() === "" ? C.muted : C.name, fontStyle: muted ? "italic" : quoted ? "italic" : undefined }}>{display}</span>
          <span className="ea-hint"><PencilGlyph /></span>
        </div>
        {err && <ErrNote msg={err} onUndo={() => { set(field, orig[field] as Draft[typeof field]); setEditing(null); }} undoLabel={`Undo — keep “${String(orig[field]) || "blank"}”`} />}
      </>
    );
  };

  // A click-to-edit DROPDOWN field (status / method / no-reply) using the canonical BrandDropdown.
  const SelectField = ({ field, value, options, onPick }: {
    field: keyof Draft; value: string; options: { value: string; label: string }[]; onPick: (v: string) => void;
  }) => {
    const isEditing = editing === field;
    if (isEditing) {
      return (
        <div style={{ marginTop: 2 }}>
          <BrandDropdown value={value} options={options} onChange={(v) => { onPick(v); setEditing(null); }} />
        </div>
      );
    }
    return (
      <div className="ea-editable selectable" tabIndex={0} role="button"
        onClick={() => setEditing(field as string)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(field as string); } }}>
        <span className="ea-fval wrap">{value}</span>
        <span className="ea-hint"><Chevron /></span>
      </div>
    );
  };

  // Chip (tag) field — inline ✕ remove + always-present "+ add" free-text.
  const ChipField = ({ field, genre }: { field: "genres" | "materials"; genre?: boolean }) => {
    const [adding, setAdding] = useState(false);
    const items = S[field];
    return (
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
        {items.map((item, i) => (
          <span key={`${item}-${i}`} style={{
            fontSize: 10.5, color: genre ? C.darkSage : "#7a6e60", background: genre ? C.sageTint : C.field,
            border: `1px solid ${genre ? "#d8e0d4" : C.fieldBorder}`, borderRadius: 6, padding: "3px 8px",
            display: "inline-flex", alignItems: "center",
          }}>
            {item}
            <span role="button" title="Remove" className="ea-cx"
              onClick={() => set(field, items.filter((_, idx) => idx !== i))}
              style={{ marginLeft: 7, cursor: "pointer", color: "#c8b9a8", fontSize: 12, lineHeight: 1 }}>✕</span>
          </span>
        ))}
        {adding ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px dashed #d8cab9", borderRadius: 6, padding: "3px 9px" }}>
            <input autoFocus placeholder={genre ? "add genre" : "add material"}
              style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'Inter',sans-serif", fontSize: 10.5, color: C.name, width: 96 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v && !items.includes(v)) set(field, [...items, v]); setAdding(false); }
                else if (e.key === "Escape") setAdding(false);
              }}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && !items.includes(v)) set(field, [...items, v]); setAdding(false); }} />
          </span>
        ) : (
          <span role="button" tabIndex={0} className="ea-chipadd"
            onClick={() => setAdding(true)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAdding(true); } }}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px dashed #d8cab9", borderRadius: 6, padding: "3px 9px", color: "#b3a596", cursor: "text", fontSize: 10.5 }}>
            + add
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <EditAgentStyles />
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(58,28,20,0.18)", zIndex: 1000 }} />
      <div className="ea-slide" style={{ position: "fixed", top: 0, right: 0, height: "100vh", zIndex: 1001, display: "flex", alignItems: "center", padding: "0 24px", boxSizing: "border-box" }}>
        <div style={{ position: "relative" }}>
          {/* 'editing' spine tab hanging off the left edge */}
          <div style={{ position: "absolute", top: 12, left: -21, width: 24, height: 92, zIndex: 3, background: C.parchment, borderRadius: "8px 0 0 8px", boxShadow: "-3px 3px 7px rgba(58,28,20,0.10)", display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 4 }}>
            <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a89a8a", fontWeight: 500 }}>editing</span>
          </div>

          <div style={{ width: 460, maxWidth: "calc(100vw - 60px)", maxHeight: "calc(100vh - 64px)", background: C.parchment, padding: 7, borderRadius: 14, boxShadow: "0 22px 60px rgba(58,28,20,0.28)", display: "flex" }}>
            <div style={{ flex: 1, border: `1px solid ${C.burgundy}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>

              {/* sage band */}
              <div style={{ background: `linear-gradient(135deg,${C.sage1},${C.sage2})`, padding: "15px 20px 15px 24px", display: "flex", alignItems: "flex-start", gap: 12, borderBottom: "1px solid rgba(124,58,42,0.12)", position: "relative", flexShrink: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.parchment, border: "1px solid rgba(124,58,42,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Lottie animationData={editPencil} loop autoplay style={{ width: 30, height: 30 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: C.darkSage, marginBottom: 3 }}>Editing agent</div>
                  <h2 style={{ fontFamily: SERIF, fontSize: 18, color: "#2e3a2c", margin: 0, lineHeight: 1.1 }}>{S.name.trim() || "—"}</h2>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{S.agency.trim() || "—"}</div>
                </div>
                <div role="button" aria-label="Close" onClick={onClose} style={{ position: "absolute", top: 13, right: 15, width: 22, height: 22, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.sub }}>
                  <svg viewBox="0 0 16 16" fill="none" width={16} height={16}><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" /></svg>
                </div>
              </div>

              {/* scrolling body */}
              <div className="ea-body" style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
                <Sec>Identity</Sec>
                <div style={{ marginBottom: 15 }}>
                  <Label on={dirty.name}>Name</Label>
                  <TextField field="name" value={S.name} placeholder="Agent name" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px 18px", marginBottom: 15 }}>
                  <div style={{ minWidth: 0 }}><Label on={dirty.agency}>Agency</Label><TextField field="agency" value={S.agency} placeholder="Agency" /></div>
                  <div style={{ minWidth: 0 }}><Label on={dirty.website}>Website</Label><TextField field="website" value={S.website} placeholder="agency.com" /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "13px 18px", marginBottom: 15 }}>
                  <div style={{ minWidth: 0 }}><Label on={dirty.email}>Email</Label><TextField field="email" value={S.email} placeholder="name@agency.com" /></div>
                  <div style={{ minWidth: 0 }}>
                    <Label on={dirty.rating}>Agent fit</Label>
                    <div style={{ marginTop: 2 }}><FitStars value={S.rating} size={19} showMeaning={false} onChange={(n) => set("rating", n)} /></div>
                  </div>
                </div>

                <Sec top>Submission profile</Sec>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px 18px", marginBottom: 15 }}>
                  <div style={{ minWidth: 0 }}>
                    <Label on={dirty.status}>Submission status</Label>
                    <SelectField field="status" value={S.status} options={STATUS_OPTIONS} onPick={(v) => set("status", v as SubmissionStatus)} />
                    {S.status === SubmissionStatus.CLOSED && openCount > 0 && (
                      <SoftNote>You have <b>{openCount} open {openCount === 1 ? "query" : "queries"}</b> to {firstName(S.name)}. Marking them closed won’t touch those — it just stops them appearing when you log a new query.</SoftNote>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Label on={dirty.method}>Submission method</Label>
                    <SelectField field="method" value={S.method} options={METHOD_OPTIONS} onPick={(v) => set("method", v)} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "13px 18px", marginBottom: 15 }}>
                  <div style={{ minWidth: 0 }}>
                    <Label on={dirty.weeks}>Response time</Label>
                    <WeeksField
                      weeks={S.weeks}
                      editing={editing === "weeks"}
                      onBegin={() => setEditing("weeks")}
                      onCommit={(n) => { set("weeks", n); setEditing(null); }}
                      onUnknown={() => { set("weeks", null); setEditing(null); }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Label on={dirty.noReply}>No response policy</Label>
                    <SelectField field="noReply" value={noReplyLabel(S.noReply)} options={NOREPLY_OPTIONS} onPick={(v) => set("noReply", v === NOREPLY_TRUE)} />
                  </div>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <Label on={dirty.materials}>Materials wanted</Label>
                  <ChipField field="materials" />
                </div>

                <Sec top>Genres &amp; wishlist</Sec>
                <div style={{ marginBottom: 15 }}>
                  <Label on={dirty.genres}>Genres</Label>
                  <ChipField field="genres" genre />
                </div>
                <div style={{ marginBottom: 15 }}>
                  <Label on={dirty.mswl}>Manuscript wishlist (MSWL)</Label>
                  <TextField field="mswl" value={S.mswl} placeholder="What they’re looking for…" multiline quoted />
                </div>

                <Sec top>Notes</Sec>
                <div style={{ marginBottom: 4 }}>
                  <Label on={dirty.notes}>Private notes</Label>
                  <TextField field="notes" value={S.notes} placeholder="Anything you want to remember…" multiline />
                </div>

                <Sec top>Queries to {firstName(S.name)}</Sec>
                {agentQueries.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", padding: "4px 0" }}>No queries to this agent yet.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: C.sub, margin: "-2px 0 4px" }}>
                      {openCount} open{awaitingCount > 0 ? ` · ${awaitingCount} awaiting a reply` : ""}
                    </div>
                    {agentQueries.map((q) => (
                      <div key={q.id} className="ea-qrow" role="button" tabIndex={0}
                        title="Opens in the Edit Query drawer"
                        onClick={() => onOpenQuery?.(q.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenQuery?.(q.id); } }}
                        style={{ display: "flex", gap: 11, padding: "8px 0", alignItems: "center", cursor: "pointer", borderRadius: 8 }}>
                        <StatusDot status={q.status} overrideSize={15} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, color: C.name, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msTitle(q)}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{getStatusLabel(q.status)}</div>
                        </div>
                        <span className="ea-qgo" style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.04em", textTransform: "uppercase", color: "#c2b4a4", flexShrink: 0 }}>open ↗</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* footer */}
              <div style={{ flexShrink: 0, borderTop: "1px solid #ece2d6", background: C.parchment, padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.05em", textTransform: "uppercase", color: blocked ? C.err : anyDirty ? C.burgundy : "#bcae9e", flex: 1, minWidth: 0 }}>
                  {saveError ? saveError : saved ? "✓ Saved" : blocked ? "Can’t save — fix the highlighted field first" : anyDirty ? "Unsaved changes" : "No unsaved changes"}
                </div>
                <span role="button" className="ea-discard" onClick={discardAll}
                  style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#a89a8a", cursor: "pointer", padding: "9px 14px", borderRadius: 8 }}>Discard</span>
                <button disabled={!anyDirty || blocked || saving} onClick={handleSave}
                  style={{
                    background: !anyDirty || blocked ? "#efe6da" : C.pink, border: `1px solid ${!anyDirty || blocked ? "#efe6da" : C.pinkBorder}`,
                    color: !anyDirty || blocked ? "#bcae9e" : C.burgundy, fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em",
                    textTransform: "uppercase", padding: "9px 18px", borderRadius: 8, cursor: !anyDirty || blocked || saving ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                  }}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── response-time field: "weeks" stays visible; "?" → Not set; blank commit snaps back ──────────
const WeeksField: React.FC<{ weeks: number | null; editing: boolean; onBegin: () => void; onCommit: (n: number | null) => void; onUnknown: () => void; }> = ({ weeks, editing, onBegin, onCommit, onUnknown }) => {
  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <input autoFocus defaultValue={weeks === null ? "" : String(weeks)} inputMode="numeric"
          style={{ width: 62, textAlign: "center", background: "#fff", border: `1px solid ${C.fieldBorder}`, borderRadius: 7, padding: "8px 11px", fontSize: 12.5, color: C.name, fontFamily: "'Inter',sans-serif", outline: "none" }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); else if (e.key === "Escape") { (e.target as HTMLInputElement).value = weeks === null ? "" : String(weeks); (e.target as HTMLInputElement).blur(); } }}
          onBlur={(e) => { const t = e.target.value.trim(); onCommit(/^\d+$/.test(t) ? parseInt(t, 10) : weeks); /* blank/junk → snap back */ }} />
        <span style={{ fontSize: 13, color: "#7a6e60" }}>weeks</span>
      </div>
    );
  }
  const notSet = weeks === null;
  return (
    <div className={`ea-weeks${notSet ? " notset" : ""}`} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
      <div className="ea-editable" tabIndex={0} role="button" style={{ flex: "0 0 auto", margin: "0 0 0 -8px" }}
        onClick={onBegin} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBegin(); } }}>
        <span className="ea-fval" style={{ flex: "0 0 auto", color: notSet ? C.muted : C.name, fontStyle: notSet ? "italic" : undefined }}>{notSet ? "Not set" : `${weeks} week${weeks === 1 ? "" : "s"}`}</span>
        <span className="ea-hint"><PencilGlyph /></span>
      </div>
      <button type="button" title="Don’t know their turnaround? Click to leave it unset." onClick={onUnknown}
        style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", border: "1px solid #d8cab9", background: "transparent", color: C.muted, fontFamily: MONO, fontSize: 10, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>?</button>
      <span className="ea-tip" style={{ position: "absolute", bottom: "140%", left: 0, width: 212, background: C.deep, color: "#f3ece2", fontSize: 10.5, lineHeight: 1.5, padding: "9px 11px", borderRadius: 8, boxShadow: "0 8px 22px rgba(58,28,20,0.3)", opacity: 0, pointerEvents: "none", transition: "opacity .15s", zIndex: 9 }}>
        No turnaround on record — their queries won’t get a “response expected by” date or a follow-up nudge until you add one.
      </span>
    </div>
  );
};

const ErrNote: React.FC<{ msg: string; onUndo: () => void; undoLabel: string }> = ({ msg, onUndo, undoLabel }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: "flex", gap: 7, alignItems: "flex-start", background: C.errBg, border: `1px solid ${C.errBorder}`, borderRadius: 7, padding: "8px 10px", fontSize: 11, color: C.err, lineHeight: 1.45 }}>
      <svg viewBox="0 0 16 16" fill="none" width={13} height={13} style={{ flexShrink: 0, marginTop: 1 }}><path d="M8 2l6.5 11.5h-13L8 2z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round" /><path d="M8 6.5v3M8 11.6h.01" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" /></svg>
      <span>{msg}</span>
    </div>
    <span role="button" onMouseDown={(e) => { e.preventDefault(); onUndo(); }}
      style={{ display: "inline-block", marginTop: 6, fontFamily: MONO, fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: C.burgundy, cursor: "pointer", borderBottom: "1px solid rgba(124,58,42,0.4)" }}>{undoLabel}</span>
  </div>
);

const SoftNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", gap: 7, alignItems: "flex-start", background: C.sageTint, border: "1px solid #d8e0d4", borderRadius: 7, padding: "8px 10px", marginTop: 8, fontSize: 11, color: C.darkSage, lineHeight: 1.45 }}>
    <svg viewBox="0 0 16 16" fill="none" width={13} height={13} style={{ flexShrink: 0, marginTop: 1 }}><circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth={1.2} /><path d="M5.5 8l1.7 1.7L10.5 6.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
    <span>{children}</span>
  </div>
);

const PencilGlyph = () => (
  <svg viewBox="0 0 16 16" fill="none" width={13} height={13}><path d="M11 2l3 3-8 8-3.5.5.5-3.5 8-8z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round" /></svg>
);
const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={13} height={13}><polyline points="6 9 12 15 18 9" /></svg>
);

/** Hover/scrollbar/animation bits that can't be inline. Scoped to ea- classes. */
const EditAgentStyles: React.FC = () => (
  <style>{`
    @keyframes ea-slide-in { 0%{transform:translateX(125%) rotate(-5deg);} 65%{transform:translateX(0) rotate(-3deg);} 100%{transform:translateX(0) rotate(0deg);} }
    .ea-slide > div { animation: ea-slide-in .55s cubic-bezier(.22,.61,.36,1); transform-origin:center; }
    .ea-body::-webkit-scrollbar{width:7px;} .ea-body::-webkit-scrollbar-thumb{background:#e3d6c8;border-radius:4px;}
    .ea-editable{position:relative;display:flex;align-items:center;gap:8px;border-radius:7px;padding:5px 8px;margin:0 -8px;cursor:text;transition:background .14s;}
    .ea-editable.selectable{cursor:pointer;}
    .ea-editable:hover{background:#faf3ec;}
    .ea-editable:focus-visible{outline:none;background:#faf3ec;box-shadow:0 0 0 2px rgba(138,158,136,0.35);}
    .ea-fval{flex:1;min-width:0;font-size:13px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .ea-fval.wrap{white-space:normal;}
    .ea-hint{flex-shrink:0;display:flex;align-items:center;color:#cdbeae;opacity:0;transition:opacity .14s;}
    .ea-editable:hover .ea-hint,.ea-editable:focus-visible .ea-hint{opacity:1;}
    .ea-chipadd:hover{border-color:#8a9e88!important;color:#5a6e58!important;}
    .ea-cx:hover{color:#7c3a2a!important;}
    .ea-qrow:hover{background:#fffdfa;}
    .ea-qrow:hover .ea-qgo{color:#7c3a2a!important;}
    .ea-discard:hover{color:#a83a2a!important;background:#f7eee9;}
    .ea-weeks.notset:hover .ea-tip{opacity:1!important;}
  `}</style>
);
