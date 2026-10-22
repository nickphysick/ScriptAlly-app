/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 Part D1 — THE GENRE PICKER (the mock's `.gx`): one main genre, up to three more, predictive search.
 *
 *   Main genre   a navy chip (a sub-genre adds "in {Parent}"), Change, and "What agents will look for first"
 *   Also fits    plain chips with ×; on hover or focus a chip shows ↑ Main, which swaps it with the main genre in one press
 *                "+ Add a genre" opens the search; under the row, "Popular" quick-adds (five not already picked); at three
 *                the add button and Popular hide
 *   The search   a combobox: empty it shows Popular; typing ranks results (lib/manuscriptV28.searchGenres), the matched
 *                part bold, "in {Parent}" for a sub-genre, an alias in quotes, the word-count range on the right; with no
 *                exact match the last row adds the text as the writer's own genre ("Just for you"); ↑ ↓ move, Enter
 *                picks, and it closes on Escape, an outside press, Tab away or a pick (useDismissable)
 *
 * ⚠️ PROMOTION IS ↑ MAIN, NEVER PICK ORDER. The onboarding picker's `pressGenre` (first picked is main, press again to
 *    promote) is not used here.
 * ⚠️ AN OWN GENRE IS REGISTERED ON SAVE, NOT ON PICK: the drawer passes `own` items to `db.addPersonalGenre` when it
 *    saves, so Cancel never leaves a personal genre behind.
 */
import React, { useId, useRef, useState } from "react";
import { useDismissable } from "../../shell/useDismissable";
import { genreLabel, matchKey, wordCountRangeForGenre } from "../../../lib/genres";
import {
  MAX_ALSO, type PickedGenre, isExactGenre, parentLabel, pickKey, popularFor, searchGenres,
} from "../../../lib/manuscriptV28";

const mark = (label: string, q: string): React.ReactNode => {
  const k = q.trim().toLowerCase();
  const i = k ? label.toLowerCase().indexOf(k) : -1;
  if (i < 0) return label;
  return <>{label.slice(0, i)}<b>{label.slice(i, i + k.length)}</b>{label.slice(i + k.length)}</>;
};
const Glass = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
);

interface Option { key: string; pick: PickedGenre; label: React.ReactNode; parent: string | null; via: string | null; right: string; own?: boolean }

