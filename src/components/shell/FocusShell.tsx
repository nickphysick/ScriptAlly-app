/**
 * FocusShell — tier-2 chrome for the step-out-of-the-workshop pages (/account · /plans ·
 * /help), per design-refs/chrome-overview-v1.html. Sticky slim bar on the card colour with a
 * hairline base: wordmark (→ /), mono uppercase breadcrumb, "← Back to dashboard" white
 * button, avatar. Content sits in an 860px column on the desk colour. No rail — settings and
 * money decisions get quiet, not navigation. The document scrolls (stage rules are
 * workspace-only). Inline styles, matching the shell-chrome convention (SidebarShell etc).
 */

import React from "react";
import { focusCrumb } from "../../marketing/routeTiers";

const SERIF = '"Playfair Display", Georgia, serif';
const MONO = '"JetBrains Mono", monospace';

export const FocusShell: React.FC<{
  path: string;
  user: { name?: string; email?: string } | null | undefined;
  onNavigate: (tab: string, subPageName?: string) => void;
  children: React.ReactNode;
}> = ({ path, user, onNavigate, children }) => {
  const initial = ((user?.name || user?.email || "W").trim() || "W")[0].toUpperCase();
  return (
    <div style={{ minHeight: "100vh", background: "#f2ede7", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "#fffefb",
          borderBottom: "1px solid #e7ddd2",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "13px 32px",
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate("landing")}
          aria-label="ScriptAlly home"
          style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <span
            style={{
              width: 26, height: 26, borderRadius: "50%", background: "#dfe7ec",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: SERIF, fontSize: 13, color: "#3a4650", flex: "none",
            }}
          >
            S
          </span>
          <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: "#3a1c14" }}>ScriptAlly</span>
        </button>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#9c8878" }}>
          {focusCrumb(path)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f4f2ef"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 500,
              padding: "8px 15px", borderRadius: 10, background: "#ffffff", border: "1px solid #ded3c2",
              color: "#5d4037", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            &larr; Back to dashboard
          </button>
          <span
            aria-hidden="true"
            style={{
              width: 30, height: 30, borderRadius: "50%", background: "#fdfaf5",
              border: "1px solid rgba(124,58,42,0.3)", display: "inline-flex", alignItems: "center",
              justifyContent: "center", fontFamily: SERIF, fontSize: 13, color: "#7c3a2a", flex: "none",
            }}
          >
            {initial}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, width: "100%", maxWidth: 860, margin: "0 auto", padding: "44px 32px 90px" }}>
        {children}
      </div>
    </div>
  );
};
