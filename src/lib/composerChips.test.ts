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

  // ── TR P5 mappings ──────────────────────────────────────────────────────────────────────────
  it("your-move (Full Requested) → [Full sent (primary)]; Rejection under Other; Close query on canClose", () => {
    const { chips, otherChips } = composerChips(QS.FULL_REQUESTED);
    expect(chips.map((c) => c.label)).toEqual(["Full sent"]);
    expect(chips[0].tone).toBe("primary");
    // Rejection is no longer a primary chip — it tucks under Other.
    expect(otherChips.map((c) => c.label)).toEqual(["Rejection"]);
    expect(otherChips[0].tone).toBe("terminal");
    // Close query joins the primary row only when the caller offers it (your-move always can).
    const withClose = composerChips(QS.FULL_REQUESTED, { canClose: true });
    expect(withClose.chips.map((c) => c.label)).toEqual(["Full sent", "Close query"]);
    expect(withClose.chips[1].tone).toBe("close");
    expect(withClose.chips[1].action).toEqual({ kind: "close" });
  });

  it("Queried (waiting) → [Partial requested (primary), Nudge]; the rest incl. Rejection under Other", () => {
    const { chips, otherChips } = composerChips(QS.QUERIED);
    expect(chips.map((c) => c.label)).toEqual(["Partial requested", "Nudge"]);
    expect(chips.map((c) => c.tone)).toEqual(["primary", "nudge"]);
    expect(chips[0].dotStatus).toBe(QS.PARTIAL_REQUESTED);
    expect(otherChips.map((c) => c.label)).toEqual(["Full requested", "Offer", "Revise & resubmit", "Rejection"]);
    // Rejection stays the grey terminal chip wherever it lives.
    expect(otherChips.find((c) => c.key === "rejected")!.tone).toBe("terminal");
  });

  it("Queried + canClose → the Close query chip trails Partial requested · Nudge", () => {
    const { chips } = composerChips(QS.QUERIED, { canClose: true });
    expect(chips.map((c) => c.label)).toEqual(["Partial requested", "Nudge", "Close query"]);
    expect(chips[2].tone).toBe("close");
  });

  it("Partial Sent → [Full requested (primary), Nudge]; Offer · R&R · Rejection under Other", () => {
    const { chips, otherChips } = composerChips(QS.PARTIAL_SENT);
    expect(chips.map((c) => c.label)).toEqual(["Full requested", "Nudge"]);
    expect(otherChips.map((c) => c.label)).toEqual(["Offer", "Revise & resubmit", "Rejection"]);
  });

  it("Full Sent → [Offer (primary), Nudge]; R&R · Rejection under Other", () => {
    const { chips, otherChips } = composerChips(QS.FULL_SENT);
    expect(chips.map((c) => c.label)).toEqual(["Offer", "Nudge"]);
    expect(chips.map((c) => c.tone)).toEqual(["primary", "nudge"]);
    expect(otherChips.map((c) => c.label)).toEqual(["Revise & resubmit", "Rejection"]);
  });

  it("the Nudge chip reads 'Nudge' by default and 'Nudge again' once a future reminder is set", () => {
    expect(composerChips(QS.QUERIED).chips.find((c) => c.key === "nudge")!.label).toBe("Nudge");
    expect(composerChips(QS.QUERIED, { hasFutureReminder: true }).chips.find((c) => c.key === "nudge")!.label).toBe("Nudge again");
  });

  it("the Nudge chip appears ONLY while waiting on the agent — never move/closed, and it's not a status change", () => {
    for (const status of Object.values(QS)) {
      const has = composerChips(status).chips.some((c) => c.key === "nudge");
      expect(has).toBe(queryBucket(status) === "waiting");
    }
    const nudge = composerChips(QS.QUERIED).chips.find((c) => c.key === "nudge")!;
    expect(nudge.action).toEqual({ kind: "nudge" }); // fires the nudge flow, NOT a QueryStatus change
    expect(nudge.tone).toBe("nudge");
  });

  it("the Close query chip appears ONLY when the caller passes canClose (offered on move + overdue/grace)", () => {
    // waiting without the flag → no close chip (within-window has nothing late to close)
    expect(composerChips(QS.QUERIED).chips.some((c) => c.key === "close")).toBe(false);
    // waiting with the flag (overdue/grace) → the give-up close chip appears
    expect(composerChips(QS.QUERIED, { canClose: true }).chips.some((c) => c.key === "close")).toBe(true);
    // move with the flag → close chip appears (your-move offers it)
    expect(composerChips(QS.FULL_REQUESTED, { canClose: true }).chips.some((c) => c.key === "close")).toBe(true);
    // the close chip always carries the close action + the closed 'close' tone
    const close = composerChips(QS.QUERIED, { canClose: true }).chips.find((c) => c.key === "close")!;
    expect(close.action).toEqual({ kind: "close" });
    expect(close.tone).toBe("close");
  });

  it("Rejection is ALWAYS the grey terminal chip, wherever it appears (primary row or Other)", () => {
    for (const status of Object.values(QS)) {
      const m = composerChips(status, { canClose: true });
      const rej = [...m.chips, ...m.otherChips].find((c) => c.key === "rejected");
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

  it("offers a sane chip count (1–3 in the primary row: primary + nudge + close)", () => {
    for (const status of Object.values(QS)) {
      const n = composerChips(status, { canClose: true, hasFutureReminder: true }).chips.length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
  });
});
