/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The four Details tiles, derived. Reference: design-refs/manuscripts-plate.html, treatment B.
 *
 * ⚠️ DERIVED, NEVER STORED, AND NEVER APPRAISING. Every figure is computed at read time from
 * queries, comps, versions and packages. The copy states what happened and when — it does not say
 * whether that is good, fast, promising or disappointing. "Seven weeks of active submission" is a
 * fact; "seven weeks already" and "only seven weeks" are both opinions.
 *
 * ⚠️ A CLAUSE WITH NO DATA IS OMITTED, NEVER RENDERED AS `0` OR `undefined`.
 * Each builder returns `detail: string | null`, and `null` means the line does not render at all.
 * That is why the detail is composed from a clause LIST rather than a template string: a template
 * with a hole in it prints the hole.
 */
import { Manuscript, ManuscriptStatus, Query, SubmissionPackage, ManuscriptVersion, ComponentType, CompTitle } from "../types";
import { isResponse } from "./packageMetrics";
import { lastActivityMs } from "./manuscriptPage";
import { pitchLine, PitchLine } from "./comps";

/**
 * ⚠️ THE FOURTH PRIVATE COPY OF THIS TABLE IN THE REPO — `dashboardStats.ts`, `todoBoard.ts` and
 * `topNav.ts` each keep their own, none exported. Consolidating the four is a real follow-up and a
 * deliberately separate one: it would touch three files this task has no business in. Flagged in
 * reports/manuscripts-plate.md rather than fixed here.
 */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** Spelled to twelve, numeric after — the house convention. */
export const spellCount = (n: number): string => (n >= 0 && n <= 12 ? WORDS[n] : String(n));

/** `8 August` — prose dates carry the full month; only the stat strip abbreviates. */
export const proseDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

/** `12 June 2026` — a since-date carries its year, because it may not be this one. */
export const sinceDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const parse = (iso?: string): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

/** Joins the clauses that exist. All absent → `null`, which means "render no detail line". */
const clauses = (...parts: (string | null)[]): string | null => {
  const kept = parts.filter((p): p is string => !!p);
  return kept.length ? kept.join(" ") : null;
};

export interface TileCopy {
  headline: string;
  detail: string | null;
}

/* ── tile 1 — Out in the world ─────────────────────────────────────────────────────────────── */

export function outInTheWorld(queries: Query[]): TileCopy {
  const n = queries.length;
  if (n === 0) {
    return { headline: "No queries sent yet", detail: "This one hasn't gone out yet." };
  }
  const responses = queries.filter(isResponse);
  const headline = n === 1 ? "1 query with agents" : `${n} queries with agents`;

  if (responses.length === 0) return { headline, detail: "No responses yet." };

  // The most recent response we can date. An undated one still counts — it just cannot be dated,
  // so the sentence keeps the count and drops the date rather than inventing one.
  const times = responses.map(lastActivityMs).filter((t): t is number => t !== null);
  const count = responses.length === 1 ? "One response" : `${spellCount(responses.length)} responses`;
  const when = times.length ? `, on ${proseDate(Math.max(...times))}` : "";
  return { headline, detail: `${count} so far${when}.` };
}

/* ── tile 2 — Comparable titles ────────────────────────────────────────────────────────────── */

export interface CompsTileCopy {
  headline: string;
  /**
   * The structured pitch, so the tile can italicise the titles. Built by `pitchLine` from
   * lib/comps — the SAME composition the shelf uses, never a second one.
   */
  pitch: PitchLine;
  /** The prose that accompanies (or replaces) the pitch. */
  detail: string | null;
}

export function comparableTitlesTile(comps: CompTitle[]): CompsTileCopy {
  const pitch = pitchLine(comps);
  if (pitch.kind === "two") {
    return { headline: `${comps.length} on the shelf`, pitch, detail: null };
  }
  if (pitch.kind === "one") {
    return { headline: "1 on the shelf", pitch, detail: "A second makes the ‘X meets Y’ line." };
  }
  return {
    headline: "Nothing on the shelf yet",
    pitch,
    detail: "Two comps make the ‘X meets Y’ line in a query letter.",
  };
}

/* ── tile 3 — On the shelf ─────────────────────────────────────────────────────────────────── */

