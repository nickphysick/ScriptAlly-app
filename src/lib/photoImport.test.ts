/**
 * Smart Import from photos, phase 2 — choosing and preparing the photos (smart-import-photos-v1).
 * The pure half: caps, words, the drop rule, page order, blur, the metadata strip, object URLs, and
 * the loader's words for a read with no row total.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_PAGES, MAX_PAGES_CHARS, MAX_PAGE_CHARS, LONG_EDGE, JPEG_QUALITY, BLUR_THRESHOLD,
  photosLede, classifyDrop, movePage, firstUnresolvedBlur, blurScore, toGrey,
  stripJpegMetadata, jpegHasMetadata, fitsPayload, base64Length, createUrlRegistry, isImageFile, isHeicFile,
} from "./photoImport";
import { footBar, applyImportUpdate, PROGRESS_START } from "./importEstimate";

const code = (p: string) => readFileSync(join(...p.split("/")), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the caps are the callable's (locked)", () => {
  const core = code("functions/src/smartImportCore.ts");
  const num = (name: string) => Number(core.match(new RegExp(`export const ${name} = ([\\d_]+);`))![1].replace(/_/g, ""));
  it("pages, one page, all pages", () => {
    expect(MAX_PAGES).toBe(num("MAX_PAGES"));
    expect(MAX_PAGE_CHARS).toBe(num("MAX_PAGE_CHARS"));
    expect(MAX_PAGES_CHARS).toBe(num("MAX_PAGES_CHARS"));
    expect(MAX_PAGES).toBe(10);
  });
  it("the total sits at least 25% under the measured 32 MiB request limit", () => {
    expect(MAX_PAGES_CHARS).toBeLessThanOrEqual(0.75 * 32 * 1024 * 1024);
  });
  it("the reading size and quality are the brief's", () => {
    expect([LONG_EDGE, JPEG_QUALITY]).toEqual([1568, 0.82]);
  });
});

describe("the words", () => {
  it("the lede counts the pages", () => {
    expect(photosLede(0)).toBe("Add a photo of each page of your list.");
    expect(photosLede(1)).toBe("We'll read your page and show you everything before anything is saved. You confirm what lands. The photos are deleted once they're read.");
    expect(photosLede(3)).toBe("We'll read all 3 pages as one list and show you everything before anything is saved. You confirm what lands. The photos are deleted once they're read.");
  });
});

describe("a drop on the Smart import tile", () => {
  const f = (name: string, type = "") => ({ name, type });
  it("takes the first spreadsheet, as before, even beside images", () => {
    expect(classifyDrop([f("a.png", "image/png"), f("list.csv"), f("b.xlsx")])).toEqual({ kind: "sheet", file: f("list.csv") });
  });
  it("takes every image when there is no spreadsheet", () => {
    const d = classifyDrop([f("p1.jpg", "image/jpeg"), f("notes.txt", "text/plain"), f("IMG_2.HEIC")]);
    expect(d).toEqual({ kind: "photos", files: [f("p1.jpg", "image/jpeg"), f("IMG_2.HEIC")] });
  });
  it("takes nothing else", () => {
    expect(classifyDrop([f("a.pdf", "application/pdf")])).toEqual({ kind: "none" });
  });
  it("knows a HEIC by type or by name", () => {
    expect(isHeicFile(f("x.heic"))).toBe(true);
    expect(isHeicFile(f("x", "image/heif"))).toBe(true);
    expect(isHeicFile(f("x.jpg", "image/jpeg"))).toBe(false);
    expect(isImageFile(f("x.HEIC"))).toBe(true);
  });
});

describe("the pages, in order", () => {
  it("move a page onto another, and renumber", () => {
    expect(movePage(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(movePage(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(movePage(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
  it("name only the first unresolved blurry page", () => {
    const p = (blurry: boolean, kept = false, status = "ready") => ({ blurry, kept, status });
    expect(firstUnresolvedBlur([p(false), p(true, true), p(true), p(true)])).toBe(2);
    expect(firstUnresolvedBlur([p(true, false, "preparing"), p(false)])).toBe(-1);
  });
});

describe("blur is the variance of a Laplacian", () => {
  /* A sharp page: black text strokes on white. The same page box-blurred. */
  const W = 64, H = 64;
  const sharp = new Float32Array(W * H).fill(255);
  for (let y = 8; y < H - 8; y += 6) for (let x = 6; x < W - 6; x++) if ((x * 7 + y) % 5 < 3) sharp[y * W + x] = 0;
  const blurred = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < H && xx >= 0 && xx < W) { s += sharp[yy * W + xx]; n++; }
    }
    blurred[y * W + x] = s / n;
  }
  /* The ORDER is what this asserts; where the threshold sits is calibrated on real-sized photos in
     phase 4 (reports/smart-import-photos-v1/), not on a 64px drawing. */
  it("is far higher for a sharp page than for the same page blurred", () => {
    expect(blurScore(sharp, W, H)).toBeGreaterThan(8 * blurScore(blurred, W, H));
    expect(BLUR_THRESHOLD).toBeGreaterThan(0);
  });
  it("is 0 for a blank page", () => {
    expect(blurScore(new Float32Array(W * H).fill(200), W, H)).toBe(0);
  });
  it("reads luma from RGBA", () => {
    expect(Array.from(toGrey([255, 255, 255, 255, 0, 0, 0, 255], 2, 1))).toEqual([255, 0]);
  });
});

