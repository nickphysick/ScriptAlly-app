/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HOW A QUERY'S MATERIALS WERE RECORDED — the two unmistakable treatments (packages-journey §A3;
 * ref design-refs/packages-journey/package-tracking-v1.html, "On the query").
 *
 *   SOLID INK      = a package was attached.
 *   DASHED OUTLINE = logged individually (with or without a "based on").
 *   QUIET          = not recorded (imported, or written before anything recorded it).
 *
 * ⚠️ THE SAME PAIR EVERYWHERE — the card header, Tracking, the Birds-eye tooltip and the drawer's
 * review all render from HERE, so no surface can draw a package as dashed or the reverse (LP9).
 *
 * ⚠️ WHAT WAS SENT IS READ FROM THE QUERY, NEVER FROM THE LIVE PACKAGE. The pieces and the name are
 * the frozen summary (`readSummary`); the live package is consulted for exactly two things that are
 * facts about it TODAY — whether it is retired, and its name where a query written before names were
 * frozen has none (a migrated query; the report says so).
 */
import React from "react";
import type { Query, QueryMaterial, SubmissionPackage } from "../../types";
import { sentRecordOf } from "../../lib/queryActions/sentRecord";
import { readSummary, type SentPiece } from "../../lib/queryActions/packages";
import { formatQueryMaterial } from "../../lib/materials";
import "./sentHow.css";

type Q = Partial<Pick<Query, "packageId" | "sentHow" | "sentPackageId" | "sentPackageEdition" | "basedOnPackageId" | "basedOnPackageEdition"
  | "sentChanges" | "sentMaterials" | "sentVersions" | "sentCorrectedAt" | "sentCorrectedFrom" | "materialsWanted">>;

const PKI = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M2.5 5.2 8 2.5l5.5 2.7v5.6L8 13.5l-5.5-2.7z" /><path d="M2.5 5.2 8 8l5.5-2.8M8 8v5.5" />
  </svg>
);
const LSI = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M6.5 4h7M6.5 8h7M6.5 12h7" /><path d="m2 4 1 1 1.8-2M2 8l1 1 1.8-2M2 12l1 1 1.8-2" />
  </svg>
);
const BOX = (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <rect x="1.5" y="3" width="9" height="7" rx="1.5" /><path d="M4 3V2h4v1" />
  </svg>
);

export const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const isRetired = (p: SubmissionPackage | undefined) => !!p && (p.status === "Retired" || !!(p as { retiredAt?: unknown }).retiredAt);
const dayMon = (iso: string) => {
  const d = new Date(iso);
  /* a fixed table, not toLocaleDateString: en-GB's September is "Sept", and the ref reads "28 SEP" */
  return isNaN(d.getTime()) ? "" : `${d.getDate()} ${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getMonth()]}`;
};

export interface SentView {
  how: "package" | "individual" | "unrecorded";
  /** The package attached (package) or started from (based on), as named on the day. */
  name: string | null;
  edition: number | null;
  basedOn: boolean;
  retired: boolean;
  packageId: string | null;
  pieces: SentPiece[];
  /** Changed pieces, keyed by the piece's label: the value it had in the package. */
  was: Record<string, string>;
  corrected: string | null;
}

/** Everything a treatment needs, derived once. */
export function sentView(q: Q, packages: readonly SubmissionPackage[] = []): SentView {
  const r = sentRecordOf(q);
  const sum = readSummary(r.materials);
  const id = r.packageId ?? r.basedOnId;
  const live = id ? packages.find((p) => p.id === id) : undefined;
  let pieces = sum.pieces;
  if (!pieces.length && (q.materialsWanted ?? []).length) {
    /* a query written before summaries existed: its own materials list, read as rows */
    pieces = (q.materialsWanted as (string | QueryMaterial)[]).map((m, i) => ({ key: "other" as const, label: formatQueryMaterial(m), value: "", i }))
      .map(({ key, label, value }) => ({ key, label, value }));
  }
  const was: Record<string, string> = {};
  for (const c of r.changes) {
    const m = /^([^:]+):\s*(.*?)\s*→/.exec(c);
    if (m) was[m[1]] = m[2];
  }
  let corrected: string | null = null;
  if (r.correctedAt) {
    const from = readSummary(r.correctedFrom);
    const what = from.packageName ?? (r.correctedFrom ? (from.basedOnName ? `chosen individually, based on ${from.basedOnName}` : "chosen individually") : "not recorded");
    corrected = `CORRECTED ${dayMon(r.correctedAt)} · WAS RECORDED AS “${what.toUpperCase()}”`;
  }
  return {
    how: r.how,
    name: sum.packageName ?? sum.basedOnName ?? live?.packageName ?? null,
    edition: r.edition ?? r.basedOnEdition,
    basedOn: r.how === "individual" && !!r.basedOnId,
    retired: isRetired(live),
    packageId: id,
    pieces,
    was,
    corrected,
  };
}

