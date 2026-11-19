/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * List filters v1 Phase 2 (design-refs/list-filters-v1/) — THE QUERIES LIST'S FILTER PANEL, in the filter column. The
 * card is the shared shell/FilterPanel; this file says what the Queries list's sections, counts and writes are:
 *
 *   What needs you    four number tiles from the quick picks (lib/qc140 QUICK_PICKS, in order), one at a time; pressing
 *                     the one that is on clears it. No "All queries".
 *   Stage             the bar and five labels (shell/StageFilter): a label toggles every status of its stage
 *   What you sent     pills over the rounds or packages, "Nothing recorded" last; past eight, "+{n} more" shows the rest
 *   Dates             a fold of three switches: Due this week, Missing materials, Over a year
 *   foot              "All {N} queries. {y} need you." / "Showing {n} of {N} queries."
 *
 * ⚠️ A PRESENTATION OF THE PAGE'S ONE FILTER STATE (`Qc138Filters`), never a second model: every control writes through
 *    `onFilters`, and every count is the faceted count (lib/qc153Rail `railCounts`): the number the list would show if
 *    that control were pressed.
 * ⚠️ "Past their reply date" is the quick pick and nothing else here: it is the same field (`past`) the Dates group's
 *    switch used to write. `where` has no control here; set from the header or a link it still filters and shows as an
 *    applied chip, and Clear all clears it.
 * ⚠️ ITS HOOKS ARE `data-qc156`, never `data-clq`: every workspace page stays mounted.
 */
import React, { useState } from "react";
import { SENT_NONE, type Qc138Filters } from "../../../lib/qc138";
import { QUICK_PICKS, STAGES, STAGE_LABEL, STAGE_MARK, stageOn, toggleStage, type QuickKey } from "../../../lib/qc140";
import { MORE_ROWS_153, pickQuick, quickOn, railOn, type RailCounts } from "../../../lib/qc153Rail";
import { FilterFold, FilterPanel, FilterPills, FilterSection, FilterSwitch, FilterTile, FilterTiles, type FilterIcon } from "../../shell/FilterPanel";
import { StageBar, StageLabels, type StageItem } from "../../shell/StageFilter";
import "./qcv156.css";

/** a round or package the writer has sent ("What you sent"), or SENT_NONE for "Nothing recorded" */
export interface RailSent { key: string; name: string; line?: string }

/** each quick pick's icon: the "you" mark, a clock, a paper plane, the Offer mark as a line */
export const QUICK_ICON: Record<QuickKey, FilterIcon> = { you: "you", over: "clock", wait: "plane", offers: "seal" };
/** the Dates fold: today's More rows without "Past their reply date", which is the quick pick */
export const DATE_ROWS = MORE_ROWS_153.filter((r) => r.key !== "past");
/** more than this many sent pills: the highest counts, then "+{n} more" */
export const SENT_SHOWN = 8;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
/** the foot's sentence */
export function queriesFoot(on: boolean, showing: number, total: number, needYou: number): string {
  if (on || showing !== total) return `Showing ${showing} of ${total} ${plural(total, "query", "queries")}.`;
  const all = `All ${total} ${plural(total, "query", "queries")}.`;
  return needYou > 0 ? `${all} ${needYou} ${plural(needYou, "needs", "need")} you.` : all;
}

export interface QcViews156Props {
  filters: Qc138Filters;
  onFilters: (f: Qc138Filters) => void;
  counts: RailCounts;
  sent: readonly RailSent[];
  /** Clear all: every filter (the page's own clear, which takes `where` too) */
  onReset: () => void;
  showing: number;
  /** every query on the list (the manuscript in scope) */
  total: number;
  /** Your move's count with nothing filtered */
  needYou: number;
  loading?: boolean;
}

export const QcViews156: React.FC<QcViews156Props> = ({ filters: f, onFilters, counts, sent, onReset, showing, total, needYou, loading = false }) => {
  const [allSent, setAllSent] = useState(false);
  const on = railOn(f);
  const stages: StageItem[] = STAGES.map((st) => ({
    stage: st, label: STAGE_LABEL[st], mark: STAGE_MARK[st], n: counts.stage[st] ?? 0, on: stageOn(f, st), onToggle: () => onFilters(toggleStage(f, st)),
  }));
  const picked = stages.filter((x) => x.on).length;

  /* What you sent: the eight with the highest counts (and any that is on), in their own order; "+{n} more" the rest */
  const top = new Set([...sent].sort((a, b) => (counts.sent[b.key] ?? 0) - (counts.sent[a.key] ?? 0)).slice(0, SENT_SHOWN).map((o) => o.key));
  const shownSent = allSent || sent.length <= SENT_SHOWN ? sent : sent.filter((o) => top.has(o.key) || f.sent.includes(o.key));
  const datesOn = DATE_ROWS.filter((r) => f[r.key]).length;

  return (
    <FilterPanel hook="data-qc156" label="Filter your queries" on={on} onClear={onReset} loading={loading}
      foot={queriesFoot(on > 0, showing, total, needYou)}>
      <FilterSection probe="needs-you" title="What needs you">
        <FilterTiles label="What needs you">
          {QUICK_PICKS.map((p) => (
            <FilterTile key={p.key} k={p.key} n={counts.quick[p.key] ?? 0} label={p.title} title={p.line} icon={QUICK_ICON[p.key]}
              on={quickOn(f, p.key)} onPress={() => onFilters(pickQuick(f, p.key))} />
          ))}
        </FilterTiles>
      </FilterSection>

      <FilterSection probe="stages" title="Stage" aside={<small data-qc156="stage-note">{picked ? `${picked} picked` : "how far they’ve got"}</small>}>
        <StageBar items={stages} />
        <StageLabels items={stages} />
      </FilterSection>

      {sent.length > 0 ? (
        <FilterSection probe="sent-section" title="What you sent">
          <FilterPills probe="sent" label="What you sent"
            items={shownSent.map((o) => {
              const isOn = f.sent.includes(o.key);
              return { k: o.key === SENT_NONE ? "none" : o.key, label: o.name, title: o.line, n: counts.sent[o.key] ?? 0, on: isOn,
                onToggle: () => onFilters({ ...f, sent: isOn ? f.sent.filter((x) => x !== o.key) : [...f.sent, o.key] }) };
            })}
            more={shownSent.length < sent.length ? { n: sent.length - shownSent.length, onPress: () => setAllSent(true) } : null} />
        </FilterSection>
      ) : null}

      <FilterFold probe="dates" title="Dates" on={datesOn}>
        {DATE_ROWS.map((r) => (
          <FilterSwitch key={r.key} k={r.key} label={r.label} n={counts.more[r.key] ?? 0} on={f[r.key]} onToggle={() => onFilters({ ...f, [r.key]: !f[r.key] })} />
        ))}
      </FilterFold>
    </FilterPanel>
  );
};
