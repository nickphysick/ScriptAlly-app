/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TagPicker — THE tag surface (tasks-pages pack, Phase 5), mounted in exactly three places: the
 * composer, the item sheet (the dock's user-task surface), and the ⋯ menu's "Tags…". One
 * component so tagging cannot grow dialects.
 *
 * ⚠️ CREATION HAPPENS WHERE TAGGING HAPPENS: typing an unmatched label offers "Create #{label}"
 * inline — normalised (lowercase, no spaces), unique per user, coloured by rotation from the
 * FIXED family palette. The picker never writes: it reports selection changes and creations to
 * the caller, which owns the store (the composer holds a draft; the sheet and the menu write
 * through updateUserTask / updateUserProfile).
 */
import React, { useState } from "react";
import { TagDef } from "../../types";
import { TAG_PALETTE } from "../../lib/todoFamily";
import { normaliseTagLabel, canCreateTag, newTag } from "../../lib/todoTags";
import "./tagPicker.css";

export interface TagPickerProps {
  /** The user's tag definitions — the vocabulary. */
  tags: TagDef[];
  /** The item's (or draft's) applied tag ids. */
  selected: string[];
  onToggle: (id: string) => void;
  /** A new definition, created inline. The caller persists it AND applies it. */
  onCreate: (tag: TagDef) => void;
  /** Compact = the composer's inline row; default = the panel (sheet / menu popover). */
  compact?: boolean;
}

export const TagPicker: React.FC<TagPickerProps> = ({ tags, selected, onToggle, onCreate, compact }) => {
  const [draft, setDraft] = useState("");
  const label = normaliseTagLabel(draft);
  const creatable = label.length > 0 && canCreateTag(label, tags);
  const shown = label.length > 0 ? tags.filter((t) => t.label.includes(label)) : tags;

  const create = () => {
    const tag = newTag(draft, tags);
    if (!tag) return;
    onCreate(tag);
    setDraft("");
  };

  return (
    <div className={`tgp${compact ? " compact" : ""}`}>
      <div className="tgp-chips">
        {shown.map((t) => {
          const on = selected.includes(t.id);
          const tone = TAG_PALETTE[t.colour];
          return (
            <button
              key={t.id}
              type="button"
              className={`tgp-chip${on ? " on" : ""}`}
              style={{ background: tone.bg, color: tone.tx, borderColor: on ? tone.tx : "transparent" }}
              aria-pressed={on}
              onClick={() => onToggle(t.id)}
            >
              #{t.label}{on && <span className="tgp-tick" aria-hidden> ✓</span>}
            </button>
          );
        })}
        {shown.length === 0 && !creatable && (
          <span className="tgp-none">{tags.length === 0 ? "No tags yet — type one below." : "No match."}</span>
        )}
      </div>
      <div className="tgp-row">
        <input
          type="text"
          value={draft}
          placeholder={tags.length === 0 ? "e.g. synopsis" : "Find or create…"}
          aria-label="Find or create a tag"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && creatable) { e.preventDefault(); create(); }
            if (e.key === "Escape") setDraft("");
          }}
        />
        {creatable && (
          <button type="button" className="tgp-create" onClick={create}>
            Create #{label}
          </button>
        )}
      </div>
    </div>
  );
};
