/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SUBMISSION PACKAGES v26 (25 Oct) — the page's pure derivations, unit-locked.
 * Ref: design-refs/submission-packages-v26/submission-packages-v26.html.
 *
 * ⚠️ EVERY FIGURE IS packageReplies'. "Asked for more" is its `requests` (a query whose FIRST answer was a request),
 *    the share is requests over ANSWERED (still waiting never enters a rate, packageReplies' own rule), and an item is
 *    ranked only once `qualifies` (MIN_SENDS_FOR_CLAIM answered). The mock's "5 sent" threshold is illustrative.
 * ⚠️ A PACKAGE'S COUNTS ARE ITS CURRENT EDITION'S (packageSplit with editionNumber); Results compares all editions,
 *    as the v4 table did. "Sent as is / with changes" splits the current edition: as is = sent AS the package,
 *    with changes = logged piece by piece, starting from it (sentRecord's `individual` + `basedOnId`).
 * ⚠️ NAMED EXTRAS replace the free-text `otherMaterials`: a package ticks extras by id, and `otherMaterials` keeps
 *    their names, joined — the string the send flow, the edition engine and each query's frozen summary read.
 */
import { PACKAGE_ICONS, type Manuscript, type PackageExtra, type PackageIcon, type Query, type SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import { sentRecordOf } from "./queryActions/sentRecord";
import { editionNumber, editionsOf } from "./packageEditions";
import { MIN_SENDS_FOR_CLAIM, qualifies, ranked, type Split } from "./packageReplies";
import { dayMonth } from "./dates";

/* ── icons ── */
export const iconOf = (p: Pick<SubmissionPackage, "icon"> | null | undefined): PackageIcon =>
  p?.icon && (PACKAGE_ICONS as readonly string[]).includes(p.icon) ? p.icon : "box";

/* ── readiness: the header bar's pill ── */
/* ⚠️ A STRING DISCRIMINANT: strictNullChecks is off in this repo, so a boolean-discriminated union would not narrow. */
export type Readiness = "ready" | "needs-letter" | "needs-version";
export function readiness(p: Pick<SubmissionPackage, "queryLetterVersionId" | "bookVersionId">): Readiness {
  if (!p.queryLetterVersionId?.trim()) return "needs-letter";
  if (!p.bookVersionId?.trim()) return "needs-version";
  return "ready";
}
export const readinessLabel = (r: Readiness): string => (r === "ready" ? "Ready" : r === "needs-letter" ? "Needs a letter" : "Needs a version");

/* ── named extras ── */
export const EXTRA_SUGGESTIONS = ["Marketing plan", "Series outline", "One-line pitch", "Full manuscript", "Author photo", "Writing CV", "Chapter outline", "Sensitivity notes"] as const;

export const extrasOf = (ms: Pick<Manuscript, "extras"> | null | undefined): PackageExtra[] =>
  Array.isArray(ms?.extras) ? ms!.extras!.filter((e) => e && typeof e.id === "string" && typeof e.name === "string") : [];

/** The package's ticked extras, in the manuscript's order. A legacy package with text and no ids reads as none. */
export function packageExtras(p: Pick<SubmissionPackage, "extraIds">, extras: readonly PackageExtra[]): PackageExtra[] {
  const ids = new Set(p.extraIds ?? []);
  return extras.filter((e) => ids.has(e.id));
}

/** The `otherMaterials` mirror for a set of ticked extras: their names, joined — or "" for none. */
export function extrasLine(ids: readonly string[], extras: readonly PackageExtra[]): string {
  const set = new Set(ids);
  return extras.filter((e) => set.has(e.id)).map((e) => e.name.trim()).filter(Boolean).join(", ");
}

/** The "+ Add" popover's suggestions: not already an extra, filtered by what is typed. */
export function extraSuggestions(typed: string, extras: readonly PackageExtra[]): string[] {
  const have = new Set(extras.map((e) => e.name.trim().toLowerCase()));
  const t = typed.trim().toLowerCase();
  return EXTRA_SUGGESTIONS.filter((s) => !have.has(s.toLowerCase()) && (!t || s.toLowerCase().includes(t)));
}

/** Whether "+ Add “{typed}”" is offered: something typed that is neither an extra nor a suggestion. */
export function offersNewExtra(typed: string, extras: readonly PackageExtra[]): boolean {
  const t = typed.trim().toLowerCase();
  if (!t) return false;
  return !extras.some((e) => e.name.trim().toLowerCase() === t) && !EXTRA_SUGGESTIONS.some((s) => s.toLowerCase() === t);
}

export const newExtraId = (): string => `ext-${Math.random().toString(36).slice(2, 11)}`;

/** Find an extra by name (case-insensitive), or make one — never two extras of one name. */
export function extraNamed(name: string, extras: readonly PackageExtra[], mint: () => string = newExtraId): { extra: PackageExtra; created: boolean } {
  const n = name.trim();
  const hit = extras.find((e) => e.name.trim().toLowerCase() === n.toLowerCase());
  return hit ? { extra: hit, created: false } : { extra: { id: mint(), name: n }, created: true };
}

/**
 * THE otherMaterials MIGRATION (one manuscript). Every package written before named extras — `otherMaterials` text,
 * no `extraIds` — becomes one extra of that name (shared across packages with the same text) and gains its id.
 * The text itself is unchanged, so what each package says it sends is unchanged and no edition starts; the rules
 * allow exactly this one write on a sent package. Returns nothing to do when nothing needs it.
 */
export interface ExtrasMigration { extras: PackageExtra[]; patches: { id: string; extraIds: string[] }[]; added: number }
export function otherMaterialsMigration(ms: Pick<Manuscript, "id" | "extras">, packages: readonly SubmissionPackage[], mint: () => string = newExtraId): ExtrasMigration {
  const extras = [...extrasOf(ms)];
  const patches: { id: string; extraIds: string[] }[] = [];
  let added = 0;
  for (const p of packages) {
    if (p.manuscriptId !== ms.id || Array.isArray(p.extraIds)) continue;
    const text = p.otherMaterials?.trim();
    if (!text) continue;
    const { extra, created } = extraNamed(text, extras, mint);
    if (created) { extras.push(extra); added++; }
    patches.push({ id: p.id, extraIds: [extra.id] });
  }
  return { extras, patches, added };
}

/* ── the open package's figures ── */
export interface SendSplit { asIs: number; changed: number }

/** Sent as the package (current edition) vs logged piece by piece starting from it (same edition). */
export function sendSplit(p: SubmissionPackage, queries: readonly Query[]): SendSplit {
  const ed = editionNumber(p);
  let asIs = 0, changed = 0;
  for (const q of queries) {
    const r = sentRecordOf(q);
    if (r.how === "package" && r.packageId === p.id && r.edition === ed) asIs++;
    else if (r.how === "individual" && r.basedOnId === p.id && (r.basedOnEdition ?? 1) === ed) changed++;
  }
  return { asIs, changed };
}

/** When the current edition started — null for a package still on its 1st. */
export function editionStartedAt(p: SubmissionPackage): string | null {
  const ed = editionNumber(p);
  if (ed <= 1) return null;
  return editionsOf(p).find((e) => e.n === ed)?.startedAt || null;
}


/** The one quiet line under the packing list. */
export function packageFoot(p: SubmissionPackage, sent: boolean, split: SendSplit): string {
  if (!sent) return "Change it as much as you like. Nothing is recorded until you log a query with it.";
  const since = editionStartedAt(p);
  const lead = since ? `Counting from ${dayMonth(since)}, when you last changed it. ` : "";
  const counts = split.asIs || split.changed ? `${split.asIs} sent as is, ${split.changed} with changes. ` : "";
  return `${lead}${counts}Queries already sent keep exactly what went with them.`;
}

/** "{sent} sent · {more} asked for more", or "Not sent yet". */
export function headerFigures(s: Split): { sent: number; more: number } | null {
  return s.sent ? { sent: s.sent, more: s.requests } : null;
}

/* ── Results ── */
export type ResultsKind = "pk" | "let" | "syn" | "ver";
export const RESULTS_NOUN: Record<ResultsKind, string> = { pk: "package", let: "letter", syn: "synopsis", ver: "version" };

/** The share of answered queries that asked for more — null before anything is answered. */
export const askRate = (s: Split): number | null => (s.answered ? s.requests / s.answered : null);
export const pctOf = (r: number | null): string => (r == null ? "–" : `${Math.round(r * 100)}%`);

/** `retired`: a retired package, a put-away letter or synopsis, an archived version — listed under the others,
 *  "Retired", never ranked (v26.1). Deleted items and other manuscripts' never reach this list at all. */
export interface ResultItem { id: string; name: string; s: Split; retired?: boolean }
export interface ResultRowView<T extends ResultItem = ResultItem> {
  item: T;
  rate: number | null;
  /** counted but under the threshold: shown, hatched, not ranked */
  early: boolean;
  notSent: boolean;
  /** retired / put away / archived: shown under the live ones, never ranked */
  retired: boolean;
  /** the bar's width, as a percentage of the track (bars run to 50%) */
  bar: number;
  label: string;
}

export const BAR_MAX = 0.5;

export function resultRows<T extends ResultItem>(items: readonly T[]): ResultRowView<T>[] {
  /* the live items in packageReplies' house order, then the retired ones in the same order beneath them */
  const orderOf = (list: readonly T[]) => ranked(list.map((it) => ({ ...it, name: it.name, s: it.s }))).map((o) => list.find((x) => x.id === o.id)!);
  const order = [...orderOf(items.filter((it) => !it.retired)), ...orderOf(items.filter((it) => !!it.retired))];
  return order.map((it) => {
    const rate = askRate(it.s);
    const retired = !!it.retired;
    const notSent = it.s.sent === 0;
    const early = !notSent && !qualifies(it.s);
    const bar = notSent || rate == null ? 0 : Math.max(2, Math.min(1, rate / BAR_MAX) * 100);
    return { item: it, rate, early, notSent, retired, bar, label: retired ? "Retired" : notSent ? "Not sent" : early ? "Too early" : pctOf(rate) };
  });
}

/** The ranked rows only (qualifying, in packageReplies' house order). */
export const rankedOnly = <T extends ResultItem>(rows: readonly ResultRowView<T>[]): ResultRowView<T>[] => rows.filter((r) => !r.early && !r.notSent && !r.retired);

/** The lead sentence: the best and the lowest ranked, or why there is no comparison yet. */
export function resultsLead(rows: readonly ResultRowView[], kind: ResultsKind): { best: string | null; text: string } {
  const ok = rankedOnly(rows);
  if (ok.length >= 2) {
    const a = ok[0], z = ok[ok.length - 1];
    return { best: a.item.name, text: ` gets requests from ${pctOf(a.rate)} of the agents who answered, against ${pctOf(z.rate)} for ${z.item.name}.` };
  }
  if (ok.length === 1) return { best: ok[0].item.name, text: ` gets requests from ${pctOf(ok[0].rate)} of the agents who answered. The others need more answers before they can be compared fairly.` };
  return { best: null, text: `Nothing has had ${MIN_SENDS_FOR_CLAIM} answers yet, so it's too early to compare ${RESULTS_NOUN[kind] === "synopsis" ? "synopses" : `${RESULTS_NOUN[kind]}s`}.` };
}

/** The footnote: the overall average and the threshold, in packageReplies' own terms. */
export function resultsFoot(overall: Split, kind: ResultsKind): string {
  const noun = RESULTS_NOUN[kind];
  const plural = noun === "synopsis" ? "Synopses" : `${noun[0].toUpperCase()}${noun.slice(1)}s`;
  const threshold = `${plural} with fewer than ${MIN_SENDS_FOR_CLAIM} answers are shown but not ranked.`;
  /* v26.1: the average is stated only when there is one; otherwise just the threshold sentence */
  const avg = askRate(overall);
  return avg == null ? threshold : `Your average across everything: ${pctOf(avg)}. ${threshold} Bars run to 50%; the faint line marks 25%.`;
}

/** The detail card's extra figures, from Analytics' rows: full requests and average days to a reply. */
export function detailFigures(qs: readonly Query[], rows: Map<string, AnalyticsRow>): { full: number; days: number | null } {
  let full = 0; const days: number[] = [];
  for (const q of qs) {
    const r = rows.get(q.id);
    if (!r) continue;
    if (r.reachedFull) full++;
    if (typeof r.replyDays === "number" && r.replyDays >= 0) days.push(r.replyDays);
  }
  return { full, days: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null };
}

/** The "too early" warning's words — null once the item qualifies. */
export function earlyWarning(s: Split): string | null {
  if (qualifies(s)) return null;
  if (!s.sent) return null;
  const need = MIN_SENDS_FOR_CLAIM - s.answered;
  return `Only ${s.answered} answered so far. Give it ${need} more before reading much into this.`;
}

/** "Tom Ellery, Jonathan Marsh and Clara Beaumont" — up to three named, newest first. */
export function namedAgents(names: readonly string[]): string {
  const n = names.filter(Boolean);
  if (!n.length) return "";
  if (n.length === 1) return n[0];
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n[0]}, ${n[1]} and ${n[2]}`;
}

/* ── the materials tables ── */
/** A material's second line (v26.1): its own summary, else "sent {n} · in {m} packages" with any zero part left out,
 *  else nothing. NEVER the type ("Query letter", "Synopsis") — the row's icon and its tab already say that. */
export function materialSummary(own: string | null | undefined, sent: number, inPackages: number): string {
  const s = (own ?? "").trim();
  if (s) return s;
  const parts: string[] = [];
  if (sent > 0) parts.push(`sent ${sent}`);
  if (inPackages > 0) parts.push(`in ${inPackages} package${inPackages === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

/** "The Trees, Small Pleasures +1" — the first two comps and a count of the rest. */
export function compsLine(names: readonly string[]): { text: string; more: number } | null {
  if (!names.length) return null;
  return { text: names.slice(0, 2).join(", "), more: Math.max(0, names.length - 2) };
}

/** A new letter's name after a fix-or-new "new": "Hook-first (2)", then (3)… — never a name already taken. */
export function copyName(name: string, taken: readonly string[]): string {
  const base = name.replace(/\s*\(\d+\)\s*$/, "").trim();
  const set = new Set(taken.map((t) => t.trim().toLowerCase()));
  for (let i = 2; i < 100; i++) { const c = `${base} (${i})`; if (!set.has(c.toLowerCase())) return c; }
  return `${base} (new)`;
}
