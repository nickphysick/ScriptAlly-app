/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Structured comps — the single home for reading a manuscript's comparable titles.
 *
 * The stored shape is `Manuscript.comps: CompTitle[]`. Stray dev docs written before the hard cut
 * may still carry the legacy string field `comparableTitles` ("A meets B, C"); manuscriptComps()
 * parses that at read time so no consumer ever sees the string. The legacy field is never
 * written back.
 */
import { CompTitle, Manuscript } from "../types";

/**
 * Parse a legacy comparable-titles string into structured comps: split on " meets " then commas,
 * trim, titles only. Authors/years/notes were never captured in the string era.
 */
export function parseLegacyComps(raw?: string | null): CompTitle[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/\s+meets\s+/i)
    .flatMap((part) => part.split(","))
    .map((t) => t.trim())
    .filter(Boolean)
    .map((title) => ({ title, source: "user" as const }));
}

/**
 * Read-time accessor: the structured array when present, else the legacy string parsed. Runtime
 * docs predating the model change can lack `comps` entirely despite the type, so this guards
 * with Array.isArray rather than trusting the declaration.
 */
export function manuscriptComps(m: Manuscript): CompTitle[] {
  if (Array.isArray(m.comps)) return m.comps;
  return parseLegacyComps((m as { comparableTitles?: string }).comparableTitles);
}

/** Comp titles as one space-joined string — the keyword-matching surface for communityMatch. */
export function compsSearchText(m: Manuscript): string {
  return manuscriptComps(m)
    .map((c) => c.title)
    .join(" ");
}

/** Shelf cap — mirrors the Firestore rules cap (`comps` list ≤ 12). */
export const MAX_COMPS = 12;

/**
 * A comp published five or more years ago reads as "older" — derived at render, never stored.
 * The same rule drives the shelf's gold OLDER COMP chip and the Suggestions age caution.
 */
export function isOlderComp(year: number | undefined, currentYear: number): boolean {
  return typeof year === "number" && Number.isFinite(year) && year <= currentYear - 5;
}

export type PitchLine =
  | { kind: "two"; a: string; b: string }
  | { kind: "one"; a: string }
  | { kind: "none" };

/** The pitch line composes from the FIRST TWO shelf comps, in shelf order. */
export function pitchLine(comps: CompTitle[]): PitchLine {
  if (comps.length >= 2) return { kind: "two", a: comps[0].title, b: comps[1].title };
  if (comps.length === 1) return { kind: "one", a: comps[0].title };
  return { kind: "none" };
}

/** Clipboard text for the complete line, or null while it's incomplete. */
export function pitchLineText(comps: CompTitle[]): string | null {
  const p = pitchLine(comps);
  return p.kind === "two" ? `${p.a} meets ${p.b}` : null;
}

/** Append respecting the shelf cap (a full shelf returns unchanged). */
export function withCompAdded(comps: CompTitle[], comp: CompTitle): CompTitle[] {
  return comps.length >= MAX_COMPS ? comps : [...comps, comp];
}

export function withCompRemoved(comps: CompTitle[], index: number): CompTitle[] {
  return comps.filter((_, i) => i !== index);
}
