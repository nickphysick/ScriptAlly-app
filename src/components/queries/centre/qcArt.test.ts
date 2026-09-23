/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Courier's file — bytes, dimensions and transparency. A drawing is the one kind of file a diff
 * cannot show you, so these are read from disk rather than trusted.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COURIER_CUTOUT } from "./qcArt";

const file = resolve(process.cwd(), "public", COURIER_CUTOUT.src.replace(/^\//, ""));

describe("the Birds-eye header's Courier", () => {
  it("the file is where the record says, and its bytes are the ones that were approved", () => {
    expect(existsSync(file), `${file} is not in the tree`).toBe(true);
    const bytes = readFileSync(file);
    expect(createHash("md5").update(bytes).digest("hex").slice(0, 8)).toBe(COURIER_CUTOUT.version);
  });
  it("⚠️ it is already TRANSPARENT, so it takes no blend — and the record's dimensions are the file's", () => {
    const b = readFileSync(file);
    expect(b.subarray(1, 4).toString("ascii"), "not a PNG").toBe("PNG");
    /* IHDR: width, height, bit depth, colour type */
    expect(b.readUInt32BE(16)).toBe(COURIER_CUTOUT.width);
    expect(b.readUInt32BE(20)).toBe(COURIER_CUTOUT.height);
    /**
     * ⚠️ COLOUR TYPE 6 IS RGBA. If this ever became type 2 (RGB) the drawing would arrive on a white
     * field, and the fix somebody would reach for is `mix-blend-mode: multiply` — which this repo
     * retired everywhere and which would darken the washes against the tray's colour. The alpha is
     * what makes the blend unnecessary, so the alpha is what is asserted.
     */
    expect(b.readUInt8(25), "the cutout lost its alpha channel").toBe(6);
  });
  it("⚠️ nothing in the Query Centre blends", () => {
    const dir = resolve(process.cwd(), "src/components/queries/centre");
    const sheets = ["qcvExpanded.css", "qcvBirdsEye.css", "qcvRail.css", "qcvPage.css"]
      .filter((f) => existsSync(resolve(dir, f)))
      .map((f) => readFileSync(resolve(dir, f), "utf8"));
    expect(sheets.length).toBeGreaterThan(2);
    for (const css of sheets) expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("mix-blend-mode");
  });
});
