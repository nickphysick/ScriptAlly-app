/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plans v3 — the model and its render, every viewer (design-refs/plans-v3.html). The geometry (the lead card's
 * rotation, the stepped-back opacity, no horizontal scroll at 390) is measured in tests/e2e/plansV3.measure.ts.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
vi.mock("../../lib/db", () => ({ useScriptAllyDb: () => ({ entitlement: { basis: "founding", pro: true, prompts: false, trialEndsMs: null } }) }));
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());

import { PlansView, plansModel, plansViewerOf, PLANS_COPY, FOUNDING_CAP, type PlansViewer } from "../PlansPage";
import { PRO_FROM, ROLL_ON_PRICE, TRIAL_DAYS } from "../../lib/planRules";

const VIEWERS: PlansViewer[] = ["founding", "trial", "free", "pro"];
const html = (viewer: PlansViewer, selling = false, days: number | null = 9) =>
  renderToStaticMarkup(<PlansView viewer={viewer} trialDaysLeft={days} selling={selling} onBack={() => {}} />);
/** The cards, in document order: `[id, lead, pill text]`. */
const cardsOf = (h: string) =>
  [...h.matchAll(/<article class="([^"]*)" data-plan="(\w+)"(?: data-lead="1")?[^>]*>.*?<span class="pl3-pill"[^>]*>(.*?)<\/span>(?:<span class="plt-chip|<img)/g)]
    .map((m) => ({ id: m[2], lead: /\bis-lead\b/.test(m[1]), pill: m[3].replace(/<span aria-hidden="true">✨ <\/span>/, "") }));

const EXPECT: Record<PlansViewer, { order: string[]; lead: string; pill: string; h1: string }> = {
  founding: { order: ["free", "founding", "pro"], lead: "founding", pill: "Open now", h1: "The early bird gets the worm." },
  trial: { order: ["free", "pro", "founding"], lead: "pro", pill: "Open", h1: "You have 9 days of Pro left." },
  free: { order: ["free", "pro", "founding"], lead: "pro", pill: "Open", h1: "You're on Free." },
  pro: { order: ["free", "pro", "founding"], lead: "pro", pill: "Open", h1: "You're on Pro." },
};

describe("plans v3 — each viewer: card order, exactly one lead, the lead's pill", () => {
  for (const v of VIEWERS) {
    it(`${v}`, () => {
      const cards = cardsOf(html(v));
      expect(cards.map((c) => c.id)).toEqual(EXPECT[v].order);
      const leads = cards.filter((c) => c.lead);
      expect(leads.map((c) => c.id)).toEqual([EXPECT[v].lead]);
      expect(leads[0].pill).toBe(EXPECT[v].pill);
      expect(html(v)).toContain(`<h1 class="sc-ttl-h">${EXPECT[v].h1.replace(/'/g, "&#x27;")}</h1>`);
      /* the model agrees with the render, and every non-lead card that is not open steps back */
      const m = plansModel(v, 9, false);
      expect(m.cards.filter((c) => c.lead)).toHaveLength(1);
      expect(m.cards.find((c) => c.lead)!.wait).toBe(false);
    });
  }
  it("`pending` is drawn as founding; `trial` as trial", () => {
    expect(plansViewerOf("pending")).toBe("founding");
    expect(plansViewerOf("founding")).toBe("founding");
    expect(plansViewerOf("trial")).toBe("trial");
    expect(plansViewerOf("free")).toBe("free");
    expect(plansViewerOf("pro")).toBe("pro");
  });
});

describe("plans v3 — the founding view", () => {
  const h = html("founding");
  it("no length picker, no Questions, no 'Your founding place', none of the removed sections", () => {
    expect(h).not.toContain('class="pl-len"');
    expect(h).not.toContain(PLANS_COPY.questions);
    for (const gone of ["Your founding place", "Then, once we launch", "Plans roll on to monthly", "Finished querying?"]) expect(h).not.toContain(gone);
  });
  it("one closed row, 'Compare every feature', holding the real PlanTable", () => {
    expect([...h.matchAll(/<details data-plans="(\w+)"/g)].map((m) => m[1])).toEqual(["compare"]);
    expect(h).toMatch(/<details data-plans="compare"><summary>Compare every feature/); // no `open` attribute
    expect(h).toContain("Everything, side by side"); // PlanTable's own heading
  });
  it("Free and Pro step back with 'Opens at launch'; Pro shows the from-price and the lengths line", () => {
    const m = plansModel("founding", null, false);
    expect(m.cards.filter((c) => c.wait).map((c) => [c.id, c.pill])).toEqual([["free", "Opens at launch"], ["pro", "Opens at launch"]]);
    expect(h).toContain(`<b>From £${PRO_FROM}</b><span>a month</span>`);
    expect(h).toContain("For 1, 3, 6 or 12 months.");
  });
  it("the founding card carries 'Your plan' and the thank-you foot", () => {
    const found = h.slice(h.indexOf('data-plan="founding"'), h.indexOf('data-plan="pro"'));
    expect(found).toContain("Your plan");
    expect(found).toContain("Thank you for helping us get this right.");
  });
});

