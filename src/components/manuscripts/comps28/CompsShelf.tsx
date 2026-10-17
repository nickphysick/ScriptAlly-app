/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v28 §B and §C (design-refs/comps-v28/comps-v28.html): the notice, then "Your comp shelf" — a light
 * toolbar over a grid of index-card comps.
 *
 * ⚠️ THE CARD IS ONE CONTROL (role="button"): it opens the comp drawer. The links inside it ("Add publisher",
 *    "Log in a letter") act on their own and never open the drawer. No hover action buttons.
 * ⚠️ EVERY OPENER CARRIES `data-cx-key`, so focus can find it again after a repaint (comps28/refocus.ts).
 * ⚠️ BOOK, FILM AND TV ARE AN ICON, NEVER A COLOUR.
 */
import React, { useEffect, useRef, useState } from "react";
import type { CompRow, CompKind } from "../../../lib/compsLibrary";
import {
  KIND_LABEL, SHELF_SORTS, WHERE_LABEL, WHERE_ORDER, ageChip, catalogueLine, filtered, slipOf,
  type Notice, type ShelfFilter, type ShelfSort, type ShelfWhere,
} from "../../../lib/compsShelf";
import { splitTags } from "../CompForm";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { KindIcon, LetterIcon, LockIcon, PenIcon } from "../comps25/marks";

/* ══ §B · the notice ══════════════════════════════════════════════════════════════════════════ */

