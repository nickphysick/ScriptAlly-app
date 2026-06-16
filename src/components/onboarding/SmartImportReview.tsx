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
import { SmartImportResult } from "../../types/smartImport";
import { QueryStatus } from "../../types";
import { SegmentedToggle, WeekSlider, GenreCombobox, FitStars } from "../forms";
import { PREDEFINED_GENRES } from "../../lib/manuscripts";
import { StatusDot } from "../StatusDot";
import { PinkButton } from "../dashboard/HeroCard";
import {
  ReviewAgent, ReviewQuery, ReasonItem, CheckReason, AgentStatus,
  agentStatus, resolveReason, queryStatusOf, fmtDate, QUERY_STATUS_OPTIONS,
  dupNoteOpen, dupNoteKept, dupNoteMerged, parseModel, modelToResult,
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
const BAND_W = 1040;  // panel + ~260px margin each side for the notes
const NOTE_W = 210;
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
  return <span style={{ ...chipBase, background: "#e7ece1", color: "#44563a" }}>✓ Captured</span>;
};

// ── Note content (shared by the margin post-its and the inline-on-mobile fallback) ───────────────
const noteColors = (resolved: boolean) => ({ fill: resolved ? C.doneFill : C.noteFill, ink: resolved ? C.doneInk : C.noteInk });
const NoteActions: React.FC<{ resolved: boolean; undoable: boolean; kind: CheckReason; agencyBlocked: boolean; onResolve: () => void; onReopen: () => void }> = ({ resolved, undoable, kind, agencyBlocked, onResolve, onReopen }) => {
  if (resolved)
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
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
      <button onClick={onResolve}
        style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.04em", textTransform: "uppercase", color: "#7c3a2a", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(124,58,42,0.25)", borderRadius: 7, padding: "3px 8px", marginTop: 8, cursor: "pointer" }}
      >Mark as checked</button>
    );
  return null;
};

