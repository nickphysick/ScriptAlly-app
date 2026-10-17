/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The comp form (comps v26; ref design-refs/materials/comps-v26-add.html). ONE form for add and
 * edit, inside the comp drawer: one column in three numbered sections, labels that follow the type,
 * and a note on whether a letter can name the comp. (Comps v28: v26's third section, a preview drawn from the
 * library list's own row, is retired with the list; the v28 mock's form has no preview.)
 *
 * The drawer has a head, a scrolling body and a pinned foot, and all three read the form: the head's
 * disc shows the chosen type, the foot's buttons save. So the state is a hook (`useCompForm`) the
 * drawer calls once, and the body and the foot are two components that take it.
 *
 * ⚠️ ONLY THE TITLE IS REQUIRED, AND THE READY NOTE NEVER BLOCKS A SAVE. It says whether a query
 * letter can name the comp yet (`ready()` in lib/compUsage, the one rule); it disables nothing.
 * A year is checked for SHAPE (four digits), never for age.
 *
 * ⚠️ A DUPLICATE IS REPORTED, NEVER REFUSED: "{title} is already on your list", with Show me and
 * Add anyway. Checked when adding only.
 *
 * ⚠️ `matchAxis` STORAGE IS UNCHANGED: the tags joined with " · " (`joinTags`), split on "·".
 *
 * Keys: Enter in a single-line field saves (in the tag input it adds the tag, and saves only when
 * that input is empty); ⌘/Ctrl+Enter saves from anywhere, the note included. Escape is the drawer's,
 * through the escape stack.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CompMedia, CompTitle } from "../../types";
import { CompDraft } from "../../lib/comps";
import { ready } from "../../lib/compUsage";
import { CompKind, kindOf } from "../../lib/compsLibrary";
import { CompExplainer } from "./comps25/CompExplainer";
import { KindIcon } from "./comps25/marks";

/** The four types, in the control's order. Stored in `CompTitle.media`; "book" is the absent default. */
export const MEDIA: { value: CompMedia; label: string }[] = [
  { value: "book", label: "Book" },
  { value: "film", label: "Film" },
  { value: "tv", label: "TV" },
  { value: "other", label: "Other" },
];

/** The second and third fields' labels and placeholders follow the type. The values typed stay. */
export const FIELD_COPY: Record<CompMedia, { who: string; whoEg: string; pub: string; pubEg: string }> = {
  book: { who: "Author", whoEg: "e.g. R. Okafor", pub: "Publisher", pubEg: "e.g. Faber" },
  film: { who: "Director", whoEg: "e.g. Tom Arden", pub: "Studio or distributor", pubEg: "e.g. Film4" },
  tv: { who: "Creator", whoEg: "e.g. Tom Arden", pub: "Network or channel", pubEg: "e.g. BBC Two" },
  other: { who: "Creator", whoEg: "e.g. Tom Arden", pub: "Publisher or platform", pubEg: "e.g. Audible" },
};

export const MAX_TAGS = 6;
export const TAG_SUGGESTIONS = ["Tone", "Setting", "Premise", "Voice", "Readers", "Structure", "Time period"];

export const NEEDS_BOOK = "A letter can only name it once it has a publisher and year. You can still save it without.";
export const NEEDS_SCREEN = "A letter can only name it once it has a year. You can still save it without.";
export const READY_LINE = "Ready to log in a query letter.";

/** A year field's shape: four digits, 1000–2100. Empty is fine — the year is optional. */
export function yearError(raw: string): string | null {
  const y = raw.trim();
  if (!y) return null;
  return /^\d{4}$/.test(y) && +y >= 1000 && +y <= 2100 ? null : "Use four digits, like 2021.";
}

/** Tags are stored joined with " · " in `matchAxis` — the separator `compFacets` splits on. */
export const joinTags = (tags: string[]): string => tags.map((t) => t.trim()).filter(Boolean).join(" · ");
export const splitTags = (axis?: string): string[] => (axis ?? "").split("·").map((t) => t.trim()).filter(Boolean);

/** One more tag: trimmed, commas dropped, no duplicate (ignoring case), at most six. */
export function withTag(tags: readonly string[], raw: string): string[] {
  const t = raw.replace(/,/g, "").trim();
  if (!t || tags.length >= MAX_TAGS || tags.some((x) => x.toLowerCase() === t.toLowerCase())) return [...tags];
  return [...tags, t];
}

export type ReadyState = "idle" | "needs" | "ready";
/** The note's state: `ready()` decides ready; before a title is typed it is quiet. */
export function readyState(d: Pick<CompTitle, "title" | "year" | "media" | "publisher">): ReadyState {
  if (ready(d)) return "ready";
  return d.title.trim() ? "needs" : "idle";
}

