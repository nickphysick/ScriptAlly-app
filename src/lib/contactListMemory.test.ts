/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactListMemory — v19 §G: the grouping, sort, direction and pin are remembered per device (`qh.cl.view`); the
 * filters, the "At a glance" group, the search and the scroll position for the visit. Both records are versioned and
 * validated on read, so a retired grouping, an unknown status, a wrong type or an older shape reads as the default —
 * never as a state nobody can see or clear. (Replaces v14–v16's one session record, `sa.contactList.v4`.)
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONTACT_PIN_STORE, DEFAULT_LIST_VIEW, DEFAULT_LIST_VISIT, LIST_VIEW_KEY, LIST_VIEW_VERSION, LIST_VISIT_KEY, LIST_VISIT_VERSION,
  OLD_PIN_KEYS, readListView, readListVisit, sanitiseListView, sanitiseListVisit, writeListView, writeListVisit,
} from "./contactListMemory";
import { emptyContactFilters } from "./contactList";

/** a Storage stand-in (the suite runs in node); `broken` throws on every call, as a blocked store does */
function memStore(broken = false): Storage {
  const m = new Map<string, string>();
  const no = () => { throw new Error("blocked"); };
  return {
    get length() { return m.size; },
    clear: () => (broken ? no() : m.clear()),
    getItem: (k: string) => (broken ? no() : m.get(k) ?? null),
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => (broken ? no() : void m.delete(k)),
    setItem: (k: string, v: string) => (broken ? no() : void m.set(k, String(v))),
  } as Storage;
}
const g = globalThis as unknown as { window?: { localStorage: Storage; sessionStorage: Storage } };
beforeEach(() => { g.window = { localStorage: memStore(), sessionStorage: memStore() }; });
afterEach(() => { delete g.window; });

describe("the view — per device (qh.cl.view)", () => {
  it("the key and its version", () => {
    expect(LIST_VIEW_KEY).toBe("qh.cl.view");
    expect(LIST_VIEW_VERSION).toBe(1);
  });
  it("a first ever visit reads unpinned, ungrouped, Surname A to Z", () => {
    expect(readListView()).toEqual({ group: "none", sort: "surname", reversed: false, pinned: false });
    expect(DEFAULT_LIST_VIEW()).toEqual(readListView());
  });
  it("it lives in localStorage, never sessionStorage", () => {
    writeListView({ group: "status", sort: "added", reversed: true, pinned: true });
    expect(g.window!.sessionStorage.length).toBe(0);
    expect(JSON.parse(g.window!.localStorage.getItem(LIST_VIEW_KEY)!)).toEqual({ v: 1, group: "status", sort: "added", reversed: true, pinned: true });
    expect(readListView()).toEqual({ group: "status", sort: "added", reversed: true, pinned: true });
  });
  it("a write is a patch over what is stored", () => {
    writeListView({ group: "country" });
    writeListView({ pinned: true });
    expect(readListView()).toEqual({ ...DEFAULT_LIST_VIEW(), group: "country", pinned: true });
  });
  it("junk reads as the default, field by field; another version, or not JSON, reads as the defaults", () => {
    expect(sanitiseListView({ v: 1, group: "agency", sort: "due", reversed: "yes", pinned: 1 })).toEqual(DEFAULT_LIST_VIEW());
    expect(sanitiseListView({ v: 2, group: "status" })).toBeNull();
    expect(sanitiseListView({ group: "status" })).toBeNull();
    expect(sanitiseListView(null)).toBeNull();
    g.window!.localStorage.setItem(LIST_VIEW_KEY, "{not json");
    expect(readListView()).toEqual(DEFAULT_LIST_VIEW());
    g.window!.localStorage.setItem(LIST_VIEW_KEY, JSON.stringify({ v: 0, group: "status", pinned: true }));
    expect(readListView()).toEqual(DEFAULT_LIST_VIEW());
  });
  it("a pin stored under the old keys is migrated once into qh.cl.view, and the old keys removed", () => {
    for (const old of OLD_PIN_KEYS) {
      g.window = { localStorage: memStore(), sessionStorage: memStore() };
      g.window.localStorage.setItem(old, "1");
      expect(readListView().pinned).toBe(true);
      expect(g.window.localStorage.getItem(old)).toBeNull();
      expect(JSON.parse(g.window.localStorage.getItem(LIST_VIEW_KEY)!).pinned).toBe(true);
    }
    /* once qh.cl.view exists, an old key is not read again */
    g.window = { localStorage: memStore(), sessionStorage: memStore() };
    writeListView({ pinned: false });
    g.window.localStorage.setItem(OLD_PIN_KEYS[0], "1");
    expect(readListView().pinned).toBe(false);
  });
  it("the pin's store reads and writes the pinned flag in the view", () => {
    writeListView({ group: "status" });
    CONTACT_PIN_STORE.write(true);
    expect(CONTACT_PIN_STORE.read()).toBe(true);
    expect(readListView().group).toBe("status");
    CONTACT_PIN_STORE.write(false);
    expect(CONTACT_PIN_STORE.read()).toBe(false);
  });
  it("blocked storage: reads are the defaults and writes do not throw", () => {
    g.window = { localStorage: memStore(true), sessionStorage: memStore(true) };
    expect(readListView()).toEqual(DEFAULT_LIST_VIEW());
    expect(() => writeListView({ pinned: true })).not.toThrow();
    expect(readListVisit()).toBeNull();
    expect(() => writeListVisit({ search: "x" })).not.toThrow();
  });
});

