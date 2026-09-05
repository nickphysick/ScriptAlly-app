/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryPanel — the detail slide-over. One query, over the grid it came from.
 *
 * ⚠️ IT DERIVES NOTHING. Every figure arrives as `facts` (from `cardFacts`) or as an explicit prop;
 * the rungs arrive already built. A panel that re-derived a date or a status would be a second
 * answer to a question the card behind it has already answered, and the two would drift.
 *
 * ⚠️ THE BAND IS THE CARD'S OWN LADDER TOKEN. The root carries `qcc--s-{stage}` — the same class
 * the card wears — so `--band-a` resolves to the same value on both. This is the surface
 * `query-tint-ladder.md` names third and pass 2 measured as painting no ladder token at all.
 *
 * ⚠️ ACTIONS CALL OUT, THEY DO NOT IMPLEMENT. Record response, Mark sent, Record decision, Nudge,
 * Mark closed, the correction fork — all of them are surfaces that already exist. This file knows
 * which one to ask for and nothing about what any of them does.
 */
import React, { useEffect, useRef, useState } from "react";
import "./queryCard.css";
import "./queryPanel.css";
import { StatusDot } from "../StatusDot";
import type { CardFacts } from "../../lib/queryCardFacts";
import type { QueryStatus } from "../../types";

/**
 * ⚠️ THE TAB PERSISTS PER SESSION, NOT PER QUERY AND NOT PER ACCOUNT. A reader stepping ←/→
 * through queries on the Agent tab is comparing agents; snapping each new query back to Tracking
 * would undo the comparison on every step. sessionStorage, not localStorage — "last used" is a
 * fact about this sitting, and next week's visit starts at Tracking like the brief says.
 */
export type PanelTab = "tracking" | "agent" | "notes";
const TAB_KEY = "sa.qpnTab";
const readTab = (): PanelTab => {
  try {
    const v = sessionStorage.getItem(TAB_KEY);
    return v === "agent" || v === "notes" ? v : "tracking";
  } catch { return "tracking"; }
};


export interface QueryPanelProps {
  open: boolean;
  facts: CardFacts;
  status: QueryStatus;
  name: string;
  agency: string;
  initials: string;
  sentLabel: string;
  viaLabel: string;
  manuscriptTitle?: string | null;
  /** Mono `{genre} · {words} words`, beside the title on the header's manuscript line. */
  manuscriptMeta?: string | null;
  /**
   * `Version 2 · Mar 2026`, right-aligned on the manuscript line — ONLY when the query records a
   * sent version (manuscriptHeld, falling back to the package's opening read). Absent = omitted:
   * a version label on a query that never named one would state a fact nobody recorded.
   */
  versionLabel?: string | null;
  /** `3 OF 44` — position in the CURRENT filtered/sorted order. */
  position: { index: number; total: number } | null;
  primaryLabel: string;
  onPrimary?: () => void;
  onNudge?: () => void;
  onMarkClosed?: () => void;
  onClose: () => void;
  onStep: (delta: 1 | -1) => void;
  /** The two trays: elapsed, and the expected reply. */
  elapsed: { value: string; unit: string; caption: string };
  expectedLabel: string;
  /**
   * ⚠️ THE TABS' BODIES ARRIVE AS NODES, BUILT BY THE PAGE. The Tracking tab is the shared
   * QueryTimeline with the page's own correction/nudge/record wiring; building it in here would
   * mean threading fifteen handlers through this component to a renderer that already exists.
   * The drawer owns WHICH tab shows and nothing about what any tab does.
   */
  tracking: React.ReactNode;
  agentTab?: React.ReactNode;
  notesTab?: React.ReactNode;
  noteCount: number;
}