interface Fields { title: string; who: string; pub: string; year: string; media: CompMedia; tags: string[]; tagText: string; note: string }
const fieldsOf = (c?: CompTitle): Fields => ({
  title: c?.title ?? "", who: c?.author ?? "", pub: c?.publisher ?? "", year: c?.year != null ? String(c.year) : "",
  media: c?.media ?? "book", tags: splitTags(c?.matchAxis).slice(0, MAX_TAGS), tagText: "", note: c?.note ?? "",
});

export interface CompFormApi {
  mode: "add" | "edit";
  f: Fields;
  set: (patch: Partial<Fields>) => void;
  kind: CompKind;
  /** the comp as it would be saved now (the ready note reads it) */
  draft: CompTitle;
  state: ReadyState;
  hasTitle: boolean;
  yearErr: string | null;
  dupe: { title: string; index: number } | null;
  /** the explainer card is open (add mode only) */
  explain: boolean;
  setExplain: (on: boolean) => void;
  addTag: (raw: string) => void;
  removeTag: (i: number) => void;
  /** save; `again` keeps the drawer open and clears the form (add only) */
  save: (o?: { again?: boolean; force?: boolean }) => void;
  onShowExisting: (index: number) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  yearRef: React.RefObject<HTMLInputElement | null>;
  noteRef: React.RefObject<HTMLTextAreaElement | null>;
  tagRef: React.RefObject<HTMLInputElement | null>;
}

export interface CompFormOptions {
  /** changes whenever the drawer opens on a different thing: the form starts again from `initial` */
  resetKey: string;
  mode: "add" | "edit";
  initial?: CompTitle;
  focusNote?: boolean;
  /** the list, for the duplicate check (add only): title and index */
  existing: { title: string; index: number }[];
  /** the writer has no comps on this manuscript yet: the explainer opens */
  first: boolean;
  onSave: (draft: CompDraft, o: { again: boolean }) => void;
  onShowExisting: (index: number) => void;
  /** after "Add and add another": the drawer scrolls its body back to the top */
  onCleared?: () => void;
}

/** The explainer starts open only for an ADD by a writer with no comps on this manuscript yet. */
export const startsOpen = (o: Pick<CompFormOptions, "mode" | "first">): boolean => o.mode === "add" && o.first;

export function useCompForm(o: CompFormOptions): CompFormApi {
  const [seed, setSeed] = useState(o.resetKey);
  const [f, setF] = useState<Fields>(() => fieldsOf(o.initial));
  const [yearErr, setYearErr] = useState<string | null>(null);
  const [dupe, setDupe] = useState<{ title: string; index: number } | null>(null);
  const [explain, setExplain] = useState(startsOpen(o));
  const [focusTick, setFocusTick] = useState(0);
  /* the drawer opened on something else: start again. Set during render, so no frame shows the old comp's fields. */
  if (seed !== o.resetKey) {
    setSeed(o.resetKey);
    setF(fieldsOf(o.initial));
    setYearErr(null);
    setDupe(null);
    setExplain(startsOpen(o));
    setFocusTick((n) => n + 1);
  }
  const titleRef = useRef<HTMLInputElement | null>(null);
  const yearRef = useRef<HTMLInputElement | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const tagRef = useRef<HTMLInputElement | null>(null);

  const focusNote = !!o.focusNote;
  useEffect(() => {
    /* a frame later: the drawer's body is mounted by then */
    const id = requestAnimationFrame(() => (focusNote ? noteRef.current : titleRef.current)?.focus({ preventScroll: focusNote ? false : true }));
    return () => cancelAnimationFrame(id);
  }, [focusTick, focusNote]);

  const set = useCallback((patch: Partial<Fields>) => {
    setF((x) => ({ ...x, ...patch }));
    if ("title" in patch) setDupe(null);
    if ("year" in patch) setYearErr(null);
  }, []);

  const y = f.year.trim();
  const draft: CompTitle = {
    title: f.title, author: f.who.trim() || undefined, publisher: f.pub.trim() || undefined,
    year: /^\d{4}$/.test(y) ? +y : undefined, media: f.media,
    matchAxis: joinTags(f.tags) || undefined, note: f.note.trim() || undefined,
  };

  const save = (opt: { again?: boolean; force?: boolean } = {}) => {
    const t = f.title.trim();
    if (!t) { titleRef.current?.focus(); return; }
    const ye = yearError(f.year);
    if (ye) { setYearErr(ye); yearRef.current?.focus(); return; }
    if (o.mode === "add" && !opt.force) {
      const hit = o.existing.find((x) => x.title.trim().toLowerCase() === t.toLowerCase());
      if (hit) { setDupe(hit); return; }
    }
    const tags = f.tagText.trim() ? withTag(f.tags, f.tagText) : f.tags;
    const again = o.mode === "add" && !!opt.again;
    o.onSave({
      title: t, author: f.who.trim() || undefined, publisher: f.pub.trim() || undefined, year: y ? +y : undefined,
      media: f.media, matchAxis: joinTags(tags) || undefined, note: f.note.trim() || undefined,
    }, { again });
    if (again) {
      /* the drawer stays open for the next one: every field empty, the type back on Book, the explainer folded */
      setF(fieldsOf(undefined));
      setYearErr(null);
      setDupe(null);
      setExplain(false);
      setFocusTick((n) => n + 1);
      o.onCleared?.();
    }
  };

  return {
    mode: o.mode, f, set, kind: kindOf(draft), draft, state: readyState(draft), hasTitle: !!f.title.trim(), yearErr, dupe,
    explain, setExplain,
    addTag: (raw) => setF((x) => ({ ...x, tags: withTag(x.tags, raw), tagText: "" })),
    removeTag: (i) => setF((x) => ({ ...x, tags: x.tags.filter((_, j) => j !== i) })),
    save, onShowExisting: o.onShowExisting, titleRef, yearRef, noteRef, tagRef,
  };
}

