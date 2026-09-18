/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `dashSeen` — the per-device marker behind the feed's "new since you last looked" rule (v16, 18 Sep).
 *
 * ⚠️ THE CASES THAT MATTER ARE THE FAILURES, NOT THE ROUND TRIP. Private windows, cleared site data
 * and blocked storage all THROW on access rather than returning null, and a feed that cannot render
 * because a decoration's marker could not be read would be a page lost to a rust rule. Both accessors
 * are therefore exercised against a `localStorage` that throws, and against one that returns rubbish.
 *
 * ⚠️ THIS REPO'S TEST ENVIRONMENT IS `node` — there is no `window` — so each case installs one and
 * takes it away again. A leaked global would make the next suite's absence-of-window checks pass for
 * the wrong reason.
 */
import { describe, it, expect, afterEach } from "vitest";
import { DASH_SEEN_KEY, readSeenAt, writeSeenAt } from "./dashSeen";

type Store = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };
const install = (localStorage: Store) => {
  (globalThis as { window?: unknown }).window = { localStorage };
};
afterEach(() => { delete (globalThis as { window?: unknown }).window; });

const memory = (seed: Record<string, string> = {}) => {
  const map = new Map(Object.entries(seed));
  return {
    map,
    store: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
    },
  };
};

describe("the round trip", () => {
  it("writes a stamp and reads it back, under the house-prefixed key", () => {
    const { map, store } = memory();
    install(store);
    writeSeenAt(1_700_000_000_000);
    expect(map.get(DASH_SEEN_KEY)).toBe("1700000000000");
    expect(readSeenAt()).toBe(1_700_000_000_000);
    expect(DASH_SEEN_KEY).toBe("sa.dashSeenAt");
  });

  it("defaults to now", () => {
    const { store } = memory();
    install(store);
    const before = Date.now();
    writeSeenAt();
    expect(readSeenAt()!).toBeGreaterThanOrEqual(before);
  });
});

describe("⚠️ nothing here may throw, and nothing may return a wrong number", () => {
  it("a device that has never shown the page reads null", () => {
    install(memory().store);
    expect(readSeenAt()).toBeNull();
  });

  /* ⚠️ NULL, NOT NaN. `Number("")` is 0 and `Number("later")` is NaN; either handed to the feed as a
     timestamp would mark every entry in the window as new, or none of them, silently. */
  it("rubbish in storage reads null rather than a number", () => {
    for (const raw of ["", "later", "NaN", "0", "-1", "Infinity"]) {
      install(memory({ [DASH_SEEN_KEY]: raw }).store);
      expect(readSeenAt(), raw).toBeNull();
    }
  });

  it("storage that throws on read is a device that marks nothing", () => {
    install({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} });
    expect(() => readSeenAt()).not.toThrow();
    expect(readSeenAt()).toBeNull();
  });

  it("storage that throws on write is silent — the page is not lost to a decoration", () => {
    install({ getItem: () => null, setItem: () => { throw new Error("quota"); } });
    expect(() => writeSeenAt(1)).not.toThrow();
  });

  /* ⚠️ AND NO `window` AT ALL — server rendering reaches this module through the page's import graph,
     and a bare `window.localStorage` there is a ReferenceError rather than a caught exception. */
  it("no window at all is survivable in both directions", () => {
    expect(() => readSeenAt()).not.toThrow();
    expect(readSeenAt()).toBeNull();
    expect(() => writeSeenAt()).not.toThrow();
  });
});
