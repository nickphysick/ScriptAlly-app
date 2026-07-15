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

  it("the question is ALWAYS 'What happened next?' (never status-specific)", () => {
    for (const status of Object.values(QS)) {
      if (queryBucket(status) === "closed") continue;
      expect(composerChips(status).question).toBe("What happened next?");
    }
  });

  it("Full Requested → [Full sent (primary/pink), Rejection (terminal/grey)]", () => {
    const { chips } = composerChips(QS.FULL_REQUESTED);
    expect(chips.map((c) => c.label)).toEqual(["Full sent", "Rejection"]);
    expect(chips[0].tone).toBe("primary");
    expect(chips[1].tone).toBe("terminal");
  });

  it("Queried → Partial requested (pink) + Rejection (grey) + Nudge; Full requested demoted to Other", () => {
    const { chips, otherChips } = composerChips(QS.QUERIED);
    expect(chips.map((c) => c.label)).toEqual(["Partial requested", "Rejection", "Nudge"]);
    expect(chips.map((c) => c.tone)).toEqual(["primary", "terminal", "nudge"]);
    expect(chips[0].dotStatus).toBe(QS.PARTIAL_REQUESTED);
    // The implausible jump lives under "Other… (less likely from here)".
    expect(otherChips.map((c) => c.label)).toEqual(["Full requested"]);
  });

  it("Full Sent → Offer (pink), R&R, Rejection, then the Nudge chip; nothing under Other", () => {
    const { chips, otherChips } = composerChips(QS.FULL_SENT);
    expect(chips.map((c) => c.label)).toEqual(["Offer", "Revise & resubmit", "Rejection", "Nudge"]);
    expect(chips.slice(0, 3).map((c) => c.tone)).toEqual(["primary", "outcome", "terminal"]);
    expect(otherChips).toEqual([]);
  });

  it("the Nudge chip appears ONLY while waiting on the agent — never on a move/closed status, and it's not a status change", () => {
    for (const status of Object.values(QS)) {
      const has = composerChips(status).chips.some((c) => c.key === "nudge");
      expect(has).toBe(queryBucket(status) === "waiting");
    }
    const nudge = composerChips(QS.QUERIED).chips.find((c) => c.key === "nudge")!;
    expect(nudge.action).toEqual({ kind: "nudge" }); // fires the nudge flow, NOT a QueryStatus change
    expect(nudge.tone).toBe("nudge");
  });

  it("Rejection is ALWAYS the grey terminal chip, wherever it appears", () => {
    for (const status of Object.values(QS)) {
      const rej = composerChips(status, { canCloseNoResponse: true }).chips.find((c) => c.key === "rejected");
      if (rej) expect(rej.tone).toBe("terminal");
    }
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

  it("offers a sane chip count (1–5 incl. the nudge + optional no-response chips)", () => {
    for (const status of Object.values(QS)) {
      const n = composerChips(status, { canCloseNoResponse: true }).chips.length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});
