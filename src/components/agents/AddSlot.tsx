/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dashed ADD SLOT — what an empty list cell renders instead of a sentence.
 *
 * ⚠️ IT IS THE MATERIAL SLOT'S IDIOM, DELIBERATELY. The row already teaches that a small square
 * with a hairline is a thing the agency asks for and a GHOSTED one is a thing it does not; a
 * dashed one in the same shape reads as "a thing that could be here". Three shapes for three
 * degrees of presence, in one row, is a grammar; three unrelated treatments is decoration.
 *
 * ⚠️ WHICH IS WHY THE ITALIC SENTENCES GO. "Not recorded" in Playfair italic is the CARD's voice —
 * a card has room for a sentence and a reader arrives at it slowly. A table cell does not: down a
 * column of twenty-two rows the same sentence twenty-two times is a wall of prose saying nothing,
 * and it cannot be acted on. The card's italic empty state is untouched, and locked.
 *
 * ⚠️ IT IS A `button` WITH A NAME THAT SAYS WHAT IT WOULD FILL. A decorative span with a plus in
 * it is invisible to a screen reader and unreachable by keyboard — and this is the page's only
 * route to those fields from the list. "Add email", never "Add" and never the glyph's name.
 *
 * ⚠️ AND IT DOES SOMETHING FROM THE MOMENT IT EXISTS. Phase 4 gives four of these fields a
 * popover; until then — and permanently, for the wishlist and materials — a slot opens the DRAWER
 * at the tab that owns the field. A control that appears one phase and works the next is a dead
 * control, and a dead control is worse than an absent one: it tells a reader the gap is already
 * addressed.
 */
import React from "react";
import { AgentEditorTab } from "../../lib/agentDraft";

/** The fields a list cell can offer to fill, and the tab that owns each. */
export type SlotField = "email" | "website" | "location" | "genres" | "wishlist" | "materials";

/**
 * ⚠️ THE COPY IS FIXED — sentence case, no full stops. It is the accessible NAME as well as the
 * tooltip, so a reader who cannot see the plus is told the same thing a reader who can is.
 */
export const SLOT_LABEL: Record<SlotField, string> = {
  email: "Add email",
  website: "Add submissions page",
  location: "Add location",
  genres: "Add genres",
  wishlist: "Add manuscript wishlist",
  materials: "Add materials",
};

/** Which drawer tab owns the field — where a slot escalates to. */
export const SLOT_TAB: Record<SlotField, AgentEditorTab> = {
  email: "contact",
  website: "contact",
  location: "contact",
  genres: "wishlist",
  wishlist: "wishlist",
  materials: "materials",
};

export const AddSlot = React.forwardRef<HTMLButtonElement, {
  field: SlotField;
  /** Whose row this slot is in — the popover anchors by finding it. */
  agentId: string;
  /** What pressing it does. Phase 4 swaps four of these for a popover. */
  onOpen: (field: SlotField, anchor: HTMLElement) => void;
  /** True while this slot's popover is open — the ref's fourth state. */
  open?: boolean;
  /** Suppressed while the drawer is editing: two editors on one record is two writers. */
  disabled?: boolean;
}>(({ field, agentId, onOpen, open = false, disabled = false }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`agl-gap${open ? " agl-gap-on" : ""}`}
    data-add-slot={field}
    data-agent={agentId}
    aria-label={SLOT_LABEL[field]}
    title={SLOT_LABEL[field]}
    aria-expanded={open}
    disabled={disabled}
    onClick={(e) => { e.stopPropagation(); onOpen(field, e.currentTarget); }}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.1" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  </button>
));
AddSlot.displayName = "AddSlot";
