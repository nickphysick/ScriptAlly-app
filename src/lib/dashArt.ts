/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashArt — the dashboard's stage-2/3 illustrations, stated once (17 Sep).
 *
 * ⚠️ THE VERSION IS THE FILE'S OWN HASH (the first eight hex of its md5), exactly as `HEADER_ART`'s is,
 * and a test recomputes it — so replacing the picture without bumping the query string fails rather
 * than serving a cached old picture for a year. Both are 1000×1000 originals from the QueryHawk
 * designs folder, resized to 2.5× their display size and quantised to a 256-colour palette with the
 * alpha kept (695KB → 18KB and 549KB → 5KB).
 */
export const ACTIVE_QUERY_ART = { src: "/images/active-query-hawk.png", version: "34316907", width: 240, height: 240 } as const;
export const QUICK_ACTIONS_ART = { src: "/images/quick-actions.png", version: "a5af21df", width: 130, height: 130 } as const;

export const artUrl = (a: { src: string; version: string }): string => `${a.src}?v=${a.version}`;
