/**
 * ChromeSlab — the unified workspace header surface (design ref:
 * design-refs/header-ground-fullpage-v1.html, OPTION A "card slab"; Option B in the same file
 * is the rejected alternative). One card-coloured slab carrying the crumb strip (row 1 —
 * absorbing TopCrumbStrip's behaviour; the crumb table stays topCrumb.ts, unchanged) and the
 * page header row (row 2: Playfair title + mono meta left, the page's REAL tools right).
 * Section eyebrows and framed title cards are superseded — the crumb does that job now.
 *
 * Mounted by each workspace page (the dashboard stays exempt — its floating top bar owns that
 * band). Pages inside padded desks bleed to full width via the `style` escape (negative
 * margins) rather than editing their page-scoped CSS. Themed by the additive --slab tokens;
 * Editorial adds a slab shadow (its desk is near-white, so the shadow does the separating).
 */

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";
import { crumbForPath } from "./topCrumb";

/** Crumb targets are all plain routes (never interceptions), so a direct-router fallback is
 *  behaviourally safe where a page has no bridge handy. NOTE the one divergence: the bridge
 *  also clears the global searchQuery on navigation — the fallback doesn't (flagged in the
 *  run report; wire `onNavigate` where the page already holds the bridge). */
const CRUMB_PATHS: Record<string, string> = {
  dashboard: "/dashboard",
  queries: "/queries",
  agents: "/agents",
  manuscripts: "/manuscripts",
};

export const ChromeSlab: React.FC<{
  onNavigate?: (tab: string, subPageName?: string) => void;
  title: React.ReactNode;
  meta?: React.ReactNode;
  tools?: React.ReactNode;
  /** Outer style escape — e.g. negative margins to bleed out of a padded page desk. */
  style?: React.CSSProperties;
}> = ({ onNavigate, title, meta, tools, style }) => {
  const segments = crumbForPath(useLocation().pathname);
  const navigate = useNavigate();
  const go = (tab: string, sub?: string) => {
    if (onNavigate) onNavigate(tab, sub);
    else navigate(CRUMB_PATHS[tab] ?? "/dashboard");
  };

  return (
    <header
      className="sa-slab"
      style={{
        flexShrink: 0,
        background: "var(--slab-bg, #fffefb)",
        borderBottom: "var(--slab-bdw, 1px) solid var(--slab-bd, #e7ddd2)",
        boxShadow: "var(--slab-shadow, none)",
        ...style,
      }}
    >
      {segments && (
        <div style={{ display: "flex", alignItems: "center", minHeight: 34, padding: "6px 18px" }}>
          <nav
            aria-label="Breadcrumb"
            style={{
              display: "inline-flex", alignItems: "center",
              fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.16em",
              textTransform: "uppercase", whiteSpace: "nowrap",
            }}
          >
            {segments.map((seg, i) => {
              const last = i === segments.length - 1;
              return (
                <React.Fragment key={seg.label}>
                  {i > 0 && <span aria-hidden="true" style={{ margin: "0 8px", color: "var(--crumb-sep, #c9bba9)" }}>/</span>}
                  {last ? (
                    <b aria-current="page" style={{ color: "var(--crumb-cur, #7c3a2a)", fontWeight: 700 }}>{seg.label}</b>
                  ) : (
                    <button
                      type="button"
                      onClick={() => go(seg.tab!, seg.sub)}
                      style={{
                        background: "none", border: "none", padding: 0, cursor: "pointer",
                        font: "inherit", letterSpacing: "inherit", textTransform: "inherit",
                        color: "var(--crumb-seg, #9c8878)", transition: "color 0.13s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--crumb-seg-hov, #5d4037)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--crumb-seg, #9c8878)"; }}
                    >
                      {seg.label}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, padding: "6px 18px 12px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 25, fontWeight: 500, color: "var(--slab-ttl, #5d4037)", lineHeight: 1.05 }}>
            {title}
          </div>
          {meta && (
            <div style={{ fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--slab-meta, #8a7a6c)", marginTop: 4 }}>
              {meta}
            </div>
          )}
        </div>
        {tools && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
            {tools}
          </div>
        )}
      </div>
    </header>
  );
};
