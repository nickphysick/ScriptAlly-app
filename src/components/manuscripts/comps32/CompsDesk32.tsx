/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v32 §C: "Your shelf" and the open comp, two of the Dashboard's cards side by side (the ref's `.grid`,
 * `.rc`, `.rb`). The shelf's rows are the Dashboard's Next up rows; choosing one opens it in the card beside it. Comp
 * details live here now: v30's detail drawer is retired from this page (adding and editing stay in the drawer).
 *
 * ⚠️ EVERY FIGURE IS compUsage's through `buildRows` (`statOf`, `compRate`, `letterRate`); nothing here counts.
 * ⚠️ NOTHING IS CUT OFF: titles and lines wrap; no `text-overflow: ellipsis` anywhere on the page (CP32 S2).
 * ⚠️ EVERY OPENER CARRIES `data-cx-key`, so focus finds it again after a repaint (comps28/refocus.ts).
 */
import React from "react";
import type { AskedRate } from "../../../lib/compUsage";
import type { CompRow, RowQuery } from "../../../lib/compsLibrary";
import {
  MEDIA_WORD, READY_AT, SHELF_SORTS, WHERE_LABEL, WHERE_ORDER, ageWords, andList, compRate, filtered, queryStatusWord, statOf,
  type ShelfFilter, type ShelfSort, type ShelfWhere,
} from "../../../lib/compsShelf";
import { dayMonth } from "../../../lib/dates";
import { StatusDot } from "../../StatusDot";
import { splitTags } from "../CompForm";
import { Find32, Ic32 } from "./marks32";

/* ══ the shelf ════════════════════════════════════════════════════════════════════════════════ */

/** The row's one line, by state (CP32 S1). */
export const RowLine32: React.FC<{ r: CompRow }> = ({ r }) => {
  const s = statOf(r);
  if (s.kind === "sent") {
    return s.early
      ? <>Sent to <b>{s.queries}</b> {s.queries === 1 ? "agent" : "agents"} so far</>
      : <><b>{s.asked} of {s.queries}</b> agents asked for more</>;
  }
  return <>{s.kind === "draft" ? "In a draft letter" : "Not used yet"}</>;
};

