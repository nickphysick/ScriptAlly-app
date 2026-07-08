/**
 * CrumbStrip — the FULL-BLEED breadcrumb strip (ref design-refs/crumb-fullwidth-v1.html, variant A).
 *
 * The crumb detaches from the masthead and becomes window chrome: it spans the entire content
 * column edge-to-edge (rail's right edge → viewport right edge), OUTSIDE the max-width cap, on
 * every workspace page that has a crumb. A translucent card wash + hairline base is what makes it
 * read as the window's anchor line; the page (masthead + stage) lives capped in the column below.
 *
 * Rendered by StagePage above the capped `.sa-content-col`. Self-contained: it reads the crumb
 * from `crumbForPath` (topCrumb.ts, unchanged) and navigates via the router (crumb targets are
 * plain routes). Renders nothing where there is no crumb (dashboard, unknowns) — StagePage
 * collapses cleanly. The masthead (ChromeSlab) no longer draws a crumb — this is the only one.
 */

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FONT_MONO } from "../../lib/designTokens";
import { crumbForPath } from "./topCrumb";

const CRUMB_PATHS: Record<string, string> = {
  dashboard: "/dashboard",
  queries: "/queries",
  agents: "/agents",
  manuscripts: "/manuscripts",
};

export const CrumbStrip: React.FC<{ onNavigate?: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const segments = crumbForPath(useLocation().pathname);
  const navigate = useNavigate();
  if (!segments) return null;
  const go = (tab: string, sub?: string) => {
    if (onNavigate) onNavigate(tab, sub);
    else navigate(CRUMB_PATHS[tab] ?? "/dashboard");
  };

  return (
    <div
      className="sa-crumbstrip"
      style={{
        flexShrink: 0,
        background: "var(--crumb-strip-bg, rgba(255,254,251,0.6))",
        borderBottom: "1px solid var(--crumb-strip-rule, var(--slab-bd, #e7ddd2))",
        padding: "8px 24px",
      }}
    >
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
  );
};
