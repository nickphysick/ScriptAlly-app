/**
 * ChromeSlab — the workspace masthead, now a FLOATING CARD (ref crumb-fullwidth-v1.html,
 * variant A). The crumb detached: it is drawn full-bleed by CrumbStrip (StagePage), OUTSIDE the
 * max-width cap, as window chrome. This component is just the masthead — title + mono meta left,
 * the page's REAL tools right — as a bordered, rounded card in each theme's card treatment
 * (`--bd`/`--bdw` + `--hub-radius` + `--mast-sh`: Capp soft · Bold ink + hard shadow · Editorial
 * hairline + soft shadow). `grand` keeps the 54px hub masthead; compact is the 25px default.
 *
 * Mounted inside the capped `.sa-content-col`; it no longer bleeds (the card is inset with the
 * page's own edge padding, sharing left/right edges with the stage below). The dashboard is
 * exempt (its floating top bar owns that band).
 */

import React from "react";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

export const ChromeSlab: React.FC<{
  /** Retained for API compatibility with the mounts; the crumb is now CrumbStrip's job. */
  onNavigate?: (tab: string, subPageName?: string) => void;
  title: React.ReactNode;
  meta?: React.ReactNode;
  tools?: React.ReactNode;
  /** GRAND MASTHEAD (hub-only): 54px Playfair title (--hub-head ink) + mono pulse-line meta,
   *  CTA bottom-right baseline-aligned. Compact (default) is the 25px two-row header. */
  grand?: boolean;
  /** Outer style escape (merged last). Mounts no longer pass a negative-margin bleed. */
  style?: React.CSSProperties;
}> = ({ title, meta, tools, grand, style }) => {
  // Floating card — theme card treatment, a 14px desk gap below (to the filter bar / stage). The
  // desk gap ABOVE comes from the page's own top padding (the crumb sits above that, in StagePage).
  const shell: React.CSSProperties = {
    flexShrink: 0,
    background: "var(--slab-bg, #fffefb)",
    border: "var(--bdw, 1px) solid var(--bd, #d8cebf)",
    borderRadius: "var(--hub-radius, 12px)",
    boxShadow: "var(--mast-sh, 0 1px 3px rgba(58,28,20,0.05))",
    marginBottom: 14,
    ...style,
  };

  // ── GRAND MASTHEAD ── big title + pulse-line meta left; CTA bottom-right.
  if (grand) {
    return (
      <header className="sa-slab sa-slab-grand sa-mast-card" style={shell}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, padding: "var(--hub-mast-pad, 22px 30px 20px)", flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            <div style={{ fontFamily: FONT_SERIF, fontSize: "var(--hub-mast-title, 54px)", fontWeight: 500, color: "var(--hub-head, #000)", lineHeight: 1.0, letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>
              {title}
            </div>
            {meta && (
              <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--slab-meta, #8a7a6c)", marginTop: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {meta}
              </div>
            )}
          </div>
          {tools && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexWrap: "nowrap" }}>
              {tools}
            </div>
          )}
        </div>
      </header>
    );
  }

  // ── COMPACT MASTHEAD (default, every non-hub page) ──
  return (
    <header className="sa-slab sa-mast-card" style={shell}>
      {/* Header row — tools NEVER wrap: buttons are nowrap/flex-none (page-side), the search
          pill is the flexible element (floor 160px, page-side), and below that the META line
          truncates with an ellipsis before any button wraps. */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, padding: "12px 18px", flexWrap: "nowrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 25, fontWeight: 500, color: "var(--slab-ttl, #5d4037)", lineHeight: 1.05, whiteSpace: "nowrap" }}>
            {title}
          </div>
          {meta && (
            <div style={{ fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--slab-meta, #8a7a6c)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {meta}
            </div>
          )}
        </div>
        {tools && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, minWidth: 0, flexWrap: "nowrap" }}>
            {tools}
          </div>
        )}
      </div>
    </header>
  );
};
