/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shortcut guard (16 Nov) — modalOpen() counts a laid-out aria-modal element or open <dialog>, and never one that is,
 * or sits inside, something inert or aria-hidden="true". Report: reports/shortcut-guard-v1/REPORT.md.
 *
 * ⚠️ THIS SUITE RUNS IN NODE (no jsdom, nothing is laid out), so `document` is a stub: a handful of elements with
 * attributes, a parent and a stubbed rect. `closest` is implemented for the one selector the guard asks, and THROWS
 * on any other, so a guard that starts asking something else fails here instead of being answered wrongly.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { modalOpen } from "./shortcuts";

const HIDDEN_SEL = '[inert], [aria-hidden="true"]';
const MODAL_SEL = '[aria-modal="true"], dialog[open]';

class El {
  constructor(public tagName: string, public attrs: Record<string, string> = {}, public parent: El | null = null, public width = 520) {}
  getAttribute(k: string) { return k in this.attrs ? this.attrs[k] : null; }
  getBoundingClientRect() { return { width: this.width, height: this.width ? 300 : 0 }; }
  private hiddenSelf() { return "inert" in this.attrs || this.attrs["aria-hidden"] === "true"; }
  matchesModal() { return this.attrs["aria-modal"] === "true" || (this.tagName === "DIALOG" && "open" in this.attrs); }
  closest(sel: string): El | null {
    if (sel !== HIDDEN_SEL) throw new Error(`stub closest() asked an unexpected selector: ${sel}`);
    for (let e: El | null = this; e; e = e.parent) if (e.hiddenSelf()) return e;
    return null;
  }
}

function withDom(els: El[]) {
  vi.stubGlobal("document", {
    querySelectorAll: (sel: string) => {
      if (sel !== MODAL_SEL) throw new Error(`stub querySelectorAll() asked an unexpected selector: ${sel}`);
      return els.filter((e) => e.matchesModal());
    },
  });
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("modalOpen — what the plain-key shortcuts' guard counts as a modal", () => {
  it("an open, laid-out aria-modal element counts", () => {
    withDom([new El("DIV", { role: "dialog", "aria-modal": "true" })]);
    expect(modalOpen()).toBe(true);
  });

  it("one that is inert does not", () => {
    withDom([new El("DIV", { role: "dialog", "aria-modal": "true", inert: "" })]);
    expect(modalOpen()).toBe(false);
  });

  it('one with aria-hidden="true" does not', () => {
    withDom([new El("DIV", { role: "dialog", "aria-modal": "true", "aria-hidden": "true" })]);
    expect(modalOpen()).toBe(false);
  });

  it("one inside an inert ancestor does not", () => {
    const root = new El("DIV", { id: "root", inert: "" });
    const mid = new El("SECTION", {}, root);
    withDom([new El("ASIDE", { role: "dialog", "aria-modal": "true" }, mid)]);
    expect(modalOpen()).toBe(false);
  });

  it("an open <dialog> element counts", () => {
    withDom([new El("DIALOG", { open: "" })]);
    expect(modalOpen()).toBe(true);
  });

  it("none present returns false", () => {
    withDom([]);
    expect(modalOpen()).toBe(false);
  });

  it("an aria-modal element with no box still does not count (the rule this pass keeps)", () => {
    withDom([new El("DIV", { "aria-modal": "true" }, null, 0)]);
    expect(modalOpen()).toBe(false);
  });

  it("one hidden dialog does not mask an open one beside it", () => {
    withDom([new El("DIV", { "aria-modal": "true", inert: "", "aria-hidden": "true" }), new El("DIV", { "aria-modal": "true" })]);
    expect(modalOpen()).toBe(true);
  });
});
