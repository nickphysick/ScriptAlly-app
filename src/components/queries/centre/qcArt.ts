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

/**
 * The plate header's drawing, in TWO LAYERS that share one box (4 Oct; ref
 * `design-refs/page-header/qc-plate-header-v1.html`).
 *
 * `QC_PLATE_COURIER` is `hero-courier-map.png` cropped from x 712 — the courier, his map, letters and
 * satchel, without the two drawn cards. `QC_PLATE_FIGURE` is the same crop with the semi-transparent
 * brush layer removed (pixels below alpha 200 dropped, ramped to 235). The UNDER layer is clipped to
 * the plate; the OVER layer is not, so the figure rises past the plate's top edge in front of its
 * border while the brush stops at it. Every brush in this art is a see-through layer, which is what
 * makes the split possible.
 *
 * ⚠️ THEY SHIP AS SUPPLIED — RGBA, not quantised — so they sit outside the PNG-8 budget the two
 * drawings above are held to. Both are guarded twice: their bytes against the pack's SHA256 in
 * `design-refs/.refhashes.json`, and their md5 version here, read by `qcArt.test.ts`. **The two must
 * share one box**, or the figure stops landing exactly on its own brush; that is locked too.
 */
export const QC_PLATE_COURIER: QcArt = {
  src: "/images/qc/qc-plate-courier.png",
  version: "4ba13296",
  width: 484,
  height: 375,
};
export const QC_PLATE_FIGURE: QcArt = {
  src: "/images/qc/qc-plate-courier-figure.png",
  version: "a84c6aac",
  width: 484,
  height: 375,
};

/**
 * Query Centre v126 — the header band's courier in a white disc (290 wide on the band), and the list
 * banner's perched hawk (170 wide, ALREADY MIRRORED — never flipped in CSS). Both from the v126 pack,
 * hashes verified at enrolment.
 */
export const QC_COURIER_DISC: QcArt = { src: "/images/qc/qc-courier-disc.png", version: "d09517cf", width: 560, height: 501 };
export const QC_LIST_PERCH: QcArt = { src: "/images/qc/qc-list-perch.png", version: "e1faf886", width: 464, height: 480 };

/**
 * Query Centre v132 — the "Your queries" workspace's flying hawk (210 wide, rising 74 above the ink
 * bar, rotated −4° in CSS) and the dead end's inkwell (110 wide). From the v132 pack, hashes verified
 * at enrolment; used exactly as supplied — never recoloured or cropped.
 */
export const QC_LIST_FLIGHT: QcArt = { src: "/images/qc/qc-list-flight.png", version: "6cf0cb8e", width: 640, height: 478 };
export const QC_INKWELL: QcArt = { src: "/images/qc/qc-inkwell.png", version: "567d2cc7", width: 316, height: 400 };
