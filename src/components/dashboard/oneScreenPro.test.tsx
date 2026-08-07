/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Pro banner (v16 §5).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { UserPlan } from "../../types";
import { OneScreenPro } from "./OneScreenPro";

const cssRules = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const render = (plan: UserPlan) => renderToStaticMarkup(
  <OneScreenPro loading={false} currentUser={{ id: "u", name: "N", plan } as any} onNavigate={() => {}} />,
);

describe("§5 · the Pro banner", () => {
  it("free: the headline, the sentence and the route to plans", () => {
    const html = render(UserPlan.FREE);
    expect(html).toContain("ScriptAlly Pro");
    expect(html).toContain("More room for the journey");
    expect(html).toContain("Unlimited manuscripts");
    expect(html).toContain("See what");
  });

  /* ⚠️ A PAYING USER IS NEVER SOLD TO (house law). The rail's mini did not check the plan; this
     does, and renders NOTHING rather than a softened version. */
  it("⚠️ Pro: nothing at all — not a quieter banner, not a 'you have Pro' badge", () => {
    expect(render(UserPlan.PRO)).toBe("");
  });

  it("a user with no plan on file is treated as free, never assumed Pro", () => {
    expect(renderToStaticMarkup(
      <OneScreenPro loading={false} currentUser={null} onNavigate={() => {}} />,
    )).toContain("ScriptAlly Pro");
  });
});

describe("§5 · it appears only where it fits", () => {
  /* ⚠️ HEIGHT **AND** WIDTH — a short window has no room beneath tasks, a narrow one stacks the
     three text lines into a column. Default display:none, switched on inside the query only. */
  it("hidden by default; shown at min-height 940 AND min-width 1025", () => {
    const banner = cssRules.slice(cssRules.indexOf(".os-probanner {"));
    expect(banner.slice(0, banner.indexOf("}"))).toContain("display: none");
    expect(cssRules).toContain("@media (min-height: 940px) and (min-width: 1025px) {");
    /* ⚠️ slice to the query's OWN closing brace, not the first one — the first `}` belongs to
       the rule nested inside it, and cutting there drops the very text being asserted */
    const at = cssRules.indexOf("@media (min-height: 940px) and (min-width: 1025px) {");
    const q = cssRules.slice(at, cssRules.indexOf("}", cssRules.indexOf("}", at) + 1) + 1);
    expect(q).toContain(".os-probanner { display: flex; }");
  });

  it("~132px tall, and pastille-blue only — no burgundy, no sage", () => {
    const banner = cssRules.slice(cssRules.indexOf(".os-probanner {"), cssRules.indexOf(".os-pimg2 {"));
    expect(banner).toContain("min-height: 132px");
    expect(banner).toContain("border-top: 2px solid #c2cfda");
    expect(banner).not.toContain("#7c3a2a");
    expect(banner).not.toContain("#8a9e88");
  });
});
