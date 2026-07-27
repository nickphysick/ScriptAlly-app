/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The white tag law (corner pack P3, superseding the two-depth pink law). Rule-text locks over
 * todo.css, the repo's pattern for colour laws: every status tag = WHITE fill, ink text, faint ink
 * hairline · urgency = white but a full 1.5px ink frame + bold (depth is weight/frame, not hue) ·
 * ★ offer = ink (the rarest mark) · note tags fall to the same white base · no tag carries a pink
 * fill any more — the lane BANDS carry the stream colour, so a tinted tag would double the signal.
 * Burgundy still never fills a tag (it survives only in StatusDots — locked — and micro-accents).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "todo.css"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("THE SOFT TAG LAW (Polish III — third and final revision) — rule-text locks", () => {
  it("EVERY tag is white fill / faint-ink border / ink text — the base rule", () => {
    const base = rule(".tdb-tag");
    expect(base).toContain("background: var(--white)");
    expect(base).toContain("color: var(--ink)");
    expect(base).toContain("border: 1px solid rgba(30, 26, 22, 0.25)"); // the live --ink @ 25%
    expect(css).not.toMatch(/\.tdb-tag\.snz\s*\{/);
  });

  it("urgency keeps 700 ONLY — the 1.5px ink frame is retired", () => {
    const warn = rule(".tdb-tag.due.warn");
    expect(warn).toContain("font-weight: 700");
    expect(warn).not.toContain("1.5px");
    expect(warn).not.toContain("border");
  });

  it("★ OFFER is soft too — white like every other tag, keeping ★ (markup) + 700; the ink fill is retired", () => {
    const offer = rule(".tdb-tag.offer");
    expect(offer).toContain("font-weight: 700");
    expect(offer).not.toContain("background: var(--ink)");
    expect(offer).not.toContain("color: #fff");
  });

  it("no tag variant re-inks anything — one look, both views (the cof tint is retired)", () => {
    expect(css).not.toMatch(/\.tdb-tag\.cof\s*\{/);
    const tagRules = css.match(/\.tdb-tag[^{]*\{[^}]*\}/g) ?? [];
    for (const r of tagRules) {
      expect(r).not.toContain("--burg");
      const bg = r.match(/background:\s*([^;]+);/);
      if (bg) expect(bg[1].trim()).toBe("var(--white)");
      for (const tint of ["--pink-t", "--pink-i", "--pink-btn", "--pink-deep", "--note-t", "--note-i", "--hk-cof"]) {
        expect(r).not.toContain(tint);
      }
    }
  });

  it("gold stays retired from the board stylesheet", () => {
    expect(css).not.toMatch(/--gold/);
  });
});
