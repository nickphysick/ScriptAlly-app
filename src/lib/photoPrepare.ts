/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import from photos — the browser half: a writer's photo, made ready to read. Decode (HEIC
 * through a lazily loaded converter), turn upright from its EXIF orientation, resize to 1568px on
 * the long edge (never upscaled), re-encode as JPEG, strip every metadata segment, base64. The blur
 * check runs here too, on a 512px greyscale copy, and costs nothing: nothing is sent to measure it.
 *
 * ⚠️ NOTHING LEAVES THE BROWSER BUT THE BASE64 THE CALLABLE IS SENT. No upload, no Storage, no cache.
 * The pure parts (caps, blur maths, the metadata strip) are photoImport.ts, tested in node.
 */
import {
  LONG_EDGE, JPEG_QUALITY, BLUR_EDGE, BLUR_THRESHOLD, FALLBACK_QUALITIES,
  isHeicFile, toGrey, blurScore, stripJpegMetadata, jpegHasMetadata, fitsPayload,
} from "./photoImport";

export interface PreparedPage {
  /** The JPEG that is sent, and that the review's cut-outs are drawn from (the same pixels the
   *  model read, so its `src` bands land where it meant). */
  blob: Blob;
  base64: string;
  width: number;
  height: number;
  /** Laplacian variance of the 512px greyscale copy. */
  blur: number;
  blurry: boolean;
}

type Canvas2D = { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D };
function canvas(w: number, h: number): Canvas2D {
  if (typeof OffscreenCanvas !== "undefined") {
    const c = new OffscreenCanvas(w, h);
    return { canvas: c, ctx: c.getContext("2d")! };
  }
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return { canvas: c, ctx: c.getContext("2d")! };
}
async function toJpeg(c: Canvas2D["canvas"], quality: number): Promise<Blob> {
  if ("convertToBlob" in c) return (c as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality });
  return new Promise((res, rej) => (c as HTMLCanvasElement).toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", quality));
}

/** Bytes → base64, in chunks (a spread of a megabyte overflows the call stack). */
export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * The photo, decoded and upright. A HEIC/HEIF the browser cannot open is converted by heic2any,
 * loaded only now (its own chunk, never in the main bundle). Throws when the photo cannot be opened.
 */
export async function decodePhoto(file: Blob & { name?: string }): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (e) {
    if (!isHeicFile({ name: file.name ?? "", type: file.type })) throw e;
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    return createImageBitmap(Array.isArray(out) ? out[0] : out, { imageOrientation: "from-image" });
  }
}

/** Draw the photo at the reading size and encode it. The canvas drops every metadata segment; the
 *  strip is run anyway and its result checked, so a page can never go out carrying any. */
export async function encodePhoto(bmp: ImageBitmap, quality = JPEG_QUALITY): Promise<Omit<PreparedPage, "blur" | "blurry">> {
  const scale = Math.min(1, LONG_EDGE / Math.max(bmp.width, bmp.height));
  const width = Math.max(1, Math.round(bmp.width * scale));
  const height = Math.max(1, Math.round(bmp.height * scale));
  const c = canvas(width, height);
  c.ctx.fillStyle = "#ffffff"; // a transparent screenshot would otherwise encode black
  c.ctx.fillRect(0, 0, width, height);
  c.ctx.drawImage(bmp, 0, 0, width, height);
  const encoded = new Uint8Array(await (await toJpeg(c.canvas, quality)).arrayBuffer());
  const clean = stripJpegMetadata(encoded);
  if (jpegHasMetadata(clean)) throw new Error("metadata");
  return { blob: new Blob([clean], { type: "image/jpeg" }), base64: bytesToBase64(clean), width, height };
}

/** The blur measure: Laplacian variance over a greyscale copy at 512px on the long edge. */
export function measureBlur(bmp: ImageBitmap): number {
  const scale = Math.min(1, BLUR_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.max(3, Math.round(bmp.width * scale)), h = Math.max(3, Math.round(bmp.height * scale));
  const c = canvas(w, h);
  c.ctx.drawImage(bmp, 0, 0, w, h);
  const { data } = c.ctx.getImageData(0, 0, w, h);
  return blurScore(toGrey(data, w, h), w, h);
}

/** One photo, made ready. Throws when it cannot be opened. */
export async function preparePhoto(file: Blob & { name?: string }): Promise<PreparedPage> {
  const bmp = await decodePhoto(file);
  try {
    const blur = measureBlur(bmp);
    return { ...(await encodePhoto(bmp)), blur, blurry: blur < BLUR_THRESHOLD };
  } finally {
    bmp.close();
  }
}

/**
 * Fit every page under the callable's caps: as encoded, else re-encoded at each lower quality in
 * turn. Null when even the lowest does not fit — the screen then says so, plainly.
 */
export async function fitPhotos(files: (Blob & { name?: string })[], encoded: string[]): Promise<string[] | null> {
  if (fitsPayload(encoded.map((b) => b.length))) return encoded;
  for (const q of FALLBACK_QUALITIES) {
    const out: string[] = [];
    for (const f of files) {
      const bmp = await decodePhoto(f);
      try { out.push((await encodePhoto(bmp, q)).base64); } finally { bmp.close(); }
    }
    if (fitsPayload(out.map((b) => b.length))) return out;
  }
  return null;
}
