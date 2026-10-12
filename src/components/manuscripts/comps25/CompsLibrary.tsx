/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25, Part D: the library. A heading the list's full width, then the list: a
 * one-row ink bar (search, one filter at a time, an optional grouping, full screen), column headings
 * that ARE the sort, the notice for letters sent with nothing logged, and the rows.
 *
 * ⚠️ A ROW OPENS THE DRAWER. Nothing expands inline, ever (baked decision 5).
 * ⚠️ DRAG-TO-REORDER IS RETIRED from this page: the writer's own order is the stored array order,
 * shown when no column is sorted.
 */
import React, { useEffect, useRef, useState } from "react";
import type { UnrecordedLetter } from "../../../lib/compUsage";
import {
  Band, COLUMNS, CompFilter, CompRow, FILTERS, GROUP_OPTIONS, GroupBy, SortKey, SortState, ariaSort, libraryTag, nextMove,
} from "../../../lib/compsLibrary";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { FindIcon, FullIcon, KIND_WORD, KindIcon, LetterIcon, LockIcon, PenIcon, SendIcon, ShelfIcon, WaitIcon } from "./marks";

export interface LibraryProps {
  loading: boolean;
  total: number;
  /** the rows after the filter, the search and the sort */
  rows: readonly CompRow[];
  bands: Band[] | null;
  counts: Record<CompFilter, number>;
  filter: CompFilter | null;
  find: string;
  sort: SortState | null;
  group: GroupBy;
  full: boolean;
  rate: number | null;
  unrecorded: readonly UnrecordedLetter[];
  needs: number;
  openKey: string | null;
  findRef: React.Ref<HTMLInputElement>;
  headRef: React.Ref<HTMLDivElement>;
  onFilter: (f: CompFilter | null) => void;
  onFind: (s: string) => void;
  onClear: () => void;
  onSort: (k: SortKey) => void;
  onGroup: (g: GroupBy) => void;
  onFull: () => void;
  onOpen: (key: string) => void;
  onEdit: (key: string) => void;
  /** open the picker: on a letter, or on the current one with a comp to tick */
  onPick: (letterId: string | null, forKey?: string) => void;
}

const BAND_ICON: Record<string, React.ReactNode> = { sent: <SendIcon />, unsent: <WaitIcon />, none: <ShelfIcon />, book: <KindIcon kind="book" />, screen: <KindIcon kind="film" /> };

/**
 * The row's COMP cell: the disc, the title and the byline. Exported because the add-and-edit form's
 * preview draws this same component (comps v26, baked decision 5): a lookalike would drift.
 * `onAddPublisher` absent draws the missing publisher as words, not a control (the preview).
 */
export const CompCell: React.FC<{ r: CompRow; placeholder?: string; onAddPublisher?: () => void }> = ({ r, placeholder, onAddPublisher }) => {
  const c = r.comp;
  const by: React.ReactNode[] = [];
  if (c.author?.trim()) by.push(c.author.trim());
  if (c.publisher?.trim()) by.push(c.publisher.trim());
  else if (r.kind === "book") {
    by.push(onAddPublisher
      ? <button key="add" type="button" className="cv-addl" data-cv="add-publisher" onClick={(e) => { e.stopPropagation(); onAddPublisher(); }}>add publisher</button>
      : <span key="add" className="cv-addl cv-addl--words" data-cv="add-publisher">add publisher</span>);
  }
  if (c.year) by.push(String(c.year));
  const title = c.title.trim();
  return (
    <div className="cv-ag" data-cv="comp-cell">
      <span className={`cv-disc${r.where !== "none" ? "" : " is-ring"}`} title={KIND_WORD[r.kind]} data-cv="row-disc"><KindIcon kind={r.kind} /></span>
      <div>
        <b data-cv="row-title" className={title ? undefined : "is-placeholder"}>{title || placeholder || ""}</b>
        <small data-cv="row-by">{by.map((x, i) => <React.Fragment key={i}>{i > 0 ? " · " : ""}{x}</React.Fragment>)}</small>
      </div>
    </div>
  );
};

/** The row's NEXT-MOVE cell: the words and the mono line, and (in the list) the hover tray. */
export const NextCell: React.FC<{ r: CompRow; tray?: React.ReactNode }> = ({ r, tray }) => {
  const nx = nextMove(r);
  return (
    <div className="cv-nx" data-cv="row-next">
      <div className="cv-nxt">{nx.text}</div>
      <div className={`cv-sub${nx.hot ? " is-hot" : ""}`}>{nx.mono}</div>
      {tray}
    </div>
  );
};

