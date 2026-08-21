/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the overview rail's registers and the how-it-works progress, derived.
 * Design authority: design-refs/submission-packages-restructure.html.
 *
 * ⚠️ EVERYTHING HERE IS DERIVED AT READ TIME AND NOTHING IS STORED (restructure D2). Empty versus
 * in-use is a count of the records that already exist; the infographic's three ticks are the same
 * counts plus a count of queries carrying a package. There is no `hasSeenOverview`, no stored step
 * and no progress field — a flag would be a second source of truth for something the data already
 * answers, and it would drift the first time a writer deleted their last package.
 *
 * ⚠️ THE COUNTING IS `packageMetrics`'s, NEVER A SECOND IMPLEMENTATION. `sent` and `replies` come
 * from `packageMetrics(pkgId, queries)` and requests from `materialUsage`, so the rail cannot
 * disagree with the analytics view it hands off to — which is the same rule the dashboard and the
 * To-do board had to be reconciled onto after they counted "urgent" two different ways.
 *
 * Pure: no Firestore, no clock of its own (`now` is injected), no React.
 */
import { ManuscriptVersion, SubmissionPackage, Query, ComponentType } from "../types";
import { packageMetrics, isRequest, isSlotFilled } from "./packageMetrics";
import { TYPE_META, BUILDER_TYPES, SLOT_FIELD } from "../components/packages/typeMeta";
import { versionMeta } from "./packageMetrics";
import { agoLabel, daysBetween } from "./elapsed";
import { sourceLabel } from "./materialDraft";

/* ══════════════════════════════════════════════════════════════════════════════
   MATERIALS
   ══════════════════════════════════════════════════════════════════════════════ */

export interface MaterialRow {
  id: string;
  /** The type eyebrow — read from `TYPE_META`, never typed as a literal. */
  typeLabel: string;
  /** The writer's own name for this version. */
  name: string;
  /** Mono detail line — the material's SOURCE (`Text · N words` / `Ref · file`). Never empty. */
  detail: string;
}

/**
 * The Materials register.
 *
 * ⚠️ THE DETAIL LINE IS NOW THE MATERIAL'S SOURCE, NOT ITS AGE (flow pack D2) — `Text · 412 words`,
 * `Ref · hook-first.docx`. The restructure's "added N ago" was what the register could honestly say
 * when a material had no recorded source; now that every one does, describing what the record IS
 * beats describing when it arrived. `materialDetail` / `addedLabel` below are kept and still locked:
 * the rule they encode — never label a created date as an edit, never invent a version number — is
 * the reason this line is not "edited 4 days ago", and it applies wherever a date is next shown.
 *
 * Grouped by `BUILDER_TYPES` canonical order, newest first inside each type. Full Manuscript is
 * absent because `BUILDER_TYPES` excludes it — the standing law that it is not a package material.
 */
export function materialRows(versions: ManuscriptVersion[], now: number): MaterialRow[] {
  const rows: MaterialRow[] = [];
  for (const type of BUILDER_TYPES) {
    const mine = versions
      .filter((v) => v.componentType === type)
      .sort((a, b) => Date.parse(b.createdDate ?? "") - Date.parse(a.createdDate ?? ""));
    for (const v of mine) {
      rows.push({
        id: v.id,
        typeLabel: TYPE_META[type].label,
        name: v.versionName,
        /* ⚠️ THE SOURCE LABEL SUPERSEDES THE RESTRUCTURE'S "added N ago" (flow pack D2). That line
           existed because the register had nothing else true to say about a material; each one now
           has a real source, which is both more useful and more honest — it describes what the
           record IS rather than when it arrived. `materialDetail` and `addedLabel` survive below,
           still unit-locked, because the honesty rule they encode (never call a created date an
           edit) is worth keeping wherever a date is next shown. */
        detail: sourceLabel(v),
      });
    }
  }
  return rows;
}