/* ══ the body ═════════════════════════════════════════════════════════════════════════════════ */

const OtherIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 2.8l2.2 4.5 4.9.7-3.6 3.5.9 4.9-4.4-2.3-4.4 2.3.9-4.9L2.9 8l4.9-.7z" />
  </svg>
);
/** The type's mark: the list's own icon for a book, a film and TV; a star for Other (the list draws Other as film). */
export const TypeIcon: React.FC<{ media: CompMedia }> = ({ media }) => (media === "other" ? <OtherIcon /> : <KindIcon kind={media} />);

const SectionHead: React.FC<{ n: number; title: string; tag?: string }> = ({ n, title, tag }) => (
  <p className="cf-sech" data-cf="section-head"><span className="cf-n" aria-hidden="true">{n}</span><span>{title}</span>{tag && <em>{tag}</em>}</p>
);

export const CompFormBody: React.FC<{
  form: CompFormApi;
  first: boolean;
}> = ({ form, first }) => {
  const { f, set, state } = form;
  const copy = FIELD_COPY[f.media];
  const enterSaves = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); form.save(); }
  };
  /* arrow keys move between the types, as a radio group's do */
  const typeKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = MEDIA[(i + d + MEDIA.length) % MEDIA.length];
    set({ media: next.value });
    (e.currentTarget.parentElement?.querySelector(`[data-media="${next.value}"]`) as HTMLElement | null)?.focus();
  };
  const left = TAG_SUGGESTIONS.filter((s) => !f.tags.some((t) => t.toLowerCase() === s.toLowerCase()));
  const full = f.tags.length >= MAX_TAGS;

  return (
    <form
      className="cv-layer cf-body cf" data-cf="form" data-mode={form.mode} noValidate
      onSubmit={(e) => { e.preventDefault(); form.save(); }}
      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.save(); } }}
    >
      {form.mode === "add" && <CompExplainer open={form.explain} first={first} onToggle={form.setExplain} />}

      <section className="cf-sec" data-cf="section" data-section="what">
        <SectionHead n={1} title="What is it?" tag="Only the title is needed now" />
        <div className="cf-type" role="radiogroup" aria-label="Type" data-cf="type">
          {MEDIA.map((m, i) => (
            <button key={m.value} type="button" role="radio" aria-checked={f.media === m.value} tabIndex={f.media === m.value ? 0 : -1}
              data-media={m.value} onClick={() => set({ media: m.value })} onKeyDown={(e) => typeKey(e, i)}>
              <TypeIcon media={m.value} />{m.label}
            </button>
          ))}
        </div>

        <label className="cf-fld" htmlFor="cpv-f-title">
          <span>Title <b className="cf-req" aria-hidden="true">*</b></span>
          <input id="cpv-f-title" className="cf-big" ref={form.titleRef} value={f.title} autoComplete="off" aria-required="true" placeholder="e.g. The Tidewater Line"
            onChange={(e) => set({ title: e.target.value })} onKeyDown={enterSaves} />
        </label>
        {form.dupe && (
          <div className="cf-dupe" data-cf="dupe" role="alert">
            <span><b>{form.dupe.title}</b> is already on your list.</span>
            <button type="button" onClick={() => form.onShowExisting(form.dupe!.index)}>Show me</button>
            <button type="button" onClick={() => form.save({ force: true })}>Add anyway</button>
          </div>
        )}
        <label className="cf-fld" htmlFor="cpv-f-author">
          <span data-cf="label-who">{copy.who}</span>
          <input id="cpv-f-author" value={f.who} autoComplete="off" placeholder={copy.whoEg} onChange={(e) => set({ who: e.target.value })} onKeyDown={enterSaves} />
        </label>
        <div className="cf-pair">
          <label className="cf-fld" htmlFor="cpv-f-pub">
            <span data-cf="label-pub">{copy.pub}</span>
            <input id="cpv-f-pub" value={f.pub} autoComplete="off" placeholder={copy.pubEg} onChange={(e) => set({ pub: e.target.value })} onKeyDown={enterSaves} />
          </label>
          <label className={`cf-fld${form.yearErr ? " is-err" : ""}`} htmlFor="cpv-f-year">
            <span>Year</span>
            <input id="cpv-f-year" ref={form.yearRef} value={f.year} inputMode="numeric" maxLength={4} autoComplete="off"
              aria-invalid={form.yearErr ? true : undefined} aria-describedby={form.yearErr ? "cpv-err-year" : undefined}
              onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} onKeyDown={enterSaves} />
          </label>
        </div>
        {form.yearErr && <p className="cf-err" id="cpv-err-year" data-cf="err-year">{form.yearErr}</p>}

        <div className={`cf-ready is-${state}`} data-cf="ready" data-state={state} role="status">
          <i aria-hidden="true">{state === "ready" ? "✓" : state === "needs" ? "!" : "·"}</i>
          <span>{state === "ready" ? READY_LINE : f.media === "book" ? NEEDS_BOOK : NEEDS_SCREEN}</span>
        </div>
      </section>

      <section className="cf-sec" data-cf="section" data-section="why">
        <SectionHead n={2} title="Why it compares" tag="Optional" />
        <div className="cf-fld">
          <span id="cpv-l-why">What it shares with your book</span>
          <div className="cf-tagbox" data-cf="tagbox" onClick={() => form.tagRef.current?.focus()}>
            {f.tags.map((t, i) => (
              <span key={`${t}-${i}`} className="cf-tg" data-cf="tag">
                {t}<button type="button" aria-label={`Remove ${t}`} onClick={(e) => { e.stopPropagation(); form.removeTag(i); }}>✕</button>
              </span>
            ))}
            <input
              id="cpv-f-tag" ref={form.tagRef} aria-labelledby="cpv-l-why" value={f.tagText} autoComplete="off"
              placeholder={full ? "Six is the most" : "Type a word and press Enter"} disabled={full && !f.tagText}
              onChange={(e) => set({ tagText: e.target.value })}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && !e.metaKey && !e.ctrlKey && f.tagText.trim()) {
                  e.preventDefault(); e.stopPropagation(); form.addTag(f.tagText);
                } else if (e.key === ",") {
                  e.preventDefault();
                } else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault(); form.save();
                } else if (e.key === "Backspace" && !f.tagText && f.tags.length) {
                  form.removeTag(f.tags.length - 1);
                }
              }}
            />
          </div>
        </div>
        {left.length > 0 && (
          <div className="cf-sugg" data-cf="suggestions">
            <span>Try</span>
            {left.map((s) => <button key={s} type="button" data-cf="suggestion" disabled={full} onClick={() => form.addTag(s)}>{s}</button>)}
          </div>
        )}
        <label className="cf-fld" htmlFor="cpv-f-note">
          <span>In your own words</span>
          <textarea id="cpv-f-note" ref={form.noteRef} rows={3} value={f.note}
            placeholder="A line on why an agent should think of this book when they read yours."
            onChange={(e) => set({ note: e.target.value })} />
        </label>
      </section>

    </form>
  );
};

