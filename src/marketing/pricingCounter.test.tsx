/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pricing v4 — the founding box's counter WITH a figure in the store. Its own file because it mocks
 * `useFounding`, and that mock must not reach the page's other locks, which assert the no-figure
 * state. The store has no test hook by design (see the note at its foot).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());
vi.mock("./foundingStore", async (orig) => ({
  ...(await orig<typeof import("./foundingStore")>()),
  useFounding: () => ({ state: "idle", count: { claimed: 37, cap: 100 } }),
  ensureCount: () => {},
}));

import { renderPage, noNavigate } from "../test/pageSmoke";
import { PricingPage } from "./PricingPage";
import { sliceBetween } from "../test/sliceBetween";

describe("pricing v4: the counter, with a figure from the store", () => {
  it("draws the track and one line reading exactly '{n} places left'", () => {
    const box = sliceBetween(renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing"), '<section class="mk-fb"', 'class="mk-fbform"');
    const count = sliceBetween(box, 'class="mk-fbcount"', "</p>");
    expect(count).toContain('class="mk-fmbar"');
    expect(count, "the track carries the full figure for a screen reader").toContain('aria-label="37 of 100 places claimed"');
    expect(count).toContain('style="width:37%"');
    const line = /<p class="mk-fmmeta"[^>]*>([^<]*)$/.exec(count);
    expect(line, "the line renders").toBeTruthy();
    expect(line![1]).toBe("63 places left");
    expect(box).not.toContain("places claimed</");
    expect(box).not.toMatch(/no card needed/i);
  });
});
