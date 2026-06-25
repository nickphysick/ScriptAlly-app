/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Edit Agent drawer — the click-to-edit agent editor, revised to edit-agent-v12.html (Prompt 5).
 *
 * Shell unchanged from Prompt 2 (slide-in MountPanel + inset burgundy clip, "editing" spine tab,
 * Lottie pencil in the sage band, scrolling body, pinned Save/Discard footer, per-field dirty-dots).
 * This pass changes the FIELDS + CONTROLS + LAYOUT + BEHAVIOURS to the mockup, reusing the create
 * form's canonical pieces: GenreCombobox, WeekSlider (Not-set "?" mode), and the shared materials
 * encoder/decoder (agentMaterials.ts) so materials ROUND-TRIP exactly.
 *
 * Sections: Identity · Contact & social · Submission requirements · Genres & wishlist · Notes ·
 * Queries to {name}. Colour language: sage = Open, burgundy = Closed, soft-pink = selected
 * materials / genre pills / "+ add platform".
 *
 * Behaviours: Enter saves+exits a field (Shift+Enter = newline in textareas); closing by
 * outside-click/X/Esc PARKS the draft in session memory keyed by agentId (reopen rehydrates with
 * dirty-dots) — Save/Discard clear it; clearing a set agency prompts a confirm (name-or-agency
 * identity anchor). Socials write the list AND mirror X/Bluesky/Instagram into the discrete fields.
 *
 * Saves through useScriptAllyDb().saveAgentEdits; a numeric responseTimeWeeks change fans out to the
 * agent's queries inside that funnel (Prompt 3). Critical colours are inline (Tailwind drift trap).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import Lottie from "lottie-react";
import { useScriptAllyDb } from "../lib/db";
import { Agent, AgentSocial, Query, QueryStatus, SubmissionStatus, SubmissionMethod } from "../types";
import { BrandDropdown, WeekSlider, GenreCombobox, FitStars, SegmentedToggle } from "./forms";
import { StatusDot } from "./StatusDot";
import { getStatusLabel } from "./StatusPill";
import { AgentEditPatch } from "../lib/saveAgentEdits";
import {
  AgentMaterialsState, MAT_OPTS, MAT_QTY, buildAgentMaterials, parseAgentMaterials, materialsCountErrors,
} from "../lib/agentMaterials";
import { AGENT_GENRES, SOCIAL_PLATFORMS, METHOD_OPTIONS, COUNTRIES } from "../lib/agentOptions";
import { agentDataQualityNeeds, AgentDataNeed } from "../lib/agentDataQuality";
import editPencil from "../assets/edit-pencil-animation.json";

const C = {
  parchment: "#fdfaf5", field: "#ffffff", fieldBorder: "#e0d5c8",
  burgundy: "#7c3a2a", deep: "#3a1c14", pink: "#f5e2da", pinkBorder: "#e8c8bc",
  label: "#9c8878", name: "#3a1c14", sub: "#6a7e68", sage1: "#d7ddd5", sage2: "#d5dbd3",
  sageAccent: "#8a9e88", darkSage: "#5a6e58", sageTint: "#eef2ec",
  err: "#a83a2a", errBg: "#f7e4de", errBorder: "#e6bdb0", muted: "#a89a8a",
};
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Playfair Display', serif";

// No-response policy ↔ boolean (v12 two-state). The Agent model has only the boolean; these are the
// two storable states. (The create form additionally records a 3rd label in agentNotes — the drawer
// maps to the boolean only and does not rewrite that label.)
const NOREPLY_TRUE = "Only responds if interested";
const NOREPLY_FALSE = "Responds either way";
const noReplyLabel = (b: boolean) => (b ? NOREPLY_TRUE : NOREPLY_FALSE);

const SOCIAL_DD = SOCIAL_PLATFORMS.map((p) => ({ value: p, label: p }));

