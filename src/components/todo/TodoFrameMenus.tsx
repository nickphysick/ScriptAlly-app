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
  GROUP_IDS, GroupId, GROUPING_DESC, GROUPING_LABEL, GroupingId, ListView, SORT_DESC, SORT_LABEL,
  SortId, TYPE_LABEL, TYPE_ORDER, VIEW_DEFAULT,
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
  /**
   * ⚠️ CONDITIONAL COUNTS — "what this choice would leave, given the others", the contract's own
   * foot-note. The page derives both from `viewLeaving` (the view re-run with the option's own
   * facet lifted), so the numbers genuinely answer the question the panel is asking; a count over
   * the raw board would promise rows the other filters have already hidden.
   */
  typeCounts: Record<Bucket, number>;
  /** every agent who has a live card, id → name+count — the ticks' population AND their labels */
  agentRows: { id: string; name: string; count: number }[];
  snoozedCount: number;
  dismissedCount: number;
  onChange: (v: ListView) => void;
}

export const FilterMenu: React.FC<FilterMenuProps> = ({
  view, typeCounts, agentRows, snoozedCount, dismissedCount, onChange,
}) => {
  /* the find box narrows the TICK LIST, never the tasks — a panel-local convenience */
  const [find, setFind] = React.useState("");
  const toggleType = (t: Bucket): Bucket[] =>
    view.types.includes(t)
      ? (view.types.length > 1 ? view.types.filter((x) => x !== t) : view.types)
      : [...view.types, t];
  const toggleAgent = (id: string): string[] =>
    view.agents.includes(id) ? view.agents.filter((x) => x !== id) : [...view.agents, id];
  const shownAgents = agentRows.filter((a) => a.name.toLowerCase().includes(find.trim().toLowerCase()));
  return (
    <div className="tdvp" role="none">
      <div className="v-ph"><span className="t">Filter</span>
        <button type="button" className="a"
          onClick={() => onChange({ ...view, types: [...TYPE_ORDER], agents: [], includeSnoozed: false, includeDismissed: false })}>
          Clear all
        </button>
      </div>
      <div className="v-sec">Task type</div>
      {TYPE_ORDER.map((t) => (
        <button key={t} type="button" role="menuitemcheckbox" aria-checked={view.types.includes(t)}
          className={view.types.includes(t) ? "v-opt on" : "v-opt"}
          onClick={() => onChange({ ...view, types: toggleType(t) })}>
          <span className="v-tick" aria-hidden>✓</span>
          <span className="v-body">{TYPE_LABEL[t]}</span>
          <span className="v-c">{typeCounts[t]}</span>
        </button>
      ))}
      <div className="v-sec">Agent</div>
      <div className="v-find">
        <input value={find} onChange={(e) => setFind(e.target.value)}
          placeholder="Find an agent…" aria-label="Find an agent" />
      </div>
      {/* ⚠️ THE TICK LIST SCROLLS INSIDE THE PANEL — the AnchoredPanel re-placement rule from the
          recon, built in from the start: the panel's own height never changes as counts change or
          the find box narrows, so the placement is measured once and holds. */}
      <div className="v-agents">
        {shownAgents.map((a) => (
          <button key={a.id} type="button" role="menuitemcheckbox" aria-checked={view.agents.includes(a.id)}
            className={view.agents.includes(a.id) ? "v-opt on" : "v-opt"}
            onClick={() => onChange({ ...view, agents: toggleAgent(a.id) })}>
            <span className="v-tick" aria-hidden>✓</span>
            <span className="v-av" aria-hidden>{a.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
            <span className="v-body">{a.name}</span>
            <span className="v-c">{a.count}</span>
          </button>
        ))}
        {shownAgents.length === 0 && <div className="v-none">No agent matches that.</div>}
      </div>
      <div className="v-sec">Also show</div>
      {/* ⚠️ THE ONLY TOGGLES THAT WIDEN — everything above narrows, and the + on the count says so */}
      <button type="button" role="menuitemcheckbox" aria-checked={view.includeSnoozed}
        className={view.includeSnoozed ? "v-opt on" : "v-opt"}
        onClick={() => onChange({ ...view, includeSnoozed: !view.includeSnoozed })}>
        <span className="v-tick" aria-hidden>✓</span>
        <span className="v-body">Snoozed tasks</span>
        <span className="v-c">+{snoozedCount}</span>
      </button>
      <button type="button" role="menuitemcheckbox" aria-checked={view.includeDismissed}
        className={view.includeDismissed ? "v-opt on" : "v-opt"}
        onClick={() => onChange({ ...view, includeDismissed: !view.includeDismissed })}>
        <span className="v-tick" aria-hidden>✓</span>
        <span className="v-body">Dismissed tasks</span>
        <span className="v-c">+{dismissedCount}</span>
      </button>
      <div className="v-pf">Counts show how many tasks each choice would leave, given your other filters.</div>
    </div>
  );
};

/**
 * ⚠️ GROUP FIRST, ORDER SECOND, DIRECTION BENEATH — the contract's own sequence, because it is the
 * order the list is actually built in: grouping decides the big shape, ordering runs inside each
 * group. The panel reading top-down as the pipeline runs is what stops "sort by agent" quietly
 * destroying the urgency groups — the contract's own note, kept in its foot.
 *
 * ⚠️ EVERYTHING IS SCOPED `.tdvp` — a fresh namespace, grepped clean before minting, because the
 * `.unitrow` orphan fired one phase ago and `tick`/`chip`/`panel` all exist elsewhere in this app.
 */
export const SortMenu: React.FC<{
  view: ListView; onChange: (v: ListView) => void;
  /** the manuscript grouping is offered only on a multi-book account — hidden, not greyed */
  showManuscript?: boolean;
}> = ({ view, onChange, showManuscript }) => {
  const groupings = (Object.keys(GROUPING_LABEL) as GroupingId[])
    .filter((g) => g !== "manuscript" || showManuscript);
  return (
  <div className="tdvp" role="none">
    <div className="v-ph"><span className="t">Group &amp; order</span>
      <button type="button" className="a"
        onClick={() => onChange({ ...view, sort: VIEW_DEFAULT.sort, grouping: VIEW_DEFAULT.grouping, direction: VIEW_DEFAULT.direction })}>
        Reset
      </button>
    </div>
    <div className="v-sec">Group by</div>
    {groupings.map((g) => (
      <button key={g} type="button" role="menuitemradio" aria-checked={view.grouping === g}
        className={view.grouping === g ? "v-opt on" : "v-opt"} onClick={() => onChange({ ...view, grouping: g })}>
        <span className="v-radio" aria-hidden />
        <span className="v-body">{GROUPING_LABEL[g]}
          {GROUPING_DESC[g] && <span className="v-desc">{GROUPING_DESC[g]}</span>}
        </span>
      </button>
    ))}
    <div className="v-sec">Then order each group by</div>
    {(Object.keys(SORT_LABEL) as SortId[]).map((sId) => (
      <button key={sId} type="button" role="menuitemradio" aria-checked={view.sort === sId}
        className={view.sort === sId ? "v-opt on" : "v-opt"} onClick={() => onChange({ ...view, sort: sId })}>
        <span className="v-radio" aria-hidden />
        <span className="v-body">{SORT_LABEL[sId]}
          {SORT_DESC[sId] && <span className="v-desc">{SORT_DESC[sId]}</span>}
        </span>
      </button>
    ))}
    <div className="v-sw" role="group" aria-label="Direction">
      <button type="button" className={view.direction === "asc" ? "on" : ""} aria-pressed={view.direction === "asc"}
        onClick={() => onChange({ ...view, direction: "asc" })}>First → last</button>
      <button type="button" className={view.direction === "desc" ? "on" : ""} aria-pressed={view.direction === "desc"}
        onClick={() => onChange({ ...view, direction: "desc" })}>Last → first</button>
    </div>
    <div className="v-pf">Grouping decides the big shape; ordering runs inside each group. Group by “None” gives one flat list.</div>
  </div>
  );
};

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
