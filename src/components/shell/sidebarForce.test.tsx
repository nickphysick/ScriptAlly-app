/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The sidebar hold (a full-screen list holds the sidebar at its icons) and the shared strip.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { holdSidebarCollapsed, releaseSidebarHolds, sidebarHeld, subscribeSidebarHold } from "./sidebarForce";
import { GlanceStrip } from "./strip/GlanceStrip";

describe("the sidebar hold", () => {
  it("is held while any page holds it, and a release is counted once", () => {
    expect(sidebarHeld()).toBe(false);
    let calls = 0;
    const off = subscribeSidebarHold(() => { calls++; });
    const a = holdSidebarCollapsed(), b = holdSidebarCollapsed();
    expect(sidebarHeld()).toBe(true);
    a(); a();
    expect(sidebarHeld(), "the second hold is still on").toBe(true);
    b();
    expect(sidebarHeld()).toBe(false);
    expect(calls).toBe(4);
    off();
  });
  it("the writer's own toggle drops every hold", () => {
    const a = holdSidebarCollapsed();
    releaseSidebarHolds();
    expect(sidebarHeld()).toBe(false);
    a();
    expect(sidebarHeld()).toBe(false);
  });
  it("a hold is read, never written: the hook's stored choice is untouched by it", () => {
    const hook = readFileSync("src/components/shell/useSidebarCollapsed.ts", "utf8");
    /* RETARGETED (v138.6 §A): `ready` now also drops for a restored hold's two frames (no transition); the hold is
       still only ever READ into `collapsed` */
    expect(hook).toContain("return { collapsed: collapsed || held, toggle, setCollapsed, ready: ready && !instant };");
    const force = readFileSync("src/components/shell/sidebarForce.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(force).not.toMatch(/localStorage|setItem/);
  });
  it("the full-screen hook holds it only while the list is full screen, and leaves on Escape last", () => {
    const hook = readFileSync("src/components/shell/useFullScreenList.ts", "utf8");
    /* RETARGETED (v138.6 §A): a pin holds in a layout effect (before the first paint) and a plain full screen
       (Comparable titles) as before; both only while `full` */
    expect(hook).toContain("if (!o.pin || !full) return undefined;");
    expect(hook).toContain("return holdSidebarCollapsed({ instant });");
    expect(hook).toContain("useEffect(() => (!o.pin && full ? holdSidebarCollapsed() : undefined), [full, o.pin]);");
    expect(hook).toContain("ESC_LEVEL.pageMode");
    const esc = readFileSync("src/lib/escapeStack.ts", "utf8");
    const level = (k: string) => Number(new RegExp(`\\b${k}: (\\d+),`).exec(esc)![1]);
    for (const k of ["page", "pageDrawer", "pageModal", "card", "drawer"]) expect(level("pageMode"), `pageMode is under ${k}`).toBeLessThan(level(k));
  });
});

describe("the shared strip", () => {
  const cells = [1, 2, 3, 4].map((n) => ({ k: `c${n}`, label: `Label ${n}`, figure: n, line: <>line {n}</>, foot: <i>foot</i>, pressed: n === 2, onPress: () => {} }));
  const html = (loading: boolean) => renderToStaticMarkup(<GlanceStrip probe="t" heading="At a glance" tag="Tag" hint="Hint" loading={loading} cells={cells} />);
  it("draws a heading, a tag, a hint and one pressable cell each", () => {
    const h = html(false);
    expect(h).toContain(">At a glance</h2>");
    expect((h.match(/data-gst-cell=/g) ?? []).length).toBe(4);
    expect((h.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
    expect(h).not.toContain("gst-blank");
  });
  it("a loading cell keeps its figure, line and foot boxes, blank and disabled", () => {
    const h = html(true);
    expect((h.match(/data-gst-fig=/g) ?? []).length).toBe(4);
    expect((h.match(/data-gst-line=/g) ?? []).length).toBe(4);
    expect((h.match(/data-gst-foot=/g) ?? []).length).toBe(4);
    expect((h.match(/gst-blank/g) ?? []).length).toBe(12);
    expect((h.match(/disabled=""/g) ?? []).length).toBe(4);
    expect(h).toContain('data-loading="true"');
  });
});