const AWAITING_REPLY = new Set<QueryStatus>([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);
const TERMINAL = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const firstName = (n: string) => (n.trim().split(/\s+/)[0] || "this agent");
const eqArr = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
/** Filled socials only, normalised for comparison + write. */
const cleanSocials = (list: AgentSocial[]): AgentSocial[] =>
  list.filter((s) => s.platform && s.handle.trim() !== "").map((s) => ({ platform: s.platform, handle: s.handle.trim() }));

/** The drawer's editable working copy. */
interface Draft {
  name: string; agency: string; email: string; website: string; country: string; city: string;
  socials: AgentSocial[];
  status: SubmissionStatus; method: string; noReply: boolean;
  weeks: number | null; rating: number;
  genres: string[]; materials: AgentMaterialsState; mswl: string; notes: string;
}

const seedSocials = (a: Agent): AgentSocial[] => {
  if (a.socials && a.socials.length) return a.socials.map((s) => ({ platform: s.platform, handle: s.handle }));
  // Legacy agents may carry only the discrete fields — synthesise rows so they're editable.
  const out: AgentSocial[] = [];
  if (a.twitter) out.push({ platform: "X / Twitter", handle: a.twitter });
  if (a.bluesky) out.push({ platform: "Bluesky", handle: a.bluesky });
  if (a.instagram) out.push({ platform: "Instagram", handle: a.instagram });
  return out;
};

const draftFromAgent = (a: Agent): Draft => ({
  name: a.name ?? "", agency: a.agency ?? "", email: a.email ?? "", website: a.website ?? "",
  country: a.country ?? "", city: a.city ?? "", socials: seedSocials(a),
  status: (a.submissionStatus as SubmissionStatus) ?? SubmissionStatus.UNKNOWN,
  method: a.submissionMethod ?? SubmissionMethod.EMAIL,
  noReply: !!a.noResponseMeansNo,
  weeks: typeof a.responseTimeWeeks === "number" ? a.responseTimeWeeks : null,
  rating: a.starRating ?? 0,
  genres: [...(a.genres ?? [])], materials: parseAgentMaterials(a.materialsWanted),
  mswl: a.mswlNotes ?? "", notes: a.notes ?? "",
});

/** Session-only parked drafts, keyed by agentId. Cleared on reload (in-memory). Closing the drawer
 *  by outside-click/X/Esc stashes an unsaved draft here; reopening the same agent rehydrates it. */
const parkedDrafts = new Map<string, Draft>();

export interface EditAgentDrawerProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  /** Lock background (window) scroll at its current position while open — the app-level overlay use. */
  lockScroll?: boolean;
  /** Opened from a `data_quality_poor` to-do → highlight the deficient fields (banner + pulsing ring). */
  highlightNeeds?: boolean;
  /** Read-only queries list rows link out via this (the Edit Query drawer isn't mounted here). */
  onOpenQuery?: (queryId: string) => void;
  onSavedToast?: (msg: string) => void;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Per-deficiency copy for the in-focus journey + banner. `ref` keys the field for spotlight/scroll. */
const NEED_INFO: Record<AgentDataNeed, { label: string; why: string; where: string }> = {
  responseTime: {
    label: "response time",
    why: "Their typical turnaround lets ScriptAlly tell you when a query has gone cold and a chaser is due.",
    where: "Their submission page or QueryTracker usually states a window (often 8–12 weeks). Not stated anywhere? Mark it Unknown.",
  },
  materials: {
    label: "materials wanted",
    why: "Sending exactly what they ask for — no more, no less — keeps your submission clean and on their good side.",
    where: "Their submission guidelines list what to include: query letter, synopsis, first pages/chapters, word count.",
  },
  mswl: {
    label: "manuscript wishlist",
    why: "Their wishlist is your best steer on whether — and how — to pitch this particular book.",
    where: "Look at their #MSWL posts, agency bio, or recent interviews for the kinds of stories they want.",
  },
};

export const EditAgentDrawer: React.FC<EditAgentDrawerProps> = ({ agent, isOpen, onClose, lockScroll, highlightNeeds, onOpenQuery, onSavedToast }) => {
  const { queries, manuscripts, saveAgentEdits } = useScriptAllyDb();

  const orig = useMemo(() => draftFromAgent(agent), [agent]);
  const [S, setS] = useState<Draft>(orig);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [agencyConfirmed, setAgencyConfirmed] = useState(false);
  const [closing, setClosing] = useState(false);
  const editBuf = useRef<string>("");

  // In-focus journey (task-routed opens). journeyFields = the deficiencies FROZEN at open (so the
  // step list doesn't shift as they're filled); journeyStep: -1 intro, 0..N-1 field steps, N success,
  // null = no journey / ended (→ calm banner). fieldRefs let the spotlight scroll a field into view.
  const [journeyFields, setJourneyFields] = useState<AgentDataNeed[]>([]);
  const [journeyStep, setJourneyStep] = useState<number | null>(null);
  const fieldRefs = useRef<Partial<Record<AgentDataNeed, HTMLDivElement | null>>>({});
  const highlightSet = journeyFields;
  const journeyActive = journeyStep !== null && journeyStep >= 0 && journeyStep < highlightSet.length;
  const currentField: AgentDataNeed | null = journeyActive ? highlightSet[journeyStep as number] : null;

  // Reseed when the agent changes or the drawer (re)opens — rehydrating a parked draft if one exists.
  useEffect(() => {
    setS(parkedDrafts.get(agent.id) ?? orig);
    setEditing(null); setSaved(false); setSaveError(null); setAgencyConfirmed(false);
    const needs = highlightNeeds
      ? agentDataQualityNeeds({ mswlNotes: agent.mswlNotes, materialsWanted: agent.materialsWanted, responseTimeWeeks: agent.responseTimeWeeks })
      : [];
    setJourneyFields(needs);
    setJourneyStep(needs.length ? -1 : null); // open the intro when there are deficiencies
  }, [orig, isOpen, agent.id, highlightNeeds]);

  // Spotlight: scroll the current journey field into view when the step changes.
  useEffect(() => {
    if (!currentField) return;
    fieldRefs.current[currentField]?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  }, [currentField]);

  // Reset the slide-back only on (re)open — NOT on the post-save agent reseed (the host keeps the
  // drawer mounted with isOpen=true through the close), which would otherwise cancel it mid-flight.
  useEffect(() => { setClosing(false); }, [isOpen]);

  // Lock the background at its current scroll position while open; restore (no jump) on close.
  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    const scrollY = window.scrollY;
    const b = document.body;
    const prev = { position: b.style.position, top: b.style.top, left: b.style.left, right: b.style.right, width: b.style.width };
    b.style.position = "fixed"; b.style.top = `-${scrollY}px`; b.style.left = "0"; b.style.right = "0"; b.style.width = "100%";
    return () => {
      b.style.position = prev.position; b.style.top = prev.top; b.style.left = prev.left; b.style.right = prev.right; b.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, lockScroll]);

  // Slide-back exit: every close path plays the reverse of the entrance, then unmounts on
  // animationend (fallback timeout guards). Reduced-motion → instant (finishClose calls onClose).
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(onClose, 250); // matches the ~0.18s fast exit (+ a little slack)
    return () => clearTimeout(t);
  }, [closing, onClose]);

  // ── derived ──────────────────────────────────────────────────────────────────
  const agentQueries = queries.filter((q) => q.agentId === agent.id);
  const openCount = agentQueries.filter((q) => !TERMINAL.has(q.status)).length;
  const awaitingCount = agentQueries.filter((q) => AWAITING_REPLY.has(q.status)).length;
  const msTitle = (q: Query) => manuscripts.find((m) => m.id === q.manuscriptId)?.title || "Untitled manuscript";

  const dirty = {
    name: S.name !== orig.name, agency: S.agency !== orig.agency, email: S.email !== orig.email,
    website: S.website !== orig.website, country: S.country !== orig.country, city: S.city !== orig.city,
    socials: JSON.stringify(cleanSocials(S.socials)) !== JSON.stringify(cleanSocials(orig.socials)),
    status: S.status !== orig.status, method: S.method !== orig.method,
    noReply: S.noReply !== orig.noReply, weeks: S.weeks !== orig.weeks, rating: S.rating !== orig.rating,
    genres: !eqArr(S.genres, orig.genres),
    materials: !eqArr(buildAgentMaterials(S.materials), buildAgentMaterials(orig.materials)),
    mswl: S.mswl !== orig.mswl, notes: S.notes !== orig.notes,
  };
  const anyDirty = Object.values(dirty).some(Boolean);

  const materialsBad = materialsCountErrors(S.materials);
  const agencyRemoved = orig.agency.trim() !== "" && S.agency.trim() === "";
  const needAgencyConfirm = agencyRemoved && !agencyConfirmed;
  const liveErrors: Record<string, string> = {};
  if (S.name.trim() === "") liveErrors.name = "An agent needs a name. Add one to save, or undo to keep what was there.";
  if (S.email.trim() !== "" && !emailOk(S.email)) liveErrors.email = "That doesn’t look like an email address. Fix it or clear the field.";
  const blocked = Object.keys(liveErrors).length > 0 || materialsBad.size > 0 || needAgencyConfirm;

  // `remaining` re-runs the SAME predicate on the LIVE draft, so a field clears the instant it's
  // filled (and a save makes the derived to-do re-evaluate clean → it disappears).
  const draftNeeds = highlightSet.length
    ? agentDataQualityNeeds({ mswlNotes: S.mswl, materialsWanted: buildAgentMaterials(S.materials), responseTimeWeeks: S.weeks })
    : [];
  const remaining = highlightSet.filter((n) => draftNeeds.includes(n));
  // During the journey only the current field rings (steady spotlight); once it ends, still-deficient
  // fields gently pulse and cleared ones show the sage confirm.
  const fieldHighlight = (n: AgentDataNeed): "" | "spotlight" | "pulse" | "done" => {
    if (!highlightSet.includes(n)) return "";
    if (journeyStep !== null && journeyStep < highlightSet.length) return n === currentField ? "spotlight" : "";
    return remaining.includes(n) ? "pulse" : "done";
  };
  const bannerShown = highlightSet.length > 0 && (journeyStep === null || journeyStep >= highlightSet.length);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    if (k === "agency") setAgencyConfirmed(false); // re-clearing prompts confirm again
    setS((p) => ({ ...p, [k]: v }));
  };

  // ── close / park / discard ─────────────────────────────────────────────────────
  // park=true (outside-click / X / Esc) stashes an unsaved draft; park=false (save-complete) clears
  // it. Triggers the slide-back; the deferred unmount happens on animationend / fallback timeout.
  const finishClose = (park: boolean) => {
    if (park && anyDirty) parkedDrafts.set(agent.id, S); else parkedDrafts.delete(agent.id);
    if (prefersReducedMotion()) { onClose(); return; }
    setClosing(true);
  };
  const closeRef = useRef<() => void>(() => {});
  closeRef.current = () => finishClose(true);
  useEffect(() => {
    // Capture-phase + stopImmediatePropagation so the top overlay owns Escape (works when opened
    // over a FormShell — the Log-a-Query stub path). Esc parks like an outside-click; an inline edit
    // keeps its own Esc.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !isOpen || editing) return;
      e.stopImmediatePropagation();
      closeRef.current();
    };
    if (isOpen) window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const discardAll = () => {
    parkedDrafts.delete(agent.id);
    setS(orig); setEditing(null); setSaveError(null); setAgencyConfirmed(false);
  };

  // ── save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!anyDirty || blocked || saving) return;
    const patch: AgentEditPatch = {};
    if (dirty.name) patch.name = S.name.trim();
    if (dirty.agency) patch.agency = S.agency.trim();
    if (dirty.email) patch.email = S.email.trim();
    if (dirty.website) patch.website = S.website.trim();
    if (dirty.country) patch.country = S.country.trim();
    if (dirty.city) patch.city = S.city.trim();
    if (dirty.status) patch.submissionStatus = S.status;
    if (dirty.method) patch.submissionMethod = S.method;
    if (dirty.noReply) patch.noResponseMeansNo = S.noReply;
    if (dirty.weeks) patch.responseTimeWeeks = S.weeks; // number, or null = "Not set" → deleteField()
    if (dirty.rating) patch.starRating = S.rating;
    if (dirty.genres) patch.genres = S.genres;
    if (dirty.materials) patch.materialsWanted = buildAgentMaterials(S.materials);
    if (dirty.mswl) patch.mswlNotes = S.mswl;
    if (dirty.notes) patch.notes = S.notes;
    if (dirty.socials) {
      const filled = cleanSocials(S.socials);
      patch.socials = filled;
      // Mirror the three known platforms into the discrete fields the agent-DB display reads; a
      // removed platform clears its field. (See [[agent-socials-display-backlog]].)
      const handleFor = (p: string) => filled.find((s) => s.platform === p)?.handle ?? "";
      patch.twitter = handleFor("X / Twitter");
      patch.bluesky = handleFor("Bluesky");
      patch.instagram = handleFor("Instagram");
    }

    setSaving(true);
    setSaveError(null);
    const res = await saveAgentEdits(agent.id, patch);
    setSaving(false);
    if (!res.ok) { setSaveError("error" in res ? res.error : "Couldn’t save the agent."); return; }
    setSaved(true);
    onSavedToast?.("Agent updated");
    // Show the ✓ briefly, then slide back into the drawer (no park — it's saved).
    setTimeout(() => finishClose(false), 600);
  };

  // ── small presentational helpers ──────────────────────────────────────────────
  const Label = ({ children, on }: { children: React.ReactNode; on: boolean }) => (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: C.label, marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
      {children}
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.burgundy, opacity: on ? 0.65 : 0, transition: "opacity .15s", display: "inline-block" }} />
    </div>
  );
  const Sec = ({ children, top }: { children: React.ReactNode; top?: boolean }) => (
    <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#5a4636", margin: top ? "24px 0 11px" : "2px 0 11px", display: "flex", alignItems: "center", gap: 9 }}>
      <span>{children}</span><span style={{ flex: 1, height: 1, background: "#e6d8c8" }} />
    </div>
  );

  // Click-to-edit TEXT field — resting bordered affordance; Enter commits, Shift+Enter newline, Esc reverts.
  const TextField = ({ field, value, placeholder, multiline, quoted }: {
    field: keyof Draft; value: string; placeholder: string; multiline?: boolean; quoted?: boolean;
  }) => {
    const isEditing = editing === field;
    const err = liveErrors[field as string];
    const empty = value.trim() === "";
    const display = empty ? (field === "name" ? "No name" : placeholder) : (quoted ? `“${value}”` : value);
    if (isEditing) {
      const common = {
        autoFocus: true, defaultValue: value, placeholder,
        onFocus: () => { editBuf.current = value; },
        onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { set(field, e.target.value as Draft[typeof field]); setEditing(null); },
        className: `ea-inp${err ? " bad" : ""}`,
        style: multiline ? { minHeight: 54, lineHeight: 1.45, resize: "vertical" as const, fontStyle: quoted ? ("italic" as const) : undefined } : undefined,
      };
      return multiline ? (
        <textarea {...common} onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
          else if (e.key === "Escape") { (e.target as HTMLTextAreaElement).value = editBuf.current; (e.target as HTMLTextAreaElement).blur(); }
        }} />
      ) : (
        <input {...common} onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === "Escape") { (e.target as HTMLInputElement).value = editBuf.current; (e.target as HTMLInputElement).blur(); }
        }} />
      );
    }
    return (
      <>
        <div className="ea-editable" tabIndex={0} role="button"
          onClick={() => setEditing(field as string)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(field as string); } }}>
          <span className={`ea-fval${multiline || quoted ? " wrap" : ""}${empty ? " ph" : ""}${err ? " errval" : ""}`} style={{ fontStyle: quoted && !empty ? "italic" : undefined }}>{display}</span>
          <span className="ea-hint"><PencilGlyph /></span>
        </div>
        {err && <ErrNote msg={err} onUndo={() => { set(field, orig[field] as Draft[typeof field]); setEditing(null); }} undoLabel={`Undo — keep “${String(orig[field]) || "blank"}”`} />}
        {field === "agency" && needAgencyConfirm && (
          <ConfirmNote
            name={firstName(S.name)}
            onConfirm={() => setAgencyConfirmed(true)}
            onKeep={() => { set("agency", orig.agency); setEditing(null); }}
          />
        )}
        {field === "agency" && agencyRemoved && agencyConfirmed && (
          <div className="ea-confirm done"><OkIcon /><span>Agency removed — this agent will show by name alone.</span></div>
        )}
      </>
    );
  };

  const footerText = saveError ? saveError
    : saved ? "✓ Saved"
    : materialsBad.size > 0 ? "Can’t save — fix the highlighted count"
    : Object.keys(liveErrors).length > 0 ? "Can’t save — fix the highlighted field first"
    : needAgencyConfirm ? "Confirm the agency change before saving"
    : anyDirty ? "Unsaved changes" : "No unsaved changes";

  return (
    <>
      <EditAgentStyles />
      <div onClick={() => finishClose(true)} style={{ position: "fixed", inset: 0, background: "rgba(58,28,20,0.18)", zIndex: 1000 }} />
      <div className={`ea-slide${closing ? " ea-closing" : ""}`} style={{ position: "fixed", top: 0, right: 0, height: "100vh", zIndex: 1001, display: "flex", alignItems: "center", padding: "0 24px", boxSizing: "border-box" }}>
        <div style={{ position: "relative" }} onAnimationEnd={() => { if (closing) onClose(); }}>
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
                <div role="button" aria-label="Close" onClick={() => finishClose(true)} style={{ position: "absolute", top: 13, right: 15, width: 22, height: 22, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.sub }}>
                  <svg viewBox="0 0 16 16" fill="none" width={16} height={16}><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" /></svg>
                </div>
              </div>

              {/* scrolling body */}
              <div className="ea-body" style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
                {/* In-focus journey (intro → one field at a time → success), then a calm banner. */}
                {journeyStep === -1 && (
                  <div className="ea-jcard">
                    <div className="ea-jtitle">Let’s finish {firstName(S.name)}’s profile</div>
                    <div className="ea-jwhy">{highlightSet.length} detail{highlightSet.length === 1 ? " is" : "s are"} missing — I’ll walk you through {highlightSet.length === 1 ? "it" : "them"}, one at a time.</div>
                    <div className="ea-jrow">
                      <button type="button" className="ea-jnext" onClick={() => setJourneyStep(0)}>Start</button>
                      <button type="button" className="ea-jskip" onClick={() => setJourneyStep(null)}>I’ll do it myself</button>
                    </div>
                  </div>
                )}
                {journeyActive && currentField && (
                  <div className="ea-jcard">
                    <div className="ea-jstep">Step {(journeyStep as number) + 1} of {highlightSet.length}</div>
                    <div className="ea-jtitle">Add their {NEED_INFO[currentField].label}</div>
                    <div className="ea-jwhy">{NEED_INFO[currentField].why}</div>
                    <div className="ea-jwhere"><b>Where to find it:</b> {NEED_INFO[currentField].where}</div>
                    <div className="ea-jrow">
                      <button type="button" className="ea-jback" onClick={() => setJourneyStep((journeyStep as number) === 0 ? -1 : (journeyStep as number) - 1)}>Back</button>
                      <span style={{ flex: 1 }} />
                      <button type="button" className="ea-jskip" onClick={() => setJourneyStep(null)}>Skip</button>
                      <button type="button" className="ea-jnext" onClick={() => {
                        const last = (journeyStep as number) === highlightSet.length - 1;
                        if (!last) setJourneyStep((journeyStep as number) + 1);
                        else setJourneyStep(remaining.length === 0 ? highlightSet.length : null);
                      }}>{(journeyStep as number) === highlightSet.length - 1 ? "Finish" : "Next"}</button>
                    </div>
                  </div>
                )}
                {journeyStep === highlightSet.length && highlightSet.length > 0 && (
                  <div className="ea-jcard success">
                    <div className="ea-jtitle"><OkIcon /> All done — you can query {firstName(S.name)} with confidence.</div>
                    <div className="ea-jrow"><button type="button" className="ea-jnext" onClick={() => setJourneyStep(null)}>Done</button></div>
                  </div>
                )}
                {bannerShown && (
                  <div className={`ea-needbanner${remaining.length === 0 ? " allset" : ""}`}>
                    {remaining.length === 0 ? <OkIcon /> : <AlertIcon />}
                    <span>
                      {remaining.length === 0
                        ? <>All set — the highlighted details are filled. <b>Save</b> to clear this from your to-do list.</>
                        : <>Still to add: <b>{remaining.map((n) => NEED_INFO[n].label).join(" and ")}</b>. The highlighted field{remaining.length === 1 ? "" : "s"} below need{remaining.length === 1 ? "s" : ""} it.</>}
                    </span>
                  </div>
                )}
                <Sec>Identity</Sec>
                <Field><Label on={dirty.name}>Name</Label><TextField field="name" value={S.name} placeholder="Agent name" /></Field>
                <Two>
                  <Field><Label on={dirty.agency}>Agency</Label><TextField field="agency" value={S.agency} placeholder="Add agency" /></Field>
                  <Field><Label on={dirty.rating}>Agent fit</Label><div style={{ minHeight: 38, display: "flex", alignItems: "center" }}><FitStars value={S.rating} size={20} showMeaning={false} onChange={(n) => set("rating", n)} /></div></Field>
                </Two>
                <Two>
                  <Field><Label on={dirty.country}>Country</Label><EaSelect value={S.country} options={COUNTRIES} onChange={(v) => set("country", v)} placeholder="Select a country…" /></Field>
                  <Field><Label on={dirty.city}>City</Label><TextField field="city" value={S.city} placeholder="Add city (optional)" /></Field>
                </Two>

                <Sec top>Contact &amp; social</Sec>
                <Two>
                  <Field><Label on={dirty.email}>Email</Label><TextField field="email" value={S.email} placeholder="Add email" /></Field>
                  <Field><Label on={dirty.website}>Website</Label><TextField field="website" value={S.website} placeholder="Add website" /></Field>
                </Two>
                <Field><Label on={dirty.socials}>Social handles</Label><SocialsList socials={S.socials} onChange={(v) => set("socials", v)} /></Field>

                <Sec top>Submission requirements</Sec>
                <Two>
                  <Field>
                    <Label on={dirty.status}>Submission status</Label>
                    {/* Reuse the create form's SegmentedToggle verbatim; Unknown → neither lit + caption. */}
                    <div style={{ marginTop: 2 }}>
                      <SegmentedToggle<SubmissionStatus>
                        ariaLabel="Submission status"
                        value={S.status}
                        options={[{ value: SubmissionStatus.OPEN, label: "Open" }, { value: SubmissionStatus.CLOSED, label: "Closed" }]}
                        onChange={(v) => set("status", v)}
                      />
                      {S.status !== SubmissionStatus.OPEN && S.status !== SubmissionStatus.CLOSED && (
                        <div style={{ fontSize: 10.5, color: C.muted, fontStyle: "italic", marginTop: 5 }}>Status unknown — choose Open or Closed</div>
                      )}
                    </div>
                    {S.status === SubmissionStatus.CLOSED && openCount > 0 && (
                      <SoftNote>You have <b>{openCount} open {openCount === 1 ? "query" : "queries"}</b> to {firstName(S.name)}. Marking them closed won’t touch those — it just stops them appearing when you log a new query.</SoftNote>
                    )}
                  </Field>
                  <Field><Label on={dirty.method}>Submission method</Label><EaSelect value={S.method} options={METHOD_OPTIONS} onChange={(v) => set("method", v)} /></Field>
                </Two>
                <Field>
                  <Label on={dirty.weeks}>Response time</Label>
                  <NeedWrap ring={fieldHighlight("responseTime")} innerRef={(el) => { fieldRefs.current.responseTime = el; }}>
                    <WeekSlider
                      label=""
                      value={S.weeks}
                      onChange={(n) => set("weeks", n)}
                      onUnknown={() => set("weeks", null)}
                      unknownHint="No turnaround on record means no “response expected by” date and no chaser reminder. If their guidelines don’t state one, a typical agency window is 8–12 weeks — set that, or mark Unknown."
                    />
                  </NeedWrap>
                </Field>
                <Field><Label on={dirty.noReply}>Response policy</Label><EaSelect value={noReplyLabel(S.noReply)} options={[NOREPLY_TRUE, NOREPLY_FALSE]} onChange={(v) => set("noReply", v === NOREPLY_TRUE)} /></Field>
                <Field><Label on={dirty.materials}>Materials wanted</Label><NeedWrap ring={fieldHighlight("materials")} innerRef={(el) => { fieldRefs.current.materials = el; }}><MaterialsControl state={S.materials} bad={materialsBad} onChange={(v) => set("materials", v)} /></NeedWrap></Field>

                <Sec top>Genres &amp; wishlist</Sec>
                <Field><Label on={dirty.genres}>Genres</Label><div style={{ marginTop: 2 }}><GenreCombobox options={AGENT_GENRES} value={S.genres} onChange={(v) => set("genres", v)} placeholder="Type a genre…" /></div></Field>
                <Field><Label on={dirty.mswl}>Manuscript wishlist (MSWL)</Label><NeedWrap ring={fieldHighlight("mswl")} innerRef={(el) => { fieldRefs.current.mswl = el; }}><TextField field="mswl" value={S.mswl} placeholder="Add a manuscript wishlist" multiline quoted /></NeedWrap></Field>

                <Sec top>Notes</Sec>
                <Field last><Label on={dirty.notes}>Private notes</Label><TextField field="notes" value={S.notes} placeholder="Add a private note" multiline /></Field>

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
                <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.05em", textTransform: "uppercase", color: blocked ? C.err : anyDirty ? C.burgundy : "#bcae9e", flex: 1, minWidth: 0 }}>{footerText}</div>
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

// ── layout atoms ────────────────────────────────────────────────────────────────
const Field: React.FC<{ children: React.ReactNode; last?: boolean }> = ({ children, last }) => (
  <div style={{ marginBottom: last ? 4 : 14 }}>{children}</div>
);
const Two: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>{children}</div>
);

