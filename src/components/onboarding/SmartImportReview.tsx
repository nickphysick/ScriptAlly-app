/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import review — the two-screen (Agents → Queries) review of an AI-mapped pipeline, sharing
 * ONE in-memory working model. Both screens are views onto `agents[]` (stable ids) + `queries[]`
 * (each `agentRef`). Nothing writes until Import (Prompt 1's commitSmartImport). Visual source of
 * truth: scriptally-import-flow.html — matched here, reusing the app's form primitives + StatusDot.
 *
 * This file currently implements Screen 1 (Agents) + the shared shell/model; Screen 2 (Queries)
 * and the commit wiring follow.
 */
import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from "react";
import { SmartImportResult, ReviewReasonCode } from "../../types/smartImport";
import { QueryStatus } from "../../types";
import { SegmentedToggle, WeekSlider, GenreCombobox, FitStars } from "../forms";
import { PREDEFINED_GENRES } from "../../lib/manuscripts";
import { StatusDot } from "../StatusDot";
import { statusBurgundy, statusSageRing, statusSageMark } from "../../lib/designTokens";
import { PinkButton } from "../dashboard/HeroCard";
import {
  ReviewAgent, ReviewQuery, ReasonItem, CheckReason, AgentStatus,
  agentStatus, resolveReason, queryStatusOf, fmtDate, QUERY_STATUS_OPTIONS,
  dupNoteOpen, dupNoteKept, dupNoteMerged, parseModel, modelToResult, applyAgentRemoval, seedUnidentifiedSetAside, decideStageEntry,
  currentDate, quoteStatuses, queryReasonText, statusDirectionChoices, removeDuplicateRecord, buildClusters, doneStageMessage,
} from "../../lib/smartImportReviewModel";

// ── Palette (from the sketch; critical colours inline per house style) ──────────────────────────
const C = {
  band: "#EDE6DF",
  panel: "#fffdfa",
  frame: "rgba(124,58,42,0.28)",
  sage: "linear-gradient(135deg,#dce0d9,#d0d6cc)",
  burgundy: "#7c3a2a",
  head: "#2e3a2c",
  cardFill: "#faf8f3",
  sageEdge: "#8a9e88",
  invalid: "#b04a3a",
  meta: "#b0926e",
  muted: "#9c8878",
  noteFill: "#FFF0F0",
  noteInk: "#6b3a34",
  doneFill: "#e7ece1",
  doneInk: "#44563a",
  sticky: "#fbf3c9",
  stickyInk: "#4a431f",
};
const MONO = "'JetBrains Mono',monospace";
const SERIF = "'Playfair Display',serif";
const CAVEAT = "'Caveat',cursive";

// Composition widths. The whole thing widens together: a wider panel for un-squashed text, wider
// notes that wrap shorter, and a wider band so both margins still clear the panel at desktop width.
const PANEL_W = 520;  // a touch wider again
const BAND_W = 1280;  // panel + wide gutters so notes spread across the full width without crowding
const NOTE_W = 172;   // smaller post-its (less busy; more fit the gutters without overlap)
// Below this viewport width the side margins can't hold post-its, so notes collapse inline beneath
// their card and the corner hint moves to a static banner.
const COMPACT_BP = 1000;
// Responsive panel width — never wider than PANEL_W, never wider than the viewport.
const panelWidth = `min(${PANEL_W}px, calc(100vw - 28px))`;

// Working model + parse/derive/convert live in src/lib/smartImportReviewModel.ts (pure, testable).

// ── Icons (from the sketch) ─────────────────────────────────────────────────────────────────────
const initials = (n: string) => {
  const p = n.trim().split(/\s+/);
  let s = p[0]?.[0] ?? "";
  if (p.length > 1) s += p[p.length - 1][0];
  return s.toUpperCase();
};
const Monogram: React.FC<{ name: string }> = ({ name }) => (
  <svg viewBox="0 0 30 30" width={30} height={30}>
    <circle cx="15" cy="15" r="13" fill="#f8ece4" stroke="#e3cdbf" strokeWidth="1.5" />
    <text x="15" y="19.3" textAnchor="middle" fontFamily="Playfair Display" fontSize="11" fontWeight="600" fill={C.burgundy}>{initials(name)}</text>
  </svg>
);
const PersonIcon: React.FC = () => (
  <svg viewBox="0 0 30 30" width={30} height={30}>
    <circle cx="15" cy="15" r="13" fill="#f8ece4" stroke="#e3cdbf" strokeWidth="1.5" />
    <circle cx="15" cy="12.5" r="3.2" fill={C.burgundy} />
    <path d="M7.5 21.5c1.1-3.4 4.6-4.1 7.5-4.1s6.4.7 7.5 4.1" fill={C.burgundy} />
  </svg>
);
const AgencyIcon: React.FC = () => (
  <svg viewBox="0 0 30 30" width={30} height={30}>
    <circle cx="15" cy="15" r="13" fill="#f8ece4" stroke="#e3cdbf" strokeWidth="1.5" />
    <path d="M10.5 21.5v-9h9v9M10.5 12.5V9h9v3.5M13 15h1.4M15.6 15H17M13 17.5h1.4M15.6 17.5H17" fill="none" stroke={C.burgundy} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const BinIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M9 7V5h6v2M18 7l-1 13H7L6 7" />
  </svg>
);

// ── Small shared bits ─────────────────────────────────────────────────────────────────────────
const flab: React.CSSProperties = { fontFamily: MONO, fontSize: 7.5, letterSpacing: "0.09em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: 5 };
const finBase: React.CSSProperties = { width: "100%", background: "#fff", border: "1px solid #e2d8cc", borderRadius: 7, padding: "7px 9px", fontFamily: "Inter", fontSize: 12, color: "#3a1c14", outline: "none" };

const chipBase: React.CSSProperties = { fontFamily: MONO, fontSize: 8, letterSpacing: "0.03em", padding: "3px 7px", borderRadius: 11, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" };
const StateChip: React.FC<{ status: AgentStatus }> = ({ status }) => {
  if (status === "needs-agency")
    return (
      <span style={{ ...chipBase, background: "#fdecea", color: C.invalid }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.invalid }} />Needs agency
      </span>
    );
  if (status === "needs-check")
    return (
      <span style={{ ...chipBase, background: C.noteFill, color: C.burgundy }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.burgundy }} />Needs checking
      </span>
    );
  return <span style={{ ...chipBase, background: "#e7ece1", color: "#44563a" }}>✓ Ready to import</span>;
};

// ── Note content (shared by the margin post-its and the inline-on-mobile fallback) ───────────────
const noteColors = (resolved: boolean) => ({ fill: resolved ? C.doneFill : C.noteFill, ink: resolved ? C.doneInk : C.noteInk });
// Action buttons sit on their OWN line, centred, at the bottom of the note (not sharing the text line).
const actionLine: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 9 };
const NoteActions: React.FC<{ resolved: boolean; undoable: boolean; kind: CheckReason; agencyBlocked: boolean; onResolve: () => void; onReopen: () => void }> = ({ resolved, undoable, kind, agencyBlocked, onResolve, onReopen }) => {
  if (resolved)
    return (
      <div style={actionLine}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.04em", color: "#5a6e58", textTransform: "uppercase" }}>✓ Checked</span>
        {undoable && (
          <button onClick={onReopen}
            style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5a6e58", background: "rgba(255,255,255,0.55)", border: "1px solid rgba(90,110,88,0.4)", borderRadius: 7, padding: "2px 7px", cursor: "pointer" }}
          >Undo</button>
        )}
      </div>
    );
  // The missing-agency requirement is resolved by entering an agency (or deleting the record), not by
  // ticking a note — so suppress "Mark as checked" while that's the card's outstanding state.
  if (kind !== "duplicate" && !agencyBlocked)
    return (
      <div style={actionLine}>
        <button onClick={onResolve}
          style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.04em", textTransform: "uppercase", color: "#7c3a2a", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(124,58,42,0.25)", borderRadius: 7, padding: "3px 8px", cursor: "pointer" }}
        >Mark as checked</button>
      </div>
    );
  return null;
};

/** Inline note variant used below the breakpoint, where the margins can't hold post-its. */
const InlineNote: React.FC<{ text: string; resolved: boolean; kind: CheckReason; undoable: boolean; agencyBlocked: boolean; onResolve: () => void; onReopen: () => void }> = ({ text, resolved, kind, undoable, agencyBlocked, onResolve, onReopen }) => {
  const { fill, ink } = noteColors(resolved);
  return (
    <div style={{ background: fill, border: `1px solid ${resolved ? "#cdd8c7" : "#f1d3cf"}`, borderRadius: 8, padding: "8px 10px", fontFamily: CAVEAT, fontWeight: 500, fontSize: 13.5, lineHeight: 1.2, color: ink }}>
      <span style={{ textDecoration: resolved ? "line-through" : "none", opacity: resolved ? 0.85 : 1 }}>{quoteStatuses(text)}</span>
      <NoteActions resolved={resolved} undoable={undoable} kind={kind} agencyBlocked={agencyBlocked} onResolve={onResolve} onReopen={onReopen} />
    </div>
  );
};

// ── Shared dedupe control (rendered once per cluster) ────────────────────────────────────────────
const DupControl: React.FC<{ members: ReviewAgent[]; queryCount: (id: string) => number; onRemove: (id: string) => void; onKeepBoth: () => void }> = ({ members, queryCount, onRemove, onKeepBoth }) => (
  <div style={{ position: "relative", zIndex: 1, marginTop: 9, padding: "10px 11px", background: "#fff", border: "0.5px solid #f1d9cd", borderRadius: 9 }}>
    {members.map((s) => {
      const n = queryCount(s.id);
      return (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#6a5a50", padding: "4px 0" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#c9a89e", flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>{(s.name || "—")} — {s.agency}</span>
          <span style={{ fontFamily: MONO, fontSize: 8, color: C.meta }}>{n} quer{n === 1 ? "y" : "ies"}</span>
          <button
            onClick={() => onRemove(s.id)}
            style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.03em", color: "#a07868", background: "#fff", border: "1px solid #eccebf", borderRadius: 7, padding: "4px 9px", cursor: "pointer", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.burgundy; e.currentTarget.style.borderColor = "#d8a89a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#a07868"; e.currentTarget.style.borderColor = "#eccebf"; }}
          >Remove this one</button>
        </div>
      );
    })}
    <div style={{ fontFamily: "Inter", fontSize: 10, color: "#9a7a6a", lineHeight: 1.35, margin: "6px 0 2px" }}>
      Remove whichever is the duplicate and its queries move onto the agent you keep — nothing is lost.
    </div>
    <button
      onClick={onKeepBoth}
      style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.03em", color: "#a07868", background: "#fff", border: "1px solid #eccebf", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginTop: 6 }}
    >They're different — keep both</button>
  </div>
);

// ── Flat agent row — used by the new agents-screen two-column layout ─────────────────────────
interface AgentRowProps {
  agent: ReviewAgent;
  queryCount: number;
  dupOpen: boolean;
  clusterPeers?: ReviewAgent[];
  open: boolean;
  onToggleOpen: () => void;
  onPatch: (p: Partial<ReviewAgent>) => void;
  onDelete: () => void;
  onResolveReason: (kind: CheckReason) => void;
  onReopenReason: (kind: CheckReason) => void;
  onMerge?: () => void;
  onKeepBoth?: () => void;
}

const solidMini: React.CSSProperties = { fontFamily: MONO, fontSize: 12, padding: "9px 15px", borderRadius: 9, cursor: "pointer", border: "none", background: "#f5e2da", color: "#7c3a2a", fontWeight: 500 };
const ghostMini: React.CSSProperties = { fontFamily: MONO, fontSize: 12, padding: "9px 15px", borderRadius: 9, cursor: "pointer", background: "transparent", color: "#8a8178", border: "1px solid #e3ccc0" };

