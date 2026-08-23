/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ MICRO-INTERACTIONS ANIMATE TRANSFORM AND OPACITY ONLY (polish P3, pack rule 7), AND ALL OF
 * THEM STOP UNDER REDUCED MOTION (P4).
 *
 * Animating width/height/top/left forces a layout recalculation every frame — on a page holding a
 * live chart and two scrollers that is felt. jsdom cannot verify a hover, so what is pinned here
 * is the property list and the ordering rule that makes the reduced-motion block effective.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SHEETS = [
  ["dashboard", join(__dirname, "oneScreen.css")],
  ["shell", join(__dirname, "../shell/workspaceShell.css")],
] as const;

/** Transitions/animations that name a LAYOUT property — the thing rule 7 forbids. */
const LAYOUT_PROPS = ["width", "height", "top", "left", "right", "bottom", "margin", "padding"];

describe.each(SHEETS)("%s sheet — motion is transform/opacity only", (_name, path) => {
  const css = readFileSync(path, "utf8");
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");

  /**
   * ⚠️ TWO LAYOUT TRANSITIONS PREDATE THIS PACK AND ARE ALLOWED BY NAME.
   *
   * `.ws-panel { transition: width }` is the panel collapse, and the rail's `max-height` is the
   * stowables' expand — both are the documented mechanism of those components, not decoration,
   * and rewriting either to a transform is an architecture change, not a polish one. They are
   * listed here so they stay VISIBLE: the assertion still fails on a THIRD, which is what stops
   * "there are already some" becoming the reason for the next one.
   *
   * ⚠️ AND THE SIDEBAR-COLLAPSE PACK'S TRANSITIONS ARE ALLOWED BY SIGNATURE, not by count. That
   * pack MANDATES width/padding/max-width/margin animation — its own global rule records why a
   * transform is forbidden there (a transform on any ancestor of the panel's illustrated marks
   * creates a stacking context that isolates mix-blend-mode). Every one of its transitions
   * carries the pack's curve, `240ms cubic-bezier(0.32, 0.72, 0.28, 1)`, so the curve IS the
   * exception's name: a layout transition WITHOUT it still fails here, which keeps the door as
   * narrow as it was — new layout motion must either be this pack's, on its curve, or argue its
   * own case in this comment.
   */
  const COLLAPSE_SIG = /240ms cubic-bezier\(0\.32, 0\.72, 0\.28, 1\)/;
  const ALLOWED = [/transition:\s*width\s/, /transition:\s*max-height\s/, COLLAPSE_SIG];

  it("no `transition:` names a layout property, apart from the named exceptions", () => {
    const decls = bare.match(/transition:\s*[^;}]+/g) ?? [];
    expect(decls.length).toBeGreaterThan(0);
    for (const d of decls) {
      if (ALLOWED.some((re) => re.test(d))) continue;
      for (const p of LAYOUT_PROPS) {
        expect(d, `"${d.trim()}" animates ${p}`).not.toMatch(new RegExp(`(^|[\\s,:])${p}(\\s|,|$)`));
      }
    }
  });

  it("⚠️ the legacy exceptions have not multiplied — collapse-pack decls identified by curve", () => {
    const decls = bare.match(/transition:\s*[^;}]+/g) ?? [];
    const layout = decls
      .filter((d) => !COLLAPSE_SIG.test(d))
      .filter((d) => LAYOUT_PROPS.some((p) => new RegExp(`(^|[\\s,:])${p}(\\s|,|$)`).test(d)));
    expect(layout.length, `layout transitions found:\n${layout.join("\n")}`).toBeLessThanOrEqual(2);
  });

  it("⚠️ the reduced-motion block is LAST — equal specificity means source order decides", () => {
    const at = bare.lastIndexOf("prefers-reduced-motion");
    expect(at, "sheet must carry a reduced-motion block").toBeGreaterThan(-1);
    const after = bare.slice(at);
    const closing = after.indexOf("\n}");
    /* Anything after the block's own closing brace is exempt from it without anyone noticing. */
    expect(after.slice(closing + 2).trim()).toBe("");
  });

  it("reduced motion collapses BOTH transitions and animations, including delays", () => {
    const blk = bare.slice(bare.lastIndexOf("prefers-reduced-motion"));
    expect(blk).toContain("animation-duration: 0.01ms !important");
    expect(blk).toContain("transition-duration: 0.01ms !important");
    // ⚠️ a delay left standing still holds the element at its `from` for the delay's length
    expect(blk).toContain("animation-delay: 0ms !important");
    expect(blk).toContain("transition-delay: 0ms !important");
  });
});

