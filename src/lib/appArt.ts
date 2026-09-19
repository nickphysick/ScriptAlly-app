/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * appArt — the app's own brand art, stated once (the v34 mockup, 19 Sep).
 *
 * ⚠️ `APP_MARK` IS A 120px COPY OF THE LANDING NAV'S ROUNDEL, NOT A NEW MARK. The source is
 * `public/images/queryhawk-logo.png` (500×500, 245KB) — the marketing tier's, registered in
 * `src/marketing/brandArt.ts`, and deliberately NOT imported here: 245KB for a 40px slot on every
 * workspace route is the cost "reuse" was never meant to buy. This copy was resized to 3× its display
 * size and quantised to a 256-colour palette with the alpha kept (7KB). If the roundel is ever
 * redrawn, BOTH files change; the md5 lock below is what notices a copy that was left behind.
 *
 * ⚠️ THE VERSION IS THE FILE'S OWN HASH (the first eight hex of its md5), and a test recomputes it.
 */
export interface AppArt { src: string; version: string; width: number; height: number }

export const APP_MARK: AppArt = { src: "/images/app/queryhawk-mark.png", version: "014ff912", width: 120, height: 120 };

export const artUrl = (a: Pick<AppArt, "src" | "version">): string => `${a.src}?v=${a.version}`;
