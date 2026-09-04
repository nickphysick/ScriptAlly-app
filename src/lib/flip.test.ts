/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the FLIP helper. The suite runs in `node` with no DOM, so these drive the helper
 * through minimal fakes — which is enough, because what matters here is ORDER and SELECTIVITY:
 * that every element is settled before any rect is read, and that only cards which actually moved
 * are touched. Both are invisible failures in a real browser (the first animates nothing, the
 * second quietly costs frames), so they are exactly the things worth pinning down.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { clearFlip, measureFlip, playFlip } from "./flip";

interface FakeEl {
  dataset: { agentCard?: string };
  classList: { add: (c: string) => void; remove: (c: string) => void; has: (c: string) => boolean };
  style: Record<string, string>;
  getBoundingClientRect: () => { left: number; top: number };
  _classes: Set<string>;
  /** Was the element settled at the moment its rect was read? */
  settledWhenMeasured?: boolean;
}

const el = (id: string, left: number, top: number, log?: string[]): FakeEl => {
  const classes = new Set<string>();
  const e: FakeEl = {
    dataset: { agentCard: id },
    _classes: classes,
    classList: {
      add: (c) => { classes.add(c); log?.push(`settle:${id}`); },
      remove: (c) => { classes.delete(c); },
      has: (c) => classes.has(c),
    },
    style: {},
    getBoundingClientRect: () => {
      e.settledWhenMeasured = classes.has("sa-settled");
      log?.push(`measure:${id}`);
      return { left, top } as DOMRect;
    },
  };
  return e;
};

const container = (els: FakeEl[]) => ({ querySelectorAll: () => els }) as unknown as HTMLElement;

beforeEach(() => {
  // playFlip releases on the next frame; run it synchronously so the test can assert the result
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { cb(0); return 0; }) as typeof requestAnimationFrame;
});

describe("flip · SETTLE BEFORE MEASURE — the rule the helper exists to enforce", () => {
  it("every element carries sa-settled at the moment its rect is read", () => {
    const els = [el("a", 0, 0), el("b", 100, 0), el("c", 200, 0)];
    measureFlip(container(els));
    for (const e of els) {
      expect(
        e.settledWhenMeasured,
        "a card's position was measured while it still held a filled entrance animation — that animation outranks the inline transform, so the bump will silently do nothing and there is no error to find",
      ).toBe(true);
    }
  });

  it("EVERY element is settled before ANY is measured — not settled-then-measured one at a time", () => {
    const log: string[] = [];
    const els = [el("a", 0, 0, log), el("b", 100, 0, log), el("c", 200, 0, log)];
    measureFlip(container(els));
    const firstMeasure = log.findIndex((l) => l.startsWith("measure:"));
    const lastSettle = log.map((l) => l.startsWith("settle:")).lastIndexOf(true);
    expect(
      lastSettle,
      "settling was interleaved with measuring — adding a class can reflow, so a card measured before its neighbours settle records a position that is about to change",
    ).toBeLessThan(firstMeasure);
  });

  it("returns rects keyed by agent id, and ignores anything without one", () => {
    const keyed = el("a", 5, 6);
    const stray = el("", 0, 0);
    stray.dataset.agentCard = undefined;
    const rects = measureFlip(container([keyed, stray]));
    expect([...rects.keys()]).toEqual(["a"]);
    expect(rects.get("a")).toMatchObject({ left: 5, top: 6 });
  });

  it("an absent container is not an error — it measures nothing", () => {
    expect(measureFlip(null).size).toBe(0);
  });
});

describe("flip · only the cards that MOVED are touched", () => {
  it("a displaced card is inverted then released; a card that stayed put is never styled", () => {
    const before = measureFlip(container([el("moved", 0, 0), el("still", 300, 0)]));
    // after the insert: "moved" has shifted a column right and a row down, "still" has not
    const after = [el("moved", 268, 120), el("still", 300, 0)];
    const n = playFlip(container(after), before);

    expect(n).toBe(1);
    expect(after[0].style.transform, "the displaced card was released without being inverted first — it will jump rather than travel").toBe("");
    expect(after[0].style.transition).toMatch(/transform 340ms/);
    expect(
      after[1].style.transition,
      "a card that never moved was given a transition and a transform — sixteen of those is how a bump starts dropping frames for no visual gain",
    ).toBeUndefined();
  });

  it("the inverted offset is the OLD position minus the new one", () => {
    globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame; // freeze before release
    const before = measureFlip(container([el("a", 300, 200)]));
    const after = [el("a", 100, 50)];
    playFlip(container(after), before);
    // sent back to where it was: +200 left, +150 top
    expect(after[0].style.transform).toBe("translate(200px, 150px)");
    expect(after[0].style.transition).toBe("none");
  });

  it("a card that is new since the measurement is left alone — it has its own arrival", () => {
    const before = measureFlip(container([el("old", 0, 0)]));
    const after = [el("brandnew", 0, 0), el("old", 268, 0)];
    const n = playFlip(container(after), before);
    expect(n).toBe(1);
    expect(after[0].style.transform, "the arriving card was also given a FLIP transform, so it both rises AND slides — two motions for one event").toBeUndefined();
  });

  it("does nothing when there was no measurement to compare against", () => {
    expect(playFlip(container([el("a", 0, 0)]), new Map())).toBe(0);
    expect(playFlip(null, new Map())).toBe(0);
  });
});

