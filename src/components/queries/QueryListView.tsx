/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIST (colours-v2 run, Phase 3; ref query-centre-v9-views-locked.html). One row per query,
 * dense enough to triage: Status · Agent · Sent · What went · Where it stands · Court · ⋯.
 *
 * ⚠️ IT IS THE SAME ROWS AND THE SAME SORT, WITH A DIFFERENT RENDERER. `rows` arrives already
 * narrowed and ordered by the page's own machinery, so nothing here filters or re-sorts; clicking
 * a HEADER hands the page a sort key and it does the ordering. A list that sorted its own copy
 * would be a second answer to "what order are these in".
 *
 * ⚠️ AND THE FACT SENTENCE AND THE FOUR SLOTS ARE THE CARD'S OWN, rendered from the same
 * `CardFacts` — including the two absences the card is careful about: no `!` unless attention is
 * true, and NO material cluster at all when nothing was recorded (four faded slots would state
 * that the query went out empty, which is a much stronger claim than "we do not know").
 */
import React from "react";
import "./queryListView.css";
import { StatusDot } from "../StatusDot";
import { Mark } from "./QueryCard";
import type { GridCard } from "./QueryCentreGrid";
import { compareGroupLabels, groupLabelFor, groupAccentClass, type GroupKey } from "../../lib/queryCentreGrid";
import { MATERIAL_SLOTS, type CardLeaf } from "../../lib/queryCardFacts";
import { MATERIAL_ROW_NAMES } from "../../lib/agentMaterials";
import { IlloSlot } from "./IlloSlot";
import { queryVerbs, type SinceEvent } from "../../lib/queryRowFacts";
/**
 * ⚠️ THE KEYS ARE THE PAGE'S OWN, NOT `GRID_SORTS`'. The Query Centre sorts on a richer set
 * (`last_activity`, `date_newest`, `waiting_longest`, `due_soonest`, `journey_depth`, `agent_az`)
 * and the Sort popover writes those; a list header handing back a different vocabulary would be a
 * second sort model over one list. The direction is the page's `sortDesc` flag, which reverses
 * whichever key is active — well-defined for all of them, unlike toggling between paired keys.
 */
type SortKey = string;

/** Which sort each header hands back. `null` = the column states no order of its own. */
/**
 * ⚠️ COURT IS RETIRED (v14 §2). It restated in a column what the Status column's own dot and word
 * already say — and what the standing sentence says again in prose. Three tellings of one fact.
 */
export const LIST_COLUMNS: readonly { label: string; sort: SortKey | null }[] = [
  { label: "Status", sort: "journey_depth" },
  { label: "Agent", sort: "agent_az" },
  { label: "Sent", sort: "date_newest" },
  { label: "What went", sort: null },
  { label: "Since then", sort: null },
  { label: "Where it stands", sort: "due_soonest" },
  { label: "Actions", sort: null },
];

