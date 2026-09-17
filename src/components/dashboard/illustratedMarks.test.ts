/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ ILLUSTRATED MARKS — THREE TRAPS, NONE OF WHICH A GEOMETRY TEST CAN SEE.
 *
 * The artwork is drawn on WHITE PAPER, not transparency. Every failure below renders as a white
 * square on parchment — a visual fault that measures perfectly, which is why these assert the
 * mechanism rather than any dimension.
 *
 * ⚠️ THE STAT CARDS' MARKS ARE RETIRED WITH THE CARDS (dashboard header, stage 1, 17 Sep). The stat
 * slot `.os-cic`, its painted-plane exemption and the counter mapping went with `OneScreenCounters`;
 * the cases that asserted them now assert their absence. `.os-mark-il` itself is SHARED — the goals
 * card still wears it — so every claim about the treatment stands, pointed at the mark that remains.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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
   * ⚠️ THE PAINTED-PLANE EXEMPTION IS RETIRED WITH THE STAT ROW (stage 1). It was scoped to one
   * selector, `.os-cic.plane img`, precisely so the default could not be weakened — and the default
   * is still asserted here unweakened. The dashboard's other painted artwork, the header's hawk, is
   * not an `.os-mark-il` at all: it is genuinely transparent and carries no blend of either kind.
   */
  it("⚠️ the default is unweakened, the plane's exemption is gone, and the hawk takes no blend", () => {
    expect(blk(".os-mark-il img")).toContain("mix-blend-mode: multiply");
    expect(bare).not.toMatch(/\.os-mark-il img\s*\{[^}]*mix-blend-mode:\s*normal/);
    expect(bare).not.toContain(".os-cic.plane");
    expect(blk(".os-greet .os-hdart")).not.toContain("mix-blend-mode");
  });

  it("⚠️ and it is BARE — no plate, no border, no fill behind it", () => {
    const w = blk(".os-mark-il");
    expect(w).not.toMatch(/background/);
    expect(w).not.toMatch(/border(?!-)/);
  });
});

describe("trap 2 — a transform on an ancestor isolates the blend", () => {
  it("⚠️ NO transform on either wrapper — that is what brings the white square back", () => {
    for (const sel of [".os-mark-il", ".os-goalmark"]) {
      expect(blk(sel), `${sel} must not transform`).not.toMatch(/transform:/);
    }
  });

  /* ⚠️ THE LAW IS "NEVER A TRANSFORM" — a transform on an ancestor isolates the blend group and kills
     `mix-blend-mode` on the mark inside it. It held for both marks; the goals mark is the one left. */
  it("⚠️ the remaining mark is not moved by a transform — that would isolate the blend group", () => {
    expect(blk(".os-goalmark")).not.toMatch(/transform:/);
    expect(blk(".os-goalmark")).not.toMatch(/translate/);
  });

  it("hover transforms live on the IMG", () => {
    expect(bare).toMatch(/\.os-goal:hover \.os-goalmark img\s*\{[^}]*transform/);
    /* the stat slot's hover went with the slot */
    expect(bare).not.toContain(".os-counter:hover");
  });

  it("⚠️ THE ENTRANCE ANIMATION IS A TRANSFORM TOO — the marks wait for the card to land", () => {
    // `.enter` transforms the CARD, so for its duration every mark inside blends against
    // transparency. Hiding by OPACITY on the img creates no stacking context on the card.
    expect(bare).toMatch(/\.os-card\.enter \.os-mark-il img\s*\{[^}]*opacity:\s*0/);
  });
});

/**
 * ⚠️ THE STAT SLOT IS RETIRED; THE BOUNDED IMAGE IS NOT. The slot (`.os-cic`) was a fixed box the
 * artwork centred in — it went with the stat row. What survives is the half that belongs to the
 * treatment rather than the slot: the image is BOUNDED at its own sharp size, never stretched.
 */
describe("the artwork is bounded at its own sharp size", () => {
  it("⚠️ the image is bounded at its own sharp ceiling, not stretched to its box", () => {
    const img = blk(".os-mark-il img");
    expect(img).toContain("max-width: 50px");
    expect(img).toContain("max-height: 50px");
    expect(img).not.toContain("width: 100%");
    expect(img).toContain("object-fit: contain");
  });

  it("⚠️ the stat slot's rules are gone with the slot", () => {
    expect(bare).not.toMatch(/(^|[}\n])\s*[^{}]*\.os-cic\b[^{]*\{/);
  });
});

describe("the mapping follows the TABLE, not the filenames", () => {
  const goals = readFileSync(resolve(__dirname, "./OneScreenGoals.tsx"), "utf8");

  /* ⚠️ RETARGETED (stage 1): the counters file that carried the painted plane is deleted, so the half
     of the old mismatch that named QUERIES SENT has no subject. The target-is-GOALS half is
     unchanged and still worth stating, because the filename still suggests otherwise. */
  it("⚠️ the target is GOALS — despite its name — and the counters' table is gone", () => {
    expect(goals).toContain("query-target-icon.png");
    expect(existsSync(resolve(__dirname, "./OneScreenCounters.tsx"))).toBe(false);
  });
});
