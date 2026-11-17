/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Status marks v3 — SM3-9: the landing's sixth status glyph (the offer) is the star seal, read against the
 * reference's own SEAL_SOLID, in `currentColor` with no hex. The other five entries are unchanged.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusGlyph, STATUS_GLYPH_COUNT } from "./marketingMarks";

const refHtml = readFileSync(new URL("../../design-refs/status-marks-v3.html", import.meta.url), "utf8");
const block = JSON.parse(/<pre id="paths">([\s\S]*?)<\/pre>/.exec(refHtml)?.[1] ?? "{}") as Record<string, unknown>;
const SEAL_SOLID = block[Object.keys(block).find((k) => k.startsWith("SEAL_SOLID "))!] as string;
const HEX = /#[0-9a-f]{3,8}\b/i;

describe("SM3-9 landing", () => {
  it("the sixth STATUS_GLYPHS entry renders SEAL_SOLID, filled, evenodd, with no hex", () => {
    expect(STATUS_GLYPH_COUNT).toBe(6);
    const h = renderToStaticMarkup(<StatusGlyph index={5} />);
    const paths = [...h.matchAll(/<path\b([^>]*)>/g)].map((m) => m[1]);
    expect(paths).toHaveLength(1);
    expect(/\sd="([^"]*)"/.exec(paths[0])?.[1]).toBe(SEAL_SOLID);
    expect(paths[0]).toContain('fill="currentColor"');
    expect(paths[0]).toContain('fill-rule="evenodd"');
    expect(paths[0]).toContain('stroke="none"');
    expect(h, "a hex colour in the seal").not.toMatch(HEX);
    expect(h).not.toContain("M5.5 2.5h9l4.5");
  });
  it("no glyph in the row carries a hex colour", () => {
    for (let i = 0; i < STATUS_GLYPH_COUNT; i++) expect(renderToStaticMarkup(<StatusGlyph index={i} />), `glyph ${i}`).not.toMatch(HEX);
  });
});
