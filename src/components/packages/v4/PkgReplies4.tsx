/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 Part E — THE BANNER AND "WHAT'S GETTING REPLIES". v3 Part E's derivations
 * (`lib/packageReplies`), laid out as one white sheet: a navy top row with Package · Letter · Synopsis · Version,
 * a lead row of four facts, a heading strip whose headings sort, the rows, and a foot with the key.
 *
 * ⚠️ ALL EDITIONS HERE. The table answers "what has this package (or this letter) done, ever"; the card's foot and
 *    the drawer's cells answer for the CURRENT edition. Both are stated where they are read.
 * ⚠️ "FEWER THAN 4 ANSWERED" ALWAYS SORTS LAST, whichever heading is pressed and in either direction (`sortRows`).
 *    Such a row is listed, never compared, and never fills a lead cell.
 * ⚠️ FACTUAL LABELS ONLY (the D6 reversal note): "Highest reply rate", "Most requests" — no row is called best.
 * ⚠️ THE BANNER IS PAGE-LOCAL: the Query Centre's blush banner was a shell component (`OpenBanner`) and is gone.
 *    Its blush reaches the sheet's edges by a spread shadow clipped to its own height, so it takes no width.
 */
import React, { useState } from "react";
import type { SubmissionPackage } from "../../../types";
import type { MatKind } from "../../../lib/packagesPage";
import {
  leadOf, MIN_SENDS_FOR_CLAIM, pct, qualifies, sortRows, type RankRow, type SortKey, type Split,
} from "../../../lib/packageReplies";
import { ICON, KIND_ICON, SplitBar, SplitKey, pkgs, qs } from "./parts";
import type { MaterialWithNote } from "./usePackagesModel";

export type ByKind = "package" | MatKind;
const BY_KEY = "sa.pk4.repliesBy";
const BY_LABEL: Record<ByKind, string> = { package: "Package", letter: "Letter", synopsis: "Synopsis", version: "Version" };
const BY_WORD: Record<ByKind, string> = { package: "package", letter: "query letter", synopsis: "synopsis", version: "version" };
const BY_HEAD: Record<ByKind, string> = { package: "Package", letter: "Query letter", synopsis: "Synopsis", version: "Version" };
const readBy = (): ByKind => {
  try { const v = sessionStorage.getItem(BY_KEY); if (v === "package" || v === "letter" || v === "synopsis" || v === "version") return v; } catch { /* */ }
  return "package";
};

export const BANNER_LINE = "Which letters, synopses and versions get agents replying? Every query you log with a package counts here.";

export const RepliesBanner: React.FC = () => (
  <div className="pk4-banner" data-pk4="banner">
    <span>{BANNER_LINE}</span>{ICON.down}
  </div>
);

export interface ReplyRow extends RankRow {
  id: string | null;
  kind: ByKind;
  sub: string;
  pkg?: SubmissionPackage;
  mat?: MaterialWithNote;
}

const HEADS: { key: SortKey | "bar"; label: (by: ByKind) => string; right?: boolean }[] = [
  { key: "name", label: (by) => BY_HEAD[by] },
  { key: "sent", label: () => "Sent", right: true },
  { key: "bar", label: () => "Where they stand" },
  { key: "replies", label: () => "Replies", right: true },
  { key: "rate", label: () => "Rate", right: true },
  { key: "requests", label: () => "Requests", right: true },
];