/** Word count (where a draft exists) then the added date, joined with the record interpunct. */
export function materialDetail(v: ManuscriptVersion, now: number): string {
  const parts: string[] = [];
  const meta = versionMeta(v);
  if (meta) parts.push(meta);
  const added = addedLabel(v.createdDate, now);
  if (added) parts.push(added);
  /* An undated draft with no text has nothing true to say about itself. "—" states that the line
     is empty rather than inventing a date, which is the row's own version of the `0`-vs-`—` split
     the manuscript plate draws. */
  return parts.length ? parts.join(" · ") : "—";
}

/** "added today" / "added 4 days ago" — the app's ONE elapsed formatter, never a second one. */
export function addedLabel(createdDate: string | undefined, now: number): string | null {
  if (!createdDate) return null;
  const ms = Date.parse(createdDate);
  if (Number.isNaN(ms)) return null;
  return `added ${agoLabel(daysBetween(ms, now))}`;
}

/* ══════════════════════════════════════════════════════════════════════════════
   PACKAGES
   ══════════════════════════════════════════════════════════════════════════════ */

export interface PackageRow {
  id: string;
  name: string;
  /** "Hook-first · One-page · Chapters 1–3" — null when no slot is filled. */
  composition: string | null;
  /** "Sent with 6 queries" / "Not sent yet". */
  sentLine: string;
  sent: number;
}

/**
 * The Packages register.
 *
 * ⚠️ THE COMPOSITION LINE IS RESOLVED FROM REAL REFERENCES. `SubmissionPackage` holds three
 * version ids, so each name is looked up rather than reconstructed from prose — the legacy
 * free-text `*Details` fields the brief asked about do not exist in this codebase. A slot pointing
 * at a version that has since been deleted resolves to nothing and is simply omitted, which is
 * honest: the package no longer contains it.
 */
export function packageRows(
  packages: SubmissionPackage[],
  versions: ManuscriptVersion[],
  queries: Query[],
): PackageRow[] {
  const byId = new Map(versions.map((v) => [v.id, v]));
  return packages.map((p) => {
    const names = BUILDER_TYPES.map((t) => {
      const id = p[SLOT_FIELD[t]];
      if (!isSlotFilled(id)) return null;
      return byId.get(id)?.versionName ?? null;
    }).filter((n): n is string => !!n && n.trim().length > 0);
    const { sent } = packageMetrics(p.id, queries);
    return {
      id: p.id,
      name: p.packageName,
      composition: names.length ? names.join(" · ") : null,
      sentLine: sentLine(sent),
      sent,
    };
  });
}

/**
 * ⚠️ ZERO IS A SENTENCE, NOT A COUNT, HERE. "Sent with 0 queries" is technically true and reads as
 * a malfunction; the row is prose about what has happened to the package, so absence is stated in
 * words. This is the same split the manuscript plate makes when two counts read `0` and the third
 * reads `—`: a true count prints, a non-event does not get a number.
 */
export const sentLine = (sent: number): string =>
  sent === 0 ? "Not sent yet" : `Sent with ${sent} quer${sent === 1 ? "y" : "ies"}`;

/* ══════════════════════════════════════════════════════════════════════════════
   TRACKING
   ══════════════════════════════════════════════════════════════════════════════ */

export interface TrackingRow {
  key: "replies" | "requests";
  name: string;
  detail: string;
}

/** Queries that carry a package at all — the "anything has gone out" test, and step 3's LIVE. */
export const packagedQueries = (packages: SubmissionPackage[], queries: Query[]): Query[] => {
  const ids = new Set(packages.map((p) => p.id));
  return queries.filter((q) => !!q.packageId && ids.has(q.packageId));
};

/** Replies across every package — the Tracking head's chip. */
export function replyCount(packages: SubmissionPackage[], queries: Query[]): number {
  return packages.reduce((n, p) => n + packageMetrics(p.id, queries).responses, 0);
}

/**
 * The Tracking register: two summary rows, each a route into the existing analytics view.
 *
 * ⚠️ THESE ARE SUMMARIES OF A VIEW THAT ALREADY EXISTS, NOT A SECOND ANALYTICS. Every figure comes
 * from `packageMetrics`, which is what the Analytics surface itself reads, so the rail can only
 * ever agree with the page it opens.
 *
 * Empty when nothing has gone out — the panel states that in prose instead (D6), because a row
 * reading "0 of 0 replied" asserts a measurement nobody has taken.
 */
