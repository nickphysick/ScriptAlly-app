/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1 — WHERE THE WRITER WAS BEFORE THE HELP CENTRE. The shell notes every route it shows; the Help Centre
 * asks for the last one that was not a help page, and rings that page's guide card "YOU WERE HERE".
 *
 * ⚠️ A TRAIL, NOT NAVIGATION STATE ALONE. Nine controls lead to /help (the Help menu, the account menu, the footer, the
 *    palette, a guide's "See your guides", a definition's link, …). Navigation state would need every one of them to
 *    remember to pass it, and the tenth would not. The Help Centre still prefers `location.state.from` when a caller
 *    gives one; this is what it falls back on.
 * ⚠️ HELD FOR THE TAB'S SESSION (sessionStorage), so a reload on /help still knows where the writer came from.
 */
const KEY = "sa.help.from";
let lastOutsideHelp: string | null = null;

/** The shell shows `path`. */
export function noteRoute(path: string): void {
  const p = path.replace(/\/+$/, "") || "/";
  if (p === "/help" || p.startsWith("/help/")) return;
  lastOutsideHelp = p;
  try { sessionStorage.setItem(KEY, p); } catch { /* private mode: this load only */ }
}
/** The last route shown that was not the Help Centre or an article (this tab's session); null when there is none. */
export function lastRouteOutsideHelp(): string | null {
  if (lastOutsideHelp) return lastOutsideHelp;
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}