describe("flip · clearing up", () => {
  it("removes the settled class and every inline motion style", () => {
    const e = el("a", 0, 0);
    e.classList.add("sa-settled");
    e.style.transform = "translate(4px, 4px)";
    e.style.transition = "transform 340ms";
    clearFlip(container([e]));
    expect(e._classes.has("sa-settled")).toBe(false);
    expect(e.style.transform).toBe("");
    expect(e.style.transition).toBe("");
  });
});

/**
 * ⚠️ THE SECOND SURFACE — added when the Query Centre grid adopted this helper rather than growing
 * a parallel one. The `dataKey` option exists because the SELECTOR was already a parameter and the
 * KEY was not: a caller could pick its own elements and then read `undefined` for every one of
 * them, which returns an empty map, takes `playFlip`'s early return, and animates NOTHING with no
 * error to find. These assert that the option works AND that the default is untouched.
 */
describe("flip · a second surface brings its own key and its own curve", () => {
  const qccEl = (id: string, left: number, top: number) => {
    const classes = new Set<string>();
    const e = {
      dataset: { qccId: id } as Record<string, string>,
      classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c), has: (c: string) => classes.has(c) },
      style: {} as Record<string, string>,
      getBoundingClientRect: () => ({ left, top }) as DOMRect,
    };
    return e;
  };
  const box = (els: unknown[]) => ({ querySelectorAll: () => els }) as unknown as HTMLElement;

  it("reads the key it is given", () => {
    const els = [qccEl("q1", 0, 0), qccEl("q2", 100, 0)];
    const rects = measureFlip(box(els), { selector: "[data-qcc-id]", dataKey: "qccId" });
    expect([...rects.keys()]).toEqual(["q1", "q2"]);
  });

  it("⚠️ and settles them — the rule does not lapse for a caller that brings its own key", () => {
    const els = [qccEl("q1", 0, 0)];
    measureFlip(box(els), { selector: "[data-qcc-id]", dataKey: "qccId" });
    expect(els[0].classList.has("sa-settled")).toBe(true);
  });

  it("the default key is unchanged, so the agent list is byte-identical", () => {
    const els = [el("a", 0, 0)];
    expect([...measureFlip(container(els)).keys()]).toEqual(["a"]);
    /* Passing a bare selector string still works — the old signature is intact. */
    expect([...measureFlip(container(els), "[data-agent-card]").keys()]).toEqual(["a"]);
  });

  it("⚠️ a mismatched key animates nothing, which is why the two are one option", () => {
    const els = [qccEl("q1", 0, 0)];
    /* The wrong key: elements found, none identified. This is the silent failure, pinned. */
    expect(measureFlip(box(els), { selector: "[data-qcc-id]" }).size).toBe(0);
  });

  it("the caller's easing reaches the transition, and the default is left alone", () => {
    const before = measureFlip(box([qccEl("q1", 0, 0)]), { selector: "[data-qcc-id]", dataKey: "qccId" });
    const moved = qccEl("q1", 50, 0);
    playFlip(box([moved]), before, {
      selector: "[data-qcc-id]", dataKey: "qccId", easing: "cubic-bezier(.2,.7,.2,1)", durationMs: 340,
    });
    expect(moved.style.transition).toBe("transform 340ms cubic-bezier(.2,.7,.2,1)");

    const b2 = measureFlip(container([el("a", 0, 0)]));
    const m2 = el("a", 50, 0);
    playFlip(container([m2]), b2);
    expect(m2.style.transition, "the default curve moved").toContain("cubic-bezier(.4, 0, .2, 1)");
  });

  it("⚠️ still touches nothing that did not move — selectivity survives the new option", () => {
    const before = measureFlip(box([qccEl("q1", 0, 0)]), { selector: "[data-qcc-id]", dataKey: "qccId" });
    const same = qccEl("q1", 0, 0);
    const n = playFlip(box([same]), before, { selector: "[data-qcc-id]", dataKey: "qccId" });
    expect(n, "an unmoved card was given a transform").toBe(0);
    expect(same.style.transform).toBeUndefined();
  });
});
