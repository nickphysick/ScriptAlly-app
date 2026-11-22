/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Material icons v1 — the drawings are the ruled ref byte for byte, and the svg frame is the ref's.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MATERIAL_ICON_INNER, MaterialIcon, MaterialItemIcon } from "./MaterialIcon";

const ref = JSON.parse(readFileSync(join(__dirname, "../../../design-refs/material-icons-v1/material-icons-v1.json"), "utf8"));
const KEY = { letter: "letter", synopsis: "syn", pages: "pages", chapters: "chap", words: "words", bio: "bio" } as const;

describe("MaterialIcon — the six drawings", () => {
  it("one entry per ref icon, no more", () => expect(Object.keys(MATERIAL_ICON_INNER).length).toBe(Object.keys(ref.icons).length));
  for (const [kind, key] of Object.entries(KEY)) {
    it(`${kind} is icons.${key}.inner verbatim`, () => expect(MATERIAL_ICON_INNER[kind as keyof typeof KEY]).toBe(ref.icons[key].inner));
  }
});

describe("MaterialIcon — the svg frame", () => {
  const html = renderToStaticMarkup(<MaterialIcon kind="chapters" />);
  it("viewBox, no fill, currentColor stroke 1.8, round caps and joins", () => {
    expect(html).toContain(`viewBox="${ref.svg.viewBox}"`);
    expect(html).toContain('fill="none"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain(`stroke-width="${ref.svg.strokeWidth}"`);
    expect(html).toContain('stroke-linecap="round"');
    expect(html).toContain('stroke-linejoin="round"');
  });
  it("aria-hidden, flex none, 16px by default", () => {
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("flex:none");
    /* pinned inline so a host `… svg {}` rule cannot resize or recolour it */
    expect(html).toMatch(/style="[^"]*width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8/);
    expect(html).toContain('width="16"');
    expect(html).toContain('height="16"');
  });
  it("carries the drawing", () => expect(html).toContain(ref.icons.chap.inner));
  it("never below 14px", () => expect(renderToStaticMarkup(<MaterialIcon kind="pages" size={12} />)).toContain('width="14"'));
  it("20px when asked", () => expect(renderToStaticMarkup(<MaterialIcon kind="pages" size={20} />)).toContain('width="20"'));
  it("no colour of its own", () => {
    for (const k of Object.keys(KEY)) {
      const h = renderToStaticMarkup(<MaterialIcon kind={k as keyof typeof KEY} />);
      expect(h.replace(/currentColor/g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|var\(/i);
    }
  });
  it("MaterialItemIcon renders nothing for null", () => expect(renderToStaticMarkup(<MaterialItemIcon kind={null} />)).toBe(""));
});
