/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v1, Part E; plan rules v1 (12 Nov) — the Pro gate for the Materials pages and the Scout. On Query
 * letters, Comparable titles and Submission packages a writer without Pro sees their own work READ-ONLY: the page in
 * full, inert, under one line and a "See Pro plans" link. On the Scout they see the lock card (design-refs/query-letters-v1,
 * 06 and 07). Founding writers, paid Pro and trial accounts see neither.
 *
 * ⚠️ MOUNTED FROM THE PAGE SHELL (App.tsx), NEVER INSIDE A PAGE'S OWN FILE: Comparable titles and Submission packages
 * are other packs' pages and are not edited here.
 *
 * ⚠️ NOTHING ON A LOCKED PAGE WRITES: the page under the card is `inert` and `aria-hidden`, so no control in it can be
 * reached by pointer, keyboard or a screen reader. Unlocked, the gate renders its child and nothing else, so no page's
 * layout changes for anyone today.
 *
 * ⚠️ THE DECISION IS THE RESOLVER'S (`readOnly`), AND THE NAV'S MARK (`navLockedFor`) AGREES WITH IT — so the page
 * and the nav cannot disagree. The dev-only `window.__SA_NAV_FREE` aid (lib/railReviewAid) shows both as a Free writer
 * will see them; the call site carries the MODE gate.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { readOnly } from "../../lib/entitlements";
import type { ProFeature } from "../../lib/planRules";
import "./materialsLock.css";

export type MaterialsPage = "letters" | "comps" | "packages" | "scout";

/**
 * PLAN RULES v1 — PRO WORK ON FREE IS READ-ONLY, NOT LOCKED AWAY. On Query letters, Comparable titles and Submission
 * packages a Free writer's page opens and its lists show; nothing in it can be created or edited (the page is `inert`),
 * and one line says so with a "See Pro plans" link. Nothing is deleted. The Scout is different: it is not the writer's
 * own work, so a Free writer gets the lock card, not a read-only view of it.
 */
export const READ_ONLY_LINE: Record<"letters" | "comps" | "packages", string> = {
  letters: "Your query letters are kept and readable on Free. Writing and editing them is part of Pro.",
  comps: "Your comparable titles are kept and readable on Free. Adding and editing them is part of Pro.",
  packages: "Your submission packages are kept and readable on Free. Building and editing them is part of Pro.",
};

export const LOCK_COPY: Record<"scout", { h: string; body: string; free: string }> = {
  scout: {
    h: "The Scout is part of Pro",
    body: "Agents other writers have verified, and comp titles to consider.",
    free: "On Free, you can still add agents by hand or bring them in.",
  },
};

export const MaterialsLockGate: React.FC<{ page: MaterialsPage; locked: boolean; children: React.ReactNode }> = ({ page, locked, children }) => {
  const navigate = useNavigate();
  if (!locked) return <>{children}</>;
  if (page !== "scout") {
    return (
      <div className="mlk mlk--ro" data-mlk={page}>
        <p className="mlk-ro" role="note" data-mlk="read-only">
          <span>{READ_ONLY_LINE[page]}</span>{" "}
          <button type="button" className="mlk-ro-go" data-mlk="plans" onClick={() => navigate("/plans")}>See Pro plans</button>
        </p>
        <div className="mlk-page" inert data-mlk="page">{children}</div>
      </div>
    );
  }
  const c = LOCK_COPY.scout;
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

const FEATURE: Record<MaterialsPage, ProFeature> = { letters: "letters", comps: "comps", packages: "packages", scout: "scout" };

/** The gate with the signed-in writer's entitlement (plan rules v1: the one resolver). Founding writers, paid Pro and
 *  trial accounts never see it. The nav's Pro mark for the same page (`navLockedFor`) is the same answer. */
export const MaterialsLock: React.FC<{ page: MaterialsPage; children: React.ReactNode }> = ({ page, children }) => {
  const { entitlement } = useScriptAllyDb();
  const locked = readOnly(entitlement, FEATURE[page]);
  return <MaterialsLockGate page={page} locked={locked}>{children}</MaterialsLockGate>;
};
