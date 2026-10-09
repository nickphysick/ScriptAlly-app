/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHICH ROUTES HAVE A HEADER SHEET (app shell v2, 9 Oct).
 *
 * Every signed-in route that opens with a page header renders `HeaderSheet` behind it, and on those
 * routes the top bar's page tab takes the sheet's colour. Two kinds of route have NO page header and
 * so no sheet, and their tab stays the page colour: the dashboard (its greeting is content, not a
 * header) and the settings chassis (`/account/…`, which titles each section itself).
 *
 * (Header panel v2 narrowed that to the routes outside the workspace set; see below.)
 */
export const NO_HEADER_SHEET_ROUTES: readonly string[] = ["/dashboard", "/account"];

/**
 * HEADER PANEL v2 (9 Oct): every WORKSPACE page's header is the blue panel (shell/headerPanel.css), and a panel has no
 * sheet under it. A header sheet is left on the pages outside that set that have a page header (Help centre, Plans,
 * Import) and on every empty state. So this list answers "which routes show a PANEL when populated".
 *
 * ⚠️ THE SHELL NO LONGER READS THIS FILE. The folder tab's colour is decided in inkShell.css by whether a header sheet
 *    is ON SCREEN, because an empty state shares its route with the populated page. The lists remain as the census the
 *    locks are written against (tests/e2e/sh2Lib.ts, hp2Lib.ts).
 */
export const HEADER_PANEL_ROUTES: readonly string[] = ["/queries", "/queries/analytics", "/agents", "/agents/discover", "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/todo", "/todo/calendar", "/todo/noteboard"];

const under = (list: readonly string[], pathname: string) => list.some((r) => pathname === r || pathname.startsWith(`${r}/`));
/** the routes whose populated page has a panel header */
export function hasHeaderPanel(pathname: string): boolean {
  return HEADER_PANEL_ROUTES.includes(pathname);
}
/** the routes whose populated page has a header sheet: a page header, and not a panel */
export function hasHeaderSheet(pathname: string): boolean {
  return !under(NO_HEADER_SHEET_ROUTES, pathname) && !hasHeaderPanel(pathname);
}
