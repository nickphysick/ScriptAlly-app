/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Source Serif 4's real italic, for the signed-in app only (Query panel v2, ruling 2).
 *
 * `index.html` loads the upright 400 and 600 for every page, the public ones included. The query panel sets
 * a good deal in italics, and without an italic face the browser slants the upright one. This adds the italic
 * as a stylesheet of the app's own: it is asked for when the workspace mounts, so a public page never loads it.
 *
 * One variable file per script covers both weights (400 and 600); the browser fetches the Latin one on first use.
 */
const ID = "sa-app-serif-italic";
export const APP_SERIF_ITALIC_HREF = "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@1,8..60,400;1,8..60,600&display=swap";

export function ensureAppSerifItalic(): void {
  if (typeof document === "undefined" || document.getElementById(ID)) return;
  const l = document.createElement("link");
  l.id = ID;
  l.rel = "stylesheet";
  l.href = APP_SERIF_ITALIC_HREF;
  document.head.appendChild(l);
}
