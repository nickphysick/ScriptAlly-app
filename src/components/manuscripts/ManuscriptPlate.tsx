/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The white plateband — the head of the manuscript card, and the form.
 * References: design-refs/manuscripts-plate.html `.plateband`, restyled to variant D plain by
 * design-refs/manuscript-plate-inputs.html, whose inline editors this builds.
 *
 * ⚠️ THE PLATE IS THE FORM — there is no "Edit details" button on it any more. Title, word count and
 * genre edit where they are rendered; the logline edits on the pitch shelf, which is its home.
 *
 * ⚠️ ONE STANDING GRAMMAR for all three, stated in plateEdit.ts and obeyed here: hover reveals the
 * affordance, click opens it seeded and selected, Enter saves, Escape cancels and restores the
 * stored value, a brief mono "Saved" confirms.
 *
 * ⚠️ EDITING IS OPT-IN. Without the `edit` prop this renders exactly as it always did — read-only,
 * props-only, assertable in a spec against `plateStats` rather than against a mock database. The two
 * modes are both locked, so a caller cannot lose the editors by accident or gain them by surprise.
 *
 * ⚠️ ABSENCE OMITS ITSELF. No logline → the line is not rendered (never placeholder prose about
 * adding one). No genres → no pills. No queries → the two counts read `0`, which is TRUE, while last
 * activity reads `—`, because there is no date and a `0` there would assert an event that never
 * happened. The split lives in `plateStatCells`, so every caller resolves absence the same way.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlateStats, plateStatCells } from "../../lib/manuscriptPlate";
import { AGE_CATEGORIES } from "../../lib/manuscripts";
import { genreDisplay, type PersonalGenre } from "../../lib/genres";
import { GenrePicker } from "../forms";
import { useFixedMenu } from "../forms/useFixedMenu";
import { placeMenu } from "../../lib/todoMenu";
import {
  SAVED_RECEIPT,
  SAVED_RECEIPT_MS,
  WORD_STEP,
  WORD_COUNT_REJECTED,
  WORD_COUNT_HINT_LINE,
  isRejectedKey,
  parseWordCount,
  stepWordCount,
  MAX_MANUSCRIPT_GENRES,
  themeClassOf,
} from "./plateEdit";
import manuscriptIcon from "../../assets/shell/manuscript-icon.png";
import "./manuscriptPlate.css";

/** Everything the plate needs to BE the form. Absent → the plate is read-only. */
export interface ManuscriptPlateEdit {
  onTitle: (title: string) => void;
  onWordCount: (words: number) => void;
  /** The logline is a pitch-shelf asset — this jumps to it rather than editing here. One home each. */
  onLogline: () => void;
  genre: {
    ageCategory: string;
    /** Stored ids, primary first. */
    ids: string[];
    personal: PersonalGenre[];
    onCreatePersonal: (raw: string) => Promise<{ ok: true; id: string; label: string } | { ok: false; reason: string }>;
    onSave: (next: { ageCategory: string; ids: string[] }) => void;
  };
}

export interface ManuscriptPlateProps {
  title: string;
  /** Already resolved for presentation — "Shelved" when shelved, else the workflow status. */
  status: string;
  /** Greys the status pill, and (with `canSendQuery`) is why a shelved book offers no Send. */
  shelved?: boolean;
  genres?: string[];
  wordCount?: number;
  logline?: string;
  stats: PlateStats;
  onSendQuery?: () => void;
  edit?: ManuscriptPlateEdit;
  /**
   * ⚠️ THE LIFECYCLE MENU'S HOME, and now the ONLY home for the fields with no inline editor.
   * Shelve, reactivate and the guarded delete have no other surface on this page — and since
   * "Edit details" left the plate, status, shelved reason and notes reach their form through here
   * too. Dropping it to match a mockup would be a functional regression wearing a design decision's
   * clothes; the Agents page keeps its ⋯ for the same reason.
   */
  lifecycle?: React.ReactNode;
}

