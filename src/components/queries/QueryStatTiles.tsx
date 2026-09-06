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
 */
import React from "react";
import "./queryStatTiles.css";
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
  <div className="qct" role="group" aria-label="Query totals">
    {STAT_TILES.map((t) => {
      const isPast = t.key === "past";
      const on = isPast ? overdue : quickKey === t.key;
      const n = isPast ? overdueCount : counts[t.key as QuickKey];
      return (
        <button
          key={t.key}
          type="button"
          className={`qct-tile${on ? " qct-tile--on" : ""}`}
          aria-pressed={on}
          onClick={() => (isPast ? onOverdue(!overdue) : onQuick(t.key as QuickKey))}
        >
          <span
            className={`qct-ic${t.swatch ? "" : " qct-ic--plain"}`}
            aria-hidden="true"
            style={t.swatch ? { background: STATE_TOKEN[t.swatch] } : undefined}
          >
            {t.mark ? <span className="qct-mk">{t.mark}</span> : GLYPH[t.key]}
          </span>
          <span className="qct-tx">
            <span className="qct-k">{t.label}</span>
            <span className="qct-n">{n}</span>
          </span>
        </button>
      );
    })}
  </div>
);
