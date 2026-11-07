/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do on the phone v1 — the list's order is the desktop's own groups, and the band's late count is the desktop header's.
 */
import { describe, expect, it } from "vitest";
import { WS_GROUPS, wsSections, type WsTask } from "./todoWs";
import { lateCount, phoneOrder, phoneSections, slotAnswer, slotWord } from "./todoPhone";

const t = (key: string, group: WsTask["group"], kind: WsTask["kind"], dueDays: number | null): WsTask =>
  ({ key, group, kind, dueDays, quietDays: null } as unknown as WsTask);

describe("the phone's To-do list reads the desktop's model", () => {
  const all = [t("a", "yours", "own", 3), t("b", "wait", "send", -2), t("c", "quiet", "quiet", null), t("d", "nudge", "nudge", -1), t("e", "wait", "offer", 1)];
  it("groups in WS_GROUPS order, empty groups left out", () => {
    const ids = phoneSections(all).map((s) => s.id);
    expect(ids).toEqual(WS_GROUPS.map((g) => g.id).filter((id) => id !== "house"));
  });
  it("the order is the desktop's own sections, flattened, and drops nothing", () => {
    expect(phoneOrder(all).map((x) => x.key)).toEqual(wsSections(all, "category").flatMap((s) => s.tasks).map((x) => x.key));
    expect(phoneOrder(all)).toHaveLength(all.length);
  });
  it("late: dated and past its date, Gone quiet excluded", () => {
    expect(lateCount(all)).toBe(2);
    expect(lateCount([t("q", "quiet", "quiet", -9)])).toBe(0);
  });
  it("a slot reads its word until answered, then the answer's first part", () => {
    expect(slotWord("mats", "What went with it?")).toBe("What went");
    expect(slotWord("zzz", "Something else entirely?")).toBe("Something else");
    expect(slotAnswer("Query letter, synopsis and full manuscript")).toBe("Query letter +2");
    expect(slotAnswer("Today, Saturday 7 November")).toBe("Today, Saturday 7 November");
  });
});