export function trackingRows(
  packages: SubmissionPackage[],
  versions: ManuscriptVersion[],
  queries: Query[],
): TrackingRow[] {
  const sentQ = packagedQueries(packages, queries);
  if (sentQ.length === 0) return [];

  /* The busiest package leads the row — the one whose figures are worth quoting. Ties keep the
     first in the caller's order, which is the order the register itself lists them in. */
  let lead: { name: string; sent: number; replies: number } | null = null;
  for (const p of packages) {
    const m = packageMetrics(p.id, queries);
    if (m.sent === 0) continue;
    if (!lead || m.sent > lead.sent) lead = { name: p.packageName, sent: m.sent, replies: m.responses };
  }

  const requests = sentQ.filter(isRequest).length;

  const rows: TrackingRow[] = [];
  if (lead) {
    rows.push({
      key: "replies",
      name: "Replies by package",
      detail: `${lead.name} · ${lead.replies} of ${lead.sent} replied`,
    });
  }
  rows.push({
    key: "requests",
    name: "Requests by material",
    detail: requests === 0
      ? "No requests yet"
      : `${requests} request${requests === 1 ? "" : "s"} logged`,
  });
  return rows;
}

/* ══════════════════════════════════════════════════════════════════════════════
   HOW IT WORKS — the infographic doubles as progress (D3)
   ══════════════════════════════════════════════════════════════════════════════ */

export interface StepState {
  /** Sage tick + filled step number. */
  done: boolean;
  /** The pink LIVE treatment — step 3 only. */
  live: boolean;
  /** The chip's text, or null when the step has not been reached. */
  tick: string | null;
}

/**
 * The three steps' derived state.
 *
 * ⚠️ THE INPUTS ARE COUNTS THE CALLER ALREADY HAS, and they are the SAME counts the rail's chips
 * render. One derivation feeding both is what stops the infographic claiming "2 BUILT" beside a
 * register listing three — the reconciliation failure that had the dashboard and the board
 * disagreeing about the word "urgent".
 */
export function howItWorks(materialCount: number, packageCount: number, liveCount: number): [StepState, StepState, StepState] {
  return [
    { done: materialCount > 0, live: false, tick: materialCount > 0 ? `✓ ${materialCount} ADDED` : null },
    { done: packageCount > 0, live: false, tick: packageCount > 0 ? `✓ ${packageCount} BUILT` : null },
    { done: liveCount > 0, live: liveCount > 0, tick: liveCount > 0 ? "● LIVE" : null },
  ];
}

/* ══════════════════════════════════════════════════════════════════════════════
   THE WORKING STAGE — package tiles (flow pack D7)
   ══════════════════════════════════════════════════════════════════════════════ */

export interface TileSlot { label: string; name: string | null }

export interface PackageTile {
  id: string;
  name: string;
  /** Three rows, always — an empty sample says "Not included" rather than vanishing. */
  slots: TileSlot[];
  sent: number;
  replies: number;
  requests: number;
}

/**
 * One tile per package, with its composition and its scorecard.
 *
 * ⚠️ ALL THREE SLOT ROWS ALWAYS RENDER, even when the sample is empty. A row that disappears states
 * nothing; `Not included` states that the slot was considered and left out — which is the same split
 * the Submission-packages pane already makes with its `—`, and what earns the tile the right to be
 * read as a complete description of what goes in the envelope.
 *
 * ⚠️ AND THE FIGURES ARE `packageMetrics`'s, NOT COUNTERS. The ref's mockup stores `sent`/`replies`
 * on the package because a mockup has nowhere else to put them; here they are derived from the
 * queries at read time (D1), so nothing can drift and deleting a query moves the tile.
 */
