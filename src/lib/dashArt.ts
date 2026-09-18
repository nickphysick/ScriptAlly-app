/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashArt — the dashboard's illustrations, stated once (17 Sep; v16, 18 Sep).
 *
 * ⚠️ THE VERSION IS THE FILE'S OWN HASH (the first eight hex of its md5), and a test recomputes it —
 * so replacing the picture without bumping the query string fails rather than serving a cached old
 * picture for a year. Both files are 1000×1000 originals from the QueryHawk designs folder, resized
 * to 2.5× their display size and quantised to a 256-colour palette with the alpha kept.
 *
 * ⚠️ `ACTIVE_QUERY_ART` HAS NO RENDERER TODAY, AND THE FILE STAYS (Nick, 18 Sep). The v16 chart header
 * is the title, the eyebrow and the grain chip — no picture. The header keeps its flex row so the 96px
 * slot can come back beside the count without a relayout, and this constant is what would fill it;
 * the md5 lock keeps the file honest in the meantime.
 *
 * ⚠️ THE v33 SET LIVES IN `public/images/dash/` (18 Sep). Six drawings and the greeting's shadow, from
 * the v33 build pack. Each was resized to 2.5–3× its display size and quantised to a 256-colour
 * palette with the alpha kept; the shadow is one colour × 256 alphas, so its soft edge is exact.
 *
 * ⚠️ THE TWO PAIRS SHARE A CANVAS AND MUST GO ON SHARING IT. `mentor`/`mentorLooking` and
 * `archivist`/`archivistLooking` were cut to one canvas each so the hover swap registers to the
 * pixel; both files of a pair were resized by ONE factor (`sips -z` to the same box). Trimming either
 * to its own alpha bounds gives the two different boxes and the swap jumps. `illustratedMarks.test`
 * asserts the two files of each pair declare the same size.
 *
 * ⚠️ `public/images/hawk-shadow.png` IS THE LANDING PAGE'S AND IS NOT THIS ONE. That file is pre-toned
 * (about 3% alpha baked in) and cropped differently; at the greeting's 8% it would be invisible.
 */
export const ACTIVE_QUERY_ART = { src: "/images/active-query-hawk.png", version: "34316907", width: 240, height: 240 } as const;

export interface DashArt { src: string; version: string; width: number; height: number }

export const DASH_ART = {
  quill: { src: "/images/dash/quill.png", version: "5843f299", width: 379, height: 480 },
  mentor: { src: "/images/dash/mentor-leaning.png", version: "09a65a13", width: 267, height: 450 },
  mentorLooking: { src: "/images/dash/mentor-leaning-looking.png", version: "20f3a8cd", width: 267, height: 450 },
  archivist: { src: "/images/dash/archivist.png", version: "b746635c", width: 420, height: 374 },
  archivistLooking: { src: "/images/dash/archivist-looking.png", version: "73301461", width: 420, height: 374 },
  courier: { src: "/images/dash/courier.png", version: "9c2a4371", width: 525, height: 393 },
  shadow: { src: "/images/dash/hawk-shadow-solid.png", version: "d3269552", width: 1075, height: 935 },
} as const satisfies Record<string, DashArt>;

/** The files that must register to the pixel — see the header. */
export const ART_PAIRS: readonly (readonly [keyof typeof DASH_ART, keyof typeof DASH_ART])[] = [
  ["mentor", "mentorLooking"],
  ["archivist", "archivistLooking"],
];

export const artUrl = (a: { src: string; version: string }): string => `${a.src}?v=${a.version}`;