export const CompsNotice: React.FC<{ notice: Notice; onLog: (letterId: string) => void }> = ({ notice, onLog }) => (
  <div className="cx-note" data-cx="notice" role="note">
    <span className="cx-note-pd" aria-hidden="true"><PenIcon /></span>
    <p><b>{notice.lead}</b>{notice.rest}</p>
    <button type="button" className="cx-btn cx-btn--p" data-cx="notice-log" data-cx-key="notice-log" onClick={() => onLog(notice.letterId)}>{notice.button}</button>
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
    <div className={`cx-sort${open ? " is-open" : ""}`} ref={wrap} data-cx="sort">
      <button ref={btn} type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`Sorted by ${label}`} data-cx="sort-btn" onClick={() => setOpen((o) => !o)}>
        <em>Sorted by</em> <span data-cx="sort-value">{label}</span> <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="cx-sort-menu" role="menu" aria-label="Sort the shelf" onKeyDown={onKey} data-cx="sort-menu">
          {SHELF_SORTS.map((s, i) => (
            <button key={s.key} ref={(el) => { items.current[i] = el; }} type="button" role="menuitemradio" aria-checked={s.key === value} data-sort={s.key}
              onClick={() => { onChange(s.key); close(); }}>{s.label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/* ══ §C · the card ════════════════════════════════════════════════════════════════════════════ */

const CompCard: React.FC<{
  row: CompRow; now: number; open: boolean;
  onOpen: (key: string) => void; onEdit: (key: string) => void; onPick: (key: string) => void;
}> = ({ row, now, open, onOpen, onEdit, onPick }) => {
  const c = row.comp;
  const cat = catalogueLine(c);
  const age = ageChip(c.year, now);
  const slip = slipOf(row);
  const tags = splitTags(c.matchAxis);
  const inLetter = row.letters.length > 0;
  const stop = (f: () => void) => (e: React.MouseEvent | React.KeyboardEvent) => { e.stopPropagation(); f(); };
  return (
    <article className={`cx-card${open ? " is-open" : ""}`} role="button" tabIndex={0} aria-label={c.title}
      data-cx="card" data-key={row.key} data-cx-key={`card:${row.key}`} data-where={row.where}
      onClick={() => onOpen(row.key)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(row.key); } }}>
      <div className="cx-top">
        <span className={`cx-ti${inLetter ? " is-k" : ""}`} data-cx="card-icon" aria-hidden="true"><KindIcon kind={row.kind} /></span>
        <span className="cx-meta" data-cx="card-meta">
          {cat.type}
          {cat.missing ? <> · <span className="cx-miss">No publisher</span></> : cat.publisher ? <> · {cat.publisher}</> : null}
          {cat.year ? <> · {cat.year}</> : null}
        </span>
        {age ? <span className={`cx-age is-${age.tone}`} data-cx="age" data-tone={age.tone} title={age.title ?? `Published ${c.year}`}>{age.text}</span> : null}
      </div>
      <h3 className="cx-ttl" data-cx="card-title">{c.title}</h3>
      {c.author?.trim() ? <p className="cx-by">{c.author}</p> : null}
      {c.note?.trim() ? <p className="cx-why">{c.note}</p> : <p className="cx-why is-none">No line yet on why it compares.</p>}
      {tags.length ? <div className="cx-chips" data-cx="card-tags">{tags.map((t, i) => <span key={`${t}-${i}`}>{t}</span>)}</div> : null}
      <span className="cx-grow" />
      <div className="cx-slip" data-cx="slip" data-slip={slip.kind}>
        <div className="cx-slip-row">
          <span className="cx-lab">Named in</span>
          {inLetter ? row.letters.map((l) => (
            <span key={l.id} className={`cx-let${l.sent ? " is-sent" : ""}`} data-cx="letter-chip" data-sent={l.sent ? "true" : "false"} title={l.sent ? `${l.name} · sent, so fixed` : `${l.name} · not sent yet`}>
              <LetterIcon />{l.short}{l.sent ? <LockIcon /> : null}
            </span>
          )) : <span className="cx-nil">No letter yet</span>}
        </div>
        {slip.kind === "notready" ? (
          <div className="cx-perf" data-cx="slip-2">
            <span className="cx-warn"><span className="cx-dot" aria-hidden="true">!</span>{slip.text}</span>
            <span className="cx-grow" />
            <button type="button" className="cx-lnk" data-cx="slip-edit" data-cx-key={`edit:${row.key}`} onClick={stop(() => onEdit(row.key))} onKeyDown={(e) => e.stopPropagation()}>{slip.link}</button>
          </div>
        ) : slip.kind === "sent" ? (
          <div className="cx-perf" data-cx="slip-2" title={`${slip.asked} of ${slip.queries} asked for more`}>
            <span className="cx-n" data-cx="slip-queries">{slip.queries} {slip.queries === 1 ? "query" : "queries"}<small data-cx="slip-asked">{slip.asked} asked for more</small></span>
            <span className="cx-meter" aria-hidden="true"><i style={{ width: `${slip.pct}%` }} /></span>
            <span className="cx-rate" data-cx="slip-rate">{slip.pct}<small>%</small></span>
          </div>
        ) : slip.kind === "draft" ? (
          <div className="cx-perf" data-cx="slip-2"><span className="cx-nil">Waiting to go out with {slip.letter}</span></div>
        ) : (
          <div className="cx-perf" data-cx="slip-2">
            <span className="cx-nil">On your shelf, ready for a letter</span>
            <span className="cx-grow" />
            <button type="button" className="cx-lnk" data-cx="slip-pick" data-cx-key={`pick:${row.key}`} onClick={stop(() => onPick(row.key))} onKeyDown={(e) => e.stopPropagation()}>Log in a letter</button>
          </div>
        )}
      </div>
    </article>
  );
};

/* ══ §C · the shelf ═══════════════════════════════════════════════════════════════════════════ */

export const CompsShelf: React.FC<{
  rows: CompRow[];
  /** the shelf after filter and sort */
  view: CompRow[];
  counts: Record<ShelfWhere, number>;
  kinds: CompKind[];
  filter: ShelfFilter;
  sort: ShelfSort;
  now: number;
  openKey: string | null;
  canAdd: boolean;
  findRef: React.Ref<HTMLInputElement>;
  headRef: React.Ref<HTMLElement>;
  onFilter: (f: ShelfFilter) => void;
  onSort: (k: ShelfSort) => void;
  onOpen: (key: string) => void;
  onEdit: (key: string) => void;
  onPick: (key: string) => void;
  onAdd: () => void;
}> = (p) => {
  const total = p.rows.length;
  const isFiltered = filtered(p.filter);
  const set = (patch: Partial<ShelfFilter>) => p.onFilter({ ...p.filter, ...patch });
  return (
    <section className="cx-sec cx-shelf" data-cx="shelf" aria-labelledby="cx-shelf-h" ref={p.headRef}>
      <div className="cx-sh">
        <h2 className="cx-h2" id="cx-shelf-h">Your comp shelf</h2>
        <span className="cx-tag" data-cx="shelf-tag">{total} {total === 1 ? "title" : "titles"}</span>
        <span className="cx-grow" />
        {isFiltered ? (
          <span className="cx-shw" data-cx="showing">
            Showing <b>{p.view.length}</b> of <b>{total}</b>
            <button type="button" data-cx="clear" onClick={() => p.onFilter({ where: null, kind: null, find: "" })}>Clear</button>
          </span>
        ) : null}
      </div>

      <div className="cx-tools" data-cx="tools">
        <div className="cx-seg" role="group" aria-label="Where it’s used" data-cx="seg">
          <button type="button" aria-pressed={!p.filter.where} data-cx="seg-btn" data-f="" onClick={() => set({ where: null })}>All <sup>{total}</sup></button>
          {WHERE_ORDER.map((w) => (
            <button key={w} type="button" aria-pressed={p.filter.where === w} data-cx="seg-btn" data-f={w} onClick={() => set({ where: p.filter.where === w ? null : w })}>
              {WHERE_LABEL[w]} <sup>{p.counts[w]}</sup>
            </button>
          ))}
        </div>
        {p.kinds.length >= 2 ? (
          <div className="cx-ty" role="group" aria-label="Book, film or TV" data-cx="types">
            {p.kinds.map((k) => (
              <button key={k} type="button" aria-pressed={p.filter.kind === k} data-cx="type-btn" data-k={k}
                aria-label={`${KIND_LABEL[k]} only`} title={`${KIND_LABEL[k]} only · ${p.rows.filter((r) => r.kind === k).length}`}
                onClick={() => set({ kind: p.filter.kind === k ? null : k })}><KindIcon kind={k} /></button>
            ))}
          </div>
        ) : null}
        <span className="cx-grow" />
        <SortMenu value={p.sort} onChange={p.onSort} />
        <label className="cx-find" data-cx="find">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
          <input ref={p.findRef} type="text" placeholder="Find a comp" aria-label="Find a comp" autoComplete="off" value={p.filter.find} data-cx="find-input"
            onChange={(e) => set({ find: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Escape" && p.filter.find) { e.preventDefault(); e.stopPropagation(); set({ find: "" }); } }} />
          <kbd aria-hidden="true">/</kbd>
        </label>
      </div>

      <div className="cx-grid" data-cx="grid">
        {p.view.length ? p.view.map((r) => (
          <CompCard key={r.key} row={r} now={p.now} open={p.openKey === r.key} onOpen={p.onOpen} onEdit={p.onEdit} onPick={p.onPick} />
        )) : (
          <div className="cx-nomatch" data-cx="no-match">
            No comps match. <button type="button" className="cx-lnk" data-cx="show-all" onClick={() => p.onFilter({ where: null, kind: null, find: "" })}>Show them all</button>
          </div>
        )}
        {!isFiltered && p.canAdd ? (
          <button type="button" className="cx-addcard" data-cx="add-card" data-cx-key="add-card" onClick={p.onAdd}>
            <span className="cx-pl" aria-hidden="true">+</span>
            <b>Add a comp</b>
            <span>Two or three in a letter is usual. Keep a few more here to choose from.</span>
          </button>
        ) : null}
      </div>
    </section>
  );
};
