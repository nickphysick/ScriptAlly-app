/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `todoPrefs.contacts` — the reader is total, every write is ONE dotted leaf (the settings-wipe law),
 * and the view toggle moves from sessionStorage to localStorage on first read.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  HK_VIEW_KEY, addMonths, contactPrefsOf, dayKey, laterPath, readHkView, settledPath, showAllPath,
  wishlistEveryPath, wishlistNextPath, writeHkView,
} from "./contactPrefs";
import { applyUserPaths } from "./userPaths";

const NOW = new Date(2026, 9, 4, 12);

describe("the reader", () => {
  it("is total: an absent map reads as defaults", () => {
    expect(contactPrefsOf(null, NOW)).toEqual({ later: {}, settled: [], wishlistEvery: 6, wishlistNextOn: null });
    expect(contactPrefsOf({ todoPrefs: {} }, NOW).wishlistEvery).toBe(6);
  });
  it("prunes an expired Later on read, keeps one still ahead, and refuses junk", () => {
    const p = contactPrefsOf({ todoPrefs: { contacts: { later: { a: "2026-10-04", b: "2026-10-05", c: "soon" as string } } } } as never, NOW);
    expect(p.later).toEqual({ b: "2026-10-05" });
  });
  it("only 3, 6 or 12 months", () => {
    expect(contactPrefsOf({ todoPrefs: { contacts: { wishlistEvery: 9 } } } as never, NOW).wishlistEvery).toBe(6);
    expect(contactPrefsOf({ todoPrefs: { contacts: { wishlistEvery: 12 } } } as never, NOW).wishlistEvery).toBe(12);
  });
});

describe("every write is one leaf under todoPrefs.contacts", () => {
  const user = { todoPrefs: { staleMonths: 4, noteboard: { order: ["n1"] }, manuscripts: { dismissedTiles: ["wordcount"] } } };
  it("Later writes today + 30 at one key, and leaves the other owners' sub-maps alone", () => {
    const paths = laterPath("ag1", "genres", NOW);
    expect(paths).toEqual({ "todoPrefs.contacts.later.ag1:genres": "2026-11-03" });
    const after = applyUserPaths(user, paths) as typeof user & { todoPrefs: { contacts: unknown } };
    expect(after.todoPrefs.noteboard).toEqual(user.todoPrefs.noteboard);
    expect(after.todoPrefs.manuscripts).toEqual(user.todoPrefs.manuscripts);
    expect(after.todoPrefs.staleMonths).toBe(4);
  });
  it("settled appends without duplicating", () => {
    const prefs = contactPrefsOf({ todoPrefs: { contacts: { settled: ["x:reply"] } } } as never, NOW);
    expect(settledPath(prefs, "y")).toEqual({ "todoPrefs.contacts.settled": ["x:reply", "y:reply"] });
    expect(settledPath(prefs, "x")).toEqual({ "todoPrefs.contacts.settled": ["x:reply"] });
  });
  it("the check-in's leaves", () => {
    expect(wishlistEveryPath(3)).toEqual({ "todoPrefs.contacts.wishlistEvery": 3 });
    expect(wishlistNextPath(contactPrefsOf(null, NOW), NOW)).toEqual({ "todoPrefs.contacts.wishlistNextOn": "2027-04-04" });
    expect(showAllPath()).toEqual({ "todoPrefs.contacts.later": {} });
  });
  it("months clamp to the last day", () => {
    expect(dayKey(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-28");
  });
});

describe("the view toggle's memory moves from session to local storage", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
  };
  const g = globalThis as unknown as { localStorage?: unknown; sessionStorage?: unknown };
  afterEach(() => { delete g.localStorage; delete g.sessionStorage; });
  it("takes an old sessionStorage value on first read, then deletes it", () => {
    const ls = mem(), ss = mem();
    g.localStorage = ls; g.sessionStorage = ss;
    ss.setItem(HK_VIEW_KEY, "agent");
    expect(readHkView()).toBe("agent");
    expect(ss.getItem(HK_VIEW_KEY)).toBeNull();
    expect(ls.getItem(HK_VIEW_KEY)).toBe("agent");
  });
  it("defaults to by missing detail, and persists a choice", () => {
    g.localStorage = mem(); g.sessionStorage = mem();
    expect(readHkView()).toBe("detail");
    writeHkView("agent");
    expect(readHkView()).toBe("agent");
  });
});
