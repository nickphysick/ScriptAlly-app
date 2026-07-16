/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The two-depth pink tag law (polish v3 Phase 2, amending the retoken — visual ref
 * todo-task-settings.html §3). Rule-text locks over todo.css, the repo's pattern for colour laws:
 * standard status tags = soft pink · urgency = the DEEPER pink, dark text, bold · offer = ink ·
 * note cards = note-yellow · burgundy never fills a tag (it survives only in StatusDots — locked —
 * and micro-accents).
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

describe("two-depth pink tag law — rule-text locks", () => {
  it("standard status tags (the base .tdb-tag, SNOOZED ×n included) are soft pink", () => {
    const base = rule(".tdb-tag");
    expect(base).toContain("background: var(--pink-t)");
    expect(base).toContain("border: 1px solid var(--pink-b)");
    expect(base).toContain("color: var(--pink-i)");
    // SNOOZED ×n is a standard tag: no .snz colour override survives
    expect(css).not.toMatch(/\.tdb-tag\.snz\s*\{/);
  });

  it("urgency tags are the deeper pink — dark text, bold (depth outranks status, not hue)", () => {
    const warn = rule(".tdb-tag.due.warn");
    expect(warn).toContain("background: var(--pink-btn)");
    expect(warn).toContain("border-color: var(--pink-b)");
    expect(warn).toContain("color: var(--pink-deep)");
    expect(warn).toContain("font-weight: 700");
  });

  it("the offer keeps its ink fill — the rarest mark on the board", () => {
    const offer = rule(".tdb-tag.offer");
    expect(offer).toContain("background: var(--ink)");
  });

  it("note cards keep note-yellow tag treatment", () => {
    const nt = rule(".tdb-tile.nt .tdb-tag");
    expect(nt).toContain("background: var(--note-t)");
    expect(nt).toContain("border-color: var(--note-b)");
    expect(nt).toContain("color: var(--note-i)");
  });

  it("burgundy never fills a tag", () => {
    const tagRules = css.match(/\.tdb-tag[^{]*\{[^}]*\}/g) ?? [];
    for (const r of tagRules) expect(r).not.toContain("--burg");
  });

  it("gold stays retired from the board stylesheet", () => {
    expect(css).not.toMatch(/--gold/);
  });
});