/** The five marks a Since-then row can draw. Direction, not decoration — in, out, and the rest. */
const SINCE_GLYPH: Record<SinceEvent["kind"], string> = {
  requested: "←", sent: "→", nudged: "◔", response: "✳", closed: "×",
};
const shortWhen = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const QueryListView: React.FC<{
  rows: readonly GridCard[];
  /** the Since-then marks per query id — derived by the page from the SAME feed the timeline reads */
  since: Record<string, SinceEvent[]>;
  /** the original send, per query id — the leaf here is `dateSent`, never last activity */
  sentLeaf: Record<string, CardLeaf | null>;
  sortKey: SortKey;
  /** the page's grouping — the list partitions the SAME rows the grid would (toolbar v2, §2) */
  group?: GroupKey;
  /** true = the page is showing this sort reversed; the header draws the caret from it */
  sortDesc: boolean;
  selectedId?: string | null;
  onSort: (key: SortKey) => void;
  onOpen?: (id: string) => void;
  onMore?: (id: string, anchor: HTMLElement) => void;
  /** every action opens the desk AND the drawer behind it — see the page's handler */
  onVerb?: (id: string, verb: "primary" | "nudge" | "closed", anchor: HTMLElement) => void;
}> = ({ rows, since, sentLeaf, sortKey, group = "none", sortDesc, selectedId, onSort, onOpen, onMore, onVerb }) => {
  /**
   * ⚠️ THE SAME PARTITION THE GRID MAKES, from the same two pure functions — never a second
   * grouping. Rows arrive already narrowed and ordered; this only decides where a heading goes,
   * and an empty group is omitted because it is not a fact about anything.
   */
  const buckets = new Map<string, GridCard[]>();
  if (group !== "none") {
    for (const r of rows) {
      const label = groupLabelFor(r, group);
      const list = buckets.get(label);
      if (list) list.push(r); else buckets.set(label, [r]);
    }
  }
  const headings = [...buckets.keys()].sort((a, b) => compareGroupLabels(a, b, group));

  const row = (r: GridCard) => {
      const f = r.facts;
    const v = queryVerbs(f.turn);
    const ev = since[r.id] ?? [];
    /* ⚠️ THE SEND, NOT THE LAST THING THAT HAPPENED. The Sent column marks where the journey
       STARTED, so it reads `dateSent` however far the query has travelled — and it stays in the
       Queried sand for the same reason: the start is the start whatever the row is now. */
    const leaf = sentLeaf[r.id] ?? null;
    return (
      <div
        key={r.id}
        className={`qlv-row qcc--st-${f.state}${selectedId === r.id ? " qlv-row--on" : ""}`}
        data-qlv-id={r.id}
        role="button"
        tabIndex={0}
        onClick={() => onOpen?.(r.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(r.id); } }}
      >
        {/* the row's own state, as a 4px bar in the deep tone — inset, rounded on the inner edge */}
        <span className="qlv-bar" aria-hidden="true" />

        {/* ⚠️ PLAIN TEXT AND ITS DOT — no pill, no fill (v14 §2). The accent bar already carries
            the row's colour; a tinted pill beside it says the same thing twice, louder. */}
        <span className="qlv-st">
          <StatusDot status={r.status} overrideSize={16} decorative />
          {r.status}
        </span>

        <span className="qlv-who">
          <span className="qlv-chip" aria-hidden="true">{r.initials}</span>
          <span className="qlv-whotx">
            <span className="qlv-nm">{r.name}</span>
            <span className="qlv-ag">{r.agency}</span>
          </span>
        </span>

        <span className="qlv-leafwrap">
          {leaf ? (
            <span className="qlv-leaf qcc--st-queried" aria-hidden="true">
              <span className="qlv-mo">{leaf.month}</span>
              <span className="qlv-dy">{leaf.day}</span>
              <span className="qlv-cap">sent</span>
            </span>
          ) : <span className="qlv-none">—</span>}
        </span>

        <span className="qlv-mats">
          {f.materialsRecorded
            ? MATERIAL_SLOTS.map((k) => (
                <span key={k} className={`qlv-ic${f.materials[k] ? "" : " qlv-ic--off"}`} title={MATERIAL_ROW_NAMES[k]}>
                  <Mark kind={k} />
                </span>
              ))
            : <span className="qlv-none">Not recorded</span>}
        </span>

        {/* ⚠️ EVERY RECORDED ACTIVITY AFTER THE SEND, from the same rows the drawer's timeline
            renders. A row with nothing after the send says so rather than drawing an empty box. */}
        <span className="qlv-since">
          {ev.length === 0
            ? <span className="qlv-none">nothing yet</span>
            : ev.map((e) => (
                <span key={e.id} className={`qlv-ev qlv-ev--${e.kind}`} tabIndex={0}>
                  <span aria-hidden="true">{SINCE_GLYPH[e.kind]}</span>
                  <span className="qlv-tip" role="note">{e.label}<i>{shortWhen(e.atMs)}</i></span>
                </span>
              ))}
        </span>

        <span className="qlv-fs">
          {/* the same family the drawer's header slot uses — omitted, never blank, when absent */}
          <IlloSlot className="qlv-spot" name={`spot · ${f.state}`} width={44} height={44} round />
          <span className="qlv-fstx">
            <span className="qlv-sent">
              {f.attention && <span className="qlv-mk" aria-hidden="true">!</span>}
              {f.sentence.map((run, i) => (run.strong ? <b key={i}>{run.text}</b> : <React.Fragment key={i}>{run.text}</React.Fragment>))}
            </span>
            {f.captionParts.length > 0 && (
              <span className="qlv-cappar">
                {f.captionParts.map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <i className="qlv-pipe" aria-hidden="true" />}
                    <span>{part}</span>
                  </React.Fragment>
                ))}
              </span>
            )}
          </span>
        </span>

        {/* ⚠️ A FIXED FOUR-SLOT GRID, and an absent verb leaves its slot EMPTY rather than
            collapsing it — every row's ⋯ shares one x, every primary one width, so the column
            reads as a column. `visibility: hidden`, not removal. */}
        <span className="qlv-acts" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`qlv-pri${v.primary.enabled ? "" : " qlv-pri--off"}`}
            disabled={!v.primary.enabled}
            title={v.primary.enabled ? undefined : "Reopening a closed query is not built yet"}
            onClick={(e) => { e.stopPropagation(); onVerb?.(r.id, "primary", e.currentTarget); }}
          >{v.primary.label}</button>
          <button
            type="button" className="qlv-ib" aria-label="Nudge"
            style={v.nudge ? undefined : { visibility: "hidden" }}
            tabIndex={v.nudge ? 0 : -1}
            onClick={(e) => { e.stopPropagation(); onVerb?.(r.id, "nudge", e.currentTarget); }}
          >◔</button>
          <button
            type="button" className="qlv-ib" aria-label="Mark closed"
            style={v.markClosed ? undefined : { visibility: "hidden" }}
            tabIndex={v.markClosed ? 0 : -1}
            onClick={(e) => { e.stopPropagation(); onVerb?.(r.id, "closed", e.currentTarget); }}
          >×</button>
          <button
            type="button" className="qlv-ib" aria-label={`More actions for ${r.name}`}
            onClick={(e) => { e.stopPropagation(); onMore?.(r.id, e.currentTarget); }}
          >⋯</button>
        </span>
      </div>
    );
  };

  return (
  <div className="qlv">
    {/**
      * ⚠️ MONO CAPITALS, NOT PLAYFAIR (§3, superseding v2's own choice). Set in the page's serif
      * the header competed with the Playfair agent NAMES an inch beneath it — two lines of the
      * same face where one is a label and the other is data. Mono at 9px cannot be misread as a
      * row. And it drives THE sort state, not a copy: a header hands `onSort` the page's own key,
      * so the Sort menu's label changes when you click a column and the two controls can never
      * disagree about what order the list is in.
      */}
    <div className="qlv-head" role="row">
      {LIST_COLUMNS.map((c, i) =>
        c.sort ? (
          <button
            key={i}
            type="button"
            className={`qlv-h qlv-h--btn${sortKey === c.sort ? " qlv-h--on" : ""}`}
            aria-sort={sortKey === c.sort ? (sortDesc ? "descending" : "ascending") : "none"}
            onClick={() => onSort(c.sort!)}
          >
            {c.label}
            {/* always mounted, opacity-stepped in CSS — see the note at `.qlv-caret`. The arrow
                still states the CURRENT direction, so an unsorted column shows the ascending
                mark it would take if you pressed it. */}
            <span className="qlv-caret" aria-hidden="true">
              {sortKey === c.sort && sortDesc ? "\u25bc" : "\u25b2"}
            </span>
          </button>
        ) : (
          /* the three that name no order: rendered, muted, inert, and out of the tab order */
          <span key={i} className="qlv-h qlv-h--dead">{c.label}</span>
        ),
      )}
    </div>

    {group === "none"
      ? rows.map(row)
      : headings.map((h) => (
          <React.Fragment key={h}>
            {/* the heading is a full-width row between groups — the grid's own anatomy, laid flat */}
            <div className={`qlv-ghead ${groupAccentClass(h, group)}`} role="row">
              <h3>{h}</h3>
              <span className="qlv-gn">{buckets.get(h)!.length}</span>
              <span className="qlv-gline" aria-hidden="true" />
            </div>
            {buckets.get(h)!.map(row)}
          </React.Fragment>
        ))}
  </div>
  );
};