export const CompsShelf32: React.FC<{
  rows: readonly CompRow[];
  view: readonly CompRow[];
  counts: Record<ShelfWhere, number>;
  filter: ShelfFilter;
  sort: ShelfSort;
  openKey: string | null;
  currentKeys: ReadonlySet<string>;
  canAdd: boolean;
  findRef: React.Ref<HTMLInputElement>;
  onFilter: (f: ShelfFilter) => void;
  onSort: (s: ShelfSort) => void;
  onOpen: (key: string) => void;
  onAdd: () => void;
}> = (p) => {
  const n = p.rows.length;
  return (
    <nav className="cp32-rc cp32-shelfc" aria-label="Your shelf" data-cp="shelf">
      <div className="cp32-rc-in">
        <div className="cp32-rb is-sand"><h2 className="cp32-rbt">Your shelf</h2>
          <small data-cp="shelf-count">{filtered(p.filter) ? `${p.view.length} of ${n}` : `${n} ${n === 1 ? "title" : "titles"}`}</small>
        </div>
        <div className="cp32-shelf">
          <div className="cp32-ltools">
            <label className="cp32-find">
              <Find32 />
              <input ref={p.findRef} type="text" placeholder="Find a comp" aria-label="Find a comp" autoComplete="off" data-cp="find"
                value={p.filter.find} onChange={(e) => p.onFilter({ ...p.filter, find: e.target.value })} />
            </label>
            <div className="cp32-sels">
              <select aria-label="Show" data-cp="where" value={p.filter.where ?? ""}
                onChange={(e) => p.onFilter({ ...p.filter, where: (e.target.value || null) as ShelfWhere | null })}>
                <option value="">All {n}</option>
                {WHERE_ORDER.map((w) => <option key={w} value={w}>{WHERE_LABEL[w]} {p.counts[w]}</option>)}
              </select>
              <select aria-label="Sorted by" data-cp="sort" value={p.sort} onChange={(e) => p.onSort(e.target.value as ShelfSort)}>
                {SHELF_SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          {p.view.length ? (
            <div className="cp32-rows" data-cp="rows">
              {p.view.map((r) => (
                <button key={r.key} type="button" className="cp32-row" data-cp="row" data-key={r.key} data-w={statOf(r).kind}
                  data-cx-key={`row:${r.key}`} aria-current={r.key === p.openKey ? "true" : undefined} onClick={() => p.onOpen(r.key)}>
                  <span className="cp32-rdisc" aria-hidden="true"><Ic32 n={r.kind} /></span>
                  <span className="cp32-rowx">
                    <span className="cp32-rown" data-cp="row-title">{r.comp.title}</span>
                    <span className="cp32-rows-l" data-cp="row-line"><RowLine32 r={r} /></span>
                    {p.currentKeys.has(r.key) ? <span className="cp32-rowu" data-cp="row-current">In your current letter</span> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="cp32-none" data-cp="none">Nothing matches.{" "}
              <button type="button" className="cp32-go" data-cp="show-all" onClick={() => p.onFilter({ where: null, find: "" })}>Show all</button>
            </p>
          )}
          {p.canAdd ? <p className="cp32-shelf-f"><button type="button" className="cp32-go" data-cp="shelf-add" data-cx-key="shelf-add" onClick={p.onAdd}>Add a comp →</button></p> : null}
        </div>
      </div>
    </nav>
  );
};

/* ══ the open comp ════════════════════════════════════════════════════════════════════════════ */

export interface OpenLetter { id: string; name: string; sent: boolean; others: string[]; rate: AskedRate }
export type OpenView = "letters" | "queries";

const MAX_QUERIES = 6;
const factLabels = (media: string | undefined) =>
  media === "tv" ? { when: "First shown", who: "Channel" } : media === "film" ? { when: "Released", who: "Studio" } : { when: "Published", who: "Publisher" };

/** requests first, then the rest in the order given (`buildRows`' order) */
const requestsFirst = (qs: readonly RowQuery[]): RowQuery[] => [...qs.filter((q) => q.asked), ...qs.filter((q) => !q.asked)];

export const CompsOpen32: React.FC<{
  row: CompRow;
  letters: OpenLetter[];
  view: OpenView;
  now: number;
  letterNameOf: (letterId: string) => string;
  onView: (v: OpenView) => void;
  onEdit: (focusNote?: boolean) => void;
  onAddToLetter: () => void;
  onAllQueries: () => void;
}> = ({ row, letters, view, now, letterNameOf, onView, onEdit, onAddToLetter, onAllQueries }) => {
  const c = row.comp;
  const q = row.queries.length;
  const sentLetters = row.letters.filter((l) => l.sent).length;
  const pct = q >= READY_AT ? compRate(row) : null;
  const shown: OpenView = q ? view : "letters";
  const f = factLabels(c.media);
  const tags = splitTags(c.matchAxis);
  const by = [MEDIA_WORD[c.media ?? "book"], c.author?.trim(), c.publisher?.trim(), c.year ? String(c.year) : ""].filter(Boolean).join(" · ");
  return (
    <section className="cp32-rc cp32-work" data-cp="open" data-key={row.key} aria-label={c.title} aria-live="polite">
      <div className="cp32-rc-in">
        <div className="cp32-rb is-navy">
          <h2 className="cp32-rbt" data-cp="open-title">{c.title}</h2>
          {q ? (
            <div className="cp32-tog" role="group" aria-label="Show" data-cp="switch">
              {(["letters", "queries"] as const).map((v) => (
                <button key={v} type="button" data-cp="switch-btn" data-v={v} aria-pressed={shown === v} onClick={() => onView(v)}>
                  {v === "letters" ? "Letters" : "Queries"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="cp32-wk">
          <div className="cp32-wktop">
            <p className="cp32-wkby" data-cp="open-by">{by}</p>
            <button type="button" className="cp32-btn" data-cp="open-edit" data-cx-key="open-edit" onClick={() => onEdit(false)}><Ic32 n="pen" />Edit</button>
            {row.letters.length ? <button type="button" className="cp32-btn" data-cp="open-add" data-cx-key="open-add" onClick={onAddToLetter}>Add to a letter</button> : null}
          </div>
          {q ? (
            <div className="cp32-nums" data-cp="figs">
              <div data-fig="letters"><b>{sentLetters}</b><span>{sentLetters === 1 ? "sent letter mentions it" : "sent letters mention it"}</span></div>
              <div data-fig="agents"><b>{q}</b><span>{q === 1 ? "agent has received it" : "agents have received it"}</span></div>
              <div data-fig="asked"><b>{row.askedForMore}</b><span>asked for more</span></div>
              <div data-fig="pct"><b>{pct === null ? "–" : `${pct}%`}</b><span>{pct === null ? "too early for a percentage" : "of them asked for more"}</span></div>
            </div>
          ) : null}
          <div className="cp32-two2">
            <div className="cp32-why" data-cp="why">
              <h3 className="cp32-h3">Why it compares</h3>
              {c.note?.trim()
                ? <p data-cp="why-note">{c.note}</p>
                : <p className="cp32-gap" data-cp="why-gap">You haven&rsquo;t said why this is like your book.{" "}
                  <button type="button" className="cp32-go" data-cp="why-add" data-cx-key="why-add" onClick={() => onEdit(true)}>Add a note →</button></p>}
              {tags.length ? <div className="cp32-tags" data-cp="tags">{tags.map((t, i) => <span key={`${t}-${i}`} className="cp32-tag">{t}</span>)}</div> : null}
              <dl className="cp32-facts" data-cp="facts">
                <dt>{f.when}</dt>
                <dd data-cp="fact-year">{c.year
                  ? `${c.year} · ${ageWords(c.year, now)}`
                  : <button type="button" className="cp32-go" data-cx-key="fact-year" onClick={() => onEdit(false)}>Add year →</button>}</dd>
                <dt>{f.who}</dt>
                <dd data-cp="fact-pub">{c.publisher?.trim()
                  ? c.publisher
                  : <button type="button" className="cp32-go" data-cp="fact-pub-add" data-cx-key="fact-pub" onClick={() => onEdit(false)}>Add {f.who.toLowerCase()} →</button>}</dd>
              </dl>
            </div>
            <div data-cp="open-list" data-view={shown}>
              {shown === "queries" ? (
                <>
                  <h3 className="cp32-h3">Queries that mentioned it</h3>
                  <ul className="cp32-lst" data-cp="queries">
                    {requestsFirst(row.queries).slice(0, MAX_QUERIES).map((x) => (
                      <li key={x.id} data-cp="query" data-q={x.id}>
                        <span className="cp32-rdisc cp32-ini" aria-hidden="true">{x.initials}</span>
                        <span className="cp32-lstx">
                          <b>{x.agentName}</b>
                          <span><StatusDot status={x.status} overrideSize={14} decorative /><i data-cp="query-word">{queryStatusWord(x.status)}</i>{" · "}{letterNameOf(x.letterId)}</span>
                        </span>
                        <span className="cp32-lstr">{x.dateSent ? <time data-cp="query-date">{dayMonth(x.dateSent)}</time> : null}</span>
                      </li>
                    ))}
                  </ul>
                  {q > MAX_QUERIES ? (
                    <p className="cp32-lstf"><button type="button" className="cp32-go" data-cp="queries-all" onClick={onAllQueries}>See all {q} in the Query Centre →</button></p>
                  ) : null}
                </>
              ) : (
                <>
                  <h3 className="cp32-h3">Letters that mention it</h3>
                  {letters.length ? (
                    <ul className="cp32-lst" data-cp="letters">
                      {letters.map((l) => (
                        <li key={l.id} data-cp="letter" data-letter={l.id}>
                          <span className="cp32-rdisc" aria-hidden="true"><Ic32 n="mail" /></span>
                          <span className="cp32-lstx"><b>{l.name}</b>
                            <span data-cp="letter-others">{l.others.length ? `alongside ${andList(l.others)}` : "the only comp in this letter"}</span>
                          </span>
                          <span className="cp32-lstr" data-cp="letter-rate">
                            {l.sent ? <><b>{l.rate.asked} of {l.rate.sent}</b>agents asked for more</> : "Not sent yet"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="cp32-wait" data-cp="letters-none">
                      <p>This comp isn&rsquo;t in any of your letters. Add it to a draft letter to start tracking it.</p>
                      <button type="button" className="cp32-btn is-pri" data-cp="open-add" data-cx-key="open-add" onClick={onAddToLetter}>Add to a letter</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/** Loading: both cards hold their size with skeleton blocks; no spinner. */
export const CompsDeskSkeleton32: React.FC = () => (
  <div className="cp32-grid" data-cp="skeleton" aria-hidden="true">
    <div className="cp32-rc"><div className="cp32-rc-in">
      <div className="cp32-rb is-sand"><span className="cp32-sk" style={{ width: 140 }} /></div>
      <div className="cp32-shelf">{[0, 1, 2, 3].map((i) => <span key={i} className="cp32-sk cp32-sk-row" />)}</div>
    </div></div>
    <div className="cp32-rc"><div className="cp32-rc-in">
      <div className="cp32-rb is-navy"><span className="cp32-sk is-dark" style={{ width: 260 }} /></div>
      <div className="cp32-wk">{[0, 1, 2].map((i) => <span key={i} className="cp32-sk cp32-sk-blk" />)}</div>
    </div></div>
  </div>
);
