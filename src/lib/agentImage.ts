/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent photo compression (decision 10). The editor-header avatar is the upload control; the result
 * is stored INLINE on the agent doc as a data URL — deliberately not Firebase Storage.
 *
 * Pipeline: reject anything over 10MB before decoding → centre-crop to a square → canvas-downscale
 * to 256×256 → JPEG q0.82 (≈15–30KB). If canvas is unavailable or throws (tainted context, headless
 * runtime), fall back to the raw data URL rather than losing the writer's upload.
 */

/** Hard ceiling on the SOURCE file, checked before any decoding work. */
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const OUTPUT_EDGE = 256;
export const OUTPUT_QUALITY = 0.82;

export interface CropBox {
  sx: number;
  sy: number;
  size: number;
}

/** The centre square of a w×h image — pure, so the crop maths is testable without a DOM. */
export function centreCrop(width: number, height: number): CropBox {
  const size = Math.max(0, Math.min(width, height));
  return { sx: Math.round((width - size) / 2), sy: Math.round((height - size) / 2), size };
}

export type ImageRejection = "too-large" | "not-an-image";

export class AgentImageError extends Error {
  constructor(public readonly reason: ImageRejection, message: string) {
    super(message);
    this.name = "AgentImageError";
  }
}

/** Guard the source file before we spend anything decoding it. */
export function checkSource(file: { size: number; type: string }): AgentImageError | null {
  if (!/^image\//i.test(file.type || "")) {
    return new AgentImageError("not-an-image", "That file isn't an image.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return new AgentImageError("too-large", "That image is over 10MB — please pick a smaller one.");
  }
  return null;
}

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(new AgentImageError("not-an-image", "That image couldn't be read."));
    fr.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new AgentImageError("not-an-image", "That image couldn't be decoded."));
    img.src = src;
  });

/**
 * Compress a picked file to the stored avatar. Throws `AgentImageError` only for a rejected source;
 * any canvas failure degrades to the raw data URL so the upload still lands.
 */
export async function compressAgentImage(file: File): Promise<string> {
  const bad = checkSource(file);
  if (bad) throw bad;

  const raw = await readAsDataUrl(file);
  try {
    const img = await loadImage(raw);
    const { sx, sy, size } = centreCrop(img.naturalWidth || img.width, img.naturalHeight || img.height);
    if (!size) return raw;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_EDGE;
    canvas.height = OUTPUT_EDGE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    ctx.drawImage(img, sx, sy, size, size, 0, 0, OUTPUT_EDGE, OUTPUT_EDGE);
    const out = canvas.toDataURL("image/jpeg", OUTPUT_QUALITY);
    // A canvas that produced nothing usable is worse than the original.
    return out && out.startsWith("data:image/") ? out : raw;
  } catch {
    return raw;
  }
}
