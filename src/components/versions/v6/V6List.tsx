/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v6 — "{n} version(s) saved" (the ref's `rowsHtml` and `.list`), in a framed card with a sand band: one row per
 * live version (number, name, "From {parent}", the In use tag, "{more} of {sent} asked for more" with a bar or "Not sent
 * yet"); the foot's "New version →" and the sort. The selected row is the stone tile.
 *
 * ⚠️ ARCHIVED VERSIONS KEEP v2's ACCESS, NOT REDESIGNED: the same "Archived · n" disclosure with "Bring back" (and the
 *    row's "Open", which was v2's "Insights": it opens that version on the page), as a quiet line under the list's foot.
 */
import React from "react";
import type { V2Version } from "../../../lib/bookVersions";
import { MIN_SENT_FOR_RATE, type VersionsModel } from "../../../lib/versionsV2";
import { listOrder, type ListSort } from "../../../lib/versionsV6";
import { versionLabel } from "../v2Bits";
import { Disc, InUseTag, V6Frame } from "./V6Parts";

export interface V6ListProps {
  m: VersionsModel;
  sel: string | null;
  sort: ListSort;
  stamp: boolean;
  locked: boolean;
  onSort: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onBringBack: (id: string) => void;
}

export const fromLine = (v: V2Version, byId: Map<string, V2Version>): string => {
  if (v.original) return "Your manuscript before any changes";
  const p = v.parentId ? byId.get(v.parentId) ?? null : null;
  return p ? `From ${p.name}${p.archived ? " (archived)" : ""}` : "Your manuscript before any changes";
};

export const V6List: React.FC<V6ListProps> = ({ m, sel, sort, stamp, locked, onSort, onSelect, onNew, onBringBack }) => {
  const rows = listOrder(m.live, m.facts, sort);
  const byId = new Map(m.versions.map((v) => [v.id, v]));
  const n = m.live.length;
  return (
    <aside className="v6-list" aria-label="Your versions">
      <V6Frame tone="sand" probe="list" as="div" band={<h2 className="v6-bt">{n} {n === 1 ? "version" : "versions"} saved</h2>}>
        <div className="v6-rows" data-vv6="rows">
          {rows.map((v) => {
            const f = m.facts.get(v.id)!;
            const use = v.id === m.inUse;
            const pct = f.n ? Math.round((f.more.length / f.n) * 100) : 0;
            return (
              <button type="button" key={v.id} className={`v6-row${v.original ? " root" : ""}`} data-vv6="row" data-id={v.id}
                aria-current={v.id === sel ? "true" : "false"} onClick={() => onSelect(v.id)} id={`v6row-${v.id}`}>
                <span className="v6-row-t">
                  <Disc v={v} on={use} />
                  <span className="v6-row-w"><span className="v6-row-n">{v.name}</span><span className="v6-row-s">{fromLine(v, byId)}</span></span>
                </span>
                {use ? <InUseTag stamp={stamp} /> : null}
                <span className="v6-row-f" data-vv6="row-figure">
                  {f.n
                    ? <><b>{f.more.length}</b> of {f.n} asked for more<span className="v6-bar2" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span></>
                    : <em>Not sent yet</em>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="v6-list-f">
          <button type="button" className="v6-lk" data-vv6="list-new" disabled={locked} onClick={onNew}>New version →</button>
          <button type="button" className="v6-srt" data-vv6="sort" onClick={onSort}>{sort === "new" ? "Newest first" : "Most requests first"} <span aria-hidden="true">⇅</span></button>
        </div>
        {m.archived.length ? (
          <details className="v6-arch" data-vv6="archived">
            <summary>Archived · {m.archived.length}</summary>
            {m.archived.map((v) => {
              const f = m.facts.get(v.id)!;
              return (
                <div className="v6-arch-r" key={v.id}>
                  <span><b>{v.name}</b> <em>{versionLabel(v)} · {f.n} {f.n === 1 ? "query" : "queries"} · {f.n >= MIN_SENT_FOR_RATE ? `${f.ratePct}% asked for more` : "too early to tell"}</em></span>
                  <button type="button" className="v6-lk sm" onClick={() => onSelect(v.id)}>Open</button>
                  <button type="button" className="v6-lk sm" data-vv6="bring-back" disabled={locked} onClick={() => onBringBack(v.id)}>Bring back</button>
                </div>
              );
            })}
          </details>
        ) : null}
      </V6Frame>
    </aside>
  );
};
