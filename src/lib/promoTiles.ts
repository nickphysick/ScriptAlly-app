/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE LANDING'S THREE PROMOS — which show, and which have been sent away ════════════════════
 *
 * ⚠️ NEVER ABOUT THIS BOOK. These describe what a manuscript can DO here; a promo that reported on
 * the writer's own manuscript would be a figure competing with the shelf beside it.
 *
 * ⚠️ AND A PROMO THAT NEVER HIDES IS NOISE BY THE FIFTIETH VISIT. Two of the three are dismissable
 * per user; the third hides on its own evidence — a writer with a second version does not need the
 * versions pitch, and hiding it on that rather than on a click means they never have to ask.
 */
import { User, Manuscript, ManuscriptVersion } from "../types";

export type PromoTile = "versions" | "wordcount" | "packages";

/** ⚠️ ONLY THESE TWO ARE DISMISSABLE. Versions hides on evidence, which is not the same thing. */
export const DISMISSABLE: readonly PromoTile[] = ["wordcount", "packages"];

/**
 * ⚠️ THE STORE IS `todoPrefs.manuscripts`, BESIDE THE NOTEBOARD'S OWN SUB-MAP. `todoPrefs` is
 * `is map` and unconstrained in the rules, so a page-scoped sub-map ships with NO allowlist entry —
 * PROVED against the deployed ruleset by `rulesProbe.mjs` rather than taken from the comment that
 * claims it.
 *
 * ⚠️ AND IT IS USER STATE, NOT localStorage. A dismissal kept on the device returns on the next one,
 * which is not dismissal — it is forgetting.
 */
export const dismissedTiles = (user: Pick<User, "todoPrefs"> | null | undefined): PromoTile[] => {
  const raw = user?.todoPrefs?.manuscripts?.dismissedTiles;
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is PromoTile => (DISMISSABLE as readonly string[]).includes(t));
};

/**
 * The next value for the whole `todoPrefs` map.
 *
 * ⚠️ IT MERGES RATHER THAN REPLACES, and that is not tidiness: `todoPrefs` also carries the To-do
 * board's four settings and the Noteboard's sub-map. A dismissal that wrote the field wholesale
 * would silently delete another page's preferences — the probe asserts this shape for that reason.
 */
export const withTileDismissed = (
  user: Pick<User, "todoPrefs"> | null | undefined,
  tile: PromoTile,
): NonNullable<User["todoPrefs"]> => {
  const prefs = user?.todoPrefs ?? {};
  const next = new Set(dismissedTiles(user));
  next.add(tile);
  return { ...prefs, manuscripts: { ...(prefs.manuscripts ?? {}), dismissedTiles: [...next] } };
};

/**
 * ⚠️ THE VERSIONS TILE HIDES ON ITS OWN EVIDENCE. A Pro user with three versions does not need the
 * pitch, and asking them to dismiss it is asking them to tidy up after an advert.
 *
 * ⚠️ "A SECOND VERSION" MEANS THIS BOOK'S. Counting across the shelf would hide the tile on a book
 * that has never had one, on the strength of a different book entirely.
 */
export const versionsTileShown = (
  manuscriptId: string | null,
  versions: Pick<ManuscriptVersion, "manuscriptId">[],
): boolean => {
  if (!manuscriptId) return versions.length < 2;
  return versions.filter((v) => v.manuscriptId === manuscriptId).length < 2;
};

/** The tiles to render, in the ref's order, after both rules. */
export const visibleTiles = (args: {
  user: Pick<User, "todoPrefs"> | null | undefined;
  manuscriptId: string | null;
  versions: Pick<ManuscriptVersion, "manuscriptId">[];
}): PromoTile[] => {
  const gone = new Set(dismissedTiles(args.user));
  const order: PromoTile[] = ["versions", "wordcount", "packages"];
  return order.filter((t) =>
    t === "versions" ? versionsTileShown(args.manuscriptId, args.versions) : !gone.has(t));
};

/** Unused today; kept so the type is exercised rather than asserted. */
export type { Manuscript };