export const ManuscriptPlate: React.FC<ManuscriptPlateProps> = ({
  title,
  status,
  shelved = false,
  genres = [],
  wordCount,
  logline,
  stats,
  onSendQuery,
  edit,
  lifecycle,
}) => {
  const [open, setOpen] = useState<"title" | "words" | "genre" | null>(null);
  const [receipt, setReceipt] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [wordDraft, setWordDraft] = useState("");
  const [wordError, setWordError] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const wordRef = useRef<HTMLInputElement>(null);
  const genreAnchor = useRef<HTMLSpanElement>(null);
  const genrePopRef = useRef<HTMLDivElement>(null);
  /**
   * ⚠️ THE GENRE POPOVER IS BUFFERED — Cancel discards and Done commits both fields in ONE write.
   * A draft is the only way `Cancel` can mean anything: saving on each change would leave nothing
   * to cancel back to.
   */
  const [genreDraft, setGenreDraft] = useState<{ ageCategory: string; ids: string[] } | null>(null);
  const [genrePos, setGenrePos] = useState<{ left: number; top: number } | null>(null);
  /**
   * ⚠️ THE PORTAL'S THEME CLASS. Both popovers render into `document.body`, and every `--msv-*` is
   * declared on a DESCENDANT selector (`.t-capp .msv1` …) — so without a theme class on the wrapper
   * the tokens resolve to nothing and the popovers have no fill and no border. Read from the plate
   * itself so it reflects the theme this plate is actually in.
   */
  const [portalClass, setPortalClass] = useState("msv1 msv-portal");
  const bandRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const t = themeClassOf(bandRef.current);
    setPortalClass(`${t ? t + " " : ""}msv1 msv-portal`);
  }, [open]);
  const { triggerRef: wordTrigger, menuStyle: wordMenu } = useFixedMenu<HTMLButtonElement>(open === "words");

  /** The receipt is the only thing that says a write happened; it clears itself. */
  const confirm = () => setReceipt(true);
  useEffect(() => {
    if (!receipt) return;
    const t = window.setTimeout(() => setReceipt(false), SAVED_RECEIPT_MS);
    return () => window.clearTimeout(t);
  }, [receipt]);

  /* Seeded AND selected — a click that only seeds makes the writer clear the field themselves. */
  useEffect(() => {
    if (open === "title") { titleRef.current?.focus(); titleRef.current?.select(); }
    if (open === "words") { wordRef.current?.focus(); wordRef.current?.select(); }
  }, [open]);

  const close = () => { setOpen(null); setWordError(false); setGenreDraft(null); setGenrePos(null); };

  const openGenre = () => {
    if (!edit) return;
    setGenreDraft({ ageCategory: edit.genre.ageCategory, ids: edit.genre.ids });
    setOpen("genre");
  };
  const saveGenre = () => {
    if (!edit || !genreDraft) return;
    const changed =
      genreDraft.ageCategory !== edit.genre.ageCategory ||
      genreDraft.ids.join("\u0000") !== edit.genre.ids.join("\u0000");
    if (changed) { edit.genre.onSave(genreDraft); confirm(); }
    close();
  };

  /**
   * ⚠️ PLACED BY THE SHARED `placeMenu`, the same pure function `PortalMenu` uses — including its
   * flip at the viewport's bottom edge. `PortalMenu` itself renders a `MenuGroup[]` of
   * `role="menuitem"` buttons and has no slot for a token field, so the COMPONENT cannot host this;
   * its placement is the part that is genuinely shared, and this is that part.
   */
  useLayoutEffect(() => {
    if (open !== "genre") return;
    const place = () => {
      const el = genrePopRef.current;
      const anchor = genreAnchor.current;
      if (!el || !anchor) return;
      const r = anchor.getBoundingClientRect();
      /* ⚠️ A ZERO RECT MEANS THE ANCHOR HAS NO BOX, and placing against it lands the popover in the
         window's top-left corner. That is exactly what `display: contents` on the pill group did —
         it generates no box, so `getBoundingClientRect()` returned all zeros. Bailing out is better
         than placing something at 0,0 over the nav. */
      if (r.width === 0 && r.height === 0) return;
      /* 8px below the trigger, LEFT-ALIGNED to it, flipped above when the bottom would overflow and
         clamped so it never crosses a viewport edge — all from the shared `placeMenu`. */
      const p = placeMenu(r, { w: el.offsetWidth, h: el.offsetHeight },
        { w: window.innerWidth, h: window.innerHeight }, 8, "left");
      setGenrePos({ left: p.left, top: p.top });
    };
    place();
    /* ⚠️ REPOSITION RATHER THAN CLOSE, deliberately. This popover holds a buffered draft; closing it
       on a scroll would discard an edit the writer did not ask to abandon. Capture phase because the
       pane scrolls, not the window, and scroll events do not bubble. */
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, genreDraft]);

  const openTitle = () => { if (!edit) return; setTitleDraft(title); setOpen("title"); };
  const saveTitle = () => {
    if (!edit) return;
    const next = titleDraft.trim();
    /* An empty title is not a title. Escape's job is to cancel; this is not a second way to do it. */
    if (next && next !== title) { edit.onTitle(next); confirm(); }
    close();
  };

  const openWords = () => { if (!edit) return; setWordDraft(String(wordCount ?? 0)); setWordError(false); setOpen("words"); };
  /* ⚠️ CANCEL RESTORES, it does not merely close — leaving the draft behind would mean the next
     open showed an abandoned edit as if it were the stored value. */
  const cancelWords = () => { setWordDraft(String(wordCount ?? 0)); close(); };
  const step = (delta: number) => {
    /* ⚠️ A BLANK FIELD STEPS FROM THE STORED VALUE, NOT FROM ZERO. Clearing the box to retype is a
       normal thing to do half-way through; stepping from 0 there would silently discard the number
       the writer is editing. */
    const from = parseWordCount(wordDraft) ?? wordCount ?? 0;
    setWordDraft(String(stepWordCount(from, delta)));
    setWordError(false);
  };
  const saveWords = () => {
    if (!edit) return;
    const n = parseWordCount(wordDraft);
    if (n === null) { setWordError(true); return; }   // stays open; nothing is written
    if (n !== wordCount) { edit.onWordCount(n); confirm(); }
    close();
  };

  /** Escape cancels and restores, everywhere, without writing. */
  const onKey = (e: React.KeyboardEvent, save: () => void) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
  };

  const genreLabels = edit
    ? edit.genre.ids.map((id) => genreDisplay(id, edit.genre.personal))
    : genres;
  const pills = edit ? [edit.genre.ageCategory, ...genreLabels].filter(Boolean) : genres;

  return (
    <div className="msv-plateband" ref={bandRef}>
      {/*
        ⚠️ THE PLATE MARK IS THE DASHBOARD'S PNG, IMPORTED — not a traced SVG sibling of the four in
        manuscriptMarks.tsx. `OneScreenAuthor` already renders this exact asset the same way
        (contained, no blend mode). One asset, one home.
      */}
      <div className="msv-plateimg">
        <img src={manuscriptIcon} alt="" />
      </div>

      <div className="msv-plateid">
        <span className={`msv-statuspill${shelved ? " grey" : ""}`}>
          <span className="msv-dt" />
          {status}
        </span>

        {open === "title" && edit ? (
          <input
            ref={titleRef}
            className="msv-platetitle msv-titleinput"
            value={titleDraft}
            aria-label="Title"
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => onKey(e, saveTitle)}
            onBlur={saveTitle}
          />
        ) : (
          <h2
            className={`msv-platetitle${edit ? " editable" : ""}`}
            onClick={openTitle}
            {...(edit ? { role: "button", tabIndex: 0, "aria-label": `Edit title — ${title}`,
                          onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") openTitle(); } } : {})}
          >
            {title}
          </h2>
        )}

        <div className="msv-platemeta">
          {/* One anchor around the pills — the popover hangs off the group, not off whichever pill
              happened to be clicked. */}
          <span className="msv-genreanchor" ref={genreAnchor}>
            {pills.map((g) => (
              <span
                key={g}
                className={`msv-gp${edit ? " editable" : ""}`}
                onClick={() => edit && (open === "genre" ? close() : openGenre())}
              >
                {g}
              </span>
            ))}
          </span>
          {wordCount !== undefined && (
            edit ? (
              <button
                ref={wordTrigger}
                type="button"
                className="msv-wc editable"
                aria-label={`Edit word count — ${wordCount.toLocaleString("en-GB")} words`}
                aria-expanded={open === "words"}
                onClick={() => (open === "words" ? close() : openWords())}
              >
                {wordCount.toLocaleString("en-GB")} words
              </button>
            ) : (
              <span className="msv-wc">{wordCount.toLocaleString("en-GB")} words</span>
            )
          )}
          {receipt && <span className="msv-receipt" role="status">{SAVED_RECEIPT}</span>}
        </div>

        {/*
          ⚠️ A POPOVER, NOT AN INLINE ROW. The inline bar reflowed the plateband and pushed the
          logline down every time it opened; this floats over the plate and moves nothing. Placement
          is the SHARED `placeMenu` — the same pure function `PortalMenu` positions with, including
          its flip at the viewport's bottom edge.

          ⚠️ AND IT IS BUFFERED. Cancel discards; Done commits BOTH fields in one write. The two
          columns are what tell age category from genre — never chip colour, which is the specific
          failure this replaces.
        */}
        {open === "genre" && edit && genreDraft && createPortal(
          <div className={portalClass}>
            <div
              ref={genrePopRef}
              className="msv-genrepop"
              style={genrePos ? { left: genrePos.left, top: genrePos.top } : { left: 0, top: 0, visibility: "hidden" }}
              role="dialog"
              aria-label="Age category and genre"
            >
              <div className="msv-gcols">
                <div className="msv-gcolL">
                  <div className="msv-glab">Age category</div>
                  <div role="radiogroup" aria-label="Age category">
                    {AGE_CATEGORIES.map((a) => (
                      <button
                        key={a}
                        type="button"
                        role="radio"
                        aria-checked={a === genreDraft.ageCategory}
                        className={`msv-agerow${a === genreDraft.ageCategory ? " on" : ""}`}
                        onClick={() => setGenreDraft({ ...genreDraft, ageCategory: a })}
                      >
                        <span className="msv-agebar" aria-hidden="true" />
                        {a}
                        <span className="msv-agetick" aria-hidden="true">✓</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="msv-gcolR">
                  <div className="msv-glab">
                    Genre <span className="msv-glabsub">— up to {MAX_MANUSCRIPT_GENRES}</span>
                  </div>
                  {/* The shared picker, in its embedded shell — one component, one taxonomy, one
                      personal-genre path. */}
                  <GenrePicker
                    embedded
                    value={genreDraft.ids}
                    onChange={(ids) => setGenreDraft({ ...genreDraft, ids })}
                    personal={edit.genre.personal}
                    onCreatePersonal={edit.genre.onCreatePersonal}
                    cap={MAX_MANUSCRIPT_GENRES}
                    ageCategory={genreDraft.ageCategory}
                  />
                </div>
              </div>
              <div className="msv-gfoot">
                <button type="button" className="msv-btn sm" onClick={close}>Cancel</button>
                <button type="button" className="msv-btn sm msv-primary" onClick={saveGenre}>Done</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* No logline → nothing. A prompt to write one belongs on the pitch shelf, which owns it. */}
        {logline ? (
          edit ? (
            <button type="button" className="msv-platelog editable" onClick={edit.onLogline}>
              {logline}
            </button>
          ) : (
            <div className="msv-platelog">{logline}</div>
          )
        ) : null}
      </div>

      <div className="msv-plateside">
        <div className="msv-statstrip">
          {plateStatCells(stats).map((cell) => (
            <div key={cell.key} className="msv-stat">
              <div className="msv-statn">{cell.value}</div>
              <div className="msv-statk">{cell.key}</div>
            </div>
          ))}
        </div>
        <div className="msv-plateacts">
          {/* A shelved manuscript offers no Send — the same rule the plate list already applies. */}
          {!shelved && (
            <button type="button" className="msv-btn sm msv-primary" onClick={onSendQuery}>
              Send a query
            </button>
          )}
          {lifecycle}
        </div>
      </div>

      {open === "words" && edit && createPortal(
        <div className={portalClass}>
          <div className="msv-wordpop" style={{ ...wordMenu }} role="dialog" aria-label="Word count">
            <div className="msv-wordlab">Word count</div>
            {/*
              ⚠️ ONE BORDERED BOX HOLDS ALL OF IT, and the focus ring is on the BOX rather than the
              bare input — three loose controls in a row read as three controls, not as one field.
              The stacked ▲▼ column sits inside the same border behind a divider.
            */}
            <div className="msv-stepper">
              <input
                ref={wordRef}
                className="msv-stepinput"
                value={wordDraft}
                inputMode="numeric"
                aria-label="Word count"
                onChange={(e) => { setWordDraft(e.target.value); setWordError(false); }}
                onKeyDown={(e) => {
                  /* ⚠️ REJECTED AT THE KEYSTROKE, not at save. `e E + - .` are all valid to a numeric
                     field and none is valid as a word count; the note says which. */
                  if (isRejectedKey(e.key)) { e.preventDefault(); setWordError(true); return; }
                  /* ↑ ↓ step from the CURRENT value, exactly as the buttons do. */
                  if (e.key === "ArrowUp") { e.preventDefault(); step(WORD_STEP); return; }
                  if (e.key === "ArrowDown") { e.preventDefault(); step(-WORD_STEP); return; }
                  onKey(e, saveWords);
                }}
              />
              <span className="msv-stepunit">words</span>
              <span className="msv-steps">
                <button type="button" aria-label={`Up ${WORD_STEP}`} onClick={() => step(WORD_STEP)}>▲</button>
                <button type="button" aria-label={`Down ${WORD_STEP}`} onClick={() => step(-WORD_STEP)}>▼</button>
              </span>
            </div>
            {/* One line, stating what is wrong. It clears on the next valid input. */}
            {wordError && <div className="msv-worderr">{WORD_COUNT_REJECTED}</div>}
            {/* ⚠️ THE HINT STATES WHAT THE KEYS DO — it is NOT a range, a target or guidance about
                how long a manuscript should be. That is retired. */}
            <div className="msv-wordhint">{WORD_COUNT_HINT_LINE}</div>
            <div className="msv-wordfoot">
              <button type="button" className="msv-btn sm" onClick={cancelWords}>Cancel</button>
              <button type="button" className="msv-btn sm msv-primary" onClick={saveWords}>Save</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