// ── needs-attention ring wrapper (task-routed opens): steady spotlight in the journey; pink pulse
//    while deficient afterwards; sage once filled. `innerRef` lets the journey scroll it into view. ─
const NeedWrap: React.FC<{ ring: "" | "pulse" | "done" | "spotlight"; innerRef?: (el: HTMLDivElement | null) => void; children: React.ReactNode }> = ({ ring, innerRef, children }) =>
  (ring || innerRef) ? <div ref={innerRef} className={ring ? `ea-need ea-need-${ring}` : undefined}>{children}</div> : <>{children}</>;

// ── one-click styled native select (method / response policy / country) ──────────
// Always visible, opens on a single click (no reveal indirection), commits on change. Styled to
// read like the resting click-to-edit fields. An empty value shows the muted placeholder option.
const EaSelect: React.FC<{ value: string; options: string[]; onChange: (v: string) => void; placeholder?: string }> = ({ value, options, onChange, placeholder }) => {
  const empty = value.trim() === "";
  return (
    <select className={`ea-select${empty ? " ph" : ""}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
};

// ── materials: soft-pink pills + revealed validated count inputs + Other free-text ─
const MaterialsControl: React.FC<{ state: AgentMaterialsState; bad: Set<string>; onChange: (s: AgentMaterialsState) => void }> = ({ state, bad, onChange }) => {
  const toggle = (opt: string) => {
    const selected = state.selected.includes(opt) ? state.selected.filter((o) => o !== opt) : [...state.selected, opt];
    onChange({ ...state, selected });
  };
  const setCount = (opt: string, v: string) => onChange({ ...state, counts: { ...state.counts, [opt]: v.replace(/\D/g, "") } });
  const showDetails = state.selected.some((o) => MAT_QTY[o]) || state.selected.includes("Other");
  return (
    <div style={{ marginTop: 2 }}>
      <div className="ea-matpills">
        {MAT_OPTS.map((opt) => (
          <button key={opt} type="button" className={`ea-matpill${state.selected.includes(opt) ? " on" : ""}`} onClick={() => toggle(opt)}>{opt}</button>
        ))}
      </div>
      {showDetails && (
        <div className="ea-matdetails">
          {MAT_OPTS.filter((o) => MAT_QTY[o] && state.selected.includes(o)).map((opt) => {
            const q = MAT_QTY[opt];
            return (
              <label key={opt} className="ea-matrow">
                First
                <input className={bad.has(opt) ? "bad" : ""} inputMode="numeric" placeholder={q.placeholder}
                  value={state.counts[opt] || ""} onChange={(e) => setCount(opt, e.target.value)} />
                {q.unit}
              </label>
            );
          })}
          {state.selected.includes("Other") && (
            <label className="ea-matrow other">
              <input placeholder="Specify other materials…" value={state.otherText} onChange={(e) => onChange({ ...state, otherText: e.target.value })} />
            </label>
          )}
        </div>
      )}
    </div>
  );
};

// ── dynamic social handles ───────────────────────────────────────────────────────
const SocialsList: React.FC<{ socials: AgentSocial[]; onChange: (s: AgentSocial[]) => void }> = ({ socials, onChange }) => {
  const update = (i: number, patch: Partial<AgentSocial>) => onChange(socials.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(socials.filter((_, idx) => idx !== i));
  const add = () => {
    const used = socials.map((s) => s.platform);
    const next = SOCIAL_PLATFORMS.find((p) => !used.includes(p)) || "Other";
    onChange([...socials, { platform: next, handle: "" }]);
  };
  return (
    <div style={{ marginTop: 2 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {socials.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: "0 0 138px" }}>
              <BrandDropdown value={s.platform || "Other"} options={SOCIAL_DD} onChange={(v) => update(i, { platform: v })} />
            </div>
            <input className="ea-socialhandle" placeholder="@handle or URL" value={s.handle} onChange={(e) => update(i, { handle: e.target.value })} />
            <button type="button" className="ea-socialx" title="Remove" aria-label="Remove social handle" onClick={() => remove(i)}>✕</button>
          </div>
        ))}
      </div>
      <button type="button" className="ea-addsocial" onClick={add}>+ add platform</button>
    </div>
  );
};

// ── notes ──────────────────────────────────────────────────────────────────────
const ErrNote: React.FC<{ msg: string; onUndo: () => void; undoLabel: string }> = ({ msg, onUndo, undoLabel }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: "flex", gap: 7, alignItems: "flex-start", background: C.errBg, border: `1px solid ${C.errBorder}`, borderRadius: 7, padding: "8px 10px", fontSize: 11, color: C.err, lineHeight: 1.45 }}>
      <AlertIcon /><span>{msg}</span>
    </div>
    <span role="button" onMouseDown={(e) => { e.preventDefault(); onUndo(); }}
      style={{ display: "inline-block", marginTop: 6, fontFamily: MONO, fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: C.burgundy, cursor: "pointer", borderBottom: "1px solid rgba(124,58,42,0.4)" }}>{undoLabel}</span>
  </div>
);
const SoftNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", gap: 7, alignItems: "flex-start", background: C.sageTint, border: "1px solid #d8e0d4", borderRadius: 7, padding: "8px 10px", marginTop: 8, fontSize: 11, color: C.darkSage, lineHeight: 1.45 }}>
    <OkIcon /><span>{children}</span>
  </div>
);
const ConfirmNote: React.FC<{ name: string; onConfirm: () => void; onKeep: () => void }> = ({ name, onConfirm, onKeep }) => (
  <div style={{ marginTop: 8 }}>
    <div className="ea-confirm"><AlertIcon /><span>Removing the agency means <b>{name}</b> will be identified by its name alone.</span></div>
    <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
      <button type="button" className="ea-cbtn-go" onMouseDown={(e) => { e.preventDefault(); onConfirm(); }}>Remove anyway</button>
      <button type="button" className="ea-cbtn-keep" onMouseDown={(e) => { e.preventDefault(); onKeep(); }}>Keep agency</button>
    </div>
  </div>
);

const AlertIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" width={13} height={13} style={{ flexShrink: 0, marginTop: 1 }}><path d="M8 2l6.5 11.5h-13L8 2z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round" /><path d="M8 6.5v3M8 11.6h.01" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" /></svg>
);
const OkIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" width={13} height={13} style={{ flexShrink: 0, marginTop: 1 }}><circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth={1.2} /><path d="M5.5 8l1.7 1.7L10.5 6.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const PencilGlyph = () => (
  <svg viewBox="0 0 16 16" fill="none" width={13} height={13}><path d="M11 2l3 3-8 8-3.5.5.5-3.5 8-8z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round" /></svg>
);

/** Hover/scrollbar/animation + the resting-field, pill, toggle, social bits that can't be inline. */
const EditAgentStyles: React.FC = () => (
  <style>{`
    @keyframes ea-slide-in { 0%{transform:translateX(125%) rotate(-5deg);} 65%{transform:translateX(0) rotate(-3deg);} 100%{transform:translateX(0) rotate(0deg);} }
    @keyframes ea-slide-out { 0%{transform:translateX(0) rotate(0deg);} 100%{transform:translateX(130%) rotate(-4deg);} }
    .ea-slide > div { animation: ea-slide-in .55s cubic-bezier(.22,.61,.36,1); transform-origin:center; }
    .ea-slide.ea-closing > div { animation: ea-slide-out .18s cubic-bezier(.5,0,.9,.4) forwards; }
    @media (prefers-reduced-motion: reduce) { .ea-slide > div, .ea-slide.ea-closing > div { animation: none !important; } }
    .ea-body::-webkit-scrollbar{width:7px;} .ea-body::-webkit-scrollbar-thumb{background:#e3d6c8;border-radius:4px;}
    .ea-needbanner{display:flex;gap:9px;align-items:flex-start;background:#fdf0ea;border:1px solid #f0d4c8;border-radius:10px;padding:11px 13px;margin-bottom:16px;font-size:11.5px;line-height:1.5;color:#8a5a44;}
    .ea-needbanner b{font-weight:600;}
    .ea-needbanner.allset{background:#eef2ec;border-color:#d8e0d4;color:#5a6e58;}
    .ea-need{border-radius:10px;}
    @keyframes ea-need-pulse{0%,100%{box-shadow:0 0 0 0 rgba(232,200,188,0);}50%{box-shadow:0 0 0 4px rgba(232,200,188,0.6);}}
    .ea-need-pulse{animation:ea-need-pulse 1.8s ease-in-out infinite;}
    .ea-need-done{box-shadow:0 0 0 2px rgba(138,158,136,0.55);transition:box-shadow .3s;}
    .ea-need-spotlight{box-shadow:0 0 0 3px rgba(124,58,42,0.45);transition:box-shadow .25s;}
    @media (prefers-reduced-motion: reduce){.ea-need-pulse{animation:none;box-shadow:0 0 0 3px rgba(232,200,188,0.7);}.ea-need-spotlight{transition:none;}}
    .ea-jcard{background:#fdf0ea;border:1px solid #f0d4c8;border-radius:11px;padding:13px 15px;margin-bottom:16px;}
    .ea-jcard.success{background:#eef2ec;border-color:#d8e0d4;}
    .ea-jstep{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:#b08968;margin-bottom:4px;}
    .ea-jtitle{font-family:'Playfair Display',serif;font-size:15px;color:#3a1c14;margin-bottom:5px;display:flex;align-items:center;gap:7px;}
    .ea-jcard.success .ea-jtitle{color:#3f5a3c;}
    .ea-jwhy{font-size:11.5px;line-height:1.5;color:#7a5c48;margin-bottom:6px;}
    .ea-jwhere{font-size:11px;line-height:1.5;color:#8a7d6e;margin-bottom:11px;}
    .ea-jwhere b{color:#6a5e50;font-weight:600;}
    .ea-jrow{display:flex;align-items:center;gap:8px;}
    .ea-jnext{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.05em;text-transform:uppercase;background:#7c3a2a;color:#f8f5f0;border:none;border-radius:7px;padding:7px 16px;cursor:pointer;}
    .ea-jnext:hover{background:#5e2b1f;}
    .ea-jback,.ea-jskip{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;background:transparent;border:none;color:#a89a8a;cursor:pointer;padding:6px 4px;}
    .ea-jback:hover,.ea-jskip:hover{color:#7c3a2a;}
    .ea-editable{position:relative;display:flex;align-items:center;gap:8px;min-height:38px;padding:8px 11px;background:#fffdf9;border:1px solid #ece2d4;border-radius:8px;cursor:text;transition:border-color .14s,background .14s;margin-top:2px;}
    .ea-editable.selectable{cursor:pointer;}
    .ea-editable:hover{border-color:#d8c9b6;background:#fffefb;}
    .ea-editable:focus-visible{outline:none;border-color:#8a9e88;box-shadow:0 0 0 3px rgba(138,158,136,0.16);}
    .ea-fval{flex:1;min-width:0;font-size:13px;color:#3a1c14;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .ea-fval.wrap{white-space:normal;}
    .ea-fval.ph{color:#b9aa99;}
    .ea-fval.errval{color:#a83a2a;}
    .ea-hint{flex-shrink:0;display:flex;align-items:center;color:#cdbeae;opacity:0;transition:opacity .14s;}
    .ea-editable:hover .ea-hint,.ea-editable:focus-visible .ea-hint{opacity:1;}
    .ea-inp{width:100%;background:#fff;border:1px solid #e0d5c8;border-radius:8px;padding:8px 11px;font-size:12.5px;color:#3a1c14;font-family:'Inter',sans-serif;outline:none;margin-top:2px;min-height:38px;}
    .ea-inp:focus{border-color:#8a9e88;box-shadow:0 0 0 3px rgba(138,158,136,0.12);}
    .ea-inp.bad{border-color:#e6bdb0;box-shadow:0 0 0 3px rgba(168,58,42,0.10);}
    .ea-select{margin-top:2px;width:100%;min-height:38px;-webkit-appearance:none;appearance:none;padding:8px 30px 8px 11px;font-size:12.5px;color:#3a1c14;font-family:'Inter',sans-serif;background-color:#fffdf9;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%237c3a2a' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");background-repeat:no-repeat;background-position:right 10px center;border:1px solid #ece2d4;border-radius:8px;cursor:pointer;outline:none;transition:border-color .14s,background-color .14s;}
    .ea-select:hover{border-color:#d8c9b6;background-color:#fffefb;}
    .ea-select:focus{border-color:#8a9e88;box-shadow:0 0 0 3px rgba(138,158,136,0.16);}
    .ea-select.ph{color:#b9aa99;}
    .ea-segtoggle{display:inline-flex;background:#e1d4c3;border:1px solid #d4c5b2;border-radius:9px;padding:3px;gap:3px;}
    .ea-seg{font-family:'Inter',sans-serif;font-size:12.5px;font-weight:600;border:none;border-radius:7px;padding:7px 20px;cursor:pointer;transition:all .14s;}
    .ea-matpills{display:flex;flex-wrap:wrap;gap:7px;}
    .ea-matpill{font-family:'Inter',sans-serif;font-size:12px;color:#7a6e60;background:#fffdf9;border:1px solid #e3d7c9;border-radius:18px;padding:6px 14px;cursor:pointer;transition:all .14s;}
    .ea-matpill:hover{border-color:#d8c9b6;}
    .ea-matpill.on{background:#f5e2da;border-color:#e8c8bc;color:#7c3a2a;font-weight:500;}
    .ea-matdetails{display:flex;flex-direction:column;gap:7px;margin-top:10px;}
    .ea-matrow{display:flex;align-items:center;gap:7px;font-size:12.5px;color:#6a5e50;}
    .ea-matrow input{width:74px;text-align:center;min-height:32px;padding:5px;font-size:12.5px;border:1px solid #e0d5c8;border-radius:7px;outline:none;font-family:'Inter',sans-serif;}
    .ea-matrow input:focus{border-color:#8a9e88;box-shadow:0 0 0 2px rgba(138,158,136,.14);}
    .ea-matrow input.bad{border-color:#e6bdb0;box-shadow:0 0 0 2px rgba(168,58,42,.12);}
    .ea-matrow.other{display:block;} .ea-matrow.other input{width:100%;text-align:left;}
    .ea-socialhandle{flex:1;min-width:0;min-height:38px;padding:7px 10px;font-size:12.5px;border:1px solid #ece2d4;border-radius:8px;background:#fffdf9;color:#3a1c14;outline:none;font-family:'Inter',sans-serif;}
    .ea-socialhandle:focus{border-color:#8a9e88;box-shadow:0 0 0 3px rgba(138,158,136,.16);}
    .ea-socialx{flex-shrink:0;width:28px;height:28px;border:none;background:transparent;color:#c8b9a8;cursor:pointer;border-radius:7px;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .14s;}
    .ea-socialx:hover{background:#f3e0d8;color:#7c3a2a;}
    .ea-addsocial{margin-top:9px;display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:#7c3a2a;background:#f5e2da;border:1px solid #e8c8bc;border-radius:7px;padding:7px 12px;cursor:pointer;transition:all .14s;}
    .ea-addsocial:hover{background:#efd5ca;}
    .ea-confirm{display:flex;gap:8px;align-items:flex-start;background:#fbf1e7;border:1px solid #ecd9c6;border-radius:9px;padding:9px 11px;font-size:11.5px;color:#8a5a3a;line-height:1.5;}
    .ea-confirm.done{background:#eef2ec;border-color:#d8e0d4;color:#5a6e58;margin-top:8px;}
    .ea-cbtn-go{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.04em;text-transform:uppercase;background:#f5e2da;color:#7c3a2a;border:1px solid #e8c8bc;border-radius:7px;padding:6px 12px;cursor:pointer;}
    .ea-cbtn-go:hover{background:#efd5ca;}
    .ea-cbtn-keep{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.04em;text-transform:uppercase;background:transparent;color:#9a8876;border:1px solid #e2d6c8;border-radius:7px;padding:6px 12px;cursor:pointer;}
    .ea-cbtn-keep:hover{color:#7c3a2a;border-color:#d8c9b6;}
    .ea-qrow:hover{background:#fffdfa;}
    .ea-qrow:hover .ea-qgo{color:#7c3a2a!important;}
    .ea-discard:hover{color:#a83a2a!important;background:#f7eee9;}
  `}</style>
);
