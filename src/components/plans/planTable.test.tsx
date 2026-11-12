/**
 * The one plan table and the Plans page (non-workspace v1, Phase 4) — the locks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

let ENT: { basis: string; pro: boolean; prompts: boolean; trialEndsMs: number | null } = { basis: "founding", pro: true, prompts: false, trialEndsMs: null };
vi.mock("../../lib/db", () => ({ useScriptAllyDb: () => ({ entitlement: ENT }) }));
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());

import { PlansPage } from "../PlansPage";
import { PlanTable } from "./PlanTable";
import { PLAN_ROWS } from "../../lib/planComparison";
import { PRO_FEATURES } from "../../lib/planRules";
import { canUse, resolveEntitlement, DAY_MS } from "../../lib/entitlements";
import { PLANS_ON_SALE } from "../../lib/selling";

const NOW = Date.parse("2026-11-12T12:00:00Z");
const html = (el: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>).replace(/&#x27;/g, "'");
const STATES = {
  founding: { basis: "founding", pro: true, prompts: false, trialEndsMs: null },
  trial: { basis: "trial", pro: true, prompts: true, trialEndsMs: NOW + 5 * DAY_MS },
  free: { basis: "free", pro: false, prompts: true, trialEndsMs: null },
  pro: { basis: "pro", pro: true, prompts: false, trialEndsMs: null },
};
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });

describe("the Free and Pro columns agree with canUse for every Pro feature", () => {
  const free = resolveEntitlement({ founding: false, plan: null, createdMs: NOW - 30 * DAY_MS, nowMs: NOW });
  const pro = resolveEntitlement({ founding: false, plan: "Pro", createdMs: NOW - 30 * DAY_MS, nowMs: NOW });
  it("every Pro feature has exactly one row", () => {
    expect(PLAN_ROWS.filter((r) => r.feature).map((r) => r.feature).sort()).toEqual([...PRO_FEATURES].sort());
  });
  for (const r of PLAN_ROWS.filter((x) => x.feature)) {
    it(r.label, () => {
      expect(r.free.kind === "included").toBe(canUse(free, r.feature!));
      expect(r.pro.kind === "included").toBe(canUse(pro, r.feature!));
    });
  }
  it("the table draws each feature row's cells as the data says", () => {
    vi.useRealTimers();
    const h = html(<PlanTable viewer="free" />);
    for (const r of PLAN_ROWS.filter((x) => x.feature)) {
      const row = h.slice(h.indexOf(`data-feature="${r.feature}"`));
      const tr = row.slice(0, row.indexOf("</tr>"));
      expect(tr).toMatch(/data-col="free"><span class="plt-no" role="img" aria-label="Not included"/);
      expect(tr).toMatch(/data-col="pro" class="plt-p"><span class="plt-yes" role="img" aria-label="Included"/);
    }
  });
});

describe("each of the four account states renders its own headline", () => {
  const head = (k: keyof typeof STATES) => { ENT = STATES[k]; const h = html(<PlansPage />); const m = h.match(/<h1 class="sc-ttl-h">([^<]*)<\/h1>/); return m?.[1]; };
  it("founding", () => expect(head("founding")).toBe("You're a founding writer. Nothing to choose, nothing to pay."));
  it("in the 14 days: Free, with the days of Pro left", () => {
    expect(head("trial")).toBe("You're on the Free plan.");
    expect(html(<PlansPage />)).toContain("You have 5 days of Pro left.");
  });
  it("Free", () => { expect(head("free")).toBe("You're on the Free plan."); expect(html(<PlansPage />)).not.toContain("of Pro left"); });
  it("Pro", () => expect(head("pro")).toBe("You're on Pro. Everything's included."));
  it("four different pages", () => {
    const pages = (Object.keys(STATES) as (keyof typeof STATES)[]).map((k) => { ENT = STATES[k]; return html(<PlansPage />).match(/data-plans-state="([a-z]+)"/)?.[1]; });
    expect(pages).toEqual(["founding", "trial", "free", "pro"]);
  });
});

describe("no buy control is reachable with the selling flag off", () => {
  const BUY = /Choose a length|Choose \d+ months?|Add more time|Add \d+ months?|checkout/i;
  it("the flag is off", () => expect(PLANS_ON_SALE).toBe(false));
  for (const k of Object.keys(STATES) as (keyof typeof STATES)[]) {
    it(`Plans page, ${k}`, () => { ENT = STATES[k]; expect(html(<PlansPage />)).not.toMatch(BUY); });
  }
  for (const v of ["free", "founding", "pro", "public"] as const) {
    it(`table, ${v}, desk and phone, even with a buy handler`, () => {
      expect(html(<PlanTable viewer={v} onChooseLength={() => {}} />)).not.toMatch(BUY);
      expect(html(<PlanTable viewer={v} onChooseLength={() => {}} forcePhone />)).not.toMatch(BUY);
    });
  }
});

describe("the stale claims are gone from the plan surfaces", () => {
  const files = ["../PlansPage.tsx", "./PlanTable.tsx", "../AccountSettings.tsx"].map((f) => readFileSync(resolve(__dirname, f), "utf8"));
  for (const bad of [/no trial clock/i, /The Comp Scout/, /update written for you/i, /£4\.99|£3\.99/, /half price/i, /\b5 agents\b|agent cap/i]) {
    it(String(bad), () => { for (const f of files) expect(f).not.toMatch(bad); });
  }
  it("prices on the page come from planRules, never typed", () => {
    const page = readFileSync(resolve(__dirname, "../PlansPage.tsx"), "utf8");
    expect(page).not.toMatch(/£(7\.99|19|29|45)\b/);
  });
});