/** Inline note variant used below the breakpoint, where the margins can't hold post-its. */
const InlineNote: React.FC<{ text: string; resolved: boolean; kind: CheckReason; undoable: boolean; agencyBlocked: boolean; onResolve: () => void; onReopen: () => void }> = ({ text, resolved, kind, undoable, agencyBlocked, onResolve, onReopen }) => {
  const { fill, ink } = noteColors(resolved);
  return (
    <div style={{ background: fill, border: `1px solid ${resolved ? "#cdd8c7" : "#f1d3cf"}`, borderRadius: 8, padding: "9px 11px", fontFamily: CAVEAT, fontWeight: 500, fontSize: 15, lineHeight: 1.2, color: ink }}>
      <span style={{ textDecoration: resolved ? "line-through" : "none", opacity: resolved ? 0.85 : 1 }}>{text}</span>
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

      {/* inline notes (mobile fallback): the margin post-its can't fit, so each reason renders here */}
      {compact && agent.reasons.length > 0 && (
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 8, marginTop: 11 }}>
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
interface QueryCardProps {
  query: ReviewQuery;
  agentName: string;
  open: boolean;
  onToggleOpen: () => void;
  onPatch: (patch: Partial<ReviewQuery>) => void;
  onDelete: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  highlighted: boolean;
  onHoverPair: (on: boolean) => void;
  compact: boolean;
  pulse: boolean;
  onResolveReason: () => void;
  onReopenReason: () => void;
}

const QueryCard: React.FC<QueryCardProps> = ({
  query, agentName, open, onToggleOpen, onPatch, onDelete, cardRef, highlighted, onHoverPair, compact, pulse, onResolveReason, onReopenReason,
}) => {
  const [confirming, setConfirming] = useState(false);
  const status = queryStatusOf(query);
  const leftColour = status === "needs-check" ? C.burgundy : C.sageEdge;

  return (
    <div
      ref={cardRef}
      data-query={query.id}
      onMouseEnter={() => onHoverPair(true)}
      onMouseLeave={() => onHoverPair(false)}
      style={{
        position: "relative", background: C.cardFill, borderRadius: 9, padding: "10px 12px 10px 16px",
        boxShadow: highlighted ? "0 8px 22px rgba(58,28,20,0.20)" : "0 1px 4px rgba(58,28,20,0.07)",
        transform: highlighted ? "scale(1.02)" : "none",
        transition: "transform .15s ease, box-shadow .15s ease",
        animation: pulse ? "saImpPulse 0.7s ease 2" : undefined,
      }}
    >
      {/* colour-coded left accent, clipped to the card's rounded outline (same as agents) */}
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
        <span style={{ width: 30, height: 30, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <StatusDot status={query.status} size={26} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 15, color: "#2e2018", lineHeight: 1.1 }}>{agentName}</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.02em", color: query.date ? C.meta : C.invalid, marginTop: 3 }}>
            {query.status} · {fmtDate(query.date)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginRight: 18 }}>
          <StateChip status={status} />
          <button onClick={(e) => { e.stopPropagation(); onToggleOpen(); }} style={{ fontFamily: MONO, fontSize: 8.5, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {open ? "Close" : "Make changes"}
          </button>
        </div>
      </div>

      {/* editor — status + the date of that status */}
      {open && (
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 11, marginTop: 12, paddingTop: 12, borderTop: "0.5px solid #e8ddce" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>Status</span>
              <select value={query.status} onChange={(e) => onPatch({ status: e.target.value as QueryStatus })}
                style={{ ...finBase, cursor: "pointer" }}>
                {QUERY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={flab}>When did this happen?</span>
              <input type="date" value={query.date ?? ""} onChange={(e) => onPatch({ date: e.target.value || null })}
                style={{ ...finBase, ...(query.date ? {} : { border: "1px solid #e0b6a8", background: "#fdf5f2" }) }} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.35 }}>Change the status and I'll log the date so your timeline stays accurate.</div>
        </div>
      )}

      {/* inline notes (mobile fallback) */}
      {compact && query.reasons.length > 0 && (
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 8, marginTop: 11 }}>
          {query.reasons.map((r) => (
            <InlineNote key={r.kind} text={r.note} resolved={r.resolved} kind={r.kind} undoable={r.undoable} agencyBlocked={false}
              onResolve={onResolveReason} onReopen={onReopenReason} />
          ))}
        </div>
      )}

      {/* delete confirm */}
      {confirming && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(250,248,243,0.96)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, zIndex: 5, padding: "0 16px", textAlign: "center" }}>
          <div style={{ fontFamily: SERIF, fontSize: 13, color: "#2e2018", lineHeight: 1.25 }}>Remove this query?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setConfirming(false); onDelete(); }} style={{ background: C.burgundy, color: "#fff", border: "none", borderRadius: 8, fontFamily: MONO, fontSize: 9, letterSpacing: "0.04em", padding: "7px 15px", cursor: "pointer" }}>Remove</button>
            <button onClick={() => setConfirming(false)} style={{ background: "#fff", border: "1px solid #e0d5c8", color: "#6a5a50", borderRadius: 8, fontFamily: MONO, fontSize: 9, padding: "7px 15px", cursor: "pointer" }}>Keep</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── "Not being imported" box (excluded query, with its reason) ────────────────────────────────────