export function packageTiles(
  packages: SubmissionPackage[],
  versions: ManuscriptVersion[],
  queries: Query[],
): PackageTile[] {
  const byId = new Map(versions.map((v) => [v.id, v]));
  return packages.map((p) => {
    const m = packageMetrics(p.id, queries);
    const mine = queries.filter((q) => q.packageId === p.id);
    return {
      id: p.id,
      name: p.packageName,
      slots: BUILDER_TYPES.map((t) => {
        const id = p[SLOT_FIELD[t]];
        return {
          label: TYPE_META[t].label,
          name: isSlotFilled(id) ? byId.get(id)?.versionName ?? null : null,
        };
      }),
      sent: m.sent,
      replies: m.responses,
      requests: mine.filter(isRequest).length,
    };
  });
}

/** The tile's footer, in the ref's words. Absence is a sentence; presence is three counts. */
export function tileFooter(t: PackageTile): { idle: string } | { out: string; replied: string; requests: string } {
  if (t.sent === 0) return { idle: "Not yet sent — attach it when you log a query" };
  return {
    out: `→ ${t.sent} sent`,
    replied: `← ${t.replies} replied`,
    requests: `${t.requests} ${t.requests === 1 ? "request" : "requests"}`,
  };
}

/* ══════════════════════════════════════════════════════════════════════════════
   THE MATERIALS BAND — three columns by type (broadsheet D3)
   ══════════════════════════════════════════════════════════════════════════════ */

export interface MaterialSheet {
  id: string;
  typeLabel: string;
  name: string;
  /** `Text · N words` / `Ref · file.docx` — the flow pack's source label. */
  source: string;
  /** `In N packages` / `Not in a package yet` — derived, never stored. */
  usage: string;
  /** How many packages reference it — the delete guard reads the same number. */
  usedIn: number;
}

export interface MaterialColumn {
  type: ComponentType;
  /** Plural heading: "Covering letters" / "Synopses" / "Sample pages". */
  heading: string;
  held: number;
  sheets: MaterialSheet[];
  /** The per-column ghost's wording, per the ref. */
  ghostLabel: string;
}

/** The ref's per-column ghost wording — its own phrasing per type, not a template. */
const GHOST_LABEL: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "Add a letter",
  [ComponentType.SYNOPSIS]: "Add a synopsis",
  [ComponentType.SAMPLE_PAGES]: "Add sample pages",
};

/**
 * The three type columns.
 *
 * ⚠️ THE USAGE LINE AND THE DELETE GUARD READ THE SAME NUMBER. `usedIn` is what the sheet prints as
 * "In 2 packages" and what the guard uses to refuse the delete — one derivation, so the sheet can
 * never say a material is free while the guard says it is held.
 */
export function materialColumns(
  versions: ManuscriptVersion[],
  packages: SubmissionPackage[],
): MaterialColumn[] {
  return BUILDER_TYPES.map((type) => {
    const mine = versions
      .filter((v) => v.componentType === type)
      .sort((a, b) => Date.parse(b.createdDate ?? "") - Date.parse(a.createdDate ?? ""));
    return {
      type,
      heading: TYPE_META[type].plural,
      held: mine.length,
      ghostLabel: GHOST_LABEL[type],
      sheets: mine.map((v) => {
        const used = packagesUsing(v.id, packages).length;
        return {
          id: v.id,
          typeLabel: TYPE_META[type].label,
          name: v.versionName,
          source: sourceLabel(v),
          usage: usageLine(used),
          usedIn: used,
        };
      }),
    };
  });
}

/** Every package referencing this material, by any slot. The one definition of "referenced". */
export const packagesUsing = (versionId: string, packages: SubmissionPackage[]): SubmissionPackage[] =>
  packages.filter((p) => BUILDER_TYPES.some((t) => {
    const id = p[SLOT_FIELD[t]];
    return isSlotFilled(id) && id === versionId;
  }));

/**
 * ⚠️ ZERO IS A SENTENCE HERE, NOT A COUNT. "In 0 packages" is true and reads as a malfunction; the
 * line is prose about where a material sits, so absence is stated in words — the same split the
 * package row makes with "Not sent yet".
 */
export const usageLine = (used: number): string =>
  used === 0 ? "Not in a package yet" : `In ${used} ${used === 1 ? "package" : "packages"}`;
