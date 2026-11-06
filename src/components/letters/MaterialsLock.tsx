/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v1, Part E — the Pro lock for the Materials pages (design-refs/query-letters-v1, 06 and 07). A writer
 * without the "materials" entitlement sees the page blurred under a white card: a lock in a berry disc, a heading, a
 * line, an italic Free line, "See Pro plans" and "Not now". Nobody is locked today (MATERIALS_OPEN_TO_ALL is true).
 *
 * ⚠️ MOUNTED FROM THE PAGE SHELL (App.tsx), NEVER INSIDE A PAGE'S OWN FILE: Comparable titles and Submission packages
 * are other packs' pages and are not edited here.
 *
 * ⚠️ NOTHING ON A LOCKED PAGE WRITES: the page under the card is `inert` and `aria-hidden`, so no control in it can be
 * reached by pointer, keyboard or a screen reader. Unlocked, the gate renders its child and nothing else, so no page's
 * layout changes for anyone today.
 *
 * ⚠️ THE DECISION IS `navLockedFor(user).has("materials")` — the same one that draws the nav's Pro marks — so the page
 * and the nav cannot disagree. The dev-only `window.__SA_NAV_FREE` aid (lib/railReviewAid) shows both as a Free writer
 * will see them; the call site carries the MODE gate.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { navLockedFor } from "../../lib/entitlements";
import { navOpenAid } from "../../lib/railReviewAid";
import "./materialsLock.css";

export type MaterialsPage = "letters" | "comps" | "packages";

export const LOCK_COPY: Record<"letters" | "materials", { h: string; body: string; free: string }> = {
  letters: {
    h: "Query letters is part of Pro",
    body: "Keep every version of your letter in one place, pick which one goes with each query, and see which gets agents asking for more.",
    free: "On Free, your queries still record that a query letter went.",
  },
  materials: {
    h: "Materials is part of Pro",
    body: "Query letters, comparable titles and submission packages: keep them together, send the right ones with each query, and see what's working.",
    free: "On Free, your queries still record that a letter, synopsis and pages went.",
  },
};

export const MaterialsLockGate: React.FC<{ page: MaterialsPage; locked: boolean; children: React.ReactNode }> = ({ page, locked, children }) => {
  const navigate = useNavigate();
  if (!locked) return <>{children}</>;
  const c = LOCK_COPY[page === "letters" ? "letters" : "materials"];
  return (
    <div className="mlk" data-mlk={page}>
      <div className="mlk-page" inert aria-hidden="true">{children}</div>
      <div className="mlk-over" data-mlk="lock">
        <div className="mlk-card" role="dialog" aria-modal="false" aria-labelledby={`mlk-h-${page}`}>
          <span className="mlk-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </span>
          <h2 className="mlk-h" id={`mlk-h-${page}`}>{c.h}</h2>
          <p className="mlk-p">{c.body}</p>
          <p className="mlk-p mlk-free">{c.free}</p>
          <div className="mlk-acts">
            <button type="button" className="mlk-b1" data-mlk="plans" onClick={() => navigate("/plans")}>See Pro plans</button>
            <button type="button" className="mlk-b2" data-mlk="not-now" onClick={() => navigate("/dashboard")}>Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** The gate with the signed-in writer's entitlement. */
export const MaterialsLock: React.FC<{ page: MaterialsPage; children: React.ReactNode }> = ({ page, children }) => {
  const { currentUser } = useScriptAllyDb();
  const locked = navLockedFor(currentUser, import.meta.env.MODE !== "production" ? navOpenAid() : undefined).has("materials");
  return <MaterialsLockGate page={page} locked={locked}>{children}</MaterialsLockGate>;
};