export const GenreField: React.FC<{
  main: PickedGenre | null;
  also: PickedGenre[];
  onChange: (next: { main: PickedGenre | null; also: PickedGenre[] }) => void;
}> = ({ main, also, onChange }) => {
  const [open, setOpen] = useState<null | "main" | "also">(main ? null : null);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const picked = [main, ...also].filter((p): p is PickedGenre => !!p);
  const pickedIds = picked.map((p) => p.id).filter((x): x is string => !!x);

  const close = () => { setOpen(null); setQ(""); setHi(0); };
  useDismissable(!!open, boxRef, close, { ignore: (t) => !!t.closest("[data-gx-opener]") });

  const options: Option[] = q.trim()
    ? searchGenres(q, pickedIds).map((h) => ({
        key: h.id, pick: { id: h.id, label: h.label }, label: mark(h.label, q), parent: h.parent ? genreLabel(h.parent) : null,
        via: h.via, right: `${h.range} words`,
      }))
    : popularFor(pickedIds).map((id) => ({ key: id, pick: { id, label: genreLabel(id) }, label: genreLabel(id), parent: null, via: null, right: `${wordCountRangeForGenre(id)} words` }));
  const typed = q.trim();
  const ownTaken = picked.some((p) => matchKey(p.label) === matchKey(typed));
  if (typed && !isExactGenre(typed) && !ownTaken) {
    options.push({ key: `own:${matchKey(typed)}`, pick: { id: null, label: typed.replace(/\s+/g, " "), own: true }, label: <>+ Add “{typed}” as your own genre</>, parent: null, via: null, right: "Just for you", own: true });
  }
  const active = Math.min(hi, Math.max(0, options.length - 1));

  const pick = (p: PickedGenre) => {
    if (open === "main") {
      onChange({ main: p, also: also.filter((a) => pickKey(a) !== pickKey(p)) });
    } else if (!picked.some((x) => pickKey(x) === pickKey(p)) && also.length < MAX_ALSO) {
      onChange({ main, also: [...also, p] });
    }
    close();
  };
  const promote = (p: PickedGenre) => {
    onChange({ main: p, also: also.map((a) => (pickKey(a) === pickKey(p) ? main : a)).filter((a): a is PickedGenre => !!a) });
  };

  const search = (which: "main" | "also") => (
    <div className="gx-in" ref={boxRef} data-gx="search" data-which={which}>
      <Glass />
      <input
        role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={options.length ? `${listId}-${active}` : undefined}
        aria-label={which === "main" ? "Search for the main genre" : "Search for another genre"}
        placeholder={which === "main" ? "Search genres, e.g. psychological thriller" : "Add another genre"} autoComplete="off" autoFocus
        value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHi(Math.min(options.length - 1, active + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi(Math.max(0, active - 1)); }
          else if (e.key === "Enter") { e.preventDefault(); const o = options[active]; if (o) pick(o.pick); }
        }}
      />
      <button type="button" className="gx-cancel" aria-label="Cancel" onClick={close}>Esc</button>
      <ul className="gx-list" id={listId} role="listbox" aria-label="Genres" data-gx="list">
        {!typed ? <li className="gx-h" role="presentation">Popular</li> : null}
        {options.map((o, i) => (
          <li key={o.key} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={o.own ? "own" : undefined}
            data-gx-opt={o.own ? "own" : o.key}
            onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => pick(o.pick)}>
            <span className="gl">{o.label}{o.parent ? <em>in {o.parent}</em> : null}{o.via ? <em>“{o.via}”</em> : null}</span>
            <span className="gr">{o.right}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="gx" data-gx="field">
      <div className="gx-row">
        <span className="gx-l">Main genre</span>
        {open === "main" || !main ? search("main") : (
          <div className="gx-main">
            <span className="gx-chip main" data-gx="main" data-genre={main.id ?? main.label}><b>{main.label}</b>{parentLabel(main.id) ? <em>in {parentLabel(main.id)}</em> : null}</span>
            <button type="button" className="gx-ch" data-gx="change" data-gx-opener="" onClick={() => { setOpen("main"); setQ(""); setHi(0); }}>Change</button>
            <span className="gx-why">What agents will look for first</span>
          </div>
        )}
      </div>
      <div className="gx-row">
        <span className="gx-l">Also fits <em>up to {MAX_ALSO}</em></span>
        <div>
          <div className="gx-also">
            {also.map((a) => (
              <span className="gx-chip" key={pickKey(a)} data-gx="also" data-genre={a.id ?? a.label}>
                <span>{a.label}</span>
                {main ? <button type="button" className="gx-up" data-gx-up="" title="Make this the main genre" aria-label={`Make ${a.label} the main genre`} onClick={() => promote(a)}>↑ Main</button> : null}
                <button type="button" className="gx-x" aria-label={`Remove ${a.label}`} onClick={() => onChange({ main, also: also.filter((x) => pickKey(x) !== pickKey(a)) })}>✕</button>
              </span>
            ))}
            {also.length < MAX_ALSO ? (open === "also" ? search("also") : (
              <button type="button" className="gx-add" data-gx="add" data-gx-opener="" onClick={() => { setOpen("also"); setQ(""); setHi(0); }}>+ Add a genre</button>
            )) : null}
          </div>
          {also.length < MAX_ALSO && open !== "also" ? (
            <div className="gx-pop" data-gx="popular">
              <span>Popular</span>
              {popularFor(pickedIds).map((id) => (
                <button type="button" key={id} onClick={() => onChange({ main, also: [...also, { id, label: genreLabel(id) }] })}>{genreLabel(id)}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
