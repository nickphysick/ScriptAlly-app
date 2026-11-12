/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * planComparison — the grammar rule, the entitlement reconciliation, and the two claims the table
 * must not make.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  PLAN_ROWS, PLAN_GROUPS, PLAN_DIFFERS, DIFFERING_ROWS, rowDiffers, PLAN_CTA_LABEL, PlanCell, planAllowanceLine, isStandingCapacity,
} from "./planComparison";
import { PRO_FEATURES, PRO_FROM_LINE } from "./planRules";
import { PRICING_TIERS } from "../marketing/landingCopy";

const kinds = (c: PlanCell) => c.kind;
const row = (label: string) => {
  const r = PLAN_ROWS.find((x) => x.label === label);
  if (!r) throw new Error(`no row "${label}" — the table's labels are the test's anchors`);
  return r;
};

describe("the grammar rule — figures OR marks, never both in one row", () => {
  it("every row states one kind of thing on both sides", () => {
    for (const r of PLAN_ROWS) {
      const free = kinds(r.free) === "figure";
      const pro = kinds(r.pro) === "figure";
      expect(free, `${r.label}: an allowance on one side and a capability on the other`).toBe(pro);
    }
  });

  it("no row is absent on both sides — that row would say nothing", () => {
    for (const r of PLAN_ROWS) {
      expect(r.free.kind === "absent" && r.pro.kind === "absent", r.label).toBe(false);
    }
  });

  it("labels are unique, so a row can be found by its name", () => {
    expect(new Set(PLAN_ROWS.map((r) => r.label)).size).toBe(PLAN_ROWS.length);
  });
});

/* PLAN RULES v1 — THE TABLE IS THE REF'S, ROW FOR ROW. The ref's own GROUPS literal is read out of
   design-refs/plan-table-v1.html (its SHA256 checked first), so the table cannot drift from it unnoticed. */
describe("the table is design-refs/plan-table-v1.html, exactly", () => {
  const html = readFileSync(new URL("../../design-refs/plan-table-v1.html", import.meta.url), "utf8");
  it("the ref is the one the plan rules name", () => {
    expect(createHash("sha256").update(html).digest("hex")).toBe("cf5ae3db5248d4158fc2a9d97cf781faf175374f5328acd8cfbde8bb06b2db64");
  });
  const literal = html.slice(html.indexOf("const GROUPS = [") + "const GROUPS = ".length, html.indexOf("];\nconst S =") + 1);
  // eslint-disable-next-line no-new-func
  const REF = new Function(`return ${literal}`)() as [string, [string, string, string | number, string | number][]][];
  const cellOf = (v: string | number): PlanCell => (v === 1 ? { kind: "included" } : v === 0 ? { kind: "absent" } : { kind: "figure", text: String(v) });

  it("groups, labels, descriptions and both cells", () => {
    expect(PLAN_GROUPS.map((g) => [g.group, g.rows.map((r) => [r.label, r.sub, r.free, r.pro])]))
      .toEqual(REF.map(([g, rows]) => [g, rows.map(([l, d, f, p]) => [l, d, cellOf(f), cellOf(p)])]));
  });

  it("seven rows differ, and they are exactly the Pro features the entitlement resolver gates", () => {
    expect(PLAN_DIFFERS).toBe(7);
    expect(PLAN_DIFFERS).toBe(REF.reduce((n, [, rows]) => n + rows.filter((r) => r[2] !== r[3]).length, 0));
    expect(DIFFERING_ROWS.map((r) => r.feature)).toEqual([...PRO_FEATURES]);
    expect(PLAN_ROWS.filter((r) => !rowDiffers(r)).every((r) => r.feature === undefined)).toBe(true);
  });

  it("there is no agent cap, and Smart Import is the same on both plans", () => {
    expect(row("Agents").free).toEqual({ kind: "figure", text: "Unlimited" });
    expect(rowDiffers(row("Smart Import"))).toBe(false);
  });
});

