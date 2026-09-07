/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TOOLBAR — search, three desk popovers, the view switch, and a count line beneath.
 *
 * ⚠️ IT MOUNTS THE QUERY CENTRE'S OWN CONTROLS RATHER THAN A SECOND SET. `ToolbarSearch` and
 * `ToolbarButton` were extracted for exactly this; `F12Popover`'s `mount` chassis is the desk —
 * parchment rim, inset frame, sage band header — with `PRow` for the radio rows and their
 * sub-captions; `QueryViewSwitch` is the switch. This file owns which OPTIONS there are and what
 * they mean, and nothing about how a popover looks. The version it replaces drew its own popover,
 * its own rows and its own chevron, which is three chances to drift from a page one click away.
 *
 * ⚠️ THE ROW COUNTS READ THE WHOLE LIST, NEVER THE FILTERED VIEW — the law `StatTiles` states for
 * the tiles, and the same reason: a count of what you would see after clicking reads 0 for every
 * option you have not chosen.
 *
 * ⚠️ APPLIED VALUES RENDER BENEATH THE ROW, OUTSIDE THE POPOVER. Closing a popover must never
 * hide what is filtering the list.
 *
 * ⚠️ BELOW md THE SAME CHILDREN PRESENT IN `MobileSheet`, which is Mobile Pass 1's law and is
 * kept: an anchored popover is a desktop idiom, and the sheet owns its own dismissal there. The
 * CHILDREN are identical in both — one set of options, two chassis — because a mobile-only copy
 * is how the two come to offer different filters.
 *
 * ⚠️ AND GROUP SAYS WHAT IT DOES. Grouping arranges the BOARD; in Grid and List it would have
 * nothing to arrange, so the control is disabled there and its title says why — a control that
 * silently did nothing would be worse than one that explains itself.
 */
import React from "react";
import { PageTally } from "../shell/WorkspacePageGrid";
import { ToolbarButton, ToolbarSearch } from "../shared/ToolbarButton";
import { QueryViewSwitch } from "../queries/QueryViewSwitch";
import { F12Popover, PopSection, PRow } from "../shell/F12Shell";
import { useFixedMenu } from "../forms/useFixedMenu";
import { AGENT_VIEWS, AgentView } from "./agentViews";
import { Agent, Query } from "../../types";
import {
  AgentFilters, FacetKey, SORTS, SortDir, SortKey, emptyFilters, facetOptions, filterCount, sortSpec,
} from "../../lib/agentFilters";
import { AgentGroupingKey, GROUPINGS } from "../../lib/agentBoard";
import { MobileSheet } from "../shell/MobileSheet";
import { useIsMobile } from "../shell/mobileChrome";

const FILTER_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 5h18l-7 8v6l-4 2v-8z" />
  </svg>
);
const GROUP_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="4" width="18" height="6" rx="1" /><rect x="3" y="14" width="18" height="6" rx="1" />
  </svg>
);
const SORT_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h13M4 12h9M4 17h5" />
  </svg>
);

/** The four facets, in the ref's order, with the words the popover heads them with. */
export const FACETS: readonly { key: FacetKey; label: string }[] = [
  { key: "door", label: "Their door" },
  { key: "genre", label: "Genres sought" },
  { key: "history", label: "Your history" },
  { key: "reply", label: "Response time" },
];

type Pop = "filter" | "group" | "sort" | null;

export interface AgentToolbarProps {
  agents: Agent[];
  queries: Query[];
  search: string;
  onSearch: (v: string) => void;
  filters: AgentFilters;
  onFilters: (f: AgentFilters) => void;
  sort: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey, d: SortDir) => void;
  grouping: AgentGroupingKey;
  onGrouping: (k: AgentGroupingKey) => void;
  view: AgentView;
  onView: (v: AgentView) => void;
  /** How many agents survive the current filter, and how many there are. */
  resultCount: number;
  total: number;
  searchRef?: React.RefObject<HTMLInputElement>;
}