const AgentRow: React.FC<AgentRowProps> = ({
  agent, queryCount, dupOpen, clusterPeers, open,
  onToggleOpen, onPatch, onDelete, onResolveReason, onMerge, onKeepBoth,
}) => {
  const [agencyInput, setAgencyInput] = useState("");
  const agencyRef = useRef<HTMLInputElement>(null);
  const invalid = !agent.agency.trim();
  const status = agentStatus(agent, dupOpen);
  const needsCheck = status !== "captured";
  const disp = agent.name || agent.agency;
  const subline = agent.name && agent.agency ? agent.agency : !agent.name && agent.agency ? "Agent name not recorded" : null;
  const av = agent.name
    ? initials(agent.name)
    : (agent.agency.match(/\b\w/g)?.slice(0, 2).join("").toUpperCase() ?? "–");
  const accentColor = needsCheck ? "#a85a44" : "#5a6e58";
  const avBg = needsCheck ? "#f0cdbf" : "#e6ebe3";
  const avInk = needsCheck ? "#a85a44" : "#5a6e58";
  const pillBg = needsCheck ? "#f0cdbf" : "#e6ebe3";
  const pillInk = needsCheck ? "#a85a44" : "#5a6e58";
  const openDupReason = dupOpen && (clusterPeers?.length ?? 0) > 0;
  const openMappingReason = !invalid && !openDupReason ? agent.reasons.find((r) => r.kind === "mapping" && !r.resolved) : null;

  return (
    <div style={{ background: needsCheck ? "#fdf3ee" : "transparent", borderBottom: "1px solid #efe6d8" }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 22px" }}>
        <span aria-hidden style={{ width: 3, alignSelf: "stretch", borderRadius: 3, background: accentColor, minHeight: 38, flexShrink: 0 }} />
        <span style={{ width: 38, height: 38, borderRadius: 9, background: avBg, color: avInk, display: "grid", placeItems: "center", fontFamily: MONO, fontSize: 12.5, fontWeight: 500, flexShrink: 0, letterSpacing: 0 }}>
          {av}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {disp
            ? <div style={{ fontFamily: SERIF, fontSize: 18, color: "#2a2521", lineHeight: 1.1 }}>{disp}</div>
            : <div style={{ fontFamily: SERIF, fontSize: 18, color: "#a89684", fontStyle: "italic", lineHeight: 1.1 }}>Name this agent</div>}
          {subline && <div style={{ fontFamily: MONO, fontSize: 11.5, color: "#8a8178", marginTop: 1 }}>{subline}</div>}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, padding: "4px 9px", borderRadius: 20, background: pillBg, color: pillInk, whiteSpace: "nowrap" }}>
            {needsCheck ? "Needs a look" : "Ready"}
          </span>
          {!needsCheck && (
            <button onClick={onToggleOpen}
              style={{ fontFamily: MONO, fontSize: 11.5, color: "#aaa094", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#8a8178"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#aaa094"; }}
            >{open ? "Close" : "Add details"}</button>
          )}
          <button title="Don't import" onClick={onDelete}
            style={{ background: "none", border: "none", color: "#b6a99a", cursor: "pointer", padding: 4, borderRadius: 6, lineHeight: 0, fontSize: 14, fontFamily: "sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.background = "rgba(124,58,42,.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#b6a99a"; e.currentTarget.style.background = "none"; }}
          >✕</button>
        </span>
      </div>

      {/* "Add details" editor — ready items only */}
      {open && !needsCheck && (
        <div style={{ padding: "12px 22px 18px", borderTop: "0.5px solid #e8ddce", display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Agent name</span>
              <div style={{ position: "relative" }}>
                <input value={agent.agencyOnly ? "" : agent.name} disabled={agent.agencyOnly} placeholder={agent.agencyOnly ? "Referenced by agency only" : "e.g. Eleanor Vance"}
                  onChange={(e) => onPatch({ name: e.target.value })}
                  style={{ ...finBase, ...(agent.agencyOnly ? { background: "#f3efe8", color: "#a89684", fontStyle: "italic" } : {}) }} />
                <span title="Don't know the name? Use agency only"
                  onClick={() => onPatch({ agencyOnly: !agent.agencyOnly, ...(!agent.agencyOnly ? { name: "" } : {}) })}
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, borderRadius: "50%", border: `1px solid ${agent.agencyOnly ? "#8a9e88" : "#d8c8b8"}`, background: agent.agencyOnly ? "#8a9e88" : "#fff", color: agent.agencyOnly ? "#fff" : C.muted, fontFamily: MONO, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>?</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Agency</span>
              <input value={agent.agency} placeholder="Agency" onChange={(e) => onPatch({ agency: e.target.value })} style={finBase} />
            </div>
          </div>
          <div>
            <span style={flab}>Genres they're looking for</span>
            <GenreCombobox options={PREDEFINED_GENRES as unknown as string[]} value={agent.genres} onChange={(g) => onPatch({ genres: g })} placeholder="Type or pick…" />
          </div>
          <div>
            <span style={flab}>Website</span>
            <input value={agent.website} placeholder="agency.com/their-page" onChange={(e) => onPatch({ website: e.target.value })} style={finBase} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Submissions</span>
              <SegmentedToggle<"open" | "closed"> value={agent.submissionsOpen ? "open" : "closed"}
                options={[{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }]}
                onChange={(v) => onPatch({ submissionsOpen: v === "open" })} ariaLabel="Submissions status" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Typically replies in</span>
              <WeekSlider value={agent.weeks} onChange={(w) => onPatch({ weeks: w })} min={1} max={26} />
            </div>
          </div>
          <div>
            <span style={flab}>Agent fit</span>
            <div style={{ fontSize: 10, color: C.muted, margin: "-2px 0 7px", lineHeight: 1.35 }}>Log how good a match this agent would be for you.</div>
            <FitStars value={agent.rating} onChange={(r) => onPatch({ rating: r })} size={17} />
          </div>
        </div>
      )}

      {/* Inline reason panel — needs-check items */}
      {needsCheck && (
        <div style={{ padding: "0 22px 18px 79px" }}>
          {/* Missing agency */}
          {invalid && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter", fontSize: 12.5, color: "#9a5040", marginBottom: 11 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a85a44" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M12 8v5"/><circle cx="12" cy="16.5" r=".4" fill="#a85a44" stroke="none"/><path d="M12 3l9 16H3z"/></svg>
                An agency is required before this one can import.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <input ref={agencyRef} type="text" value={agencyInput} onChange={(e) => setAgencyInput(e.target.value)}
                  placeholder="Agency name" aria-label="Agency name"
                  style={{ fontFamily: MONO, fontSize: 12.5, padding: "9px 13px", border: "1px solid #e3ccc0", borderRadius: 9, background: "#fff", minWidth: 220, color: "#2a2521", outline: "none" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#9a5040"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e3ccc0"; }}
                  onKeyDown={(e) => { if (e.key === "Enter") { const v = agencyInput.trim(); if (v) { onPatch({ agency: v }); setAgencyInput(""); } } }}
                />
                <button onClick={() => { const v = agencyInput.trim(); if (v) { onPatch({ agency: v }); setAgencyInput(""); } else { agencyRef.current?.focus(); } }}
                  style={solidMini}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f0d3c7"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f5e2da"; }}
                >Save agency</button>
                {agent.name.trim() && (
                  <button onClick={() => onPatch({ agencyWaived: true })} style={ghostMini}
                    title="Import now with no agency — add it later from the agent's profile"
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.borderColor = "#9a5040"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8178"; e.currentTarget.style.borderColor = "#e3ccc0"; }}
                  >Use the agent's name as primary reference</button>
                )}
                <button onClick={() => onPatch({ agencyOnly: true, name: "" })} style={ghostMini}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.borderColor = "#9a5040"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8178"; e.currentTarget.style.borderColor = "#e3ccc0"; }}
                >Reference by agency only</button>
              </div>
            </>
          )}
          {/* Suspected duplicate */}
          {openDupReason && clusterPeers && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter", fontSize: 12.5, color: "#9a5040", marginBottom: 11 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a85a44" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="4" y="4" width="13" height="13" rx="2"/><path d="M9 9h11v11H9z" fill="#fdf3ee"/><rect x="9" y="9" width="11" height="11" rx="2"/></svg>
                Suspected duplicate of{" "}
                <b style={{ color: "#7c3a2a", fontWeight: 500 }}>{clusterPeers.map((p) => p.name || p.agency).join(", ")}</b>.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: "#8a8178", marginRight: 4 }}>Same agent, or two different people?</span>
                <button onClick={onMerge} style={solidMini}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f0d3c7"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f5e2da"; }}
                >Merge them</button>
                <button onClick={onKeepBoth} style={ghostMini}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.borderColor = "#9a5040"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8178"; e.currentTarget.style.borderColor = "#e3ccc0"; }}
                >Keep both</button>
              </div>
            </>
          )}
          {/* Mapping note (low-confidence / flag) */}
          {openMappingReason && (
            <>
              <div style={{ fontFamily: "Inter", fontSize: 12.5, color: "#9a5040", marginBottom: 11 }}>{quoteStatuses(openMappingReason.note)}</div>
              <button onClick={() => onResolveReason("mapping")} style={ghostMini}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.borderColor = "#9a5040"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8178"; e.currentTarget.style.borderColor = "#e3ccc0"; }}
              >Mark as checked</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Query row (Queries B-redesign) ──────────────────────────────────────────────────────────────
// Flat list row. A query is "Ready" when it carries no open reason; otherwise it shows one inline
// panel per typed reason (stacked), each with the catalogue copy + the right input. Copy is derived
// from the reason code (queryReasonText) so it stays consistent run-to-run.
const reasonStripStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "Inter", fontSize: 12.5, color: "#9a5040", marginBottom: 11, lineHeight: 1.5, maxWidth: 560 };
const dateBoxStyle: React.CSSProperties = { fontFamily: MONO, fontSize: 12.5, padding: "9px 13px", border: "1px solid #e3ccc0", borderRadius: 9, background: "#fff", minWidth: 180, color: "#2a2521", outline: "none" };
const ReasonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b5654a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></svg>
);

// ── Reusable typed-reason panel ───────────────────────────────────────────────────────────────────
// One reason's copy + the right input, extracted from QueryRow so it's the SINGLE source of truth for
// reason rendering — used inline in the scan-mode list AND one-at-a-time in the guided focus-overlay.
// Same handlers, same copy assembly; the only difference between modes is the wrapper around it.
interface QueryReasonPanelProps {
  query: ReviewQuery;
  code: ReviewReasonCode;
  onPatch: (p: Partial<ReviewQuery>) => void;
  onResolveReason: (code: ReviewReasonCode, patch?: Partial<ReviewQuery>) => void;
  onSwapDates: () => void;
}
const QueryReasonPanel: React.FC<QueryReasonPanelProps> = ({ query, code, onPatch, onResolveReason, onSwapDates }) => {
  // Per-reason local date drafts (so typing doesn't commit until "Save"), and the wording dropdown.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [serialEditing, setSerialEditing] = useState(false);
  const [wording, setWording] = useState<QueryStatus>(query.status);
  const setDraft = (k: string, v: string) => setDrafts((d) => ({ ...d, [k]: v }));

  const dateInput = (k: string, label: string, prefill: string | null) => (
    <input type="date" aria-label={label} value={drafts[k] ?? prefill ?? ""} onChange={(e) => setDraft(k, e.target.value)}
      style={dateBoxStyle} onFocus={(e) => { e.currentTarget.style.borderColor = "#9a5040"; }} onBlur={(e) => { e.currentTarget.style.borderColor = "#e3ccc0"; }} />
  );
  const solidBtn = (label: string, onClick: () => void) => (
    <button onClick={onClick} style={solidMini}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f0d3c7"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#f5e2da"; }}>{label}</button>
  );
  const ghostBtn = (label: string, onClick: () => void) => (
    <button onClick={onClick} style={ghostMini}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.borderColor = "#9a5040"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8178"; e.currentTarget.style.borderColor = "#e3ccc0"; }}>{label}</button>
  );

  const copy = <div style={reasonStripStyle}><ReasonIcon /><span>{queryReasonText(code, query)}</span></div>;
  switch (code) {
    case "two-dates": {
      const ev = query.timeline[0];
      return (
        <div style={{ marginBottom: 14 }}>
          {copy}
          <div style={{ borderLeft: "2px solid #ecd9cd", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 10, margin: "4px 0 12px", maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: MONO, fontSize: 12, width: 130, flexShrink: 0 }}>Query sent<span style={{ display: "block", color: C.muted, fontSize: 10.5 }}>you → agent</span></span>
              <input type="date" aria-label="Query sent date" value={query.sentDate ?? ""} onChange={(e) => onPatch({ sentDate: e.target.value || null })} style={dateBoxStyle} />
            </div>
            {ev && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 12, width: 130, flexShrink: 0 }}>{ev.type}<span style={{ display: "block", color: C.muted, fontSize: 10.5 }}>agent → you</span></span>
                <input type="date" aria-label="Event date" value={ev.date ?? ""} onChange={(e) => onPatch({ timeline: query.timeline.map((t, i) => (i === 0 ? { ...t, date: e.target.value || null } : t)) })} style={dateBoxStyle} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {solidBtn("Yes, that's right", () => onResolveReason("two-dates"))}
            {ev && ghostBtn("Swap the dates", onSwapDates)}
            {ghostBtn("It's just one date", () => onResolveReason("two-dates", { timeline: [] }))}
          </div>
        </div>
      );
    }
    case "missing-day":
      return (
        <div style={{ marginBottom: 14 }}>
          {copy}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {dateInput(code, "Pin to a date", null)}
            {solidBtn("Save date", () => { const v = drafts[code]; if (v) onResolveReason("missing-day", { sentDate: v }); })}
            {ghostBtn("Keep as month", () => onResolveReason("missing-day"))}
          </div>
        </div>
      );
    case "serial-outlier":
      return (
        <div style={{ marginBottom: 14 }}>
          {copy}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {serialEditing
              ? <>{dateInput(code, "Set a different date", query.sentDate)}{solidBtn("Save date", () => { const v = drafts[code] ?? query.sentDate; if (v) onResolveReason("serial-outlier", { sentDate: v }); })}</>
              : <>{solidBtn("That's right", () => onResolveReason("serial-outlier"))}{ghostBtn("Set a different date", () => setSerialEditing(true))}</>}
            {ghostBtn("Leave undated", () => onResolveReason("serial-outlier", { sentDate: null }))}
          </div>
        </div>
      );
    case "no-date":
      return (
        <div style={{ marginBottom: 14 }}>
          {copy}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {dateInput(code, "Date sent", null)}
            {solidBtn("Save date", () => { const v = drafts[code]; if (v) onResolveReason("no-date", { sentDate: v }); })}
            {ghostBtn("Leave undated", () => onResolveReason("no-date"))}
          </div>
        </div>
      );
    case "status-direction":
      return (
        <div style={{ marginBottom: 14 }}>
          {copy}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {statusDirectionChoices(query.status).map((c) => (
              <button key={c.status} onClick={() => onResolveReason("status-direction", { status: c.status })}
                style={{ border: "1px solid #e0d3c6", background: "#fff", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#2a2521", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3a2a"; e.currentTarget.style.background = "#faeee7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e0d3c6"; e.currentTarget.style.background = "#fff"; }}>
                <span style={{ fontWeight: 600 }}>{c.label}</span>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 2 }}>→ {c.status}</span>
              </button>
            ))}
          </div>
        </div>
      );
    case "status-wording":
      return (
        <div style={{ marginBottom: 14 }}>
          {copy}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={wording} onChange={(e) => setWording(e.target.value as QueryStatus)} aria-label="Query status"
              style={{ ...dateBoxStyle, minWidth: 200, cursor: "pointer" }}>
              {QUERY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {solidBtn("That's right", () => onResolveReason("status-wording", { status: wording }))}
          </div>
        </div>
      );
    // check-name / needs-identifying are agent-identity concerns, stripped from query reasons in
    // parseModel — they never reach here. Kept for completeness; render nothing if they ever do.
    default:
      return null;
  }
};

// Agent-fix content for the guided overlay (and reusable): the agency input + "use the agent's name
// as primary" escape (prompt A), mirroring the inline AgentRow needs-agency controls.
// Missing-agency card — sketch B, variant B (the quiet neutral note). No alarm colour: the note
// just informs, and the recommended button carries the emphasis via a slow "breathing" glow
// (.sa-agency-rec, defined in REVIEW_SHELL_CSS; reduced-motion → static soft ring). Skip lives in
// the FocusOverlay foot, since agency fixes are non-skippable from here.
const AgentFixPanel: React.FC<{ agent: ReviewAgent; onPatch: (p: Partial<ReviewAgent>) => void }> = ({ agent, onPatch }) => {
  const [v, setV] = useState("");
  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#f6f1ea", border: "1px solid #e7ddd2", borderRadius: 11, padding: "13px 15px", margin: "2px 0 4px", fontSize: 13, lineHeight: 1.5, color: "#5a4a3e", maxWidth: 560 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a8c80" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
        <p style={{ margin: 0 }}>Agency names are a required field, and we can't see one attached to this record. If you don't have this to hand, we recommend using the agent's name as the primary field for now. Don't worry — this can always be updated later.</p>
      </div>
      <div style={{ display: "flex", gap: 9, marginTop: 14, maxWidth: 560 }}>
        <input type="text" value={v} onChange={(e) => setV(e.target.value)} placeholder="Agency name (if you have it)" aria-label="Agency name"
          style={{ flex: 1, fontFamily: "Inter", fontSize: 13, padding: "10px 13px", border: "1px solid #e7ddd2", borderRadius: 9, background: "#fff", color: "#3a1c14", outline: "none" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#9a5040"; }} onBlur={(e) => { e.currentTarget.style.borderColor = "#e7ddd2"; }} />
        <button onClick={() => { const t = v.trim(); if (t) onPatch({ agency: t }); }}
          style={{ fontFamily: MONO, fontSize: 12.5, padding: "10px 16px", borderRadius: 9, border: "1px solid #e7ddd2", background: "#fff", color: C.muted, cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#9a5040"; e.currentTarget.style.color = "#7c3a2a"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e7ddd2"; e.currentTarget.style.color = C.muted; }}>Save</button>
      </div>
      {agent.name.trim() && (
        <>
          <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 10.5, letterSpacing: ".1em", color: C.muted, margin: "16px 0 12px", position: "relative" }} aria-hidden>
            <span style={{ position: "absolute", left: 0, top: "50%", width: "40%", height: 1, background: "#e7ddd2" }} />
            OR
            <span style={{ position: "absolute", right: 0, top: "50%", width: "40%", height: 1, background: "#e7ddd2" }} />
          </div>
          <div style={{ position: "relative", maxWidth: 560 }}>
            <span style={{ position: "absolute", top: -9, right: 12, zIndex: 2, fontFamily: MONO, fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", background: "#e9ede6", color: "#5a6e58", padding: "3px 8px", borderRadius: 6 }}>for quickness</span>
            <button className="sa-agency-rec" onClick={() => onPatch({ agencyWaived: true })}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: MONO, fontSize: 13.5, background: "#f5e2da", color: "#7c3a2a", border: "1.5px solid #e8c8bc", padding: "14px 18px", borderRadius: 12, fontWeight: 500, cursor: "pointer" }}>
              Use the agent's name as the primary field →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Guided focus-overlay ──────────────────────────────────────────────────────────────────────────
// One flagged item at a time over a dimmed review screen, fixes before sharpen. It drives the SAME
// state as the inline list, so resolving here updates the row behind the glass and (when the last
// blocking fix clears) flips the screen's `allClear` → the rim sweeps pink → sage. Skip is sharpen-only.
const FocusOverlay: React.FC<{
  order: string[];                                  // ids to walk, fixes-first (snapshotted at open)
  statusOf: (id: string) => "done" | "skip" | "open";
  tierOf: (id: string) => "fix" | "sharpen";
  headerFor: (id: string) => { who: string; sub: string };
  renderContent: (id: string) => React.ReactNode;
  onSkip: (id: string) => void;
  onClose: () => void;
  doneChip: string;                                 // stage-aware handoff confirm ("Agents all sorted — …")
}> = ({ order, statusOf, tierOf, headerFor, renderContent, onSkip, onClose, doneChip }) => {
  const states = order.map(statusOf);
  const frontier = states.findIndex((s) => s === "open"); // the live item; -1 once every item is handled
  const fixesLeft = order.some((id, i) => states[i] === "open" && tierOf(id) === "fix");
  const done = frontier === -1;
  // The card normally follows the frontier (resolving an item glides forward to the next open one).
  // "← Back" drops out of follow-mode to revisit an earlier — already-resolved — item without
  // un-resolving it; stepping forward to the frontier re-arms follow so resolves auto-advance again.
  const [pos, setPos] = useState(0);
  const [following, setFollowing] = useState(true);
  useEffect(() => { if (following && frontier !== -1 && pos !== frontier) setPos(frontier); }, [following, frontier, pos]);
  const card: React.CSSProperties = { width: 560, maxWidth: "100%", background: "#fff", borderRadius: 18, boxShadow: "0 30px 70px -20px rgba(58,28,20,.5)", overflow: "hidden", border: "1px solid #e7ddd2", animation: "saImpFocusPop .18s ease" };
  return (
    <div role="dialog" aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(58,28,20,.34)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 24 }}>
        {done ? (() => {
          // Honest end-of-stage message: only claim "all sorted" when nothing was skipped/left open.
          const skipped = states.filter((s) => s === "skip").length;
          const msg = doneStageMessage({ fixesLeft, skipped, sortedChip: doneChip });
          const celebratory = !fixesLeft && skipped === 0;
          return (
          // On-brand parchment + clipped-frame card (the canonical Form-11 panel treatment), not plain white.
          <div className={celebratory ? "sa-stage-done" : undefined} style={{ width: 560, maxWidth: "100%", background: "#fdfaf5", borderRadius: 18, padding: 8, border: "1px solid rgba(124,58,42,0.12)", boxShadow: "0 30px 70px -20px rgba(58,28,20,.5)", animation: "saImpFocusPop .18s ease" }}>
            <div style={{ border: `1px solid ${C.frame}`, borderRadius: 12, overflow: "hidden", background: "#fdfaf5", padding: "40px 30px", textAlign: "center" }}>
              <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 26, color: fixesLeft ? "#a85a44" : "#5a6e58" }}>{msg.heading}</div>
              {msg.chip && (
                <div className="sa-done-chip" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 12, color: "#5a6e58", background: "#e9ede6", padding: "7px 13px", borderRadius: 8, margin: "14px 0 2px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5" /></svg>{msg.chip}
                </div>
              )}
              <p style={{ color: "#6a5c50", fontSize: 14.5, margin: "10px auto 22px", maxWidth: 380 }}>{msg.body}</p>
              <button onClick={onClose} style={{ fontFamily: MONO, fontSize: 13, background: "#7c3a2a", color: "#fff", border: "none", borderRadius: 9, padding: "11px 18px", cursor: "pointer" }}>Review and confirm</button>
            </div>
          </div>
          );
        })() : (() => {
          const idx = Math.min(pos, order.length - 1);
          const id = order[idx];
          const tier = tierOf(id);
          const isFix = tier === "fix";
          const shown = states[idx];                 // status of the card on screen (may be a resolved one, when reviewing back)
          const reviewing = shown !== "open";          // viewing an already-handled item via "← Back"
          const h = headerFor(id);
          return (
            <div style={card}>
              <div style={{ padding: "20px 26px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}><b style={{ color: "#7c3a2a" }}>{idx + 1}</b> of {order.length}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, padding: "5px 11px", borderRadius: 7, fontWeight: 500, ...(isFix ? { background: "#f4ead0", color: "#6f5618" } : { background: "#f5e2da", color: "#7c3a2a" }) }}>{isFix ? "! Quick fix" : "✦ Sharpen"}</span>
              </div>
              <div style={{ display: "flex", gap: 5, padding: "14px 26px 0" }}>
                {order.map((segId, i) => (
                  <div key={segId} style={{ height: 4, flex: 1, borderRadius: 3, background: states[i] === "done" ? "#8a9e88" : states[i] === "skip" ? "#e8c8bc" : i === idx ? "#7c3a2a" : "#eee2d6" }} />
                ))}
              </div>
              <div style={{ padding: "18px 26px 4px" }}>
                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 22, color: "#3a1c14" }}>{h.who}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: C.muted, marginTop: 3, marginBottom: 14 }}>{h.sub}</div>
                {reviewing && (
                  <div style={{ fontFamily: MONO, fontSize: 11.5, color: "#5a6e58", background: "#e9ede6", borderRadius: 8, padding: "8px 12px", marginBottom: 14, display: "inline-block" }}>{shown === "skip" ? "Skipped for now — saved as-is" : "Already sorted ✦"}</div>
                )}
                {renderContent(id)}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 26px 22px", marginTop: 6, borderTop: "1px solid #f3ece3" }}>
                <button onClick={() => { setFollowing(false); setPos((p) => Math.max(0, p - 1)); }} disabled={idx === 0}
                  style={{ fontFamily: MONO, fontSize: 13, color: idx === 0 ? "#d8ccbe" : C.muted, background: "none", border: "none", cursor: idx === 0 ? "not-allowed" : "pointer" }}>← Back</button>
                {reviewing ? (
                  <button onClick={() => setPos((p) => { const n = Math.min(order.length - 1, p + 1); if (frontier === -1 || n >= frontier) setFollowing(true); return n; })}
                    style={{ fontFamily: MONO, fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>Next →</button>
                ) : (
                  <div style={{ textAlign: "right" }}>
                    <button onClick={() => onSkip(id)} disabled={isFix}
                      style={{ fontFamily: MONO, fontSize: 13, color: isFix ? "#d8ccbe" : C.muted, background: "none", border: "none", cursor: isFix ? "not-allowed" : "pointer", padding: 0 }}>
                      {isFix ? "Must be fixed to import" : "Skip for now →"}
                    </button>
                    {!isFix && <div style={{ fontFamily: CAVEAT, fontSize: 15, color: "#b3a394", marginTop: 4 }}>come back to this shortly</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
};

// ── In-place coachmark intro (sketch A) ─────────────────────────────────────────────────────────────
// A product-tour-style orientation at the start of each flagged stage: the screen stays put, a dim
// falls over everything EXCEPT the real header pill (which shows through a hole-punch + ring), and a
// callout sits beneath it. It tours the live "ready" pill (reassurance) → the "to check" pill (sets up
// the work), then hands off. The pills are measured (getBoundingClientRect) so the spotlight escapes
// the review window's overflow clip and re-measures on resize. Plays once per stage per session;
// stage-true copy + colour (agents/duplicates = gold "quick fix"; queries = pink "sharpen"). Stages
// with no "ready" beat (duplicates) jump welcome → to-check. Reduced-motion drops the slides/fades.
//
// The coachmark's CSS travels WITH the component (self-injected) rather than living in
// REVIEW_SHELL_CSS — so it styles correctly on the duplicates stage too, which renders its own
// layout (not ReviewShell) and so never received those rules (the "tiny, no-background" intro bug).
const COACHMARK_CSS = `
@keyframes saCmFade{from{opacity:0}to{opacity:1}}
@keyframes saCmPop{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}
.sa-cm-veil{position:fixed;inset:0;background:rgba(40,28,22,.62);z-index:54;animation:saCmFade .6s ease;}
.sa-cm-block{position:fixed;inset:0;z-index:59;}
.sa-cm-spot{position:fixed;z-index:60;border-radius:20px;pointer-events:none;transition:left .55s cubic-bezier(.4,0,.2,1),top .55s ease,width .4s ease,box-shadow .45s ease;}
.sa-cm-callout{position:fixed;z-index:62;width:340px;max-width:92vw;background:#fdfaf5;border:1px solid #7c3a2a;border-radius:14px;padding:18px 20px 16px;text-align:center;box-shadow:0 22px 50px -26px rgba(58,28,20,.5);transition:left .55s cubic-bezier(.4,0,.2,1),top .55s ease;animation:saCmPop .4s ease;}
.sa-cm-callout::before{content:"";position:absolute;top:-8px;left:var(--beak,40px);width:15px;height:15px;background:#fdfaf5;border-left:1px solid #7c3a2a;border-top:1px solid #7c3a2a;transform:rotate(45deg);transition:left .55s ease;}
.sa-cm-welcome{position:fixed;left:50%;top:46%;transform:translate(-50%,-50%);z-index:62;width:430px;max-width:90vw;background:#fdfaf5;border:1px solid #7c3a2a;border-radius:18px;padding:34px 36px 30px;text-align:center;box-shadow:0 30px 70px -30px rgba(58,28,20,.5);animation:saCmFade .6s ease;}
@media(prefers-reduced-motion:reduce){.sa-cm-spot,.sa-cm-callout,.sa-cm-callout::before{transition:none;}.sa-cm-callout,.sa-cm-welcome,.sa-cm-veil{animation:none;}}
`;
// Parchment "pink" advance button — sketch A's callout/welcome CTA (not the off-brand burgundy fill).
const cmPinkBtn: React.CSSProperties = { fontFamily: MONO, fontSize: 13, background: "#f5e2da", color: "#7c3a2a", border: "1px solid #e8c8bc", padding: "11px 22px", borderRadius: 11, fontWeight: 500, cursor: "pointer" };
const CoachmarkIntro: React.FC<{
  welcomeHeading: string;
  readyCount: number; checkCount: number;
  checkTier: "fix" | "sharpen";
  hasReadyBeat: boolean;                 // false (duplicates) → welcome advances straight to the check beat
  step: number;                          // 0 welcome · 1 ready spotlight · 2 to-check spotlight
  readyRef: React.RefObject<HTMLElement | null>;
  checkRef: React.RefObject<HTMLElement | null>;
  checkCopy?: { hd: string; body: React.ReactNode }; // stage-specific to-check copy (else derived from tier)
  onIntroGo: () => void; onNextReady: () => void; onLetsGo: () => void;
}> = ({ welcomeHeading, readyCount, checkCount, checkTier, hasReadyBeat, step, readyRef, checkRef, checkCopy, onIntroGo, onNextReady, onLetsGo }) => {
  const gold = checkTier === "fix";
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // Measure the pill this beat is about (re-measure on resize/scroll) so the fixed spotlight + callout
  // land on the real element wherever it sits — the product-tour approach, robust to layout.
  useLayoutEffect(() => {
    if (step === 0) { setRect(null); return; }
    const target = step === 1 ? readyRef.current : checkRef.current;
    const measure = () => {
      const el = step === 1 ? readyRef.current : checkRef.current;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    measure();
    if (!target) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [step, readyRef, checkRef]);

  if (step === 0) {
    return (
      <>
        <style>{COACHMARK_CSS}</style>
        <div className="sa-cm-veil" aria-hidden onMouseDown={(e) => e.preventDefault()} />
        <div className="sa-cm-welcome" role="dialog" aria-modal="true">
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#e9ede6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#5a6e58" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22V8M12 8c0-3 2-5 5-5 0 3-2 5-5 5Zm0 3c0-3-2-5-5-5 0 3 2 5 5 5Z"/></svg>
          </div>
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 25, margin: 0, color: "#3a1c14" }}>{welcomeHeading}</h2>
          <button onClick={onIntroGo} style={{ ...cmPinkBtn, marginTop: 22, fontSize: 14, padding: "13px 26px" }}>Let's do it →</button>
        </div>
      </>
    );
  }

  // Beat copy — ready = reassurance; to-check = sets up the work ("…it won't take a sec.").
  const onReady = step === 1;
  const checkBase = gold
    ? { ring: "#e5d29a", dot: "!", dotBg: { background: "#f4ead0", color: "#6f5618" }, hd: `${checkCount === 1 ? "One" : checkCount} need${checkCount === 1 ? "s" : ""} a quick fix`, body: <>A quick fix each — a missing agency, say. <b>We'll work through these now — it won't take a sec.</b></> as React.ReactNode }
    : { ring: "#e8c8bc", dot: "✦", dotBg: { background: "#f5e2da", color: "#7c3a2a" }, hd: `${checkCount === 1 ? "One" : checkCount} to sharpen`, body: <>A date to confirm or a status to clarify. <b>We'll work through these now — it won't take a sec.</b></> as React.ReactNode };
  const coach = onReady
    ? { ring: "#9db09a", dot: "✓", dotBg: { background: "#e9ede6", color: "#5a6e58" }, hd: "Good to go", body: <><b>{readyCount} read cleanly</b> — nothing for you to do with these.</> as React.ReactNode, btn: "Next →", onClick: onNextReady }
    : { ...checkBase, hd: checkCopy?.hd ?? checkBase.hd, body: checkCopy?.body ?? checkBase.body, btn: "Let's go →", onClick: onLetsGo };

  // Without a measured pill (e.g. a layout the ref didn't find) fall back to a centred card so the
  // intro never strands — the user can still advance.
  if (!rect) {
    return (
      <>
        <style>{COACHMARK_CSS}</style>
        <div className="sa-cm-veil" aria-hidden />
        <div className="sa-cm-welcome" role="dialog" aria-modal="true" style={{ width: 360 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontWeight: 600, fontSize: 14.5, color: "#3a1c14" }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, ...coach.dotBg }}>{coach.dot}</span>{coach.hd}
          </div>
          <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#5a4a3e", lineHeight: 1.5 }}>{coach.body}</p>
          <button onClick={coach.onClick} style={{ ...cmPinkBtn, marginTop: 14 }}>{coach.btn}</button>
        </div>
      </>
    );
  }

  // Callout sits beneath the pill, beak under the pill's centre — clamped to stay on screen.
  const calloutW = 340;
  const calloutLeft = Math.max(16, Math.min(rect.left, window.innerWidth - calloutW - 16));
  const beak = rect.left + rect.width / 2 - calloutLeft - 7;
  const stepN = onReady ? 1 : (hasReadyBeat ? 2 : 1);
  const stepTotal = hasReadyBeat ? 2 : 1;

  return (
    <>
      <style>{COACHMARK_CSS}</style>
      {/* transparent click-shield (the dim itself is the spotlight's hole-punch shadow) */}
      <div className="sa-cm-block" aria-hidden onMouseDown={(e) => e.preventDefault()} />
      <div className="sa-cm-spot" aria-hidden style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: `0 0 0 4px ${coach.ring},0 0 0 9999px rgba(40,28,22,.62)` }} />
      <div className="sa-cm-callout" role="dialog" aria-modal="true" style={{ left: calloutLeft, top: rect.top + rect.height + 16, ["--beak" as string]: `${beak}px` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontWeight: 600, fontSize: 14.5, color: "#3a1c14" }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, ...coach.dotBg }}>{coach.dot}</span>{coach.hd}
        </div>
        <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#5a4a3e", lineHeight: 1.5 }}>{coach.body}</p>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", color: C.muted, marginTop: 13 }}>{stepN} OF {stepTotal}</div>
        <button onClick={coach.onClick} style={{ ...cmPinkBtn, marginTop: 10 }}>{coach.btn}</button>
      </div>
    </>
  );
};

interface QueryRowProps {
  query: ReviewQuery;
  /** Agent name (Playfair) — agent.name || agent.agency. */
  agentName: string;
  /** Leading sub-line segment: the agency or "Agency only". */
  origin: string;
  open: boolean;
  onToggleOpen: () => void;
  onPatch: (p: Partial<ReviewQuery>) => void;
  onDelete: () => void;
  /** Resolve one typed reason, optionally applying the user's fix (status / sentDate / timeline). */
  onResolveReason: (code: ReviewReasonCode, patch?: Partial<ReviewQuery>) => void;
  /** Two-dates "Swap": swap the sent date with the first timeline event. */
  onSwapDates: () => void;
}

const QueryRow: React.FC<QueryRowProps> = ({
  query, agentName, origin, open, onToggleOpen, onPatch, onDelete, onResolveReason, onSwapDates,
}) => {
  const openReasons = query.reasons.filter((r) => !r.resolved);
  const needsCheck = openReasons.length > 0;
  const dateStr = currentDate(query);
  const av = initials(agentName) || "–";
  const accentColor = needsCheck ? "#a85a44" : "#5a6e58";
  const avBg = needsCheck ? "#f0cdbf" : "#e6ebe3";
  const pillInk = needsCheck ? "#a85a44" : "#5a6e58";


  return (
    <div style={{ background: needsCheck ? "#fdf3ee" : "transparent", borderBottom: "1px solid #efe6d8" }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 22px" }}>
        <span aria-hidden style={{ width: 3, alignSelf: "stretch", borderRadius: 3, background: accentColor, minHeight: 38, flexShrink: 0 }} />
        <span style={{ width: 38, height: 38, borderRadius: 9, background: avBg, color: pillInk, display: "grid", placeItems: "center", fontFamily: MONO, fontSize: 12.5, fontWeight: 500, flexShrink: 0 }}>{av}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 18, color: "#2a2521", lineHeight: 1.1 }}>{agentName}</div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: "#8a8178", marginTop: 1 }}>
            {origin} · {query.status} · {dateStr ? fmtDate(dateStr) : "Undated"}
          </div>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, padding: "4px 9px", borderRadius: 20, background: needsCheck ? "#f0cdbf" : "#e6ebe3", color: pillInk, whiteSpace: "nowrap" }}>
            {needsCheck ? "Needs a look" : "Ready"}
          </span>
          {!needsCheck && (
            <button onClick={onToggleOpen}
              style={{ fontFamily: MONO, fontSize: 11.5, color: "#aaa094", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#8a8178"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#aaa094"; }}
            >{open ? "Close" : "Add details"}</button>
          )}
          <button title="Don't import" onClick={onDelete}
            style={{ background: "none", border: "none", color: "#b6a99a", cursor: "pointer", padding: 4, borderRadius: 6, lineHeight: 0, fontSize: 14, fontFamily: "sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.background = "rgba(124,58,42,.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#b6a99a"; e.currentTarget.style.background = "none"; }}
          >✕</button>
        </span>
      </div>

      {/* "Add details" editor — ready rows: status + sent date */}
      {open && !needsCheck && (
        <div style={{ padding: "12px 22px 18px", borderTop: "0.5px solid #e8ddce", display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Status</span>
              <select value={query.status} onChange={(e) => onPatch({ status: e.target.value as QueryStatus })} style={{ ...finBase, cursor: "pointer" }}>
                {QUERY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Date sent</span>
              <input type="date" value={query.sentDate ?? ""} onChange={(e) => onPatch({ sentDate: e.target.value || null })} style={finBase} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.35 }}>Dates are optional — add what you remember and your timeline stays accurate.</div>
        </div>
      )}

      {/* Inline reason panels — one per open typed reason, stacked */}
      {needsCheck && (
        <div style={{ padding: "0 22px 18px 79px" }}>
          {openReasons.map((r) => (
            <QueryReasonPanel key={r.code} query={query} code={r.code} onPatch={onPatch} onResolveReason={onResolveReason} onSwapDates={onSwapDates} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Agent card ────────────────────────────────────────────────────────────────────────────────
interface AgentCardProps {
  agent: ReviewAgent;
  queryCount: number;
  dupOpen: boolean;       // member of an unresolved duplicate cluster
  open: boolean;
  onToggleOpen: () => void;
  onPatch: (patch: Partial<ReviewAgent>) => void;
  onDelete: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  highlighted: boolean;
  onHoverPair: (on: boolean) => void;
  pulse: boolean;
  compact: boolean;
  /** Rendered inside a duplicate stack — a deeper shadow gives the upper card depth over the next. */
  stacked?: boolean;
  onResolveReason: (kind: CheckReason) => void;
  onReopenReason: (kind: CheckReason) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent, queryCount, dupOpen, open, onToggleOpen, onPatch, onDelete, cardRef, highlighted, onHoverPair, pulse, compact, stacked, onResolveReason, onReopenReason,
}) => {
  const [confirming, setConfirming] = useState(false);
  // If the card unmounts while the bin is pending (e.g. user navigated to Queries before clicking
  // "Remove"), commit the deletion — the bin click already expressed the intent.
  const confirmingRef = useRef(false);
  confirmingRef.current = confirming;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;
  useEffect(() => () => { if (confirmingRef.current) onDeleteRef.current(); }, []);
  const invalid = !agent.agency.trim();
  const disp = agent.name || agent.agency;
  const status = agentStatus(agent, dupOpen);
  const leftColour = invalid ? C.invalid : status === "needs-check" ? C.burgundy : C.sageEdge;
  const boxShadow = highlighted
    ? "0 8px 22px rgba(58,28,20,0.20)"
    : invalid
      ? "0 0 0 1px #e6b6a8,0 1px 4px rgba(58,28,20,0.07)"
      : stacked
        ? "0 5px 14px rgba(58,28,20,0.16)"
        : "0 1px 4px rgba(58,28,20,0.07)";

  return (
    <div
      ref={cardRef}
      data-agent={agent.id}
      onMouseEnter={() => onHoverPair(true)}
      onMouseLeave={() => onHoverPair(false)}
      style={{
        position: "relative", background: C.cardFill, borderRadius: 9, padding: "10px 12px 10px 16px",
        boxShadow,
        transform: highlighted ? "scale(1.02)" : "none",
        transition: "transform .15s ease, box-shadow .15s ease",
        animation: pulse ? "saImpPulse 0.7s ease 2" : undefined,
      }}
    >
      {/* colour-coded left accent — clipped to the card's rounded outline so it can never spill above
          the top (or below the bottom) border. The clip layer holds only the accent; the editor's
          GenreCombobox dropdown lives outside it and is free to overflow downward. */}
      <span aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 9, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: leftColour }} />
      </span>
      {/* bin */}
      <span title="Remove" onClick={() => setConfirming(true)} style={{ position: "absolute", top: 7, right: 9, width: 15, height: 15, color: "#c8b8a8", cursor: "pointer", zIndex: 4, opacity: 0.7 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = C.invalid; e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#c8b8a8"; e.currentTarget.style.opacity = "0.7"; }}>
        <BinIcon />
      </span>

      {/* row */}
      <div data-arow style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 30, height: 30, flexShrink: 0 }}>
          {agent.name ? <Monogram name={agent.name} /> : agent.agency ? <AgencyIcon /> : <PersonIcon />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {disp
            ? <div style={{ fontFamily: SERIF, fontSize: 15, color: "#2e2018", lineHeight: 1.1 }}>{disp}</div>
            : <div style={{ fontFamily: SERIF, fontSize: 15, color: "#a89684", fontStyle: "italic", lineHeight: 1.1 }}>Name this agent</div>}
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.02em", color: C.meta, marginTop: 3 }}>{agent.agency || "No agency yet"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginRight: 18 }}>
          <StateChip status={status} />
          <button onClick={(e) => { e.stopPropagation(); onToggleOpen(); }} style={{ fontFamily: MONO, fontSize: 8.5, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {open ? "Close" : status === "captured" ? "Add details" : "Make changes"}
          </button>
        </div>
      </div>

      {/* editor */}
      {open && (
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 11, marginTop: 12, paddingTop: 12, borderTop: "0.5px solid #e8ddce" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Agent name</span>
              <div style={{ position: "relative" }}>
                <input
                  value={agent.agencyOnly ? "" : agent.name}
                  disabled={agent.agencyOnly}
                  placeholder={agent.agencyOnly ? "Referenced by agency only" : "e.g. Eleanor Vance"}
                  onChange={(e) => onPatch({ name: e.target.value })}
                  style={{ ...finBase, ...(agent.agencyOnly ? { background: "#f3efe8", color: "#a89684", fontStyle: "italic" } : {}) }}
                />
                <span
                  title="Don't know the name? Use agency only"
                  onClick={() => onPatch({ agencyOnly: !agent.agencyOnly, ...(!agent.agencyOnly ? { name: "" } : {}) })}
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, borderRadius: "50%", border: `1px solid ${agent.agencyOnly ? C.sageEdge : "#d8c8b8"}`, background: agent.agencyOnly ? C.sageEdge : "#fff", color: agent.agencyOnly ? "#fff" : C.muted, fontFamily: MONO, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >?</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Agency</span>
              <input value={agent.agency} placeholder="Agency" onChange={(e) => onPatch({ agency: e.target.value })}
                style={{ ...finBase, ...(invalid ? { borderColor: "#e0b6a8", background: "#fdf5f2" } : {}) }} />
            </div>
          </div>

          <div>
            <span style={flab}>Genres they're looking for</span>
            <GenreCombobox options={PREDEFINED_GENRES as unknown as string[]} value={agent.genres} onChange={(g) => onPatch({ genres: g })} placeholder="Type or pick…" />
          </div>

          <div>
            <span style={flab}>Website</span>
            <input value={agent.website} placeholder="agency.com/their-page" onChange={(e) => onPatch({ website: e.target.value })} style={finBase} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Submissions</span>
              <SegmentedToggle<"open" | "closed">
                value={agent.submissionsOpen ? "open" : "closed"}
                options={[{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }]}
                onChange={(v) => onPatch({ submissionsOpen: v === "open" })}
                ariaLabel="Submissions status"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Typically replies in</span>
              <WeekSlider value={agent.weeks} onChange={(w) => onPatch({ weeks: w })} min={1} max={26} />
            </div>
          </div>

          <div>
            <span style={flab}>Agent fit</span>
            <div style={{ fontSize: 10, color: C.muted, margin: "-2px 0 7px", lineHeight: 1.35 }}>Dream agent? Worth a try? Log how good a match this agent would be for you.</div>
            <FitStars value={agent.rating} onChange={(r) => onPatch({ rating: r })} size={17} />
          </div>
        </div>
      )}

      {/* inline notes (mobile fallback): the margin post-its can't fit, so each reason renders here.
          The derived needs-agency note shows here too (no manual tick; clears when an agency is typed). */}
      {compact && (invalid || agent.reasons.length > 0) && (
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 8, marginTop: 11 }}>
          {invalid && (
            <InlineNote key="agency" text={agencyNoteText(agent.name)} resolved={false} kind="mapping" undoable={false} agencyBlocked={true}
              onResolve={() => {}} onReopen={() => {}} />
          )}
          {agent.reasons.map((r) => (
            <InlineNote key={r.kind} text={r.note} resolved={r.resolved} kind={r.kind} undoable={r.undoable} agencyBlocked={invalid}
              onResolve={() => onResolveReason(r.kind)} onReopen={() => onReopenReason(r.kind)} />
          ))}
        </div>
      )}

      {/* delete confirm */}
      {confirming && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(250,248,243,0.96)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, zIndex: 5, padding: "0 16px", textAlign: "center" }}>
          <div style={{ fontFamily: SERIF, fontSize: 13, color: "#2e2018", lineHeight: 1.25 }}>
            {queryCount > 0
              ? `${disp || "This agent"} has ${queryCount} quer${queryCount === 1 ? "y" : "ies"} — removing this agent removes ${queryCount === 1 ? "it" : "them"} too`
              : "Remove this record?"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setConfirming(false); onDelete(); }} style={{ background: C.burgundy, color: "#fff", border: "none", borderRadius: 8, fontFamily: MONO, fontSize: 9, letterSpacing: "0.04em", padding: "7px 15px", cursor: "pointer" }}>Remove</button>
            <button onClick={() => setConfirming(false)} style={{ background: "#fff", border: "1px solid #e0d5c8", color: "#6a5a50", borderRadius: 8, fontFamily: MONO, fontSize: 9, padding: "7px 15px", cursor: "pointer" }}>Keep</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Query card ───────────────────────────────────────────────────────────────────────────────────
// ── Queries: status as a mini pipeline track (Option C) ───────────────────────────────────────────
// Four forward stages — Queried → Partial → Full → Offer. Depth (how far) and direction (whose court:
// burgundy = your material went out, sage = the agent moved) mirror the StatusDot grammar exactly, and
// the CURRENT stage renders the real <StatusDot> (canonical glyph reused, never a redrawn copy). Closed
// statuses get no forward-progress track — the import can't say how far they reached — so they read as
// a muted, ended journey led by the StatusDot's closed × marker.
const PIPELINE_CLOSED = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);
const pipelineStage = (s: QueryStatus): number => {
  switch (s) {
    case QueryStatus.QUERIED: return 1;
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.PARTIAL_SENT: return 2;
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.FULL_SENT:
    case QueryStatus.REVISE_RESUBMIT: return 3;
    case QueryStatus.OFFER: return 4;
    default: return 1;
  }
};
// Outgoing (your serve → burgundy) vs incoming (agent's serve → sage) — the same split StatusDot draws.
const isOutgoingStatus = (s: QueryStatus): boolean =>
  s === QueryStatus.QUERIED || s === QueryStatus.PARTIAL_SENT || s === QueryStatus.FULL_SENT || s === QueryStatus.OFFER;

const TRACK_EMPTY = "#dcd5cb";        // unreached pip / connector
const TRACK_CLOSED_LABEL = "#9a9082"; // the "— closed" word
const trackPip = (colour: string): React.CSSProperties => ({ width: 9, height: 9, borderRadius: "50%", background: colour, flexShrink: 0 });
const trackConn = (colour: string): React.CSSProperties => ({ flex: "1 1 6px", minWidth: 6, maxWidth: 26, height: 2, background: colour });
const trackLabel: React.CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 500, marginLeft: 10, whiteSpace: "nowrap", flexShrink: 0 };

const PipelineTrack: React.FC<{ status: QueryStatus }> = ({ status }) => {
  const STAGES = 4;
  const DOT = 16;
  const wrap: React.CSSProperties = { display: "flex", alignItems: "center", gap: 0, marginTop: 7, minWidth: 0 };

  if (PIPELINE_CLOSED.has(status)) {
    return (
      <div style={wrap}>
        <StatusDot status={status} size={DOT} />
        {Array.from({ length: STAGES - 1 }).map((_, i) => (
          <React.Fragment key={i}>
            <span style={trackConn(TRACK_EMPTY)} />
            <span style={trackPip(TRACK_EMPTY)} />
          </React.Fragment>
        ))}
        <span style={{ ...trackLabel, color: TRACK_CLOSED_LABEL }}>{status} — closed</span>
      </div>
    );
  }

  const stage = pipelineStage(status);
  const fill = isOutgoingStatus(status) ? statusBurgundy : statusSageRing;
  const labelColour = isOutgoingStatus(status) ? statusBurgundy : statusSageMark;
  const parts: React.ReactNode[] = [];
  for (let i = 1; i <= STAGES; i++) {
    if (i > 1) parts.push(<span key={`c${i}`} style={trackConn(i <= stage ? fill : TRACK_EMPTY)} />); // connector before stage i fills once reached
    if (i === stage) parts.push(<StatusDot key={`p${i}`} status={status} size={DOT} />);              // current stage = the canonical glyph
    else parts.push(<span key={`p${i}`} style={trackPip(i < stage ? fill : TRACK_EMPTY)} />);         // earlier = filled pip, later = empty
  }
  return (
    <div style={wrap}>
      {parts}
      <span style={{ ...trackLabel, color: labelColour }}>{status}</span>
    </div>
  );
};

// ── "Not being imported" box (excluded query, with its reason) ────────────────────────────────────
const DeadBox: React.FC<{ query: ReviewQuery; agentName: string }> = ({ query, agentName }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#ebe6df", border: "1px solid #ddd5c9", borderRadius: 8, padding: "8px 11px" }}>
    <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}><StatusDot status={query.status} size={18} ghost /></span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: SERIF, fontSize: 13.5, color: "#8a8076" }}>{agentName}</div>
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.03em", color: "#ada093", marginTop: 2 }}>{query.status}{currentDate(query) ? ` · ${fmtDate(currentDate(query))}` : ""}</div>
    </div>
    <span style={{ fontFamily: MONO, fontSize: 8, color: "#9a8c7e", background: "#e0d9cf", padding: "4px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>{query.removedReason}</span>
  </div>
);

// ── Gentle-undo toast (the instant "oops" affordance) + Set-aside tray (the recoverable shelf) ────
const UndoToast: React.FC<{ msg: string; onUndo: () => void; onClose: () => void }> = ({ msg, onUndo, onClose }) => (
  <div role="status" style={{ position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 80, display: "flex", alignItems: "center", gap: 14, background: "#2e2018", color: "#f3e9e0", borderRadius: 11, padding: "11px 14px 11px 18px", boxShadow: "0 14px 34px -12px rgba(58,28,20,.5)", fontFamily: "Inter,sans-serif", fontSize: 13 }}>
    <span>{msg}</span>
    <button onClick={onUndo} style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "#e8b9a6", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Undo</button>
    <button onClick={onClose} aria-label="Dismiss" style={{ background: "none", border: "none", color: "#9a8c80", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
  </div>
);

interface SetAsideItem { kind: "agent" | "query"; id: string; name: string; sub: string; context?: string; unidentified?: boolean; }
const SetAsideTray: React.FC<{ items: SetAsideItem[]; onRestore: (kind: "agent" | "query", id: string) => void }> = ({ items, onRestore }) => {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 12, border: "1px solid #e7ddd2", borderRadius: 11, background: "#f6efe6", overflow: "hidden", flexShrink: 0 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: MONO, fontSize: 11.5, color: "#8a7c6e" }}>
        <span style={{ width: 11, height: 11, borderRadius: 3, background: "#e3d8cc", flexShrink: 0 }} />
        <span><b style={{ color: "#6a5c50" }}>{items.length}</b> set aside</span>
        <span style={{ marginLeft: "auto", color: "#b6a89a" }}>{open ? "Hide ▲" : "Review ▼"}</span>
      </button>
      {open && (
        <div>
          {items.map((it) => (
            <div key={`${it.kind}-${it.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderTop: "1px solid #ece2d5" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 13.5, color: "#8a8076", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: "#ada093", marginTop: 1 }}>{it.sub}</div>
                {it.context && <div style={{ fontFamily: "Inter", fontSize: 11.5, fontStyle: "italic", color: "#9a8c80", marginTop: 3, whiteSpace: "normal" }}>Your note said “{it.context}” — no problem, set aside for now. Name them any time if a reply lands.</div>}
              </div>
              <button onClick={() => onRestore(it.kind, it.id)} style={{ fontFamily: MONO, fontSize: 11, color: "#5a6e58", background: "#e9ede6", border: "1px solid #cdd8ca", borderRadius: 7, padding: "6px 11px", cursor: "pointer", flexShrink: 0 }}>{it.unidentified ? "Name it instead" : "Restore"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Bottom guidance banner — step-aware torn-paper slip (Agents → Queries → Import) ──────────────
// Frame from scriptally-import-banner-concepts.html Option A; the "?" folds in Option B's FAQs.
const TORN_TOP = "polygon(0% 13px,4% 5px,8% 12px,12% 4px,16% 11px,20% 6px,24% 14px,28% 5px,32% 12px,36% 7px,40% 13px,44% 4px,48% 11px,52% 6px,56% 13px,60% 5px,64% 12px,68% 7px,72% 14px,76% 5px,80% 11px,84% 6px,88% 13px,92% 5px,96% 12px,100% 8px,100% 100%,0% 100%)";
interface BannerFAQ { q: string; a: string; }
const BANNER: Record<"agents" | "queries", { line: React.ReactNode; faqs: BannerFAQ[] }> = {
  agents: {
    line: <>Here are the agents we found. Anything in <span style={{ textDecoration: "underline", textDecorationColor: "rgba(124,58,42,0.35)" }}>pink</span> needs a quick look — a missing agency, or a possible duplicate. Sort those, then carry on to your queries.</>,
    faqs: [
      { q: "Why does an agent need an agency?", a: "We file agents under their agency, so each record needs one — the name's optional. Add it via Make changes, or remove the record." },
      { q: "What if I don't know the name?", a: "That's fine — we'll reference them by agency. Just fill the agency in." },
      { q: "What's a duplicate?", a: "When the same agent looks like it came in twice, we group them so you can keep one (their queries combine) or keep both." },
      { q: "Can I change this later?", a: "Yes — everything's editable in your agent database after import." },
    ],
  },
  queries: {
    line: <>Here are your queries, matched to your agents. Check the statuses, add any dates you remember, then import.</>,
    faqs: [
      { q: "Do I have to add dates?", a: "No — dates are optional. Anything missing just says ‘add a date for full tracking’, and you can fill it any time." },
      { q: "What does ‘to check’ mean?", a: "We weren't fully sure how to read something — give it a glance and mark it checked." },
      { q: "What happens when I import?", a: "Your agents and their queries are added to ScriptAlly with their statuses and any dates you've set." },
      { q: "Why are some queries not included?", a: "Queries for agents you removed aren't imported — they're listed at the bottom for reference." },
    ],
  },
};

// The duplicates stage keeps "Agents" lit on the tracker but carries its own copy — its line and
// FAQs are about merging doubles, not the general agent review.
const DUP_FAQS: BannerFAQ[] = [
  { q: "What's a duplicate?", a: "The same agent looks like it came in twice. Keep one (their queries combine) or keep both." },
  { q: "What if they're actually different people?", a: "Choose “keep both” and we'll leave them as two separate agents." },
  { q: "What happens when I merge?", a: "You keep one and its queries move onto it — nothing's lost." },
  { q: "Can I fix this later?", a: "Yes — you can come back to this step from the agents screen." },
];

const GuidanceBanner: React.FC<{ step: "duplicates" | "agents" | "queries"; compact: boolean; dupCount?: number; onHeight?: (h: number) => void }> = ({ step, compact, dupCount = 0, onHeight }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [step]); // keep the open chip relevant to the current step
  const rootRef = useRef<HTMLDivElement>(null);
  // Report only the COLLAPSED banner height so the composition reserves just that (plus a margin) —
  // when the FAQs expand we deliberately don't grow the reserve; the taller banner is allowed to
  // overlap the content transiently. Skipping the report while open keeps the last collapsed value.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || !onHeight) return;
    const report = () => { if (!open) onHeight(el.offsetHeight); };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    window.addEventListener("resize", report);
    return () => { ro.disconnect(); window.removeEventListener("resize", report); };
  }, [onHeight, open, step, compact]);
  // The duplicates stage is the opening beat of step 1 (Agents) — same tracker, its own line + FAQs.
  const dupLine: React.ReactNode = dupCount === 0
    ? <>These are sorted — review everyone whenever you're ready.</>
    : dupCount === 1
    ? <>First, let's clear a possible double — then you'll review everyone.</>
    : <>First, let's clear a couple of possible doubles — then you'll review everyone.</>;
  const content = step === "duplicates" ? { line: dupLine, faqs: DUP_FAQS } : BANNER[step];
  const { line, faqs } = content;
  const cur = step === "queries" ? 1 : 0; // Import (index 2) is the upcoming action — never "now" here
  const labels = ["Agents", "Queries", "Import"];
  const pipStyle = (i: number): React.CSSProperties =>
    i < cur ? { width: 11, height: 11, borderRadius: "50%", background: C.sageEdge, flexShrink: 0 }
      : i === cur ? { width: 13, height: 13, borderRadius: "50%", background: C.burgundy, boxShadow: "0 0 0 3px rgba(124,58,42,0.13)", flexShrink: 0 }
        : { width: 11, height: 11, borderRadius: "50%", background: "transparent", border: "1.5px solid #cdbfb0", flexShrink: 0 };
  const stepColor = (i: number) => (i === cur ? C.burgundy : i < cur ? "#5a6e58" : "#b3a89a");

  return (
    <div ref={rootRef} style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <div style={{ position: "relative", background: C.panel, clipPath: TORN_TOP, WebkitClipPath: TORN_TOP, boxShadow: "0 -2px 14px rgba(80,60,40,0.07)", padding: compact ? "26px 18px 18px" : "28px 26px 22px" }}>
        <span aria-hidden style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%) rotate(-1.5deg)", width: 120, height: 20, background: "rgba(214,198,170,0.45)", borderLeft: "1px dashed rgba(150,130,90,0.25)", borderRight: "1px dashed rgba(150,130,90,0.25)", zIndex: 2 }} />
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: compact ? 7 : 9, marginBottom: 11, flexWrap: "wrap" }}>
              {labels.map((lab, i) => (
                <React.Fragment key={lab}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 11, letterSpacing: "0.04em", color: stepColor(i), fontWeight: i === cur ? 500 : 400 }}>
                    <span style={pipStyle(i)} />{compact ? "" : `${i < 2 ? `${i + 1} · ` : ""}${lab}`}
                  </span>
                  {i < labels.length - 1 && <span style={{ color: "#cdbfb0", fontSize: 12 }}>→</span>}
                </React.Fragment>
              ))}
            </div>
            <div style={{ fontFamily: CAVEAT, fontSize: compact ? 17 : 20, color: C.burgundy, lineHeight: 1.25 }}>{line}</div>
            {open && (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {faqs.map((f, i) => (
                    <button key={f.q} onClick={() => setActive(i)}
                      style={{ fontFamily: MONO, fontSize: 10.5, padding: "6px 12px", borderRadius: 16, cursor: "pointer", whiteSpace: "nowrap", background: i === active ? C.burgundy : "#f5e2da", border: `1px solid ${i === active ? C.burgundy : "#e8c8bc"}`, color: i === active ? "#fff" : C.burgundy }}>
                      {f.q}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 12, background: "#fdfaf5", border: "1px solid rgba(124,58,42,0.12)", borderRadius: 8, padding: "11px 14px", fontFamily: CAVEAT, fontSize: 18, color: "#3a322b", maxWidth: 640 }}>{faqs[active].a}</div>
              </>
            )}
          </div>
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Hide help" : "Show help"}
            style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #e8c8bc", background: open ? C.burgundy : "#f5e2da", color: open ? "#fff" : C.burgundy, fontFamily: MONO, fontSize: 14, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-start" }}>
            {open ? "×" : "?"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Post-it notes layer — full-page (no clip): notes track their card's live position and clamp to
//    the band (the page region), so they may sit above the panel's top edge and out in the margins. ─
// Derived (not stored) post-it for the needs-agency gate. Auto-clears when an agency is typed (the
// note simply isn't generated), so it carries no manual "mark as checked" affordance.
const agencyNoteText = (name: string) => `${name.trim() || "This agent"} has no agency yet — add one to import.`;

interface NoteSpec { noteId: string; cardId: string; side: "l" | "r"; text: string; resolved: boolean; kind: CheckReason; undoable: boolean; agencyBlocked: boolean; }
const NotesLayer: React.FC<{
  notes: NoteSpec[];
  midRef: React.RefObject<HTMLDivElement>;
  bandRef: React.RefObject<HTMLDivElement>;
  cardEls: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  highlightedNotes: Set<string>;     // note ids to grow (pairing covers the whole duplicate group)
  onHover: (noteId: string | null) => void;
  onResolveMapping: (cardId: string) => void;
  onReopen: (cardId: string, kind: CheckReason) => void;
  tick: number;
}> = ({ notes, midRef, bandRef, cardEls, highlightedNotes, onHover, onResolveMapping, onReopen, tick }) => {
  const notesRef = useRef<HTMLDivElement>(null);
  const noteEls = useRef<Record<string, HTMLDivElement | null>>({});

  const layout = useCallback(() => {
    const band = bandRef.current, notesEl = notesRef.current;
    if (!band || !notesEl) return;
    const bandRect = band.getBoundingClientRect();
    const bandW = bandRect.width, bandH = bandRect.height;
    notesEl.style.height = bandH + "px";
    // The scroll viewport — a note fades as its card is clipped at this box's top/bottom edges.
    const midRect = midRef.current ? midRef.current.getBoundingClientRect() : null;

    // Columns across BOTH gutters (the full width left & right of the centred panel), each NOTE_W
    // wide and spaced so columns can't overlap horizontally.
    const GAP = 12, COL = NOTE_W + GAP, EDGE = 6;
    const panelW = Math.min(PANEL_W, bandW - 28);
    const gutter = Math.max(0, (bandW - panelW) / 2);
    const perSide = Math.max(1, Math.floor((gutter - EDGE) / COL));
    const colsL: number[] = [], colsR: number[] = [];
    for (let i = 0; i < perSide; i++) {
      colsL.push(EDGE + i * COL);                  // left gutter, outer → inner
      colsR.push(bandW - EDGE - NOTE_W - i * COL); // right gutter, outer → inner
    }

    // Each note anchors vertically to its card's live row (scroll-coupled), then takes the column on
    // its side that lets it sit closest to that anchor without overlapping — guaranteeing no
    // collisions at any count, spread across the full width.
    const place = (side: "l" | "r") => {
      const cols = side === "l" ? colsL : colsR;
      const bottoms = cols.map(() => -Infinity);
      const list = notes
        .filter((n) => n.side === side)
        .map((n) => ({ el: noteEls.current[n.noteId], card: cardEls.current[n.cardId] }))
        .filter((x): x is { el: HTMLDivElement; card: HTMLDivElement } => !!x.el && !!x.card)
        .map((x) => {
          const arow = (x.card.querySelector("[data-arow]") as HTMLElement | null) ?? x.card;
          const ar = arow.getBoundingClientRect();
          // Opacity = fraction of the card still inside the scroll viewport (1 = fully visible, 0 = fully
          // clipped). Fully-visible cards (incl. the top/bottom rows at the scroll extremes) stay solid;
          // a note never lingers visible once its card has scrolled out of the clipped list.
          const cr = x.card.getBoundingClientRect();
          let opacity = 1;
          if (midRect && cr.height > 0) {
            const vis = Math.min(cr.bottom, midRect.bottom) - Math.max(cr.top, midRect.top);
            opacity = Math.max(0, Math.min(1, vis / cr.height));
          }
          return { el: x.el, opacity, desired: (ar.top - bandRect.top) + ar.height / 2 - x.el.offsetHeight / 2 };
        })
        .sort((a, b) => a.desired - b.desired);
      for (const item of list) {
        const h = item.el.offsetHeight;
        let best = 0, bestTop = Infinity;
        for (let c = 0; c < cols.length; c++) {
          const top = Math.max(item.desired, bottoms[c] + GAP);
          if (top < bestTop) { bestTop = top; best = c; }
        }
        // Reserve space at the bottom so the lowest note never reaches the guidance banner below the band.
        const top = Math.max(4, Math.min(bestTop, bandH - h - 24));
        item.el.style.left = cols[best] + "px";
        item.el.style.top = top + "px";
        item.el.style.opacity = String(item.opacity);
        bottoms[best] = top + h;
      }
    };
    place("l");
    place("r");
  }, [notes, bandRef, cardEls, midRef]);

  useLayoutEffect(() => { layout(); }, [layout, tick]);
  useEffect(() => {
    const mid = midRef.current;
    const onScroll = () => layout();
    if (mid) mid.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    const raf = requestAnimationFrame(() => requestAnimationFrame(layout));
    return () => {
      if (mid) mid.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
      cancelAnimationFrame(raf);
    };
  }, [layout, midRef]);

  return (
    <div ref={notesRef} style={{ position: "absolute", left: 0, right: 0, top: 0, zIndex: 5, pointerEvents: "none" }}>
      {notes.map((n) => {
        const hl = highlightedNotes.has(n.noteId);
        const rot = n.side === "l" ? -2.2 : 1.8;
        const { fill, ink } = noteColors(n.resolved);
        return (
          <div
            key={n.noteId}
            ref={(el) => { noteEls.current[n.noteId] = el; }}
            onMouseEnter={() => onHover(n.noteId)}
            onMouseLeave={() => onHover(null)}
            style={{
              position: "absolute",
              width: NOTE_W, fontFamily: CAVEAT, fontWeight: 500, fontSize: 13.5, lineHeight: 1.18, color: ink,
              background: fill, padding: "8px 10px 9px", borderRadius: 2, pointerEvents: "auto", textAlign: "left",
              boxShadow: hl ? "0 9px 22px rgba(58,28,20,0.22)" : "0 5px 14px rgba(58,28,20,0.16)",
              transform: `rotate(${rot}deg)${hl ? " scale(1.07)" : ""}`,
              transition: "transform .18s ease, box-shadow .18s ease",
            } as React.CSSProperties}
          >
            <span style={{ position: "absolute", top: -6, left: "50%", width: 36, height: 12, background: "rgba(205,185,178,0.5)", borderRadius: 1, transform: "translateX(-50%) rotate(-3deg)" }} />
            <span style={{ textDecoration: n.resolved ? "line-through" : "none", opacity: n.resolved ? 0.85 : 1 }}>{quoteStatuses(n.text)}</span>
            <NoteActions resolved={n.resolved} undoable={n.undoable} kind={n.kind} agencyBlocked={n.agencyBlocked} onResolve={() => onResolveMapping(n.cardId)} onReopen={() => onReopen(n.cardId, n.kind)} />
          </div>
        );
      })}
    </div>
  );
};

// ── Review (Agents ⇄ Queries) ────────────────────────────────────────────────────────────────────
export interface SmartImportReviewProps {
  result: SmartImportResult;
  onBack?: () => void;
  /** "Skip setup" — leave the import flow (same as the rest of onboarding). */
  onSkip?: () => void;
  /** A commit error from the host (e.g. commitSmartImport threw) — surfaced as a banner so a failed
   *  import is never silent. The host owns the message; this component just shows it. */
  error?: string | null;
  /** Import the final working model. The component converts it (modelToResult) to a SmartImportResult
   *  ready for Prompt 1's commitSmartImport(deps, result, manuscriptId) — agents → queries →
   *  activities → recompute. The host owns the commit deps; this component owns the conversion. */
  onImport?: (result: SmartImportResult) => void | Promise<void>;
  /** User's display name — the slim onboarding nav shows the first initial as avatar. */
  userName?: string;
}

// ── Shared B-redesign chrome (Agents + Queries screens) ──────────────────────────────────────────
// Extracted once so the two screens never re-implement the nav, skip modal, sidebar board or FAQ.

/** Slim onboarding top bar — logo left, search/bell/avatar right. Exported so the post-import
 *  loader mounts the exact same nav as the review screens. */
export const OnbNav: React.FC<{ userInitial: string }> = ({ userInitial }) => (
  <nav style={{ height: 76, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 100px", background: "#fdfaf5", borderBottom: "1px solid #e8dfd1", position: "sticky", top: 0, zIndex: 40 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <img src="/scriptally-logo-new-basic.png" alt="" aria-hidden="true" style={{ height: 34, width: "auto", display: "block" }} />
      <img src="/scriptally-title-nav.png" alt="ScriptAlly" style={{ height: 34, width: "auto", display: "block", maxWidth: "none" }} />
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button aria-label="Search" style={{ background: "none", border: "none", color: "#b1a596", cursor: "pointer", padding: 8, borderRadius: 8, lineHeight: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.background = "rgba(124,58,42,.07)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#b1a596"; e.currentTarget.style.background = "none"; }}
      ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></button>
      <button aria-label="Alerts" style={{ background: "none", border: "none", color: "#b1a596", cursor: "pointer", padding: 8, borderRadius: 8, lineHeight: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.background = "rgba(124,58,42,.07)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#b1a596"; e.currentTarget.style.background = "none"; }}
      ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg></button>
      <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#f5e2da", color: "#7c3a2a", display: "grid", placeItems: "center", fontFamily: MONO, fontSize: 12, marginLeft: 8 }}>{userInitial}</span>
    </div>
  </nav>
);

/** "Skip setup for now?" confirm overlay. Parent renders this only while open. */
const SkipSetupModal: React.FC<{ onClose: () => void; onSkip?: () => void }> = ({ onClose, onSkip }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(42,37,33,.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: "#fdfaf5", borderRadius: 16, padding: "30px 30px 24px", maxWidth: 380, width: "100%", boxShadow: "0 30px 70px -28px rgba(40,28,18,.6)", animation: "saImpModalPop .18s ease" }}>
      <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 22, margin: "0 0 10px", color: "#2a2521" }}>Skip setup for now?</h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#8a8178", margin: "0 0 22px" }}>You can import a spreadsheet or add agents by hand any time from your dashboard. Nothing you've captured will be lost.</p>
      <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", alignItems: "center" }}>
        <button onClick={onClose} style={{ fontFamily: MONO, fontSize: 13, color: "#8a8178", background: "none", border: "none", cursor: "pointer" }}>Keep setting up</button>
        <button onClick={() => { onClose(); onSkip?.(); }}
          style={{ fontFamily: MONO, fontSize: 13.5, background: "rgba(199,212,195,.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#5a6e58", border: "1px solid rgba(255,255,255,.55)", borderRadius: 11, padding: "13px 32px", cursor: "pointer", fontWeight: 600, letterSpacing: ".02em", boxShadow: "0 10px 22px -12px rgba(90,110,88,.5),inset 0 1px 0 rgba(255,255,255,.65)" }}
        >Skip for now</button>
      </div>
    </div>
  </div>
);

/** Paperclipped "Where you are" card with the Agents → Queries → Import step rail. */
const WhereYouAreCard: React.FC<{ step: "agents" | "queries"; onSkip: () => void }> = ({ step, onSkip }) => {
  const dot = (state: "done" | "on" | "todo") => (
    <span style={{ width: 13, height: 13, borderRadius: "50%", display: "inline-block",
      background: state === "on" ? "#7c3a2a" : state === "done" ? "#bcb3a4" : "transparent",
      border: `2px solid ${state === "on" ? "#7c3a2a" : state === "done" ? "#bcb3a4" : "#c9bfb1"}` }} />
  );
  const lbl = (state: "done" | "on" | "todo", text: string) => (
    <b style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 400, color: state === "on" ? "#7c3a2a" : "#8a8178" }}>{dot(state)}{text}</b>
  );
  return (
    <div style={{ background: "#fdfaf5", borderRadius: 3, padding: "18px 20px", transform: "rotate(-.7deg)", position: "relative", boxShadow: "0 14px 26px -18px rgba(40,28,18,.45)" }}>
      <svg style={{ position: "absolute", top: -14, left: -11, transform: "rotate(-12deg)", filter: "drop-shadow(0 2px 2px rgba(40,28,18,.3))" }} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#9b9384" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#8a8178" }}>Where you are</div>
        <button onClick={onSkip}
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".04em", color: "#7c3a2a", background: "#f5e2da", border: "none", borderRadius: 20, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0d3c7"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#f5e2da"; }}
        >Skip setup</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: MONO, fontSize: 12, color: "#8a8178" }}>
        {lbl(step === "agents" ? "on" : "done", "Agents")}
        <span style={{ color: "#cabfae" }}>→</span>
        {lbl(step === "queries" ? "on" : "todo", "Queries")}
        <span style={{ color: "#cabfae" }}>→</span>
        {lbl("todo", "Import")}
      </div>
    </div>
  );
};

/** Tilted pink post-it. Children are the prose (with the inline "pink" tag). */
const PinkSlip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: "#f8e8e1", padding: "24px 22px 26px", position: "relative", transform: "rotate(-1.6deg)", boxShadow: "0 16px 32px -20px rgba(40,28,18,.5)" }}>
    <span style={{ position: "absolute", top: -8, left: 24, width: 16, height: 16, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#b65a44,#7c3a2a)", boxShadow: "0 3px 5px rgba(40,28,18,.4)" }} />
    <p style={{ fontFamily: CAVEAT, fontSize: 23, lineHeight: 1.34, color: "#7c3a2a", margin: 0 }}>{children}</p>
  </div>
);

/** The inline "pink" pill used inside a PinkSlip (kept in the handwriting font). */
const PinkTag: React.FC = () => (
  <span style={{ fontFamily: CAVEAT, background: "#f0cdbf", color: "#a85a44", padding: "1px 13px", borderRadius: 16, fontSize: "0.86em", verticalAlign: 1 }}>pink</span>
);

/** "FAQs" margin-note accordion. */
const FaqList: React.FC<{ items: { q: string; a: string }[]; open: Set<number>; onToggle: (i: number) => void }> = ({ items, open, onToggle }) => (
  <div>
    <p style={{ fontFamily: CAVEAT, fontSize: 24, color: "#7c3a2a", margin: "0 0 12px", paddingLeft: 2 }}>FAQs</p>
    {items.map((item, i) => {
      const isOpen = open.has(i);
      return (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? "1px dotted #d8cdbb" : "none" }}>
          <button onClick={() => onToggle(i)}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: MONO, fontSize: 12, color: isOpen ? "#7c3a2a" : "#6a6055", padding: "11px 2px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; }}
            onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.color = "#6a6055"; }}
          >
            <span>{item.q}</span>
            <span style={{ color: isOpen ? "#7c3a2a" : "#b6a99a", flexShrink: 0 }}>{isOpen ? "−" : "+"}</span>
          </button>
          {isOpen && (
            <div style={{ animation: "saImpFaqDrop .2s ease" }}>
              <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "#8a8178", margin: 0, padding: "0 2px 13px" }}>{item.a}</p>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// ── Windowed fit-to-screen shell (final B-redesign layout) ───────────────────────────────────────
// Full-viewport: full-width sticky nav + a white window that fits the viewport and scrolls
// internally (no page scroll). The pink/sage rim is the dashboard hero rim (heroRim.css) recoloured
// and mounted on the window's 7px outer band — same mask-composite ring geometry so the corners
// render as cleanly as the dashboard's.
const REVIEW_SHELL_CSS = `
.sa-rv-root{ position:fixed; inset:0; z-index:50; background:#f2ede7; display:flex; flex-direction:column; overflow:hidden; }
.sa-rv-window{ position:relative; flex:1 1 auto; min-height:0; width:100%; max-width:1200px; margin:18px auto;
  background:#fff; border:1px solid #ddd2c0; border-radius:22px; box-shadow:0 30px 70px -42px rgba(60,40,28,.45);
  overflow:hidden; display:flex; flex-direction:column;
  --rim-glow:rgba(238,196,180,.8); --rim-base:rgba(238,196,180,.13); }
.sa-rv-window.allclear{ --rim-glow:rgba(138,158,136,.72); --rim-base:rgba(138,158,136,.16); }
/* burgundy inset frame, 7px from the window edge */
.sa-rv-window::after{ content:""; position:absolute; inset:7px; border:1px solid rgba(124,58,42,.3);
  border-radius:15px; pointer-events:none; z-index:3; }
/* pink wave — dashboard hero rim, recoloured; fills the full 7px band, edge-to-frame */
.sa-rv-rim{ position:absolute; inset:0; border-radius:22px; padding:7px; z-index:1; pointer-events:none; overflow:hidden;
  background:var(--rim-base); transition:background .55s ease;
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor;
          mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);  mask-composite:exclude; }
.sa-rv-band{ position:absolute; top:-10%; bottom:-10%; width:60%; filter:blur(4px);
  background:linear-gradient(95deg, transparent 0%, var(--rim-glow) 50%, transparent 100%);
  animation:saRvRimCross 16s linear infinite; }
@keyframes saRvRimCross{ 0%{left:-60%} 100%{left:114%} }
.sa-rv-grid{ display:grid; grid-template-columns:1fr 340px; gap:38px; height:100%; padding:28px 30px;
  align-items:stretch; overflow:hidden; position:relative; z-index:2; }
.sa-rv-main{ display:flex; flex-direction:column; min-height:0; }
.sa-rv-board{ display:flex; flex-direction:column; gap:34px; padding:18px 16px 0 28px; overflow-y:auto; min-height:0; }
.sa-rv-card{ background:#fdfaf5; border-radius:16px; box-shadow:0 18px 44px -30px rgba(60,40,28,.4);
  flex:1 1 auto; min-height:0; display:flex; padding:7px; }
.sa-rv-frame{ flex:1 1 auto; min-height:0; width:100%; border:1px solid rgba(124,58,42,.3); border-radius:11px;
  overflow:hidden; display:flex; }
.sa-rv-scroll{ flex:1 1 auto; min-height:0; width:100%; overflow-y:auto;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 var(--ft,0px),#000 calc(100% - var(--fb,0px)),transparent 100%);
          mask-image:linear-gradient(to bottom,transparent 0,#000 var(--ft,0px),#000 calc(100% - var(--fb,0px)),transparent 100%); }
@keyframes saImpBlink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
@keyframes saImpModalPop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
@keyframes saImpFaqDrop{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@keyframes saImpFocusPop{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}
@keyframes saImpDimIn{from{opacity:0}to{opacity:1}}
/* slow, soft "breathing" glow on the recommended action (agency card) — guides, never nags */
@keyframes saAgencyBreathe{0%,100%{box-shadow:0 0 0 0 rgba(124,58,42,.18),0 0 0 0 rgba(124,58,42,.10)}50%{box-shadow:0 0 0 4px rgba(124,58,42,.10),0 0 22px 3px rgba(124,58,42,.16)}}
.sa-agency-rec{animation:saAgencyBreathe 2.6s ease-in-out infinite;}
@media(prefers-reduced-motion:reduce){.sa-agency-rec{animation:none;box-shadow:0 0 0 3px rgba(124,58,42,.10);}}
/* completed-stage sage pulse (sketch C beat 1) — the done card swells sage once, faint tint at the
   peak, a quiet "that's done"; reduced-motion → a static soft sage ring. */
@keyframes saStagePulse{0%{box-shadow:0 30px 70px -20px rgba(58,28,20,.5),0 0 0 0 rgba(134,165,131,0)}30%{box-shadow:0 30px 70px -20px rgba(58,28,20,.5),0 0 0 5px rgba(134,165,131,.35),0 0 34px 6px rgba(134,165,131,.4);background:#f3f7f1}60%{box-shadow:0 30px 70px -20px rgba(58,28,20,.5),0 0 0 5px rgba(134,165,131,.18),0 0 28px 4px rgba(134,165,131,.22)}100%{box-shadow:0 30px 70px -20px rgba(58,28,20,.5),0 0 0 0 rgba(134,165,131,0)}}
.sa-stage-done{animation:saStagePulse 1.5s ease-in-out;}
.sa-done-chip{opacity:0;animation:saImpDimIn .5s ease .2s forwards;}
@media(prefers-reduced-motion:reduce){.sa-stage-done{animation:none;box-shadow:0 30px 70px -20px rgba(58,28,20,.5),0 0 0 4px rgba(134,165,131,.25);}.sa-done-chip{animation:none;opacity:1;}}
/* the coachmark intro's CSS now lives in COACHMARK_CSS, self-injected by <CoachmarkIntro> so it also
   styles correctly on the duplicates stage (which renders its own layout, not ReviewShell). */
@media(max-width:880px){ .sa-rv-grid{ grid-template-columns:1fr; } }
@media(prefers-reduced-motion:reduce){ .sa-rv-band{ animation:none; opacity:0; } *{ animation-duration:0.001ms !important; } }
/* fit variant (overview): window is only as tall as its content, vertically centred below the nav,
   capped so it never spills off-screen — content scrolls inside the card, never the page. */
.sa-rv-window.fit{ flex:0 1 auto; height:auto; max-height:calc(100vh - 116px); margin:auto; }
`;

/** Full-viewport windowed shell: cream ground, full-width nav, white window with the recoloured rim.
 *  `fit` sizes the window to its content and centres it (for the short overview); without it the
 *  window fills the viewport for the scrolling review screens. */
export const ReviewShell: React.FC<{ userInitial: string; allClear: boolean; fit?: boolean; modal?: React.ReactNode; children: React.ReactNode }> = ({ userInitial, allClear, fit, modal, children }) => (
  <div className="sa-rv-root" style={{ fontFamily: "Inter, sans-serif", color: "#2a2521" }}>
    <style>{REVIEW_SHELL_CSS}</style>
    {modal}
    <OnbNav userInitial={userInitial} />
    <div className={`sa-rv-window${allClear ? " allclear" : ""}${fit ? " fit" : ""}`}>
      <div className="sa-rv-rim" aria-hidden="true"><div className="sa-rv-band" /></div>
      {children}
    </div>
  </div>
);

/** Records card: parchment rim → burgundy hairline frame (clipping context) → internally-scrolling
 *  region with 28px scroll-edge fades (top/bottom, only mid-scroll). */
const RecordsCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const fade = () => {
    const el = ref.current; if (!el) return;
    el.style.setProperty("--ft", (el.scrollTop > 3 ? 28 : 0) + "px");
    el.style.setProperty("--fb", (el.scrollHeight - el.clientHeight - el.scrollTop > 3 ? 28 : 0) + "px");
  };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.addEventListener("scroll", fade, { passive: true });
    const ro = new ResizeObserver(fade);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", fade); ro.disconnect(); };
  }, []);
  useEffect(() => { fade(); }); // recompute after every render (rows added / removed / resolved)
  return (
    <div className="sa-rv-card">
      <div className="sa-rv-frame">
        <div className="sa-rv-scroll" ref={ref}>{children}</div>
      </div>
    </div>
  );
};

export const SmartImportReview: React.FC<SmartImportReviewProps> = ({ result, onBack, onSkip, error, onImport, userName }) => {
  const initial = useMemo(() => parseModel(result), [result]);
  // Auto-set-aside the truly-unidentifiable (no name AND no agency) before review begins — they never
  // hit the blocking needs-agency gate; they wait in the tray with a "Name it instead" escape.
  const seeded = useMemo(() => seedUnidentifiedSetAside(initial.agents, initial.queries), [initial]);
  const [agents, setAgents] = useState<ReviewAgent[]>(seeded.agents);
  const [queries, setQueries] = useState<ReviewQuery[]>(seeded.queries);
  // Open with the focused duplicates stage only when the import actually has clusters (never empty).
  // `hadDuplicates` is fixed for the session: it keeps the stage reachable again via Agents' Back even
  // after every cluster is resolved (so a mistaken merge can be undone).
  const hadDuplicates = useMemo(() => initial.agents.some((a) => a.mergeWith.length > 0 && !a.mergeResolved), [initial]);
  const [screen, setScreen] = useState<"duplicates" | "agents" | "queries">(hadDuplicates ? "duplicates" : "agents");
  const [bannerH, setBannerH] = useState(120); // measured height of the pinned banner (reserve space)
  // Per-cluster pre-resolution snapshot (keyed by leader id) — restored verbatim on Undo, so a merge or
  // keep-both can be cleanly reversed (un-delete the removed agent, revert repointed queries).
  const snapRef = useRef<Record<string, { agents: ReviewAgent[]; queries: { id: string; agentRef: string }[] }>>({});
  // "Reset all changes" baseline. Starts as the pristine parse, but is RE-CAPTURED the moment the user
  // leaves the locked duplicates stage — so resetting on the Agents screen reverts only Agents-screen
  // edits and keeps the merge / keep-both decisions intact. (Per-cluster Undo / Back-to-duplicates
  // remain the ways to revisit a merge.)
  const baselineRef = useRef<{ agents: ReviewAgent[]; queries: ReviewQuery[] } | null>(null);
  if (baselineRef.current === null) baselineRef.current = { agents: JSON.parse(JSON.stringify(seeded.agents)), queries: JSON.parse(JSON.stringify(seeded.queries)) };
  // Separate Queries-stage baseline: the queries as they stood on ENTERING the Queries stage (after
  // every agents-stage cascade). Resetting on Queries reverts only the queries-stage edits to this,
  // leaving the agents-stage edits (removed duplicates, added agencies) exactly as the user left them.
  const queriesBaselineRef = useRef<ReviewQuery[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<{ type: "card" | "note"; id: string } | null>(null);
  const [tick, setTick] = useState(0);              // nudges the notes layout after edits
  const [topcap, setTopcap] = useState<string | null>(null);
  const [pulseIds, setPulseIds] = useState<string[]>([]);
  const [compact, setCompact] = useState(false);
  // Agents-screen B-redesign state
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set());
  // Queries-screen B-redesign: which undated queries the user has acknowledged via "Leave undated".
  const toggleFaq = (i: number) => setOpenFaqs((prev) => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); return next; });

  // ── Gentle-undo: a brief "Undo" toast for the instant "oops", plus the Set-aside tray (below).
  // Removing a record is never a hard delete during review — it sets the record aside (recoverable
  // via the tray) until the final Import. Corrective edits stay friction-free (no toast/confirm).
  // Guided focus-overlay: which stage's walk is open + its snapshotted ordered ids, and which items the
  // writer skipped this session (sharpen only). The overlay drives the same state as the inline list.
  const [focus, setFocus] = useState<{ stage: "agents" | "queries"; order: string[] } | null>(null);
  const [focusSkipped, setFocusSkipped] = useState<Set<string>>(new Set());
  // Stages the writer has finished the walk for (closed via "Review and confirm") — suppresses
  // auto-reopen so they land on the inline list for a final look instead of being pulled back in.
  const [escaped, setEscaped] = useState<Set<"agents" | "queries">>(new Set());
  // Pre-walk intro: which beat is showing (0 intro · 1 ready spotlight · 2 check spotlight · null off)
  // and which stages have already played it this session (so it doesn't replay on revisit).
  const [introStep, setIntroStep] = useState<number | null>(null);
  const [introSeen, setIntroSeen] = useState<Set<"duplicates" | "agents" | "queries">>(new Set());
  // The live header pills the coachmark intro spotlights in place — measured (getBoundingClientRect)
  // so the dim-cutout escapes the window's overflow clip. One pair, shared by whichever stage renders.
  const readyPillRef = useRef<HTMLSpanElement>(null);
  const checkPillRef = useRef<HTMLSpanElement>(null);
  // closeFocus = finish the walk ("Review and confirm") and drop to the inline list for a final look.
  // Marking the stage escaped keeps the list from re-opening the walk; the stage gate still holds.
  const closeFocus = () => { if (focus) setEscaped((e) => new Set(e).add(focus.stage)); setFocus(null); setFocusSkipped(new Set()); };
  const skipFocus = (id: string) => setFocusSkipped((s) => new Set(s).add(id));

  const [toast, setToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashToast = (msg: string, undo: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };
  const dismissToast = () => { if (toastTimer.current) clearTimeout(toastTimer.current); setToast(null); };
  // Restore a set-aside agent: un-delete it AND bring back the queries its removal cascaded.
  const restoreAgent = (id: string) => {
    setAgents((xs) => xs.map((a) => (a.id === id ? { ...a, deleted: false, setAsideStage: undefined, setAsideContext: undefined } : a)));
    setQueries((xs) => xs.map((q) => (q.agentRef === id && q.removed && q.removedReason === "Agent removed" ? { ...q, removed: false, removedReason: undefined } : q)));
    dismissToast(); setTick((t) => t + 1);
  };
  const restoreQuery = (id: string) => {
    setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, removed: false, removedReason: undefined } : q)));
    dismissToast(); setTick((t) => t + 1);
  };

  const midRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<Record<string, HTMLDivElement | null>>({});

  // Engage the inline-notes fallback once the side margins can't hold the post-its.
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_BP - 1}px)`);
    const on = () => { setCompact(mq.matches); setTick((t) => t + 1); };
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const active = agents.filter((a) => !a.deleted);
  const queryCount = useCallback((id: string) => queries.filter((q) => q.agentRef === id && !q.removed).length, [queries]);

  // Ids of agents inside an unresolved duplicate cluster (both members count as needs-check).
  const openDupIds = useMemo(() => {
    const s = new Set<string>();
    for (const a of agents) {
      if (a.deleted || a.mergeResolved || a.mergeWith.length === 0) continue;
      s.add(a.id);
      a.mergeWith.forEach((id) => s.add(id));
    }
    return s;
  }, [agents]);
  const statusOf = useCallback((a: ReviewAgent) => agentStatus(a, openDupIds.has(a.id)), [openDupIds]);

  const okCount = active.filter((a) => statusOf(a) === "captured").length;
  const needCount = active.length - okCount;
  const invalidCount = active.filter((a) => !a.agency.trim()).length;
  const allCaptured = needCount === 0;

  const patch = (id: string, p: Partial<ReviewAgent>) => { setAgents((xs) => xs.map((a) => (a.id === id ? { ...a, ...p } : a))); setTick((t) => t + 1); };

  // Destructive card-level bin: removes the agent AND cascades its queries to "Not being imported".
  const remove = (id: string) => {
    const a = agents.find((x) => x.id === id);
    const qc = queryCount(id);
    const next = applyAgentRemoval(agents, queries, id);
    setAgents(next.agents.map((x) => (x.id === id ? { ...x, setAsideStage: "agents" as const } : x)));
    setQueries(next.queries);
    flashToast(`${(a?.name || a?.agency || "Agent")} set aside${qc > 0 ? ` (with ${qc} quer${qc === 1 ? "y" : "ies"})` : ""}`, () => restoreAgent(id));
    setTick((t) => t + 1);
  };

  // Snapshot a cluster's pre-resolution state (members + their queries' agentRefs) so the decision can
  // be undone verbatim later. Keyed by the cluster's leader id; first write wins (kept until undone).
  const snapshotCluster = (leaderId: string) => {
    if (snapRef.current[leaderId]) return;
    const leader = agents.find((a) => a.id === leaderId);
    if (!leader) return;
    const ids = new Set([leader.id, ...leader.mergeWith]);
    snapRef.current[leaderId] = {
      agents: agents.filter((a) => ids.has(a.id)).map((a) => JSON.parse(JSON.stringify(a)) as ReviewAgent),
      queries: queries.filter((q) => ids.has(q.agentRef)).map((q) => ({ id: q.id, agentRef: q.agentRef })),
    };
  };

  // Undo a resolved cluster: restore its members and their queries' agentRefs from the snapshot,
  // re-flagging the pair (keep-both) or un-deleting + re-pointing the removed agent (merge).
  const undoCluster = (leaderId: string) => {
    const snap = snapRef.current[leaderId];
    if (!snap) return;
    const aMap = new Map(snap.agents.map((a) => [a.id, a]));
    const qMap = new Map(snap.queries.map((q) => [q.id, q.agentRef]));
    setAgents((xs) => xs.map((a) => aMap.get(a.id) ?? a));
    setQueries((xs) => xs.map((q) => (qMap.has(q.id) ? { ...q, agentRef: qMap.get(q.id)! } : q)));
    delete snapRef.current[leaderId];
    setTopcap(null);
    setTick((t) => t + 1);
  };

  // Duplicate removal (NOT the bin): set aside ONLY the clicked record. The other members stay
  // flagged as a duplicate group for individual judgement — so a 3-way group takes two deliberate
  // removals to reach one keeper. The removed record's queries repoint to the consolidation target
  // (the leader if it survives, else the first remaining), never dropped; the record is set aside
  // (recoverable on the duplicates stage), never hard-deleted. The cluster only resolves once a
  // single member remains. snapshotCluster (first-write-wins) captures the original cluster so the
  // duplicates-stage reset / Undo can restore the whole group.
  const removeDuplicate = (removedId: string) => {
    // The cluster leader anchors the snapshot/undo; the pure transform owns the set-aside + re-seat.
    const leader = agents.find((a) => !a.deleted && !a.mergeResolved && a.mergeWith.length > 0 && (a.id === removedId || a.mergeWith.includes(removedId)));
    if (!leader) return;
    const next = removeDuplicateRecord(agents, queries, removedId);
    if (next.survivorId === null) return; // never set aside the last member
    snapshotCluster(leader.id);
    setAgents(next.agents);
    setQueries(next.queries);
    const label = (agents.find((x) => x.id === removedId)?.name || agents.find((x) => x.id === removedId)?.agency) || "Record";
    flashToast(`${label} set aside`, () => undoCluster(leader.id));
    setTick((t) => t + 1);
  };

  // Keep both: dismiss the suggestion, leaving two agents. The leader's `duplicate` reason resolves
  // with a "kept both" note (undoable — Undo re-opens the cluster).
  const keepBoth = (leaderId: string) => {
    const leader = agents.find((a) => a.id === leaderId);
    if (!leader) return;
    snapshotCluster(leader.id);
    const group = new Set([leader.id, ...leader.mergeWith]);
    setAgents((xs) => xs.map((a) => {
      if (a.id === leaderId) return { ...a, mergeResolved: true, reasons: a.reasons.map((r) => (r.kind === "duplicate" ? { ...r, resolved: true, undoable: true, note: dupNoteKept(a.agency) } : r)) };
      if (group.has(a.id)) return { ...a, mergeResolved: true };
      return a;
    }));
    setTick((t) => t + 1);
  };

  // Mark a non-duplicate (mapping) reason as checked — resolve in place, keeping the struck note.
  const resolveMapping = (id: string) => { setAgents((xs) => xs.map((a) => (a.id === id ? { ...a, reasons: resolveReason(a, "mapping") } : a))); setTick((t) => t + 1); };

  // Undo a checked note: re-open that reason (un-strike, back to pink, re-derive status + tally).
  const reopenReason = (cardId: string, kind: CheckReason) => {
    if (kind === "duplicate") delete snapRef.current[cardId]; // keep-both re-opened here too — drop its snapshot
    setAgents((xs) => {
      const a0 = xs.find((a) => a.id === cardId);
      if (!a0) return xs;
      if (kind !== "duplicate")
        return xs.map((a) => (a.id === cardId ? { ...a, reasons: a.reasons.map((r) => (r.kind === kind ? { ...r, resolved: false } : r)) } : a));
      // Duplicate (keep-both) undo: re-open the whole cluster.
      const group = new Set([a0.id, ...a0.mergeWith]);
      return xs.map((a) => (group.has(a.id)
        ? { ...a, mergeResolved: false, reasons: a.reasons.map((r) => (r.kind === "duplicate" ? { ...r, resolved: false, note: dupNoteOpen(a.agency) } : r)) }
        : a));
    });
    setTick((t) => t + 1);
  };

  const pulseBlocked = (ids: string[]) => {
    if (ids.length === 0) return;
    setPulseIds(ids);
    cardEls.current[ids[0]]?.scrollIntoView({ block: "center", behavior: "smooth" });
    window.setTimeout(() => setPulseIds([]), 1400);
  };

  // Move between the two screens; edits live in shared state, so they persist both ways.
  const switchScreen = (name: "duplicates" | "agents" | "queries") => {
    // Leaving the duplicates stage locks in its decisions: snapshot them as the new reset baseline.
    if (screen === "duplicates" && name === "agents") {
      baselineRef.current = { agents: JSON.parse(JSON.stringify(agents)), queries: JSON.parse(JSON.stringify(queries)) };
    }
    // Entering the Queries stage: snapshot the queries (post agents-cascade) as the Queries reset point.
    if (name === "queries") {
      queriesBaselineRef.current = queries.map((q) => JSON.parse(JSON.stringify(q)) as ReviewQuery);
    }
    setScreen(name); setFocus(null); setIntroStep(null); setOpenId(null); setHoverTarget(null); setPulseIds([]); setTick((t) => t + 1);
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };

  // Continue: when all agents are captured, advance to Queries; otherwise pulse the blocker(s).
  const onContinueClick = () => {
    if (allCaptured) { switchScreen("queries"); return; }
    pulseBlocked(invalidCount > 0
      ? active.filter((a) => !a.agency.trim()).map((a) => a.id)
      : active.filter((a) => statusOf(a) !== "captured").map((a) => a.id));
  };

  // Reset scoped to the CURRENT stage — never reaches across stages.
  //  • Duplicates stage: restore every duplicates-stage decision (set-aside merges AND keep-boths) to
  //    its original group via the per-cluster snapshots — the set-aside-restore model, not a baseline.
  //    Agent/query-stage set-asides (no cluster snapshot) are untouched.
  //  • Queries stage: revert only the queries to their on-entry snapshot, leaving agents-stage edits.
  //  • Agents stage: revert agents AND their query cascade to the post-duplicates baseline.
  const reset = () => {
    if ((screen as string) === "duplicates") {
      Object.keys(snapRef.current).forEach((leaderId) => undoCluster(leaderId)); // restores members + repointed queries
      setOpenId(null); setTopcap(null); setPulseIds([]); setTick((t) => t + 1);
      return;
    }
    if ((screen as string) === "queries") {
      const qb = queriesBaselineRef.current;
      if (qb) setQueries(qb.map((q) => JSON.parse(JSON.stringify(q)) as ReviewQuery));
    } else {
      const b = baselineRef.current!;
      setAgents(b.agents.map((a) => JSON.parse(JSON.stringify(a)) as ReviewAgent));
      setQueries(b.queries.map((q) => JSON.parse(JSON.stringify(q)) as ReviewQuery));
    }
    setOpenId(null); setTopcap(null); setPulseIds([]); setTick((t) => t + 1);
  };

  // ── Queries side ────────────────────────────────────────────────────────────────────────────────
  const qActive = queries.filter((q) => !q.removed);
  const qDead = queries.filter((q) => q.removed);
  const agentNameOf = (ref: string) => { const a = agents.find((x) => x.id === ref); return (a && (a.name || a.agency)) || "Unknown agent"; };
  // Set-aside shelf contents: deleted agents + queries the user removed directly (queries removed by
  // an agent's cascade ride back with that agent's restore, so they're not listed twice).
  const setAsideItems: SetAsideItem[] = [
    // Duplicates-stage merges are recovered on the duplicates stage (its own reset / per-cluster undo),
    // not here — so they don't surface in the agents/queries tray.
    ...agents.filter((a) => a.deleted && a.setAsideStage !== "duplicates").map((a) => (
      a.setAsideStage === "unidentified"
        ? { kind: "agent" as const, id: a.id, name: "Couldn't tell who this was for", sub: "Set aside — name it any time", context: a.setAsideContext, unidentified: true }
        : { kind: "agent" as const, id: a.id, name: a.name || a.agency || "Unnamed agent", sub: "Agent · set aside" }
    )),
    ...queries.filter((q) => q.removed && q.removedReason === "Removed by you").map((q) => ({ kind: "query" as const, id: q.id, name: agentNameOf(q.agentRef), sub: `Query · ${q.status}` })),
  ];
  const onRestoreSetAside = (kind: "agent" | "query", id: string) => (kind === "agent" ? restoreAgent(id) : restoreQuery(id));
  const qOk = qActive.filter((q) => queryStatusOf(q) === "captured").length;
  const qNeed = qActive.length - qOk;
  // Mirror the Agents all-resolved gate: import only with ≥1 query AND nothing left to check. A
  // missing date is NOT a check reason, so "date needed" never blocks import.
  const canImport = qActive.length > 0 && qNeed === 0;

  // On entering a flagged review stage: first time this session → play the pre-walk intro (which hands
  // off into the walk on "Let's go"); thereafter (or if escaped) → the guided walk opens by default,
  // unless the writer escaped to the list. A zero-flag stage stays on the clean inline list (no intro,
  // no overlay). One unified decision so intro and walk can't both fire.
  useEffect(() => {
    if (introStep !== null || focus) return;
    // Duplicates: an intro-only stage (no walk) — orient once, then drop to the inline resolve cards.
    if (screen === "duplicates") {
      const action = decideStageEntry({ flagged: openDupIds.size > 0, introSeen: introSeen.has("duplicates"), escaped: false });
      if (action === "intro") { setIntroSeen((s) => new Set(s).add("duplicates")); setIntroStep(0); }
      return;
    }
    if (screen !== "agents" && screen !== "queries") return;
    const order = screen === "agents"
      ? active.filter((a) => statusOf(a) !== "captured")
          .sort((a, b) => { const fa = !a.agency.trim() && !a.agencyWaived, fb = !b.agency.trim() && !b.agencyWaived; return fa === fb ? 0 : fa ? -1 : 1; })
          .map((a) => a.id)
      : qActive.filter((q) => queryStatusOf(q) === "needs-check").map((q) => q.id);
    const action = decideStageEntry({ flagged: order.length > 0, introSeen: introSeen.has(screen), escaped: escaped.has(screen) });
    if (action === "intro") { setIntroSeen((s) => new Set(s).add(screen)); setIntroStep(0); return; }
    if (action === "walk") { setFocusSkipped(new Set()); setFocus({ stage: screen, order }); }
    // "none" → stay on the clean/escaped list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, escaped, introStep]);

  const patchQuery = (id: string, p: Partial<ReviewQuery>) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, ...p } : q))); setTick((t) => t + 1); };
  const removeQuery = (id: string) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, removed: true, removedReason: "Removed by you" } : q))); flashToast("Query set aside", () => restoreQuery(id)); setTick((t) => t + 1); };
  // Mark one typed reason resolved (the row goes Ready when none remain open). `patch` lets a
  // resolution also apply the user's fix (set the status, set/clear the sent date, edit the timeline)
  // in the same update.
  const resolveQueryReason = (id: string, code: ReviewReasonCode, patch: Partial<ReviewQuery> = {}) => {
    setQueries((xs) => xs.map((q) => (q.id === id
      ? { ...q, ...patch, reasons: q.reasons.map((r) => (r.code === code ? { ...r, resolved: true } : r)) }
      : q)));
    setTick((t) => t + 1);
  };
  // Swap which date is the sent date vs the (first) timeline event — the two-dates "Swap" control.
  const swapQueryDates = (id: string) => {
    setQueries((xs) => xs.map((q) => {
      if (q.id !== id || q.timeline.length === 0) return q;
      const [ev, ...rest] = q.timeline;
      return { ...q, sentDate: ev.date, sentDateRaw: ev.raw, timeline: [{ ...ev, date: q.sentDate, raw: q.sentDateRaw }, ...rest] };
    }));
    setTick((t) => t + 1);
  };

  const onImportClick = () => {
    if (!canImport) { pulseBlocked(qActive.filter((q) => queryStatusOf(q) !== "captured").map((q) => q.id)); return; }
    void onImport?.(modelToResult(result, agents, queries));
  };

  // One post-it per reason for the CURRENT screen (open = pink; resolved = struck sage). Sides
  // alternate by note order so they split evenly left/right (full width); the layout pass then
  // distributes across each gutter's columns with no overlap. Same NoteSpec shape on both screens.
  const notes: NoteSpec[] = [];
  const notePairCards = new Map<string, Set<string>>();
  if (screen === "agents") {
    // Agents screen → every agent's margin notes. The duplicates stage shows only the resolve boxes
    // (no cards to anchor to), so it carries no post-its — the box's header + consequence line say it.
    const noteAgents = active;
    noteAgents.forEach((a) => {
      // Derived needs-agency post-it (auto-clears when an agency is typed; no manual tick — agencyBlocked).
      if (!a.agency.trim()) {
        const noteId = `${a.id}:agency`;
        notes.push({ noteId, cardId: a.id, side: notes.length % 2 === 0 ? "l" : "r", text: agencyNoteText(a.name), resolved: false, kind: "mapping", undoable: false, agencyBlocked: true });
        notePairCards.set(noteId, new Set([a.id]));
      }
      a.reasons.forEach((r) => {
        const noteId = `${a.id}:${r.kind}`;
        notes.push({ noteId, cardId: a.id, side: notes.length % 2 === 0 ? "l" : "r", text: r.note, resolved: r.resolved, kind: r.kind, undoable: r.undoable, agencyBlocked: !a.agency.trim() });
        // A mapping note pairs to its own card; a duplicate note to the whole cluster (every member).
        notePairCards.set(noteId, r.kind === "duplicate" && a.mergeWith.length > 0
          ? new Set([a.id, ...a.mergeWith].filter((id) => active.some((x) => x.id === id)))
          : new Set([a.id]));
      });
    });
  }
  // The queries screen (B-redesign) renders its typed reasons INLINE in each QueryRow — not as
  // margin post-its — so it contributes no notes to the gutter layer here.
  // Resolve the current hover into the set of cards + notes to highlight (bidirectional).
  const hl = { cards: new Set<string>(), noteIds: new Set<string>() };
  if (hoverTarget) {
    if (hoverTarget.type === "note") {
      hl.noteIds.add(hoverTarget.id);
      (notePairCards.get(hoverTarget.id) ?? new Set()).forEach((c) => hl.cards.add(c));
    } else {
      hl.cards.add(hoverTarget.id);
      notePairCards.forEach((pair, noteId) => {
        if (pair.has(hoverTarget.id)) { hl.noteIds.add(noteId); pair.forEach((c) => hl.cards.add(c)); }
      });
    }
  }

  // Render helpers ----------------------------------------------------------------------------------
  const renderCard = (a: ReviewAgent, stacked = false) => (
    <AgentCard
      key={a.id}
      agent={a}
      queryCount={queryCount(a.id)}
      dupOpen={openDupIds.has(a.id)}
      open={openId === a.id}
      onToggleOpen={() => { setOpenId((cur) => (cur === a.id ? null : a.id)); setTick((t) => t + 1); }}
      onPatch={(p) => patch(a.id, p)}
      onDelete={() => remove(a.id)}
      cardRef={(el) => { cardEls.current[a.id] = el; }}
      highlighted={hl.cards.has(a.id)}
      onHoverPair={(on) => setHoverTarget(on ? { type: "card", id: a.id } : null)}
      pulse={pulseIds.includes(a.id)}
      compact={compact}
      stacked={stacked}
      onResolveReason={(kind) => { if (kind === "mapping") resolveMapping(a.id); }}
      onReopenReason={(kind) => reopenReason(a.id, kind)}
    />
  );

  // A duplicate cluster: members rendered as a gentle overlapping stack of papers (no pill) — the
  // upper card sits over the next with a small offset + soft shadow, both fully legible. One shared
  // dedupe control below; each member's other reasons (e.g. a mapping note) stay per-card.
  // `resolveOnly` (the duplicates stage) drops the stacked cards + "Make changes" — editing details
  // is premature there; the candidate rows already name each agent, and editing lives on Agents.
  const renderCluster = (leader: ReviewAgent, members: ReviewAgent[], resolveOnly = false) => (
    <div key={`clu-${leader.id}`} style={{ position: "relative", background: "#fdf2ec", border: "1px solid #f0d6c9", borderRadius: 12, padding: "10px 9px 11px" }}>
      <div style={{ position: "relative", zIndex: 1, fontFamily: MONO, fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", color: "#b07a64", display: "flex", alignItems: "center", gap: 6, margin: "0 2px 8px" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d8a08c" }} />Looks like the same agent, imported more than once
      </div>
      {!resolveOnly && (
        <div style={{ position: "relative" }}>
          {members.map((m, i) => (
            <div key={m.id} style={{ position: "relative", zIndex: hl.cards.has(m.id) ? 20 : members.length - i, marginTop: i === 0 ? 0 : -9, marginLeft: i * 6, marginRight: i * 6 }}>
              {renderCard(m, true)}
            </div>
          ))}
        </div>
      )}
      <DupControl members={members} queryCount={queryCount} onRemove={removeDuplicate} onKeepBoth={() => keepBoth(leader.id)} />
    </div>
  );

  // A resolved cluster on the (revisited) duplicates stage: a settled sage card stating the decision
  // ("Merged into …" / "Kept both") with an Undo that restores the pre-resolution snapshot.
  const renderResolvedCluster = (c: { leaderId: string; members: ReviewAgent[]; type: "merge" | "keepboth"; survivor?: ReviewAgent }) => {
    const survivorName = c.survivor ? (c.survivor.name || c.survivor.agency || "this agent") : "this agent";
    const label = c.type === "merge" ? `Merged into ${survivorName}` : "Kept both";
    return (
      <div key={`resclu-${c.leaderId}`} style={{ background: C.doneFill, border: "1px solid rgba(90,110,88,0.3)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5a6e58", display: "flex", alignItems: "center", gap: 6 }}><span>✓</span>{label}</div>
          <div style={{ fontFamily: SERIF, fontSize: 13, color: C.doneInk, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.members.map((m, i) => (
              <span key={m.id}>
                <span style={{ textDecoration: m.deleted ? "line-through" : "none", opacity: m.deleted ? 0.55 : 1 }}>{m.name || m.agency || "—"}</span>
                {i < c.members.length - 1 ? <span style={{ color: "#9aa899", margin: "0 6px" }}>·</span> : null}
              </span>
            ))}
          </div>
        </div>
        <button onClick={() => undoCluster(c.leaderId)}
          style={{ flexShrink: 0, fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5a6e58", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(90,110,88,0.4)", borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}
        >Undo</button>
      </div>
    );
  };

  // The open duplicate clusters (leader + members) — drives the chip/title + the Agents-screen clusters.
  const clusters: { leader: ReviewAgent; members: ReviewAgent[] }[] = [];
  {
    const seen = new Set<string>();
    for (const a of active) {
      if (seen.has(a.id) || !(a.mergeWith.length > 0 && !a.mergeResolved)) continue;
      const members = [a, ...a.mergeWith.map((id) => active.find((x) => x.id === id)).filter((x): x is ReviewAgent => !!x)];
      members.forEach((m) => seen.add(m.id));
      clusters.push({ leader: a, members });
    }
  }

  // Every detected cluster, resolved or not — the duplicates stage renders open ones in the active
  // resolve UI and resolved ones in their settled state, so a decision stays revisitable via Back.
  // Pure + unit-tested in smartImportReviewModel (a partial 3-way never classifies as merged).
  const allClusters = buildClusters(agents);

  // Compose the cards column (Agents screen) into render units (singles + duplicate clusters), in order.
  const units: React.ReactNode[] = [];
  const consumed = new Set<string>();
  for (const a of active) {
    if (consumed.has(a.id)) continue;
    if (a.mergeWith.length > 0 && !a.mergeResolved) {
      const members = [a, ...a.mergeWith.map((id) => active.find((x) => x.id === id)).filter((x): x is ReviewAgent => !!x)];
      members.forEach((m) => consumed.add(m.id));
      units.push(renderCluster(a, members));
    } else {
      consumed.add(a.id);
      units.push(renderCard(a));
    }
  }

  // ── New agents-screen layout (B-redesign) ─────────────────────────────────────────────────
  // Cast prevents TypeScript narrowing `screen` after the early return, keeping the old
  // duplicates/queries code's `screen === "agents"` comparisons valid.
  if ((screen as string) === "agents") {
    // Build flat AgentRow list — clusters shown as leader row with inline dup reason
    const agentRows: React.ReactNode[] = [];
    const consumed2 = new Set<string>();
    for (const a of active) {
      if (consumed2.has(a.id)) continue;
      if (a.mergeWith.length > 0 && !a.mergeResolved) {
        const members = [a, ...a.mergeWith.map((id) => active.find((x) => x.id === id)).filter((x): x is ReviewAgent => !!x)];
        members.forEach((m) => consumed2.add(m.id));
        agentRows.push(
          <AgentRow key={a.id} agent={a} queryCount={queryCount(a.id)} dupOpen={true}
            clusterPeers={members.slice(1)}
            open={openId === a.id}
            onToggleOpen={() => { setOpenId((cur) => (cur === a.id ? null : a.id)); setTick((t) => t + 1); }}
            onPatch={(p) => patch(a.id, p)} onDelete={() => remove(a.id)}
            onMerge={() => members.slice(1).forEach((m) => removeDuplicate(m.id))}
            onKeepBoth={() => keepBoth(a.id)}
            onResolveReason={(kind) => { if (kind === "mapping") resolveMapping(a.id); }}
            onReopenReason={(kind) => reopenReason(a.id, kind)}
          />
        );
      } else {
        consumed2.add(a.id);
        agentRows.push(
          <AgentRow key={a.id} agent={a} queryCount={queryCount(a.id)} dupOpen={openDupIds.has(a.id)}
            open={openId === a.id}
            onToggleOpen={() => { setOpenId((cur) => (cur === a.id ? null : a.id)); setTick((t) => t + 1); }}
            onPatch={(p) => patch(a.id, p)} onDelete={() => remove(a.id)}
            onResolveReason={(kind) => { if (kind === "mapping") resolveMapping(a.id); }}
            onReopenReason={(kind) => reopenReason(a.id, kind)}
          />
        );
      }
    }

    const userInitial = userName ? userName[0].toUpperCase() : "?";
    const FAQ_ITEMS = [
      { q: 'What does “needs a look” mean?', a: "We've flagged something worth a glance — a suspected duplicate, or a missing agency. Everything else is ready to import as-is." },
      { q: "Can I add more agents later?", a: "Any time, from your dashboard — by import or by hand." },
      { q: "What if I don't have the agent's name?", a: "Leave the name blank and we'll track them by agency only. Add it whenever you find out." },
      { q: "Is the agency name required?", a: "Yes — every agent needs at least an agency, even when the person's name is blank." },
      { q: "What happens when I delete a duplicate?", a: "We import just one of the two records and merge any queries from the duplicate onto that single agent — so nothing's lost." },
    ];

    const agentTierOf = (a: ReviewAgent): "fix" | "sharpen" => (!a.agency.trim() && !a.agencyWaived ? "fix" : "sharpen");
    const openAgentsFocus = () => {
      const order = active.filter((a) => statusOf(a) !== "captured")
        .sort((a, b) => (agentTierOf(a) === agentTierOf(b) ? 0 : agentTierOf(a) === "fix" ? -1 : 1)) // fixes first
        .map((a) => a.id);
      setEscaped((e) => { const n = new Set(e); n.delete("agents"); return n; }); // re-entering the walk
      setFocusSkipped(new Set()); setFocus({ stage: "agents", order });
    };
    const agentsOverlay = focus?.stage === "agents" ? (
      <FocusOverlay
        order={focus.order}
        statusOf={(id) => { const a = agents.find((x) => x.id === id); return !a || a.deleted || statusOf(a) === "captured" ? "done" : focusSkipped.has(id) ? "skip" : "open"; }}
        tierOf={(id) => { const a = agents.find((x) => x.id === id); return a && agentTierOf(a) === "fix" ? "fix" : "sharpen"; }}
        headerFor={(id) => { const a = agents.find((x) => x.id === id); return { who: a?.name || a?.agency || "Unnamed agent", sub: a?.agency ? a.agency : "No agency yet" }; }}
        renderContent={(id) => {
          const a = agents.find((x) => x.id === id);
          if (!a) return null;
          return (!a.agency.trim() && !a.agencyWaived)
            ? <AgentFixPanel agent={a} onPatch={(p) => patch(id, p)} />
            : (<div><div style={reasonStripStyle}><ReasonIcon /><span>{quoteStatuses(a.reasons.find((r) => !r.resolved)?.note ?? "Worth a quick look.")}</span></div>
                <button onClick={() => resolveMapping(id)} style={solidMini}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f0d3c7"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#f5e2da"; }}>Looks right</button></div>);
        }}
        onSkip={skipFocus}
        onClose={closeFocus}
        doneChip="Agents all sorted — on to your queries"
      />
    ) : null;

    const agentsIntro = introStep !== null ? (
      <CoachmarkIntro welcomeHeading="Now to populate your agent database" readyCount={okCount} checkCount={needCount} checkTier="fix" hasReadyBeat step={introStep}
        readyRef={readyPillRef} checkRef={checkPillRef}
        onIntroGo={() => setIntroStep(1)} onNextReady={() => setIntroStep(2)}
        onLetsGo={() => { setIntroStep(null); openAgentsFocus(); }} />
    ) : null;

    return (
      <ReviewShell userInitial={userInitial} allClear={needCount === 0}
        modal={showSkipModal ? <SkipSetupModal onClose={() => setShowSkipModal(false)} onSkip={onSkip} /> : (agentsIntro ?? agentsOverlay)}>
        <div className="sa-rv-grid">

          {/* ── Left: header + records card + footer ── */}
          <div className="sa-rv-main">
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#5a6e58" }}>Data captured</span>
              <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 30, margin: "6px 0 4px", color: "#33302b" }}>
                Populating your{" "}
                <span style={{ background: "rgba(124,58,42,.16)", borderRadius: 2, padding: ".02em .1em" }}>agent database</span>
                <span style={{ display: "inline-block", width: 2, height: "1.23em", background: "#33302b", marginLeft: 6, verticalAlign: "-0.28em", animation: "saImpBlink 1.06s steps(1,end) infinite" }} aria-hidden />
              </h1>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <span ref={readyPillRef} style={{ fontFamily: MONO, fontSize: 12, padding: "5px 11px", borderRadius: 20, background: "#e6ebe3", color: "#5a6e58" }}>{okCount} ready to import</span>
                {needCount > 0
                  ? <span ref={checkPillRef} style={{ fontFamily: MONO, fontSize: 12, padding: "5px 11px", borderRadius: 20, background: "#f0cdbf", color: "#a85a44" }}>{needCount} to check</span>
                  : <span style={{ fontFamily: MONO, fontSize: 12, padding: "5px 11px", borderRadius: 20, background: "#e6ebe3", color: "#5a6e58" }}>all clear</span>}
              </div>
            </div>

            {/* Commit-error banner */}
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fdecea", border: "1px solid #e6b6a8", borderRadius: 9, padding: "10px 13px", fontFamily: "Inter", fontSize: 12, color: C.invalid, marginBottom: 14 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.invalid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
                {error}
              </div>
            )}

            {/* Records card — internal scroll + edge fades */}
            <RecordsCard>
              {agentRows.length > 0
                ? agentRows
                : <div style={{ padding: "32px 22px", fontFamily: "Inter", fontSize: 13, color: "#9c8878", textAlign: "center" }}>No agents to review.</div>}
            </RecordsCard>

            <SetAsideTray items={setAsideItems} onRestore={onRestoreSetAside} />

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 18, flexShrink: 0 }}>
              <button onClick={() => (hadDuplicates ? switchScreen("duplicates") : onBack?.())}
                style={{ fontFamily: MONO, fontSize: 13, color: "#8a8178", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8178"; }}
              >‹ Back</button>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 22 }}>
                <button onClick={reset}
                  style={{ fontFamily: MONO, fontSize: 13, color: "#8a8178", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8178"; }}
                >Reset all changes made here</button>
                <button onClick={onContinueClick}
                  style={{ fontFamily: MONO, fontSize: 13.5, background: "rgba(199,212,195,.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: allCaptured ? "#5a6e58" : "#8a9e88", border: "1px solid rgba(255,255,255,.55)", borderRadius: 11, padding: "13px 32px", cursor: allCaptured ? "pointer" : "not-allowed", fontWeight: 600, letterSpacing: ".02em", boxShadow: "0 10px 22px -12px rgba(90,110,88,.5),inset 0 1px 0 rgba(255,255,255,.65)", opacity: allCaptured ? 1 : 0.65, transition: "background .15s,color .15s,box-shadow .15s,transform .15s,border-color .15s" }}
                  onMouseEnter={(e) => { if (allCaptured) { e.currentTarget.style.background = "rgba(245,226,218,.62)"; e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(199,212,195,.5)"; e.currentTarget.style.color = allCaptured ? "#5a6e58" : "#8a9e88"; e.currentTarget.style.transform = "none"; }}
                >Continue →</button>
              </div>
            </div>
          </div>

          {/* ── Right: sidebar board ── */}
          <aside className="sa-rv-board">
            <WhereYouAreCard step="agents" onSkip={() => setShowSkipModal(true)} />
            <PinkSlip>
              Anything in <PinkTag /> needs a quick look. It might be a duplicate, or could be missing the agency's name (we need this). Check these for us, add any further details you can, then we'll move on to capturing your queries.
            </PinkSlip>
            <FaqList items={FAQ_ITEMS} open={openFaqs} onToggle={toggleFaq} />
          </aside>
        </div>
        {toast && <UndoToast msg={toast.msg} onUndo={toast.undo} onClose={dismissToast} />}
      </ReviewShell>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  // ── New queries-screen layout (B-redesign) ────────────────────────────────────────────────────
  // Reuses the Agents chrome (nav, two-column grid, sidebar board, header pattern, glass CTA,
  // single-click bin, inline reason panel). Only the rows + sidebar copy differ.
  if ((screen as string) === "queries") {
    const userInitial = userName ? userName[0].toUpperCase() : "?";
    // A query "needs a look" while it carries any open typed reason; otherwise it's ready. Missing
    // dates surface as a `no-date` reason from the engine, so there's no separate presentational state.
    const originOf = (q: ReviewQuery): string => {
      const a = agents.find((x) => x.id === q.agentRef && !x.deleted);
      if (!a) return "From your file";
      if (a.agencyOnly || !a.name) return "Agency only";
      return a.agency || "Agency only";
    };
    const qLookCount = qActive.filter((q) => queryStatusOf(q) === "needs-check").length;
    const qReadyCount = qActive.length - qLookCount;

    const FAQ_ITEMS = [
      { q: 'What does “needs a look” mean?', a: "We've flagged a query where we spotted two dates, an odd-looking date, or a status we weren't sure how to read. Everything else is ready to import." },
      { q: "Can I add more queries later?", a: "Any time — log a new query from your dashboard whenever you send one." },
      { q: "What if I don't know the date I sent it?", a: "Leave it undated. We'll never guess a date for you — you can fill it in later if it turns up." },
      { q: "Can a query have no agent?", a: "No — every query is linked to an agent. Match it to one you already have, or add the agent as new." },
      { q: "What does the status mean?", a: "It's where the query sits in your pipeline — queried, partial, full, and so on. We read it from your file; correct any that look off." },
    ];

    const openQueriesFocus = () => {
      const order = qActive.filter((q) => queryStatusOf(q) === "needs-check").map((q) => q.id); // all sharpen
      setEscaped((e) => { const n = new Set(e); n.delete("queries"); return n; }); // re-entering the walk
      setFocusSkipped(new Set()); setFocus({ stage: "queries", order });
    };
    const queriesOverlay = focus?.stage === "queries" ? (
      <FocusOverlay
        order={focus.order}
        statusOf={(id) => { const q = queries.find((x) => x.id === id); return !q || q.removed || queryStatusOf(q) === "captured" ? "done" : focusSkipped.has(id) ? "skip" : "open"; }}
        tierOf={() => "sharpen"}
        headerFor={(id) => { const q = queries.find((x) => x.id === id); return q ? { who: agentNameOf(q.agentRef), sub: `${originOf(q)} · ${q.status}` } : { who: "", sub: "" }; }}
        renderContent={(id) => {
          const q = queries.find((x) => x.id === id);
          if (!q) return null;
          return q.reasons.filter((r) => !r.resolved).map((r) => (
            <QueryReasonPanel key={r.code} query={q} code={r.code} onPatch={(p) => patchQuery(id, p)} onResolveReason={(code, patch) => resolveQueryReason(id, code, patch)} onSwapDates={() => swapQueryDates(id)} />
          ));
        }}
        onSkip={skipFocus}
        onClose={closeFocus}
        doneChip="Queries all sorted — ready to import"
      />
    ) : null;

    const queriesIntro = introStep !== null ? (
      <CoachmarkIntro welcomeHeading="Now to populate your query log" readyCount={qReadyCount} checkCount={qLookCount} checkTier="sharpen" hasReadyBeat step={introStep}
        readyRef={readyPillRef} checkRef={checkPillRef}
        onIntroGo={() => setIntroStep(1)} onNextReady={() => setIntroStep(2)}
        onLetsGo={() => { setIntroStep(null); openQueriesFocus(); }} />
    ) : null;

    return (
      <ReviewShell userInitial={userInitial} allClear={qLookCount === 0}
        modal={showSkipModal ? <SkipSetupModal onClose={() => setShowSkipModal(false)} onSkip={onSkip} /> : (queriesIntro ?? queriesOverlay)}>
        <div className="sa-rv-grid">

          {/* ── Left: header + records card + footer ── */}
          <div className="sa-rv-main">
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#5a6e58" }}>Data captured</span>
              <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 30, margin: "6px 0 4px", color: "#33302b" }}>
                Populating your{" "}
                <span style={{ background: "rgba(124,58,42,.16)", borderRadius: 2, padding: ".02em .1em" }}>query log</span>
                <span style={{ display: "inline-block", width: 2, height: "1.23em", background: "#33302b", marginLeft: 6, verticalAlign: "-0.28em", animation: "saImpBlink 1.06s steps(1,end) infinite" }} aria-hidden />
              </h1>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <span ref={readyPillRef} style={{ fontFamily: MONO, fontSize: 12, padding: "5px 11px", borderRadius: 20, background: "#e6ebe3", color: "#5a6e58" }}>{qReadyCount} ready to import</span>
                {qLookCount > 0
                  ? <span ref={checkPillRef} style={{ fontFamily: MONO, fontSize: 12, padding: "5px 11px", borderRadius: 20, background: "#f0cdbf", color: "#a85a44" }}>{qLookCount} to check</span>
                  : <span style={{ fontFamily: MONO, fontSize: 12, padding: "5px 11px", borderRadius: 20, background: "#e6ebe3", color: "#5a6e58" }}>all clear</span>}
              </div>
            </div>

            {/* Commit-error banner */}
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fdecea", border: "1px solid #e6b6a8", borderRadius: 9, padding: "10px 13px", fontFamily: "Inter", fontSize: 12, color: C.invalid, marginBottom: 14 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.invalid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
                {error}
              </div>
            )}

            {/* Records card — internal scroll + edge fades */}
            <RecordsCard>
              {qActive.length > 0
                ? qActive.map((q) => (
                    <QueryRow key={q.id} query={q} agentName={agentNameOf(q.agentRef)} origin={originOf(q)}
                      open={openId === q.id}
                      onToggleOpen={() => { setOpenId((cur) => (cur === q.id ? null : q.id)); setTick((t) => t + 1); }}
                      onPatch={(p) => patchQuery(q.id, p)}
                      onDelete={() => removeQuery(q.id)}
                      onResolveReason={(code, patch) => resolveQueryReason(q.id, code, patch)}
                      onSwapDates={() => swapQueryDates(q.id)}
                    />
                  ))
                : <div style={{ padding: "32px 22px", fontFamily: "Inter", fontSize: 13, color: "#9c8878", textAlign: "center" }}>No queries to review.</div>}
            </RecordsCard>

            <SetAsideTray items={setAsideItems} onRestore={onRestoreSetAside} />

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 18, flexShrink: 0 }}>
              <button onClick={() => switchScreen("agents")}
                style={{ fontFamily: MONO, fontSize: 13, color: "#8a8178", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8178"; }}
              >‹ Back</button>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 22 }}>
                <button onClick={reset}
                  style={{ fontFamily: MONO, fontSize: 13, color: "#8a8178", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3a2a"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8178"; }}
                >Reset all changes made here</button>
                {/* Commit seam: onImportClick awaits onImport(modelToResult(...)) → hand-off to the loader. */}
                <button onClick={onImportClick}
                  style={{ fontFamily: MONO, fontSize: 13.5, background: "rgba(199,212,195,.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: canImport ? "#5a6e58" : "#8a9e88", border: "1px solid rgba(255,255,255,.55)", borderRadius: 11, padding: "13px 32px", cursor: canImport ? "pointer" : "not-allowed", fontWeight: 600, letterSpacing: ".02em", boxShadow: "0 10px 22px -12px rgba(90,110,88,.5),inset 0 1px 0 rgba(255,255,255,.65)", opacity: canImport ? 1 : 0.65, transition: "background .15s,color .15s,box-shadow .15s,transform .15s,border-color .15s" }}
                  onMouseEnter={(e) => { if (canImport) { e.currentTarget.style.background = "rgba(245,226,218,.62)"; e.currentTarget.style.color = "#7c3a2a"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(199,212,195,.5)"; e.currentTarget.style.color = canImport ? "#5a6e58" : "#8a9e88"; e.currentTarget.style.transform = "none"; }}
                >Import and get started →</button>
              </div>
            </div>
          </div>

          {/* ── Right: sidebar board ── */}
          <aside className="sa-rv-board">
            <WhereYouAreCard step="queries" onSkip={() => setShowSkipModal(true)} />
            <PinkSlip>
              Anything in <PinkTag /> needs a quick look. A query might be missing its date, or we couldn't match it to an agent. Check these for us, add any further details you can, then we'll bring it all into your log.
            </PinkSlip>
            <FaqList items={FAQ_ITEMS} open={openFaqs} onToggle={toggleFaq} />
          </aside>
        </div>
        {toast && <UndoToast msg={toast.msg} onUndo={toast.undo} onClose={dismissToast} />}
      </ReviewShell>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  // Duplicates is an intro-only stage (no walk): welcome → spotlight the "possible doubles" pill →
  // close to the inline resolve cards. checkCopy keeps the to-check beat duplicates-true.
  const duplicatesIntro = (screen as string) === "duplicates" && introStep !== null ? (
    <CoachmarkIntro
      welcomeHeading={clusters.length === 1 ? "First, a possible duplicate" : "First, a couple of possible duplicates"}
      readyCount={0} checkCount={clusters.length} checkTier="fix" hasReadyBeat={false} step={introStep}
      readyRef={readyPillRef} checkRef={checkPillRef}
      checkCopy={{ hd: clusters.length === 1 ? "One looks like the same agent" : `${clusters.length} look like the same agent`, body: <>Two records that look like one agent — keep both, or merge them. <b>We'll sort these now — it won't take a sec.</b></> }}
      onIntroGo={() => setIntroStep(2)} onNextReady={() => setIntroStep(2)}
      onLetsGo={() => setIntroStep(null)} />
  ) : null;

  return (
    <div style={{ background: C.band, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: bannerH + 12, overflowX: "hidden" }}>
      {duplicatesIntro}
      <style>{`@keyframes saImpPulse{0%{box-shadow:0 0 0 0 rgba(176,74,58,0.55)}70%{box-shadow:0 0 0 7px rgba(176,74,58,0)}100%{box-shadow:0 0 0 0 rgba(176,74,58,0)}}`}</style>
      {/* Navigation runs entirely through the panel footer (Continue / Back / "Review all agents →")
          and the duplicates flow — no top tab switcher (it was a dev-only browsing aid). */}
      {topcap && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A89A90", textAlign: "center", padding: "16px 0 6px" }}>{topcap}</div>}

      {/* compact-only hint banner (the rotated corner sticky can't fit the margins) — not on the dup stage */}
      {compact && screen !== "duplicates" && (
        <div style={{ width: panelWidth, margin: "12px auto 0", background: C.sticky, padding: "10px 13px", fontFamily: CAVEAT, fontWeight: 600, fontSize: 15, lineHeight: 1.2, color: C.stickyInk, borderRadius: 4, boxShadow: "0 4px 12px rgba(58,28,20,0.12)" }}>
          {screen === "agents"
            ? <>Don't know the agent's name? Tap the <span style={{ display: "inline-flex", width: 15, height: 15, borderRadius: "50%", border: `1.4px solid ${C.burgundy}`, color: C.burgundy, alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 9, transform: "translateY(2px)" }}>?</span> in that field &amp; we'll reference them by agency only.</>
            : "Queries relating to agents you just opted not to import won't be included — they're shown at the bottom for reference."}
        </div>
      )}

      {/* commit-error banner — a failed import is never silent */}
      {error && (
        <div style={{ width: panelWidth, margin: "12px auto 0", display: "flex", alignItems: "center", gap: 8, background: "#fdecea", border: "1px solid #e6b6a8", borderRadius: 9, padding: "10px 13px", fontFamily: "Inter", fontSize: 12, color: C.invalid }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.invalid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
          {error}
        </div>
      )}

      <div ref={bandRef} style={{ position: "relative", width: BAND_W, maxWidth: "100%", margin: "0 auto", paddingTop: 14, paddingBottom: 30 }}>
        {/* ruled-paper + margin line (decorative) */}
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: "repeating-linear-gradient(transparent,transparent 28px,rgba(110,130,140,0.15) 28px,rgba(110,130,140,0.15) 29px)", WebkitMaskImage: "radial-gradient(ellipse 72% 82% at 50% 44%,#000 18%,rgba(0,0,0,0.5) 55%,transparent 82%)", maskImage: "radial-gradient(ellipse 72% 82% at 50% 44%,#000 18%,rgba(0,0,0,0.5) 55%,transparent 82%)" }} />
        <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: 64, width: 1, zIndex: 0, pointerEvents: "none", background: "#e6a99c", opacity: 0.35, WebkitMaskImage: "linear-gradient(transparent 0%,#000 16%,#000 70%,transparent 100%)", maskImage: "linear-gradient(transparent 0%,#000 16%,#000 70%,transparent 100%)" }} />

        {/* chrome */}
        <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "space-between", width: panelWidth, margin: "0 auto 10px" }}>
          <span style={{ display: "flex", gap: 5 }}>
            {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ width: i === 3 ? 18 : 5, height: 5, borderRadius: i === 3 ? 3 : "50%", background: i === 3 ? C.burgundy : "#cabfae" }} />)}
          </span>
          <span onClick={onSkip} style={{ fontFamily: MONO, fontSize: 10, color: C.muted, cursor: onSkip ? "pointer" : "default" }}>Skip setup</span>
        </div>

        {/* corner sticky hint — higher and further right, clear of the panel and the other notes (not on dup) */}
        {!compact && screen !== "duplicates" && (
          <div style={{ position: "absolute", zIndex: 6, top: -10, right: -20, width: 158, background: C.sticky, padding: "13px 14px 15px", fontFamily: CAVEAT, fontWeight: 600, fontSize: 15, lineHeight: 1.2, color: C.stickyInk, boxShadow: "0 7px 18px rgba(58,28,20,0.18)", transform: "rotate(2.6deg)", borderRadius: 2 }}>
            <span style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", width: 13, height: 13, borderRadius: "50%", background: "#b04a3a", boxShadow: "0 2px 3px rgba(0,0,0,.3)" }} />
            {screen === "agents"
              ? <>Don't know the agent's name? Tap the <span style={{ display: "inline-flex", width: 15, height: 15, borderRadius: "50%", border: `1.4px solid ${C.burgundy}`, color: C.burgundy, alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 9, transform: "translateY(2px)" }}>?</span> in that field &amp; we'll reference them by agency only.</>
              : "Queries relating to agents you just opted not to import won't be included — they're shown at the bottom for reference."}
          </div>
        )}

        {/* panel chrome — three nested layers (matches scriptally-header-fill-target.html):
            • panel  → parchment fill; its 8px padding is the even white rim on all four sides
            • frame  → the thin burgundy line inset at the rim, with overflow:hidden so it clips
                       everything inside (header included) to its own radius — the rim shows above
                       AND beside the sage, uniform all the way round
            • header → sage fill with NO radius/margin of its own; it ends at the frame border */}
        <div style={{ position: "relative", zIndex: 2, width: panelWidth, margin: "0 auto", background: C.panel, borderRadius: 17, padding: 8, border: "1px solid rgba(124,58,42,0.10)", boxShadow: "0 14px 44px rgba(58,28,20,0.16)" }}>
          <div style={{ border: `1px solid ${C.frame}`, borderRadius: 10, overflow: "hidden", background: C.panel }}>
            {/* sage header — fills the frame's top; the frame's overflow:hidden clips it cleanly */}
            <div style={{ background: C.sage, padding: "14px 16px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fdfaf5", border: "1px solid rgba(124,58,42,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: C.burgundy, flexShrink: 0 }}>
                  {screen === "duplicates"
                    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
                    : screen === "agents"
                      ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>
                      : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>}
                </div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6e58" }}>{screen === "duplicates" ? "Before you review" : screen === "agents" ? "Data captured" : "Queries allocated to agents"}</div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: C.head, lineHeight: 1.12 }}>{screen === "duplicates" ? (clusters.length === 0 ? "All doubles sorted" : clusters.length === 1 ? "One looks like the same agent" : clusters.length === 2 ? "A couple look like the same agent" : "A few look like the same agent") : screen === "agents" ? "Populating your agent database" : "Database populated"}</div>
                  <div style={{ fontSize: 9.5, color: "#6a7e68", fontWeight: 300, fontStyle: "italic", marginTop: 2 }}>{screen === "duplicates" ? "Sort these doubles first and the rest of your list stays tidy" : screen === "agents" ? "Amend if you like, or continue on to queries…" : "Check and continue…"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                {screen === "duplicates"
                  ? <span ref={checkPillRef} style={{ fontFamily: MONO, fontSize: 8.5, padding: "3px 8px", borderRadius: 14, background: clusters.length ? C.noteFill : "#e7ece1", color: clusters.length ? C.burgundy : "#44563a" }}>{clusters.length ? `${clusters.length} possible double${clusters.length === 1 ? "" : "s"}` : "All sorted"}</span>
                  : <>
                    <span style={{ fontFamily: MONO, fontSize: 8.5, padding: "3px 8px", borderRadius: 14, background: "#fff", color: "#44563a" }}>{screen === "agents" ? okCount : qOk} ready to import</span>
                    <span style={{ fontFamily: MONO, fontSize: 8.5, padding: "3px 8px", borderRadius: 14, background: C.noteFill, color: C.burgundy }}>{screen === "agents" ? needCount : qNeed} to check</span>
                  </>}
              </div>
            </div>

            {/* scrolling cards */}
            {/* Cap the scroll area to whatever's left above the pinned banner, so the panel's footer
                (Continue / Import) is visible at load without scrolling under the banner. */}
            <div ref={midRef} style={{ maxHeight: `min(520px, calc(100vh - ${bannerH + 350}px))`, overflowY: "auto", overflowX: "hidden", padding: "12px 12px 6px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
                {screen === "duplicates"
                  ? allClusters.map((c) => (c.resolved && c.type !== "open"
                    ? renderResolvedCluster({ leaderId: c.leaderId, members: c.members, type: c.type as "merge" | "keepboth", survivor: c.survivor })
                    : renderCluster(c.members[0], c.openMembers, true)))
                  : units /* queries render in their own early-return layout above */}
              </div>
            </div>

            {/* gatebar — reflects the current screen's blocker (the duplicates stage is non-gated) */}
            {screen === "duplicates" ? null : screen === "agents" ? (!allCaptured && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.02em", color: C.invalid, background: "#fff4f1", borderTop: "0.5px solid #f0d8cc" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.invalid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                {invalidCount > 0
                  ? (invalidCount === 1 ? "One agent needs an agency before we can continue" : `${invalidCount} agents need an agency before we can continue`)
                  : (needCount === 1 ? "One agent still needs checking before we can continue" : `${needCount} agents still need checking before we can continue`)}
              </div>
            )) : (!canImport && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.02em", color: C.invalid, background: "#fff4f1", borderTop: "0.5px solid #f0d8cc" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.invalid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                {qActive.length === 0
                  ? "Nothing to import yet"
                  : (qNeed === 1 ? "One query still needs checking before we can import" : `${qNeed} queries still need checking before we can import`)}
              </div>
            ))}

            {/* footer */}
            {screen === "duplicates" ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderTop: "0.5px solid rgba(124,58,42,0.16)" }}>
                <span onClick={onBack} style={{ fontFamily: MONO, fontSize: 10, color: "#9a8a72", cursor: "pointer" }}>‹ Back</span>
                <span onClick={reset} style={{ fontFamily: MONO, fontSize: 9, color: "#b6a89a", cursor: "pointer", letterSpacing: "0.03em" }}>Reset all changes made here</span>
                {/* always available — proceeding is the deliberate "don't trap people" skip; unresolved clusters carry through */}
                <button onClick={() => switchScreen("agents")}
                  style={{ background: "#f5e2da", border: "1px solid #e8c8bc", color: C.burgundy, fontFamily: MONO, fontSize: 10.5, fontWeight: 500, letterSpacing: "0.07em", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}
                >Review all agents →</button>
              </div>
            ) : screen === "agents" ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderTop: "0.5px solid rgba(124,58,42,0.16)" }}>
                {/* if the session opened on the duplicates stage, Back returns there (decisions stay fixable) */}
                <span onClick={() => (hadDuplicates ? switchScreen("duplicates") : onBack())} style={{ fontFamily: MONO, fontSize: 10, color: "#9a8a72", cursor: "pointer" }}>‹ Back{hadDuplicates ? " to duplicates" : ""}</span>
                <span onClick={reset} style={{ fontFamily: MONO, fontSize: 9, color: "#b6a89a", cursor: "pointer", letterSpacing: "0.03em" }}>Reset all changes made here</span>
                <button
                  onClick={onContinueClick}
                  aria-disabled={!allCaptured}
                  style={{ background: !allCaptured ? "#efe7df" : "#f5e2da", border: `1px solid ${!allCaptured ? "#e2d6c8" : "#e8c8bc"}`, color: !allCaptured ? "#b6a596" : C.burgundy, fontFamily: MONO, fontSize: 10.5, fontWeight: 500, letterSpacing: "0.07em", borderRadius: 10, padding: "10px 20px", cursor: !allCaptured ? "not-allowed" : "pointer", opacity: !allCaptured ? 0.6 : 1 }}
                >Continue →</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderTop: "0.5px solid rgba(124,58,42,0.16)" }}>
                <span onClick={() => switchScreen("agents")} style={{ fontFamily: MONO, fontSize: 10, color: "#9a8a72", cursor: "pointer" }}>‹ Back to agents</span>
                <span onClick={reset} style={{ fontFamily: MONO, fontSize: 9, color: "#b6a89a", cursor: "pointer", letterSpacing: "0.03em" }}>Reset all changes made here</span>
                <PinkButton onClick={onImportClick} style={canImport ? undefined : { opacity: 0.5, cursor: "not-allowed" }}>
                  Import {qActive.length} quer{qActive.length === 1 ? "y" : "ies"}
                </PinkButton>
              </div>
            )}
          </div>
        </div>

        {/* post-it notes layer (desktop only; mobile uses inline notes inside each card) */}
        {!compact && (
          <NotesLayer
            notes={notes} midRef={midRef} bandRef={bandRef} cardEls={cardEls}
            highlightedNotes={hl.noteIds}
            onHover={(id) => setHoverTarget(id ? { type: "note", id } : null)}
            onResolveMapping={resolveMapping}
            onReopen={reopenReason}
            tick={tick}
          />
        )}

        {/* "Not being imported" — excluded queries with their reason (Queries screen only) */}
        {screen === "queries" && qDead.length > 0 && (
          <div style={{ position: "relative", zIndex: 2, width: panelWidth, margin: "16px auto 0" }}>
            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a89a8c", margin: "0 2px 9px", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#b3a799" strokeWidth="2.4"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" strokeLinecap="round" /></svg>
              Not being imported ({qDead.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {qDead.map((q) => <DeadBox key={q.id} query={q} agentName={agentNameOf(q.agentRef)} />)}
            </div>
          </div>
        )}
      </div>

      {/* step-aware guidance banner, docked full-width below the panel */}
      <GuidanceBanner step={screen} compact={compact} dupCount={clusters.length} onHeight={setBannerH} />
    </div>
  );
};
