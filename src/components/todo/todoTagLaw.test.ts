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

describe("THE SOFT TAG LAW — SUPERSEDED by the tightening (the kind chip)", () => {
  // The white-pill .tdb-tag family is EXTINCT: the tightening's KIND lane replaced the status
  // tags with a single squared chip (.tdb-ktag — mono 6.5, #f7f2e9 fill, #e8e1d0 hairline,
  // radius 5), identical in the ledger's kind column and the card band. What the law protected
  // survives translated: no pink fill on any tag, burgundy never fills one, ★ OFFER keeps its
  // star in MARKUP (`★ ${c.kind}`), and the ✓ TODAY state is the sage .tdb-ktag.on.
  it("the white-pill family is extinct; the kind chip is the one tag", () => {
    expect(css).not.toMatch(/\.tdb-tag[\s.{]/);
    const k = rule(".tdb-ktag");
    expect(k).toContain("background: #f7f2e9");
    expect(k).toContain("border: 1px solid #e8e1d0");
    expect(k).toContain("border-radius: 5px");
  });
  it("no tag carries a pink fill; burgundy never fills one; TODAY is the sage state", () => {
    expect(rule(".tdb-ktag")).not.toMatch(/#f5c7c2|#f2cec1|#7c3a2a/);
    expect(rule(".tdb-ktag.on")).toContain("var(--hk-sage)");
  });
});
