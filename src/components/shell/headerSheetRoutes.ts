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
 * ⚠️ ANALYTICS IS LISTED TOO, AND THAT ONE AWAITS A RULING. It has a page header, but the header is the
 *    anthracite BAND (`PageHeader band`), a full-width ink field of its own: a paper sheet behind it
 *    is either hidden by the band or hides it (measured: it hid it). It keeps its band and an oat tab.
 *
 * ⚠️ ONE REGISTER. The shell reads it for the tab's colour and `tests/e2e/sh2Lib.ts` reads it for the
 *    census, so a route cannot have a sheet with an oat tab above it, or the reverse.
 */
export const NO_HEADER_SHEET_ROUTES: readonly string[] = ["/dashboard", "/account", "/queries/analytics"];

export function hasHeaderSheet(pathname: string): boolean {
  return !NO_HEADER_SHEET_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
