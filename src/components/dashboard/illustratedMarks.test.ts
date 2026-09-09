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

  /* ⚠️ THE LAW IS "NEVER A TRANSFORM", AND THE NUDGE IS WHERE IT IS NEEDED (refdiff pass, Phase 8).
     A transform on an ancestor isolates the blend group and kills `mix-blend-mode` on the mark
     inside it — that is the trap, and it holds for both marks. The `top: -2px` is a separate,
     OPTICAL claim about a mark sitting beside Playfair, whose optical centre is above its line-box
     centre; the goals mark went from 34px to the ref's 52 and now centres in a row it is the
     tallest thing in, so there is nothing left to nudge it against. Asserting a nudge that has no
     subject is how a value survives the reason for it. */
  it("⚠️ neither mark is moved by a transform — that would isolate the blend group", () => {
    for (const sel of [".os-cic", ".os-goalmark"]) {
      expect(blk(sel), sel).not.toMatch(/transform:/);
      expect(blk(sel), sel).not.toMatch(/translate/);
    }
  });

  /* ⚠️ THE NUDGE IS RETIRED, AND THE LAW BEHIND IT SURVIVES (v27, Phase 3). The 2px lift was
     written when the mark sat directly beside a Playfair heading, whose optical centre is above its
     line-box centre. v27's hero makes the stats their own block, centred against the greeting PAIR
     and already carrying the row's own 4px lift — so the nudge was a second correction for a
     relationship that no longer exists, and it put the illustration 2px ABOVE its own row (measured
     92.2 against the ref's 96.1). Two optical corrections stacked is how a mark ends up outside the
     box it belongs to.
     ⚠️ WHAT MUST NOT COME BACK IS A TRANSFORM. `position/top` was chosen over `translateY` because a
     transform on any ancestor isolates the blend group and the artwork's white field returns — the
     trap this whole file is named for. So the case now forbids the transform rather than requiring
     the offset. */
  it("⚠️ the stat slot carries no transform — a nudge, if one returns, is position/top", () => {
    const b = blk(".os-cic");
    expect(b).toContain("position: relative");
    expect(b).not.toMatch(/transform:/);
    expect(b).not.toMatch(/top:\s*-2px/);
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

/**
 * ⚠️ TRAP 3 IS RETIRED, AND ITS PREMISE IS WHAT WENT (refdiff pass, Phase 4).
 *
 * It guarded a 44px mark beside ~30px of text: the box was fixed, a negative margin absorbed the
 * overhang, and the TEXT owned the row's height. The ref makes the slot 112px (96 below 1700) — it
 * is the largest thing in the row by design, and the row is the slot's height now. A negative
 * margin there would pull the artwork out of the box the design reserves for it.
 *
 * ⚠️ WHAT SURVIVES IS THE PART THAT WAS NEVER ABOUT THE OVERHANG: the box is FIXED and the image is
 * BOUNDED inside it. That is what makes the slot swap-ready — the picture changes size, the layout
 * does not — and it is the half that still has a subject.
 */
describe("the stat slot is fixed, and the artwork is bounded inside it", () => {
  it("the slot is the ref's size and cannot shrink", () => {
    const b = blk(".os-cic");
    expect(b).toContain("width: 112px");
    expect(b).toContain("height: 112px");
    /* ⚠️ THE 96px STEP IS GONE AND ITS ABSENCE IS THE CLAIM (v27). v26's ref pinned
       `width:96px!important` below 1700, beating its own clamp, and this mirrored it. v27 does not:
       measured, the ref computes 70.6px at 1536, which IS `clamp(64px, 4.6vw, 104px)`. The hero's
       own clamp governs the slot at every width now — a duplicate-declaration sweep cannot tell
       these apart, because a media override is the cascade working; only rendering the ref can. */
    expect(bare).not.toMatch(/max-width:\s*1699px[\s\S]{0,600}?\.os-cic[^{]*\{[^}]*96px/);
    expect(bare).toMatch(/\.os-greet \.os-cic \{[^}]*clamp\(64px, 4\.6vw, 104px\)/);
  });

  /* ⚠️ THE CEILING IS THE ARTWORK'S, NOT THE LAYOUT'S. Two of the three sources are 100×100, so
     50px is the largest size that stays sharp; the slot still reserves what the design asks for and
     the picture centres in it. `max-width`, never `width: 100%` — filling the slot would upscale a
     100px PNG into a 112px box and be softer than what ships today. */
  it("⚠️ the image is bounded at its own sharp ceiling, not stretched to the slot", () => {
    const img = blk(".os-mark-il img");
    expect(img).toContain("max-width: 50px");
    expect(img).toContain("max-height: 50px");
    expect(img).not.toContain("width: 100%");
    expect(img).toContain("object-fit: contain");
    expect(blk(".os-cic")).toContain("justify-content: center");
  });

  /* ⚠️ AND NO NEGATIVE MARGIN SURVIVES — it existed to hide an overhang the design no longer has,
     and left in place it would pull the artwork out of its reserved box. */
  it("⚠️ the overhang absorption is retired with the overhang", () => {
    expect(blk(".os-cic")).toContain("margin: 0");
    expect(blk(".os-cic")).not.toMatch(/margin:\s*-/);
  });
});


describe("the mapping follows the TABLE, not the filenames", () => {
  const counters = readFileSync(resolve(__dirname, "./OneScreenCounters.tsx"), "utf8");
  /* ⚠️ THE GOALS CARD LEFT THE RAIL (ref v16, Phase 3) — it is the left column's second card now
     and `OneScreenGoals` renders it. The claim is unchanged: the target mark is the GOALS card's
     and the painted plane is the stat row's, despite the filenames suggesting the opposite. */
  const rail = readFileSync(resolve(__dirname, "./OneScreenGoals.tsx"), "utf8");

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
