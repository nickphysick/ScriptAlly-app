/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's one drawing: the Courier, in the Birds-eye view's header (v65 §8.1).
 *
 * ⚠️ IT IS THE REF'S OWN BYTES, CUT OUT AND ALREADY TRANSPARENT — colour type 6, 360 × 269. So it
 * takes NO `mix-blend-mode`, and none may be added: the dashboard's painted marks needed `multiply`
 * to drop a white field, that whole set was retired, and no blend survives anywhere in `src/`.
 * Applied here it would darken the drawing's own washes against the tray's colour.
 *
 * ⚠️ THE HASH IS LOCKED because a drawing is the one kind of file a diff cannot show you. The same
 * discipline as `dashArt`: the version is the first eight of its md5, and `qcArt.test.ts` reads the
 * file and fails if the bytes, the dimensions or the transparency change.
 */
export interface QcArt { src: string; version: string; width: number; height: number }

export const COURIER_CUTOUT: QcArt = {
  src: "/images/qc/courier-cutout.png",
  version: "1f96e3a8",
  width: 360,
  height: 269,
};

/**
 * v65.2 — the two drawings the Birds-eye view and the hero carry.
 *
 * ⚠️ THEY ARE PNG-8, NOT WebP, AND THAT IS A SUBSTITUTION. The brief asks for WebP; this machine
 * has no encoder for it — `cwebp` absent, `sips -s format webp` refusing with "Can't write format:
 * org.webmproject.webp", neither Pillow nor sharp installed. `scripts/qc-art.mjs` trims each source
 * to its alpha box, downscales to 2× its largest display size and quantises in node's own zlib;
 * both land well inside the 100KB budget with a measured mean RGB error under 2.3. The format is
 * not the one asked for and the size budget is met, which is the honest half of it.
 *
 * ⚠️ AND THE HASHES ARE OF THE SHIPPED FILES, not of the refs — the refs are guarded separately by
 * `design-refs/.refhashes.json`. Two different claims: that the artwork has not changed, and that
 * what the app serves is what the pipeline produced from it.
 */
export const HERO_COURIER_MAP: QcArt = {
  src: "/images/qc/hero-courier-map.png",
  version: "024e9aa4",
  width: 1196,
  height: 375,
};
export const BE_HAWK_HEAD: QcArt = {
  src: "/images/qc/be-hawk-head.png",
  version: "a10c3aa9",
  width: 300,
  height: 287,
};
