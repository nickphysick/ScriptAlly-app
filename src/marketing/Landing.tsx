/**
 * Landing — the public front page at "/" (design ref: design-refs/landing-v13.html,
 * pixel-authoritative). Phase 2 ships a placeholder so the route tiers are testable;
 * Phase 3 replaces the body with the full hero / demo / features build.
 */

import React from "react";

export const Landing: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = () => {
  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "72px 56px" }}>
      <h1
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 52,
          fontWeight: 500,
          lineHeight: 1.1,
          color: "var(--mk-head)",
        }}
      >
        Take control of your querying journey.
      </h1>
    </div>
  );
};
