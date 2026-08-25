/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE PACKAGE DRAWER — what a card cannot say ═══════════════════════════════════════════════
 *
 * Design authority: design-refs/package-drawer.html.
 *
 * ⚠️ IT READS; IT DOES NOT EDIT (D16). Every derivation here is read-only, and the drawer's only
 * actions are in its footer. A drawer that edited would need a draft, a discard and a dirty check,
 * and would stop being the cheap "what IS this?" the card cannot answer.
 *
 * ⚠️ AND NOTHING HERE COUNTS A HOLDER IT CANNOT NAME (D17). The versions lane's ruling, applied one
 * surface along: an unknown is never folded into a known. A query with no resolvable agent is
 * reported as unnamed, never dropped and never guessed at.
 */
import { ComponentType } from "../types";
import type { Agent, BookVersion, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import { SLOT_FIELD, TYPE_META, BUILDER_TYPES } from "../components/packages/typeMeta";
import { isSlotFilled, isRequest, isResponse } from "./packageMetrics";
import { bookVersionOf } from "./bookVersions";
import { wordsPhrase } from "./materialDraft";
import { agentPrimary, agentSecondary, AGENT_NOT_RECORDED } from "./agentDisplay";

export interface DrawerSlot {
  type: ComponentType;
  /** `Covering letter` / `Synopsis` / `Sample pages`. */
  label: string;
  /** The material's id, for `Open material ›`. Null when the slot is empty. */
  materialId: string | null;
  /** The material's name, or null when the slot is empty. */
  name: string | null;
  /**
   * `412 words` / `1 word`, or **null where nothing is known** (D1/D2).
   *
   * ⚠️ IT COMES FROM `wordsPhrase`, THE ONE PHRASE, because this field used to interpolate
   * `${wordCount} words` and rendered "1 WORDS" and "0 WORDS" in the band. The correct form already
   * existed in `sourceLabel` three files away — the fault was a second copy, not a missing rule.
   */
  words: string | null;
  /** The material's opening prose. The two-line clamp is the STYLESHEET's job, not a substring. */
  opening: string | null;
  /**
   * The BOOK version this sample excerpts (D11) — inherited THROUGH the material, never stored on
   * the package. Null on every slot but the sample, and on a sample carrying none.
   */
  versionName: string | null;
}

/**
 * The three slots, resolved.
 *
 * ⚠️ THE SLOTS RESOLVE AGAINST THE FULL MATERIAL LIST, INCLUDING ARCHIVED ONES. That is the archive
 * model: putting a letter away takes it off the working shelf and must never turn a package holding
 * it into a package missing one. Filtering here would make archiving indistinguishable from
 * deleting — the one thing it exists to avoid.
 *
 * ⚠️ AND AN EMPTY SLOT IS STILL A ROW. A slot that vanished would state nothing; a row reading
 * "Not included" states that the package does not carry one, which is the fact.
 */
export const drawerSlots = (
  pkg: SubmissionPackage,
  materials: readonly ManuscriptVersion[],
  bookVersions: readonly BookVersion[],
): DrawerSlot[] =>
  BUILDER_TYPES.map((type) => {
    const id = pkg[SLOT_FIELD[type]];
    const m = isSlotFilled(id) ? materials.find((v) => v.id === id) ?? null : null;
    const bvId = m ? bookVersionOf(m) : null;
    return {
      type,
      label: TYPE_META[type].label,
      materialId: m?.id ?? null,
      name: m?.versionName ?? null,
      words: m ? wordsPhrase(m) : null,
      /* ⚠️ THE WHOLE BODY, NOT A SUBSTRING. Clamping in JS bakes a line count into the data, which
         is wrong at every width but the one it was cut for; `-webkit-line-clamp` clamps what is
         rendered. A material with no pasted body (a `ref`) has no opening to show. */
      opening: m?.contentDraft?.trim() || null,
      versionName:
        bvId && bookVersions.length >= 2
          ? bookVersions.find((b) => b.id === bvId)?.name ?? null
          : null,
    };
  });

export interface DrawerHolder {
  queryId: string;
  agent: string;
  agency: string | null;
  sentDate: string | null;
  status: Query["status"];
}

/**
 * Who has it (D12) — every query carrying this package. Fully derived.
 *
 * ⚠️ AN UNRESOLVABLE AGENT IS NAMED AS UNRECORDED, NOT DROPPED (D17). Dropping the row would make
 * the list disagree with the scorecard's "6 sent" — the count would say six and the list would show
 * five, with nothing saying why. The versions lane learned this one denominator along: an unknown is
 * reported, never folded into the known and never inferred.
 */
export const drawerHolders = (
  pkgId: string,
  queries: readonly Query[],
  agents: readonly Agent[],
): DrawerHolder[] =>
  queries
    .filter((q) => q.packageId === pkgId)
    .map((q) => {
      const a = agents.find((x) => x.id === q.agentId) ?? null;
      return {
        queryId: q.id,
        agent: a ? agentPrimary(a) : AGENT_NOT_RECORDED,
        agency: a ? agentSecondary(a) || null : null,
        sentDate: (q.dateSent as string | undefined) ?? null,
        status: q.status,
      };
    })
    .sort((x, y) => ((x.sentDate ?? "") < (y.sentDate ?? "") ? 1 : (x.sentDate ?? "") > (y.sentDate ?? "") ? -1 : 0));

/**
 * What came back (D13) — ONE line, not three bars.
 *
 * ⚠️ THE REF DRAWS A ROW PER MATERIAL AND ALL THREE READ THE SAME. Every material in a package rides
 * the same sends, so per-material figures are identical by construction: three rows saying
 * "2 requests from 6 sent" are true, look broken, and invite the reader to hunt for a difference
 * that cannot exist. The package is the unit that was sent, so the package is the unit that reports.
 */
export const drawerReturns = (pkgId: string, queries: readonly Query[]) => {
  const mine = queries.filter((q) => q.packageId === pkgId);
  return {
    sent: mine.length,
    replied: mine.filter(isResponse).length,
    requests: mine.filter(isRequest).length,
  };
};

/** `6 sent · 3 replied · 2 requests` — the returns line, agreeing its verbs. */
export const returnsLine = (r: { sent: number; replied: number; requests: number }): string =>
  `${r.sent} sent · ${r.replied} replied · ${r.requests} ${r.requests === 1 ? "request" : "requests"}`;

/**
 * The lock footnote (D14) — the reason, not the rule.
 *
 * ⚠️ IT NAMES WHAT THE LOCK BUYS. "Contents are fixed" alone reads as a restriction someone imposed;
 * the second clause says what it is for, which is the only thing that makes it acceptable to a
 * writer who wanted to change something and cannot.
 */
export const LOCK_FOOTNOTE =
  "Contents are fixed because this package has been sent — that's what keeps every figure above true.";