const Row: React.FC<{ r: CompRow; p: LibraryProps }> = ({ r, p }) => {
  const c = r.comp;
  const nx = nextMove(r);
  const act = () => {
    if (nx.act === "edit") p.onEdit(r.key);
    else if (nx.act === "open") p.onOpen(r.key);
    else if (nx.act === "pick") p.onPick(nx.letterId ?? null);
    else p.onPick(null, r.key);
  };
  const sub = r.letters.length === 0 ? null : r.letters.some((l) => l.sent)
    ? (r.packages.length ? `In ${r.packages.join(", ")}` : "Sent")
    : "Not sent yet";
  return (
    <div className={`cv-row${p.openKey === r.key ? " is-open" : ""}`} role="button" tabIndex={0} data-cv="row" data-key={r.key} data-where={r.where} data-kind={r.kind}
      aria-label={`${c.title}. Open details.`}
      onClick={() => p.onOpen(r.key)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); p.onOpen(r.key); } }}>
      <CompCell r={r} onAddPublisher={() => p.onEdit(r.key)} />
      <div data-cv="row-named">
        {r.letters.length ? (
          <div className="cv-lets">
            {r.letters.map((l) => (
              <span key={l.id} className={`cv-let${l.sent ? "" : " is-unsent"}`} data-cv="row-letter" data-sent={l.sent ? "true" : "false"} title={l.sent ? `${l.name}, sent` : `${l.name}, not sent yet`}>
                <LetterIcon /><span>{l.short}</span>{l.sent && <LockIcon />}
              </span>
            ))}
          </div>
        ) : <span className="cv-none">Not in a letter</span>}
        {sub && <div className="cv-sub">{sub}</div>}
      </div>
      <div className="cv-seen" data-cv="row-seen" data-n={r.queries.length}>
        {r.queries.length ? (
          <>
            <div className="cv-faces" aria-hidden="true">
              {r.queries.slice(0, 4).map((q) => <i key={q.id} title={q.agentName}>{q.initials}</i>)}
              {r.queries.length > 4 && <em>+{r.queries.length - 4}</em>}
            </div>
            <span className="cv-q">{r.queries.length} {r.queries.length === 1 ? "query" : "queries"}<small>{r.askedForMore} ASKED FOR MORE</small></span>
          </>
        ) : <span className="cv-none">{r.where === "unsent" ? "Not sent yet" : "No one yet"}</span>}
      </div>
      <NextCell r={r} tray={(
        <div className="cv-tray" data-cv="row-tray">
          <button type="button" className="cv-pillbtn" data-cv="tray-act" onClick={(e) => { e.stopPropagation(); act(); }}>{nx.tray}</button>
          <button type="button" className="cv-ghost" data-cv="tray-edit" onClick={(e) => { e.stopPropagation(); p.onEdit(r.key); }}>Edit</button>
        </div>
      )} />
    </div>
  );
};

