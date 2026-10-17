/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import {
  CONTACT_CHECKLIST, cardPlace, contactGuideOf, doneCount, guideDonePath, holeFor, nextUndone, scrollDelta,
} from "./pageChecklist";
import type { User } from "../types";

const user = (guide: unknown) => ({ todoPrefs: { contacts: { guide } } }) as unknown as User;

describe("pageChecklist (v18.3 §F)", () => {
  it("the Contact list's five items, in order", () => {
    expect(CONTACT_CHECKLIST.map((i) => i.title)).toEqual([
      "Add an agent", "Search for an agent", "Open an agent's card", "Edit an agent", "Do some housekeeping",
    ]);
  });
  it("reads only true leaves as done, and the two flags", () => {
    const g = contactGuideOf(user({ done: { add: true, open: "yes", bogus: true }, seen: true }));
    expect(g.done).toEqual({ add: true });
    expect(g.seen).toBe(true);
    expect(g.hidden).toBe(false);
    expect(contactGuideOf(null)).toEqual({ done: {}, seen: false, hidden: false });
  });
  it("writes each tick as one dotted leaf", () => {
    expect(guideDonePath("hk")).toEqual({ "todoPrefs.contacts.guide.done.hk": true });
  });
  it("counts done and finds the next undone after an item, wrapping", () => {
    const done = { add: true, search: true } as const;
    expect(doneCount(CONTACT_CHECKLIST, done)).toBe(2);
    expect(nextUndone(CONTACT_CHECKLIST, done)?.key).toBe("open");
    expect(nextUndone(CONTACT_CHECKLIST, { ...done, open: true, edit: true }, "edit")?.key).toBe("hk");
    expect(nextUndone(CONTACT_CHECKLIST, { search: true, open: true, edit: true, hk: true }, "hk")?.key).toBe("add");
    expect(nextUndone(CONTACT_CHECKLIST, { add: true, search: true, open: true, edit: true, hk: true })).toBeNull();
  });
  it("the hole is 8px around the target, its radius min(14, half its height)", () => {
    expect(holeFor({ left: 100, top: 50, width: 80, height: 40 })).toEqual({ left: 92, top: 42, width: 96, height: 56, r: 14 });
    expect(holeFor({ left: 0, top: 0, width: 10, height: 4 }).r).toBe(10);
  });
  it("the step card goes under the hole, above it near the window's foot", () => {
    expect(cardPlace({ left: 100, top: 100, width: 80, height: 40 }, { width: 300, height: 120 }, 1500, 900)).toEqual({ left: 100, top: 152, up: false });
    expect(cardPlace({ left: 100, top: 800, width: 80, height: 40 }, { width: 300, height: 120 }, 1500, 900)).toEqual({ left: 100, top: 668, up: true });
    expect(cardPlace({ left: 1400, top: 100, width: 80, height: 40 }, { width: 300, height: 120 }, 1500, 900).left).toBe(1188);
  });
  it("scrolls only when the target is not wholly in view, to ~150 from the top", () => {
    expect(scrollDelta({ left: 0, top: 300, width: 10, height: 40 }, { top: 100, bottom: 900 })).toBe(0);
    expect(scrollDelta({ left: 0, top: 1200, width: 10, height: 40 }, { top: 100, bottom: 900 })).toBe(950);
  });
});
