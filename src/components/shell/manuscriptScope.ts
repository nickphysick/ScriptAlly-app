/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ WHERE PICKING A MANUSCRIPT TAKES YOU ══════════════════════════════════════════════════════
 *
 * ⚠️ SCOPE AND VIEW ARE DIFFERENT FACTS AND TRAVEL ON DIFFERENT CHANNELS. Picking a book always
 * sets SCOPE — `scriptally_active_manuscript_id`, the section-wide pointer that packages, comps,
 * analytics and the dashboard kicker all read. That is unchanged and happens on every page. What
 * this module decides is the other half: whether the pick is also a change of VIEW, carried as
 * `/manuscripts?m=<id>`.
 *
 * ⚠️ IT IS A CHANGE OF VIEW ONLY WHEN YOU ARE ALREADY LOOKING AT THE MANUSCRIPTS PAGE. The switcher
 * is global chrome — it sits in the bar on all ten workspace pages — and a control that means
 * "which book am I working on" must not silently become "take me elsewhere" on nine of them.
 * Picking a book from `/queries` re-scopes the queries view; it does not throw the reader onto a
 * different page.
 *
 * ⚠️ AND THE DECISION LIVES HERE RATHER THAN AT THE TWO CALL SITES, because there are TWO
 * switchers — `WorkspaceShell`'s desktop picker and `ShellScope`'s mobile one, in two files, which
 * already differed before this (the desktop one re-navigated to the same path, the mobile one did
 * not navigate at all). Two copies of one rule drift, and the drift here would be
 * BREAKPOINT-dependent: the kind nobody notices, because whichever width you work at looks right.
 *
 * `null` means "this pick is not a change of view" — the caller keeps whatever navigation it was
 * doing for its own reasons, which is what stops the desktop picker navigating twice.
 */
export const MANUSCRIPTS_PATH = "/manuscripts";

/** The `?m=` reader's other half, so the param's name is written once. */
export const MANUSCRIPT_VIEW_PARAM = "m";

/** The URL shape itself, written once — three callers build this link and none of them spells it. */
export const manuscriptViewHref = (id: string): string =>
  `${MANUSCRIPTS_PATH}?${MANUSCRIPT_VIEW_PARAM}=${encodeURIComponent(id)}`;

export const manuscriptViewPath = (pathname: string, id: string): string | null => {
  /* A trailing slash is the same page. `App.tsx` normalises the same way before routing. */
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path !== MANUSCRIPTS_PATH) return null;
  return manuscriptViewHref(id);
};
