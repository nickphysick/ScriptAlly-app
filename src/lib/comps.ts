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
import { CompTitle, CompVerification, Manuscript } from "../types";

/**
 * ⚠️ THE ✓ VERIFIED CHIP IS DERIVED FROM EVIDENCE, NEVER FROM A FLAG (baked decision 23). There is
 * no stored `verified` boolean to read, and there must never be one: a boolean is an assertion that
 * the check happened, while a record is the check. The Scout card's footer claims every title was
 * checked against a real catalogue — this predicate is what makes that claim structural rather than
 * a promise.
 *
 * It validates the record rather than merely testing for its presence, because a half-written one
 * (`{}` from a bad payload, a blank catalogue name) would otherwise light the chip while naming
 * nothing. A manual comp has no record and no chip — the correct outcome, not a missing feature.
 */
export function isVerified(c: Pick<CompTitle, "verification">): boolean {
  const v = c.verification;
  return (
    !!v &&
    typeof v.catalogue === "string" && v.catalogue.trim() !== "" &&
    typeof v.checkedAt === "string" && v.checkedAt.trim() !== ""
  );
}

/** A verification record with its optional key omitted when empty (Firestore maps reject undefined). */
function normalizeVerification(v: CompVerification): CompVerification {
  const out: CompVerification = { catalogue: v.catalogue.trim(), checkedAt: v.checkedAt.trim() };
  const id = v.externalId?.trim();
  if (id) out.externalId = id;
  return out;
}

/**
 * ⚠️ THE SINGLE WRITE NORMALISER — every comp write goes through this, and it is an ALLOWLIST BY
 * CONSTRUCTION: it names each field it keeps, so a field added to `CompTitle` and forgotten here is
 * silently dropped on the next save. That is a real failure mode in this file's history (see
 * `withCompEdited`), so a new field lands in both places or in neither.
 *
 * Empty optionals are OMITTED rather than written as undefined or null — Firestore rejects
 * undefined inside a map, and an explicit null would make "not stated" a different value from
 * "absent" on a page whose whole grammar is that rows omit themselves.
 *
 * Moved here from ComparableTitlesPage so it sits beside the other write helpers and can be tested
 * without pulling React in (this suite is `environment: 'node'`).
 */
export function normalizeComp(c: CompTitle): CompTitle {
  const out: CompTitle = { title: c.title.trim() };
  const author = c.author?.trim();
  if (author) out.author = author;
  const publisher = c.publisher?.trim();
  if (publisher) out.publisher = publisher;
  if (typeof c.year === "number" && Number.isFinite(c.year)) out.year = c.year;
  const note = c.note?.trim();
  if (note) out.note = note;
  const axis = c.matchAxis?.trim();
  if (axis) out.matchAxis = axis;
  if (c.media && c.media !== "book") out.media = c.media;
  if (c.inQuery) out.inQuery = true;
  if (c.source) out.source = c.source;
  /* validated, not merely present — a malformed record must not survive a write and light the chip */
  if (c.verification && isVerified(c)) out.verification = normalizeVerification(c.verification);
  return out;
}

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

/**
 * ⚠️ A DOCUMENT-SIZE AND WRITE-COST GUARD, NEVER A COMMERCIAL CAP (baked decision 21). Free users
 * get unlimited manual comps; the Pro boundary is the Scout and nothing else. Nothing in the UI may
 * state this number — no `8 of 100` counter, no progress bar, no upgrade prompt at the limit. If it
 * is ever reached the add row says the list is full and offers nothing.
 *
 * ⚠️ AND THE BINDING CONSTRAINT IS THE WHOLE-ARRAY REWRITE, NOT THE 1 MiB DOCUMENT CEILING. `comps`
 * is an array on the manuscript document, so EVERY add, edit, remove, tick and reorder rewrites the
 * entire list. At Firestore's own sizing (string = UTF-8 bytes + 1, number 8, bool 1, map 32 +
 * fields) a comp with all nine fields at generous lengths is ~1,146 bytes and a typical one ~263 —
 * so 100 costs ~115 KB worst case and ~26 KB typical per interaction, roughly 11% and 2.5% of the
 * document budget. That leaves an order of magnitude of headroom while keeping a drag-reorder cheap
 * on a phone.
 *
 * ⚠️ 1,000 WAS REJECTED for a reason worth keeping: at worst-case field lengths it is ~1.15 MB, so
 * it can EXCEED the document limit — a guard that can be exceeded has stopped guarding.
 *
 * ⚠️ ARTEFACT-LOCKED TO `firestore.rules`. The rules cap the same list, and if the two disagree the
 * client permits a write the rules reject — which is denied SILENTLY, the same class of fault as the
 * affectedKeys allowlist. Change both together; `compsCap.test.ts` fails if they drift.
 */
export const MAX_COMPS = 100;

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

/** The editable subset of a comp — every field the manual form sets. */
export type CompDraft = Pick<
  CompTitle,
  "title" | "author" | "publisher" | "year" | "note" | "media" | "matchAxis"
>;

/**
 * ⚠️ AN EDIT MERGES ONTO THE STORED COMP — it never rebuilds one from the draft alone, and that
 * distinction was live data loss rather than a style preference.
 *
 * The page used to write `{ ...draft, source, inQuery }`, so any stored field the draft did not
 * carry was destroyed on every save. `note` was exactly that field: nothing on the comps page
 * writes it or renders it, and its ONLY renderer is `ManuscriptCompsPane` on the Manuscripts card
 * — so the loss happened on one page and showed on another, which is why it survived unnoticed.
 *
 * Spreading the stored comp FIRST means a field the form does not carry survives by default. That
 * is the property that was missing; `note` was the instance of it, not the whole of it. Do not
 * "simplify" this back into a rebuild, and do not fix it by naming `note` explicitly — the next
 * field the form does not carry would go the same way.
 *
 * `inQuery` rides through on the spread (it is the writer's tick, never the form's), and `source`
 * keeps its long-standing "absent reads as user" default rather than silently going absent.
 */
export function withCompEdited(comps: CompTitle[], index: number, draft: CompDraft): CompTitle[] {
  return comps.map((c, i) => (i === index ? { ...c, ...draft, source: c.source ?? "user" } : c));
}
