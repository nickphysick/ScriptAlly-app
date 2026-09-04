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
import React, { useEffect, useRef } from "react";
import "./queryCard.css";
import "./queryPanel.css";
import { StatusDot } from "../StatusDot";
import { MATERIAL_ROW_NAMES, type MaterialKind } from "../../lib/agentMaterials";
import { MATERIAL_SLOTS, type CardFacts } from "../../lib/queryCardFacts";
import type { QueryStatus } from "../../types";

export interface PanelRung {
  /** Stable id — the activity's, where there is one. `null` for the derived waiting rung. */
  id: string | null;
  status: QueryStatus;
  /** `Query sent`, `Full Requested`, `Closed`… */
  event: string;
  /** `· Email`, `— Pass after full`. Rendered muted beside the event. */
  detail?: string;
  dateLabel: string;
  /** Dotted-underline editors. Absent = not editable in place. */
  onEditDetail?: () => void;
  onEditDate?: () => void;
  /** The ⋯ menu. Absent on a rung that records nothing (the waiting rung). */
  onMenu?: (anchor: HTMLElement) => void;
  /** The waiting rung's dashed treatment and its bar. */
  pending?: boolean;
  progress?: { pct: number; past: boolean; sentLabel: string; expectedLabel: string; onEditExpected?: (anchor: HTMLElement) => void };
}

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
  /** `3 OF 44` — position in the CURRENT filtered/sorted order. */
  position: { index: number; total: number } | null;
  primaryLabel: string;
  onPrimary?: () => void;
  onNudge?: () => void;
  onMarkClosed?: () => void;
  onClose: () => void;
  onStep: (delta: 1 | -1) => void;
  rungs: PanelRung[];
  /** The two trays: elapsed, and the expected reply. */
  elapsed: { value: string; unit: string; caption: string };
  expectedLabel: string;
  /** `null` where nothing has been recorded — the dashed prompt shows instead. */
  materialsRecorded: boolean;
  onListMaterials?: () => void;
  onAttachPackage?: () => void;
  onEditMaterials?: () => void;
  /** The section's Edit toggle, swapping the read rows for the four toggle rows. */
  matsEditing?: boolean;
  onToggleMaterial?: (kind: MaterialKind) => void;
  notes?: React.ReactNode;
  noteCount: number;
}

