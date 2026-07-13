import { describe, it, expect } from "vitest";
import { composerChips } from "./composerChips";
import { getPrimaryAction } from "./queryPrimaryAction";
import { queryBucket } from "./queryAmbient";
import { QueryStatus as QS } from "../types";

describe("composerChips — derived from the CTA engine, cannot disagree", () => {
  it("the writer's-turn primary chip IS getPrimaryAction's mark-sent target (same source)", () => {
    for (const status of Object.values(QS)) {
      if (queryBucket(status) !== "move") continue;
      const pa = getPrimaryAction(status);
      expect(pa.kind).toBe("mark-sent"); // every "move" status is a mark-sent per the CTA engine
      const { chips } = composerChips(status);
      const primary = chips.find((c) => c.tone === "primary");
      expect(primary).toBeDefined();
      expect(primary!.action).toEqual({ kind: "mark-sent", markKind: pa.kind === "mark-sent" ? pa.markKind : undefined });
    }
  });

  it("Full Requested → [Full sent (primary), Rejection] (prototype)", () => {
    const { question, chips } = composerChips(QS.FULL_REQUESTED);
    expect(question).toContain("full");
    expect(chips.map((c) => c.label)).toEqual(["Full sent", "Rejection"]);
    expect(chips[0].tone).toBe("primary");
  });

  it("Queried → [Partial requested, Full requested, Rejection] (prototype)", () => {
    const { question, chips } = composerChips(QS.QUERIED);
    expect(question).toBe("What happened next?");
    expect(chips.map((c) => c.label)).toEqual(["Partial requested", "Full requested", "Rejection"]);
  });

  it("Full Sent → [Revise & resubmit, Offer, Rejection] (prototype)", () => {
    const { chips } = composerChips(QS.FULL_SENT);
    expect(chips.map((c) => c.label)).toEqual(["Revise & resubmit", "Offer", "Rejection"]);
  });

  it("a closed query offers only Reopen", () => {
    for (const status of [QS.REJECTED, QS.WITHDRAWN, QS.NO_RESPONSE, QS.OFFER]) {
      const { chips } = composerChips(status);
      expect(chips).toHaveLength(1);
      expect(chips[0].action).toEqual({ kind: "reopen" });
    }
  });

  it("the No-response-close chip appears ONLY when the caller passes canCloseNoResponse", () => {
    const without = composerChips(QS.QUERIED).chips.map((c) => c.key);
    expect(without).not.toContain("no-response");
    const withFlag = composerChips(QS.QUERIED, { canCloseNoResponse: true }).chips.map((c) => c.key);
    expect(withFlag).toContain("no-response");
    // ...and never on a writer's-turn status (the writer owes materials, not a close decision)
    const move = composerChips(QS.FULL_REQUESTED, { canCloseNoResponse: true }).chips.map((c) => c.key);
    expect(move).not.toContain("no-response");
  });

  it("offers 2–4 chips for every status", () => {
    for (const status of Object.values(QS)) {
      const n = composerChips(status, { canCloseNoResponse: true }).chips.length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(4);
    }
  });
});
