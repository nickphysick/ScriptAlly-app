/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SUBMISSION PACKAGES v40 — lifecycle and locking, and the one model behind Tracking & performance ══════════════
 *
 * Design authority: design-refs/submission-packages-v40/submission-packages-v40.html (`STG`, `dup`, `tpRender`,
 * `tmRender`, `tverdict`). Its names and figures are illustrative; every figure here comes from the app's data.
 *
 * ⚠️ ONE STAGE HELPER (A1): Retired · Out with agents (it has gone out: `firstSentAt` is set) · Ready (a letter and
 *    pages) · Draft. A missing synopsis never blocks Ready.
 * ⚠️ OUT WITH AGENTS MEANS LOCKED (A2). Nothing here starts an edition; a change is a new package made from it (A4).
 * ⚠️ ONE MODEL FOR THE FIGURES (H): Versions v2's. 5 sent before a percentage (`MIN_SENT_FOR_RATE`); Sent excludes
 *    withdrawn; Replied is `isReply`, Asked for more `isMore` (the history's request rung), Full request `reachedFull`
 *    among those; rate = asked for more ÷ sent. packageReplies' answer-based rule stays where its other callers use it.
 * ⚠️ A PIECE IS CREDITED FROM WHAT THE QUERY RECORDED (H3), whichever package it went in, or none: `sentVersions`
 *    when the query recorded its pieces, else its package's credited edition, and the pages through Versions v2's
 *    `resolveQueryVersion`. A query that recorded nothing is credited to no piece.
 */
import { dayMonth as formatDayMonth } from "./dates";
import { ComponentType, type ManuscriptVersion, type Query, type SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import type { V2Version } from "./bookVersions";
import { creditedSlot, creditedTo } from "./packageReplies";
import { counts, isMore, isReply, MIN_SENT_FOR_RATE, resolveQueryVersion } from "./versionsV2";

export { MIN_SENT_FOR_RATE };

/* ══ A · lifecycle ══════════════════════════════════════════════════════════════════════════════════════════ */

export type PackageStage = "draft" | "ready" | "out" | "retired";
type StagePkg = Pick<SubmissionPackage, "status" | "firstSentAt" | "queryLetterVersionId" | "bookVersionId">;

const filled = (v: string | undefined | null): boolean => !!v && !!v.trim();

/** A1 — the one stage. Retired wins; then gone out; then a letter and pages make it Ready. */
export function packageStage(p: StagePkg): PackageStage {
  if (p.status === "Retired") return "retired";
  if (p.firstSentAt) return "out";
  if (filled(p.queryLetterVersionId) && filled(p.bookVersionId)) return "ready";
  return "draft";
}
export const isLocked = (p: StagePkg): boolean => { const s = packageStage(p); return s === "out" || s === "retired"; };
export const STAGE_LABEL: Record<PackageStage, string> = { draft: "Draft", ready: "Ready", out: "Out with agents", retired: "Retired" };

/** A5 — Make active: a Ready package (the workbench), or a locked one that is not retired and not already active. */
export const canMakeActive = (p: StagePkg & Pick<SubmissionPackage, "id">, activeId: string | null | undefined): boolean => {
  const s = packageStage(p);
  return p.id !== activeId && (s === "ready" || s === "out");
};
/** A6 — Retire: a package that is out and not the active one. */
export const canRetire = (p: StagePkg & Pick<SubmissionPackage, "id">, activeId: string | null | undefined): boolean =>
  packageStage(p) === "out" && p.id !== activeId;
/** A7 — Delete: only a package that has never gone out. */
export const canDelete = (p: StagePkg): boolean => { const s = packageStage(p); return s === "draft" || s === "ready"; };
/** A7 — the button's words: "Delete draft" on a Draft, "Delete" on a Ready package. */
export const deleteLabel = (p: StagePkg): string => (packageStage(p) === "draft" ? "Delete draft" : "Delete");

/** The shelf (C2): the Out and Retired packages — the active one first, retired last, otherwise newest first. */
export function shelfPackages<T extends StagePkg & Pick<SubmissionPackage, "id" | "createdDate">>(pkgs: readonly T[], activeId: string | null | undefined): T[] {
  return pkgs.filter(isLocked).sort((a, b) =>
    Number(b.id === activeId) - Number(a.id === activeId)
    || Number(packageStage(a) === "retired") - Number(packageStage(b) === "retired")
    || (b.createdDate ?? "").localeCompare(a.createdDate ?? ""));
}
/** The workbench selector (E2): Draft and Ready packages only. */
export function workbenchPackages<T extends StagePkg>(pkgs: readonly T[]): T[] {
  return pkgs.filter((p) => !isLocked(p));
}

/** A4 — "{name} 2", or the next free number. */
export function nextCopyName(name: string, taken: readonly string[]): string {
  const set = new Set(taken.map((t) => t.trim().toLowerCase()));
  let n = 2;
  while (set.has(`${name} ${n}`.toLowerCase())) n++;
  return `${name} ${n}`;
}

/** A4 — what "New package from this" writes: the same pieces, extras, icon and note; nothing sent; `copiedFromId`. */
export function copyFields(p: SubmissionPackage, taken: readonly string[]): Omit<SubmissionPackage, "id" | "userId" | "status" | "createdDate"> {
  return {
    manuscriptId: p.manuscriptId,
    packageName: nextCopyName(p.packageName, taken),
    queryLetterVersionId: p.queryLetterVersionId ?? "",
    synopsisVersionId: p.synopsisVersionId ?? "",
    samplePagesVersionId: p.samplePagesVersionId ?? "",
    ...(filled(p.bookVersionId) ? { bookVersionId: p.bookVersionId } : {}),
    ...(p.otherMaterials?.trim() ? { otherMaterials: p.otherMaterials } : {}),
    extraIds: [...(p.extraIds ?? [])],
    ...(p.icon ? { icon: p.icon } : {}),
    ...(p.note?.trim() ? { note: p.note } : {}),
    copiedFromId: p.id,
  } as Omit<SubmissionPackage, "id" | "userId" | "status" | "createdDate">;
}
export const copyToast = (made: string, from: string): string => `Made ${made} from ${from}. ${from} stays as it was.`;

/* ══ H · the figures ════════════════════════════════════════════════════════════════════════════════════════ */

export interface Facts {
  /** sent, withdrawn excluded */
  n: number;
  replied: number;
  more: number;
  full: number;
  /** average days to a reply, from the log; null when no reply is dated */
  days: number | null;
  /** asked for more ÷ sent, 0–100, rounded; null under MIN_SENT_FOR_RATE */
  pct: number | null;
  /** the same share at any count (the 10-point gap and the bars read it, as the ref's `tpct`) */
  raw: number;
  early: boolean;
}

export function factsOf(qs: readonly Query[], rows: Map<string, AnalyticsRow>): Facts {
  const c = qs.filter(counts);
  const n = c.length;
  const more = c.filter((q) => isMore(q, rows));
  const days = c.map((q) => rows.get(q.id)?.replyDays).filter((d): d is number => typeof d === "number" && d >= 0);
  const raw = n ? Math.round((more.length / n) * 100) : 0;
  const early = n < MIN_SENT_FOR_RATE;
  return {
    n, replied: c.filter((q) => isReply(q, rows)).length, more: more.length,
    full: more.filter((q) => rows.get(q.id)?.reachedFull === true).length,
    days: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    pct: early ? null : raw, raw, early,
  };
}
export const EMPTY_FACTS: Facts = { n: 0, replied: 0, more: 0, full: 0, days: null, pct: null, raw: 0, early: true };

/** "40%" at the threshold, else "{q} of {n}", else "–". */
export const shareText = (f: Facts): string => (f.pct != null ? `${f.pct}%` : f.n ? `${f.more} of ${f.n}` : "–");

/** Every query credited to a package, every edition (A3: a package's figures count all its editions together). */
export const packageQueries = (p: Pick<SubmissionPackage, "id">, queries: Query[]): Query[] => creditedTo(p.id, queries);

export type PieceKind = "let" | "syn" | "ver";
export interface PieceContext {
  packages: SubmissionPackage[];
  materials: ManuscriptVersion[];
  versions: V2Version[];
}

/**
 * H3 — the piece a query went out with: an id; `"none"` for a synopsis slot that went out empty; null when the
 * query recorded nothing that names one (credited to no piece).
 */
export function pieceOf(q: Query, kind: PieceKind, ctx: PieceContext): string | null {
  if (kind === "ver") return resolveQueryVersion(q, ctx.versions, ctx.packages, ctx.materials)?.id ?? null;
  const type = kind === "let" ? ComponentType.QUERY_LETTER : ComponentType.SYNOPSIS;
  if (q.sentHow != null && Array.isArray(q.sentVersions)) {
    const ofType = new Set(ctx.materials.filter((m) => m.componentType === type).map((m) => m.id));
    const hit = q.sentVersions.find((id) => ofType.has(id));
    if (hit) return hit;
    if (q.sentHow === "unrecorded") return null;
    return kind === "syn" ? "none" : null;
  }
  const slot = creditedSlot(q, kind === "let" ? "letter" : "synopsis", ctx.packages);
  if (!slot) return null;
  if (slot.id) return slot.id;
  return kind === "syn" ? "none" : null;
}
export const queriesWithPiece = (queries: Query[], kind: PieceKind, id: string, ctx: PieceContext): Query[] =>
  queries.filter((q) => pieceOf(q, kind, ctx) === id);

/* ══ F · the Packages tab ═══════════════════════════════════════════════════════════════════════════════════ */

export const PIECES: [PieceKind, "queryLetterVersionId" | "synopsisVersionId" | "bookVersionId", string][] = [
  ["let", "queryLetterVersionId", "Letter"], ["syn", "synopsisVersionId", "Synopsis"], ["ver", "bookVersionId", "Pages"],
];
type PiecePkg = Pick<SubmissionPackage, "queryLetterVersionId" | "synopsisVersionId" | "bookVersionId">;
const slotOf = (p: PiecePkg, f: (typeof PIECES)[number][1]) => (p[f] ?? "").trim();
/** Which pieces differ between two packages, in the ref's order. */
export const piecesDiffer = (a: PiecePkg, b: PiecePkg) => PIECES.filter(([, f]) => slotOf(a, f) !== slotOf(b, f));

/** F2 — the verdict under head to head, the ref's `tverdict` verbatim: { lead (bold), rest }. */
export function headToHeadVerdict(aName: string, bName: string, diff: readonly (typeof PIECES)[number][], fa: Facts, fb: Facts): { lead: string; rest: string } {
  const what = diff.length === 1 ? `Only the ${diff[0][2].toLowerCase()} differs` : diff.length ? `${diff.length} things differ` : "They’re the same mix";
  const early = fa.n < MIN_SENT_FOR_RATE || fb.n < MIN_SENT_FOR_RATE;
  const gap = Math.abs(fa.raw - fb.raw);
  const leadName = fa.raw >= fb.raw ? aName : bName;
  if (early) return { lead: `${what}.`, rest: `Too early to call: ${fa.n} and ${fb.n} sent. Each needs ${MIN_SENT_FOR_RATE} before it counts.` };
  if (gap < 10) return { lead: `${what}.`, rest: `Too close to call: ${fa.raw}% against ${fb.raw}%. Keep sending.` };
  return { lead: `${what}${diff.length === 1 ? ", so that’s the likely reason" : ""}.`, rest: `${leadName} is ahead: ${Math.max(fa.raw, fb.raw)}% asked for more, against ${Math.min(fa.raw, fb.raw)}%.` };
}

/** F4 — a test's state pill: Running · Too close to call · "{name} ahead". */
export function testState(original: { name: string; f: Facts }, copy: { name: string; f: Facts }): { k: "run" | "tie" | "done"; label: string } {
  if (original.f.n < MIN_SENT_FOR_RATE || copy.f.n < MIN_SENT_FOR_RATE) return { k: "run", label: "Running" };
  if (Math.abs(original.f.raw - copy.f.raw) < 10) return { k: "tie", label: "Too close to call" };
  return { k: "done", label: `${copy.f.raw > original.f.raw ? copy.name : original.name} ahead` };
}
export function testFooter(fa: Facts, fb: Facts): string {
  const early = fa.n < MIN_SENT_FOR_RATE || fb.n < MIN_SENT_FOR_RATE;
  if (early) return `Each side needs ${MIN_SENT_FOR_RATE} sent. ${Math.max(0, MIN_SENT_FOR_RATE - fa.n) + Math.max(0, MIN_SENT_FOR_RATE - fb.n)} to go.`;
  return Math.abs(fa.raw - fb.raw) < 10 ? "Keep sending both; the gap will tell." : "Enough to go on. Keep sending to be sure.";
}

/** F2 defaults: A = the active package (else the most sent); B = the newest copied from A, else the next most sent. */
export function headToHeadDefaults<T extends Pick<SubmissionPackage, "id" | "createdDate" | "copiedFromId">>(live: readonly T[], activeId: string | null | undefined, sentOf: (p: T) => number): { a: T | null; b: T | null } {
  if (!live.length) return { a: null, b: null };
  const bySent = [...live].sort((x, y) => sentOf(y) - sentOf(x));
  const a = live.find((p) => p.id === activeId) ?? bySent[0];
  const copies = live.filter((p) => p.copiedFromId === a.id).sort((x, y) => (y.createdDate ?? "").localeCompare(x.createdDate ?? ""));
  const b = copies[0] ?? bySent.find((p) => p.id !== a.id) ?? a;
  return { a, b };
}

/** F3 — a scoreboard column's order: those at the threshold first, by share; then the early ones. */
export function rankColumn<T extends { f: Facts }>(items: readonly T[]): T[] {
  return items.filter((o) => o.f.n > 0).sort((x, y) => Number(!y.f.early) - Number(!x.f.early) || y.f.raw - x.f.raw);
}

/* ══ G · the Query letters and Synopses tabs ════════════════════════════════════════════════════════════════ */

export interface MatCard { id: string; name: string; none?: boolean; f: Facts }

/** G2 — the order of the cards, the ref's: rated first, then share, then sent, the No synopsis card last among equals. */
export function orderMatCards<T extends MatCard>(cards: readonly T[]): T[] {
  return [...cards].sort((a, b) => Number(!b.f.early) - Number(!a.f.early) || b.f.raw - a.f.raw || b.f.n - a.f.n || Number(!!a.none) - Number(!!b.none));
}
/** G2 — the leader: at least 10 points clear, both at the threshold. */
export function matLeader<T extends MatCard>(cards: readonly T[]): T | null {
  const ready = cards.filter((c) => !c.f.early).sort((a, b) => b.f.raw - a.f.raw);
  return ready.length > 1 && ready[0].f.raw - ready[1].f.raw >= 10 ? ready[0] : null;
}
/** G2 — the verdict, `tmRender`'s three cases verbatim: { lead (bold), rest }. */
export function matVerdict<T extends MatCard>(cards: readonly T[], kind: "let" | "syn"): { lead: string; rest: string } {
  const noun = kind === "let" ? "letter" : "synopsis", nouns = kind === "let" ? "letters" : "synopses";
  const ready = cards.filter((c) => !c.f.early).sort((a, b) => b.f.raw - a.f.raw);
  const nm = (c: T) => (c.none ? "Sending no synopsis" : c.name);
  if (ready.length < 2) {
    const need = Math.max(0, 2 - ready.length);
    return { lead: "Too early to call.", rest: `${ready.length ? `${nm(ready[0])} has ${ready[0].f.n} sent. ` : ""}${need === 2 ? "Two" : "One more"} ${need === 2 ? nouns : noun} need${need === 2 ? "" : "s"} ${MIN_SENT_FOR_RATE} sent each before this compares them.` };
  }
  const lead = matLeader(cards);
  if (!lead) return { lead: "Too close to call.", rest: `${nm(ready[0])} and ${nm(ready[1])} are within a few points: ${ready[0].f.raw}% against ${ready[1].f.raw}%. Keep sending.` };
  const second = ready.find((c) => c !== lead)!;
  return { lead: `${nm(lead)} is ahead.`, rest: `${lead.f.raw}% asked for more from ${lead.f.n} sent, against ${second.f.raw}% for ${second.none ? "no synopsis" : second.name}.` };
}

/* "12 Sep", as the ref writes it — the app's one formatter (lib/dates), from a millisecond count */
export const dayMonth = (ms: number | null | undefined): string => (ms == null || !Number.isFinite(ms) ? "" : formatDayMonth(ms));