export const AgentToolbar: React.FC<AgentToolbarProps> = ({
  agents, queries, search, onSearch, filters, onFilters, sort, sortDir, onSort,
  grouping, onGrouping, view, onView, resultCount, total, searchRef,
}) => {
  const [pop, setPop] = React.useState<Pop>(null);
  const panelRef = React.useRef<HTMLElement | null>(null);
  /* ⚠️ ONE HOOK PER CONTROL, AND ITS OWN `triggerRef` GOES ON THE BUTTON. `useFixedMenu` RETURNS
     the trigger ref — it does not take one — so passing a ref in the options was a type error I
     had silenced with a cast, and the cast bought a panel anchored to an element that was never
     attached to anything. A cast that quiets a signature is the signature telling you the shape
     is wrong. */
  const filterMenu = useFixedMenu<HTMLButtonElement>(pop === "filter", { placement: "auto", align: "auto", menuRef: panelRef });
  const groupMenu = useFixedMenu<HTMLButtonElement>(pop === "group", { placement: "auto", align: "auto", menuRef: panelRef });
  const sortMenu = useFixedMenu<HTMLButtonElement>(pop === "sort", { placement: "auto", align: "auto", menuRef: panelRef });
  const menuStyle = pop === "filter" ? filterMenu.menuStyle : pop === "group" ? groupMenu.menuStyle : sortMenu.menuStyle;

  const isMobile = useIsMobile();
  const spec = sortSpec(sort);
  const nFilters = filterCount(filters);
  /* the board IS grouped; in Grid and List there is nothing to arrange */
  const groupLive = view === "board";

  /**
   * ⚠️ ONE SET OF CHILDREN, TWO CHASSIS. Below md the sheet takes them; above, the desk popover
   * does. Writing the options twice is how a mobile reader comes to be offered a different filter
   * from a desktop one, which is a difference nobody would ever see reported.
   */
  const Desk: React.FC<{ kind: Exclude<Pop, null>; title: string; width: number; foot?: React.ReactNode; children: React.ReactNode }> =
    ({ kind, title, width, foot, children }) => {
      if (pop !== kind) return null;
      if (isMobile) {
        return (
          <MobileSheet open onClose={() => setPop(null)} ariaLabel={title}>
            <div className="aglist agl-inpop">{children}{foot}</div>
          </MobileSheet>
        );
      }
      return (
        <F12Popover width={width} chassis="mount" title={title} style={menuStyle} panelRef={panelRef} foot={foot} onClose={() => setPop(null)}>
          {children}
        </F12Popover>
      );
    };

  const toggle = (key: FacetKey, value: string) => {
    const on = filters[key].includes(value);
    onFilters({ ...filters, [key]: on ? filters[key].filter((v) => v !== value) : [...filters[key], value] });
  };

  return (
    <>
      <div className="agl-toolbar">
        <PageTally value={`${resultCount} of ${total}`} />
        <ToolbarSearch
          ref={searchRef}
          value={search}
          onChange={onSearch}
          placeholder="Search names, agencies, wishlists…"
          ariaLabel="Search agents"
        />
        <ToolbarButton
          ref={filterMenu.triggerRef} label="Filter" count={nFilters} icon={FILTER_ICON}
          open={pop === "filter"} onClick={() => setPop((p) => (p === "filter" ? null : "filter"))}
        />
        <ToolbarButton
          ref={groupMenu.triggerRef} label="Group" value={GROUPINGS.find((g) => g.key === grouping)?.label}
          icon={GROUP_ICON} open={pop === "group"} disabled={!groupLive}
          title={groupLive ? undefined : "Grouping arranges the board — switch to Board to use it"}
          onClick={() => setPop((p) => (p === "group" ? null : "group"))}
        />
        <ToolbarButton
          ref={sortMenu.triggerRef} label="Sort" value={spec.label} icon={SORT_ICON}
          open={pop === "sort"} onClick={() => setPop((p) => (p === "sort" ? null : "sort"))}
        />
        <QueryViewSwitch view={view} onView={(v) => onView(v as AgentView)} views={AGENT_VIEWS} />
      </div>

      <Desk
        kind="filter" title="Filter" width={346}
        foot={
            <div className="f12-pop-mfoot">
              <button type="button" className="f12-reset" onClick={() => onFilters(emptyFilters())}>Clear all</button>
              <span className="agl-sp" />
              <span className="agl-popcount">{resultCount} of {total}</span>
            </div>
          }
      >
          {FACETS.map((f) => (
            <PopSection key={f.key} label={f.label}>
              <div className="agl-facets">
                {facetOptions(agents, queries, f.key).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`agl-facetchip${filters[f.key].includes(o.value) ? " on" : ""}`}
                    aria-pressed={filters[f.key].includes(o.value)}
                    /* ⚠️ VISIBLE AND INERT AT ZERO, never hidden: its absence is information, and
                       hiding rows makes the popover jump as the data changes. Tickable-but-empty
                       is a dead end, so it is disabled rather than merely useless. */
                    disabled={o.n === 0 && !filters[f.key].includes(o.value)}
                    onClick={() => toggle(f.key, o.value)}
                  >
                    {o.value}<span className="n">{o.n}</span>
                  </button>
                ))}
              </div>
            </PopSection>
          ))}
      </Desk>

      <Desk kind="group" title="Group the board" width={326}>
          {GROUPINGS.map((g) => (
            <PRow
              key={g.key} kind="rad" on={grouping === g.key} label={g.label} sub={g.sub}
              onClick={() => { onGrouping(g.key); setPop(null); }}
            />
          ))}
      </Desk>

      <Desk
        kind="sort" title="Sort" width={326}
        foot={
            <div className="f12-pop-mfoot">
              <span className="f12-lbl">Order</span>
              <span className="agl-sp" />
              {/* ⚠️ THE SEGMENT RELABELS PER KEY. "A to Z" is meaningless over a date and
                  "Newest" is meaningless over a name; one pair of words for all six would be
                  wrong for four of them. */}
              <span className="agl-oseg">
                {(["asc", "desc"] as const).map((d, i) => (
                  <button key={d} type="button" className={sortDir === d ? "on" : undefined} onClick={() => onSort(sort, d)}>
                    {spec.dir[i]}
                  </button>
                ))}
              </span>
            </div>
          }
      >
          {SORTS.map((s) => (
            <PRow
              key={s.key} kind="rad" on={sort === s.key} label={s.label} sub={s.sub}
              /* choosing a key takes ITS most-useful-first direction, not the last key's */
              onClick={() => onSort(s.key, s.defaultDir)}
            />
          ))}
      </Desk>
    </>
  );
};

/* ── applied filters: the tags that keep the popover honest ────────────────── */

export interface AppliedTag {
  label: string;
  onRemove: () => void;
}

/** Every ticked value, as a removable tag. Built from the SAME set the popover reads. */
export function appliedTags(filters: AgentFilters, onFilters: (f: AgentFilters) => void): AppliedTag[] {
  const out: AppliedTag[] = [];
  for (const f of FACETS) {
    for (const value of filters[f.key]) {
      out.push({
        label: value,
        onRemove: () => onFilters({ ...filters, [f.key]: filters[f.key].filter((v) => v !== value) }),
      });
    }
  }
  return out;
}

export const AgentAppliedTags: React.FC<{ tags: AppliedTag[]; onClear: () => void }> = ({ tags, onClear }) => {
  if (!tags.length) return null;
  return (
    <div className="agl-applied">
      {tags.map((t) => (
        <span className="agl-atag" key={t.label}>
          {t.label}
          <button type="button" onClick={t.onRemove} aria-label={`Remove ${t.label}`} title="Remove">×</button>
        </span>
      ))}
      <button type="button" className="agl-clearall" onClick={onClear}>Clear all</button>
    </div>
  );
};