/* ══ the foot ═════════════════════════════════════════════════════════════════════════════════ */

export const CompFormFoot: React.FC<{
  form: CompFormApi;
  onCancel: () => void;
  /** edit only */
  onRemove?: () => void;
  /** why Remove is not offered, or null when it is */
  removeBlocked?: string | null;
}> = ({ form, onCancel, onRemove, removeBlocked }) => (
  <div className="cv-layer cf-foot" data-cf="foot">
    <span data-cf="foot-line">{!form.hasTitle ? "" : form.state === "ready" ? "Ready for a letter." : "Fill in the rest any time."}</span>
    <span className="cf-bt">
      {form.mode === "edit" && (
        <button type="button" className="cf-remove" data-cf="remove" disabled={!!removeBlocked} title={removeBlocked ?? undefined} onClick={onRemove}>Remove</button>
      )}
      <button type="button" className="cv-ghost" data-cf="cancel" onClick={onCancel}>Cancel</button>
      {form.mode === "add" && (
        <button type="button" className="cv-ghost" data-cf="again" disabled={!form.hasTitle} onClick={() => form.save({ again: true })}>Add and add another</button>
      )}
      <button type="button" className="cv-pillbtn" data-cf="save" disabled={!form.hasTitle} onClick={() => form.save()}>
        {form.mode === "edit" ? "Save changes" : "Add comp"}
      </button>
    </span>
  </div>
);
