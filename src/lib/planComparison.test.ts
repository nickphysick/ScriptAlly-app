/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * planComparison — the grammar rule, the entitlement reconciliation, and the two claims the table
 * must not make.
 */
import { describe, it, expect } from "vitest";
import { PLAN_ROWS, PLAN_CTA_LABEL, PlanCell, planAllowanceLine, isStandingCapacity } from "./planComparison";
import { getSmartImportEntitlement } from "./smartImportEntitlement";
import { UserPlan } from "../types";
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

/* ⚠️ THE ROW IS RECONCILED AGAINST THE DERIVATION THE SERVER ENFORCES, not against a literal
   typed twice. `getSmartImportEntitlement` is the policy `smartImportMap` mirrors; if it ever
   stops allowing a fresh Free account exactly one, or a Pro account one per month, this fails —
   which is the only way the table can be kept honest without someone remembering to look. */
describe("Smart Import states the entitlement the server actually enforces", () => {
  const R = row("Smart Import");

  it("is stated as figures, because it is an allowance", () => {
    expect(R.free.kind).toBe("figure");
    expect(R.pro.kind).toBe("figure");
  });

  it("Free is once for the lifetime of the account — not 'at sign-up', and not unlimited", () => {
    expect(getSmartImportEntitlement(UserPlan.FREE, null).allowed).toBe(true);
    expect(getSmartImportEntitlement(UserPlan.FREE, { smartImportFreeUsed: true }).allowed).toBe(false);
    expect((R.free as { text: string }).text).toBe("One import");
  });

  it("Pro is one per calendar month, so the table must not say Unlimited", () => {
    const now = new Date("2026-08-20T00:00:00Z");
    expect(getSmartImportEntitlement(UserPlan.PRO, null, now).allowed).toBe(true);
    expect(
      getSmartImportEntitlement(UserPlan.PRO, { smartImportLastUsedMonth: "2026-08" }, now).allowed,
    ).toBe(false);
    expect((R.pro as { text: string }).text).toBe("One a month");
    expect((R.pro as { text: string }).text.toLowerCase()).not.toContain("unlimited");
  });
});

/* ⚠️ TWO ROWS THAT ARE NOT GATED, AND MUST NOT BE ADVERTISED AS IF THEY WERE. Neither
   SubmissionPackages.tsx nor DiscoverNewAgents.tsx references isProUser or UserPlan.PRO, and the
   locked marketing copy lists submission packages under FREE. The old PlansPage table claimed
   both as Pro-only. If either becomes Pro, the gate goes in the code first and this test is what
   fails to remind whoever changes the table. */
describe("no row advertises a gate the code does not enforce", () => {
  it("Submission Packages is available on both plans", () => {
    expect(row("Submission Packages").free.kind).toBe("included");
    expect(row("Submission Packages").pro.kind).toBe("included");
  });

  it("Agent Discovery is available on both plans", () => {
    expect(row("Agent Discovery").free.kind).toBe("included");
    expect(row("Agent Discovery").pro.kind).toBe("included");
  });

  it("and the free tier's marketing copy agrees about packages", () => {
    const free = PRICING_TIERS.find((t) => t.key === "free")!;
    expect(free.includes.join(" ").toLowerCase()).toContain("submission packages");
  });
});

describe("the genuinely gated pair", () => {
  it("Smart Email Drop and The Comp Scout are Pro-only", () => {
    for (const label of ["Smart Email Drop", "The Comp Scout"]) {
      expect(row(label).free.kind, label).toBe("absent");
      expect(row(label).pro.kind, label).toBe("included");
    }
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
  it("the Pro price is whatever landingCopy says, and it says there is no path yet", () => {
    const pro = PRICING_TIERS.find((t) => t.key === "pro")!;
    expect(pro.price).toBe("Price to be confirmed");
    expect(pro.priceNote).toContain("no payment path");
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
    for (const word of ["remaining", "you have used", "of your", "left this"]) {
      expect(text, word).not.toContain(word);
    }
  });
});

/* ⚠️ THE ASIDE'S LINE IS THE TABLE'S OWN DATA, and these assertions are what stop it becoming a
   second hand-written feature list in the rail. */
describe("planAllowanceLine — the rail aside reads the comparison, it does not restate it", () => {
  it("states the standing capacities, singular where the figure is one", () => {
    expect(planAllowanceLine("free")).toBe("1 manuscript · unlimited agents · unlimited queries");
    expect(planAllowanceLine("pro")).toBe("unlimited manuscripts · unlimited agents · unlimited queries");
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
