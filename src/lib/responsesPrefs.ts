/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 — the page's stored choices, per writer, the way the Dashboard stores its founding band's fold
 * (`todoPrefs.dash.foundingFolded`, lib/dashFirstVisit): one dotted leaf under `todoPrefs.responses`, so a write never
 * wipes a sibling. `todoPrefs` is a free map in firestore.rules (`data.todoPrefs is map`), so no rules change.
 *
 *   wordFolded   "A word on rejections" hidden (Hide), until the writer presses Read (decision 11)
 */
import type { User } from "../types";
import type { UserPaths } from "./userPaths";

const ROOT = "todoPrefs.responses";
export interface ResponsesPrefs { wordFolded: boolean }
/** Total reader: whatever is stored (or nothing), a well-formed value comes back. */
export function responsesPrefsOf(user: Pick<User, "todoPrefs"> | null | undefined): ResponsesPrefs {
  const raw = ((user?.todoPrefs as { responses?: Record<string, unknown> } | undefined)?.responses ?? {}) as { wordFolded?: unknown };
  return { wordFolded: raw.wordFolded === true };
}
export const wordFoldWrite = (folded: boolean): UserPaths => ({ [`${ROOT}.wordFolded`]: folded });
