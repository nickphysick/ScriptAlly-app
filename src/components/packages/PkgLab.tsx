/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PkgLab — DEV-only review harness for the Submission Package Builder (#/pkg-lab). Renders the
 * builder's presentational views over local stub handlers so they can be eyeballed WITHOUT signing in
 * (the real page is Pro + auth-gated). Applies a real theme class (.t-capp / .t-bold) so every
 * var(--…) token resolves exactly as on the live page, with a toggle to check both. As later phases
 * land, add their views here behind the view switch. TEMP — remove when the feature ships.
 */
import React, { useState } from "react";
import { FirstVisitHome } from "./FirstVisitHome";
import { FONT_MONO } from "../../lib/designTokens";

type Theme = "t-capp" | "t-bold";

export const PkgLab: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("t-capp");

  return (
    <div className={theme} style={{ minHeight: "100vh", background: "var(--desk)", padding: "20px 16px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 1120, margin: "0 auto 18px" }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>#/pkg-lab · first-visit home</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(["t-capp", "t-bold"] as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--bd)", background: theme === t ? "var(--band)" : "#fffefb", color: theme === t ? "var(--burg)" : "var(--ink)" }}
            >
              {t === "t-capp" ? "Cappuccino" : "Bold Pastille"}
            </button>
          ))}
        </div>
      </div>

      {/* First-visit surface is white in both themes (Phase 5). */}
      <section style={{ maxWidth: 1120, margin: "0 auto", background: "#fffefb", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--chromerad)", padding: "16px 16px 20px", alignSelf: "flex-start" }}>
        <FirstVisitHome onBuild={() => {}} onCreate={() => {}} onExample={() => {}} />
      </section>
    </div>
  );
};
