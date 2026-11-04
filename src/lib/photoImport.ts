/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import from photos (smart-import-photos-v1) — the pure half: the words, the caps, the page
 * order, the blur measure and the JPEG metadata strip. No React and no canvas, so all of it is
 * testable in node. The browser half (decoding, resizing, encoding) is photoPrepare.ts.
 *
 * ⚠️ NOTHING HERE OR IN photoPrepare.ts STORES A PHOTO. The images go to the callable, are read, and
 * are dropped; in the browser they live only in the flow's state and in object URLs that are
 * revoked when the flow ends. Nothing is written to Storage or Firestore.
 */

// ── Caps (the callable's own, held equal by a lock) ─────────────────────────────────────────────
/** functions/src/smartImportCore.ts MAX_PAGES. */
export const MAX_PAGES = 10;
/** functions/src/smartImportCore.ts MAX_PAGES_CHARS — every page's base64 together. */
export const MAX_PAGES_CHARS = 20_000_000;
/** functions/src/smartImportCore.ts MAX_PAGE_CHARS — one page's base64. */
export const MAX_PAGE_CHARS = 5_000_000;

/** The long edge a page is resized to (never upscaled) — Anthropic's own recommended maximum. */
export const LONG_EDGE = 1568;
/** First encoding quality, then the lower ones tried before refusing (the payload cap). */
export const JPEG_QUALITY = 0.82;
export const FALLBACK_QUALITIES = [0.72, 0.62, 0.5] as const;
/** The blur check's working size: the greyscale copy's long edge. */
export const BLUR_EDGE = 512;
/**
 * The blur threshold: a page whose Laplacian variance (blurScore) is under this is "Hard to read".
 * CALIBRATED (functions/eval/photoBlurCalibrate.mts → reports/smart-import-photos-v1/
 * blur-calibration.json) over the 40 rendered fixture pages: every sharp page scored 5,325–9,846 and
 * every blurred one 85–232. 600 sits 2.6× above the blurred maximum and 9× below the sharp minimum,
 * leaning towards the blurred side because a real phone photo is softer than a render. It is a
 * nudge, never a block, so a wrong call costs a writer one "Keep it".
 */
export const BLUR_THRESHOLD = 600;

// ── Words ────────────────────────────────────────────────────────────────────────────────────────
export const PHOTOS_WORDS = {
  useAction: "Use photos",
  /** The photos screen's heading (v1.1). One line from a 900px window up: its size follows the
   *  sheet's width (photoImport.css). The spreadsheet hand-off keeps CONFIRM_TITLE. */
  title: "Ok. Let's turn your photos into a smart QueryHawk database.",
  label: "The photos you chose",
  /** The label while no page has been added yet. */
  labelEmpty: "Your photos",
  page: (n: number) => `Page ${n}`,
  replace: "Replace",
  remove: "Remove",
  add: "Add a page",
  hard: "Hard to read",
  cantOpen: "Can't open this photo",
  preparing: "Getting it ready…",
  tip: "Up to 10 pages, read in this order. Drag a page to move it. For the clearest read, get the whole page in, flat, in good light.",
  primary: "Read my photos",
  /** The primary before any page is added: it opens the picker, from its own click. */
  choose: "Choose photos",
  blurLead: (n: number) => `Page ${n} looks blurry.`,
  blurRest: "A sharper photo means fewer questions later.",
  replacePage: (n: number) => `Replace page ${n}`,
  keep: "Keep it",
  tooLarge: "These photos are too large to send together. Remove a page, or replace one with a smaller photo.",
  moveHint: (n: number, total: number) => `Page ${n} of ${total}. Press Alt and an arrow key to move it.`,
} as const;

/** The lede under the grid: how many pages will be read. */
export function photosLede(pages: number): string {
  if (pages <= 0) return "Add a photo of each page of your list.";
  const what = pages === 1 ? "your page" : `all ${pages} pages as one list`;
  return `We'll read ${what} and show you everything before anything is saved. You confirm what lands. The photos are deleted once they're read.`;
}

/** "What happens next", for photos. The sheet's three lines are ConfirmScreen's HOW_STEPS. */
export const PHOTO_HOW_STEPS: Array<{ key: string; title: string; line: string }> = [
  { key: "sheet", title: "Your list, as it is", line: "A notebook page, a printout, a screenshot. Nothing to tidy first." },
  { key: "reads", title: "QueryHawk reads every line", line: "Agents, queries, dates and statuses, sorted into place." },
  { key: "check", title: "You check what lands", line: "Anything we couldn't read is asked about, with your own writing beside it." },
];

// ── Which files are photos ───────────────────────────────────────────────────────────────────────
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|avif)$/i;
/** A file the photo path takes: an image by type, or by name when the browser gave no type (HEIC). */
export function isImageFile(f: { name: string; type?: string }): boolean {
  return (f.type ?? "").startsWith("image/") || IMAGE_EXT.test(f.name);
}
export function isHeicFile(f: { name: string; type?: string }): boolean {
  return /image\/hei[cf]/i.test(f.type ?? "") || /\.hei[cf]$/i.test(f.name);
}
const SHEET_EXT = /\.(csv|xlsx|xls)$/i;
/**
 * What a drop on the Smart import tile is: the first spreadsheet if there is one (as today), else
 * every image, else nothing. A mixed drop takes the images only when it holds no spreadsheet.
 */
