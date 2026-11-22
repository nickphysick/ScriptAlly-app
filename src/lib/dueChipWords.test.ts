/* Consolidate and finish v1, B5 — the phone task screen no longer rewrites a chip ending in "late": dueChip never says
   it. This lock is the proof the deleted rewrite could not fire. */
import { describe, expect, it } from "vitest";
import { dueChip, type WsTask } from "./todoWs";

describe("dueChip's words", () => {
  it("never end in \"late\" (past a date it says \"past expected\")", () => {
    const base = { kind: "nudge", title: "t" } as unknown as WsTask;
    for (const dueDays of [-40, -1, 0, 1, 12]) {
      const c = dueChip({ ...base, dueDays } as WsTask);
      expect(c && c.s, String(dueDays)).not.toMatch(/late$/);
    }
    expect(dueChip({ ...base, dueDays: -3 } as WsTask)?.s).toBe("days past expected");
  });
});
