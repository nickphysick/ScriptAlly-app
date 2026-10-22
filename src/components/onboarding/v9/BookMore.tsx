/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Your book" (onboarding v9, ref-book-more-1440.png, ref-book-checks-1440.png): after the title,
 * the same step shows the book as the dashboard draws it, then asks three things about it.
 *
 * The title page matches the dashboard's header (Dash58Header) in type and spacing. That header
 * could not be reused: it is the whole dashboard header (its three buttons, the page's own h1) and
 * its rules read tokens declared on the dashboard's root. The numbers below are its own.
 *
 * The three fields are STRUCTURED, never free text:
 *   · Genre: one or more from the fixed list, with one primary. Pills, and a search that offers
 *     only list items. Nothing outside the list can be entered.
 *   · Age category: one of the shared list, each with a note saying what it means.
 *   · Word count: optional; digits only; 1,000 to 500,000.
 */
import { normaliseAgeCategory } from "../../../lib/ageCategories";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AGE_CATEGORIES } from "../../../lib/manuscripts";
import { BackLink, StepFoot, FieldError } from "../setupParts";
import type { ManuscriptFieldsState } from "../ManuscriptFields";
import {
  BOOK_EYEBROW, bookByline, BOOK_CARD_H, BOOK_CARD_SUB, GENRE_LABEL, GENRE_HELPER, GENRE_SEARCH, GENRE_SEARCH_FOOT,
  AGE_LABEL, AGE_NOTES, ageNoteEyebrow, WORDS_LABEL, WORDS_PLACEHOLDER, WORDS_HELPER, GENRE_PILLS,
  pressGenre, addGenre, searchGenreList, readWordCount, cleanWordCount,
} from "../../../lib/onboardingV9";
import { GENRE_LIST, pillLabel, toStoredGenres, fromStoredGenres } from "../../../lib/onboardingGenres";
import { useTypewriter, TypedLine } from "./Typewriter";
import "./onbV9.css";

export interface BookMoreProps {
  title: string;
  /** the account's display name, for the byline */
  name?: string | null;
  initial: ManuscriptFieldsState;
  error?: string | null;
  onBack: () => void;
  onContinue: (fields: ManuscriptFieldsState) => void | Promise<void>;
}