describe("the visit — for the session (sa.contactList.v5)", () => {
  it("the key carries the shape's version", () => {
    expect(LIST_VISIT_KEY).toBe("sa.contactList.v5");
    expect(LIST_VISIT_VERSION).toBe(5);
  });
  it("a new visit has nothing stored: no filters, no search, at the top", () => {
    expect(readListVisit()).toBeNull();
    expect(DEFAULT_LIST_VISIT()).toEqual({ filters: emptyContactFilters(), search: "", glance: null, scroll: 0 });
  });
  it("it lives in sessionStorage, never localStorage, and a good value round-trips", () => {
    const m = {
      filters: { ...emptyContactFilters(), status: ["queried", "pr"], action: true, open: "open", queried: "no", mats: true, always: true, genres: ["thriller", "crime"], genreMode: "all" },
      search: "ell", glance: "live", scroll: 640,
    };
    writeListVisit(m as never);
    expect(g.window!.localStorage.length).toBe(0);
    expect(readListVisit()).toEqual(m);
  });
  it("a write is a patch: saving the scroll keeps the filters", () => {
    writeListVisit({ search: "vale" });
    writeListVisit({ scroll: 300 });
    expect(readListVisit()).toEqual({ ...DEFAULT_LIST_VISIT(), search: "vale", scroll: 300 });
  });
  it("an older shape (v4, which also held the grouping and sort) is refused whole", () => {
    expect(sanitiseListVisit({ v: 4, filters: {}, search: "x", group: "letter", sort: "reply" })).toBeNull();
    expect(sanitiseListVisit({ filters: {} })).toBeNull();
    g.window!.sessionStorage.setItem("sa.contactList.v4", JSON.stringify({ v: 4, search: "x" }));
    expect(readListVisit()).toBeNull();
  });
  it("junk reads as the default, field by field", () => {
    const r = sanitiseListVisit({
      v: 5, glance: "queried", scroll: -40,
      filters: { status: ["queried", "Offer", 3, "queried"], action: "yes", open: ["open"], queried: "maybe", stand: ["you"], genres: [1, "crime", ""], genreMode: "most" },
      search: 7,
    })!;
    expect(r.filters).toEqual({ ...emptyContactFilters(), status: ["queried"], genres: ["crime"] });
    expect(r.search).toBe("");
    expect(r.glance).toBeNull();
    expect(r.scroll).toBe(0);
    expect(sanitiseListVisit({ v: 5, scroll: "200" })!.scroll).toBe(0);
    expect(sanitiseListVisit({ v: 5, scroll: Number.NaN })!.scroll).toBe(0);
  });
});