/** The card header's chip, under the agent's name. */
export function SentChip({ q, packages = [] }: { q: Q; packages?: readonly SubmissionPackage[] }) {
  const v = sentView(q, packages);
  if (v.how === "package") return <span className="sh-chip sh-chip--pk" data-sent-how="package">{PKI}{(v.name ?? "").toUpperCase()} PACKAGE</span>;
  if (v.how === "individual") {
    return (
      <span className="sh-chip sh-chip--in" data-sent-how="individual">{LSI}MATERIALS LOGGED INDIVIDUALLY{v.basedOn && v.name ? ` · BASED ON ${v.name.toUpperCase()}` : ""}</span>
    );
  }
  return <span className="sh-chip sh-chip--no" data-sent-how="unrecorded">MATERIALS NOT RECORDED</span>;
}

const Rows = ({ v }: { v: SentView }) => {
  const shown = new Set(v.pieces.map((p) => p.label));
  const removed = Object.entries(v.was).filter(([label]) => !shown.has(label));
  return (
    <div className="sh-mtb">
      {v.pieces.map((p) => {
        const was = v.was[p.label];
        return (
          <div key={p.label} className={`sh-row${was != null ? " chg" : ""}`}>
            <span><i className="sh-tk">✓</i>{p.label}</span>
            <span>{was != null && was !== "none" ? <><s>{was}</s> </> : null}{p.value}</span>
          </div>
        );
      })}
      {removed.map(([label, was]) => (
        <div key={label} className="sh-row chg"><span><i className="sh-tk sh-tk--off" />{label}</span><span><s>{was}</s> not sent</span></div>
      ))}
    </div>
  );
};

/** Tracking's "Queried" entry: the ink band, the dashed box, or the quiet one. */
export function SentBox({ q, packages, onOpenPackage, onAddWhatSent }: {
  q: Q; packages: readonly SubmissionPackage[]; onOpenPackage?: (id: string) => void; onAddWhatSent?: () => void;
}) {
  const v = sentView(q, packages);
  const cor = v.corrected ? <div className="sh-cor" data-sent-corrected>{v.corrected}</div> : null;
  if (v.how === "package") {
    return (
      <div className="sh-mt sh-mt--pk" data-sent-box="package">
        <div className="sh-mth">
          <span className="sh-ic">{PKI}</span>
          <span><small>SUBMISSION PACKAGE ATTACHED</small><b>{v.name ?? "A package"}</b></span>
          <span className="sh-r">
            <em className={v.retired ? "ret" : ""}>{v.retired ? "RETIRED" : `${ordinal(v.edition ?? 1).toUpperCase()} EDITION`}</em>
            {onOpenPackage && v.packageId ? <a role="button" tabIndex={0} onClick={() => onOpenPackage(v.packageId!)}>{v.retired ? "SEE ITS RESULTS ›" : "OPEN PACKAGE ›"}</a> : null}
          </span>
        </div>
        {v.pieces.length ? <Rows v={v} /> : null}
        {cor}
      </div>
    );
  }
  if (v.how === "individual") {
    return (
      <div className="sh-mt sh-mt--in" data-sent-box="individual">
        <div className="sh-mth">
          <span className="sh-ic">{LSI}</span>
          <span><small>MATERIALS LOGGED INDIVIDUALLY</small><b>{v.basedOn ? "Based on a package" : "No package attached"}</b></span>
          {v.basedOn && v.name ? <span className="sh-r"><em>BASED ON {v.name.toUpperCase()} · {ordinal(v.edition ?? 1).toUpperCase()} ED.</em></span> : null}
        </div>
        {v.pieces.length || Object.keys(v.was).length ? <Rows v={v} /> : null}
        {cor}
      </div>
    );
  }
  return (
    <div className="sh-mt sh-mt--no" data-sent-box="unrecorded">
      <div className="sh-mth">
        <span><small>MATERIALS NOT RECORDED</small><b>{v.pieces.length ? "Listed on the query" : "Nothing recorded about what went"}</b></span>
        {onAddWhatSent ? <span className="sh-r"><a role="button" tabIndex={0} className="sh-add" onClick={onAddWhatSent}>ADD WHAT YOU SENT ›</a></span> : null}
      </div>
      {v.pieces.length ? <Rows v={v} /> : null}
      {cor}
    </div>
  );
}

/** A request entry's tag — only when a package was attached, because only then is it the package's result. */
export function FromPackageTag({ q, packages }: { q: Q; packages: readonly SubmissionPackage[] }) {
  const v = sentView(q, packages);
  if (v.how !== "package" || !v.name) return null;
  return <span className="sh-from" data-sent-from>{BOX}FROM THE {v.name.toUpperCase()} PACKAGE</span>;
}
