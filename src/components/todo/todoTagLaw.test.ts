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

describe("white tag law — rule-text locks", () => {
  it("standard status tags (the base .tdb-tag, SNOOZED ×n included) are white + ink + a faint ink hairline", () => {
    const base = rule(".tdb-tag");
    expect(base).toContain("background: var(--white)");
    expect(base).toContain("color: var(--ink)");
    expect(base).toContain("border: 1px solid rgba(30, 26, 22, 0.25)"); // --ink @ 25%, literal (no color-mix in .t-f12)
    // SNOOZED ×n is a standard tag: no .snz colour override survives
    expect(css).not.toMatch(/\.tdb-tag\.snz\s*\{/);
  });

  it("urgency tags are white too, but framed 1.5px ink + bold (depth is weight/frame, not hue)", () => {
    const warn = rule(".tdb-tag.due.warn");
    expect(warn).toContain("background: var(--white)");
    expect(warn).toContain("border: 1.5px solid var(--ink)");
    expect(warn).toContain("color: var(--ink)");
    expect(warn).toContain("font-weight: 700");
  });

  it("the offer keeps its ink fill — the rarest mark on the board", () => {
    const offer = rule(".tdb-tag.offer");
    expect(offer).toContain("background: var(--ink)");
  });

  it("note tags fall to the same white base — the note-yellow tag override is retired", () => {
    expect(css).not.toMatch(/\.tdb-tile\.nt \.tdb-tag\s*\{/);
    expect(css).not.toMatch(/\.tdb-band \.tdb-tag:not/); // the Card-Bands interim white override is gone too
  });

  it("no board tag carries a pink (or note-yellow) fill — offer alone is ink", () => {
    const tagRules = css.match(/\.tdb-tag[^{]*\{[^}]*\}/g) ?? [];
    for (const r of tagRules) {
      expect(r).not.toContain("--burg");
      const isOffer = r.startsWith(".tdb-tag.offer");
      if (!isOffer) {
        // a non-offer tag must not draw any tinted FILL — background reads --white only
        const bg = r.match(/background:\s*([^;]+);/);
        if (bg) expect(bg[1].trim()).toBe("var(--white)");
        for (const pink of ["--pink-t", "--pink-i", "--pink-btn", "--pink-deep", "--note-t", "--note-i"]) {
          expect(r).not.toContain(pink);
        }
      }
    }
  });

  it("gold stays retired from the board stylesheet", () => {
    expect(css).not.toMatch(/--gold/);
  });
});
