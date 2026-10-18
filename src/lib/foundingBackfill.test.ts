/**
 * The founding-number backfill's plan (scripts/foundingBackfillPlan.mjs).
 */
import { describe, expect, it } from "vitest";
import { planFoundingBackfill } from "../../scripts/foundingBackfillPlan.mjs";

const t = (iso: string) => Date.parse(iso);

describe("the founding-number backfill plan", () => {
  it("numbers legacy confirmed writers in the order they confirmed, from 1", () => {
    const p = planFoundingBackfill([
      { id: "c", status: "verified", verifiedAt: t("2026-09-03") },
      { id: "a", status: "verified", verifiedAt: t("2026-09-01") },
      { id: "b", status: "verified", verifiedAt: t("2026-09-02") },
      { id: "p", status: "pending" },
    ]);
    expect(p.founding).toEqual([
      { id: "a", foundingNumber: 1 }, { id: "b", foundingNumber: 2 }, { id: "c", foundingNumber: 3 },
    ]);
    expect(p.counter.freedNumbers).toEqual([]);
  });

  it("leaves anyone already numbered alone, fills the lowest gaps first, and records the rest as freed", () => {
    const p = planFoundingBackfill([
      { id: "x", status: "verified", foundingNumber: 2, verifiedAt: t("2026-09-01") },
      { id: "y", status: "verified", foundingNumber: 5, verifiedAt: t("2026-09-02") },
      { id: "z", status: "verified", verifiedAt: t("2026-09-03") },
    ]);
    expect(p.founding).toEqual([{ id: "z", foundingNumber: 1 }]);
    expect(p.counter.freedNumbers).toEqual([3, 4]);
  });

  it("is idempotent: once everyone has a number, it plans nothing", () => {
    const once = planFoundingBackfill([
      { id: "a", status: "verified", verifiedAt: t("2026-09-01") },
      { id: "w", status: "waiting", spentAt: t("2026-09-05") },
    ]);
    const after = planFoundingBackfill([
      { id: "a", status: "verified", foundingNumber: once.founding[0].foundingNumber },
      { id: "w", status: "waiting", spentAt: t("2026-09-05"), reserveNumber: once.reserve[0].reserveNumber },
    ]);
    expect(after.founding).toEqual([]);
    expect(after.reserve).toEqual([]);
  });

  it("only confirmed waiting-list writers take reserve places, in the order they confirmed", () => {
    const p = planFoundingBackfill([
      { id: "late", status: "waiting", spentAt: t("2026-09-09") },
      { id: "early", status: "waiting", spentAt: t("2026-09-08") },
      { id: "joinedFull", status: "waiting", spentAt: null },
      { id: "had", status: "waiting", spentAt: t("2026-09-01"), reserveNumber: 1 },
    ]);
    expect(p.reserve).toEqual([{ id: "early", reserveNumber: 2 }, { id: "late", reserveNumber: 3 }]);
    expect(p.counter.reserveIssued).toBe(3);
  });

  it("an empty waitlist (live, 18 Oct) plans nothing", () => {
    const p = planFoundingBackfill([]);
    expect(p).toEqual({ founding: [], reserve: [], counter: { freedNumbers: [], reserveIssued: 0 }, verified: 0 });
  });
});
