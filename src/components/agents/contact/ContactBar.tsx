/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list — Query Centre layout v1 (design-refs/contact-list-qc-layout-v7/contact-list-qc-layout-v7.html) — THE
 * LIGHT BAR ABOVE THE LIST, replacing v26's navy band inside the card. It is the Query Centre's own bar
 * (`shell/ListBar`, which `QcBar153` renders through) on the Query Centre's own sticky strip (`.qc154-tbw`, whose
 * rules name `.cl27` beside `.qc151.qc153`):
 *
 *   count   "{n} agents" / "1 agent" — what the list shows
 *   Find    "Filter by name or agency", "/" to focus it (no hint drawn: contactListRows.css) (the page's `contactsFind` key, unchanged)
 *   Sort    the field's name (`SortChipButton` over `CL_SORT_FIELDS`, its menu `SortChipMenu`)
 *   Group   the grouping ("No grouping", …: `GroupMenu` over `GROUP26_OPTIONS`)
 *
 * THE STRIP PINS AS THE QUERY CENTRE'S DOES: sticky 12px above `--pin-cover`, painting nothing at rest and the page's
 * colour (and its 22px fade) once stuck — `data-qc156-stuck`, the attribute the shared rule reads. ⚠️ STUCK IS RE-READ
 * on scroll, on mount, on resize, when the page is shown again (every workspace page stays mounted, so a page that was
 * hidden while the scroller moved comes back with whatever it last read), when the document becomes visible, and when
 * `--pin-cover` changes (the slim row writes it on `.clv-main`'s style) — never only on scroll: a stale reading is what
 * broke the card's line in Nick's screenshot. The strip's height is published as `--clq-strip` on `.clv-main`.
 * Contact list rows v1.2: on this page the strip no longer sticks, and the card's cap (which this reader used to flag) is
 * retired — the heading row alone pins, level with the filter panel (ContactSheet26, contactListRows.css).
 */
import React, { useEffect, useLayoutEffect, useRef } from "react";
import type { SortKey } from "../../../lib/contactList";
import type { Group26Key } from "../../../lib/contactListMemory";
import { CL_SORT_FIELDS } from "../../../lib/cardsSort";
import { GROUP26_OPTIONS } from "../../../lib/contactV26";
import { SortChipButton, SortChipMenu } from "../../shell/SortChip";
import { usePopover } from "../../shell/ListPills";
import { ListBar } from "../../shell/ListBar";
import { GroupMenu } from "./ContactSheet24";
import { railExport } from "../../../lib/contactV27";
import "../../queries/centre/qcv153.css";
import "../../queries/centre/qcv154.css";
import "../../queries/centre/qcv1541.css";
import "../../queries/centre/qcv156.css";
import "./contactQcLayout.css";

export const GROUP26_LABEL: Record<Group26Key, string> = { letter: "Letter", status: "Status", none: "No grouping" };
/** List filters v1 — the Group button's value: "None" when ungrouped (the menu's row keeps "No grouping") */
export const GROUP_VALUE: Record<Group26Key, string> = { ...GROUP26_LABEL, none: "None" };
const CARET = <svg className="lf-cv" viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M2 4h8L6 9z" /></svg>;
/* Contact list rows v1 — it filters the list (by name or agency); the "/" key still focuses it, with no hint drawn */
export const FIND_AGENT = "Filter by name or agency";

/** is the strip stuck: the scroller has moved and the strip sits at its sticky top */
export function stripStuck(tb: HTMLElement): boolean {
  if (!tb.offsetParent) return false;
  const port = tb.closest<HTMLElement>(".wpg-scroll");
  if (!port) return false;
  const top = parseFloat(getComputedStyle(tb).top) || 0;
  return port.scrollTop > 0 && tb.getBoundingClientRect().top - port.getBoundingClientRect().top <= top + 0.5;
}

export const ContactBar: React.FC<{
  shown: number;
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  sortKey: SortKey;
  reversed: boolean;
  onSort: (v: { key: SortKey; reversed: boolean }) => void;
  group: Group26Key;
  onGroup: (g: Group26Key) => void;
  /** List filters v1 — Export, in the bar: the rows the list shows */
  onExport: () => void;
}> = (p) => {
  const pop = usePopover<"group" | "sort">();
  const tbRef = useRef<HTMLDivElement>(null);

  /* the strip's height, for the card's pin (it sits under the strip, fade and all) */
  useLayoutEffect(() => {
    const tb = tbRef.current;
    const cover = tb?.closest<HTMLElement>(".clv-main");
    if (!tb || !cover) return undefined;
    const put = () => cover.style.setProperty("--clq-strip", `${tb.offsetHeight}px`);
    put();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(put);
    ro.observe(tb);
    return () => ro.disconnect();
  }, []);

  /* ONE READER: is the strip stuck — re-read on every event that can change the answer (see the header) */
  useEffect(() => {
    const tb = tbRef.current;
    if (!tb) return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const s = stripStuck(tb);
      if (tb.hasAttribute("data-qc156-stuck") !== s) tb.toggleAttribute("data-qc156-stuck", s);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    document.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    document.addEventListener("visibilitychange", on);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(on);
    /* the page shown again (display toggled back on) resizes its card from 0 */
    const card = tb.parentElement;
    if (card) ro?.observe(card);
    ro?.observe(tb);
    /* `--pin-cover` is written on `.clv-main`'s style by the slim row */
    const cover = tb.closest<HTMLElement>(".clv-main");
    const mo = cover && typeof MutationObserver !== "undefined" ? new MutationObserver(on) : null;
    if (cover) mo?.observe(cover, { attributes: true, attributeFilter: ["style"] });
    read();
    return () => {
      document.removeEventListener("scroll", on, true); window.removeEventListener("resize", on); document.removeEventListener("visibilitychange", on);
      ro?.disconnect(); mo?.disconnect(); if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="qc154-tbw" data-clq="toolbar" ref={tbRef}>
      <ListBar attrs={{ "data-clq": "bar" }}
        count={<span className="qc153-cnt" data-clq="count" data-n={p.shown}>{p.loading ? " " : <><b>{p.shown}</b> {p.shown === 1 ? "agent" : "agents"}</>}</span>}
        find={{ value: p.search, onChange: p.onSearch, placeholder: FIND_AGENT,
          /* the hooks v26's band field carried: the page guide (`data-cl26`) and the "/" key (`data-nb1`) find it */
          attrs: { "data-cl26": "find", "data-cl24": "find", "data-nb1": "find" }, clearAttrs: { "data-clq": "find-clear" } }}
        exportBtn={{ label: railExport(p.shown), disabled: p.loading || p.shown === 0, onExport: p.onExport, attrs: { "data-clq": "export" } }}>
        <SortChipButton labelled fields={CL_SORT_FIELDS} value={{ key: p.sortKey, reversed: p.reversed }} open={pop.open === "sort"} className="qc153-dd clq-sort" ns="clq"
          disabled={p.loading} onToggle={(a) => pop.toggle("sort", a)} />
        <button type="button" className="qc153-dd clq-group" data-clq="group" aria-haspopup="menu" aria-expanded={pop.open === "group"} disabled={p.loading}
          aria-label={`Group: ${GROUP_VALUE[p.group]}. Change the grouping`} onClick={(e) => pop.toggle("group", e.currentTarget)}>
          <span className="lf-ic" aria-hidden="true">▤</span><em className="lf-lab">Group:</em><b>{GROUP_VALUE[p.group]}</b>{CARET}
        </button>
        {pop.open === "sort" && pop.anchor ? (
          <SortChipMenu anchor={pop.anchor} fields={CL_SORT_FIELDS} value={{ key: p.sortKey, reversed: p.reversed }} ns="clq" heading="Sort by" note={null}
            onChange={(v) => p.onSort(v as { key: SortKey; reversed: boolean })} />
        ) : null}
        {pop.open === "group" && pop.anchor ? (
          <GroupMenu anchor={pop.anchor} options={GROUP26_OPTIONS} value={p.group} className="cl26-gpop" divideBefore="none" onPick={(g) => { p.onGroup(g); pop.close(); }} />
        ) : null}
      </ListBar>
    </div>
  );
};