describe("dashboard — the entrances are cancelled, not merely shortened", () => {
  const bare = readFileSync(join(__dirname, "oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const blk = bare.slice(bare.lastIndexOf("prefers-reduced-motion"));

  it("⚠️ a 0.01ms animation still PAINTS its `from` — the offsets must be switched off", () => {
    /* ⚠️ `.os-blocks i.f` LEFT THIS LIST because the block meter is retired, not because the rule
       stopped mattering. Its replacement lives in the card's own sheet and is covered below —
       dropping the case entirely would have quietly reduced this lock's reach by a third. */
    for (const sel of [".os-card.enter", ".os-greet.enter"]) {
      expect(blk, `${sel} must be animation:none under reduced motion`).toContain(sel);
    }
    expect(blk).toContain("animation: none !important");
    expect(bare, "the retired block meter must not linger in the sheet").not.toContain(".os-blocks");
  });

  /* ⚠️ THE GOALS CARD MOVED TO ITS OWN SHEET, so its reduced-motion block is read from there.
     A lock that only ever reads `oneScreen.css` would report a clean dashboard while the newest
     animation on it honoured nothing. */
  it("⚠️ the goals card's own motion is cancelled too, in its own sheet", () => {
    const goals = readFileSync(join(__dirname, "queryingGoals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const gblk = goals.slice(goals.lastIndexOf("prefers-reduced-motion"));
    expect(gblk, "the card declares a reduced-motion block at all").toContain("prefers-reduced-motion");
    expect(gblk, "the reached-state entrance").toContain(".os-goal-fade");
    expect(gblk, "the meter's width transition").toContain(".os-goal-meter i");
    expect(gblk).toContain("animation: none");
    expect(gblk).toContain("transition: none");
  });
});

describe("counters — the figure never moves", () => {
  const bare = readFileSync(join(__dirname, "oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("only the icon transforms on hover; no rule transforms the number", () => {
    /* ⚠️ RETARGETED: the transform moved to the IMG. A transform on the wrapper creates a
       stacking context, which isolates the blend group and brings the artwork's white field back —
       so this assertion moving is the fix, not a weakening of it. */
    expect(bare).toMatch(/\.os-counter:hover \.os-cic img\s*\{[^}]*transform/);
    /* and the wrapper must NOT carry one */
    const cic = bare.slice(bare.indexOf(".os-cic {"), bare.indexOf("}", bare.indexOf(".os-cic {")));
    expect(cic).not.toMatch(/transform:/);
    // .os-cn is the figure — a transform on it would make the headline jitter under the cursor
    expect(bare).not.toMatch(/\.os-counter:hover \.os-cn\s*\{[^}]*transform/);
  });
});

describe("search — focus must not resize the field", () => {
  const bare = readFileSync(join(__dirname, "../shell/primitives.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    + readFileSync(join(__dirname, "../shell/workspaceShell.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("⚠️ the ring is a box-shadow — a growing field shoves the bar's flanks", () => {
    const m = /\.sp-search:focus-visible\s*\{([^}]*)\}/.exec(bare);
    expect(m).not.toBeNull();
    const decls = bare.match(/\.sp-search:focus-visible\s*\{[^}]*\}/g)!.join("");
    expect(decls).toContain("box-shadow");
    expect(decls).not.toMatch(/(^|[\s;{])width:/);
  });
});