describe("no page goes out with metadata (locked)", () => {
  const seg = (marker: number, body: number[]) => [0xff, marker, ((body.length + 2) >> 8) & 0xff, (body.length + 2) & 0xff, ...body];
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, 1, 2, 3, 4];
  const jpeg = Uint8Array.from([
    0xff, 0xd8,
    ...seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]), // APP0 JFIF — kept
    ...seg(0xe1, exif),                          // APP1 EXIF (GPS lives here) — removed
    ...seg(0xe2, [1, 2, 3]),                     // APP2 ICC — removed
    ...seg(0xfe, [0x68, 0x69]),                  // COM — removed
    ...seg(0xdb, [0, 1, 2]),                     // DQT — kept
    0xff, 0xda, 0, 2, 9, 9, 9, 0xff, 0xd9,       // SOS + data + EOI — kept whole
  ]);
  it("strips APP1–APP15 and COM, keeps the rest", () => {
    expect(jpegHasMetadata(jpeg)).toBe(true);
    const out = stripJpegMetadata(jpeg);
    expect(jpegHasMetadata(out)).toBe(false);
    expect(Array.from(out)).toEqual([0xff, 0xd8, ...seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]), ...seg(0xdb, [0, 1, 2]), 0xff, 0xda, 0, 2, 9, 9, 9, 0xff, 0xd9]);
  });
  it("leaves anything that is not a JPEG alone", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
    expect(stripJpegMetadata(png)).toBe(png);
  });
  it("the encoder runs the strip and refuses a page that still carries any", () => {
    const src = code("src/lib/photoPrepare.ts");
    expect(src).toMatch(/const clean = stripJpegMetadata\(encoded\);\s*if \(jpegHasMetadata\(clean\)\) throw/);
    expect(src).toMatch(/imageOrientation: "from-image"/);
  });
});

describe("heic2any is loaded only when a HEIC needs it (locked)", () => {
  it("by a dynamic import, never a static one, anywhere in src", () => {
    const prep = code("src/lib/photoPrepare.ts");
    expect(prep).toContain('await import("heic2any")');
    expect(prep).not.toMatch(/^import[^;]*from\s+"heic2any"/m);
  });
});

describe("the payload cap", () => {
  it("fits ten ordinary pages and refuses one too many or too large", () => {
    expect(fitsPayload(Array(10).fill(base64Length(700_000)))).toBe(true);
    expect(fitsPayload(Array(11).fill(1000))).toBe(false);
    expect(fitsPayload([MAX_PAGE_CHARS + 4])).toBe(false);
    expect(fitsPayload(Array(5).fill(MAX_PAGE_CHARS))).toBe(false);
    expect(fitsPayload([])).toBe(false);
  });
});

describe("object URLs", () => {
  it("are all revoked at the end", () => {
    const made: string[] = [], gone: string[] = [];
    let n = 0;
    const r = createUrlRegistry({ create: () => { const u = `blob:${n++}`; made.push(u); return u; }, revoke: (u) => gone.push(u) });
    const a = r.make(new Blob()); r.make(new Blob()); r.make(new Blob());
    r.drop(a);
    expect(gone).toEqual([a]);
    r.revokeAll();
    expect(gone.sort()).toEqual(made.sort());
    expect(r.size).toBe(0);
  });
});

describe("the loader for a photo read: rows so far, never a made-up total (locked)", () => {
  const at = (p: typeof PROGRESS_START) => footBar({ progress: p, elapsedS: 40, sinceRetryS: 0, ready: false });
  const start = applyImportUpdate(PROGRESS_START, { type: "start-photos" });
  it("opens, then reads, then counts the rows read so far", () => {
    expect(start.unit).toBe("photos");
    expect(at(start)).toMatchObject({ left: "Opening your photos…", right: "", fill: null });
    const r0 = applyImportUpdate(start, { type: "rows", rows: 0 });
    expect(at(r0)).toMatchObject({ left: "Reading your photos…", right: "", fill: null });
    expect(at(applyImportUpdate(r0, { type: "rows", rows: 1 }))).toMatchObject({ right: "1 row read so far" });
    expect(at(applyImportUpdate(r0, { type: "rows", rows: 14 }))).toMatchObject({ right: "14 rows read so far", fill: null });
  });
  it("says nothing about time, even when the stream goes quiet", () => {
    const q = applyImportUpdate(start, { type: "quiet" });
    expect(at(q)).toMatchObject({ left: "Reading your photos…", right: "", fill: null });
    expect(at(applyImportUpdate(start, { type: "retry" }))).toMatchObject({ right: "" });
  });
  it("a sheet read is unchanged", () => {
    const s = applyImportUpdate(PROGRESS_START, { type: "start", rowsTotal: 20 });
    expect(at(s).left).toBe("Opening your file…");
  });
});