const Icon: React.FC<{ d: string; size?: number; stroke?: string; width?: number }> = ({ d, size = 13, stroke = "currentColor", width = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const QueryPanel: React.FC<QueryPanelProps> = ({
  open, facts, status, name, agency, initials, sentLabel, viaLabel,
  manuscriptTitle, manuscriptMeta, versionLabel,
  position, primaryLabel, onPrimary, onNudge, onMarkClosed, onClose, onStep,
  elapsed, expectedLabel, tracking, agentTab, notesTab, noteCount,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<PanelTab>(readTab);
  const pickTab = (t: PanelTab) => {
    setTab(t);
    try { sessionStorage.setItem(TAB_KEY, t); } catch { /* private windows: the default is fine */ }
  };

  /**
   * ⚠️ ESCAPE AND THE ARROWS ARE BOUND WHILE OPEN AND ONLY WHILE OPEN, and both skip an editable.
   * The panel sits over a page that owns its own keys; a listener that outlived the open state
   * would swallow Escape for whatever the reader opened next.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      if (typing) return;
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); onStep(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); onStep(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onStep]);

  const stepper = (delta: 1 | -1, d: string, label: string) => (
    <button type="button" className="qpn-icb" aria-label={label}
      disabled={!position || position.total < 2} onClick={() => onStep(delta)}>
      <Icon d={d} size={14} width={2.2} />
    </button>
  );

  return (
    <>
      {/* the scrim is a button so a pointer AND a keyboard can dismiss it */}
      <button type="button" className="qpn-scrim" data-on={open} aria-label="Close query" tabIndex={-1} onClick={onClose} />
      <aside
        ref={panelRef}
        /* ⚠️ THE LADDER CLASS IS THE CARD'S — same class, same `--band-a`, so the two cannot
           disagree about the colour of one query. */
        className={`qpn qcc--s-${facts.stage}`}
        data-on={open}
        data-qpn-stage={facts.stage}
        aria-hidden={!open}
        aria-label={`${name}, ${agency}`}
      >
        <div className="qpn-bar">
          {stepper(-1, "M15 6l-6 6 6 6", "Previous query")}
          {stepper(1, "M9 6l6 6-6 6", "Next query")}
          {position && <span className="qpn-pos">{position.index + 1} of {position.total}</span>}
          <span className="qpn-spacer" />
          {onPrimary && (
            <button type="button" className="qpn-act qpn-act--pink" onClick={onPrimary}>{primaryLabel}</button>
          )}
          {/* ⚠️ NUDGE IS AGENT-SIDE ONLY. There is nobody to chase about a parcel you have not sent. */}
          {onNudge && (facts.turn === "sand" || facts.turn === "agent") && (
            <button type="button" className="qpn-act" onClick={onNudge}>Nudge</button>
          )}
          {onMarkClosed && facts.turn !== "closed" && (
            <button type="button" className="qpn-act" onClick={onMarkClosed}>Mark closed</button>
          )}
          <button type="button" className="qpn-icb" aria-label="Close" onClick={onClose}>
            <Icon d="M18 6L6 18M6 6l12 12" size={14} width={2.2} />
          </button>
        </div>

        <div className="qpn-inner">
          <div className="qpn-band">
            <StatusDot status={status} overrideSize={28} />
            <span className="qpn-word">{status}</span>
            <span className="qpn-turn">{facts.turnWord}</span>
          </div>

          <div className="qpn-head">
            <span className="qpn-avatar" aria-hidden="true">{initials}</span>
            <div className="qpn-headtx">
              <div className="qpn-nm">{name}</div>
              <div className="qpn-ag">{agency}</div>
            </div>
            <div className="qpn-snt">Sent {sentLabel}<br />via {viaLabel}</div>
          </div>

          {/**
            * ⚠️ THE MANUSCRIPT LINE LIVES IN THE HEADER, ONCE. It used to sit inside the Tracking
            * section, which made it a fact about the timeline rather than about the query — and it
            * vanished with the tab. Here it is true on every tab, and the assertion that the title
            * appears EXACTLY once in the drawer is what keeps a second copy from creeping back.
            */}
          {manuscriptTitle && (
            <div className="qpn-ms">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth="1.8" aria-hidden="true"><path d="M4 19V5a2 2 0 012-2h13v18H6a2 2 0 01-2-2zm0 0a2 2 0 012-2h13" /></svg>
              <span className="qpn-mst">{manuscriptTitle}</span>
              {manuscriptMeta && <span className="qpn-msm">{manuscriptMeta}</span>}
              {versionLabel && <span className="qpn-msv">{versionLabel}</span>}
            </div>
          )}

          <div className="qpn-tabs" role="tablist" aria-label="Query detail">
            {(["tracking", "agent", "notes"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`qpn-tab${tab === t ? " qpn-tab--on" : ""}`}
                onClick={() => pickTab(t)}
              >
                {t === "tracking" ? "Tracking" : t === "agent" ? "Agent" : "Notes"}
                {/* the count pill omits itself at zero — "0 notes" is a sentence about nothing */}
                {t === "notes" && noteCount > 0 && <span className="qpn-tabn">{noteCount}</span>}
              </button>
            ))}
          </div>

          <div className="qpn-body">
            {tab === "tracking" && (
              <>
                <div className="qpn-stats">
                  <div className="qpn-stat">
                    <Icon d="M12 7v5l3 2" stroke="#8a9e88" width={1.8} size={15} />
                    <div>
                      <div className="qpn-big">{elapsed.value}<span>{elapsed.unit}</span></div>
                      <div className="qpn-cap">{elapsed.caption}</div>
                    </div>
                  </div>
                  <div className="qpn-stat">
                    <Icon d="M3 9h18M8 3v4M16 3v4" stroke="#c98f78" width={1.8} size={15} />
                    <div>
                      <div className="qpn-big">{expectedLabel}</div>
                      <div className="qpn-cap">reply expected by</div>
                    </div>
                  </div>
                </div>
                {/* ⚠️ STRAIGHT ON PARCHMENT — no frame, no band. The timeline is the tab. */}
                <div className="qpn-track">{tracking}</div>
                <div className="qpn-hint">← → move between queries · esc closes</div>
              </>
            )}
            {tab === "agent" && <div className="qpn-agent">{agentTab}</div>}
            {tab === "notes" && <div className="qpn-notes">{notesTab}</div>}
          </div>
        </div>
      </aside>
    </>
  );
};
