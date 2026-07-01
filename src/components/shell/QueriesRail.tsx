/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueriesRail — the live Queries filter/sort UI for the SidebarShell rail: a manuscript selector, a
 * Filter section (All active + the present active statuses with StatusDots + counts), a collapsed
 * "All closed (n)" group, and a single Sort dropdown. Sized to fit one screen with no scroll.
 *
 * Presentational + wired: it owns no filter STATE — the Queries page passes its existing state and
 * setters (selectedStatusFilters / selectedManuscriptFilter / sortOption) so the rail and the desk
 * stay in lock-step. Status filter ids are the exact QueryStatus enum strings (never camelCase).
 */
import React, { useState } from "react";
import { Book, ChevronDown, ChevronRight } from "lucide-react";
import { Query, Manuscript, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { FONT_MONO, FONT_SANS, burgundy, bodyInk } from "../../lib/designTokens";
import { pinkHover, sageDark, mutedShell, inkShell } from "./shellTokens";

const ACTIVE: { id: QueryStatus; label: string }[] = [
  { id: QueryStatus.QUERIED, label: "Queried" },
  { id: QueryStatus.PARTIAL_REQUESTED, label: "Partial req" },
  { id: QueryStatus.PARTIAL_SENT, label: "Partial sent" },
  { id: QueryStatus.FULL_REQUESTED, label: "Full req" },
  { id: QueryStatus.FULL_SENT, label: "Full sent" },
  { id: QueryStatus.REVISE_RESUBMIT, label: "R&R" },
  { id: QueryStatus.OFFER, label: "Offers" },
];
const CLOSED: { id: QueryStatus; label: string }[] = [
  { id: QueryStatus.REJECTED, label: "Rejected" },
  { id: QueryStatus.WITHDRAWN, label: "Withdrawn" },
  { id: QueryStatus.NO_RESPONSE, label: "No response" },
];

/** Sort dropdown options — mapped to the Queries page's existing sortOption strings. */
const SORT_OPTIONS = ["Newest first", "Oldest first", "Agent name A-Z", "Agent name Z-A"];

interface QueriesRailProps {
  queries: Query[];
  manuscripts: Manuscript[];
  selectedStatusFilters: string[];
  setSelectedStatusFilters: (f: string[]) => void;
  selectedManuscriptFilter: string;
  setSelectedManuscriptFilter: (id: string) => void;
  sortOption: string;
  setSortOption: (s: string) => void;
}

const secLabel: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: mutedShell,
  padding: "0 8px 7px",
};

