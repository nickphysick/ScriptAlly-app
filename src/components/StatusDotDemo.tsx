/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatusDotDemo — dev review surface + living documentation for the canonical StatusDot.
 * Reached via the #/status-dots hash (no router in this app). Renders the full status table
 * at a range of sizes, a contrast check on the three surfaces dots actually sit on
 * (cream / parchment / selected-row), and a legend — all driven through the REAL component
 * and STATUS_DOT_LEGEND, never redrawn approximations.
 *
 * Note: sizes here use `overrideSize` because the app-wide `size` prop is intentionally ignored
 * (every in-app dot renders at the fixed 30px) — overrideSize is the only way to show a range.
 */
import React from "react";
import { QueryStatus } from "../types";
import { StatusDot, STATUS_DOT_LEGEND } from "./StatusDot";
import { getStatusDescription } from "./StatusPill";

const SIZES = [12, 16, 20, 30];

const FONT_SERIF = "'Playfair Display', Georgia, serif";
const FONT_SANS = "'Source Sans Pro', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Fira Mono', monospace";

/** The three surfaces a dot must read against (per the design spec). */
const SURFACES: { label: string; bg: string }[] = [
  { label: "Cream", bg: "#f5f1eb" },
  { label: "Parchment", bg: "#fdf9f5" },
  { label: "Selected row", bg: "#ffffff" },
];

const lblStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: "0.17em",
  textTransform: "uppercase",
  color: "#9c8878",
  fontWeight: 500,
};

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
    {children}
  </div>
);

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
        gap: 18,
      }}
    >
      <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ ...lblStyle, color: "#7c3a2a" }}>
          StatusDot — canonical status system · dev review surface
        </div>

        {/* Sizes + meaning */}
        <Card>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: "#2e3a2c", marginBottom: 3 }}>
            One map, one dot everywhere
          </h2>
          <p style={{ fontSize: 11.5, color: "#8a7a6c", marginBottom: 15, lineHeight: 1.5 }}>
            Soft tint fill + a 1px base-colour ring + a glyph that names the verb: ✈ queried, ‹ requested,
            › sent, ↺ revise, ★ offer, × rejected, – withdrawn, … no response. The four "your move" states
            (Partial&nbsp;Requested, Full&nbsp;Requested, Revise&nbsp;&amp;&nbsp;Resubmit, Offer) pulse.
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
                  <td style={{ padding: "8px 4px", borderBottom: "0.5px solid #f0e6d8", fontSize: 12.5, color: "#4a3a30", verticalAlign: "middle" }}>
                    {status}
                  </td>
                  {SIZES.map((s) => (
                    <td key={s} style={{ padding: "8px 4px", borderBottom: "0.5px solid #f0e6d8", textAlign: "center", verticalAlign: "middle" }}>
                      <StatusDot status={status} overrideSize={s} />
                    </td>
                  ))}
                  <td style={{ padding: "8px 4px", borderBottom: "0.5px solid #f0e6d8", textAlign: "right", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9c8878", verticalAlign: "middle" }}>
                    {getStatusDescription(status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Contrast check across the three surfaces */}
        <Card>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: "#2e3a2c", marginBottom: 3 }}>
            Contrast on every surface
          </h2>
          <p style={{ fontSize: 11.5, color: "#8a7a6c", marginBottom: 15, lineHeight: 1.5 }}>
            Each dot must keep a clear edge on cream, parchment and a selected/active row. The 1px
            base-colour ring is what carries the palest fills (Queried, No&nbsp;Response, Withdrawn).
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", position: "relative" }}>
            <thead>
              <tr>
                <th style={{ ...lblStyle, textAlign: "left", padding: "4px" }}>Status</th>
                {SURFACES.map((s) => (
                  <th key={s.label} style={{ ...lblStyle, textAlign: "center", padding: "4px" }}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allStatuses.map((status) => (
                <tr key={status}>
                  <td style={{ padding: "6px 4px", borderBottom: "0.5px solid #f0e6d8", fontSize: 12.5, color: "#4a3a30", verticalAlign: "middle" }}>
                    {status}
                  </td>
                  {SURFACES.map((surf) => (
                    <td key={surf.label} style={{ padding: "6px 4px", borderBottom: "0.5px solid #f0e6d8", textAlign: "center", verticalAlign: "middle" }}>
                      <span style={{ display: "inline-flex", padding: "8px 22px", borderRadius: 8, background: surf.bg }}>
                        <StatusDot status={status} overrideSize={20} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Legend — labels sit beside the dot, so the dots are decorative here */}
        <Card>
          <div style={{ ...lblStyle, marginBottom: 12 }}>Legend</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", position: "relative" }}>
            {STATUS_DOT_LEGEND.map(({ status, label }) => (
              <span key={label} style={{ ...lblStyle, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 7 }}>
                <StatusDot status={status} overrideSize={14} decorative />
                {label}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
