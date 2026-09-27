/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CompForm — add or edit one comp, inline, in the list's place (comps v2; the mock's `.cform`).
 *
 * ⚠️ PRESENCE-ONLY ON TITLE, AND A YEAR IS CHECKED FOR SHAPE, NEVER FOR AGE. Blocking a save
 * because a year is old would be the page appraising through the back door.
 *
 * ⚠️ A DUPLICATE IS REPORTED, NEVER REFUSED — "{title} is already on your list" with Show me and
 * Add anyway. The writer may have a reason; the app states the collision and offers both outs. It
 * is checked when ADDING only (the mock's rule): an edit is already one of the list's entries.
 *
 * Keys: Enter saves from any single-line field except the tags (where it adds a tag, and saves
 * only when the tag field is empty); ⌘/Ctrl+Enter saves from anywhere, the note included; Esc
 * cancels. Focus goes back to whatever opened the form — the caller's job, since it knows.
 */
import React, { useEffect, useRef, useState } from "react";
import { CompMedia, CompTitle } from "../../types";
import { CompDraft } from "../../lib/comps";

const MEDIA: { value: CompMedia; label: string }[] = [
  { value: "book", label: "Book" },
  { value: "film", label: "Film" },
  { value: "tv", label: "TV" },
  { value: "other", label: "Other" },
];

/** A year field's shape: four digits, 1000–2100. Empty is fine — the year is optional. */
export function yearError(raw: string): string | null {
  const y = raw.trim();
  if (!y) return null;
  return /^\d{4}$/.test(y) && +y >= 1000 && +y <= 2100 ? null : "Use four digits, like 2021.";
}

/** Tags are stored joined with " · " in `matchAxis` — the separator `compFacets` splits on. */
export const joinTags = (tags: string[]): string => tags.map((t) => t.trim()).filter(Boolean).join(" · ");
export const splitTags = (axis?: string): string[] => (axis ?? "").split("·").map((t) => t.trim()).filter(Boolean);

export interface CompFormProps {
  mode: "add" | "edit";
  initial?: CompTitle;
  /** Focus the note rather than the title (the card's "Add a note"). */
  focusNote?: boolean;
  /** The list, for the duplicate check (add only): title and index. */
  existing: { title: string; index: number }[];
  onSave: (draft: CompDraft) => void;
  onCancel: () => void;
  /** Show me: close the form and point at the comp already holding the title. */
  onShowExisting: (index: number) => void;
}

export const CompForm: React.FC<CompFormProps> = ({ mode, initial, focusNote, existing, onSave, onCancel, onShowExisting }) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [publisher, setPublisher] = useState(initial?.publisher ?? "");
  const [year, setYear] = useState(initial?.year != null ? String(initial.year) : "");
  const [media, setMedia] = useState<CompMedia>(initial?.media ?? "book");
  const [tags, setTags] = useState<string[]>(splitTags(initial?.matchAxis));
  const [tagText, setTagText] = useState("");
  const [note, setNote] = useState(initial?.note ?? "");
  const [titleErr, setTitleErr] = useState<string | null>(null);
  const [yearErr, setYearErr] = useState<string | null>(null);
  const [dupe, setDupe] = useState<{ title: string; index: number } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const dupeShowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (focusNote ? noteRef.current : titleRef.current)?.focus({ preventScroll: false });
  }, [focusNote]);
  useEffect(() => { if (dupe) dupeShowRef.current?.focus(); }, [dupe]);

  const addTag = (raw: string) => {
    const t = raw.replace(/,/g, "").trim();
    if (t) setTags((x) => [...x, t]);
    setTagText("");
  };

  const save = (force = false) => {
    const t = title.trim();
    if (!t) { setTitleErr("Add a title to save this comp."); titleRef.current?.focus(); return; }
    setTitleErr(null);
    const ye = yearError(year);
    if (ye) { setYearErr(ye); yearRef.current?.focus(); return; }
    setYearErr(null);
    if (mode === "add" && !force) {
      const hit = existing.find((o) => o.title.trim().toLowerCase() === t.toLowerCase());
      if (hit) { setDupe(hit); return; }
    }
    const allTags = tagText.trim() ? [...tags, tagText.replace(/,/g, "").trim()] : tags;
    const y = year.trim();
    onSave({
      title: t,
      author: author.trim() || undefined,
      publisher: publisher.trim() || undefined,
      year: y ? +y : undefined,
      media,
      matchAxis: joinTags(allTags) || undefined,
      note: note.trim() || undefined,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
  };
  /* Enter on a single-line field (not the tags) saves */
  const enterSaves = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); save(); }
  };

  return (
    <form
      className="cpv-form"
      data-cpv="form"
      noValidate
      onKeyDown={onKeyDown}
      onSubmit={(e) => { e.preventDefault(); save(); }}
    >
      <div className="cpv-fh">
        <b>{mode === "edit" ? "Edit comp" : "Add a comp"}</b>
        <span className="cpv-keys">Enter to save · Esc to cancel</span>
      </div>
      <div className="cpv-fgrid">
        <div className="cpv-f">
          <label htmlFor="cpv-f-title">Title <span className="req">*</span></label>
          <input id="cpv-f-title" ref={titleRef} value={title} autoComplete="off" aria-required="true"
                 aria-invalid={titleErr ? true : undefined} aria-describedby={titleErr ? "cpv-err-title" : undefined}
                 onChange={(e) => { setTitle(e.target.value); setTitleErr(null); setDupe(null); }} onKeyDown={enterSaves} />
          {titleErr && <span className="err" id="cpv-err-title" data-cpv="err-title">{titleErr}</span>}
        </div>
        <div className="cpv-f">
          <label htmlFor="cpv-f-author">Author or creator</label>
          <input id="cpv-f-author" value={author} autoComplete="off" onChange={(e) => setAuthor(e.target.value)} onKeyDown={enterSaves} />
        </div>
        <div className="cpv-f">
          <label htmlFor="cpv-f-pub">Publisher or network</label>
          <input id="cpv-f-pub" value={publisher} autoComplete="off" onChange={(e) => setPublisher(e.target.value)} onKeyDown={enterSaves} />
        </div>
        <div className="cpv-f">
          <label htmlFor="cpv-f-year">Year</label>
          <input id="cpv-f-year" ref={yearRef} value={year} inputMode="numeric" maxLength={4} autoComplete="off"
                 aria-invalid={yearErr ? true : undefined} aria-describedby={yearErr ? "cpv-err-year" : undefined}
                 onChange={(e) => { setYear(e.target.value); setYearErr(null); }} onKeyDown={enterSaves} />
          {yearErr && <span className="err" id="cpv-err-year" data-cpv="err-year">{yearErr}</span>}
        </div>
      </div>
      <div className="cpv-mrow">
        <span className="cpv-lbl">Type</span>
        <div className="cpv-seg" role="radiogroup" aria-label="Type">
          {MEDIA.map((m) => (
            <button key={m.value} type="button" role="radio" aria-checked={media === m.value} data-media={m.value}
                    onClick={() => setMedia(m.value)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="cpv-fgrid2">
        <div className="cpv-f">
          <span className="fl" id="cpv-l-why">Why it compares</span>
          <div className="cpv-chipin">
            {tags.map((t, i) => (
              <span key={`${t}-${i}`} className="cpv-facet" data-cpv="tag">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags((x) => x.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
            <input
              id="cpv-f-tag"
              aria-labelledby="cpv-l-why"
              value={tagText}
              autoComplete="off"
              placeholder={tags.length ? "" : "e.g. single day, coastal setting"}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && !e.metaKey && !e.ctrlKey && tagText.trim()) {
                  e.preventDefault(); e.stopPropagation(); addTag(tagText);
                } else if (e.key === ",") {
                  e.preventDefault();
                } else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault(); save();
                } else if (e.key === "Backspace" && !tagText && tags.length) {
                  setTags((x) => x.slice(0, -1));
                }
              }}
            />
          </div>
          <span className="hint">Short tags. Press Enter or comma after each.</span>
        </div>
        <div className="cpv-f">
          <label htmlFor="cpv-f-note">Your note</label>
          <textarea id="cpv-f-note" ref={noteRef} rows={3} value={note}
                    placeholder="In your own words, what this shares with your book"
                    onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      {dupe && (
        <div className="cpv-dupe" data-cpv="dupe" role="alert">
          <span><b>{dupe.title}</b> is already on your list.</span>
          <button type="button" className="cpv-mini" ref={dupeShowRef} onClick={() => onShowExisting(dupe.index)}>Show me</button>
          <button type="button" className="cpv-mini" onClick={() => save(true)}>Add anyway</button>
        </div>
      )}
      <div className="cpv-ff">
        <span className="hint">Only the title is needed. You can fill in the rest later.</span>
        <span className="btns">
          <button type="button" className="cpv-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="cpv-btn cpv-btn--dark" data-cpv="save">{mode === "edit" ? "Save changes" : "Add comp"}</button>
        </span>
      </div>
    </form>
  );
};
