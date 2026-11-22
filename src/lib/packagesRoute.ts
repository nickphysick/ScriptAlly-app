/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 (25 Oct): the page moved from /manuscripts/packages to /queries/packages, beside the
 * Query Centre and Analytics. The old address redirects, keeping its query string and hash, so every deep link
 * (`?pkg=`, `?tab=builder`, `?new=1&version=` from Versions) still lands where it meant to.
 *
 * ⚠️ IT SITS ABOVE THE UNKNOWN-PATH GUARD in App.tsx, for the reason the Corkboard's redirect does: the old path
 *    is no longer a workspace path, so the guard would send a bookmark to the dashboard.
 */
export const PACKAGES_PATH = "/queries/packages";
export const OLD_PACKAGES_PATH = "/manuscripts/packages";

export function packagesRedirectFor(pathname: string, search = "", hash = ""): string | null {
  const p = pathname.replace(/\/+$/, "");
  return p === OLD_PACKAGES_PATH ? `${PACKAGES_PATH}${search}${hash}` : null;
}