export const QueriesRail: React.FC<QueriesRailProps> = ({
  queries,
  manuscripts,
  selectedStatusFilters: sel,
  setSelectedStatusFilters: setSel,
  selectedManuscriptFilter,
  setSelectedManuscriptFilter,
  sortOption,
  setSortOption,
}) => {
  const [showClosed, setShowClosed] = useState(false);

  const countOf = (s: QueryStatus) => queries.filter((q) => q.status === s).length;
  const nonZeroActive = ACTIVE.filter((a) => queries.some((q) => q.status === a.id));
  const nonZeroClosed = CLOSED.filter((c) => queries.some((q) => q.status === c.id));
  const activeIds = nonZeroActive.map((a) => a.id);
  const closedIds = nonZeroClosed.map((c) => c.id);
  const sumOf = (ids: QueryStatus[]) => ids.reduce((acc, s) => acc + countOf(s), 0);

  const allActiveOn = activeIds.length > 0 && !sel.includes("All") && activeIds.every((s) => sel.includes(s)) && !CLOSED.some((c) => sel.includes(c.id));
  const allClosedOn = closedIds.length > 0 && !sel.includes("All") && closedIds.every((s) => sel.includes(s)) && !ACTIVE.some((a) => sel.includes(a.id));

  const toggle = (id: QueryStatus) => {
    let next = sel.filter((f) => f !== "All");
    if (next.includes(id)) next = next.filter((f) => f !== id);
    else next = [...next, id];
    setSel(next.length === 0 ? ["All"] : next);
  };

  const frow = (on: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "6px 9px",
    borderRadius: 9,
    // Bold: active filter = white with a heavy ink border; inactive keeps a transparent border
    // of equal width so the row doesn't shift between states.
    border: on ? "1.5px solid #1d1712" : "1.5px solid transparent",
    cursor: "pointer",
    fontFamily: FONT_SANS,
    fontSize: 12.5,
    fontWeight: on ? 600 : 500,
    color: on ? inkShell : bodyInk,
    background: on ? "#ffffff" : "transparent",
    transition: "background 0.13s",
    textAlign: "left",
  });
  const countStyle = (on: boolean): React.CSSProperties => ({ fontFamily: FONT_MONO, fontSize: 10, color: on ? sageDark : mutedShell });
  const hoverIn = (e: React.MouseEvent<HTMLButtonElement>, on: boolean) => { if (!on) e.currentTarget.style.background = pinkHover; };
  const hoverOut = (e: React.MouseEvent<HTMLButtonElement>, on: boolean) => { if (!on) e.currentTarget.style.background = "transparent"; };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Manuscript selector */}
      {manuscripts.length > 1 ? (
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Book style={{ width: 15, height: 15, color: burgundy, position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <select
            value={selectedManuscriptFilter}
            onChange={(e) => setSelectedManuscriptFilter(e.target.value)}
            style={{
              width: "100%",
              fontFamily: FONT_SANS,
              fontSize: 12.5,
              fontWeight: 500,
              color: bodyInk,
              background: "#ffffff",
              border: "1.5px solid #1d1712",
              borderRadius: 9,
              padding: "9px 30px 9px 33px",
              cursor: "pointer",
              appearance: "none",
            }}
          >
            <option value="All">All manuscripts ({queries.length})</option>
            {manuscripts.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({queries.filter((q) => q.manuscriptId === m.id).length})
              </option>
            ))}
          </select>
          <ChevronDown style={{ width: 13, height: 13, color: mutedShell, position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: FONT_SANS, fontSize: 12.5, color: bodyInk, background: "#ffffff", border: "1.5px solid #1d1712", borderRadius: 9, padding: "9px 11px", marginBottom: 14 }}>
          <Book style={{ width: 15, height: 15, color: burgundy, flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: 500 }}>{manuscripts.length === 1 ? manuscripts[0].title : "All manuscripts"}</span>
        </div>
      )}

      {/* Filter */}
      <div style={secLabel}>Filter</div>

      {queries.length === 0 ? (
        /* Empty database — nothing to filter or sort yet; keep the manuscript selector above. */
        <div style={{ padding: "2px 9px", fontFamily: FONT_SANS, fontSize: 12.5, fontStyle: "italic", color: "#b3a796" }}>Nothing to filter yet</div>
      ) : (
      <>
      {nonZeroActive.length > 0 && (
        <button
          type="button"
          style={frow(allActiveOn)}
          onClick={() => { setSel(allActiveOn ? ["All"] : activeIds); setSelectedManuscriptFilter("All"); }}
          onMouseEnter={(e) => hoverIn(e, allActiveOn)}
          onMouseLeave={(e) => hoverOut(e, allActiveOn)}
        >
          <span>All active</span>
          <span style={countStyle(allActiveOn)}>{sumOf(activeIds)}</span>
        </button>
      )}
      {nonZeroActive.map((a) => {
        const on = sel.includes(a.id);
        return (
          <button key={a.id} type="button" style={frow(on)} onClick={() => toggle(a.id)} onMouseEnter={(e) => hoverIn(e, on)} onMouseLeave={(e) => hoverOut(e, on)}>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <StatusDot status={a.id} overrideSize={13} />
              {a.label}
            </span>
            <span style={countStyle(on)}>{countOf(a.id)}</span>
          </button>
        );
      })}

      {/* All closed — collapsible */}
      {nonZeroClosed.length > 0 && (
        <>
          <button
            type="button"
            style={{ ...frow(allClosedOn), marginTop: nonZeroActive.length > 0 ? 2 : 0 }}
            onClick={() => setShowClosed((v) => !v)}
            onMouseEnter={(e) => hoverIn(e, allClosedOn)}
            onMouseLeave={(e) => hoverOut(e, allClosedOn)}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid #c5b9ab", background: "#eee7dd", flexShrink: 0 }} />
              All closed
              <span style={countStyle(allClosedOn)}>{sumOf(closedIds)}</span>
            </span>
            <ChevronRight style={{ width: 13, height: 13, color: mutedShell, transform: showClosed ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {showClosed && (
            <div style={{ paddingLeft: 6 }}>
              {nonZeroClosed.map((c) => {
                const on = sel.includes(c.id);
                return (
                  <button key={c.id} type="button" style={frow(on)} onClick={() => toggle(c.id)} onMouseEnter={(e) => hoverIn(e, on)} onMouseLeave={(e) => hoverOut(e, on)}>
                    <span>{c.label}</span>
                    <span style={countStyle(on)}>{countOf(c.id)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Sort */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: mutedShell }}>Sort</span>
        <div style={{ position: "relative", flex: 1 }}>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{
              width: "100%",
              fontFamily: FONT_SANS,
              fontSize: 12,
              color: bodyInk,
              background: "#ffffff",
              border: "1.5px solid #1d1712",
              borderRadius: 8,
              padding: "7px 28px 7px 10px",
              cursor: "pointer",
              appearance: "none",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <ChevronDown style={{ width: 12, height: 12, color: mutedShell, position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        </div>
      </div>
      </>
      )}
    </div>
  );
};
