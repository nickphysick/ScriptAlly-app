/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 — what the page reads about each package, derived once per render from the packages model
 * (usePk26Model): its pieces by name, its three counts, its verdict, its first send, who got it, and the package it
 * was copied from. Every word and rule is lib/packagesV62's; this file only joins the data to them.
 *
 * ⚠️ SENT = GONE OUT: the lock stamp (`firstSentAt`) or any query logged with it (an older query predates the stamp),
 *    the model's own `goneOut`. A sent or retired package is read-only.
 * ⚠️ NAMES INCLUDE THE PUT-AWAY: a sent package keeps showing the letter, synopsis or archived version it went with.
 */
import { useCallback, useMemo } from "react";
import type { PackageExtra, Query, SubmissionPackage } from "../../../types";
import { readVersions } from "../../../lib/bookVersions";
import { dayMonth } from "../../../lib/packagesV40";
import { statusWords } from "../../queryActions/journeys/common";
import {
  changesFrom, copiedFromTail, countsOf, isFinished, NO_COUNTS, sentIn, verdictOf, type Counts, type Verdict,
} from "../../../lib/packagesV62";
import type { MaterialRow, Pk26Model } from "../v26/usePk26Model";

export interface Piece { id: string; name: string; desc: string }
export interface WhoRow { id: string; status: string; words: string; name: string; agency: string; date: string }
export interface PkInfo {
  p: SubmissionPackage;
  retired: boolean;
  sent: boolean;
  /** sent or retired: no controls */
  ro: boolean;
  finished: boolean;
  inUse: boolean;
  counts: Counts;
  verdict: Verdict | null;
  firstMs: number | null;
  sentIn: string | null;
  letter: Piece | null;
  version: Piece | null;
  synopsis: Piece | null;
  /** the extras it sends, by name, in the manuscript's order (a sent package: the names it went with) */
  extras: string[];
  parent: SubmissionPackage | null;
  queries: Query[];
}

const words = (n: number | null): string => (n && n > 0 ? `${n.toLocaleString("en-GB")} words` : "");
const joinDesc = (...parts: string[]) => parts.map((s) => s.trim()).filter(Boolean).join(" · ");

