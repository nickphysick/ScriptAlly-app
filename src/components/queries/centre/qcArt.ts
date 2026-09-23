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