describe("plans v3 — after launch", () => {
  it("two closed rows, Compare then Questions", () => {
    for (const v of ["trial", "free", "pro"] as const) {
      expect([...html(v).matchAll(/<details data-plans="(\w+)"/g)].map((m) => m[1])).toEqual(["compare", "questions"]);
    }
  });
  it("trial: Free carries 'Your plan' and the foot; the subheader is the ref's", () => {
    const h = html("trial");
    const free = h.slice(h.indexOf('data-plan="free"'), h.indexOf('data-plan="pro"'));
    expect(free).toContain("Your plan");
    expect(free).toContain(`Yours once your ${TRIAL_DAYS} days of Pro end.`);
    expect(h).toContain("After that you&#x27;re on Free. Nothing you&#x27;ve made is deleted.");
    expect(html("trial", false, 1)).toContain("You have 1 day of Pro left.");
  });
  it("free and trial: Pro shows the picker; pro: no picker, 'Your plan' on Pro, the roll-on price from planRules", () => {
    expect(html("free")).toContain('class="pl-len"');
    expect(html("trial")).toContain('class="pl-len"');
    const p = html("pro");
    expect(p).not.toContain('class="pl-len"');
    const pro = p.slice(p.indexOf('data-plan="pro"'), p.indexOf('data-plan="founding"'));
    expect(pro).toContain("Your plan");
    expect(p).toContain(`monthly at £${ROLL_ON_PRICE}, until you stop it.`);
  });
  it("the founding pass is closed: 'All N places taken', stepped back further", () => {
    const m = plansModel("free", null, false).cards.find((c) => c.id === "founding")!;
    expect([m.pill, m.wait, m.closed, m.lead]).toEqual([`All ${FOUNDING_CAP} places taken`, true, true, false]);
  });
});

describe("plans v3 — selling", () => {
  const count = (h: string) => (h.match(/>Choose Pro</g) ?? []).length;
  it("selling off: no 'Choose Pro' in any state, and the Not-on-sale chip stands in for it where Pro is offered", () => {
    for (const v of VIEWERS) expect(count(html(v, false)), v).toBe(0);
    expect(html("free")).toContain(PLANS_COPY.notOnSale);
  });
  it("selling on: exactly one, inside the Pro card, wherever Pro is offered with a length", () => {
    for (const v of ["trial", "free"] as const) {
      const h = html(v, true);
      expect(count(h), v).toBe(1);
      const pro = h.slice(h.indexOf('data-plan="pro"'), h.indexOf('data-plan="founding"'));
      expect(count(pro)).toBe(1);
    }
  });
});

describe("plans v3 — the ✨", () => {
  it("exactly one per state, and it is aria-hidden", () => {
    for (const v of VIEWERS) for (const s of [false, true]) {
      const h = html(v, s);
      expect((h.match(/✨/g) ?? []).length, `${v} sell=${s}`).toBe(1);
      expect(h).toContain('<span aria-hidden="true">✨ </span>');
    }
  });
  /* ⚠️ THE BRIEF SAID THIS IS THE APP'S ONLY EMOJI; IT IS NOT. To-do's Housekeeping sweep already draws ✨ twice (live)
     and Queries.tsx carries one behind a `false ?` — both pages this run may not touch. So the lock is the census as
     it stands: no file outside these three may gain one. */
  it("…and no other file gains one", () => {
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|css|html)$/.test(f) && !/\.test\.tsx?$/.test(f)) {
          const s = readFileSync(p, "utf8");
          if (s.includes("✨") || /\\u2728|&#x2728;|&#10024;/i.test(s)) hits.push(p);
        }
      }
    };
    walk("src");
    expect(hits.sort()).toEqual([
      join("src", "components", "PlansPage.tsx"),
      join("src", "components", "Queries.tsx"),
      join("src", "components", "todo", "HousekeepingSweep.tsx"),
    ]);
  });
});

describe("plans v3 — numbers are read, never typed", () => {
  const src = readFileSync("src/components/PlansPage.tsx", "utf8");
  it("no price, trial length or cap appears as a literal in the page's copy", () => {
    for (const lit of ["£3.75", "£7.99", "£0", "14 days", "first 50", "All 50", "1, 3, 6 or 12"]) expect(src, lit).not.toContain(lit);
  });
});