const Icon: React.FC<{ d: string; size?: number; stroke?: string; width?: number }> = ({ d, size = 13, stroke = "currentColor", width = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const QueryPanel: React.FC<QueryPanelProps> = ({
  open, facts, status, name, agency, initials, sentLabel, viaLabel, manuscriptTitle,
  position, primaryLabel, onPrimary, onNudge, onMarkClosed, onClose, onStep, rungs,
  elapsed, expectedLabel, materialsRecorded, onListMaterials, onAttachPackage, onEditMaterials,
  matsEditing = false, onToggleMaterial,
  notes, noteCount,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

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

          {/* ══ Tracking ══ */}
          <section className="qpn-sect">
            <div className="qpn-frame">
              <div className="qpn-sband">
                <Icon d="M2 12h4l3-8 4 16 3-8h6" stroke="#5a6e58" />
                <span className="qpn-ttl">Tracking</span>
                <span className="qpn-tag">{status}</span>
              </div>
              <div className="qpn-sbody">
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

                {manuscriptTitle && (
                  <div className="qpn-msline">
                    <Icon d="M4 19V5a2 2 0 012-2h13v18H6a2 2 0 01-2-2zm0 0a2 2 0 012-2h13" stroke="#7c3a2a" width={1.8} />
                    {manuscriptTitle}
                  </div>
                )}

                <div className="qpn-rail">
                  {rungs.map((r, i) => (
                    <div className="qpn-rung" key={r.id ?? `derived-${i}`}>
                      <span className="qpn-node"><StatusDot status={r.status} overrideSize={20} /></span>
                      <div className={`qpn-rcard${r.pending ? " qpn-rcard--pend" : ""}`}>
                        <div className="qpn-rline">
                          <span className="qpn-ev" style={r.pending ? { fontStyle: "italic" } : undefined}>{r.event}</span>
                          {r.detail && (r.onEditDetail
                            ? <button type="button" className="qpn-via qpn-ed" onClick={r.onEditDetail} title="Change how it was sent">{r.detail}</button>
                            : <span className="qpn-via">{r.detail}</span>)}
                          {r.onEditDate
                            ? <button type="button" className="qpn-when qpn-ed" onClick={r.onEditDate} title="Change the date">{r.dateLabel}</button>
                            : <span className="qpn-when">{r.dateLabel}</span>}
                        </div>

                        {/* the dashed prompt, on the send rung, when nothing is recorded */}
                        {i === 0 && !materialsRecorded && (
                          <div className="qpn-whatwent">
                            What went with this query?
                            {onAttachPackage && <button type="button" className="qpn-b qpn-b--slate" onClick={onAttachPackage}>Attach a package</button>}
                            {onListMaterials && <button type="button" className="qpn-b" onClick={onListMaterials}>List materials</button>}
                          </div>
                        )}

                        {r.progress && (
                          <div className="qpn-prog">
                            <div className="qpn-progbar">
                              <i className={r.progress.past ? "qpn-past" : undefined} style={{ width: `${r.progress.pct}%` }} />
                            </div>
                            <div className="qpn-lbl">
                              <span>{r.progress.sentLabel}</span>
                              {r.progress.onEditExpected
                                ? <button type="button" className="qpn-ed" title="Change the expected date"
                                    onClick={(e) => r.progress!.onEditExpected!(e.currentTarget)}>{r.progress.expectedLabel}</button>
                                : <span>{r.progress.expectedLabel}</span>}
                            </div>
                          </div>
                        )}

                        {r.onMenu && (
                          <button type="button" className="qpn-more" title="Correct or delete"
                            aria-label={`Correct or delete: ${r.event}`}
                            onClick={(e) => r.onMenu!(e.currentTarget)}>⋯</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ══ What went with this query ══ */}
          <section className="qpn-sect">
            <div className="qpn-frame">
              <div className="qpn-sband">
                <Icon d="M21 12l-8.5 8.5a5 5 0 01-7-7L14 5a3.3 3.3 0 014.7 4.7L10.5 18a1.7 1.7 0 01-2.4-2.4L15 8.5" stroke="#5a6e58" />
                <span className="qpn-ttl">What went with this query</span>
                {onEditMaterials && (
                  <button type="button" className="qpn-edit" onClick={onEditMaterials}>
                    {matsEditing ? "Done" : "Edit"}
                  </button>
                )}
                <span className="qpn-tag">
                  {MATERIAL_SLOTS.filter((k) => facts.materials[k]).length} of {MATERIAL_SLOTS.length}
                </span>
              </div>
              <div className="qpn-sbody">
                {/**
                  * ⚠️ THE SAME FOUR ROWS IN BOTH STATES, one tick apart. The read view and the edit
                  * view are the same list — a separate editor would be a second place the four
                  * slots are named, and this repo has an audit about exactly that.
                  */}
                {MATERIAL_SLOTS.map((k) => {
                  const on = !!facts.materials[k];
                  if (!matsEditing) {
                    return (
                      <div key={k} className={`qpn-row${on ? "" : " qpn-row--no"}`}>
                        <span>{MATERIAL_ROW_NAMES[k]}</span>
                        <span className="qpn-v">{facts.materials[k] ?? "—"}</span>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`qpn-doc${on ? " qpn-doc--on" : ""}`}
                      aria-pressed={on}
                      onClick={() => onToggleMaterial?.(k)}
                    >
                      <span className="qpn-cb" aria-hidden="true">
                        {on && <Icon d="M4 12l5 5L20 7" size={10} stroke="#fdfaf5" width={3.4} />}
                      </span>
                      <span className="qpn-docnm">{MATERIAL_ROW_NAMES[k]}</span>
                      <span className="qpn-v">{facts.materials[k] ?? "Not sent"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ══ Notes ══ */}
          <section className="qpn-sect">
            <div className="qpn-frame">
              <div className="qpn-sband">
                <Icon d="M8 8h8M8 12h8M8 16h5" stroke="#5a6e58" />
                <span className="qpn-ttl">Notes</span>
                <span className="qpn-tag">{noteCount === 1 ? "1 note" : `${noteCount} notes`}</span>
              </div>
              <div className="qpn-sbody">
                {notes ?? <div className="qpn-nempty">Nothing noted yet for this query.</div>}
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