export const CompsLibrary: React.FC<LibraryProps> = (p) => {
  const [menu, setMenu] = useState(false);
  const [shut, setShut] = useState<Set<string>>(new Set());
  const ctl = useRef<HTMLDivElement>(null);
  useEscapeLayer(menu, () => setMenu(false), ESC_LEVEL.page);
  useEffect(() => {
    if (!menu) return undefined;
    const away = (e: PointerEvent) => { if (!ctl.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [menu]);

  const filtered = !!p.filter || !!p.find.trim();
  const first = p.unrecorded[0];
  return (
    <div className="cv-lib" data-cv="lib">
      <div className="cv-libhead" data-cv="lib-head" ref={p.headRef}>
        <h2 className="cv-libh">Your comparable titles library</h2>
        <span className="cv-libk" data-cv="lib-tag">{p.loading ? "" : libraryTag(p.total, p.sort, p.group)}</span>
        <span className="cv-libr">
          {!p.loading && p.rate !== null && <span className="cv-rate" data-cv="lib-rate">{p.rate}% of queries logged</span>}
          {!p.loading && first && (
            <button type="button" className="cv-pill cv-pill--blush" data-cv="pill-log" onClick={() => p.onPick(first.letterId)}>
              <i /><b>{p.unrecorded.length}</b> {p.unrecorded.length === 1 ? "letter" : "letters"} to log
            </button>
          )}
          {!p.loading && p.needs > 0 && (
            <button type="button" className="cv-pill cv-pill--powder" data-cv="pill-needs" onClick={() => p.onFilter("none")}>
              <i /><b>{p.needs}</b> {p.needs === 1 ? "needs" : "need"} a publisher
            </button>
          )}
          {!p.loading && (
            <span className="cv-shw" data-cv="showing">
              Showing <b>{p.rows.length}</b> of <b>{p.total}</b>
              {filtered && <> · <button type="button" className="cv-clear" data-cv="clear" onClick={p.onClear}>Clear</button></>}
            </span>
          )}
        </span>
      </div>

      <section className="cv-list" data-cv="list" aria-label="Your comparable titles">
        <div className="cv-bar" data-cv="bar">
          <label className="cv-find" data-cv="find">
            <FindIcon />
            <input ref={p.findRef} value={p.find} placeholder="Find a comp" autoComplete="off" aria-label="Find a comp" onChange={(e) => p.onFind(e.target.value)} />
            <kbd>/</kbd>
          </label>
          <div className="cv-chips" data-cv="chips">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className={`cv-chip${f.narrow ? " is-narrow" : ""}`} data-cv="chip" data-f={f.key} aria-pressed={p.filter === f.key}
                onClick={() => p.onFilter(p.filter === f.key ? null : f.key)}>
                {f.label} <sup>{p.loading ? "" : p.counts[f.key]}</sup>
              </button>
            ))}
          </div>
          <span className="cv-sp" />
          <div className="cv-gctl" ref={ctl}>
            <button type="button" className="cv-gbtn" data-cv="group-btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <em>Grouped:</em> <span data-cv="group-value">{GROUP_OPTIONS.find((g) => g.key === p.group)!.label}</span> <span aria-hidden="true">⌄</span>
            </button>
            {menu && (
              <div className="cv-gmenu" role="menu" data-cv="group-menu">
                {GROUP_OPTIONS.map((g) => (
                  <button key={g.key} type="button" role="menuitemradio" aria-checked={p.group === g.key} data-g={g.key}
                    onClick={() => { p.onGroup(g.key); setMenu(false); }}>{g.label}</button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="cv-fsb" data-cv="full-btn" aria-pressed={p.full} title="Full-screen list (F)" aria-label={p.full ? "Exit full screen" : "Full screen"} onClick={p.onFull}>
            <FullIcon on={p.full} />{p.full ? "Exit full screen" : "Full screen"}
          </button>
        </div>

        <div className="cv-body">
          <div className="cv-cols" data-cv="cols">
            {COLUMNS.map((col) => {
              const on = p.sort?.key === col.key;
              return (
                <button key={col.key} type="button" className={`cv-sh${on ? " is-on" : ""}`} data-cv="sort" data-sort={col.key} aria-sort={ariaSort(p.sort, col.key)}
                  onClick={() => p.onSort(col.key)}>
                  {col.label}<i aria-hidden="true">{on ? (p.sort!.dir > 0 ? "▲" : "▼") : "↕"}</i>
                </button>
              );
            })}
          </div>

          {!p.loading && p.unrecorded.map((u) => (
            <div key={u.letterId} className="cv-unrec" data-cv="unrec" data-letter={u.letterId}>
              <span className="cv-gart"><PenIcon /></span>
              <p><b>{u.name}</b> went out with {u.queries} {u.queries === 1 ? "query" : "queries"} with no comps logged. {u.queries === 1 ? "It shows" : "They show"} as “comps not recorded” until you log them.</p>
              <button type="button" className="cv-pillbtn" data-cv="unrec-log" onClick={() => p.onPick(u.letterId)}>Log them now</button>
            </div>
          ))}

          {p.loading ? (
            <div className="cv-rows" data-cv="rows-loading" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="cv-skel" />)}</div>
          ) : p.rows.length === 0 ? (
            <p className="cv-nomatch" data-cv="no-match">No comp matches. <button type="button" className="cv-clear" onClick={p.onClear}>Clear</button></p>
          ) : p.bands ? (
            p.bands.map((b) => {
              const open = !shut.has(b.key);
              return (
                <div key={b.key} className="cv-grp" data-cv="grp" data-group={b.key}>
                  <button type="button" className={`cv-band cv-band--${b.tone}`} data-cv="band" aria-expanded={open}
                    onClick={() => setShut((s) => { const n = new Set(s); if (n.has(b.key)) n.delete(b.key); else n.add(b.key); return n; })}>
                    <span className="cv-gart">{BAND_ICON[b.key] ?? <WaitIcon />}</span>
                    <b>{b.name}</b>
                    <span className="cv-mono" data-cv="band-n">{b.rows.length} {b.rows.length === 1 ? "comp" : "comps"}</span>
                    <span className="cv-mono cv-hint">{b.hint}</span>
                    <span className="cv-chev" aria-hidden="true">▾</span>
                  </button>
                  {open && <div className="cv-rows">{b.rows.map((r) => <Row key={r.key} r={r} p={p} />)}</div>}
                </div>
              );
            })
          ) : (
            <div className="cv-rows" data-cv="rows">{p.rows.map((r) => <Row key={r.key} r={r} p={p} />)}</div>
          )}
        </div>
      </section>
    </div>
  );
};
