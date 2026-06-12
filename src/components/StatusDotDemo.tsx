/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatusDotDemo — dev review surface + living documentation for the canonical StatusDot.
 * Reached via the #/status-dots hash (no router in this app). Renders the full status table
 * at every vetted size and a legend driven by STATUS_DOT_LEGEND mapping over the REAL
 * component — keys must never redraw approximations.
 */
import React from "react";
import { QueryStatus } from "../types";
import { StatusDot, STATUS_DOT_LEGEND } from "./StatusDot";
import { getStatusDescription } from "./StatusPill";

const SIZES = [12, 13, 16, 20, 28];

const FONT_SERIF = "'Playfair Display', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Fira Mono', monospace";

const lblStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: "0.17em",
  textTransform: "uppercase",
  color: "#9c8878",
  fontWeight: 500,
};

export const StatusDotDemo: React.FC = () => {
  const allStatuses = Object.values(QueryStatus);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,250,242,0.45) 0%, transparent 55%), #E0D4C4",
        padding: "44px 24px 90px",
        fontFamily: FONT_SANS,
        color: "#3a1c14",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ width: "100%", maxWidth: 720 }}>
        <div style={{ ...lblStyle, color: "#7c3a2a", marginBottom: 12 }}>
          StatusDot — canonical status system · dev review surface
        </div>
        <div
          style={{
            background: "#fdfaf5",
            borderRadius: 14,
            boxShadow: "0 1px 3px rgba(58,28,20,0.08), 0 8px 26px rgba(58,28,20,0.13)",
            position: "relative",
            padding: "24px 26px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 6,
              border: "1px solid rgba(124,58,42,0.28)",
              borderRadius: 10,
              pointerEvents: "none",
            }}
          />
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: "#2e3a2c", marginBottom: 3 }}>
            Burgundy &amp; pink out, sage in
          </h2>
          <p style={{ fontSize: 11.5, color: "#8a7a6c", marginBottom: 15, lineHeight: 1.5 }}>
            Ring fill = depth into the journey (empty / half / full / solid). Warm pink centre = your material went
            out; sage = the agent moved, ball is with you. The mark is the verb: → sent, ← received, ✎ revise,
            ✓ offered, × closed.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", position: "relative" }}>
            <thead>
              <tr>
                <th style={{ ...lblStyle, textAlign: "left", padding: "4px" }}>Status</th>
                {SIZES.map((s) => (
                  <th key={s} style={{ ...lblStyle, textAlign: "center", padding: "4px", width: 56 }}>
                    {s}px
                  </th>
                ))}
                <th style={{ ...lblStyle, textAlign: "right", padding: "4px" }}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {allStatuses.map((status) => (
                <tr key={status}>
                  <td
                    style={{
                      padding: "8px 4px",
                      borderBottom: "0.5px solid #f0e6d8",
                      fontSize: 12.5,
                      color: "#4a3a30",
                      verticalAlign: "middle",
                    }}
                  >
                    {status}
                  </td>
                  {SIZES.map((s) => (
                    <td
                      key={s}
                      style={{
                        padding: "8px 4px",
                        borderBottom: "0.5px solid #f0e6d8",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      <StatusDot status={status} size={s} />
                    </td>
                  ))}
                  <td
                    style={{
                      padding: "8px 4px",
                      borderBottom: "0.5px solid #f0e6d8",
                      textAlign: "right",
                      fontFamily: FONT_MONO,
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#9c8878",
                      verticalAlign: "middle",
                    }}
                  >
                    {getStatusDescription(status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend rendered from STATUS_DOT_LEGEND through the real component */}
          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 14,
              paddingTop: 13,
              borderTop: "0.5px solid #ece0d2",
              flexWrap: "wrap",
              position: "relative",
            }}
          >
            {STATUS_DOT_LEGEND.map(({ status, label }) => (
              <span
                key={label}
                style={{ ...lblStyle, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 7 }}
              >
                <StatusDot status={status} size={12} />
                {label}
              </span>
            ))}
          </div>

          {/* In-context sanity row: clustered pipeline-cell rendering at actual size */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "0.5px solid #ece0d2", position: "relative" }}>
            <div style={{ ...lblStyle, marginBottom: 6 }}>In context, actual size</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 12, color: "#4a3a30" }}>
              <span style={{ display: "inline-flex", gap: 4 }}>
                {[0, 1, 2, 3].map((i) => (
                  <StatusDot key={i} status={QueryStatus.QUERIED} size={12} />
                ))}
                {[0, 1].map((i) => (
                  <StatusDot key={`c${i}`} status={QueryStatus.NO_RESPONSE} size={12} />
                ))}
              </span>
              <span style={{ flex: 1 }}>Pipeline cell · queried ×4, closed ×2</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 12, color: "#4a3a30" }}>
              <span style={{ display: "inline-flex", gap: 5 }}>
                {[
                  QueryStatus.QUERIED,
                  QueryStatus.PARTIAL_REQUESTED,
                  QueryStatus.PARTIAL_SENT,
                  QueryStatus.FULL_REQUESTED,
                  QueryStatus.REVISE_RESUBMIT,
                  QueryStatus.OFFER,
                ].map((st) => (
                  <StatusDot key={st} status={st} size={12} />
                ))}
              </span>
              <span style={{ flex: 1 }}>Mixed sidebar scan — six statuses in a row</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
