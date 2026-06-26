/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ReconcileCard — the duplicate-query "reconcile card". A purely presentational surface that asks the
 * writer to confirm two recorded rows are the SAME submission at two stages (collapse → keep one query,
 * harvest the other row's facts into its history) or, rarely, to keep them as two separate queries.
 *
 * Presentational only: it owns its own row-selection + split-note UI state, but performs NO model
 * mutation — every decision is reported via the callback props (onLooksRight / onSplit / onChange).
 * The parent owns the `resolved` flag; null = working state, set = sorted (post-decision) state.
 *
 * Reuses the canonical pieces, never re-draws them: <StatusDot> for every status glyph (the row dots,
 * the result line, the harvest line) and <MountPanel> for the parchment card shell. Colours/fonts are
 * inline (this surface never uses Tailwind), matched to the approved mockup
 * (scriptally-duplicate-query-resolution.html).
 */
import React, { useState } from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { MountPanel } from "../MountPanel";

// ── Palette (from the mockup :root) ──────────────────────────────────────────
const C = {
  burgundy: "#7c3a2a",
  burgundyDeep: "#6a3023",
  ink: "#3a1c14",
  sage: "#8a9e88",
  sageDark: "#5a6e58",
  sageLight: "#e9ede6",
  sageBorder: "#cdd9c8",
  pinkEdge: "#e8c8bc",
  muted: "#9a8c80",
  hairline: "#e7ddd2",
};
const FONT_SERIF = "'Playfair Display', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const FONT_HAND = "'Caveat', cursive";

export interface ReconcileCardRow {
  id: string; // query id (stable key)
  status: QueryStatus; // exact enum
  dateLabel: string; // pre-formatted, e.g. "1 May 2024" or "no date"
  note: string; // e.g. "asked for 50pp"; "" when the row has no note
}

export interface ReconcileCardProps {
  agentName: string; // headline: "Two rows for {agentName}"
  manuscriptTitle: string; // confirming context (per-row title + "manuscript" mono tag). If "", omit the title line.
  rows: ReconcileCardRow[]; // exactly two rows
  defaultKeptId: string; // engine-derived current row's id → pre-selected on mount
  resolved: { keptId: string; kind: "collapsed" | "split" } | null; // null = working; set = sorted
  onLooksRight: (keptId: string) => void; // user confirmed collapse, keeping this row
  onSplit: () => void; // keep both as separate queries (the rare split)
  onChange: () => void; // "↩ Change this" — revert from sorted back to working
}

/** Scoped, injected once: disables the working→sorted swap transition under reduced-motion. */
const RECONCILE_STYLE = `
  .reconcile-row { transition: background .18s; }
  .reconcile-btn-primary { transition: background .18s, transform .18s; }
  .reconcile-btn-primary:hover { background: ${C.burgundyDeep}; transform: translateY(-1px); }
  @media (prefers-reduced-motion: reduce) {
    .reconcile-row,
    .reconcile-btn-primary { transition: none !important; }
    .reconcile-btn-primary:hover { transform: none !important; }
  }
`;

export const ReconcileCard: React.FC<ReconcileCardProps> = ({
  agentName,
  manuscriptTitle,
  rows,
  defaultKeptId,
  resolved,
  onLooksRight,
  onSplit,
  onChange,
}) => {
  // Selection starts at the engine-derived current row; clicking a row re-selects (working state only).
  const [selectedId, setSelectedId] = useState<string>(defaultKeptId);
  const [splitOpen, setSplitOpen] = useState<boolean>(false);

  const hasTitle = manuscriptTitle.trim().length > 0;

  return (
    <MountPanel style={{ width: 580, maxWidth: "100%" }}>
      <style>{RECONCILE_STYLE}</style>
      {resolved === null
        ? renderWorking()
        : renderSorted(resolved)}
    </MountPanel>
  );

  // ── WORKING STATE ──────────────────────────────────────────────────────────
  function renderWorking() {
    const selected = rows.find((r) => r.id === selectedId) ?? rows[0];
    const other = rows.find((r) => r.id !== selected.id) ?? rows[1];

    return (
      <div>
        {/* Head */}
        <div style={{ padding: "24px 26px 6px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: FONT_MONO,
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9a6a4a",
              background: "#f4e3d9",
              border: "1px solid #eccdbe",
              borderRadius: 20,
              padding: "4px 11px",
              marginBottom: 14,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c98a63" }} />
            Possible repeat
          </span>
          <h1
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 700,
              fontSize: 24,
              lineHeight: 1.1,
              margin: "0 0 8px",
              color: C.ink,
            }}
          >
            Two rows for {agentName}
          </h1>
          <p style={{ fontFamily: FONT_SANS, fontSize: 14.5, lineHeight: 1.5, color: "#6b5b50", margin: 0, maxWidth: "48ch" }}>
            These look like the <b style={{ color: C.ink, fontWeight: 600 }}>same submission</b>, recorded at two stages —
            not two separate queries. We'll keep one query, and use the other row to fill in its history.
          </p>
        </div>

        {/* Rows group */}
        <div style={{ padding: "18px 26px 4px" }}>
          <div style={{ border: "1px solid #e6dccd", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
            {rows.map((row, i) => renderRow(row, i === rows.length - 1))}
          </div>
        </div>

        {/* Result line */}
        <div
          style={{
            margin: "16px 26px 4px",
            padding: "12px 15px",
            borderRadius: 11,
            background: "linear-gradient(180deg,#eef2ec,#e9ede6)",
            border: `1px solid ${C.sageBorder}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: FONT_SANS,
            fontSize: 13.5,
            color: C.sageDark,
          }}
        >
          <span style={{ fontFamily: FONT_MONO, color: C.sage }}>→</span>
          <StatusDot status={selected.status} overrideSize={20} />
          <span>
            One query, kept at <b style={{ color: "#46583f", fontWeight: 600 }}>{selected.status}</b>
          </span>
        </div>

        {/* Harvest panel */}
        <div
          style={{
            margin: "10px 26px 2px",
            padding: "13px 15px 14px",
            borderRadius: 11,
            background: "#fbf7f1",
            border: "1px solid #ece0d2",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#b08a5f",
              marginBottom: 9,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={13}
              height={13}
              fill="none"
              stroke="#b08a5f"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8v8M8 12h8" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            Kept from the discarded row
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: FONT_SANS, fontSize: 13.5, color: "#5f5046", padding: "3px 0" }}>
            <StatusDot status={other.status} overrideSize={20} />
            <span>
              <b style={{ color: C.ink, fontWeight: 600 }}>{other.status}</b>
            </span>
            {other.note && <span style={{ fontFamily: FONT_HAND, fontSize: 16, color: "#8a7868" }}>"{other.note}"</span>}
            <span style={{ color: C.muted, fontSize: 12.5 }}>· {other.dateLabel}</span>
          </div>
          <div style={{ marginTop: 9, fontFamily: FONT_SANS, fontSize: 12, color: C.muted, fontStyle: "italic" }}>
            Added to this query's history — you'll see it in the query's details.
          </div>
        </div>

        {/* Split */}
        <div style={{ padding: "12px 26px 2px" }}>
          <button
            type="button"
            onClick={() => setSplitOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: FONT_MONO,
              fontSize: 12,
              color: C.muted,
              padding: "6px 0",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.burgundy)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
          >
            These are actually different submissions ›
          </button>
          {splitOpen && (
            <div
              style={{
                marginTop: 8,
                padding: "13px 15px",
                borderRadius: 11,
                background: "#fbf4ee",
                border: `1px dashed ${C.pinkEdge}`,
                fontFamily: FONT_SANS,
                fontSize: 13,
                lineHeight: 1.5,
                color: "#6b5b50",
              }}
            >
              <b style={{ color: C.ink }}>Keep both as separate queries?</b>
              <br />
              Only if {agentName} is genuinely handling two different manuscripts for you. The same manuscript twice is
              almost always one submission — so this is rare.
              <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={onSplit}
                  style={{
                    fontFamily: FONT_MONO,
                    fontWeight: 600,
                    fontSize: 13.5,
                    color: "#fff",
                    background: C.sageDark,
                    border: "1px solid #46583f",
                    padding: "12px 22px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  Keep both
                </button>
                <button
                  type="button"
                  onClick={() => setSplitOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    color: C.muted,
                    padding: "6px 0",
                  }}
                >
                  Never mind
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Foot */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "18px 26px 24px" }}>
          <button
            type="button"
            className="reconcile-btn-primary"
            onClick={() => onLooksRight(selected.id)}
            style={{
              fontFamily: FONT_MONO,
              fontWeight: 600,
              fontSize: 13.5,
              color: "#fff",
              background: C.burgundy,
              border: `1px solid ${C.burgundyDeep}`,
              padding: "12px 22px",
              borderRadius: 10,
              cursor: "pointer",
              boxShadow: "0 6px 13px -6px rgba(124,58,42,.6)",
            }}
          >
            Looks right →
          </button>
        </div>
      </div>
    );
  }

  function renderRow(row: ReconcileCardRow, isLast: boolean) {
    const isSelected = row.id === selectedId;
    const isLatest = row.id === defaultKeptId;
    return (
      <div
        key={row.id}
        className="reconcile-row"
        onClick={() => setSelectedId(row.id)}
        style={{
          position: "relative",
          display: "flex",
          gap: 13,
          padding: "15px 16px 15px 15px",
          cursor: "pointer",
          borderBottom: isLast ? "none" : "1px solid #efe7da",
          background: isSelected ? "#fdf4ee" : "transparent",
          opacity: isSelected ? 1 : 0.66,
        }}
      >
        {/* Burgundy left bar on the selected row */}
        {isSelected && (
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: C.burgundy }} />
        )}
        {/* Radio */}
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: `1.6px solid ${isSelected ? C.burgundy : "#c9b8a8"}`,
            flex: "none",
            marginTop: 2,
            display: "grid",
            placeItems: "center",
          }}
        >
          {isSelected && <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.burgundy }} />}
        </span>
        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {hasTitle && (
            <p style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: C.ink, margin: "0 0 5px", display: "flex", alignItems: "center", gap: 8 }}>
              {manuscriptTitle}
              <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.05em", color: "#b6a596", textTransform: "uppercase" }}>
                manuscript
              </span>
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_SANS, fontSize: 13, color: "#5f5046" }}>
            <StatusDot status={row.status} overrideSize={20} />
            <span>{row.status}</span>
            <span style={{ color: "#9a8c80" }}>· {row.dateLabel}</span>
          </div>
          {row.note && <p style={{ fontFamily: FONT_HAND, fontSize: 16, color: "#8a7868", margin: "5px 0 0" }}>"{row.note}"</p>}
        </div>
        {/* Right chips */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {isLatest && (
            <span style={{ ...chipBase, color: C.sageDark, background: C.sageLight, border: `1px solid ${C.sageBorder}` }}>
              most recent
            </span>
          )}
          {isSelected ? (
            <span style={{ ...chipBase, color: "#fff", background: C.burgundy }}>kept</span>
          ) : (
            <span style={{ ...chipBase, color: "#9a8478", background: "#f1ece4", border: "1px solid #e6dccd" }}>discard</span>
          )}
        </div>
      </div>
    );
  }

  // ── SORTED STATE ───────────────────────────────────────────────────────────
  function renderSorted(res: { keptId: string; kind: "collapsed" | "split" }) {
    const kept = rows.find((r) => r.id === res.keptId) ?? rows[0];
    const other = rows.find((r) => r.id !== kept.id) ?? rows[1];

    const message =
      res.kind === "split" ? (
        <>
          <b style={{ fontWeight: 600 }}>{agentName}</b> — kept as <b style={{ fontWeight: 600 }}>two separate queries</b>.
        </>
      ) : (
        <>
          <b style={{ fontWeight: 600 }}>{agentName}</b> — kept as one query at{" "}
          <b style={{ fontWeight: 600 }}>{kept.status}</b>. We discarded the duplicate row, but saved{" "}
          <b style={{ fontWeight: 600 }}>
            {other.status.toLowerCase()}
            {other.note ? ` · "${other.note}"` : ""}
          </b>{" "}
          to the query's history.
        </>
      );

    return (
      <div style={{ padding: "22px 26px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "15px 17px",
            borderRadius: 12,
            background: "linear-gradient(180deg,#eef2ec,#e7ece4)",
            border: `1px solid ${C.sageBorder}`,
          }}
        >
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.sage, display: "grid", placeItems: "center", flex: "none", marginTop: 1 }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div style={{ flex: 1, fontFamily: FONT_SANS, fontSize: 14, lineHeight: 1.55, color: "#46583f" }}>
            <span>{message}</span>
            <br />
            <button
              type="button"
              onClick={onChange}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: C.sageDark,
                textDecoration: "underline",
                textUnderlineOffset: 3,
                padding: "4px 0",
                marginTop: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.burgundy)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.sageDark)}
            >
              ↩ Change this
            </button>
          </div>
        </div>
      </div>
    );
  }
};

const chipBase: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "3px 8px",
  borderRadius: 11,
  whiteSpace: "nowrap",
};

/**
 * DEV-only preview wrapper for #/reconcile-card. Holds the local `resolved` state and renders the card
 * with Priya fixture data, centred on the cream ground so it previews like the mockup. Not used in prod.
 */
export const ReconcileCardDevPreview: React.FC = () => {
  const defaultKeptId = "q2"; // engine-derived current — the Partial Sent row
  const [resolved, setResolved] = useState<{ keptId: string; kind: "collapsed" | "split" } | null>(null);

  const rows: ReconcileCardRow[] = [
    { id: "q1", status: QueryStatus.PARTIAL_REQUESTED, dateLabel: "no date", note: "asked for 50pp" },
    { id: "q2", status: QueryStatus.PARTIAL_SENT, dateLabel: "1 May 2024", note: "sent the partial" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f2ede7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "46px 16px",
      }}
    >
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.2em", color: C.muted, textTransform: "uppercase" }}>
        Duplicates · 1 of 1
      </div>
      <ReconcileCard
        agentName="Priya Raman"
        manuscriptTitle="Glasshouse Girls"
        rows={rows}
        defaultKeptId={defaultKeptId}
        resolved={resolved}
        onLooksRight={(keptId) => setResolved({ keptId, kind: "collapsed" })}
        onSplit={() => setResolved({ keptId: defaultKeptId, kind: "split" })}
        onChange={() => setResolved(null)}
      />
    </div>
  );
};