const DeadBox: React.FC<{ query: ReviewQuery; agentName: string }> = ({ query, agentName }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#ebe6df", border: "1px solid #ddd5c9", borderRadius: 8, padding: "8px 11px" }}>
    <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}><StatusDot status={query.status} size={18} ghost /></span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: SERIF, fontSize: 13.5, color: "#8a8076" }}>{agentName}</div>
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.03em", color: "#ada093", marginTop: 2 }}>{query.status} · {fmtDate(query.date)}</div>
    </div>
    <span style={{ fontFamily: MONO, fontSize: 8, color: "#9a8c7e", background: "#e0d9cf", padding: "4px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>{query.removedReason}</span>
  </div>
);

// ── Post-it notes layer — full-page (no clip): notes track their card's live position and clamp to
//    the band (the page region), so they may sit above the panel's top edge and out in the margins. ─
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
    const bandH = bandRect.height;
    notesEl.style.height = bandH + "px";
    // Desired top per note (aligned to its card's live row, so it scroll-couples), then a per-side
    // collision-avoidance pass so multiple notes never overlap. Clamp to the band, not a sub-box.
    const bySide: Record<"l" | "r", { el: HTMLDivElement; desired: number }[]> = { l: [], r: [] };
    for (const n of notes) {
      const card = cardEls.current[n.cardId];
      const noteEl = noteEls.current[n.noteId];
      if (!card || !noteEl) continue;
      const arow = (card.querySelector("[data-arow]") as HTMLElement | null) ?? card;
      const ar = arow.getBoundingClientRect();
      const desired = (ar.top - bandRect.top) + ar.height / 2 - noteEl.offsetHeight / 2;
      bySide[n.side].push({ el: noteEl, desired });
    }
    for (const side of ["l", "r"] as const) {
      const list = bySide[side].sort((a, b) => a.desired - b.desired);
      let prevBottom = -Infinity;
      for (const item of list) {
        let top = Math.max(item.desired, prevBottom + 8);
        top = Math.max(4, Math.min(top, bandH - item.el.offsetHeight - 4));
        item.el.style.top = top + "px";
        prevBottom = top + item.el.offsetHeight;
      }
    }
  }, [notes, bandRef, cardEls]);

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
              position: "absolute", [n.side === "l" ? "left" : "right"]: n.side === "l" ? 2 : 4,
              width: NOTE_W, fontFamily: CAVEAT, fontWeight: 500, fontSize: 16, lineHeight: 1.18, color: ink,
              background: fill, padding: "10px 12px 11px", borderRadius: 2, pointerEvents: "auto", textAlign: "left",
              boxShadow: hl ? "0 9px 22px rgba(58,28,20,0.22)" : "0 5px 14px rgba(58,28,20,0.16)",
              transform: `rotate(${rot}deg)${hl ? " scale(1.07)" : ""}`,
              transition: "transform .18s ease, box-shadow .18s ease",
            } as React.CSSProperties}
          >
            <span style={{ position: "absolute", top: -6, left: "50%", width: 36, height: 12, background: "rgba(205,185,178,0.5)", borderRadius: 1, transform: "translateX(-50%) rotate(-3deg)" }} />
            <span style={{ textDecoration: n.resolved ? "line-through" : "none", opacity: n.resolved ? 0.85 : 1 }}>{n.text}</span>
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
}

