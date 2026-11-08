/**
 * Query Centre v153.2 — the quiet setting in words: "Gone quiet after 8 weeks", the weeks live, the whole phrase one
 * button that opens the existing pop-over (opening is measured in tests/e2e/qc1532.measure.ts).
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QcQuietSetting } from "./QcQuietSetting";

const html = (w: number) => renderToStaticMarkup(<QcQuietSetting weeks={w} onSet={() => {}} />);

describe("the quiet setting, in words", () => {
  it("reads 'Gone quiet after N weeks' with the live setting", () => {
    expect(html(8)).toMatch(/<button[^>]*>.*Gone quiet after.*8 weeks.*<\/button>/);
    expect(html(3)).toContain("3 weeks");
    expect(html(3)).not.toContain("8 weeks");
  });
  it("is one button, the pop-over's trigger", () => {
    const h = html(8);
    expect(h.match(/<button/g)?.length).toBe(1);
    expect(h).toContain('aria-haspopup="dialog"');
    expect(h).toContain('aria-expanded="false"');
  });
});
