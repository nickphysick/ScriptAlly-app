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
import { BE_HAWK_HEAD, COURIER_CUTOUT, HERO_COURIER_MAP, type QcArt } from "./qcArt";

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

/* ── v65.2 · the hero's map and the Birds-eye view's hawk head ───────────────────────────────── */

describe("the v65.2 artwork", () => {
  const at = (a: QcArt) => resolve(process.cwd(), "public", a.src.replace(/^\//, ""));
  /**
   * ⚠️ PNG-8 WITH A `tRNS` TABLE, NOT RGBA AND NOT WebP. The brief asks for WebP and this machine
   * has no encoder for it (`cwebp` absent, `sips` refusing the format, no Pillow, no sharp), so
   * `scripts/qc-art.mjs` trims to the alpha box, downscales and quantises in node's own zlib — the
   * same answer the dashboard's marks took when this came up before. Colour type 3 with `tRNS` is
   * how an indexed PNG carries transparency; without that chunk the drawing arrives on a white
   * field and somebody reaches for a blend mode, which this repo retired everywhere.
   */
  for (const [name, art, maxKb] of [["the hero's map", HERO_COURIER_MAP, 100], ["the hawk's head", BE_HAWK_HEAD, 100]] as const) {
    it(`${name}: the file is where the record says, at the bytes the pipeline produced`, () => {
      const f = at(art);
      expect(existsSync(f), `${f} is not in the tree`).toBe(true);
      const b = readFileSync(f);
      expect(createHash("md5").update(b).digest("hex").slice(0, 8)).toBe(art.version);
      expect(b.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(b.readUInt32BE(16)).toBe(art.width);
      expect(b.readUInt32BE(20)).toBe(art.height);
      expect(b.readUInt8(25), "colour type 3 — indexed").toBe(3);
      expect(b.includes(Buffer.from("tRNS", "ascii")), "no tRNS: the drawing would arrive on a white field").toBe(true);
      expect(Math.round(b.length / 1024), `${name} is over its budget`).toBeLessThanOrEqual(maxKb);
    });
  }
  it("⚠️ each is TRIMMED to its drawn area — a padded image scales its padding with it", () => {
    /* the sources carry transparent margin (the hero 16px at the left, the head 56px at the top),
       and every measured number in §3 and §6 is about the DRAWING, not the file it arrived in */
    const src = resolve(process.cwd(), "design-refs/art");
    expect(existsSync(resolve(src, "qc-hero-courier-map.png"))).toBe(true);
    expect(existsSync(resolve(src, "be-hawk-head.png"))).toBe(true);
    const hero = readFileSync(resolve(src, "qc-hero-courier-map.png"));
    expect(hero.readUInt32BE(16), "the source is the untrimmed ref").toBe(1250);
    expect(HERO_COURIER_MAP.width, "…and the shipped file is narrower than it").toBeLessThan(1250);
    const head = readFileSync(resolve(src, "be-hawk-head.png"));
    expect(head.readUInt32BE(16)).toBe(1250);
    expect(BE_HAWK_HEAD.width).toBeLessThan(1250);
  });
  it("…and each is at most 2× the size it is ever drawn at", () => {
    /* the head is drawn at 150px in the expanded tray and 102 in the rail; the hero at ~670 */
    expect(BE_HAWK_HEAD.width).toBeLessThanOrEqual(300);
    expect(HERO_COURIER_MAP.width).toBeLessThanOrEqual(1340);
  });
});