export const SmartImportReview: React.FC<SmartImportReviewProps> = ({ result, onBack, onSkip, error, onImport }) => {
  const initial = useMemo(() => parseModel(result), [result]);
  const [agents, setAgents] = useState<ReviewAgent[]>(initial.agents);
  const [queries, setQueries] = useState<ReviewQuery[]>(initial.queries);
  const [screen, setScreen] = useState<"agents" | "queries">("agents");
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<{ type: "card" | "note"; id: string } | null>(null);
  const [tick, setTick] = useState(0);              // nudges the notes layout after edits
  const [topcap, setTopcap] = useState<string | null>(null);
  const [pulseIds, setPulseIds] = useState<string[]>([]);
  const [compact, setCompact] = useState(false);

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
    setAgents((xs) => xs.map((x) => (x.id === id ? { ...x, deleted: true } : x)));
    setQueries((qs) => qs.map((q) => (q.agentRef === id && !q.removed ? { ...q, removed: true, removedReason: "Agent removed" } : q)));
    if (a && qc > 0) setTopcap(`${a.name || a.agency} (${qc} quer${qc === 1 ? "y" : "ies"}) was removed — see ${qc === 1 ? "it" : "them"} on the Queries tab under "Not being imported"`);
    setTick((t) => t + 1);
  };

  // Duplicate removal (NOT the bin): merge by explicit survivor choice. The removed record's queries
  // are repointed to the survivor — never dropped. The survivor's `duplicate` reason resolves with a
  // "merged" note (not undoable; "Reset all changes" reverts it).
  const removeDuplicate = (removedId: string) => {
    const leader = agents.find((a) => !a.deleted && a.mergeWith.length > 0 && (a.id === removedId || a.mergeWith.includes(removedId)));
    if (!leader) return;
    const group = [leader.id, ...leader.mergeWith];
    const survivorId = group.find((id) => id !== removedId && !(agents.find((x) => x.id === id)?.deleted));
    if (!survivorId) return;
    setQueries((qs) => qs.map((q) => (q.agentRef === removedId ? { ...q, agentRef: survivorId } : q)));
    setAgents((xs) => xs.map((a) => {
      if (a.id === removedId) return { ...a, deleted: true };
      if (a.id === survivorId) {
        const hasDup = a.reasons.some((r) => r.kind === "duplicate");
        const reasons = hasDup
          ? a.reasons.map((r) => (r.kind === "duplicate" ? { ...r, resolved: true, undoable: false, note: dupNoteMerged } : r))
          : [{ kind: "duplicate" as CheckReason, note: dupNoteMerged, resolved: true, undoable: false }, ...a.reasons];
        return { ...a, mergeResolved: true, reasons };
      }
      if (group.includes(a.id)) return { ...a, mergeResolved: true };
      return a;
    }));
    setTick((t) => t + 1);
  };

  // Keep both: dismiss the suggestion, leaving two agents. The leader's `duplicate` reason resolves
  // with a "kept both" note (undoable — Undo re-opens the cluster).
  const keepBoth = (leaderId: string) => {
    const leader = agents.find((a) => a.id === leaderId);
    if (!leader) return;
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
  const switchScreen = (name: "agents" | "queries") => {
    setScreen(name); setOpenId(null); setHoverTarget(null); setPulseIds([]); setTick((t) => t + 1);
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };

  // Continue: when all agents are captured, advance to Queries; otherwise pulse the blocker(s).
  const onContinueClick = () => {
    if (allCaptured) { switchScreen("queries"); return; }
    pulseBlocked(invalidCount > 0
      ? active.filter((a) => !a.agency.trim()).map((a) => a.id)
      : active.filter((a) => statusOf(a) !== "captured").map((a) => a.id));
  };

  const reset = () => { const m = parseModel(result); setAgents(m.agents); setQueries(m.queries); setOpenId(null); setTopcap(null); setPulseIds([]); setTick((t) => t + 1); };

  // ── Queries side ────────────────────────────────────────────────────────────────────────────────
  const qActive = queries.filter((q) => !q.removed);
  const qDead = queries.filter((q) => q.removed);
  const agentNameOf = (ref: string) => { const a = agents.find((x) => x.id === ref); return (a && (a.name || a.agency)) || "Unknown agent"; };
  const qOk = qActive.filter((q) => queryStatusOf(q) === "captured").length;
  const qNeed = qActive.length - qOk;
  // Mirror the Agents all-resolved gate: import only with ≥1 query AND nothing left to check. A
  // missing date is NOT a check reason, so "date needed" never blocks import.
  const canImport = qActive.length > 0 && qNeed === 0;

  const patchQuery = (id: string, p: Partial<ReviewQuery>) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, ...p } : q))); setTick((t) => t + 1); };
  const removeQuery = (id: string) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, removed: true, removedReason: "Removed by you" } : q))); setTick((t) => t + 1); };
  const resolveQueryMapping = (id: string) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, reasons: q.reasons.map((r) => (r.kind === "mapping" ? { ...r, resolved: true } : r)) } : q))); setTick((t) => t + 1); };
  const reopenQueryReason = (id: string, kind: CheckReason) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, reasons: q.reasons.map((r) => (r.kind === kind ? { ...r, resolved: false } : r)) } : q))); setTick((t) => t + 1); };

  const onImportClick = () => {
    if (!canImport) { pulseBlocked(qActive.filter((q) => queryStatusOf(q) !== "captured").map((q) => q.id)); return; }
    void onImport?.(modelToResult(result, agents, queries));
  };

  // One post-it per reason for the CURRENT screen (open = pink; resolved = struck sage). Sides
  // alternate per card; the layout pass de-collides each side. Same NoteSpec shape on both screens.
  const notes: NoteSpec[] = [];
  const notePairCards = new Map<string, Set<string>>();
  if (screen === "agents") {
    active.forEach((a, p) => {
      a.reasons.forEach((r, j) => {
        const noteId = `${a.id}:${r.kind}`;
        notes.push({ noteId, cardId: a.id, side: (p + j) % 2 === 0 ? "l" : "r", text: r.note, resolved: r.resolved, kind: r.kind, undoable: r.undoable, agencyBlocked: !a.agency.trim() });
        // A mapping note pairs to its own card; a duplicate note to the whole cluster (every member).
        notePairCards.set(noteId, r.kind === "duplicate" && a.mergeWith.length > 0
          ? new Set([a.id, ...a.mergeWith].filter((id) => active.some((x) => x.id === id)))
          : new Set([a.id]));
      });
    });
  } else {
    qActive.forEach((q, p) => {
      q.reasons.forEach((r, j) => {
        const noteId = `${q.id}:${r.kind}`;
        notes.push({ noteId, cardId: q.id, side: (p + j) % 2 === 0 ? "l" : "r", text: r.note, resolved: r.resolved, kind: r.kind, undoable: r.undoable, agencyBlocked: false });
        notePairCards.set(noteId, new Set([q.id]));
      });
    });
  }
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
  const renderCluster = (leader: ReviewAgent, members: ReviewAgent[]) => (
    <div key={`clu-${leader.id}`} style={{ position: "relative", background: "#fdf2ec", border: "1px solid #f0d6c9", borderRadius: 12, padding: "10px 9px 11px" }}>
      <div style={{ position: "relative", zIndex: 1, fontFamily: MONO, fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", color: "#b07a64", display: "flex", alignItems: "center", gap: 6, margin: "0 2px 8px" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d8a08c" }} />Looks like the same agent, imported more than once
      </div>
      <div style={{ position: "relative" }}>
        {members.map((m, i) => (
          <div key={m.id} style={{ position: "relative", zIndex: hl.cards.has(m.id) ? 20 : members.length - i, marginTop: i === 0 ? 0 : -9, marginLeft: i * 6, marginRight: i * 6 }}>
            {renderCard(m, true)}
          </div>
        ))}
      </div>
      <DupControl members={members} queryCount={queryCount} onRemove={removeDuplicate} onKeepBoth={() => keepBoth(leader.id)} />
    </div>
  );

  // Compose the cards column into render units (singles + duplicate clusters), preserving order.
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

  // Query cards (Queries screen) — one per surviving query.
  const queryCards = qActive.map((q) => (
    <QueryCard
      key={q.id}
      query={q}
      agentName={agentNameOf(q.agentRef)}
      open={openId === q.id}
      onToggleOpen={() => { setOpenId((cur) => (cur === q.id ? null : q.id)); setTick((t) => t + 1); }}
      onPatch={(p) => patchQuery(q.id, p)}
      onDelete={() => removeQuery(q.id)}
      cardRef={(el) => { cardEls.current[q.id] = el; }}
      highlighted={hl.cards.has(q.id)}
      onHoverPair={(on) => setHoverTarget(on ? { type: "card", id: q.id } : null)}
      compact={compact}
      pulse={pulseIds.includes(q.id)}
      onResolveReason={() => resolveQueryMapping(q.id)}
      onReopenReason={() => reopenQueryReason(q.id, "mapping")}
    />
  ));

  return (
    <div style={{ background: C.band, minHeight: "100%", paddingBottom: 8, overflowX: "hidden" }}>
      <style>{`@keyframes saImpPulse{0%{box-shadow:0 0 0 0 rgba(176,74,58,0.55)}70%{box-shadow:0 0 0 7px rgba(176,74,58,0)}100%{box-shadow:0 0 0 0 rgba(176,74,58,0)}}`}</style>
      {/* tabs — switch between the two screens (edits persist; shared model) */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "18px auto 0" }}>
        {(["agents", "queries"] as const).map((name) => {
          const on = screen === name;
          return (
            <button key={name} onClick={() => screen !== name && switchScreen(name)}
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.05em", padding: "6px 18px", borderRadius: 20, cursor: "pointer", background: on ? C.burgundy : "#fff", color: on ? "#fff" : C.muted, border: `1px solid ${on ? C.burgundy : "#e2d6c8"}` }}>
              {name === "agents" ? "Agents" : "Queries"}
            </button>
          );
        })}
      </div>
      {topcap && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A89A90", textAlign: "center", padding: "10px 0 6px" }}>{topcap}</div>}

      {/* compact-only hint banner (the rotated corner sticky can't fit the margins) */}
      {compact && (
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
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: "repeating-linear-gradient(transparent,transparent 28px,rgba(110,130,140,0.15) 28px,rgba(110,130,140,0.15) 29px)", WebkitMaskImage: "radial-gradient(ellipse 64% 78% at 50% 42%,#000 46%,transparent 100%)", maskImage: "radial-gradient(ellipse 64% 78% at 50% 42%,#000 46%,transparent 100%)" }} />
        <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: 64, width: 1, zIndex: 0, pointerEvents: "none", background: "#e6a99c", opacity: 0.35, WebkitMaskImage: "linear-gradient(#000 10%,#000 78%,transparent 100%)", maskImage: "linear-gradient(#000 10%,#000 78%,transparent 100%)" }} />

        {/* chrome */}
        <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "space-between", width: panelWidth, margin: "0 auto 10px" }}>
          <span style={{ display: "flex", gap: 5 }}>
            {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ width: i === 3 ? 18 : 5, height: 5, borderRadius: i === 3 ? 3 : "50%", background: i === 3 ? C.burgundy : "#cabfae" }} />)}
          </span>
          <span onClick={onSkip} style={{ fontFamily: MONO, fontSize: 10, color: C.muted, cursor: onSkip ? "pointer" : "default" }}>Skip setup</span>
        </div>

        {/* corner sticky hint — higher and further right, clear of the panel and the other notes */}
        {!compact && (
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
                  {screen === "agents"
                    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>}
                </div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6e58" }}>{screen === "agents" ? "Data captured" : "Queries allocated to agents"}</div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: C.head, lineHeight: 1.12 }}>{screen === "agents" ? "Populating your agent database" : "Database populated"}</div>
                  <div style={{ fontSize: 9.5, color: "#6a7e68", fontWeight: 300, fontStyle: "italic", marginTop: 2 }}>{screen === "agents" ? "Amend if you like, or continue on to queries…" : "Check and continue…"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                <span style={{ fontFamily: MONO, fontSize: 8.5, padding: "3px 8px", borderRadius: 14, background: "#fff", color: "#44563a" }}>{screen === "agents" ? okCount : qOk} captured</span>
                <span style={{ fontFamily: MONO, fontSize: 8.5, padding: "3px 8px", borderRadius: 14, background: C.noteFill, color: C.burgundy }}>{screen === "agents" ? needCount : qNeed} to check</span>
              </div>
            </div>

            {/* scrolling cards */}
            <div ref={midRef} style={{ maxHeight: "min(520px, 62vh)", overflowY: "auto", overflowX: "hidden", padding: "12px 12px 6px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
                {screen === "agents" ? units : queryCards}
              </div>
            </div>

            {/* gatebar — reflects the current screen's blocker */}
            {screen === "agents" ? (!allCaptured && (
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
            {screen === "agents" ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderTop: "0.5px solid rgba(124,58,42,0.16)" }}>
                <span onClick={onBack} style={{ fontFamily: MONO, fontSize: 10, color: "#9a8a72", cursor: "pointer" }}>‹ Back</span>
                <span onClick={reset} style={{ fontFamily: MONO, fontSize: 9, color: "#b6a89a", cursor: "pointer", letterSpacing: "0.03em" }}>Reset all changes</span>
                <button
                  onClick={onContinueClick}
                  aria-disabled={!allCaptured}
                  style={{ background: !allCaptured ? "#efe7df" : "#f5e2da", border: `1px solid ${!allCaptured ? "#e2d6c8" : "#e8c8bc"}`, color: !allCaptured ? "#b6a596" : C.burgundy, fontFamily: MONO, fontSize: 10.5, fontWeight: 500, letterSpacing: "0.07em", borderRadius: 10, padding: "10px 20px", cursor: !allCaptured ? "not-allowed" : "pointer", opacity: !allCaptured ? 0.6 : 1 }}
                >Continue →</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderTop: "0.5px solid rgba(124,58,42,0.16)" }}>
                <span onClick={() => switchScreen("agents")} style={{ fontFamily: MONO, fontSize: 10, color: "#9a8a72", cursor: "pointer" }}>‹ Back to agents</span>
                <span onClick={reset} style={{ fontFamily: MONO, fontSize: 9, color: "#b6a89a", cursor: "pointer", letterSpacing: "0.03em" }}>Reset all changes</span>
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
            onResolveMapping={screen === "agents" ? resolveMapping : resolveQueryMapping}
            onReopen={screen === "agents" ? reopenReason : reopenQueryReason}
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
    </div>
  );
};
