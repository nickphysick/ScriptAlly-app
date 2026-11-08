/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crash reporting v1, Phase 1 — PageBoundary's own mechanics.
 *
 * ⚠️ THIS REPO HAS NO DOM, AND REACT'S SERVER RENDERER DOES NOT USE ERROR BOUNDARIES (a throw in
 * `renderToStaticMarkup` propagates; checked, 8 Nov). So "page A falls over while page B and the
 * sidebar keep working" is measured on the rendered app (tests/e2e/pageBoundary.measure.ts). What
 * is held here is everything that can be held without a DOM: the state machine, the fallback's
 * words and buttons, the reset rules for a page that stays mounted, the dev trigger, and that every
 * page slot in App.tsx is named.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { PageBoundary, PAGE_FALLBACK, PANEL_FALLBACK } from "./PageBoundary";
import * as reporting from "../lib/errorReporting";

type Inst = PageBoundary & { state: { failed: boolean; generation: number } };

/** An instance whose setState applies synchronously, so the class can be driven without mounting. */
function make(props: ConstructorParameters<typeof PageBoundary>[0]): Inst {
  const inst = new PageBoundary(props) as Inst;
  inst.setState = ((u: unknown) => {
    const next = typeof u === "function" ? (u as (s: Inst["state"]) => Partial<Inst["state"]>)(inst.state) : u;
    inst.state = { ...inst.state, ...(next as object) };
  }) as Inst["setState"];
  return inst;
}
const fail = (inst: Inst) => { inst.state = { ...inst.state, ...PageBoundary.getDerivedStateFromError() }; };
const html = (inst: Inst) => renderToStaticMarkup(<>{inst.render()}</>);

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as { window?: unknown }).window;
});

describe("PageBoundary — the page fallback", () => {
  it("renders the children until something throws", () => {
    const inst = make({ name: "queries", children: <p>the page</p> });
    expect(html(inst)).toBe("<p>the page</p>");
  });

  it("shows the page fallback, in the page's own words, with both buttons", () => {
    const inst = make({ name: "queries", children: <p>page contents</p> });
    fail(inst);
    const out = html(inst);
    expect(out).not.toContain("page contents");
    expect(out).toContain(PAGE_FALLBACK.heading);
    expect(out).toContain("The rest of QueryHawk is fine, and nothing you&#x27;d saved has been lost. Try loading the page again.");
    expect(out).toMatch(/<button[^>]*class="ph-primary"[^>]*>Try again<\/button>/);
    expect(out).toMatch(/<button[^>]*class="ph-secondary"[^>]*>Reload QueryHawk<\/button>/);
    expect(out).toContain('class="sp-card"');
    expect(out).toContain('data-boundary-fallback="queries"');
  });

  it("the panel fallback is one line with Close and Try again", () => {
    const inst = make({ name: "panel:query-drawer", kind: "panel", children: <p>drawer</p> });
    fail(inst);
    const out = html(inst);
    expect(out).toContain(PANEL_FALLBACK.line);
    expect(out).toBe(out.replace(PAGE_FALLBACK.heading, "")); // no page heading on a panel
    expect(out).toMatch(/>Close<\/button>/);
    expect(out).toMatch(/>Try again<\/button>/);
  });

  it("reports the catch with the page's name", () => {
    const spy = vi.spyOn(reporting, "reportBoundaryError").mockImplementation(() => {});
    const inst = make({ name: "agents" });
    inst.componentDidCatch(new Error("boom"));
    expect(spy).toHaveBeenCalledWith(expect.any(Error), { boundary: "agents" });
  });
});

describe("PageBoundary — reset, for a page that stays mounted", () => {
  it("Try again clears the failure and remounts the contents under a new key", () => {
    const inst = make({ name: "queries", children: <p>the page</p> });
    fail(inst);
    inst.reset();
    expect(inst.state).toEqual({ failed: false, generation: 1 });
    expect(html(inst)).toBe("<p>the page</p>");
  });

  it("leaving a crashed page resets it, so coming back finds a fresh page", () => {
    const inst = make({ name: "queries", active: false });
    fail(inst);
    inst.componentDidUpdate({ name: "queries", active: true });
    expect(inst.state.failed).toBe(false);
    expect(inst.state.generation).toBe(1);
  });

  it("the slot switching route resets it (the manuscripts slot holds three pages)", () => {
    const inst = make({ name: "packages", active: true });
    fail(inst);
    inst.componentDidUpdate({ name: "comps", active: true });
    expect(inst.state.failed).toBe(false);
  });

  it("a healthy page is not remounted by navigation", () => {
    const inst = make({ name: "queries", active: false });
    inst.componentDidUpdate({ name: "queries", active: true });
    expect(inst.state).toEqual({ failed: false, generation: 0 });
  });

  it("a crashed page that is still on screen is left showing its fallback", () => {
    const inst = make({ name: "queries", active: true });
    fail(inst);
    inst.componentDidUpdate({ name: "queries", active: true });
    expect(inst.state.failed).toBe(true);
  });

  it("Close on a panel resets it and calls the panel's own close", () => {
    const onClose = vi.fn();
    const inst = make({ name: "panel:agent-card", kind: "panel", onClose });
    fail(inst);
    (inst as unknown as { close: () => void }).close();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(inst.state.failed).toBe(false);
  });
});

describe("the dev crash trigger (non-production builds only)", () => {
  const at = (search: string) => { (globalThis as { window?: unknown }).window = { location: { search } }; };

  it("throws on render only in the boundary it names", () => {
    // ⚠️ names no other case resets: the trigger's "cleared" set is module state and lasts the file
    at("?qh-crash=trig-a");
    expect(() => renderToStaticMarkup(<PageBoundary name="trig-a"><p>q</p></PageBoundary>)).toThrow(/Test crash for "trig-a"/);
    expect(renderToStaticMarkup(<PageBoundary name="trig-b"><p>a</p></PageBoundary>)).toBe("<p>a</p>");
  });

  it("stops throwing once its boundary has reset, so Try again is seen to recover", () => {
    at("?qh-crash=trig-c");
    const inst = make({ name: "trig-c", children: <p>c</p> });
    expect(() => html(inst)).toThrow();
    fail(inst);
    inst.reset();
    expect(html(inst)).toBe("<p>c</p>");
  });
});

describe("App.tsx — every page slot is named, every panel is wrapped", () => {
  const app = readFileSync(join(__dirname, "..", "App.tsx"), "utf8");

  it("no StagePage is left without a name (so a new page cannot miss its boundary)", () => {
    const slots = app.match(/<StagePage\b[^>]*>/g) ?? [];
    expect(slots.length).toBeGreaterThanOrEqual(14);
    for (const s of slots) expect(s, s).toMatch(/\bname=/);
  });

  it("each drawer and dock outside the pages sits in a panel boundary", () => {
    for (const n of [/* the add-agent form is retired on this line */ "panel:add-manuscript", "panel:agent-card", "panel:query-drawer", "panel:undo-bar", "panel:paste-email"]) {
      expect(app).toContain(`name="${n}" kind="panel"`);
    }
    const shell = readFileSync(join(__dirname, "shell", "AppShell.tsx"), "utf8");
    expect(shell).toContain('name="panel:feedback" kind="panel"');
    const host = readFileSync(join(__dirname, "EditQueryHost.tsx"), "utf8");
    expect(host).toContain('name="panel:edit-query" kind="panel"');
  });

  it("the top-level boundary is still the last resort, around everything", () => {
    expect(app).toMatch(/export default function App\(\) \{\s*return \(\s*<ErrorBoundary>/);
  });
});
