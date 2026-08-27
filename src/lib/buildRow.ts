/**
 * ⚠️ THE BUILD ROW'S PURE PARTS (Part D) — the name it suggests, and whether the combination exists.
 *
 * Reference: `design-refs/builder-refined.html`, `.drop` / `.buildfoot`.
 */
import type { SubmissionPackage } from "../types";

export type SlotKind = "let" | "syn" | "ver";
export interface SlotFill { id: string; name: string }
export type Slots = Record<SlotKind, SlotFill | null>;

/**
 * `Hook-first · Prologue-first` — the filled slots, in the rail's order (D15).
 *
 * ⚠️ IT IS A SUGGESTION, NOT A VALUE. The caller stops applying it the moment the writer types;
 * this function has no idea whether it did, which is what keeps "what would it be called" and "what
 * is it called" two separate questions.
 *
 * ⚠️ AND IT SKIPS EMPTY SLOTS RATHER THAN NAMING THEM. `Hook-first · · Prologue-first` states an
 * absence in the middle of a name.
 */
export const suggestedName = (slots: Slots): string =>
  (["let", "syn", "ver"] as const).map((k) => slots[k]?.name).filter(Boolean).join(" · ");

/**
 * The package already holding this exact combination, or null (D16).
 *
 * ⚠️ IT IS STATED, NOT BLOCKED. Building a second package with the same contents is legitimate —
 * a writer may want two names for two campaigns — and only doing it BY ACCIDENT is the problem. So
 * this returns the name to say beside Create, and Create stays available.
 *
 * ⚠️ AN EMPTY SLOT IS PART OF THE COMBINATION. Letter-only and letter-plus-synopsis are real
 * submission shapes, so a package with no synopsis matches another with no synopsis and does NOT
 * match one that has one. Treating absent as a wildcard would report duplicates that are not.
 */
export const duplicateOf = (
  slots: Slots,
  packages: readonly SubmissionPackage[],
): SubmissionPackage | null =>
  packages.find((p) =>
    (p.queryLetterVersionId || "") === (slots.let?.id ?? "")
    && (p.synopsisVersionId || "") === (slots.syn?.id ?? "")
    && (p.bookVersionId || "") === (slots.ver?.id ?? "")) ?? null;

/**
 * Why Create is unavailable, or null when it is available (D17).
 *
 * ⚠️ THE REASON IS A STRING RATHER THAN A BOOLEAN, so the caller cannot render a disabled button
 * with nothing beside it. A control that refuses without saying why is the tooltip trap: the
 * explanation is only reachable by hovering the thing that is not working.
 */
export const blockedReason = (slots: Slots): string | null =>
  slots.let ? null : "Add a covering letter to continue";