export function classifyDrop<F extends { name: string; type?: string }>(files: readonly F[]):
  { kind: "sheet"; file: F } | { kind: "photos"; files: F[] } | { kind: "none" } {
  const sheet = files.find((f) => SHEET_EXT.test(f.name));
  if (sheet) return { kind: "sheet", file: sheet };
  const images = files.filter(isImageFile);
  return images.length ? { kind: "photos", files: images } : { kind: "none" };
}

// ── The pages, in order ──────────────────────────────────────────────────────────────────────────
/** Move the item at `from` to `to`. Out of range returns the list unchanged. */
export function movePage<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return list.slice();
  const out = list.slice();
  const [m] = out.splice(from, 1);
  out.splice(to, 0, m);
  return out;
}

/** The first page still flagged blurry and not kept, or -1. Only one is named at a time. */
export function firstUnresolvedBlur(pages: readonly { blurry: boolean; kept: boolean; status: string }[]): number {
  return pages.findIndex((p) => p.status === "ready" && p.blurry && !p.kept);
}

// ── Blur: the variance of a Laplacian ────────────────────────────────────────────────────────────
/** Luma of RGBA pixels, as a greyscale array. */
export function toGrey(rgba: ArrayLike<number>, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  return g;
}
/** Variance of the 4-neighbour Laplacian over a greyscale image. Low means few sharp edges. */
export function blurScore(grey: ArrayLike<number>, w: number, h: number): number {
  if (w < 3 || h < 3) return 0;
  let sum = 0, sq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = grey[i - w] + grey[i + w] + grey[i - 1] + grey[i + 1] - 4 * grey[i];
      sum += l; sq += l * l; n++;
    }
  }
  const mean = sum / n;
  return sq / n - mean * mean;
}

// ── JPEG metadata ────────────────────────────────────────────────────────────────────────────────
/**
 * A JPEG with every APPn (except APP0, the JFIF header) and COM segment removed — EXIF, GPS, XMP,
 * ICC, comments. A canvas re-encode already drops them; this is the assertion, run on every page.
 * Anything that is not a well-formed JPEG is returned untouched.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const keep: Uint8Array[] = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return bytes;
    const marker = bytes[i + 1];
    if (marker === 0xda) { keep.push(bytes.subarray(i)); break; } // start of scan: the rest is image data
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2 || i + 2 + len > bytes.length) return bytes;
    const isMeta = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMeta) keep.push(bytes.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  const total = keep.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const b of keep) { out.set(b, o); o += b.length; }
  return out;
}
/** True when a JPEG still carries an APP1–APP15 or COM segment before its image data. */
export function jpegHasMetadata(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let i = 2;
  while (i + 4 <= bytes.length && bytes[i] === 0xff) {
    const marker = bytes[i + 1];
    if (marker === 0xda) return false;
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) return true;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return false;
}

// ── Payload ──────────────────────────────────────────────────────────────────────────────────────
/** Base64 length of n bytes. */
export const base64Length = (bytes: number) => Math.ceil(bytes / 3) * 4;
/** Whether these base64 lengths fit the callable's caps. */
export function fitsPayload(lengths: readonly number[]): boolean {
  return lengths.length > 0 && lengths.length <= MAX_PAGES && lengths.every((l) => l <= MAX_PAGE_CHARS)
    && lengths.reduce((s, l) => s + l, 0) <= MAX_PAGES_CHARS;
}

// ── The pages the review shows ───────────────────────────────────────────────────────────────────
/** A page that was read, in the order it was sent (index + 1 = the model's `src.p`). `shown` is the
 *  number the writer saw it under on the photos screen; `url` is its prepared JPEG. */
export interface ReviewPhoto { shown: number; url: string; width: number; height: number }

/** The cut-out's widest drawing, in px. */
export const SNIP_MAX_WIDTH = 640;
/** Padding above and below the band, as a share of the page's height. */
export const SNIP_PAD = 0.04;
/**
 * Where a cut-out is taken from on its page, and the size it is drawn at: the band `src.y`, padded by
 * 4% of the page's height each side (clamped to the page), the page's full width, drawn at up to
 * 640px wide with its own proportions.
 */
export function snipRect(src: { y: [number, number] }, width: number, height: number) {
  const top = Math.max(0, src.y[0] - SNIP_PAD), bottom = Math.min(1, src.y[1] + SNIP_PAD);
  const sx = 0, sw = width;
  const sy = Math.round(top * height), sh = Math.max(1, Math.round((bottom - top) * height));
  const dw = Math.min(SNIP_MAX_WIDTH, sw);
  const dh = Math.max(1, Math.round((sh * dw) / sw));
  return { sx, sy, sw, sh, dw, dh };
}

// ── Object URLs ──────────────────────────────────────────────────────────────────────────────────
/**
 * Every object URL the flow makes goes through one of these, and `revokeAll` is called when the flow
 * ends (the import done, cancelled, reset, or the flow unmounted). A revoked URL is gone from the
 * browser, so nothing of the photos outlives the flow.
 */
export function createUrlRegistry(api: { create: (b: Blob) => string; revoke: (u: string) => void } =
  { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) }) {
  const live = new Set<string>();
  return {
    make(b: Blob): string { const u = api.create(b); live.add(u); return u; },
    drop(u: string | null | undefined) { if (u && live.delete(u)) api.revoke(u); },
    revokeAll() { for (const u of live) api.revoke(u); live.clear(); },
    get size() { return live.size; },
  };
}
export type UrlRegistry = ReturnType<typeof createUrlRegistry>;
