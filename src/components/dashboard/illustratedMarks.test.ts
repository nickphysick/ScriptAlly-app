/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ ILLUSTRATED MARKS — THREE TRAPS, NONE OF WHICH A GEOMETRY TEST CAN SEE.
 *
 * The artwork is drawn on WHITE PAPER, not transparency. Every failure below renders as a white
 * square on parchment — a visual fault that measures perfectly, which is why these assert the
 * mechanism rather than any dimension.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const bare = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const blk = (sel: string) => {
  const re = new RegExp(`(^|[}\\n])\\s*\\${sel}\\s*\\{([^}]*)\\}`, "m");
  const m = re.exec(bare);
  expect(m, `${sel} must exist as a rule of its own`).not.toBeNull();
  return m![2];
};

describe("trap 1 — the white field", () => {
  it("⚠️ the image multiplies, or it renders as a white square on parchment", () => {
    expect(blk(".os-mark-il img")).toContain("mix-blend-mode: multiply");
  });

  /**
   * ⚠️ ONE MARK IS EXEMPT, AND THE EXEMPTION IS NARROW BY CONSTRUCTION (audit pack P3).
   *
   * The Queries-sent plane is genuinely transparent, so multiply has no white field to remove and
   * darkens its watercolour wash instead. The rule above is NOT weakened to accommodate it — a
   * fourth line-drawn mark must still inherit multiply and still fail loudly without it. Both
   * halves are asserted: the default stands, and the exception is scoped to one selector.
   */
  it("⚠️ …except the painted plane, exempt BY SELECTOR rather than by relaxing the default", () => {
    expect(blk(".os-cic.plane img")).toContain("mix-blend-mode: normal");
    expect(blk(".os-mark-il img")).toContain("mix-blend-mode: multiply");
    expect(bare).not.toMatch(/\.os-mark-il img\s*\{[^}]*mix-blend-mode:\s*normal/);
  });

  it("⚠️ and it is BARE — no plate, no border, no fill behind it", () => {
    const w = blk(".os-mark-il");
    expect(w).not.toMatch(/background/);
    expect(w).not.toMatch(/border(?!-)/);
    // the old pink plate is gone, not merely overridden
    expect(blk(".os-cic")).not.toMatch(/background|border-radius:\s*50%/);
  });
});

describe("trap 2 — a transform on an ancestor isolates the blend", () => {
  it("⚠️ NO transform on either wrapper — that is what brings the white square back", () => {
    for (const sel of [".os-mark-il", ".os-cic", ".os-goalmark"]) {
      expect(blk(sel), `${sel} must not transform`).not.toMatch(/transform:/);
    }
  });

  it("⚠️ the optical nudge is position/top, NEVER translateY", () => {
    for (const sel of [".os-cic", ".os-goalmark"]) {
      const b = blk(sel);
      expect(b).toContain("position: relative");
      expect(b).toMatch(/top:\s*-2px/);
      expect(b).not.toMatch(/translate/);
    }
  });

  it("hover transforms live on the IMG", () => {
    expect(bare).toMatch(/\.os-counter:hover \.os-cic img\s*\{[^}]*transform/);
    expect(bare).toMatch(/\.os-goal:hover \.os-goalmark img\s*\{[^}]*transform/);
  });

  it("⚠️ THE ENTRANCE ANIMATION IS A TRANSFORM TOO — the marks wait for the card to land", () => {
    // `.enter` transforms the CARD, so for its duration every mark inside blends against
    // transparency. Hiding by OPACITY on the img creates no stacking context on the card.
    expect(bare).toMatch(/\.os-card\.enter \.os-mark-il img\s*\{[^}]*opacity:\s*0/);
  });
});

describe("trap 3 — the mark must not set the row's height", () => {
  it("the box is fixed and cannot shrink", () => {
    expect(blk(".os-mark-il")).toContain("flex-shrink: 0");
    expect(blk(".os-cic")).toMatch(/width:\s*44px/);
    expect(blk(".os-goalmark")).toMatch(/width:\s*34px/);
  });

  it("⚠️ the overhang is absorbed by a NEGATIVE margin, so the text owns the height", () => {
    expect(blk(".os-cic")).toMatch(/margin:\s*-8px 0/);
    expect(blk(".os-goalmark")).toMatch(/margin:\s*-6px 0/);
  });

  /* ⚠️ A BIGGER BOX MUST BRING A BIGGER ABSORPTION WITH IT, or the counters card grows. The plane
     is 54px against its siblings' 44, so its margin is -12px against their -8: 54 − 24 = 30px
     effective, under the ~50px the label and figure occupy, and the card stays 82px. Setting the
     size without the margin is the exact shape of trap 3, so both are asserted together. */
  it("⚠️ the 54px plane absorbs 24px, so the row's height is still the TEXT's", () => {
    const p = blk(".os-cic.plane");
    expect(p).toMatch(/width:\s*54px/);
    expect(p).toMatch(/height:\s*54px/);
    expect(p).toMatch(/margin:\s*-12px 0/);
  });

  it("⚠️ AND THE GOALS MARK OPTS OUT OF A BASELINE ROW — an image has no baseline", () => {
    /* `.os-goal-r1` is `align-items: baseline`, so the image aligned on its BOTTOM MARGIN EDGE and
       dragged the row: measured 33.3px against 21.8px of text. `align-self: center` takes it out
       of the baseline group; measured after, 22.0 against 21.8. The negative margin alone was not
       enough, which is why this is asserted separately. */
    expect(blk(".os-goalmark")).toContain("align-self: center");
  });

  it("the image is bounded and letterboxed inside its box", () => {
    const i = blk(".os-mark-il img");
    expect(i).toContain("object-fit: contain");
    expect(i).toMatch(/width:\s*100%/);
  });
});

describe("the mapping follows the TABLE, not the filenames", () => {
  const counters = readFileSync(resolve(__dirname, "./OneScreenCounters.tsx"), "utf8");
  const rail = readFileSync(resolve(__dirname, "./OneScreenRail.tsx"), "utf8");

  /* ⚠️ RETARGETED (audit pack P3): QUERIES SENT now carries the watercolour plane, which replaced
     the line-drawn `Querying Goals Icon` that had stood in for it. The target-is-GOALS half of the
     old mismatch is unchanged and still worth stating. */
  it("⚠️ the painted plane is QUERIES SENT, and the target is GOALS — despite its name", () => {
    expect(counters).toMatch(/sent:\s*sentMark/);
    expect(counters).toContain("active-query-image.png"); // …imported as the SENT mark
    expect(counters).not.toContain("querying-goals-icon.png");
    expect(rail).toContain("query-target-icon.png");      // …used on the GOALS card
  });

  it("⚠️ only the sent mark takes the plane class — it is a fact about the file, not a prop", () => {
    expect(counters).toMatch(/MARK_CLASS[^=]*=\s*\{\s*sent:\s*" plane"\s*\}/);
    expect(counters).toContain("MARK_CLASS[c.key]");
    // no size/blend decision offered to the caller
    expect(counters).not.toMatch(/markSize|blend\?:/);
  });

  it("each counter gets its own mark", () => {
    expect(counters).toMatch(/agents:\s*agentsMark/);
    expect(counters).toMatch(/responses:\s*replyMark/);
  });
});
