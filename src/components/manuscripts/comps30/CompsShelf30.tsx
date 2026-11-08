/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v30 §B: the blush notice, then "Your shelf" — one toolbar (where it's used · sort · find · view)
 * over paper cards with a stat card on the foot, or the same comps as a list.
 *
 * ⚠️ A CARD AND A LIST ROW ARE `div role="button"`, NEVER A <button>: the card holds a real button ("Add it to a
 *    letter"), and a button inside a button is invalid (v30 S5). That link acts on its own and never opens the drawer.
 * ⚠️ EVERY OPENER CARRIES `data-cx-key`, so focus can find it again after a repaint (comps28/refocus.ts).
 * ⚠️ BOOK, FILM AND TV ARE AN ICON, NEVER A COLOUR; THE BAND'S COLOUR IS WHERE THE COMP IS USED.
 * ⚠️ LIST AND CARDS READ THE SAME `view` ARRAY, so the two can never disagree about order (v30 S4).
 */
import React, { useEffect, useRef, useState } from "react";
import type { CompRow } from "../../../lib/compsLibrary";
import {
  MEDIA_WORD, SHELF_SORTS, WHERE_LABEL, WHERE_ORDER, ageChip, andList, compRate, filtered, shelfWhere, statOf,
  type Notice, type ShelfFilter, type ShelfSort, type ShelfWhere,
} from "../../../lib/compsShelf";
import { splitTags } from "../CompForm";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { Cards30, List30, Media30, Pen30, Search30, Sort30 } from "./marks30";

export type ShelfView = "cards" | "list";

/* ══ the notice ═══════════════════════════════════════════════════════════════════════════════ */

export const CompsNotice30: React.FC<{ notice: Notice; onLog: (letterId: string) => void }> = ({ notice, onLog }) => (
  <div className="cp30-note" data-cp="notice" role="note">
    <span className="cp30-nic" aria-hidden="true"><Pen30 /></span>
    <p><b>{notice.lead}</b>{notice.rest}</p>
    <button type="button" className="cp30-btn" data-cp="notice-log" data-cx-key="notice-log" onClick={() => onLog(notice.letterId)}>{notice.button}</button>
  </div>
);

/* ══ the sort menu ════════════════════════════════════════════════════════════════════════════ */

const SortMenu: React.FC<{ value: ShelfSort; onChange: (k: ShelfSort) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const btn = useRef<HTMLButtonElement | null>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const close = (focus = true) => { setOpen(false); if (focus) btn.current?.focus({ preventScroll: true }); };
  useEscapeLayer(open, () => close(), ESC_LEVEL.page);
  useEffect(() => {
    if (!open) return undefined;
    items.current[SHELF_SORTS.findIndex((s) => s.key === value)]?.focus({ preventScroll: true });
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = items.current.findIndex((x) => x === document.activeElement);
    const n = SHELF_SORTS.length;
    items.current[(i + (e.key === "ArrowDown" ? 1 : n - 1) + n) % n]?.focus();
  };
  const label = SHELF_SORTS.find((s) => s.key === value)!.label;
  return (
    <div className="cp30-menu" ref={wrap} data-cp="sort">
      <button ref={btn} type="button" className="cp30-tb" aria-haspopup="menu" aria-expanded={open} aria-label={`Sorted by ${label}`} data-cp="sort-btn" onClick={() => setOpen((o) => !o)}>
        <Sort30 /><i>Sorted by</i> <span data-cp="sort-value">{label}</span>
      </button>
      {open ? (
        <div className="cp30-dd" role="menu" aria-label="Sort the shelf" onKeyDown={onKey} data-cp="sort-menu">
          {SHELF_SORTS.map((s, i) => (
            <button key={s.key} ref={(el) => { items.current[i] = el; }} type="button" role="menuitemradio" aria-checked={s.key === value} data-sort={s.key}
              onClick={() => { onChange(s.key); close(); }}>{s.label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/* ══ the card ═════════════════════════════════════════════════════════════════════════════════ */

const keyOpen = (f: () => void) => (e: React.KeyboardEvent) => {
  if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); f(); }
};

const CompCard30: React.FC<{ row: CompRow; now: number; onOpen: (key: string) => void; onPick: (key: string) => void }> = ({ row, now, onOpen, onPick }) => {
  const c = row.comp;
  const w = shelfWhere(row.where);
  const age = ageChip(c.year, now);
  const stat = statOf(row);
  const tags = splitTags(c.matchAxis);
  const pub = c.publisher?.trim();
  const band = [MEDIA_WORD[c.media ?? "book"], pub, c.year ? String(c.year) : ""].filter(Boolean).join(" · ");
  const missPub = (c.media ?? "book") === "book" && !pub;
  return (
    <div className="cp30-card" role="button" tabIndex={0} aria-label={c.title}
      data-cp="card" data-key={row.key} data-cx-key={`card:${row.key}`} data-w={w}
      onClick={() => onOpen(row.key)} onKeyDown={keyOpen(() => onOpen(row.key))}>
      <div className="cp30-fr">
        <div className="cp30-band" data-cp="band">
          <Media30 kind={row.kind} />
          <span className="cp30-bt">{band}</span>
          {age ? <span className={`cp30-ag${age.tone === "old" ? " is-old" : ""}`} data-cp="age" data-tone={age.tone} title={age.title ?? undefined}>{age.text}</span> : null}
        </div>
        <div className="cp30-bd">
          <h3 className="cp30-ct" data-cp="card-title">{c.title}</h3>
          {c.author?.trim() || missPub ? (
            <p className="cp30-by">{c.author?.trim()}{missPub ? <span className="cp30-miss" data-cp="miss-pub">· add a publisher</span> : null}</p>
          ) : null}
          {c.note?.trim() ? <p className="cp30-why">{c.note}</p> : <p className="cp30-why is-none">No line yet on why it compares.</p>}
          {tags.length ? <div className="cp30-chips">{tags.map((t, i) => <span key={`${t}-${i}`} className="cp30-pill">{t}</span>)}</div> : null}
        </div>
        {stat.kind === "sent" ? (
          <div className="cp30-stat" data-cp="stat" data-stat="sent">
            <div className="cp30-k">{stat.pct}%<small>asked for more</small></div>
            <div className="cp30-meter" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < stat.on ? "is-on" : undefined} />)}</div>
            <p className="cp30-s" data-cp="stat-line"><b>{stat.asked} of {stat.queries} queries</b> · named in {andList(stat.letters)}{stat.early ? " · early days" : ""}</p>
          </div>
        ) : stat.kind === "draft" ? (
          <div className="cp30-stat is-quiet" data-cp="stat" data-stat="draft">
            <div className="cp30-k">Not sent yet</div>
            <p className="cp30-s" data-cp="stat-line">In {andList(stat.letters)}, which {stat.letters.length === 1 ? "hasn’t" : "haven’t"} gone out</p>
          </div>
        ) : (
          <div className="cp30-stat is-quiet" data-cp="stat" data-stat="shelf">
            <div className="cp30-k">Not in a letter</div>
            <p className="cp30-s">
              <button type="button" className="cp30-add" data-cp="stat-pick" data-cx-key={`pick:${row.key}`}
                onClick={(e) => { e.stopPropagation(); onPick(row.key); }} onKeyDown={(e) => e.stopPropagation()}>Add it to a letter</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══ the list row ═════════════════════════════════════════════════════════════════════════════ */

const ListRow30: React.FC<{ row: CompRow; now: number; onOpen: (key: string) => void }> = ({ row, now, onOpen }) => {
  const c = row.comp;
  const w = shelfWhere(row.where);
  const old = ageChip(c.year, now)?.tone === "old";
  const pct = compRate(row);
  return (
    <div className="cp30-lr" role="button" tabIndex={0} aria-label={c.title} data-cp="row" data-key={row.key} data-cx-key={`row:${row.key}`} data-w={w}
      onClick={() => onOpen(row.key)} onKeyDown={keyOpen(() => onOpen(row.key))}>
      <div className="cp30-nm">
        <span className={`cp30-md${w === "sent" ? "" : " is-ring"}`}><Media30 kind={row.kind} /></span>
        <span><b>{c.title}</b>{c.author?.trim() ? <em>{c.author}</em> : null}</span>
      </div>
      <div className={`cp30-pb${old ? " is-old" : ""}`} data-cp="row-pub" title={old ? "Agents usually look for comps from the last five years" : undefined}>
        {[c.publisher?.trim(), c.year ? String(c.year) : ""].filter(Boolean).join(", ") || "–"}
      </div>
      <div className="cp30-wh"><span className={`cp30-dt is-${w}`} aria-hidden="true" />{WHERE_LABEL[w]}</div>
      <div className="cp30-q" data-cp="row-q">{row.queries.length || "–"}</div>
      {w === "sent" && pct !== null ? (
        <div className="cp30-rate" data-cp="row-rate"><span className="cp30-tr" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span><b>{pct}%</b></div>
      ) : (
        <div className="cp30-rate" data-cp="row-rate"><em>{w === "draft" ? "Not sent yet" : "Not in a letter"}</em></div>
      )}
    </div>
  );
};

/* ══ the shelf ════════════════════════════════════════════════════════════════════════════════ */

export const CompsShelf30: React.FC<{
  rows: CompRow[];
  /** the shelf after filter and sort; cards and list both read it */
  view: CompRow[];
  counts: Record<ShelfWhere, number>;
  filter: ShelfFilter;
  sort: ShelfSort;
  mode: ShelfView;
  now: number;
  canAdd: boolean;
  findRef: React.Ref<HTMLInputElement>;
  headRef: React.Ref<HTMLElement>;
  onFilter: (f: ShelfFilter) => void;
  onSort: (k: ShelfSort) => void;
  onMode: (m: ShelfView) => void;
  onOpen: (key: string) => void;
  onPick: (key: string) => void;
  onAdd: () => void;
}> = (p) => {
  const total = p.rows.length;
  const isFiltered = filtered(p.filter);
  const set = (patch: Partial<ShelfFilter>) => p.onFilter({ ...p.filter, ...patch });
  const clear = () => p.onFilter({ where: null, find: "" });
  return (
    <section className="cp30-shelf" data-cp="shelf" aria-labelledby="cp30-shelf-h" ref={p.headRef}>
      <div className="cp30-sh">
        <div className="cp30-st">
          <h2 className="cp30-h2" id="cp30-shelf-h">Your shelf<small data-cp="shelf-count">{total} {total === 1 ? "title" : "titles"}</small></h2>
          <p>Every comp you might name in a letter. Choose one to see the letters and queries it went out with.</p>
        </div>
      </div>

      <div className="cp30-tool" data-cp="tools">
        <div className="cp30-seg" role="group" aria-label="Where it’s used" data-cp="seg">
          <button type="button" aria-pressed={!p.filter.where} data-cp="seg-btn" data-f="" onClick={() => set({ where: null })}>All <b>{total}</b></button>
          {WHERE_ORDER.map((w) => (
            <button key={w} type="button" aria-pressed={p.filter.where === w} data-cp="seg-btn" data-f={w} onClick={() => set({ where: p.filter.where === w ? null : w })}>
              <span className={`cp30-dt is-${w}`} aria-hidden="true" />{WHERE_LABEL[w]} <b>{p.counts[w]}</b>
            </button>
          ))}
        </div>
        <span className="cp30-sp" />
        <SortMenu value={p.sort} onChange={p.onSort} />
        <label className="cp30-find" data-cp="find">
          <Search30 />
          <input ref={p.findRef} type="text" placeholder="Find a comp" aria-label="Find a comp" autoComplete="off" value={p.filter.find} data-cp="find-input"
            onChange={(e) => set({ find: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Escape" && p.filter.find) { e.preventDefault(); e.stopPropagation(); set({ find: "" }); } }} />
        </label>
        <div className="cp30-vw" role="group" aria-label="View" data-cp="view">
          <button type="button" aria-pressed={p.mode === "cards"} aria-label="Cards" title="Cards" data-cp="view-cards" onClick={() => p.onMode("cards")}><Cards30 /></button>
          <button type="button" aria-pressed={p.mode === "list"} aria-label="List" title="List" data-cp="view-list" onClick={() => p.onMode("list")}><List30 /></button>
        </div>
      </div>

      {!p.view.length ? (
        <p className="cp30-nomatch" data-cp="no-match">Nothing matches. <button type="button" className="cp30-lnk" data-cp="show-all" onClick={clear}>Show all comps</button></p>
      ) : p.mode === "cards" ? (
        <div className="cp30-grid" data-cp="grid">
          {p.view.map((r) => <CompCard30 key={r.key} row={r} now={p.now} onOpen={p.onOpen} onPick={p.onPick} />)}
          {!isFiltered && p.canAdd ? (
            <button type="button" className="cp30-card is-addc" data-cp="add-card" data-cx-key="add-card" onClick={p.onAdd}>
              <span className="cp30-plus" aria-hidden="true">+</span>
              <b>Add a comp</b>
              <span className="cp30-ax">A book, film or show that a reader of yours would also love.</span>
            </button>
          ) : null}
        </div>
      ) : (
        <div className="cp30-lst" data-cp="list">
          <div className="cp30-fr">
            <div className="cp30-lh" aria-hidden="true"><span>Title</span><span>Published</span><span>Where it’s used</span><span>Queries</span><span>Asked for more</span></div>
            {p.view.map((r) => <ListRow30 key={r.key} row={r} now={p.now} onOpen={p.onOpen} />)}
          </div>
        </div>
      )}
    </section>
  );
};
