/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The frame contract's two menus and its snooze panel — contents only; the anchoring is
 * `AnchoredPanel`'s and the chrome is the contract's own, ported into `todoFrame.css`.
 */
import React from "react";
import { Bucket } from "../../lib/todoBuckets";
import {
  GROUP_IDS, GroupId, GROUPING_LABEL, GroupingId, ListView, SORT_LABEL, SortId,
  TYPE_LABEL, TYPE_ORDER, VIEW_DEFAULT,
} from "../../lib/todoListView";
import { snoozeParts } from "../../lib/elapsed";

/* the contract's swatches: family tints for the groups, pill tints for the types */
const GROUP_SWATCH: Record<GroupId, string> = { urgent: "#c96f52", housekeeping: "#7e937c", yours: "#c2a869" };
const TYPE_SWATCH: Record<Bucket, string> = {
  send: "#f2dccf", decide: "#e8c8bc", chase: "#e9e0cc", close: "#dfe5dc", fix: "#dde1e8", note: "#efe4cc",
};
const GROUP_LABEL: Record<GroupId, string> = {
  urgent: "Needs you now", housekeeping: "Housekeeping", yours: "Your tasks",
};

const Item: React.FC<{
  on: boolean; swatch?: string; count?: number; onPick: () => void; children: React.ReactNode;
}> = ({ on, swatch, count, onPick, children }) => (
  <button type="button" role="menuitemcheckbox" aria-checked={on}
    className={on ? "m-i on" : "m-i"} onClick={onPick}>
    {swatch && <span className="swatch" style={{ background: swatch }} />}
    {children}
    {typeof count === "number" && <span className="cnt">{count}</span>}
    <span className="mark">✓</span>
  </button>
);

export interface FilterMenuProps {
  view: ListView;
  groupCounts: Record<GroupId, number>;
  typeCounts: Record<Bucket, number>;
  snoozedCount: number;
  dismissedCount: number;
  shown: number;
  onChange: (v: ListView) => void;
}

export const FilterMenu: React.FC<FilterMenuProps> = ({
  view, groupCounts, typeCounts, snoozedCount, dismissedCount, shown, onChange,
}) => {
  /* ⚠️ A MULTI-SELECT NEVER EMPTIES ITSELF. Turning the last one off would show nothing and read as
     a broken page; the toggle simply refuses, which is what "these are alternatives" means. */
  const toggle = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? (list.length > 1 ? list.filter((x) => x !== v) : list) : [...list, v];

  return (
    <>
      <div className="m-h">Show tasks</div>
      {GROUP_IDS.map((g) => (
        <Item key={g} on={view.groups.includes(g)} swatch={GROUP_SWATCH[g]} count={groupCounts[g]}
          onPick={() => onChange({ ...view, groups: toggle(view.groups, g) })}>{GROUP_LABEL[g]}</Item>
      ))}
      <div className="m-rule" />
      <div className="m-h">By type</div>
      {TYPE_ORDER.map((t) => (
        <Item key={t} on={view.types.includes(t)} swatch={TYPE_SWATCH[t]} count={typeCounts[t]}
          onPick={() => onChange({ ...view, types: toggle(view.types, t) })}>{TYPE_LABEL[t]}</Item>
      ))}
      <div className="m-rule" />
      <Item on={view.includeSnoozed} count={snoozedCount}
        onPick={() => onChange({ ...view, includeSnoozed: !view.includeSnoozed })}>Include snoozed</Item>
      {/* ⚠️ BESIDE IT, NOT INSTEAD OF IT (pane round, Phase 7). Two states, two entries, both off by
          default — the list shows what is live, and either can be admitted without the other. */}
      <Item on={view.includeDismissed} count={dismissedCount}
        onPick={() => onChange({ ...view, includeDismissed: !view.includeDismissed })}>Include dismissed</Item>
      <div className="m-foot">
        <a role="button" tabIndex={0} onClick={() => onChange({ ...VIEW_DEFAULT })}>Show everything</a>
        <span className="n">{shown} shown</span>
      </div>
    </>
  );
};

export const SortMenu: React.FC<{ view: ListView; onChange: (v: ListView) => void }> = ({ view, onChange }) => (
  <>
    <div className="m-h">Order by</div>
    {(Object.keys(SORT_LABEL) as SortId[]).map((s) => (
      <button key={s} type="button" role="menuitemradio" aria-checked={view.sort === s}
        className={view.sort === s ? "m-i on" : "m-i"} onClick={() => onChange({ ...view, sort: s })}>
        {SORT_LABEL[s]}<span className="mark">✓</span>
      </button>
    ))}
    <div className="m-rule" />
    <div className="m-h">Grouping</div>
    {(Object.keys(GROUPING_LABEL) as GroupingId[]).map((g) => (
      <button key={g} type="button" role="menuitemradio" aria-checked={view.grouping === g}
        className={view.grouping === g ? "m-i on" : "m-i"} onClick={() => onChange({ ...view, grouping: g })}>
        {GROUPING_LABEL[g]}<span className="mark">✓</span>
      </button>
    ))}
  </>
);

/* ── the snooze panel ─────────────────────────────────────────────────────────────────────── */

const CHIPS: { label: string; days: number }[] = [
  { label: "Tomorrow", days: 1 }, { label: "Next week", days: 7 }, { label: "Next month", days: 30 },
];

export interface SnoozePanelProps {
  /** the open task's deed, named in the sub-line so the panel says what it will act on */
  deed: string;
  onCancel: () => void;
  onConfirm: (days: number, whenLabel: string) => void;
}

export const SnoozePanel: React.FC<SnoozePanelProps> = ({ deed, onCancel, onConfirm }) => {
  const [days, setDays] = React.useState(7);
  /* ⚠️ THE CHIP IS DERIVED FROM THE DAYS, not tracked beside them. Tracked separately, moving the
     slider to exactly 7 would leave "Next week" unlit or lit-and-wrong depending on the order the
     two states were written — one value, one truth. */
  const chip = CHIPS.find((c) => c.days === days)?.label ?? null;
  const part = snoozeParts(days);
  const back = new Date(Date.now() + days * 86400000);
  const returns = back.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <>
      <div className="p-h">Snooze this task</div>
      <div className="p-sub">{deed} — it leaves the list and comes back when you say.</div>
      <div className="p-lbl">Until</div>
      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c.label} type="button" className={chip === c.label ? "chip on" : "chip"}
            onClick={() => setDays(c.days)}>{c.label}</button>
        ))}
      </div>
      <div className="p-lbl">Or slide it</div>
      <div className="slide">
        <input type="range" min={1} max={90} value={days} aria-label="Days to snooze"
          style={{ ["--pc" as string]: `${((days - 1) / 89) * 100}%` }}
          onChange={(e) => setDays(Number(e.target.value))} />
        <div className="readout">
          <span className="v">{part.figure} {part.unit}</span>
          <span className="until">Returns {returns}</span>
        </div>
      </div>
      <div className="note-line">Snoozed tasks live behind the filter's “Include snoozed” — nothing is lost.</div>
      <div className="p-foot">
        <button type="button" className="b-quiet" onClick={onCancel}>Cancel</button>
        <button type="button" className="b-go"
          onClick={() => onConfirm(days, `BACK ${returns}`)}>Snooze it</button>
      </div>
    </>
  );
};
