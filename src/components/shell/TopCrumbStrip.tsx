/**
 * TopCrumbStrip — the slim workspace breadcrumb strip (design ref:
 * design-refs/topstrip-breadcrumbs-v1.html, variant A "crumb only"). Rendered once in the
 * AppShell content column, above the stage, on every workspace route the crumb table knows —
 * the dashboard is exempt (its floating top bar owns that band). Values per the ref: 38px
 * min-height, 7px 20px padding, translucent card wash over the desk, hairline base; mono 9px
 * crumb, non-current segments navigable via the existing bridge, current segment bold and
 * inert. Themed by the additive --crumb tokens (index.css).
 */

import React from "react";
import { useLocation } from "react-router-dom";
import { FONT_MONO } from "../../lib/designTokens";
import { crumbForPath } from "./topCrumb";

export const TopCrumbStrip: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  const segments = crumbForPath(useLocation().pathname);
  if (!segments) return null;

  return (
    <div
      style={{
        minHeight: 38,
        padding: "7px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexShrink: 0,
        background: "var(--crumb-bg, rgba(255,254,251,0.55))",
        borderBottom: "1px solid var(--crumb-hair, #e7ddd2)",
      }}
    >
      <nav
        aria-label="Breadcrumb"
        style={{
          display: "inline-flex",
          alignItems: "center",
          fontFamily: FONT_MONO,
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
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
                  onClick={() => onNavigate(seg.tab!, seg.sub)}
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
