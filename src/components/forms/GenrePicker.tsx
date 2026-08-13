/**
 * GenrePicker — the taxonomy picker (interaction layer, Stage 3d). Search-first popover over the
 * shared genre taxonomy (src/lib/genres.ts): canonical genres, then the user's own in a "Your
 * genres" group. Stores IDs (never labels). Ghost completion; the option ⏎ will pick is visibly
 * ringed; the helper line states exactly what ⏎ does. When nothing matches, the personal-genre
 * escape is offered plainly ("⏎ to add '…' as your own") — created via onCreatePersonal
 * (db.addPersonalGenre), which runs the 3b guardrails (cap, junk, dedupe).
 *
 * Deviation from design-refs/contact-list-interactions.html (flagged): the prototype never creates
 * off-list genres. Standing decision #3 (the three-tier taxonomy) mandates the personal escape, so
 * it's built here per the prompt; the prototype simply predates it.
 *
 * Portalled to document.body inside a .t-f12 wrapper (tokens resolve; the pane's clip can't reach
 * it), positioned via useFixedMenu. Consumed by the agent + manuscript genre fields in 3e.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFixedMenu } from "./useFixedMenu";
import {
  CANONICAL_GENRES,
  matchKey,
  resolveGenre,
  genreDisplay,
  normaliseStoredGenre,
  commonGenresFor,
  canonicalGenreById,
  type PersonalGenre,
} from "../../lib/genres";
import "./genrePicker.css";

interface Opt { id: string; label: string; personal: boolean; }

export const GenrePicker: React.FC<{
  /** Stored genre ids (legacy label strings tolerated on the way in). */
  value: string[];
  onChange: (ids: string[]) => void;
  personal?: PersonalGenre[];
  onCreatePersonal: (raw: string) => Promise<{ ok: true; id: string; label: string } | { ok: false; reason: string }>;
  /** true (default) = multi-select (agents); false = single (manuscript primary genre). */
  multi?: boolean;
  /**
   * ⚠️ EXTENDED IN PLACE for the manuscript plate (reframe Phase 4) rather than wrapped or forked —
   * a second picker would fork the personal-genre creation path, which is the one thing this
   * component must stay single-sourced.
   *
   * `cap` — the most genres this field accepts. Absent = no cap (every existing caller). At the cap
   * the picker states the fact and stops adding; it never silently drops a choice.
   */
  cap?: number;
  /**
   * `ageCategory` — when set, the popover offers that category's shortcut pills BEFORE the writer
   * types, and they change with the category. A SHORTCUT, never a constraint: every genre stays
   * reachable by typing, and nothing warns about a choice that is not on the list.
   */
  ageCategory?: string;
  /**
   * `embedded` — render the search field and results INLINE instead of behind a trigger that opens
   * this component's own portalled popover.
   *
   * ⚠️ EXTENDED IN PLACE RATHER THAN FORKED, and this mode is why. The manuscript plate's genre
   * editor is itself a popover; dropping the default shape into it would portal a second popover on
   * top of the first for one control. Every piece of logic below — matching, the ⏎ target, aliases,
   * the personal-genre escape and its guardrails, the cap, the shortcut pills — is shared verbatim;
   * only the shell differs. A second picker would have forked the personal-genre path, which is the
   * one thing this component must keep single-sourced.
   */
  embedded?: boolean;
}> = ({ value, onChange, personal = [], onCreatePersonal, multi = true, cap, ageCategory, embedded = false }) => {
  const [open, setOpen] = useState(false);
  const shown = embedded || open;
  /** The row ⏎/↑↓ will act on. `-1` means "the typed target", which is the pre-existing behaviour. */
  const [hi, setHi] = useState(-1);
  const [q, setQ] = useState("");
  const { triggerRef, menuStyle } = useFixedMenu<HTMLButtonElement>(open);
  const inputRef = useRef<HTMLInputElement>(null);

  const options: Opt[] = useMemo(
    () => [
      ...CANONICAL_GENRES.map((g) => ({ id: g.id, label: g.label, personal: false })),
      ...personal.map((p) => ({ id: p.id, label: p.label, personal: true })),
    ],
    [personal]
  );

  const selectedIds = useMemo(
    () => new Set(value.map((v) => normaliseStoredGenre(v, personal))),
    [value, personal]
  );
  const isOn = (id: string) => selectedIds.has(id);

  const key = matchKey(q);
  // The visible option ⏎ will ring/pick (startsWith beats includes), across ALL options.
  const suggestion = useMemo(() => {
    if (!key) return null;
    return options.find((o) => matchKey(o.label).startsWith(key)) || options.find((o) => matchKey(o.label).includes(key)) || null;
  }, [key, options]);
  const resolution = useMemo(() => (q.trim() ? resolveGenre(q, "preview", personal) : null), [q, personal]);

  // Unifies a visible-list match with an alias-only match (e.g. "litfic") + the new-personal escape.
  const target = suggestion
    ? { id: suggestion.id, label: suggestion.label, kind: "existing" as const }
    : resolution && (resolution.status === "canonical" || resolution.status === "personal")
    ? { id: resolution.id, label: resolution.label, kind: "existing" as const }
    : resolution && resolution.status === "new-personal"
    ? { id: resolution.id, label: resolution.label, kind: "new" as const }
    : null;

  /** The category's shortcut ids, resolved to labels and minus anything already chosen. */
  const shortcuts = useMemo(() => {
    if (!ageCategory) return [] as Opt[];
    return commonGenresFor(ageCategory)
      .filter((id) => !selectedIds.has(id))
      .map((id) => ({ id, label: canonicalGenreById(id)?.label ?? id, personal: false }));
  }, [ageCategory, selectedIds]);

  const visible = useMemo(() => (key ? options.filter((o) => matchKey(o.label).includes(key)) : options), [key, options]);

  useEffect(() => {
    if (shown) { setQ(""); const t = window.setTimeout(() => inputRef.current?.focus(), 0); return () => window.clearTimeout(t); }
  }, [shown]);
  /* A new query invalidates the highlight — index 2 of the old list is not index 2 of the new one. */
  useEffect(() => { setHi(-1); }, [q]);
  useEffect(() => {
    /* ⚠️ EMBEDDED TAKES NO GLOBAL CLOSERS. It has no open/closed state of its own, and an Escape
       listener here would swallow the key from the popover that HOSTS it. */
    if (!open || embedded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent) => { if (!(e.target as Element)?.closest?.(".gp-pop, .gp-trigger")) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);

  const atCap = cap !== undefined && value.length >= cap;

  const toggle = (id: string) => {
    if (multi) {
      if (isOn(id)) { onChange(value.filter((v) => normaliseStoredGenre(v, personal) !== id)); return; }
      /* At the cap, adding is refused rather than silently dropped — the helper line says so. */
      if (atCap) return;
      onChange([...value, id]);
    } else {
      onChange([id]);
      setOpen(false);
    }
  };

  const commit = async () => {
    if (!target) return;
    if (target.kind === "existing") { if (!isOn(target.id)) toggle(target.id); setQ(""); return; }
    const res = await onCreatePersonal(q);
    if (res.ok) { toggle(res.id); setQ(""); }
    // rejected / at-limit surface via the helper line; nothing else to do.
  };

  const helper: React.ReactNode = (() => {
    /* The cap is stated whether or not anything is typed — it is why the next click will do nothing. */
    if (atCap) return <span className="gp-warn">{cap} genres is the most this holds. Remove one to add another.</span>;
    if (!q.trim()) return null;
    if (target?.kind === "existing") return isOn(target.id) ? <><b>{target.label}</b> is already added.</> : <>⏎ adds <b>{target.label}</b>.</>;
    if (target?.kind === "new") return <>⏎ to add “{target.label}” as your own.</>;
    if (resolution?.status === "at-limit") return <span className="gp-warn">{resolution.reason}</span>;
    return <span className="gp-warn">No genre matches “{q.trim()}”.</span>;
  })();

  const chips = value.map((v) => ({ raw: v, label: genreDisplay(v, personal) }));
  const ghost = suggestion && matchKey(suggestion.label).startsWith(key) && q
    ? <><b>{q}</b>{suggestion.label.slice(q.length)}</>
    : null;

  /**
   * The typed span, marked inside the label.
   *
   * ⚠️ MATCHED ON THE LABEL'S OWN TEXT, not on `matchKey`. The key strips punctuation and case so
   * "womens" matches "Women's fiction" — a slice at the key's index would land in the wrong place in
   * the label. When the typed text is not a literal substring (an alias hit like "litfic") there is
   * nothing honest to mark, and the label renders whole.
   */
  const marked = (label: string) => {
    const at = q.trim() ? label.toLowerCase().indexOf(q.trim().toLowerCase()) : -1;
    if (at < 0) return label;
    const end = at + q.trim().length;
    return (
      <>
        {label.slice(0, at)}
        <b className="gp-mark">{label.slice(at, end)}</b>
        {label.slice(end)}
      </>
    );
  };

  const renderOpt = (o: Opt, i = -1) => (
    <button
      key={o.id}
      type="button"
      className={`gp-opt${o.personal ? " personal" : ""}${isOn(o.id) ? " on" : ""}${target && !suggestion && "id" in target && target.id === o.id ? " sug" : ""}${suggestion?.id === o.id ? " sug" : ""}${i >= 0 && i === hi ? " hi" : ""}`}
      onClick={() => toggle(o.id)}
    >
      <span>{marked(o.label)}</span>
      {/*
        ⚠️ THE RIGHT-HAND SLOT CARRIES THE ONLY GROUPING THE TAXONOMY HAS. The ref draws a genre
        "family" there; `CANONICAL_GENRES` has no family dimension and inventing one would be a
        second taxonomy. Personal genres are the one real grouping, so they say so and canonical
        ones render nothing — absence omits its clause rather than filling the slot with a guess.
      */}
      {o.personal && <span className="gp-fam">Yours</span>}
      {isOn(o.id) && <span className="gp-tick" aria-hidden="true">✓</span>}
    </button>
  );

  /**
   * ↑↓ walk the visible list · ⏎ takes the highlight, else the typed target · ⌫ on an EMPTY input
   * removes the last chip. One handler, shared by both shells.
   */
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!visible.length) return;
      const n = visible.length;
      setHi((h) => (((h + (e.key === "ArrowDown" ? 1 : -1)) % n) + n) % n);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      /* The highlight wins when there is one; otherwise the typed target, unchanged. */
      if (hi >= 0 && visible[hi]) { if (!isOn(visible[hi].id)) toggle(visible[hi].id); setQ(""); return; }
      void commit();
      return;
    }
    /* ⚠️ ONLY ON AN EMPTY INPUT. Backspace mid-word must delete a character, not a chip the writer
       was not looking at. */
    if (e.key === "Backspace" && !q && value.length) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  /* The popover's contents — identical in both shells, which is the point of the extension. */
  const panel = (
    <>
      {helper && <div className="gp-note">{helper}</div>}
      {/* Shortcut pills for the chosen age category — only before typing, and never a filter
          on the list below: everything stays reachable. */}
      {!q.trim() && !atCap && shortcuts.length > 0 && (
        <div className="gp-common">
          {ageCategory && <div className="gp-commonlab">Common in {ageCategory}</div>}
          <div className="gp-commonrow">
            {shortcuts.map((o) => (
              <button key={o.id} type="button" className="gp-commonpill" onClick={() => toggle(o.id)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="gp-list">
        {q.trim()
          ? visible.map((o, i) => renderOpt(o, i))
          : (
            <>
              {visible.filter((o) => !o.personal).map((o) => renderOpt(o))}
              {visible.some((o) => o.personal) && <div className="gp-group">Your genres</div>}
              {visible.filter((o) => o.personal).map((o) => renderOpt(o))}
            </>
          )}
        {visible.length === 0 && !target && <div className="gp-empty">Nothing matches — keep typing to add your own.</div>}
      </div>
    </>
  );

  const search = (
    <div className="gp-search">
      <span className="gp-ghost" aria-hidden="true">{ghost}</span>
      <input
        ref={inputRef}
        value={q}
        disabled={atCap}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onSearchKey}
        placeholder={atCap ? `${cap} is the most this holds` : "Search genres…"}
        aria-label="Search genres"
      />
    </div>
  );

  /**
   * ⚠️ EMBEDDED: THE CHIPS SIT INSIDE THE FIELD, not above a trigger. One bordered token field
   * holding the chosen genres and the input is what makes it read as a field rather than as a list
   * with a search box under it.
   */
  if (embedded) {
    return (
      <div className="gp-root gp-embedded">
        <div className="gp-tafield">
          {chips.map((c) => (
            <span key={c.raw} className="gp-pill">
              {c.label}
              <button type="button" aria-label={`Remove ${c.label}`} onClick={() => onChange(value.filter((x) => x !== c.raw))}>✕</button>
            </span>
          ))}
          {search}
        </div>
        {panel}
      </div>
    );
  }

  return (
    <div className="gp-root">
      <div className="gp-chips">
        {chips.map((c) => (
          <span key={c.raw} className="gp-pill">
            {c.label}
            <button type="button" aria-label={`Remove ${c.label}`} onClick={() => onChange(value.filter((x) => x !== c.raw))}>✕</button>
          </span>
        ))}
        <button ref={triggerRef} type="button" className="gp-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
          ＋ {multi || chips.length === 0 ? "Genre" : "Change"}
        </button>
      </div>
      {open && createPortal(
        <div className="t-f12">
          <div className="gp-pop" style={{ ...menuStyle }} role="dialog" aria-label="Choose a genre">
            {search}
            {panel}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
