/**
 * CrumbStrip — the workspace HEADER strip (evolved from the full-bleed breadcrumb; overnight
 * nav run). Left cluster is now: menu button (opens the app-wide NavDrawer) → ScriptAlly mark
 * + wordmark (→ dashboard) → hairline divider → breadcrumb. The breadcrumb renders the parent
 * segment(s) in mono small caps and the CURRENT PAGE NAME in Playfair at ~19px (proper case
 * from the crumb table's `title`) — e.g. `QUERYING / Queries Hub`, `AGENTS / Contact List`.
 *
 * The root "SCRIPTALLY" segment is no longer drawn as text — the mark + wordmark carry it
 * (and navigate to the dashboard). Still rendered by StagePage above the capped column on
 * every crumbed page; renders nothing where there is no crumb (dashboard, unknowns). Themed
 * by the existing --crumb-* tokens; the drawer trigger only renders inside NavDrawerProvider.
 */

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { FONT_MONO, FONT_SERIF, burgundy } from "../../lib/designTokens";
import { crumbForPath } from "./topCrumb";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { useNavDrawer, NAV_DRAWER_ID } from "./NavDrawer";

const CRUMB_PATHS: Record<string, string> = {
  dashboard: "/dashboard",
  queries: "/queries",
  agents: "/agents",
  manuscripts: "/manuscripts",
};

export const CrumbStrip: React.FC<{ onNavigate?: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const segments = crumbForPath(useLocation().pathname);
  const navigate = useNavigate();
  const drawer = useNavDrawer();
  if (!segments) return null;
  const go = (tab: string, sub?: string) => {
    if (onNavigate) onNavigate(tab, sub);
    else navigate(CRUMB_PATHS[tab] ?? "/dashboard");
  };

  // The brand replaces the root segment; the rest render as crumb text.
  const crumbSegments = segments.slice(1);
  const page = crumbSegments[crumbSegments.length - 1];
  const parents = crumbSegments.slice(0, -1);

  return (
    <div
      className="sa-crumbstrip"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "var(--crumb-strip-bg, rgba(255,254,251,0.6))",
        borderBottom: "1px solid var(--crumb-strip-rule, var(--slab-bd, #e7ddd2))",
        padding: "6px 16px 6px 10px",
        minHeight: 48,
      }}
    >
      {/* Menu — opens the app-wide nav drawer (renders only inside the provider). */}
      {drawer && (
        <button
          type="button"
          onClick={drawer.toggle}
          aria-expanded={drawer.open}
          aria-controls={NAV_DRAWER_ID}
          aria-label="Open navigation"
          title="Menu"
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: "50%", border: "none",
            background: "transparent", cursor: "pointer", color: "var(--crumb-seg, #9c8878)",
            transition: "background 0.12s", flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(30,26,22,0.07)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <Menu style={{ width: 17, height: 17 }} />
        </button>
      )}

      {/* Brand — mark + wordmark; navigates home like the retired rail head. */}
      <button
        type="button"
        onClick={() => go("dashboard")}
        aria-label="ScriptAlly — go to dashboard"
        style={{ display: "flex", alignItems: "center", gap: 2, background: "transparent", border: "none", cursor: "pointer", padding: "0 2px", flexShrink: 0 }}
      >
        <img src="/scriptally-logo-new.png" alt="" aria-hidden="true" width={26} height={26} style={{ width: 26, height: 26, display: "block" }} />
        <span style={{ display: "flex", overflow: "hidden" }}>
          <ScriptAllyLogo heightPx={30} textColor={burgundy} iconColor={burgundy} />
        </span>
      </button>

      {/* Breadcrumb — parent segments mono small caps, page name Playfair ~19px. */}
      <nav
        aria-label="Breadcrumb"
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          marginLeft: 10, paddingLeft: 14,
          borderLeft: "1px solid var(--crumb-strip-rule, var(--slab-bd, #e7ddd2))",
          whiteSpace: "nowrap", minWidth: 0,
        }}
      >
        {parents.map((seg) => (
          <React.Fragment key={seg.label}>
            <button
              type="button"
              onClick={() => go(seg.tab!, seg.sub)}
              style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "var(--crumb-seg, #9c8878)",
                transition: "color 0.13s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--crumb-seg-hov, #5d4037)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--crumb-seg, #9c8878)"; }}
            >
              {seg.label}
            </button>
            <span aria-hidden="true" style={{ color: "var(--crumb-sep, #c9bba9)", fontFamily: FONT_MONO, fontSize: 9 }}>/</span>
          </React.Fragment>
        ))}
        <b
          aria-current="page"
          style={{
            fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 600, lineHeight: 1.1,
            color: "var(--crumb-cur, #241c15)", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {page.title ?? page.label}
        </b>
      </nav>
    </div>
  );
};
