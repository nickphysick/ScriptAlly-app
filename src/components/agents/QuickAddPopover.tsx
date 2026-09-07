/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUICK ADD — the popover a dashed slot opens (ref: contact-list-quick-add-v1.html).
 *
 * ⚠️ IT IS ONE FIELD, NOT A SMALLER EDITOR. Sage head carrying the agent's FIRST name and the
 * field, one body, a hairline foot of Save, Cancel and the keys. The moment it grows a second
 * unrelated field it has become a rival to the drawer, and two editors on one record is two
 * writers — which is why the wishlist and materials never get one: a paragraph and four
 * structured rows are the drawer's work, and their slots escalate to it.
 *
 * ⚠️ THE FIRST NAME, NOT THE FULL ONE. The popover is anchored to a cell in that agent's row and
 * the row already says who they are; repeating "Aisha Kapoor" over the top of it is the header
 * explaining what the reader is looking at rather than what they are doing.
 *
 * ⚠️ IT KEEPS NO COPY OF THE AGENT. The draft holds only what is being typed; everything else is
 * read from the store at render. A popover that cached the record would be the one surface able to
 * disagree with the other four about what an agent's email is.
 */
import React from "react";
import { createPortal } from "react-dom";
import { Agent } from "../../types";
import {
  LocationDraft, QuickField, normaliseSubmissionsUrl, quickWarning,
} from "../../lib/quickAdd";
import { SLOT_LABEL } from "./AddSlot";

/** The head's field word — the slot's label without its verb. */
const FIELD_WORD: Record<QuickField, string> = {
  email: "Email",
  website: "Submissions page",
  location: "Location",
  genres: "Genres sought",
};

const PLACEHOLDER: Record<QuickField, string> = {
  email: "name@agency.co.uk",
  website: "agency.co.uk/submissions",
  location: "",
  genres: "",
};

export interface QuickDraft {
  value: string;
  location: LocationDraft;
  genres: string[];
}

export const emptyQuickDraft = (): QuickDraft => ({ value: "", location: { city: "", country: "" }, genres: [] });

export const QuickAddPopover: React.FC<{
  agent: Agent;
  field: QuickField;
  draft: QuickDraft;
  onDraft: (next: QuickDraft) => void;
  onSave: (andNext: boolean) => void;
  onCancel: () => void;
  /** Genres the writer already uses elsewhere — offered, never imposed. */
  suggestions: string[];
  style: React.CSSProperties;
  panelRef: React.MutableRefObject<HTMLElement | null>;
}> = ({ agent, field, draft, onDraft, onSave, onCancel, suggestions, style, panelRef }) => {
  const firstRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { firstRef.current?.focus(); }, [field]);

  /* ⚠️ THE KEYS ARE THE POPOVER'S, AND THEY DO NOT REACH THE PAGE. Enter saves, Tab saves and
     moves on, Escape abandons — all three are consumed here, because the page beneath has its own
     Escape (the drawer) and its own Tab order, and a key that does two things is a key that does
     the wrong one half the time. */
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); }
    else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onSave(false); }
    else if (e.key === "Tab") { e.preventDefault(); e.stopPropagation(); onSave(true); }
  };

  const warning = field === "genres" || field === "location" ? null : quickWarning(field, draft.value);
  const preview = field === "website" && draft.value.trim() ? normaliseSubmissionsUrl(draft.value) : null;

  return createPortal(
    <div
      className="agl-qa"
      role="dialog"
      aria-label={`${SLOT_LABEL[field]} for ${agent.name}`}
      ref={(n) => { panelRef.current = n; }}
      style={style}
      onKeyDown={onKey}
    >
      <div className="agl-qa-head">
        <b>{agent.name.trim().split(/\s+/)[0]}</b>
        <span>{FIELD_WORD[field]}</span>
      </div>

      <div className="agl-qa-body">
        {field === "location" ? (
          <>
            <div className="agl-qa-two">
              <div>
                <label htmlFor="agl-qa-city">City</label>
                <input id="agl-qa-city" ref={firstRef} value={draft.location.city} placeholder="London"
                  onChange={(e) => onDraft({ ...draft, location: { ...draft.location, city: e.target.value } })} />
              </div>
              <div>
                <label htmlFor="agl-qa-country">Country</label>
                <input id="agl-qa-country" value={draft.location.country} placeholder="United Kingdom"
                  onChange={(e) => onDraft({ ...draft, location: { ...draft.location, country: e.target.value } })} />
              </div>
            </div>
            {/* the two are asked for together because one of them cannot draw a flag */}
            <p className="agl-qa-hint">The flag comes from the country.</p>
          </>
        ) : field === "genres" ? (
          <>
            {draft.genres.length > 0 && (
              <div className="agl-qa-picked">
                {draft.genres.map((g) => (
                  <button type="button" key={g} onClick={() => onDraft({ ...draft, genres: draft.genres.filter((x) => x !== g) })}
                    aria-label={`Remove ${g}`}>{g} ×</button>
                ))}
              </div>
            )}
            <label htmlFor="agl-qa-genre">Add a genre</label>
            <input id="agl-qa-genre" ref={firstRef} value={draft.value} placeholder="Start typing…" autoComplete="off"
              onChange={(e) => onDraft({ ...draft, value: e.target.value })} />
            <div className="agl-qa-sugg">
              {suggestions
                .filter((g) => !draft.genres.includes(g) && g.toLowerCase().includes(draft.value.trim().toLowerCase()))
                .slice(0, 6)
                .map((g) => (
                  <button type="button" key={g} onClick={() => onDraft({ ...draft, genres: [...draft.genres, g], value: "" })}>{g}</button>
                ))}
            </div>
          </>
        ) : (
          <>
            <label htmlFor="agl-qa-in">{FIELD_WORD[field]}</label>
            <input id="agl-qa-in" ref={firstRef} value={draft.value} placeholder={PLACEHOLDER[field]}
              onChange={(e) => onDraft({ ...draft, value: e.target.value })} />
            {/* ⚠️ ADVICE, NOT A GATE — the value saves either way, and the sentence says so. */}
            {warning && <p className="agl-qa-hint agl-qa-warn">{warning}</p>}
            {preview && preview !== draft.value.trim() && (
              <p className="agl-qa-hint">Will be saved as <code>{preview}</code></p>
            )}
          </>
        )}
      </div>

      <div className="agl-qa-foot">
        <button type="button" className="agl-qa-save" onClick={() => onSave(false)}>Save</button>
        <button type="button" className="agl-qa-cancel" onClick={onCancel}>Cancel</button>
        <span className="agl-sp" />
        <span className="agl-qa-kbd">↵ save · ⇥ next · esc</span>
      </div>
    </div>,
    document.body,
  );
};