/** Querying and On Submission are the two states where elapsed time IS submission time. */
const SUBMITTING = new Set<string>([ManuscriptStatus.QUERYING, ManuscriptStatus.ON_SUBMISSION]);

/** `seven weeks` / `four days`. `null` when no time has passed — never "zero weeks". */
export function elapsedPhrase(fromMs: number, nowMs: number): string | null {
  const days = Math.floor((nowMs - fromMs) / 86_400_000);
  if (days <= 0) return null;
  if (days < 7) return `${spellCount(days)} ${days === 1 ? "day" : "days"}`;
  const weeks = Math.floor(days / 7);
  return `${spellCount(weeks)} ${weeks === 1 ? "week" : "weeks"}`;
}

/**
 * ⚠️ THE HEADLINE IS THE STATUS FACT, NOT "ADDED".
 * `createdDate` is optional and the current create path never writes it, so `Added {date}` had no
 * data on most manuscripts. It appears ONLY when the field genuinely exists, and then in the
 * detail line beside the duration.
 *
 * ⚠️ AND AN "ADDED" DATE IS NEVER DERIVED FROM THE EARLIEST ACTIVITY. On an imported manuscript
 * that is a first-query date wearing the wrong label — a plausible number that states something
 * untrue. No date is the honest answer, and the tile then shows the status alone.
 *
 * `status`/`statusChangedDate` are taken as the pair they are: the WORKFLOW status and the date it
 * changed. The reversible `shelved` overlay has no date of its own, so a caller must not substitute
 * "Shelved" here — the plateband already carries that presentation.
 */
export function onTheShelf(
  m: Pick<Manuscript, "status" | "statusChangedDate" | "createdDate">,
  nowMs: number,
): TileCopy {
  const since = parse(m.statusChangedDate);
  const created = parse(m.createdDate);
  const added = created !== null ? `Added ${sinceDate(created)}.` : null;

  // No resolvable status date: the status alone, and no date clause anywhere.
  if (since === null) return { headline: String(m.status), detail: added };

  const elapsed = elapsedPhrase(since, nowMs);
  const duration = elapsed
    ? SUBMITTING.has(m.status)
      ? `That's ${elapsed} of active submission.`
      : `That's ${elapsed} so far.`
    : null;

  return { headline: `${m.status} since ${sinceDate(since)}`, detail: clauses(added, duration) };
}

/* ── tile 4 — Submission materials ─────────────────────────────────────────────────────────── */

/** Sentence case for prose; the enum's Title Case is a stored value, not a sentence. */
const MATERIAL_LABEL: Record<ComponentType, string> = {
  [ComponentType.QUERY_LETTER]: "Query letter",
  [ComponentType.SYNOPSIS]: "Synopsis",
  [ComponentType.SAMPLE_PAGES]: "Sample pages",
  [ComponentType.FULL_MANUSCRIPT]: "Full manuscript",
};

const MATERIAL_ORDER: ComponentType[] = [
  ComponentType.QUERY_LETTER,
  ComponentType.SYNOPSIS,
  ComponentType.SAMPLE_PAGES,
  ComponentType.FULL_MANUSCRIPT,
];

/**
 * ⚠️ ONE VARIANT, FOR EVERYONE. The package builder has no Pro gate today — a Free/Pro fork here
 * would pitch an upgrade for a page the user can already open from the rail, which is exactly why
 * a Pro-selling landing was retired from that route once already.
 *
 * ⚠️ ABSENT MATERIALS ARE OMITTED, not listed as "not added yet". The ref writes
 * "Sample pages not added yet"; the ruling is to omit. Nothing at all → one plain sentence.
 */
export function submissionMaterials(packages: SubmissionPackage[], versions: ManuscriptVersion[]): TileCopy {
  const n = packages.length;
  const headline =
    n === 0 ? "No packages compiled yet" : n === 1 ? "1 package compiled" : `${n} packages compiled`;

  const parts = MATERIAL_ORDER.map((t) => {
    const count = versions.filter((v) => v.componentType === t).length;
    return count > 0 ? `${MATERIAL_LABEL[t]} (${count})` : null;
  }).filter((p): p is string => p !== null);

  return { headline, detail: parts.length ? `${parts.join(" · ")}.` : "No materials added yet." };
}