export const BookMore: React.FC<BookMoreProps> = ({ title, name, initial, error, onBack, onContinue }) => {
  const type = useTypewriter([title], { startDelay: 350 });
  const byline = bookByline(name);
  const [picked, setPicked] = useState<string[]>(() => fromStoredGenres(initial.genre, initial.subGenres));
  const [age, setAge] = useState<string>(normaliseAgeCategory(initial.ageCategory) ?? "");
  const [words, setWords] = useState(initial.wordCount);
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchBox = useRef<HTMLDivElement>(null);

  /* the pills: the nine, then anything picked from the search that is not one of them */
  const pills = useMemo(() => [...GENRE_PILLS, ...picked.filter((g) => !GENRE_PILLS.includes(g))], [picked]);
  const hits = useMemo(() => searchGenreList(GENRE_LIST, typed, picked), [typed, picked]);
  const count = readWordCount(words);
  const ready = picked.length > 0 && !count.error && !saving;

  /* the search's list closes on a press outside it, and on Escape */
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!searchBox.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const pickFromSearch = (id: string) => { setPicked((p) => addGenre(p, id)); setTyped(""); setOpen(false); };
  const go = () => {
    if (!ready) return;
    const { genre, subGenres } = toStoredGenres(picked);
    setSaving(true);
    void Promise.resolve(onContinue({
      ...initial, title, genre, subGenres, ageCategory: age,
      wordCount: count.value === null ? "" : String(count.value),
    })).finally(() => setSaving(false));
  };

  return (
    <div className="o9-solo" data-screen="bookmore">
      <header className="o9-bookhead" data-o9="bookhead">
        <p className="o9-bookeye o9-rise" data-o9="book-eyebrow">{BOOK_EYEBROW}</p>
        <TypedLine as="h1" runs={[{ text: title }]} from={0} shown={type.shown} className="o9-booktitle" />
        {byline && (
          <p className={`o9-byline o9-late${type.done ? " is-rise" : ""}`} data-o9="byline"><span>{byline}</span></p>
        )}
      </header>

      <section
        className={`sf-card sf-stepcard o9-late${type.done ? " is-in" : ""}`} data-o9="book-card" data-typed={type.shown} data-total={type.total}
        aria-hidden={type.done ? undefined : true} inert={!type.done}
      >
        <h2 className="sf-h">{BOOK_CARD_H}</h2>
        <p className="o9-small o9-cardsub">{BOOK_CARD_SUB}</p>
        <div className="o9-fields">
          {/* ── Genre ── */}
          <div className="o9-fld" data-o9="genre">
            <span className="sf-lab" id="o9-genre-l">{GENRE_LABEL}</span>
            <p className="o9-small o9-fldhelp">{GENRE_HELPER}</p>
            <div className="o9-pills" role="listbox" aria-multiselectable="true" aria-labelledby="o9-genre-l">
              {pills.map((id) => {
                const on = picked.includes(id), primary = picked[0] === id;
                return (
                  <button
                    key={id} type="button" role="option" aria-selected={on} data-genre={id} data-primary={primary || undefined}
                    className={`o9-pill${on ? " is-on" : ""}${primary ? " is-primary" : ""}`}
                    onClick={() => setPicked((p) => pressGenre(p, id))}
                  >
                    {on && <span className="o9-pilltick" aria-hidden="true">✓</span>}
                    {pillLabel(id)}
                    {primary && <span className="o9-pilltag">Primary</span>}
                  </button>
                );
              })}
            </div>
            <p className="o9-gsum" data-o9="genre-line" aria-live="polite">
              <span>Primary: <b>{picked.length ? pillLabel(picked[0]) : "none yet"}</b></span>
              {picked.length > 1 && <span>Also: <b>{picked.slice(1).map(pillLabel).join(", ")}</b></span>}
            </p>
            <div className={`o9-search${open && typed.trim() ? " is-open" : ""}`} ref={searchBox} data-o9="genre-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input
                type="text" value={typed} placeholder={GENRE_SEARCH} aria-label="Search all genres" autoComplete="off"
                role="combobox" aria-expanded={open && typed.trim().length > 0} aria-controls="o9-genre-drop"
                onChange={(e) => { setTyped(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setOpen(false); }
                  /* Enter takes the first match; with no match it adds nothing */
                  if (e.key === "Enter") { e.preventDefault(); if (hits[0]) pickFromSearch(hits[0].id); }
                }}
              />
              {open && typed.trim() && (
                <div className="o9-drop" id="o9-genre-drop" role="listbox" data-o9="genre-drop">
                  {hits.map((h) => (
                    <button key={h.id} type="button" role="option" aria-selected={false} data-genre={h.id} onClick={() => pickFromSearch(h.id)}>
                      {h.label.slice(0, h.start)}<b>{h.label.slice(h.start, h.start + h.length)}</b>{h.label.slice(h.start + h.length)}
                    </button>
                  ))}
                  <p className="o9-dropfoot">{GENRE_SEARCH_FOOT}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Age category ── */}
          <div className="o9-fld" data-o9="age">
            <span className="sf-lab" id="o9-age-l">{AGE_LABEL}</span>
            <div className="o9-pills o9-pills--seg" role="radiogroup" aria-labelledby="o9-age-l">
              {AGE_CATEGORIES.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={age === a} className={`o9-pill${age === a ? " is-pick" : ""}`} onClick={() => setAge(a)}>{a}</button>
              ))}
            </div>
            {age && AGE_NOTES[age] && (
              <div className="o9-desc" key={age} data-o9="age-note">
                <span className="o9-desceye">{ageNoteEyebrow(age)}</span>
                <p>{AGE_NOTES[age].map((r, i) => (r.em ? <i key={i}>{r.text}</i> : <React.Fragment key={i}>{r.text}</React.Fragment>))}</p>
              </div>
            )}
          </div>

          {/* ── Word count ── */}
          <div className={`o9-fld o9-fld--words sf-field${count.error ? " is-bad" : ""}`} data-o9="words">
            <label className="sf-lab" htmlFor="o9-words">{WORDS_LABEL} <span className="sf-labq">· optional</span></label>
            <div className="sf-inwrap">
              <input
                id="o9-words" className="sf-in" type="text" inputMode="numeric" value={words} placeholder={WORDS_PLACEHOLDER}
                aria-invalid={!!count.error} aria-describedby="o9-words-help"
                onChange={(e) => setWords(cleanWordCount(e.target.value))}
              />
            </div>
            {count.error
              ? <p className="sf-err" id="o9-words-help" role="alert" data-o9="words-error">{count.error}</p>
              : <p className="o9-small o9-fldhelp" id="o9-words-help">{WORDS_HELPER}</p>}
          </div>
        </div>
        {error && <FieldError>{error}</FieldError>}
        <StepFoot left={<BackLink onClick={onBack} />}>
          <button type="button" className="sf-btn" disabled={!ready} onClick={go} data-act="continue">Continue</button>
        </StepFoot>
      </section>
    </div>
  );
};
