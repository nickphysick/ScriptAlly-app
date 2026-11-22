/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Pro banner (v16 §5).
 */
import { resolveEntitlement, type Entitlement } from "../../lib/entitlements";
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { UserPlan } from "../../types";
import { OneScreenPro } from "./OneScreenPro";
import { cssRule } from "../../test/cssRule";

const cssRules = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/* plan rules v1: the banner reads the resolved entitlement, driven here through the real resolver */
const CREATED = Date.parse("2026-11-01T00:00:00Z");
const entFor = (basis: "free" | "trial" | "pro" | "founding" | "pending"): Entitlement => resolveEntitlement({
  founding: basis === "pending" ? null : basis === "founding", plan: basis === "pro" ? UserPlan.PRO : UserPlan.FREE,
  createdMs: CREATED, nowMs: CREATED + (basis === "trial" ? 1 : 30) * 86_400_000,
});
const renderE = (basis: Parameters<typeof entFor>[0]) => renderToStaticMarkup(
  <OneScreenPro loading={false} entitlement={entFor(basis)} onNavigate={() => {}} />,
);
const render = (plan: UserPlan) => renderE(plan === UserPlan.PRO ? "pro" : "free");

describe("§5 · the Pro banner", () => {
  it("free: the headline, the sentence and the route to plans", () => {
    const html = render(UserPlan.FREE);
    expect(html).toContain("QueryHawk Pro");
    expect(html).toContain("More room for the journey");
    expect(html).toContain("Query letters");
    expect(html).not.toContain("Unlimited manuscripts");
    expect(html).toContain("See what");
  });

  /* ⚠️ A PAYING USER IS NEVER SOLD TO (house law). The rail's mini did not check the plan; this
     does, and renders NOTHING rather than a softened version. */
  it("⚠️ Pro: nothing at all — not a quieter banner, not a 'you have Pro' badge", () => {
    expect(render(UserPlan.PRO)).toBe("");
  });

  it("a founding writer is never sold to, and nothing is sold before the entitlement loads", () => {
    expect(renderE("founding")).toBe("");
    expect(renderE("pending")).toBe("");
  });

  it("a trial account may see it", () => {
    expect(renderE("trial")).toContain("QueryHawk Pro");
  });
});

describe("§5 · it appears only where it fits", () => {
  /* ⚠️ HEIGHT **AND** WIDTH — a short window has no room beneath tasks, a narrow one stacks the
     three text lines into a column. Default display:none, switched on inside the query only. */
  it("hidden by default; shown at min-height 940 AND min-width 1025", () => {
    /* ⚠️ ANCHORED — `.os-probanner {` matches inside `.os-colL .os-probanner {`, which is where
       the left column states the banner's flex budget. See src/test/cssRule.ts. */
    expect(cssRule(cssRules, ".os-probanner", "oneScreen.css")).toContain("display: none");
    expect(cssRules).toContain("@media (min-height: 940px) and (min-width: 1025px) {");
    /* ⚠️ slice to the query's OWN closing brace, not the first one — the first `}` belongs to
       the rule nested inside it, and cutting there drops the very text being asserted */
    const at = cssRules.indexOf("@media (min-height: 940px) and (min-width: 1025px) {");
    const q = cssRules.slice(at, cssRules.indexOf("}", cssRules.indexOf("}", at) + 1) + 1);
    expect(q).toContain(".os-probanner { display: flex; }");
  });

  it("~132px tall, and pastille-blue only — no burgundy, no sage", () => {
    const banner = cssRule(cssRules, ".os-probanner", "oneScreen.css");
    expect(banner).toContain("min-height: 132px");
    expect(banner).toContain("border-top: 2px solid #c2cfda");
    expect(banner).not.toContain("#7c3a2a");
    expect(banner).not.toContain("#8a9e88");
  });
});
