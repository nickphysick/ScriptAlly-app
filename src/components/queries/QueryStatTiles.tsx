/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The stat tiles (colours-v2 run, Phase 2; ref query-centre-v9-views-locked.html). They replace
 * the quick-filter chips and keep their semantics exactly: one active COURT, plus `Past expected`
 * as an independent second axis — which is what the lone `!` chip beside the old row already was.
 *
 * ⚠️ THE COUNTS ARE THE WHOLE SET'S, never the filtered view's. A tile that counted what it would
 * show after clicking would read 0 for every court you are not in, which is the one number nobody
 * needs. Same rule the chips stated; the derivation is `quickCounts`, unchanged.
 *
 * ⚠️ THE MARKUP MOVED TO `shared/StatTiles` AND THIS COMPONENT DID NOT CHANGE (QC-chassis round,
 * Phase 1). The To-do page needs the same tiles over its own five categories; a copy carrying the
 * same class names would be a fork that looks identical until one of them is restyled. So the
 * rendering is shared and the Query Centre's SEMANTICS stay here: the two axes, which one is
 * pressed, and the fact that `past` toggles rather than selects. Same props, same element
 * structure, same stylesheet — the call site in `Queries.tsx` is untouched.
 *
 * ⚠️ AND THE TWO AXES ARE WHY THIS WRAPPER EXISTS AT ALL. This page has a court AND an independent
 * overdue flag; the wrapper decides which keys are ringed and interprets the pick, and `StatTiles`
 * takes a SET so it can ring both. The first version of that prop was a single key, which
 * silently collapsed the two axes into one — caught by this page's own lock, which had pinned the
 * three lines that implemented it. The lock was pinning a spelling and it was RIGHT.
 */
import React from "react";
import { StatTiles } from "../shared/StatTiles";
import { STAT_TILES, type TileKey, type QuickKey } from "../../lib/queryCentreGrid";
import { STATE_TOKEN } from "../../lib/queryCardFacts";

/** The court glyphs — direction, not decoration: in, out, and the offer's tick. */
const GLYPH: Partial<Record<TileKey, string>> = { all: "✎", you: "←", agent: "→", offer: "✓" };

export const QueryStatTiles: React.FC<{
  counts: Record<QuickKey, number>;
  overdueCount: number;
  quickKey: QuickKey;
  overdue: boolean;
  onQuick: (k: QuickKey) => void;
  onOverdue: (next: boolean) => void;
}> = ({ counts, overdueCount, quickKey, overdue, onQuick, onOverdue }) => (
  <StatTiles
    label="Query totals"
    /* ⚠️ TWO AXES, SO TWO KEYS CAN BE RINGED AT ONCE — one active court PLUS the independent
       overdue flag. "With you and past expected" is the commonest question on this page and a row
       of five exclusive buttons would make it unaskable. */
    selected={overdue ? [quickKey, "past"] : [quickKey]}
    onPick={(k) => (k === "past" ? onOverdue(!overdue) : onQuick(k as QuickKey))}
    tiles={STAT_TILES.map((t) => ({
      key: t.key,
      label: t.label,
      count: t.key === "past" ? overdueCount : counts[t.key as QuickKey],
      swatch: t.swatch ? STATE_TOKEN[t.swatch] : undefined,
      glyph: GLYPH[t.key],
      mark: t.mark,
    }))}
  />
);
