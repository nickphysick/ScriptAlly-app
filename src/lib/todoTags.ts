/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoTags — the tag model's pure layer (tasks-pages pack, Phase 5).
 *
 * ⚠️ THE MODEL: `{ id, label, colour }`, owned by the USER (User.tags — the mutedTaskRules
 * pattern: small, listener-free), applied to notes and tasks as ID arrays (UserTask.tags).
 * Labels are LOWERCASE with NO SPACES, unique per user; colour comes from the FIXED family
 * palette (TAG_PALETTE) — assigned at creation by rotation, changeable, never free-form.
 * Deleting a tag DETACHES it from items and never deletes the items. Tags survive note→task
 * conversion untouched — the date is the door, the tags are the luggage.
 */
import { TagDef, TagColour, UserTask } from "../types";
import { TAG_PALETTE } from "./todoFamily";

export const TAG_COLOURS = Object.keys(TAG_PALETTE) as TagColour[];

/** "#Query Letter!" → "queryletter" — lowercase, no spaces, letters/digits/hyphens only. */
export function normaliseTagLabel(raw: string): string {
  return raw.toLowerCase().replace(/^#+/, "").replace(/[^a-z0-9-]/g, "").slice(0, 24);
}

export function isValidTagLabel(label: string): boolean {
  return label.length >= 1 && label === normaliseTagLabel(label);
}

/** Unique per user — by LABEL, since the label is the thing the writer types. */
export function canCreateTag(label: string, existing: TagDef[]): boolean {
  return isValidTagLabel(label) && !existing.some((t) => t.label === label);
}

/** Colour by rotation at creation — the least-used family tone, ties by palette order. */
export function nextTagColour(existing: TagDef[]): TagColour {
  const counts = new Map<TagColour, number>(TAG_COLOURS.map((c) => [c, 0]));
  for (const t of existing) counts.set(t.colour, (counts.get(t.colour) ?? 0) + 1);
  return TAG_COLOURS.reduce((best, c) => ((counts.get(c) ?? 0) < (counts.get(best) ?? 0) ? c : best), TAG_COLOURS[0]);
}

export function newTag(rawLabel: string, existing: TagDef[]): TagDef | null {
  const label = normaliseTagLabel(rawLabel);
  if (!canCreateTag(label, existing)) return null;
  return { id: "tag-" + Math.random().toString(36).slice(2, 10), label, colour: nextTagColour(existing) };
}

/** Usage counts over the live items — derived, never stored. */
export function tagUsageCounts(userTasks: Pick<UserTask, "tags">[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of userTasks) for (const id of t.tags ?? []) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

/** Multi-select toggle for the sidebar's TAGS rows. */
export function toggleTagSel(sel: string[], id: string): string[] {
  return sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
}

/**
 * ⚠️ ADDITIVE with FILTERS ("Urgent AND #synopsis"): an item passes only when it carries EVERY
 * selected tag. Derived cards carry none, so any tag selection narrows to user content — which
 * is the honest answer, since only user content can be tagged.
 */
export function matchesTags(itemTags: string[] | undefined, sel: string[]): boolean {
  if (sel.length === 0) return true;
  const set = new Set(itemTags ?? []);
  return sel.every((id) => set.has(id));
}