describe("the marketing copy reads the table", () => {
  it("Free's lists are the table's rows", () => {
    const free = PRICING_TIERS.find((t) => t.key === "free")!;
    expect(free.excludes!.map((e) => e.label)).toEqual(DIFFERING_ROWS.map((r) => r.label));
    expect(free.includes).not.toContain("Submission packages");
    expect(free.includes.join(" ")).not.toMatch(/twenty|20 agents/i);
  });
  it("Pro's list is everything in Free plus the seven", () => {
    const pro = PRICING_TIERS.find((t) => t.key === "pro")!;
    expect(pro.includes).toEqual(["Everything in Free", ...DIFFERING_ROWS.map((r) => r.label)]);
  });
});

describe("the CTA cannot promise a purchase that has no path", () => {
  it("does not say Upgrade, Buy or Subscribe", () => {
    expect(PLAN_CTA_LABEL).toBe("See Pro plans");
    for (const word of ["upgrade", "buy", "subscribe", "checkout", "pay"]) {
      expect(PLAN_CTA_LABEL.toLowerCase(), word).not.toContain(word);
    }
  });

  /* The price the card renders is the locked marketing copy's, and today that copy says there is
     no payment path. The card must never contradict it. */
  it("the Pro price is the plan rules' — from £3.75 a month, four lengths — and it says there is no path yet", () => {
    const pro = PRICING_TIERS.find((t) => t.key === "pro")!;
    expect(pro.price).toBe(PRO_FROM_LINE);
    expect(pro.price).toBe("from £3.75 a month");
    expect(pro.priceNote).toBe("1, 3, 6 or 12 months");
    const free = PRICING_TIERS.find((t) => t.key === "free")!;
    expect(free.price).toBe("£0");
    expect(free.priceNote).toBe("First 14 days are Pro");
    const after = pro.after.map((r) => (typeof r === "string" ? r : "b" in r ? r.b : "")).join("");
    expect(after, "a price is not a payment path").toContain("Not on sale yet");
    expect(after).toContain("nothing changes on your account");
  });
});

/* ⚠️ NO PERSUASION, AND NO USAGE. Both are baked decisions: the card answers "what do I get" and
   nothing else. A later pass adding "Most popular" or a limits meter fails here. */
describe("the table sells nothing and counts nothing", () => {
  const text = JSON.stringify(PLAN_ROWS).toLowerCase();

  it("carries no persuasion words", () => {
    for (const word of ["most popular", "best value", "recommended", "save %", "only ", "just "]) {
      expect(text, word).not.toContain(word);
    }
  });

  it("states no usage against a limit", () => {
    /* "of your allowance", not "of your": the ref's own row is "Take a copy of your data". */
    for (const word of ["remaining", "you have used", "of your allowance", "left this"]) {
      expect(text, word).not.toContain(word);
    }
  });
});

/* ⚠️ THE ASIDE'S LINE IS THE TABLE'S OWN DATA, and these assertions are what stop it becoming a
   second hand-written feature list in the rail. */
describe("planAllowanceLine — the rail aside reads the comparison, it does not restate it", () => {
  it("states the standing capacities, singular where the figure is one", () => {
    expect(planAllowanceLine("free")).toBe("unlimited agents · unlimited queries and responses · 1 manuscript");
    expect(planAllowanceLine("pro")).toBe("unlimited agents · unlimited queries and responses · 1 manuscript");
  });

  /* Smart Import's figures carry a period — "1 (lifetime)", "1 a month" — so they are an allowance
     over time, not a capacity you hold, and they must not land in a list beside "1 manuscript". */
  it("leaves the metered allowance out, by the qualifier and not by its name", () => {
    for (const tier of ["free", "pro"] as const) {
      expect(planAllowanceLine(tier).toLowerCase()).not.toContain("smart import");
      expect(planAllowanceLine(tier)).not.toContain("(");
      expect(planAllowanceLine(tier)).not.toMatch(/\ba (month|lifetime)\b/);
    }
  });

  it("carries every standing-capacity row, so a new one joins without an edit here", () => {
    /* ⚠️ THE PREDICATE ITSELF, NOT A COPY OF IT. Re-typing the regex here made this a comparison
       of two hand-written rules, and it failed the moment the figures were reworded. */
    const standing = PLAN_ROWS.filter(
      (r) => r.free.kind === "figure" && isStandingCapacity((r.free as { text: string }).text),
    );
    expect(planAllowanceLine("free").split(" · ")).toHaveLength(standing.length);
  });
});