export function usePk62(model: Pk26Model) {
  const { msPkgs, active, msQueries, rowsById, lettersAll, synopsesAll, versionRows, extras, comps, activeMs, goneOut, creditedQueries, agents } = model;
  const allVersions = useMemo(() => readVersions(activeMs), [activeMs]);

  const letterOf = useCallback((m: MaterialRow | undefined): Piece | null => {
    if (!m) return null;
    const named = (m.compIds ?? []).map((id) => comps.find((c) => c.id === id)?.title).filter((t): t is string => !!t);
    return { id: m.id, name: m.name, desc: m.summary.trim() || (named.length ? `Names ${named.join(", ")}` : "") };
  }, [comps]);
  const synopsisOf = useCallback((m: MaterialRow | undefined): Piece | null => (m ? { id: m.id, name: m.name, desc: joinDesc(m.summary, words(m.words)) } : null), []);
  const versionOf = useCallback((id: string | undefined): Piece | null => {
    if (!id || !id.trim()) return null;
    const row = versionRows.find((v) => v.id === id);
    if (row) return { id, name: row.name, desc: row.summary };
    const v = allVersions.find((x) => x.id === id);
    return v ? { id, name: v.name, desc: v.changes?.[0] ?? "" } : null;
  }, [versionRows, allVersions]);

  const letters = useMemo(() => lettersAll.filter((m) => !m.retired).map((m) => letterOf(m)!), [lettersAll, letterOf]);
  const synopses = useMemo(() => synopsesAll.filter((m) => !m.retired).map((m) => synopsisOf(m)!), [synopsesAll, synopsisOf]);
  const versions = useMemo(() => versionRows.map((v) => ({ id: v.id, name: v.name, desc: v.summary })), [versionRows]);
  /* ⚠️ A PUT-AWAY MATERIAL STILL HAS A WAY BACK: the letter and synopsis lists offer the put-away ones on request */
  const lettersAway = useMemo(() => lettersAll.filter((m) => m.retired).map((m) => letterOf(m)!), [lettersAll, letterOf]);
  const synopsesAway = useMemo(() => synopsesAll.filter((m) => m.retired).map((m) => synopsisOf(m)!), [synopsesAll, synopsisOf]);

  const rowOf = useCallback((q: Pick<Query, "status">) => rowsById.get((q as Query).id), [rowsById]);

  const infos = useMemo(() => {
    const out = new Map<string, PkInfo>();
    const now = Date.now();
    for (const p of msPkgs) {
      const qs = [...creditedQueries(p)].sort((a, b) => (rowsById.get(a.id)?.sentMs ?? 0) - (rowsById.get(b.id)?.sentMs ?? 0));
      const counts = qs.length ? countsOf(qs, rowOf) : NO_COUNTS;
      const retired = p.status === "Retired";
      const sent = goneOut(p);
      const times = qs.map((q) => rowsById.get(q.id)?.sentMs).filter((t): t is number => typeof t === "number" && Number.isFinite(t));
      const stamp = p.firstSentAt ? Date.parse(p.firstSentAt) : NaN;
      const firstMs = times.length ? Math.min(...times) : sent && Number.isFinite(stamp) ? stamp : null;
      const ids = new Set(p.extraIds ?? []);
      const ticked = extras.filter((e: PackageExtra) => ids.has(e.id)).map((e) => e.name.trim()).filter(Boolean);
      const went = (p.otherMaterials ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      out.set(p.id, {
        p, retired, sent, ro: sent || retired, finished: isFinished(p), inUse: !!active && active.id === p.id && !retired,
        counts, verdict: verdictOf(counts, retired), firstMs, sentIn: sent ? sentIn(firstMs, now) : null,
        letter: letterOf(lettersAll.find((m) => m.id === p.queryLetterVersionId)),
        version: versionOf(p.bookVersionId),
        synopsis: synopsisOf(synopsesAll.find((m) => m.id === p.synopsisVersionId)),
        extras: sent && went.length ? went : ticked,
        parent: p.copiedFromId ? msPkgs.find((x) => x.id === p.copiedFromId) ?? null : null,
        queries: qs,
      });
    }
    return out;
  }, [msPkgs, creditedQueries, rowsById, rowOf, goneOut, extras, active, lettersAll, synopsesAll, letterOf, synopsisOf, versionOf]);

  const info = useCallback((p: SubmissionPackage): PkInfo => infos.get(p.id)!, [infos]);

  /** "Who got it": oldest first, by the names Analytics shows (the identity-anchor rule). */
  const whoGot = useCallback((i: PkInfo): WhoRow[] => i.queries.map((q) => {
    const row = rowsById.get(q.id);
    const a = agents.find((x) => x.id === q.agentId);
    return {
      id: q.id, status: String(q.status), words: statusWords(q.status),
      name: row?.agentName || a?.name || a?.agency || "An agent no longer on file",
      agency: row?.agentSub ?? a?.agency ?? "",
      date: dayMonth(row?.sentMs ?? null),
    };
  }), [rowsById, agents]);

  /** The chips for what changed since the parent (§6.5), and the parent's own "{a} of {r}". */
  const compare = useCallback((i: PkInfo): { name: string; tail: string | null; chips: string[] } | null => {
    if (!i.parent) return null;
    const par = infos.get(i.parent.id);
    if (!par) return null;
    const nameOf = (k: "version" | "letter" | "synopsis", id: string) =>
      k === "version" ? versionOf(id)?.name ?? null
        : (k === "letter" ? lettersAll : synopsesAll).find((m) => m.id === id)?.name ?? null;
    const extraName = (id: string) => extras.find((e) => e.id === id)?.name ?? null;
    return { name: i.parent.packageName, tail: copiedFromTail(par.counts), chips: changesFrom(i.parent, i.p, nameOf, extraName) };
  }, [infos, versionOf, lettersAll, synopsesAll, extras]);

  /** Every package's counts together (the table's foot): the sent ones only. */
  const totals = useMemo(() => {
    const t = { sent: 0, replied: 0, asked: 0 };
    for (const i of infos.values()) { t.sent += i.counts.sent; t.replied += i.counts.replied; t.asked += i.counts.asked; }
    return t;
  }, [infos]);

  return { info, infos, letters, synopses, versions, lettersAway, synopsesAway, whoGot, compare, totals };
}

export type Pk62 = ReturnType<typeof usePk62>;
