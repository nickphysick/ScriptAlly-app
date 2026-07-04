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