export const RepliesSheet = React.forwardRef<HTMLElement, {
  rowsFor: (by: ByKind) => ReplyRow[];
  /** every package's row (the lead cells read these whatever the tab) */
  packageRows: ReplyRow[];
  letterRows: ReplyRow[];
  overall: Split;
  onOpen: (r: ReplyRow) => void;
}>(({ rowsFor, packageRows, letterRows, overall, onOpen }, ref) => {
  const [by, setBy] = useState<ByKind>(readBy);
  const [sort, setSort] = useState<{ key: SortKey; dir: "desc" | "asc" }>({ key: "requests", dir: "desc" });
  const pick = (b: ByKind) => { setBy(b); try { sessionStorage.setItem(BY_KEY, b); } catch { /* */ } };
  const press = (k: SortKey) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === "desc" ? "asc" : "desc" } : { key: k, dir: k === "name" ? "asc" : "desc" }));
  const rows = sortRows(rowsFor(by), sort.key, sort.dir);
  const hr = leadOf(packageRows, (s) => s.rate ?? -1);
  const mr = leadOf(packageRows, (s) => s.requests);
  const lt = leadOf(letterRows, (s) => s.requests);
  const notYet = <><b className="pk4-lfig">Not enough yet</b><p>Needs {MIN_SENDS_FOR_CLAIM} answered queries in a package</p></>;
  return (
    <section className="pk4-ws pk4-ws--replies" data-pk4="replies" aria-label="What's getting replies" ref={ref}>
      <div className="pk4-wsh" data-pk4="replies-top">
        <p className="pk4-say" data-pk4="replies-say">What's getting replies<span className="pk4-dim">, by</span> <u className="pk4-u">{BY_WORD[by]}</u></p>
        <span className="pk4-seg4" role="group" aria-label="Compare by" data-pk4="by">
          {(Object.keys(BY_LABEL) as ByKind[]).map((b) => (
            <button key={b} type="button" aria-pressed={by === b} data-by={b} onClick={() => pick(b)}>{BY_LABEL[b]}</button>
          ))}
        </span>
      </div>
      <div className="pk4-lead" data-pk4="lead">
        <div data-pk4="lead-1">
          <span className="pk4-mono">Reply rate, all packages</span>
          <b className="pk4-lfig pk4-lfig--big" data-pk4="lead-rate">{pct(overall.rate)}</b>
          <p><i>{overall.replies} repl{overall.replies === 1 ? "y" : "ies"}</i> from {qs(overall.answered)} no longer waiting, with {overall.requests} request{overall.requests === 1 ? "" : "s"}</p>
        </div>
        <div data-pk4="lead-2">
          <span className="pk4-mono">Highest reply rate</span>
          {hr ? <><b className="pk4-lfig">{hr.name}</b><p>{hr.s.replies} repl{hr.s.replies === 1 ? "y" : "ies"} from {hr.s.answered} no longer waiting ({pct(hr.s.rate)})</p></> : notYet}
        </div>
        <div data-pk4="lead-3">
          <span className="pk4-mono">Most requests</span>
          {mr ? <><b className="pk4-lfig">{mr.name}</b><p>{mr.s.requests} request{mr.s.requests === 1 ? "" : "s"} from {qs(mr.s.sent)}</p></> : notYet}
        </div>
        <div data-pk4="lead-4">
          <span className="pk4-mono">Query letter in most requests</span>
          {lt ? <><b className="pk4-lfig">{lt.name}</b><p>in packages with {lt.s.requests} request{lt.s.requests === 1 ? "" : "s"} from {qs(lt.s.sent)}</p></> : notYet}
        </div>
      </div>
      <div className="pk4-rgrid pk4-rhd" data-pk4="headings" role="row">
        {HEADS.map((h) => {
          if (h.key === "bar") return <span key="bar" role="columnheader" className="pk4-rh" data-k="bar"><span className="pk4-rhl">{h.label(by)}</span></span>;
          const k = h.key as SortKey, on = sort.key === k;
          return (
            <span key={k} role="columnheader" className={`pk4-rh${h.right ? " pk4-r" : ""}${on ? " on" : ""}`} data-k={k} data-pk4="heading"
              aria-sort={on ? (sort.dir === "desc" ? "descending" : "ascending") : "none"}>
              <button type="button" onClick={() => press(k)}><span className="pk4-rhl">{h.label(by)}</span><i aria-hidden="true">{on && sort.dir === "asc" ? "↑" : "↓"}</i></button>
            </span>
          );
        })}
      </div>
      <div className="pk4-rrows" data-pk4="rows" data-by={by}>
        {rows.length ? rows.map((r) => {
          const s = r.s, few = s.sent > 0 && !qualifies(s);
          const body = (
            <>
              <span className="pk4-nm">
                <span className="pk4-ti">{r.kind === "package" ? ICON.parcel : KIND_ICON[r.kind as MatKind]}</span>
                <span className="pk4-nmt"><strong>{r.name}</strong>{r.sub || few ? <small data-pk4="row-sub">{r.sub || "fewer than 4 answered"}</small> : null}</span>
              </span>
              <span className="pk4-num pk4-r" data-pk4="row-sent">{s.sent || "–"}</span>
              <SplitBar s={s} />
              <span className="pk4-num pk4-r" data-pk4="row-replies">{s.sent ? s.replies : "–"}</span>
              <span className="pk4-num pk4-num--rate pk4-r" data-pk4="row-rate">{s.answered ? pct(s.rate) : "–"}</span>
              <span className="pk4-num pk4-r" data-pk4="row-requests">{s.sent ? s.requests : "–"}</span>
            </>
          );
          const cls = `pk4-rgrid pk4-rr${s.sent ? "" : " pk4-rr--mut"}`;
          const attrs = { "data-pk4": "row", "data-id": r.id ?? "none", "data-few": few ? "" : undefined, "data-q": qualifies(s) ? "" : undefined } as Record<string, string | undefined>;
          return r.id == null
            ? <div key="none" className={cls} {...attrs}>{body}</div>
            : <button key={r.id} type="button" className={cls} {...attrs} onClick={() => onOpen(r)}>{body}</button>;
        }) : <div className="pk4-rnone">Nothing here yet.</div>}
      </div>
      <div className="pk4-sfoot" data-pk4="replies-foot">
        <SplitKey />
        <p>Rates count queries no longer waiting. Under 4 answered, a row is listed but not compared.
          {overall.withdrawnEarly ? <span className="pk4-mono pk4-wd" data-pk4="withdrawn"> {overall.withdrawnEarly} withdrawn before an answer, left out</span> : null}
        </p>
      </div>
    </section>
  );
});
RepliesSheet.displayName = "RepliesSheet";

/** a row's italic line: Retired / Not sent yet for a package; "in {n} packages" for a material */
export const packageSub = (p: SubmissionPackage, s: Split): string => (p.status === "Retired" ? "Retired" : s.sent ? "" : "Not sent yet");
export const materialSub = (packagesIn: number, s: Split): string => (s.sent ? `in ${pkgs(packagesIn)}` : "Not sent yet");
