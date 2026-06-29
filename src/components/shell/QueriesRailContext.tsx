/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueriesRailContext — the Queries page's slot in the SidebarShell rail (manuscript selector ·
 * Filter · Sort), beneath the global nav divider.
 *
 * PHASE 1: a presentational stub so the rail reads complete for chrome review. The live, wired
 * filter/sort (bound to the Queries page state — selectedStatusFilters / sortOption / manuscript
 * filter, with StatusDots + counts and the collapsed "All closed" group) lands in Phase 2.
 */
import React from "react";
import { Book, ChevronDown } from "lucide-react";
import { FONT_MONO, bodyInk, burgundy } from "../../lib/designTokens";
import { cardCream, navBorder, mutedShell, sageTint } from "./shellTokens";

export const QueriesRailContext: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    {/* Manuscript selector chip (static stub) */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        fontSize: 12.5,
        color: bodyInk,
        background: cardCream,
        border: `0.5px solid ${navBorder}`,
        borderRadius: 9,
        padding: "9px 11px",
        marginBottom: 14,
      }}
    >
      <Book style={{ width: 15, height: 15, color: burgundy, flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: 500 }}>All manuscripts</span>
      <ChevronDown style={{ width: 13, height: 13, color: mutedShell }} />
    </div>

    <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: mutedShell, padding: "0 8px 7px" }}>
      Filter
    </div>
    <div
      style={{
        fontSize: 12,
        color: mutedShell,
        fontStyle: "italic",
        background: sageTint,
        borderRadius: 8,
        padding: "10px 11px",
        lineHeight: 1.45,
      }}
    >
      Live filter &amp; sort move here next.
    </div>
  </div>
);
