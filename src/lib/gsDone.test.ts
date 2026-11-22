/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Consistency wrap-up v1 (Nick's ruling, 22 Nov 2026): `getting_started_done` is logged when the last Getting started row
 * ticks, once per account. `lastStepTicked` is the decision; Dash58's Part I effect is the one caller (events.test.ts
 * holds it to exactly one place), and `todoPrefs.dash.gsDone` is the once-per-account flag.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { lastStepTicked, dashPrefsOf, gsDoneWrite } from "./dashFirstVisit";
import type { User } from "../types";

const rows = (done: Record<string, boolean>) => Object.entries(done).map(([key, d]) => ({ key, done: d }));

describe("getting_started_done — the last step ticked", () => {
  it("fires when a row ticks and with it every row is done", () => {
    expect(lastStepTicked(new Set(["book", "agent"]), rows({ book: true, agent: true, query: true }))).toBe(true);
  });
  it("not on the first loaded pass (rows already done when the page loads are not ticks)", () => {
    expect(lastStepTicked(null, rows({ book: true, agent: true, query: true }))).toBe(false);
  });
  it("not while a row is still undone", () => {
    expect(lastStepTicked(new Set(["book"]), rows({ book: true, agent: true, query: false }))).toBe(false);
  });
  it("not when nothing ticked (all done before, all done now)", () => {
    expect(lastStepTicked(new Set(["book", "agent", "query"]), rows({ book: true, agent: true, query: true }))).toBe(false);
  });
  it("not with no rows", () => {
    expect(lastStepTicked(new Set(), [])).toBe(false);
  });
});

describe("getting_started_done — once per account", () => {
  it("the flag is todoPrefs.dash.gsDone, read as a boolean", () => {
    expect(gsDoneWrite()).toEqual({ "todoPrefs.dash.gsDone": true });
    expect(dashPrefsOf({ todoPrefs: { dash: { gsDone: true } } } as unknown as User).gsDone).toBe(true);
    expect(dashPrefsOf({ todoPrefs: { dash: {} } } as unknown as User).gsDone).toBe(false);
    expect(dashPrefsOf({ todoPrefs: { dash: { gsDone: "yes" } } } as unknown as User).gsDone).toBe(false);
  });
  it("Dash58 logs it only when the flag is unset, writes the flag, and logs it from the tick effect", () => {
    const src = readFileSync(resolve(__dirname, "../components/dashboard/v58/Dash58.tsx"), "utf8");
    const at = src.indexOf('logEvent(currentUser.id, "getting_started_done"');
    expect(at).toBeGreaterThan(0);
    const block = src.slice(src.lastIndexOf("if (onPrefs && !prefs.gsDone", at), at);
    expect(block).toMatch(/!gsDoneSent\.current && lastStepTicked\(gsSeen\.current, gsRows\)/);
    expect(block).toMatch(/void onPrefs\(gsDoneWrite\(\)\)/);
    /* inside the Part I effect, before gsSeen moves on */
    expect(at).toBeGreaterThan(src.indexOf("const gsSeen = useRef"));
    expect(at).toBeLessThan(src.indexOf("gsSeen.current = done;"));
  });
});
